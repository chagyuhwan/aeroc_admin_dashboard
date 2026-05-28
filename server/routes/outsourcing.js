import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const STATUSES = ['제작완료', '정산완료'];

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}

// 미정산 조건 (NULL·구 상태값 포함)
const PENDING_STATUS_SQL = `(status = '제작완료' OR status IS NULL OR status IN ('진행중', '완료됨', '대기중'))`;

// 정산 현황 (관리자 대시보드) — 미정산만 집계
router.get('/settlement-stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const pending = await db.prepare(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(price), 0) as total
      FROM outsourcing WHERE ${PENDING_STATUS_SQL}
    `).first();
    const pendingMonth = await db.prepare(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(price), 0) as total
      FROM outsourcing
      WHERE ${PENDING_STATUS_SQL}
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).first();
    const settled = await db.prepare(`
      SELECT COUNT(*) as cnt FROM outsourcing WHERE status = '정산완료'
    `).first();

    const num = (v) => Number(v) || 0;

    res.json({
      success: true,
      pendingCount: num(pending?.cnt),
      pendingAmount: num(pending?.total),
      pendingMonthCount: num(pendingMonth?.cnt),
      pendingMonthAmount: num(pendingMonth?.total),
      settledCount: num(settled?.cnt),
    });
  } catch (err) {
    console.error('정산 현황 조회 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 목록 조회
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { status, search } = req.query;
    let sql = `
      SELECT o.*, u.name as creator_name
      FROM outsourcing o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== '전체' && STATUSES.includes(status)) {
      if (status === '제작완료') {
        sql += ` AND (o.status = '제작완료' OR o.status IS NULL OR o.status IN ('진행중', '완료됨', '대기중'))`;
      } else {
        sql += ` AND o.status = ?`;
        params.push(status);
      }
    }
    if (search && search.trim()) {
      sql += ` AND (o.company_name LIKE ? OR o.outsource_type LIKE ? OR o.manager LIKE ?)`;
      const t = `%${search.trim()}%`;
      params.push(t, t, t);
    }
    sql += ` ORDER BY o.created_at DESC`;

    const stmt = db.prepare(sql);
    const { results: items } = params.length > 0
      ? await stmt.bind(...params).all()
      : await stmt.all();

    const { results: counts } = await db.prepare(
      `SELECT status, COUNT(*) as cnt FROM outsourcing GROUP BY status`
    ).all();
    const countMap = { 전체: 0, 제작완료: 0, 정산완료: 0 };
    const legacyPending = ['진행중', '완료됨', '대기중', null, undefined, ''];
    counts.forEach(r => {
      const s = r.status;
      const cnt = Number(r.cnt) || 0;
      if (s === '정산완료') countMap['정산완료'] += cnt;
      else countMap['제작완료'] += cnt;
    });
    countMap.전체 = countMap['제작완료'] + countMap['정산완료'];

    items.forEach(row => {
      if (!row.status || legacyPending.includes(row.status)) row.status = '제작완료';
    });

    res.json({ success: true, items, counts: countMap });
  } catch (err) {
    console.error('외주 목록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 단건 조회
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    if (req.params.id === 'settlement-stats') return res.status(404).json({ success: false });
    const item = await db.prepare(`SELECT * FROM outsourcing WHERE id = ?`).bind(req.params.id).first();
    if (!item) return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

const OUTSOURCE_TYPES = { '기본형': 150000, '고급형': 200000 };

// 등록
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { company_name, outsource_type, representative, phone, manager, status, memo } = req.body;
    if (!company_name || !outsource_type) {
      return res.status(400).json({ success: false, message: '업체명과 홈페이지 유형은 필수입니다.' });
    }
    const price = OUTSOURCE_TYPES[outsource_type] ?? 0;
    const result = await db.prepare(`
      INSERT INTO outsourcing (company_name, outsource_type, representative, phone, manager, price, status, memo, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      company_name.trim(),
      outsource_type.trim(),
      (representative || '').trim() || null,
      (phone || '').trim() || null,
      (manager || '').trim() || null,
      price,
      (status && STATUSES.includes(status)) ? status : '제작완료',
      (memo || '').trim() || null,
      req.user.id
    ).run();

    res.status(201).json({ success: true, message: '등록되었습니다.', id: result.meta.last_row_id });
  } catch (err) {
    console.error('외주 등록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 일괄 상태 변경
router.patch('/bulk-status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '선택된 항목이 없습니다.' });
    }
    if (!status || !STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 상태입니다.' });
    }
    const numIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (!numIds.length) {
      return res.status(400).json({ success: false, message: '유효한 ID가 없습니다.' });
    }
    const placeholders = numIds.map(() => '?').join(',');
    await db.prepare(`
      UPDATE outsourcing SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `).bind(status, ...numIds).run();

    res.json({ success: true, message: `${numIds.length}건이 ${status}(으)로 변경되었습니다.` });
  } catch (err) {
    console.error('외주 일괄 상태 변경 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 수정
router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { company_name, outsource_type, representative, phone, manager, status, memo } = req.body;
    const existing = await db.prepare('SELECT id FROM outsourcing WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });

    if (company_name !== undefined) {
      const price = OUTSOURCE_TYPES[outsource_type] ?? 0;
      await db.prepare(`
        UPDATE outsourcing
        SET company_name=?, outsource_type=?, representative=?, phone=?, manager=?, price=?, status=?, memo=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(
        (company_name || '').trim(),
        (outsource_type || '').trim(),
        (representative || '').trim() || null,
        (phone || '').trim() || null,
        (manager || '').trim() || null,
        price,
        (status && STATUSES.includes(status)) ? status : '제작완료',
        (memo || '').trim() || null,
        req.params.id
      ).run();
    } else if (status && STATUSES.includes(status)) {
      await db.prepare(
        `UPDATE outsourcing SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).bind(status, req.params.id).run();
    }

    res.json({ success: true, message: '수정되었습니다.' });
  } catch (err) {
    console.error('외주 수정 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 삭제
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const existing = await db.prepare('SELECT id FROM outsourcing WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });
    await db.prepare('DELETE FROM outsourcing WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
