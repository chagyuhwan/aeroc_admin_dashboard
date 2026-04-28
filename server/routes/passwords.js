import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { search, category } = req.query;
    const isAdmin = req.user.role === 'admin';

    let sql = `SELECT * FROM passwords WHERE 1=1`;
    const params = [];

    // 관리자가 아닌 경우 공개 항목만
    if (!isAdmin) {
      sql += ` AND is_public = 1`;
    }

    if (search) {
      sql += ` AND (service_name LIKE ? OR username LIKE ? OR notes LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category && category !== '전체') {
      sql += ` AND category = ?`;
      params.push(category);
    }
    sql += ` ORDER BY is_public ASC, created_at DESC`;

    const { results } = await db.prepare(sql).bind(...params).all();
    res.json({ success: true, passwords: results || [] });
  } catch (err) {
    console.error('비밀번호 목록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 단건 조회
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const isAdmin = req.user.role === 'admin';
    const row = await db.prepare(`SELECT * FROM passwords WHERE id = ?`).bind(req.params.id).first();
    if (!row) return res.status(404).json({ success: false, message: '항목을 찾을 수 없습니다.' });
    if (!isAdmin && !row.is_public) return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' });
    res.json({ success: true, password: row });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 등록 (관리자만)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: '관리자만 등록할 수 있습니다.' });
    const db = req.db;
    const { service_name, service_url, category, username, password, icon_color, icon_image, notes, is_public } = req.body;
    if (!service_name) return res.status(400).json({ success: false, message: '서비스명을 입력해주세요.' });

    const result = await db.prepare(`
      INSERT INTO passwords (service_name, service_url, category, username, password, icon_color, icon_image, notes, is_public, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      service_name,
      service_url || '',
      category || '업무용',
      username || '',
      password || '',
      icon_color || '#6366f1',
      icon_image || null,
      notes || '',
      is_public ? 1 : 0,
      req.user.username
    ).run();

    res.json({ success: true, id: result.meta.last_row_id });
  } catch (err) {
    console.error('비밀번호 등록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 수정 (관리자만)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: '관리자만 수정할 수 있습니다.' });
    const db = req.db;
    const { service_name, service_url, category, username, password, icon_color, icon_image, notes, is_public } = req.body;

    await db.prepare(`
      UPDATE passwords SET
        service_name = ?, service_url = ?, category = ?,
        username = ?, password = ?, icon_color = ?, icon_image = ?,
        notes = ?, is_public = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      service_name, service_url || '', category || '업무용',
      username || '', password || '', icon_color || '#6366f1',
      icon_image !== undefined ? icon_image : null,
      notes || '',
      is_public ? 1 : 0,
      req.params.id
    ).run();

    res.json({ success: true });
  } catch (err) {
    console.error('비밀번호 수정 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 삭제 (관리자만)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: '관리자만 삭제할 수 있습니다.' });
    const db = req.db;
    await db.prepare(`DELETE FROM passwords WHERE id = ?`).bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;
