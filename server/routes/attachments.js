import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/attachments/projects/:id  — 파일 업로드 (관리자 전용, Base64 JSON)
// body: { name: string, mime: string, data: base64string }
router.post('/projects/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 파일을 업로드할 수 있습니다.' });
    }
    const R2 = req.r2;
    if (!R2) return res.status(503).json({ success: false, message: '파일 스토리지를 사용할 수 없습니다.' });

    const db = req.db;
    const { id } = req.params;
    const { name, mime, data } = req.body || {};

    if (!name || !data) {
      return res.status(400).json({ success: false, message: '파일 이름과 데이터가 필요합니다.' });
    }

    const project = await db.prepare('SELECT id, contract_attachment_key FROM projects WHERE id = ?').bind(id).first();
    if (!project) return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });

    // 기존 파일 삭제
    if (project.contract_attachment_key) {
      await R2.delete(project.contract_attachment_key).catch(() => {});
    }

    // base64 → Buffer → R2 업로드
    const buffer = Buffer.from(data, 'base64');
    const key = `projects/${id}/${Date.now()}_${name}`;
    await R2.put(key, buffer, { httpMetadata: { contentType: mime || 'application/octet-stream' } });

    await db.prepare(
      'UPDATE projects SET contract_attachment_key=?, contract_attachment_name=?, contract_attachment_mime=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(key, name, mime || 'application/octet-stream', id).run();

    res.json({ success: true, key, name, mime });
  } catch (err) {
    console.error('첨부파일 업로드 오류:', err);
    res.status(500).json({ success: false, message: err.message || '서버 오류' });
  }
});

// GET /api/attachments/projects/:id  — 파일 다운로드/열기
router.get('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const R2 = req.r2;
    if (!R2) return res.status(503).json({ success: false, message: '파일 스토리지를 사용할 수 없습니다.' });

    const db = req.db;
    const { id } = req.params;
    const project = await db.prepare(
      'SELECT contract_attachment_key, contract_attachment_name, contract_attachment_mime FROM projects WHERE id = ?'
    ).bind(id).first();

    if (!project?.contract_attachment_key) {
      return res.status(404).json({ success: false, message: '첨부파일이 없습니다.' });
    }

    const obj = await R2.get(project.contract_attachment_key);
    if (!obj) return res.status(404).json({ success: false, message: '파일을 찾을 수 없습니다.' });

    const mime = project.contract_attachment_mime || 'application/octet-stream';
    const name = encodeURIComponent(project.contract_attachment_name || 'file');
    const buf = Buffer.from(await obj.arrayBuffer());

    res.set({
      'Content-Type': mime,
      'Content-Disposition': `inline; filename*=UTF-8''${name}`,
      'Content-Length': buf.length,
      'Cache-Control': 'private, max-age=3600',
    }).send(buf);
  } catch (err) {
    console.error('첨부파일 다운로드 오류:', err);
    res.status(500).json({ success: false, message: err.message || '서버 오류' });
  }
});

// DELETE /api/attachments/projects/:id  — 파일 삭제 (관리자 전용)
router.delete('/projects/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 파일을 삭제할 수 있습니다.' });
    }
    const R2 = req.r2;
    const db = req.db;
    const { id } = req.params;
    const project = await db.prepare('SELECT contract_attachment_key FROM projects WHERE id = ?').bind(id).first();
    if (!project?.contract_attachment_key) {
      return res.status(404).json({ success: false, message: '첨부파일이 없습니다.' });
    }
    if (R2) await R2.delete(project.contract_attachment_key).catch(() => {});
    await db.prepare(
      'UPDATE projects SET contract_attachment_key=NULL, contract_attachment_name=NULL, contract_attachment_mime=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(id).run();
    res.json({ success: true, message: '첨부파일이 삭제되었습니다.' });
  } catch (err) {
    console.error('첨부파일 삭제 오류:', err);
    res.status(500).json({ success: false, message: err.message || '서버 오류' });
  }
});

// ─── 업무보고서 첨부 이미지 ───────────────────────────────

// POST /api/attachments/workreport/:id  — 이미지 업로드 (로그인 사용자 누구나)
router.post('/workreport/:id', authMiddleware, async (req, res) => {
  try {
    const R2 = req.r2;
    if (!R2) return res.status(503).json({ success: false, message: '파일 스토리지를 사용할 수 없습니다.' });

    const db = req.db;
    const { id } = req.params;
    const { name, mime, data } = req.body || {};
    if (!name || !data) return res.status(400).json({ success: false, message: '파일 이름과 데이터가 필요합니다.' });

    const report = await db.prepare('SELECT id, attachment_key FROM work_reports WHERE id = ?').bind(id).first();
    if (!report) return res.status(404).json({ success: false, message: '보고서를 찾을 수 없습니다.' });

    if (report.attachment_key) {
      await R2.delete(report.attachment_key).catch(() => {});
    }

    const buffer = Buffer.from(data, 'base64');
    const key = `workreport/${id}/${Date.now()}_${name}`;
    await R2.put(key, buffer, { httpMetadata: { contentType: mime || 'image/jpeg' } });

    await db.prepare(
      'UPDATE work_reports SET attachment_key=?, attachment_name=?, attachment_mime=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(key, name, mime || 'image/jpeg', id).run();

    res.json({ success: true, key, name, mime });
  } catch (err) {
    console.error('보고서 첨부 업로드 오류:', err);
    res.status(500).json({ success: false, message: err.message || '서버 오류' });
  }
});

// GET /api/attachments/workreport/:id  — 이미지 조회
router.get('/workreport/:id', authMiddleware, async (req, res) => {
  try {
    const R2 = req.r2;
    if (!R2) return res.status(503).json({ success: false, message: '파일 스토리지를 사용할 수 없습니다.' });

    const db = req.db;
    const report = await db.prepare(
      'SELECT attachment_key, attachment_name, attachment_mime FROM work_reports WHERE id = ?'
    ).bind(req.params.id).first();

    if (!report?.attachment_key) return res.status(404).json({ success: false, message: '첨부파일이 없습니다.' });

    const obj = await R2.get(report.attachment_key);
    if (!obj) return res.status(404).json({ success: false, message: '파일을 찾을 수 없습니다.' });

    const mime = report.attachment_mime || 'image/jpeg';
    const name = encodeURIComponent(report.attachment_name || 'image');
    const buf  = Buffer.from(await obj.arrayBuffer());

    res.set({
      'Content-Type': mime,
      'Content-Disposition': `inline; filename*=UTF-8''${name}`,
      'Content-Length': buf.length,
      'Cache-Control': 'private, max-age=3600',
    }).send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '서버 오류' });
  }
});

// DELETE /api/attachments/workreport/:id  — 이미지 삭제 (관리자 전용)
router.delete('/workreport/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 첨부파일을 삭제할 수 있습니다.' });
    }
    const R2 = req.r2;
    const db = req.db;
    const report = await db.prepare('SELECT attachment_key FROM work_reports WHERE id = ?').bind(req.params.id).first();
    if (!report?.attachment_key) return res.status(404).json({ success: false, message: '첨부파일이 없습니다.' });
    if (R2) await R2.delete(report.attachment_key).catch(() => {});
    await db.prepare(
      'UPDATE work_reports SET attachment_key=NULL, attachment_name=NULL, attachment_mime=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(req.params.id).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '서버 오류' });
  }
});

export default router;
