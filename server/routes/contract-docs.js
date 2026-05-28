import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}

function genContractNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `CT-${ymd}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function trim(v) { return (v || '').trim() || null; }

// 목록
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const { q } = req.query;
    let sql = `
      SELECT d.*, u.name as creator_name
      FROM contract_docs d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (q?.trim()) {
      sql += ` AND (d.client_name LIKE ? OR d.contract_no LIKE ? OR d.homepage_type LIKE ?)`;
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }
    sql += ` ORDER BY d.contract_date DESC, d.created_at DESC`;
    const stmt = db.prepare(sql);
    const { results: docs } = params.length
      ? await stmt.bind(...params).all()
      : await stmt.all();
    res.json({ success: true, docs: docs ?? [] });
  } catch (err) {
    console.error('계약서 목록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 단건
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const doc = await db.prepare('SELECT * FROM contract_docs WHERE id = ?').bind(req.params.id).first();
    if (!doc) return res.status(404).json({ success: false, message: '계약서를 찾을 수 없습니다.' });
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 등록
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const {
      contract_title, client_name, client_rep, client_phone, client_biz_no,
      client_id_no, client_address, homepage_type, contract_body,
      amount, start_date, end_date, special_terms, contract_date,
      aeroc_rep, aeroc_biz_no, aeroc_address
    } = req.body;

    if (!client_name?.trim()) return res.status(400).json({ success: false, message: '상호는 필수입니다.' });
    if (!contract_date) return res.status(400).json({ success: false, message: '계약일은 필수입니다.' });

    const contract_no = genContractNo();
    const result = await db.prepare(`
      INSERT INTO contract_docs
        (contract_no, contract_title, client_name, client_rep, client_phone, client_biz_no,
         client_id_no, client_address, homepage_type, contract_body,
         amount, start_date, end_date, special_terms, contract_date,
         aeroc_rep, aeroc_biz_no, aeroc_address, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      contract_no,
      trim(contract_title) || '홈페이지 제작 계약서',
      client_name.trim(),
      trim(client_rep), trim(client_phone), trim(client_biz_no),
      trim(client_id_no), trim(client_address),
      trim(homepage_type) || '고급형',
      trim(contract_body),
      parseInt(amount) || 0,
      start_date || null, end_date || null,
      trim(special_terms), contract_date,
      trim(aeroc_rep), trim(aeroc_biz_no), trim(aeroc_address),
      req.user.id
    ).run();

    res.status(201).json({ success: true, id: result.meta.last_row_id, contract_no });
  } catch (err) {
    console.error('계약서 등록 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 수정
router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const existing = await db.prepare('SELECT id FROM contract_docs WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '계약서를 찾을 수 없습니다.' });

    const {
      contract_title, client_name, client_rep, client_phone, client_biz_no,
      client_id_no, client_address, homepage_type, contract_body,
      amount, start_date, end_date, special_terms, contract_date,
      aeroc_rep, aeroc_biz_no, aeroc_address
    } = req.body;

    if (!client_name?.trim()) return res.status(400).json({ success: false, message: '상호는 필수입니다.' });
    if (!contract_date) return res.status(400).json({ success: false, message: '계약일은 필수입니다.' });

    await db.prepare(`
      UPDATE contract_docs
      SET contract_title=?, client_name=?, client_rep=?, client_phone=?, client_biz_no=?,
          client_id_no=?, client_address=?, homepage_type=?, contract_body=?,
          amount=?, start_date=?, end_date=?, special_terms=?, contract_date=?,
          aeroc_rep=?, aeroc_biz_no=?, aeroc_address=?,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(
      trim(contract_title) || '홈페이지 제작 계약서',
      client_name.trim(),
      trim(client_rep), trim(client_phone), trim(client_biz_no),
      trim(client_id_no), trim(client_address),
      trim(homepage_type) || '고급형',
      trim(contract_body),
      parseInt(amount) || 0,
      start_date || null, end_date || null,
      trim(special_terms), contract_date,
      trim(aeroc_rep), trim(aeroc_biz_no), trim(aeroc_address),
      req.params.id
    ).run();

    res.json({ success: true });
  } catch (err) {
    console.error('계약서 수정 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 삭제
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const db = req.db;
    const existing = await db.prepare('SELECT id FROM contract_docs WHERE id = ?').bind(req.params.id).first();
    if (!existing) return res.status(404).json({ success: false, message: '계약서를 찾을 수 없습니다.' });
    await db.prepare('DELETE FROM contract_docs WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
