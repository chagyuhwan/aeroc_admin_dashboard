import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}

// 월별 전체 직원 출근기록 조회 (관리자 전용)
// GET /api/attendance?year=2026&month=4
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ success: false, message: 'year, month 파라미터가 필요합니다.' });

    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const rows = await db.prepare(`
      SELECT a.*, u.name, u.username
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.date LIKE ?
      ORDER BY a.date ASC, u.name ASC
    `).bind(`${ym}%`).all();

    res.json({ success: true, records: rows.results ?? rows });
  } catch (err) {
    console.error('출근기록 조회 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 목록 조회 (관리자 전용)
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const rows = await db.prepare(`SELECT id, name, username, role FROM users ORDER BY name ASC`).all();
    res.json({ success: true, users: rows.results ?? rows });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 출근기록 저장/수정 (관리자 전용) - upsert
// POST /api/attendance  { user_id, date, check_in, check_out, note }
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { user_id, date, check_in, check_out, note } = req.body;
    if (!user_id || !date) return res.status(400).json({ success: false, message: 'user_id, date는 필수입니다.' });

    await db.prepare(`
      INSERT INTO attendance (user_id, date, check_in, check_out, note)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        check_in = excluded.check_in,
        check_out = excluded.check_out,
        note = excluded.note,
        updated_at = CURRENT_TIMESTAMP
    `).bind(user_id, date, check_in || null, check_out || null, note || null).run();

    res.json({ success: true });
  } catch (err) {
    console.error('출근기록 저장 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 출근기록 삭제 (관리자 전용)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    await db.prepare('DELETE FROM attendance WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
