import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 월별 일정 조회 GET /api/schedules?year=2026&month=4
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ success: false, message: 'year, month 파라미터가 필요합니다.' });

    const ym = `${year}-${String(month).padStart(2, '0')}`;
    // 해당 월에 걸쳐 있는 일정 모두 조회 (시작일이 해당 월이거나 종료일이 해당 월)
    const rows = await db.prepare(`
      SELECT s.*, u.name as creator_name
      FROM schedules s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.date LIKE ? OR (s.end_date IS NOT NULL AND s.end_date LIKE ?)
      ORDER BY s.date ASC
    `).bind(`${ym}%`, `${ym}%`).all();

    res.json({ success: true, schedules: rows.results ?? rows });
  } catch (err) {
    console.error('일정 조회 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 일정 추가 POST /api/schedules
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { title, date, end_date, color, memo } = req.body;
    if (!title || !date) return res.status(400).json({ success: false, message: '제목과 날짜는 필수입니다.' });

    await db.prepare(`
      INSERT INTO schedules (title, date, end_date, color, memo, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(title, date, end_date || null, color || '#3b82f6', memo || null, req.user.id).run();

    res.json({ success: true });
  } catch (err) {
    console.error('일정 추가 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 일정 수정 PATCH /api/schedules/:id
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { title, date, end_date, color, memo } = req.body;
    if (!title || !date) return res.status(400).json({ success: false, message: '제목과 날짜는 필수입니다.' });

    const existing = await db.prepare('SELECT id FROM schedules WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '일정을 찾을 수 없습니다.' });

    await db.prepare(`
      UPDATE schedules SET title=?, date=?, end_date=?, color=?, memo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(title, date, end_date || null, color || '#3b82f6', memo || null, req.params.id).run();

    res.json({ success: true });
  } catch (err) {
    console.error('일정 수정 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 일정 삭제 DELETE /api/schedules/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    await db.prepare('DELETE FROM schedules WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
