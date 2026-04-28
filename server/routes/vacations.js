import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 내 휴가 현황 (잔량 포함)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const year = new Date().getFullYear();

    // 연간 휴가 총 일수
    let quota = await db.prepare(`SELECT total_days FROM vacation_quota WHERE user_id = ? AND year = ?`).bind(userId, year).first();
    const totalDays = quota ? quota.total_days : 12;

    // 승인된 휴가 사용 일수
    const used = await db.prepare(`
      SELECT COALESCE(SUM(days), 0) AS used FROM vacations
      WHERE user_id = ? AND status = '승인' AND strftime('%Y', start_date) = ?
    `).bind(userId, String(year)).first();
    const usedDays = used ? used.used : 0;

    res.json({ success: true, totalDays, usedDays, remainDays: totalDays - usedDays, year });
  } catch (err) {
    console.error('휴가 현황 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 내 휴가 목록
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const isAdmin = req.user.role === 'admin';
    const { status, user_id } = req.query;

    let sql, params = [];

    if (isAdmin) {
      // 관리자: 전체 또는 특정 유저 목록
      sql = `
        SELECT v.*, u.name AS user_name, u.username AS user_username,
               a.name AS approver_name
        FROM vacations v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN users a ON v.approved_by = a.id
        WHERE 1=1
      `;
      if (user_id) { sql += ` AND v.user_id = ?`; params.push(user_id); }
    } else {
      // 일반 유저: 본인 목록만
      sql = `
        SELECT v.*, u.name AS user_name, u.username AS user_username,
               a.name AS approver_name
        FROM vacations v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN users a ON v.approved_by = a.id
        WHERE v.user_id = ?
      `;
      params.push(req.user.id);
    }

    if (status && status !== '전체') { sql += ` AND v.status = ?`; params.push(status); }
    sql += ` ORDER BY v.created_at DESC`;

    const { results } = await db.prepare(sql).bind(...params).all();
    res.json({ success: true, vacations: results || [] });
  } catch (err) {
    console.error('휴가 목록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 휴가 신청
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { start_date, end_date, days, reason } = req.body;
    if (!start_date || !end_date) return res.status(400).json({ success: false, message: '날짜를 입력해주세요.' });

    const result = await db.prepare(`
      INSERT INTO vacations (user_id, start_date, end_date, days, reason, status)
      VALUES (?, ?, ?, ?, ?, '대기')
    `).bind(req.user.id, start_date, end_date, days || 1, reason || '').run();

    res.json({ success: true, id: result.meta.last_row_id });
  } catch (err) {
    console.error('휴가 신청 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 휴가 승인/반려 (관리자)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: '관리자만 처리할 수 있습니다.' });
    const db = req.db;
    const { status } = req.body;
    if (!['승인', '반려', '대기'].includes(status)) return res.status(400).json({ success: false, message: '올바른 상태값이 아닙니다.' });

    await db.prepare(`
      UPDATE vacations SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(status, req.user.id, req.params.id).run();

    res.json({ success: true });
  } catch (err) {
    console.error('휴가 상태변경 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 휴가 취소 (본인 대기 상태만)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const row = await db.prepare(`SELECT * FROM vacations WHERE id = ?`).bind(req.params.id).first();
    if (!row) return res.status(404).json({ success: false, message: '항목을 찾을 수 없습니다.' });
    if (req.user.role !== 'admin' && row.user_id !== req.user.id) return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    if (row.status !== '대기' && req.user.role !== 'admin') return res.status(400).json({ success: false, message: '대기 상태만 취소할 수 있습니다.' });

    await db.prepare(`DELETE FROM vacations WHERE id = ?`).bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    console.error('휴가 취소 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 관리자 - 전체 직원 휴가 현황
router.get('/admin/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: '관리자만 접근 가능합니다.' });
    const db = req.db;
    const year = new Date().getFullYear();

    const { results } = await db.prepare(`
      SELECT u.id, u.name, u.username,
             COALESCE(q.total_days, 12) AS total_days,
             COALESCE(SUM(CASE WHEN v.status='승인' AND strftime('%Y', v.start_date)=? THEN v.days ELSE 0 END), 0) AS used_days,
             COALESCE(SUM(CASE WHEN v.status='대기' THEN 1 ELSE 0 END), 0) AS pending_count
      FROM users u
      LEFT JOIN vacation_quota q ON q.user_id = u.id AND q.year = ?
      LEFT JOIN vacations v ON v.user_id = u.id
      GROUP BY u.id
      ORDER BY u.name
    `).bind(String(year), year).all();

    res.json({ success: true, summary: results || [], year });
  } catch (err) {
    console.error('관리자 휴가 현황 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;
