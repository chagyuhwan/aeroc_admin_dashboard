import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const STATUSES = ['진행중', '완료됨', '대기중'];

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}

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
      sql += ` AND o.status = ?`;
      params.push(status);
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
    const countMap = { 전체: 0, 진행중: 0, 완료됨: 0, 대기중: 0 };
    counts.forEach(r => { countMap[r.status] = r.cnt; });
    countMap.전체 = counts.reduce((a, c) => a + c.cnt, 0);

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
      (status && STATUSES.includes(status)) ? status : '진행중',
      (memo || '').trim() || null,
      req.user.id
    ).run();

    res.status(201).json({ success: true, message: '등록되었습니다.', id: result.meta.last_row_id });
  } catch (err) {
    console.error('외주 등록 오류:', err);
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
        (status && STATUSES.includes(status)) ? status : '진행중',
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
