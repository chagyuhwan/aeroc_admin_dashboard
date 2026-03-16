import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 최근 계약건 목록 (모든 회원이 전체 계약 조회)
// year, month 쿼리 있으면 해당 월 계약건 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { year, month } = req.query;

    if (year && month) {
      const y = String(year).padStart(4, '0');
      const m = String(month).padStart(2, '0');
      const { results } = await db.prepare(`
        SELECT p.company_name, p.manager, u.name as manager_name, p.created_at, p.price
        FROM projects p
        LEFT JOIN users u ON u.username = p.manager
        WHERE strftime('%Y', p.created_at) = ? AND strftime('%m', p.created_at) = ?
        ORDER BY p.created_at DESC
      `).bind(y, m).all();
      return res.json({ success: true, contracts: results });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const { results } = await db.prepare(`
      SELECT p.company_name, p.manager, u.name as manager_name, p.created_at
      FROM projects p
      LEFT JOIN users u ON u.username = p.manager
      ORDER BY p.created_at DESC
      LIMIT ?
    `).bind(limit).all();

    res.json({ success: true, contracts: results });
  } catch (error) {
    console.error('계약건 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
