import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
/** 목록 필터용 (신규 + 구 데이터) */
const PROJECT_TYPES = ['기본형 홈페이지', '고급형 홈페이지', '최고급형 홈페이지', '기본형', '고급형', '최고급형'];
const CONTRACT_PERIODS = [0, 1, 2, 3, 4, 5];
const STATUSES = ['진행중', '완료됨', '대기중'];

const HOMEPAGE_PRICE = {
  '기본형 홈페이지': 1680000,
  '고급형 홈페이지': 2076000,
  '최고급형 홈페이지': null,
  '기본형': 1680000,
  '고급형': 2076000,
  '최고급형': null
};
const MANAGE_PRICE = { 0: 0, 1: 300000, 2: 540000, 3: 765000, 4: 960000, 5: 1125000 };
const SERVER_PRICE = { 0: 0, 1: 120000, 2: 240000, 3: 360000, 4: 480000, 5: 600000 };

/**
 * base가 null이면 직접 입력 금액을 사용 (manualPrice 전달)
 * base가 숫자면 자동 계산
 */
function computeProjectPrice(projectType, manageYears, serverYears, manualPrice) {
  if (!(projectType in HOMEPAGE_PRICE)) return null;
  const base = HOMEPAGE_PRICE[projectType];
  const my = Number(manageYears);
  const sy = Number(serverYears);
  const m = MANAGE_PRICE[my] ?? 0;
  const s = SERVER_PRICE[sy] ?? 0;

  // 수동 입력값이 유효하면 항상 우선 적용 (기본형/고급형도 포함)
  const mp = typeof manualPrice === 'number' ? manualPrice : parseInt(manualPrice, 10);
  if (!isNaN(mp) && mp >= 0) return mp;

  // 수동 입력값 없을 때: 최고급형은 null(필수 입력), 나머지는 자동 계산
  if (base === null) return null;
  return base + m + s;
}

// 관리자만 프로젝트 수정/삭제 가능
function canModifyProject(user) {
  return user.role === 'admin';
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { user } = req;
    const isAdmin = user.role === 'admin';
    const { status, project_type, contract_period, search } = req.query;
    // All members see all projects (same as sales, contracts)
    let sql = `SELECT p.id, p.company_name, p.representative_name, p.representative_phone, p.manager, u.name as manager_name, p.project_type, p.contract_period, p.server_period, p.price, p.is_urgent, p.status, p.memo, p.developer, p.website_url, p.created_by, p.created_at, p.updated_at, p.completed_at, p.contract_attachment_key, p.contract_attachment_name, p.contract_attachment_mime FROM projects p LEFT JOIN users u ON u.username = p.manager WHERE 1=1`;
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

router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.db;
    const { company_name, representative_name, representative_phone, manager, project_type, contract_period, server_period, project_amount, is_urgent, memo, developer, website_url } = req.body;

    if (!company_name || !manager || !project_type || contract_period === undefined || contract_period === '') {
      return res.status(400).json({ success: false, message: '업체명, 담당자, 프로젝트 유형, 관리기간은 필수입니다.' });
    }

    const sp = server_period !== undefined && server_period !== '' ? Number(server_period) : 0;
    if (!CONTRACT_PERIODS.includes(Number(contract_period)) || !CONTRACT_PERIODS.includes(sp)) {
      return res.status(400).json({ success: false, message: '관리·서버 기간을 올바르게 선택해주세요.' });
    }

    const priceVal = computeProjectPrice(project_type.trim(), contract_period, sp, project_amount);
    if (priceVal == null) {
      return res.status(400).json({ success: false, message: '프로젝트 유형 또는 금액 계산에 문제가 있습니다.' });
    }

    const result = await db.prepare(`
      INSERT INTO projects (company_name, representative_name, representative_phone, manager, project_type, contract_period, server_period, price, is_urgent, status, memo, developer, website_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '진행중', ?, ?, ?, ?)
    `).bind(
      company_name.trim(),
      (representative_name || '').trim() || null,
      (representative_phone || '').trim() || null,
      manager.trim(),
      project_type.trim(),
      Number(contract_period),
      sp,
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
        project_type: project_type.trim(),
        contract_period: Number(contract_period),
        server_period: sp
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
      SELECT p.id, p.company_name, p.representative_name, p.representative_phone, p.manager, u.name as manager_name, p.project_type, p.contract_period, p.server_period, p.price, p.is_urgent, p.status, p.memo, p.developer, p.website_url, p.created_at, p.updated_at
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
    const { status, company_name, representative_name, representative_phone, manager, project_type, contract_period, server_period, project_amount, is_urgent, memo, developer, website_url } = req.body;
    if (!canModifyProject(req.user)) {
      return res.status(403).json({ success: false, message: '관리자만 프로젝트를 수정할 수 있습니다.' });
    }
    const project = await db.prepare('SELECT status, completed_at FROM projects WHERE id = ?').bind(id).first();
    if (!project) return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    if (company_name !== undefined && manager !== undefined && project_type !== undefined) {
      const sp = server_period !== undefined && server_period !== '' ? Number(server_period) : 0;
      const cp = Number(contract_period ?? 0);
      if (!CONTRACT_PERIODS.includes(cp) || !CONTRACT_PERIODS.includes(sp)) {
        return res.status(400).json({ success: false, message: '관리·서버 기간을 올바르게 선택해주세요.' });
      }
      const priceVal = computeProjectPrice((project_type || '').trim(), cp, sp, project_amount);
      if (priceVal == null) {
        return res.status(400).json({ success: false, message: '프로젝트 유형 또는 금액 계산에 문제가 있습니다.' });
      }
      const finalStatus = status && STATUSES.includes(status) ? status : '진행중';
      let newCompletedAt;
      if (finalStatus === '완료됨' && project?.status !== '완료됨') {
        newCompletedAt = 'CURRENT_TIMESTAMP';
      } else if (finalStatus !== '완료됨') {
        newCompletedAt = null;
      }
      const completedAtSql = newCompletedAt === 'CURRENT_TIMESTAMP'
        ? ', completed_at=CURRENT_TIMESTAMP'
        : (newCompletedAt === null && finalStatus !== '완료됨' ? ', completed_at=NULL' : '');
      await db.prepare(`
        UPDATE projects SET company_name=?, representative_name=?, representative_phone=?, manager=?, project_type=?, contract_period=?, server_period=?, price=?, is_urgent=?, memo=?, developer=?, website_url=?, status=?${completedAtSql}, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).bind(
        (company_name || '').trim(),
        (representative_name || '').trim() || null,
        (representative_phone || '').trim() || null,
        (manager || '').trim(),
        (project_type || '').trim(),
        cp,
        sp,
        priceVal,
        is_urgent ? 1 : 0,
        (memo || '').trim() || null,
        (developer || '').trim() || null,
        (website_url || '').trim() || null,
        finalStatus,
        id
      ).run();
    } else if (status && STATUSES.includes(status)) {
      if (status === '완료됨') {
        await db.prepare('UPDATE projects SET status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id).run();
      } else {
        await db.prepare('UPDATE projects SET status = ?, completed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id).run();
      }
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
    if (!canModifyProject(req.user)) {
      return res.status(403).json({ success: false, message: '관리자만 프로젝트를 삭제할 수 있습니다.' });
    }
    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first();
    if (!project) return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
    res.json({ success: true, message: '프로젝트가 삭제되었습니다.' });
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
