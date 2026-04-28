// 프로젝트 관리 모듈
import { escapeHtml, formatPhoneNumber } from './utils.js';

let token = '';
let currentUser = {};
let editingProjectId = null;
let projectFilters = { status: '전체', project_type: '', contract_period: '', search: '' };
let pendingFile = null; // 업로드 대기 중인 파일

function openProjectDetail(p) {
  const mg = p.contract_period != null ? Number(p.contract_period) : 0;
  const srv = p.server_period != null ? Number(p.server_period) : 0;

  document.getElementById('pdCompanyName').textContent = p.company_name || '-';
  const statusEl = document.getElementById('pdStatus');
  statusEl.textContent = p.status || '진행중';
  statusEl.className = `status-badge ${p.status || '진행중'}`;

  document.getElementById('pdManager').textContent = p.manager_name || p.manager || '-';
  document.getElementById('pdDeveloper').textContent = p.developer || '-';
  document.getElementById('pdRepName').textContent = p.representative_name || '-';
  document.getElementById('pdRepPhone').textContent = p.representative_phone || '-';
  document.getElementById('pdType').textContent = p.project_type || '-';
  document.getElementById('pdManage').textContent = mg === 0 ? '없음' : mg + '년';
  document.getElementById('pdServer').textContent = srv === 0 ? '없음' : srv + '년';
  document.getElementById('pdPrice').textContent = (p.price != null && p.price > 0) ? p.price.toLocaleString('ko-KR') + '원' : '-';
  document.getElementById('pdCreatedAt').textContent = p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '-';
  document.getElementById('pdCompletedAt').textContent = p.completed_at ? new Date(p.completed_at).toLocaleDateString('ko-KR') : '-';

  const daysLeftEl = document.getElementById('pdDaysLeft');
  if (p.status === '완료됨' && p.completed_at && mg > 0) {
    const daysLeft = calcDaysLeft(p.completed_at, mg);
    if (daysLeft === null) {
      daysLeftEl.textContent = '-';
    } else if (daysLeft <= 0) {
      daysLeftEl.innerHTML = '<span class="period-expired">만료됨</span>';
    } else {
      daysLeftEl.innerHTML = `<span class="${daysLeft < 100 ? 'period-warning' : 'period-days'}">${daysLeft.toLocaleString()}일 남음</span>`;
    }
  } else {
    daysLeftEl.textContent = '-';
  }

  const url = (p.website_url || '').trim();
  const urlEl = document.getElementById('pdUrl');
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    urlEl.innerHTML = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="url-link">${escapeHtml(url)}</a>`;
  } else {
    urlEl.textContent = url || '-';
  }

  const memoWrap = document.getElementById('pdMemoWrap');
  const memoEl = document.getElementById('pdMemo');
  if (p.memo && p.memo.trim()) {
    memoEl.textContent = p.memo;
    memoWrap.style.display = 'block';
  } else {
    memoWrap.style.display = 'none';
  }

  document.getElementById('projectDetailOverlay').style.display = 'flex';
}

function calcDaysLeft(completedAt, contractYears) {
  if (!completedAt || !contractYears || contractYears === 0) return null;
  const completed = new Date(completedAt);
  const endDate = new Date(completed);
  endDate.setFullYear(endDate.getFullYear() + Number(contractYears));
  const now = new Date();
  return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
}

const HOMEPAGE_PRICE = { '기본형 홈페이지': 1680000, '고급형 홈페이지': 2076000, '최고급형 홈페이지': null, '기본형': 1680000, '고급형': 2076000, '최고급형': null };
const MANAGE_PRICE = { 0: 0, 1: 300000, 2: 540000, 3: 765000, 4: 960000, 5: 1125000 };
const SERVER_PRICE = { 0: 0, 1: 120000, 2: 240000, 3: 360000, 4: 480000, 5: 600000 };

function formatPriceLine(n) { return (Number(n) || 0).toLocaleString('ko-KR') + '원'; }

export function syncProjectPrice() {
  const typeEl = document.getElementById('projectType');
  const mEl = document.getElementById('contractPeriod');
  const sEl = document.getElementById('serverPeriod');
  const amt = document.getElementById('projectAmount');
  const breakdown = document.getElementById('projectPriceBreakdown');
  if (!typeEl || !mEl || !sEl || !amt) return;
  const type = typeEl.value;
  if (!type || mEl.value === '' || sEl.value === '') { if (breakdown) breakdown.innerHTML = ''; return; }
  const m = parseInt(mEl.value, 10);
  const s = parseInt(sEl.value, 10);
  const base = HOMEPAGE_PRICE[type];
  const mp = MANAGE_PRICE[m] ?? 0;
  const sp = SERVER_PRICE[s] ?? 0;
  if (base === null || base === undefined) {
    if (breakdown) breakdown.innerHTML = `
      <div><strong>홈페이지</strong> 직접 입력</div>
      <div><strong>관리</strong> (${m === 0 ? '해당없음' : m + '년'}) ${formatPriceLine(mp)}</div>
      <div><strong>서버</strong> (${s === 0 ? '해당없음' : s + '년'}) ${formatPriceLine(sp)}</div>
      <div style="margin-top:4px;color:var(--accent);">합계는 금액 필드에 직접 입력해주세요</div>`;
    return;
  }
  const total = base + mp + sp;
  amt.value = total;
  if (breakdown) breakdown.innerHTML = `
    <div><strong>홈페이지</strong> ${formatPriceLine(base)}</div>
    <div><strong>관리</strong> (${m === 0 ? '해당없음' : m + '년'}) ${formatPriceLine(mp)}</div>
    <div><strong>서버</strong> (${s === 0 ? '해당없음' : s + '년'}) ${formatPriceLine(sp)}</div>
    <div style="margin-top:4px;"><strong>합계</strong> ${formatPriceLine(total)}</div>`;
}

export async function loadProjects() {
  try {
    const params = new URLSearchParams();
    if (projectFilters.status && projectFilters.status !== '전체') params.set('status', projectFilters.status);
    if (projectFilters.project_type) params.set('project_type', projectFilters.project_type);
    if (projectFilters.contract_period) params.set('contract_period', projectFilters.contract_period);
    if (projectFilters.search) params.set('search', projectFilters.search);

    const res = await fetch('/api/projects?' + params.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    document.getElementById('countAll').textContent = result.counts?.전체 ?? 0;
    document.getElementById('countProgress').textContent = result.counts?.진행중 ?? 0;
    document.getElementById('countDone').textContent = result.counts?.완료됨 ?? 0;
    document.getElementById('countPending').textContent = result.counts?.대기중 ?? 0;

    const tbody = document.getElementById('projectListBody');
    const emptyRow = document.getElementById('projectEmptyRow');
    tbody.querySelectorAll('tr:not(.empty-row)').forEach(r => r.remove());

    if (result.projects.length === 0) {
      emptyRow.style.display = '';
    } else {
      emptyRow.style.display = 'none';
      const isAdmin = result.isAdmin === true;
      result.projects.forEach(p => {
        const canModify = isAdmin;
        const tr = document.createElement('tr');
        const srv = p.server_period != null ? Number(p.server_period) : 0;
        const mg = p.contract_period != null ? Number(p.contract_period) : 0;
        const periodDisplay = `관리 ${mg === 0 ? '없음' : mg + '년'} / 서버 ${srv === 0 ? '없음' : srv + '년'}`;
        const priceDisplay = (p.price != null && p.price > 0) ? p.price.toLocaleString() + '원' : '-';
        const url = (p.website_url || '').trim();
        const urlDisplay = url && (url.startsWith('http://') || url.startsWith('https://'))
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="url-link">${escapeHtml(url)}</a>`
          : (url ? escapeHtml(url) : '-');

        // 기간 카운트다운 (완료됨 + 관리기간 있을 때)
        let durationDisplay = '-';
        let isNearExpiry = false;
        if (p.status === '완료됨' && p.completed_at && mg > 0) {
          const daysLeft = calcDaysLeft(p.completed_at, mg);
          if (daysLeft !== null) {
            if (daysLeft <= 0) {
              durationDisplay = '<span class="period-expired">만료됨</span>';
            } else {
              isNearExpiry = daysLeft < 100;
              durationDisplay = `<span class="period-days${isNearExpiry ? ' period-warning' : ''}">${daysLeft.toLocaleString()}일 남음</span>`;
            }
          }
        }
        if (isNearExpiry) tr.classList.add('row-near-expiry');

        tr.innerHTML = `
          <td>${escapeHtml(p.company_name)}</td>
          <td>${escapeHtml(p.manager_name || p.manager || '-')}</td>
          <td>${escapeHtml(p.developer || '-')}</td>
          <td>${urlDisplay}</td>
          <td>${escapeHtml(p.project_type)}</td>
          <td>${periodDisplay}</td>
          <td>${priceDisplay}</td>
          <td><span class="status-badge ${p.status || '진행중'}">${p.status || '진행중'}</span></td>
          <td>${new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
          <td>${durationDisplay}</td>
          <td class="col-action"><div class="col-action-wrap">
            ${p.contract_attachment_key ? `<button type="button" class="attach-icon-btn" data-id="${p.id}" title="${escapeHtml(p.contract_attachment_name || '첨부파일')}"><i class='bx bx-file'></i></button>` : ''}
            ${canModify ? `<button type="button" class="row-action-btn" data-id="${p.id}" title="더보기"><i class='bx bx-dots-vertical-rounded'></i></button>` : ''}
          </div></td>`;
        // 행 클릭 → 상세 모달 (버튼 클릭 제외)
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
          if (e.target.closest('.row-action-btn') || e.target.closest('.attach-icon-btn')) return;
          openProjectDetail(p);
        });
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.row-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => showRowMenu(e, btn.dataset.id));
      });
      tbody.querySelectorAll('.attach-icon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(`/api/attachments/projects/${btn.dataset.id}?token=${encodeURIComponent(token)}`, '_blank');
        });
      });
    }
  } catch (err) { console.error('프로젝트 목록 로드 실패:', err); }
}

function showRowMenu(e, id) {
  e.stopPropagation();
  document.getElementById('rowMenu')?.remove();
  const menu = document.createElement('div');
  menu.id = 'rowMenu';
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px;z-index:300;min-width:120px;`;
  ['수정', '진행중', '완료됨', '대기중', '삭제'].forEach(a => {
    const btn = document.createElement('button');
    btn.className = a === '삭제' ? 'row-menu-item delete' : 'row-menu-item';
    btn.textContent = a;
    btn.onclick = () => { menu.remove(); a === '삭제' ? deleteProject(id) : a === '수정' ? openEditProject(id) : updateProjectStatus(id, a); };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const pad = 8;
  let left = e.clientX, top = e.clientY;
  if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
  if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
  menu.style.left = `${left}px`; menu.style.top = `${top}px`;
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

function updateAttachmentUI(project) {
  const section = document.getElementById('attachmentSection');
  const current = document.getElementById('attachmentCurrent');
  const pending = document.getElementById('attachmentPending');
  if (!section) return;
  section.style.display = 'block';
  pending.style.display = 'none';
  pendingFile = null;
  document.getElementById('projectFileInput').value = '';
  if (project?.contract_attachment_name) {
    document.getElementById('attachmentCurrentName').textContent = project.contract_attachment_name;
    current.style.display = 'flex';
  } else {
    current.style.display = 'none';
  }
}

async function openEditProject(id) {
  const projectsListView = document.getElementById('projectsListView');
  const projectFormView = document.getElementById('projectFormView');
  try {
    const res = await fetch(`/api/projects/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (!result.success || !result.project) { alert(result.message || '불러올 수 없습니다.'); return; }
    const p = result.project;
    editingProjectId = id;
    projectsListView.style.display = 'none';
    projectFormView.style.display = 'block';
    document.getElementById('pageTitle').textContent = '프로젝트 수정';
    document.getElementById('companyName').value = p.company_name || '';
    document.getElementById('representativeName').value = p.representative_name || '';
    document.getElementById('representativePhone').value = p.representative_phone || '';
    document.getElementById('manager').value = p.manager || '';
    document.getElementById('manager').removeAttribute('readonly');
    document.getElementById('projectType').value = p.project_type || '';
    document.getElementById('contractPeriod').value = p.contract_period !== undefined ? String(p.contract_period) : '';
    document.getElementById('serverPeriod').value = p.server_period !== undefined ? String(p.server_period) : '0';
    document.getElementById('projectAmount').value = p.price ?? '';
    document.getElementById('developer').value = p.developer || '';
    document.getElementById('websiteUrl').value = p.website_url || '';
    document.getElementById('projectMemo').value = p.memo || '';
    document.getElementById('projectStatus').value = p.status || '진행중';
    document.getElementById('isUrgent').checked = !!p.is_urgent;
    // breakdown만 업데이트하고, 저장된 실제 금액 유지
    syncProjectPrice();
    document.getElementById('projectAmount').value = p.price ?? '';
    updateAttachmentUI(p);
  } catch (err) { alert('불러오는 중 오류가 발생했습니다.'); }
}

async function updateProjectStatus(id, status) {
  try {
    const res = await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const result = await res.json();
    if (result.success) loadProjects();
  } catch (err) { console.error(err); }
}

async function deleteProject(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.success) loadProjects();
    else alert(result.message || '삭제에 실패했습니다.');
  } catch (err) { alert('삭제 중 오류가 발생했습니다.'); }
}

export function initProjects(authToken, user) {
  token = authToken;
  currentUser = user;

  const projectsListView = document.getElementById('projectsListView');
  const projectFormView = document.getElementById('projectFormView');

  // 파일 인풋 변경
  document.getElementById('projectFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFile = file;
    document.getElementById('attachmentPendingName').textContent = file.name;
    document.getElementById('attachmentPending').style.display = 'flex';
    document.getElementById('attachmentCurrent').style.display = 'none';
  });
  // 대기 파일 취소
  document.getElementById('attachmentCancelBtn')?.addEventListener('click', () => {
    pendingFile = null;
    document.getElementById('projectFileInput').value = '';
    document.getElementById('attachmentPending').style.display = 'none';
    // 기존 파일 복원 표시는 editProject 재호출 없이 current 재활성화
  });
  // 기존 첨부파일 삭제
  document.getElementById('attachmentDeleteBtn')?.addEventListener('click', async () => {
    if (!editingProjectId) return;
    if (!confirm('첨부파일을 삭제하시겠습니까?')) return;
    try {
      const r = await fetch(`/api/attachments/projects/${editingProjectId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await r.json();
      if (result.success) {
        document.getElementById('attachmentCurrent').style.display = 'none';
      } else { alert(result.message || '삭제 실패'); }
    } catch (e) { alert('삭제 중 오류가 발생했습니다.'); }
  });

  // 프로젝트 상세 모달 닫기
  const detailOverlay = document.getElementById('projectDetailOverlay');
  document.getElementById('closeProjectDetail')?.addEventListener('click', () => { detailOverlay.style.display = 'none'; });
  detailOverlay?.addEventListener('click', (e) => { if (e.target === detailOverlay) detailOverlay.style.display = 'none'; });

  document.getElementById('representativePhone')?.addEventListener('input', function () { this.value = formatPhoneNumber(this.value); });
  ['projectType', 'contractPeriod', 'serverPeriod'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', syncProjectPrice);
  });

  document.getElementById('openProjectModal')?.addEventListener('click', () => {
    editingProjectId = null;
    projectsListView.style.display = 'none';
    projectFormView.style.display = 'block';
    document.getElementById('pageTitle').textContent = '편집 및 추가';
    document.getElementById('projectForm').reset();
    document.getElementById('projectStatus').value = '진행중';
    document.getElementById('isUrgent').checked = false;
    document.getElementById('manager').value = user.name || user.username || '';
    document.getElementById('manager').setAttribute('readonly', 'readonly');
    // 첨부파일 초기화
    pendingFile = null;
    document.getElementById('projectFileInput').value = '';
    document.getElementById('attachmentSection').style.display = 'block';
    document.getElementById('attachmentCurrent').style.display = 'none';
    document.getElementById('attachmentPending').style.display = 'none';
  });

  document.getElementById('cancelProjectForm')?.addEventListener('click', () => {
    editingProjectId = null;
    projectFormView.style.display = 'none';
    projectsListView.style.display = 'block';
    document.getElementById('pageTitle').textContent = '프로젝트 관리';
  });

  document.querySelectorAll('.filter-link.type-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.filter-link.type-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      projectFilters.project_type = link.dataset.type || '';
      loadProjects();
    });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      projectFilters.status = btn.dataset.status;
      loadProjects();
    });
  });

  document.getElementById('searchBtn')?.addEventListener('click', () => {
    projectFilters.search = document.getElementById('searchInput').value.trim();
    loadProjects();
  });
  document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('searchBtn').click();
  });

  document.getElementById('excelDownload')?.addEventListener('click', () => {
    const rows = document.querySelectorAll('#projectListBody tr:not(.empty-row)');
    if (rows.length === 0) { alert('다운로드할 데이터가 없습니다.'); return; }
    let csv = '\uFEFF업체명,담당자,개발자,홈페이지 URL,유형,관리/서버,금액,상태,등록일,기간\n';
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 10) csv += Array.from(tds).slice(0, 10).map(td => `"${td.textContent.trim()}"`).join(',') + '\n';
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `프로젝트_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });

  document.getElementById('projectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const companyName = (formData.get('company_name') || '').trim();
    const projectType = formData.get('project_type') || '';
    const contractPeriod = formData.get('contract_period');
    const serverPeriod = formData.get('server_period');
    const managerVal = (editingProjectId ? formData.get('manager') : (user.name || user.username)) || formData.get('manager') || '';

    if (!companyName) { alert('업체명을 입력해주세요.'); return; }
    if (!projectType) { alert('프로젝트 유형을 선택해주세요.'); return; }
    if (contractPeriod === '' || contractPeriod === null) { alert('관리기간을 선택해주세요.'); return; }
    if (serverPeriod === '' || serverPeriod === null) { alert('서버기간을 선택해주세요.'); return; }

    const amtRaw = (document.getElementById('projectAmount')?.value || '').replace(/,/g, '').trim();
    const amtNum = amtRaw !== '' ? parseInt(amtRaw, 10) : null;
    const data = {
      company_name: companyName,
      representative_name: (formData.get('representative_name') || '').trim(),
      representative_phone: (formData.get('representative_phone') || '').trim(),
      manager: managerVal,
      project_type: projectType,
      contract_period: Number(contractPeriod),
      server_period: Number(serverPeriod),
      project_amount: (amtNum !== null && !isNaN(amtNum)) ? amtNum : null,
      is_urgent: formData.get('is_urgent') === '1',
      memo: (formData.get('memo') || '').trim(),
      developer: (formData.get('developer') || '').trim(),
      website_url: (formData.get('website_url') || '').trim()
    };

    const saveBtn = form.querySelector('button[type="submit"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> 저장 중...'; }

    try {
      const isEdit = !!editingProjectId;
      const url = isEdit ? `/api/projects/${editingProjectId}` : '/api/projects';
      const body = isEdit ? { ...data, status: formData.get('status') || '진행중' } : data;
      const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      let result;
      try { const text = await res.text(); result = text ? JSON.parse(text) : { success: false, message: '빈 응답' }; }
      catch { result = { success: false, message: `응답 파싱 실패 (${res.status})` }; }

      if (!res.ok) {
        if (res.status === 401) { localStorage.clear(); window.location.href = '/login/'; return; }
        throw new Error(result.message || `서버 오류 (${res.status})`);
      }
      if (result.success) {
        // 대기 중인 파일이 있으면 Base64 JSON으로 업로드
        const savedId = isEdit ? editingProjectId : result.project?.id;
        if (pendingFile && savedId) {
          try {
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result.split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(pendingFile);
            });
            await fetch(`/api/attachments/projects/${savedId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: pendingFile.name, mime: pendingFile.type, data: base64 })
            });
          } catch (e) { console.warn('첨부파일 업로드 실패:', e); }
          pendingFile = null;
        }
        form.reset(); editingProjectId = null;
        document.getElementById('projectStatus').value = '진행중';
        document.getElementById('isUrgent').checked = false;
        document.getElementById('attachmentSection').style.display = 'none';
        projectFormView.style.display = 'none';
        projectsListView.style.display = 'block';
        document.getElementById('pageTitle').textContent = '프로젝트 관리';
        loadProjects();
        alert(isEdit ? '프로젝트가 수정되었습니다.' : '프로젝트가 등록되었습니다.');
      } else { alert(result.message || '실패했습니다.'); }
    } catch (err) { alert('등록 중 오류가 발생했습니다: ' + (err.message || err)); }
    finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="bx bx-save"></i> 저장'; } }
  });
}
