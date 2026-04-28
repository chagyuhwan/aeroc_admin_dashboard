import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 최근 계약건 목록 (모든 회원이 전체 계약 조회)
// year, month 쿼리 있으면 해당 월 계약건 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { year, month } = req.query;

    const isAdmin = req.user.role === 'admin';
    const includeOutsourcing = req.query.include_outsourcing === '1' && isAdmin;

    if (year && month) {
      const y = String(year).padStart(4, '0');
      const m = String(month).padStart(2, '0');
      let sql, params;
      if (includeOutsourcing) {
        sql = `SELECT company_name, manager, manager_name, created_at, price
               FROM (
                 SELECT p.company_name, p.manager, u.name as manager_name, p.created_at, p.price
                 FROM projects p LEFT JOIN users u ON u.username = p.manager
                 UNION ALL
                 SELECT o.company_name, o.manager, o.manager as manager_name, o.created_at, o.price
                 FROM outsourcing o
               )
               WHERE strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?
               ORDER BY created_at DESC`;
        params = [y, m];
      } else {
        sql = `SELECT p.company_name, p.manager, u.name as manager_name, p.created_at, p.price
               FROM projects p LEFT JOIN users u ON u.username = p.manager
               WHERE strftime('%Y', p.created_at) = ? AND strftime('%m', p.created_at) = ?
               ORDER BY p.created_at DESC`;
        params = [y, m];
      }
      const { results } = await db.prepare(sql).bind(...params).all();
      return res.json({ success: true, contracts: results });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    let sql, params;
    if (includeOutsourcing) {
      sql = `SELECT company_name, manager, manager_name, created_at
             FROM (
               SELECT p.company_name, p.manager, u.name as manager_name, p.created_at
               FROM projects p LEFT JOIN users u ON u.username = p.manager
               UNION ALL
               SELECT o.company_name, o.manager, o.manager as manager_name, o.created_at
               FROM outsourcing o
             )
             ORDER BY created_at DESC LIMIT ?`;
      params = [limit];
    } else {
      sql = `SELECT p.company_name, p.manager, u.name as manager_name, p.created_at
             FROM projects p LEFT JOIN users u ON u.username = p.manager
             ORDER BY p.created_at DESC LIMIT ?`;
      params = [limit];
    }
    const { results } = await db.prepare(sql).bind(...params).all();

    res.json({ success: true, contracts: results });
  } catch (error) {
    console.error('계약건 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
