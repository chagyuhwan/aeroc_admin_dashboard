import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 목록 조회 (검색)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { q } = req.query;
    const conditions = [];
    const binds = [];
    if (q) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR manager LIKE ? OR representative LIKE ? OR address LIKE ?)');
      const like = `%${q}%`;
      binds.push(like, like, like, like, like);
    }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const sql = `SELECT * FROM customers${where} ORDER BY created_at DESC`;
    const rows = await db.prepare(sql).bind(...binds).all();
    res.json({ success: true, customers: rows.results ?? rows });
  } catch (err) {
    console.error('고객 목록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 단건 조회
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const row = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(req.params.id).first();
    if (!row) return res.status(404).json({ success: false, message: '업체를 찾을 수 없습니다.' });
    res.json({ success: true, customer: row });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 추가
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { name, representative, phone, address, manager } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '업체명은 필수입니다.' });
    await db.prepare(`
      INSERT INTO customers (name, representative, phone, address, manager, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      name,
      representative || null,
      phone || null,
      address || null,
      manager || null,
      req.user.id
    ).run();
    res.json({ success: true });
  } catch (err) {
    console.error('업체 추가 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 수정
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { name, representative, phone, address, manager } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '업체명은 필수입니다.' });
    const existing = await db.prepare('SELECT id FROM customers WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '업체를 찾을 수 없습니다.' });
    await db.prepare(`
      UPDATE customers SET name=?, representative=?, phone=?, address=?, manager=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(
      name,
      representative || null,
      phone || null,
      address || null,
      manager || null,
      req.params.id
    ).run();
    res.json({ success: true });
  } catch (err) {
    console.error('업체 수정 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const existing = await db.prepare('SELECT id FROM customers WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '업체를 찾을 수 없습니다.' });
    await db.prepare('DELETE FROM customers WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    console.error('업체 삭제 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
