import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const PROJECT_TYPES = ['기본형', '고급형', '최고급형'];
const CONTRACT_PERIODS = [3, 5];
const STATUSES = ['진행중', '완료됨', '대기중'];

// 관리자: 모든 프로젝트 수정/삭제 가능. 일반 사용자: 본인이 등록한 계약만 수정/삭제 가능
function canModifyProject(user, createdBy) {
  if (user.role === 'admin') return true;
  return createdBy === user.id;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { user } = req;
    const isAdmin = user.role === 'admin';
    const { status, project_type, contract_period, search } = req.query;
    // All members see all projects (same as sales, contracts)
    let sql = `SELECT p.id, p.company_name, p.representative_name, p.representative_phone, p.manager, u.name as manager_name, p.project_type, p.contract_period, p.price, p.is_urgent, p.status, p.memo, p.developer, p.website_url, p.created_by, p.created_at, p.updated_at FROM projects p LEFT JOIN users u ON u.username = p.manager WHERE 1=1`;
    const params = [];

    if (status && status !== '전체' && STATUSES.includes(status)) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (project_type && PROJECT_TYPES.includes(project_type)) {
      sql += ` AND project_type = ?`;
      params.push(project_type);
    }
    if (contract_period && CONTRACT_PERIODS.includes(Number(contract_period))) {
      sql += ` AND contract_period = ?`;
      params.push(Number(contract_period));
    }
    if (search && search.trim()) {
      sql += ` AND (company_name LIKE ? OR manager LIKE ? OR representative_name LIKE ? OR representative_phone LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY p.created_at DESC`;
    const stmt = db.prepare(sql);
    const { results: projects } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    const countSql = `SELECT status, COUNT(*) as cnt FROM projects GROUP BY status`;
    const { results: counts } = await db.prepare(countSql).all();
    const countMap = { 전체: 0, 진행중: 0, 완료됨: 0, 대기중: 0 };
    counts.forEach(r => { countMap[r.status] = r.cnt; });
    countMap.전체 = counts.reduce((a, c) => a + c.cnt, 0);

    res.json({ success: true, isAdmin, projects, counts: countMap });
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

const PRICE_MAP = {
  '기본형_3': 1980000,
  '기본형_5': 2640000,
  '고급형_3': 2376000,
  '고급형_5': 3300000,
  '최고급형': 0
};

function parseProjectTypeOption(opt) {
  if (!opt) return null;
  if (opt === '최고급형') return { project_type: '최고급형', contract_period: 0, price: 0 };
  const [type, period] = opt.split('_');
  if (PROJECT_TYPES.includes(type) && CONTRACT_PERIODS.includes(Number(period))) {
    const price = PRICE_MAP[opt] ?? 0;
    return { project_type: type, contract_period: Number(period), price };
  }
  return null;
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { company_name, representative_name, representative_phone, manager, project_type_option, is_urgent, memo, developer, website_url } = req.body;

    if (!company_name || !manager || !project_type_option) {
      return res.status(400).json({ success: false, message: '모든 필수 필드를 입력해주세요.' });
    }

    const parsed = parseProjectTypeOption(project_type_option);
    if (!parsed) {
      return res.status(400).json({ success: false, message: '유효한 프로젝트 유형을 선택해주세요.' });
    }

    const { project_type, contract_period, price } = parsed;
    const priceVal = price ?? 0;

    const result = await db.prepare(`
      INSERT INTO projects (company_name, representative_name, representative_phone, manager, project_type, contract_period, price, is_urgent, status, memo, developer, website_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '진행중', ?, ?, ?, ?)
    `).bind(
      company_name.trim(),
      (representative_name || '').trim() || null,
      (representative_phone || '').trim() || null,
      manager.trim(),
      project_type,
      contract_period,
      priceVal,
      is_urgent ? 1 : 0,
      (memo || '').trim() || null,
      (developer || '').trim() || null,
      (website_url || '').trim() || null,
      req.user.id
    ).run();

    res.status(201).json({
      success: true,
      message: '프로젝트가 등록되었습니다.',
      project: {
        id: result.meta.last_row_id,
        company_name: company_name.trim(),
        manager: manager.trim(),
        project_type,
        contract_period
      }
    });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    res.status(500).json({ success: false, message: error.message || '서버 오류가 발생했습니다.' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const project = await db.prepare(`
      SELECT p.id, p.company_name, p.representative_name, p.representative_phone, p.manager, u.name as manager_name, p.project_type, p.contract_period, p.price, p.is_urgent, p.status, p.memo, p.developer, p.website_url, p.created_at, p.updated_at
      FROM projects p LEFT JOIN users u ON u.username = p.manager WHERE p.id = ?
    `).bind(id).first();
    if (!project) return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    res.json({ success: true, project });
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { status, company_name, representative_name, representative_phone, manager, project_type_option, is_urgent, memo, developer, website_url } = req.body;
    const project = await db.prepare('SELECT created_by FROM projects WHERE id = ?').bind(id).first();
    if (!project) return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    if (!canModifyProject(req.user, project.created_by)) {
      return res.status(403).json({ success: false, message: '수정 권한이 없습니다. 본인이 등록한 계약만 수정할 수 있습니다.' });
    }
    if (company_name !== undefined && manager !== undefined && project_type_option !== undefined) {
      const parsed = parseProjectTypeOption(project_type_option);
      if (!parsed) return res.status(400).json({ success: false, message: '유효한 프로젝트 유형을 선택해주세요.' });
      const { project_type, contract_period, price } = parsed;
      await db.prepare(`
        UPDATE projects SET company_name=?, representative_name=?, representative_phone=?, manager=?, project_type=?, contract_period=?, price=?, is_urgent=?, memo=?, developer=?, website_url=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).bind(
        (company_name || '').trim(),
        (representative_name || '').trim() || null,
        (representative_phone || '').trim() || null,
        (manager || '').trim(),
        parsed.project_type,
        parsed.contract_period,
        price ?? 0,
        is_urgent ? 1 : 0,
        (memo || '').trim() || null,
        (developer || '').trim() || null,
        (website_url || '').trim() || null,
        status && STATUSES.includes(status) ? status : '진행중',
        id
      ).run();
    } else if (status && STATUSES.includes(status)) {
      await db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id).run();
    }
    res.json({ success: true, message: '수정되었습니다.' });
  } catch (error) {
    console.error('프로젝트 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const project = await db.prepare('SELECT created_by FROM projects WHERE id = ?').bind(id).first();
    if (!project) return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    if (!canModifyProject(req.user, project.created_by)) {
      return res.status(403).json({ success: false, message: '삭제 권한이 없습니다. 본인이 등록한 계약만 삭제할 수 있습니다.' });
    }
    await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
    res.json({ success: true, message: '프로젝트가 삭제되었습니다.' });
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
