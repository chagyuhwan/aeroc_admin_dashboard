import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { user } = req;
    const isAdmin = user.role === 'admin';

    // All members (admin, team_leader, user) see total company sales
    const dailyQuery = `SELECT date(created_at) as date, SUM(price) / 10000.0 as total 
         FROM projects 
         WHERE price > 0 AND date(created_at) >= date('now', '-7 days')
         GROUP BY date(created_at) 
         ORDER BY date`;

    const { results: dailyRows } = await db.prepare(dailyQuery).all();

    const cumulativeQuery = `SELECT strftime('%Y-%m', created_at) as month, SUM(price) / 10000.0 as total 
         FROM projects 
         WHERE price > 0 AND date(created_at) >= date('now', '-6 months')
         GROUP BY strftime('%Y-%m', created_at) 
         ORDER BY month`;

    const { results: cumulativeRows } = await db.prepare(cumulativeQuery).all();

    // 이번달 일별 매출
    const monthlyQuery = `SELECT date(created_at) as date, SUM(price) / 10000.0 as total 
         FROM projects 
         WHERE price > 0 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
         GROUP BY date(created_at) 
         ORDER BY date`;

    const { results: monthlyRows } = await db.prepare(monthlyQuery).all();

    let runningTotal = 0;
    const cumulativeData = cumulativeRows.map(row => {
      runningTotal += row.total;
      return { month: row.month, total: runningTotal };
    });

    res.json({
      success: true,
      isAdmin,
      isTeamLeader: user.role === 'team_leader',
      daily: {
        labels: dailyRows.map(r => formatDateLabel(r.date)),
        data: dailyRows.map(r => Math.round(r.total))
      },
      monthly: {
        labels: monthlyRows.map(r => formatDateLabel(r.date)),
        data: monthlyRows.map(r => Math.round(r.total))
      },
      cumulative: {
        labels: cumulativeData.map(r => formatMonthLabel(r.month)),
        data: cumulativeData.map(r => Math.round(r.total))
      }
    });
  } catch (error) {
    console.error('매출 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

function formatMonthLabel(monthStr) {
  const [year, month] = monthStr.split('-');
  return `${parseInt(month)}월`;
}

export default router;
