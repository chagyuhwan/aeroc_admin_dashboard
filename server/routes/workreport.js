import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 월별 전체 보고서 조회
// GET /api/workreport?year=2026&month=4
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ success: false, message: 'year, month 파라미터가 필요합니다.' });

    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const rows = await db.prepare(`
      SELECT w.*, u.name, u.username
      FROM work_reports w
      JOIN users u ON w.user_id = u.id
      WHERE w.date LIKE ?
      ORDER BY w.date ASC, u.name ASC
    `).bind(`${ym}%`).all();

    res.json({ success: true, records: rows.results ?? rows });
  } catch (err) {
    console.error('업무보고서 조회 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 목록 조회
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const rows = await db.prepare(`SELECT id, name, username, role FROM users ORDER BY name ASC`).all();
    res.json({ success: true, users: rows.results ?? rows });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 보고서 저장/수정 (upsert) — id 반환
// POST /api/workreport  { user_id, date, title, call_time, call_count, materials }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { user_id, date, title, call_time, call_count, materials } = req.body;
    if (!user_id || !date || !title) return res.status(400).json({ success: false, message: 'user_id, date, title은 필수입니다.' });

    // 비관리자는 기존 보고서 수정 불가
    if (req.user.role !== 'admin') {
      const existing = await db.prepare('SELECT id FROM work_reports WHERE user_id=? AND date=?').bind(user_id, date).first();
      if (existing) return res.status(403).json({ success: false, message: '이미 등록된 보고서는 수정할 수 없습니다.' });
    }

    await db.prepare(`
      INSERT INTO work_reports (user_id, date, title, call_time, call_count, materials)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        title = excluded.title,
        call_time = excluded.call_time,
        call_count = excluded.call_count,
        materials = excluded.materials,
        updated_at = CURRENT_TIMESTAMP
    `).bind(user_id, date, title || null, call_time || null, call_count ? Number(call_count) : 0, materials || null).run();

    const row = await db.prepare('SELECT id FROM work_reports WHERE user_id=? AND date=?').bind(user_id, date).first();
    res.json({ success: true, id: row?.id ?? null });
  } catch (err) {
    console.error('업무보고서 저장 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 보고서 삭제 (관리자 전용)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 삭제할 수 있습니다.' });
    }
    const db = req.db;
    await db.prepare('DELETE FROM work_reports WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
