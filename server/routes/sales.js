import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

async function getViewableUserIds(db, user) {
  if (user.role === 'admin') return null;
  if (user.role === 'team_leader') {
    const { results } = await db.prepare('SELECT id FROM users WHERE team_leader_id = ?').bind(user.id).all();
    return [user.id, ...results.map(m => m.id)];
  }
  return [user.id];
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { user } = req;
    const isAdmin = user.role === 'admin';
    const viewableIds = await getViewableUserIds(db, user);

    const createdByClause = isAdmin ? '' : (viewableIds.length === 1
      ? ' AND created_by = ?'
      : ` AND created_by IN (${viewableIds.map(() => '?').join(',')})`);
    const queryParams = isAdmin ? [] : viewableIds;

    const dailyQuery = `SELECT date(created_at) as date, SUM(price) / 10000.0 as total 
         FROM projects 
         WHERE price > 0 AND date(created_at) >= date('now', '-7 days')${createdByClause}
         GROUP BY date(created_at) 
         ORDER BY date`;

    const { results: dailyRows } = await db.prepare(dailyQuery).bind(...queryParams).all();

    const cumulativeQuery = `SELECT strftime('%Y-%m', created_at) as month, SUM(price) / 10000.0 as total 
         FROM projects 
         WHERE price > 0 AND date(created_at) >= date('now', '-6 months')${createdByClause}
         GROUP BY strftime('%Y-%m', created_at) 
         ORDER BY month`;

    const { results: cumulativeRows } = await db.prepare(cumulativeQuery).bind(...queryParams).all();

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
