import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const PLAN_TYPES = ['1년12회', '2년24회'];

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}

// 목록
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { q } = req.query;
    let sql = `
      SELECT b.*, u.name as creator_name
      FROM blog_clients b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (q?.trim()) {
      sql += ` AND (b.company_name LIKE ? OR b.naver_id LIKE ? OR b.blog_url LIKE ? OR b.keyword LIKE ?)`;
      const like = `%${q.trim()}%`;
      params.push(like, like, like, like);
    }
    sql += ` ORDER BY b.first_post_date ASC`;
    const stmt = db.prepare(sql);
    const { results: clients } = params.length
      ? await stmt.bind(...params).all()
      : await stmt.all();

    res.json({ success: true, clients: clients ?? [] });
  } catch (err) {
    console.error('블로그 목록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 단건
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const client = await db.prepare(`SELECT * FROM blog_clients WHERE id = ?`).bind(req.params.id).first();
    if (!client) return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 등록
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { company_name, plan_type, naver_id, naver_password, blog_url, keyword, first_post_date } = req.body;
    if (!company_name?.trim()) return res.status(400).json({ success: false, message: '업체명은 필수입니다.' });
    if (!first_post_date) return res.status(400).json({ success: false, message: '첫 업로드 날짜는 필수입니다.' });
    const plan = PLAN_TYPES.includes(plan_type) ? plan_type : '1년12회';

    const result = await db.prepare(`
      INSERT INTO blog_clients (company_name, plan_type, naver_id, naver_password, blog_url, keyword, first_post_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      company_name.trim(),
      plan,
      (naver_id || '').trim() || null,
      (naver_password || '').trim() || null,
      (blog_url || '').trim() || null,
      (keyword || '').trim() || null,
      first_post_date,
      req.user.id
    ).run();

    res.status(201).json({ success: true, id: result.meta.last_row_id });
  } catch (err) {
    console.error('블로그 등록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 수정
router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const existing = await db.prepare('SELECT id FROM blog_clients WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });

    const { company_name, plan_type, naver_id, naver_password, blog_url, keyword, first_post_date } = req.body;
    if (!company_name?.trim()) return res.status(400).json({ success: false, message: '업체명은 필수입니다.' });
    if (!first_post_date) return res.status(400).json({ success: false, message: '첫 업로드 날짜는 필수입니다.' });
    const plan = PLAN_TYPES.includes(plan_type) ? plan_type : '1년12회';

    await db.prepare(`
      UPDATE blog_clients
      SET company_name=?, plan_type=?, naver_id=?, naver_password=?, blog_url=?, keyword=?, first_post_date=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(
      company_name.trim(),
      plan,
      (naver_id || '').trim() || null,
      (naver_password || '').trim() || null,
      (blog_url || '').trim() || null,
      (keyword || '').trim() || null,
      first_post_date,
      req.params.id
    ).run();

    res.json({ success: true });
  } catch (err) {
    console.error('블로그 수정 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 삭제
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const existing = await db.prepare('SELECT id FROM blog_clients WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });
    await db.prepare('DELETE FROM blog_clients WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
