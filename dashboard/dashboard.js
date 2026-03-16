const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || !user.username) {
  window.location.href = '/login/';
}

// 테마 (다크/라이트)
const themeKey = 'aeroc-theme';
const savedTheme = localStorage.getItem(themeKey) || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// 사용자 정보 표시
document.getElementById('userName').textContent = user.name || user.username;
document.getElementById('userEmail').textContent = user.email;
document.getElementById('userAvatar').textContent = (user.name || user.username || 'A').charAt(0).toUpperCase();

// 테마 토글
const themeToggle = document.getElementById('themeToggle');
const themeIconLight = document.getElementById('themeIconLight');
const themeIconDark = document.getElementById('themeIconDark');

function updateThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeIconLight.style.display = isDark ? 'none' : 'block';
  themeIconDark.style.display = isDark ? 'block' : 'none';
}
updateThemeIcons();

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(themeKey, next);
  updateThemeIcons();
  updateChartColors();
});

// 차트 색상 업데이트
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(229, 231, 235, 0.8)',
    text: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb'
  };
}

function updateChartColors() {
  const colors = getChartColors();
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = colors.text;
    Chart.defaults.borderColor = colors.border;
    if (window.dailySalesChart) {
      dailySalesChart.options.scales.y.grid.color = colors.grid;
      dailySalesChart.update();
    }
    if (window.cumulativeSalesChart) {
      cumulativeSalesChart.options.scales.y.grid.color = colors.grid;
      cumulativeSalesChart.update();
    }
  }
}

// 사이드바 (모바일)
const sidebar = document.getElementById('sidebar');
const sidebarOpen = document.getElementById('sidebarOpen');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

sidebarOpen.addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
});
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// 프로필 드롭다운
const userProfile = document.getElementById('userProfile');
const profileDropdown = document.getElementById('profileDropdown');

userProfile.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle('show');
});

document.addEventListener('click', () => profileDropdown.classList.remove('show'));

// 로그아웃
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login/';
});

// 페이지 전환
function showPage(pageName) {
  const dashboardContent = document.getElementById('dashboardContent');
  const placeholder = document.getElementById('pagePlaceholder');
  const projectsPage = document.getElementById('projectsPage');

  const settingsPage = document.getElementById('settingsPage');
  const employeesPage = document.getElementById('employeesPage');
  dashboardContent.style.display = 'none';
  placeholder.style.display = 'none';
  projectsPage.style.display = 'none';
  if (settingsPage) settingsPage.style.display = 'none';
  if (employeesPage) employeesPage.style.display = 'none';

  if (pageName === 'dashboard') {
    dashboardContent.style.display = 'grid';
    loadSalesData();
  } else if (pageName === 'projects') {
    projectsPage.style.display = 'block';
    projectsListView.style.display = 'block';
    projectFormView.style.display = 'none';
    loadProjects();
  } else if (pageName === 'employees') {
    if (employeesPage) employeesPage.style.display = 'block';
    const empSection = document.getElementById('employeesSection');
    const empPlaceholder = document.getElementById('employeesPlaceholder');
    if (empSection && empPlaceholder) {
      empSection.style.display = 'none';
      empPlaceholder.style.display = 'block';
      empPlaceholder.querySelector('p').textContent = '로딩 중...';
      loadUsers('employeesTableBody').then(isAdmin => {
        if (isAdmin) {
          empSection.style.display = 'block';
          empPlaceholder.style.display = 'none';
        } else {
          empPlaceholder.querySelector('p').textContent = '관리자만 접근할 수 있습니다.';
        }
      });
    }
  } else if (pageName === 'settings') {
    if (settingsPage) settingsPage.style.display = 'block';
    loadMyName();
  } else {
    placeholder.style.display = 'block';
    placeholder.querySelector('p').textContent = `${document.querySelector(`[data-page="${pageName}"] .label`)?.textContent || pageName} - 준비 중인 페이지입니다.`;
  }
}

// URL 해시 기반 페이지 로드 (새로고침 시 현재 페이지 유지)
function getPageFromHash() {
  const hash = window.location.hash.slice(1);
  const validPages = ['dashboard', 'projects', 'employees', 'settings'];
  return validPages.includes(hash) ? hash : 'dashboard';
}

function syncNavAndPage() {
  const page = getPageFromHash();
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
  const link = document.querySelector(`.nav-link[data-page="${page}"]`);
  document.getElementById('pageTitle').textContent = link?.querySelector('.label')?.textContent || '대시보드 홈';
  showPage(page);
}

window.addEventListener('hashchange', syncNavAndPage);
window.addEventListener('load', syncNavAndPage);

// 네비게이션 (해시가 href로 자동 업데이트됨)
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (window.innerWidth < 1024) closeSidebar();
  });
});

// 차트 초기화
const colors = getChartColors();
Chart.defaults.color = colors.text;
Chart.defaults.borderColor = colors.border;

const dailyCtx = document.getElementById('dailySalesChart').getContext('2d');
window.dailySalesChart = new Chart(dailyCtx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: '일일매출 (만원)',
      data: [],
      backgroundColor: 'rgba(228, 96, 51, 0.6)',
      borderColor: '#e46033',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: colors.grid } },
      x: { grid: { display: false } }
    }
  }
});

const cumulativeCtx = document.getElementById('cumulativeSalesChart').getContext('2d');
window.cumulativeSalesChart = new Chart(cumulativeCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: '누적매출 (만원)',
      data: [],
      borderColor: '#e46033',
      backgroundColor: 'rgba(228, 96, 51, 0.1)',
      fill: true,
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: colors.grid } },
      x: { grid: { display: false } }
    }
  }
});

// 매출 데이터 로드
async function loadSalesData() {
  try {
    const res = await fetch('/api/sales', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '조회 실패');

    const label = result.isAdmin ? '전체 매출 (만원)' : (result.isTeamLeader ? '팀 매출 (만원)' : '내 매출 (만원)');

    document.querySelectorAll('.chart-card h4')[0].textContent = result.isAdmin ? '일일매출 (전체)' : (result.isTeamLeader ? '일일매출 (팀)' : '일일매출');
    dailySalesChart.data.labels = result.daily.labels;
    dailySalesChart.data.datasets[0].data = result.daily.data;
    dailySalesChart.data.datasets[0].label = label;
    dailySalesChart.update();

    document.querySelectorAll('.chart-card h4')[1].textContent = result.isAdmin ? '누적매출 (전체)' : (result.isTeamLeader ? '누적매출 (팀)' : '누적매출');
    cumulativeSalesChart.data.labels = result.cumulative.labels;
    cumulativeSalesChart.data.datasets[0].data = result.cumulative.data;
    cumulativeSalesChart.data.datasets[0].label = label;
    cumulativeSalesChart.update();
  } catch (err) {
    console.error('매출 데이터 로드 실패:', err);
  }
}

loadSalesData();

// 프로젝트 관리
let projectFilters = { status: '전체', project_type: '', contract_period: '', search: '' };

async function loadProjects() {
  try {
    const params = new URLSearchParams();
    if (projectFilters.status && projectFilters.status !== '전체') params.set('status', projectFilters.status);
    if (projectFilters.project_type) params.set('project_type', projectFilters.project_type);
    if (projectFilters.contract_period) params.set('contract_period', projectFilters.contract_period);
    if (projectFilters.search) params.set('search', projectFilters.search);

    const res = await fetch('/api/projects?' + params.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    const projectTable = document.querySelector('.project-table');
    if (projectTable) {
      projectTable.classList.toggle('show-project-num', result.isAdmin === true);
    }

    // 탭 카운트 업데이트
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
      result.projects.forEach(p => {
        const tr = document.createElement('tr');
        const created = new Date(p.created_at).toLocaleDateString('ko-KR');
        const updated = p.updated_at ? new Date(p.updated_at).toLocaleDateString('ko-KR') : '-';
        const periodDisplay = p.contract_period === 0 ? '-' : `${p.contract_period}년`;
        const priceDisplay = (p.price != null && p.price > 0) ? p.price.toLocaleString() + '원' : '-';
        const urgentBadge = p.is_urgent ? '<span class="urgent-badge">급 제작건</span>' : '-';
        tr.innerHTML = `
          <td class="col-check"><input type="checkbox" class="row-check" data-id="${p.id}"></td>
          <td class="col-num">${p.id}</td>
          <td>${escapeHtml(p.company_name)}</td>
          <td>${escapeHtml(p.representative_name || '-')}</td>
          <td>${escapeHtml(p.representative_phone || '-')}</td>
          <td>${escapeHtml(p.manager_name || p.manager || '-')}</td>
          <td>${escapeHtml(p.project_type)}</td>
          <td>${periodDisplay}</td>
          <td>${priceDisplay}</td>
          <td>${urgentBadge}</td>
          <td><span class="status-badge ${p.status || '진행중'}">${p.status || '진행중'}</span></td>
          <td>${created}</td>
          <td>${updated}</td>
          <td class="col-action">
            <button type="button" class="row-action-btn" data-id="${p.id}" title="더보기"><i class='bx bx-dots-vertical-rounded'></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.row-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => showRowMenu(e, btn.dataset.id));
      });
    }
  } catch (err) {
    console.error('프로젝트 목록 로드 실패:', err);
  }
}

function showRowMenu(e, id) {
  e.stopPropagation();
  const actions = ['진행중', '완료됨', '대기중', '삭제'];
  const existing = document.getElementById('rowMenu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'rowMenu';
  menu.className = 'row-menu';
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px;z-index:300;min-width:120px;`;
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = a === '삭제' ? 'row-menu-item delete' : 'row-menu-item';
    btn.textContent = a;
    btn.onclick = () => {
      menu.remove();
      if (a === '삭제') deleteProject(id);
      else updateProjectStatus(id, a);
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const close = () => { menu.remove(); document.removeEventListener('click', close); };
  setTimeout(() => document.addEventListener('click', close), 0);
}

async function updateProjectStatus(id, status) {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) loadProjects();
  } catch (err) { console.error(err); }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

async function deleteProject(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.success) loadProjects();
    else alert(result.message || '삭제에 실패했습니다.');
  } catch (err) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// 프로젝트 등록 뷰 전환
const projectsListView = document.getElementById('projectsListView');
const projectFormView = document.getElementById('projectFormView');

// 전화번호 자동 포맷 (010-0000-0000)
function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (/^01[0-9]/.test(digits)) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

document.getElementById('representativePhone').addEventListener('input', function() {
  this.value = formatPhoneNumber(this.value);
});

document.getElementById('openProjectModal').addEventListener('click', () => {
  projectsListView.style.display = 'none';
  projectFormView.style.display = 'block';
  document.getElementById('pageTitle').textContent = '편집 및 추가';
  document.getElementById('manager').value = user.username || '';
});

document.getElementById('cancelProjectForm').addEventListener('click', () => {
  projectFormView.style.display = 'none';
  projectsListView.style.display = 'block';
  document.getElementById('pageTitle').textContent = '프로젝트 관리';
});

// 필터 링크
document.querySelectorAll('.filter-link.type-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.filter-link.type-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    projectFilters.project_type = link.dataset.type || '';
    loadProjects();
  });
});
document.querySelectorAll('.filter-link.period-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.filter-link.period-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    projectFilters.contract_period = link.dataset.period || '';
    loadProjects();
  });
});

// 상태 탭
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    projectFilters.status = btn.dataset.status;
    loadProjects();
  });
});

// 검색
document.getElementById('searchBtn').addEventListener('click', () => {
  projectFilters.search = document.getElementById('searchInput').value.trim();
  loadProjects();
});
document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('searchBtn').click();
});

// 엑셀 다운로드
document.getElementById('excelDownload').addEventListener('click', () => {
  const rows = document.querySelectorAll('#projectListBody tr:not(.empty-row)');
  if (rows.length === 0) { alert('다운로드할 데이터가 없습니다.'); return; }
  let csv = '\uFEFF'; // BOM for Excel
  csv += '번호,업체명,대표이름,대표 전화번호,담당자,유형,계약기간,금액,급 제작건,상태,등록일,수정일\n';
  rows.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 13) {
      csv += `"${tds[1].textContent}","${tds[2].textContent}","${tds[3].textContent}","${tds[4].textContent}","${tds[5].textContent}","${tds[6].textContent}","${tds[7].textContent}","${tds[8].textContent}","${tds[9].textContent}","${tds[10].textContent}","${tds[11].textContent}","${tds[12].textContent}"\n`;
    }
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `프로젝트_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

// 전체 선택
document.getElementById('selectAll').addEventListener('change', function() {
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = this.checked);
});

document.getElementById('projectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const companyName = (formData.get('company_name') || '').trim();
  const projectTypeOption = formData.get('project_type_option');
  const managerVal = user.username || formData.get('manager') || '';

  if (!companyName) {
    alert('업체명을 입력해주세요.');
    return;
  }
  if (!projectTypeOption) {
    alert('프로젝트 유형을 선택해주세요.');
    return;
  }
  if (!managerVal) {
    alert('담당자 정보가 없습니다. 다시 로그인해주세요.');
    return;
  }

  const data = {
    company_name: companyName,
    representative_name: (formData.get('representative_name') || '').trim(),
    representative_phone: (formData.get('representative_phone') || '').trim(),
    manager: managerVal,
    project_type_option: projectTypeOption,
    is_urgent: formData.get('is_urgent') === '1',
    memo: (formData.get('memo') || '').trim()
  };

  const saveBtn = form.querySelector('button[type="submit"]') || document.querySelector('button[form="projectForm"]');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> 저장 중...';
  }

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    let result;
    try {
      const text = await res.text();
      result = text ? JSON.parse(text) : { success: false, message: '빈 응답' };
    } catch (e) {
      result = { success: false, message: `응답 파싱 실패 (${res.status})` };
    }
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login/';
        return;
      }
      throw new Error(result.message || `서버 오류 (${res.status})`);
    }
    if (result.success) {
      form.reset();
      document.getElementById('projectStatus').value = '진행중';
      document.getElementById('isUrgent').checked = false;
      projectFormView.style.display = 'none';
      projectsListView.style.display = 'block';
      document.getElementById('pageTitle').textContent = '프로젝트 관리';
      loadProjects();
      loadSalesData();
      alert('프로젝트가 등록되었습니다.');
    } else {
      alert(result.message || '등록에 실패했습니다.');
    }
  } catch (err) {
    console.error('프로젝트 등록 오류:', err);
    alert('등록 중 오류가 발생했습니다: ' + (err.message || err));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bx bx-save"></i> 저장';
    }
  }
});

// 설정 - 내 이름 로드 및 저장
async function loadMyName() {
  try {
    const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.success && result.user) {
      const nameInput = document.getElementById('myNameInput');
      const phoneInput = document.getElementById('myPhoneInput');
      if (nameInput) nameInput.value = result.user.name || '';
      if (phoneInput) phoneInput.value = result.user.phone || '';
    }
  } catch (err) {
    console.error('내 정보 로드 실패:', err);
  }
}

document.getElementById('myPhoneInput')?.addEventListener('input', function() {
  this.value = formatPhoneNumber(this.value);
});

document.getElementById('saveMyNameBtn')?.addEventListener('click', async () => {
  const nameInput = document.getElementById('myNameInput');
  const phoneInput = document.getElementById('myPhoneInput');
  if (!nameInput) return;
  try {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.value.trim(), phone: (phoneInput?.value || '').trim() })
    });
    const result = await res.json();
    if (result.success) {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      u.name = nameInput.value.trim();
      if (phoneInput) u.phone = phoneInput.value.trim();
      localStorage.setItem('user', JSON.stringify(u));
      alert('저장되었습니다.');
    } else {
      alert(result.message || '저장에 실패했습니다.');
    }
  } catch (err) {
    alert('저장 중 오류가 발생했습니다.');
  }
});

// 설정/직원 관리 - 팀원 지정 (관리자 전용)
async function loadUsers(tableBodyId = 'employeesTableBody') {
  try {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login/';
      return false;
    }
    const result = await res.json().catch(() => ({}));
    if (res.status === 403 || !result.success) return false;
    if (!result.success) return false;
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    tbody.innerHTML = '';
    const roleOptions = [
      { value: 'admin', label: '관리자' },
      { value: 'team_leader', label: '팀장' },
      { value: 'user', label: '사원' }
    ];
    result.users.forEach(u => {
      const tr = document.createElement('tr');

      const nameDisplay = (u.name && String(u.name).trim()) ? String(u.name).trim() : '-';
      const nameEditBtn = document.createElement('button');
      nameEditBtn.type = 'button';
      nameEditBtn.className = 'btn-icon';
      nameEditBtn.innerHTML = '<i class="bx bx-edit-alt"></i>';
      nameEditBtn.title = '이름 수정';
      nameEditBtn.onclick = () => {
        const newName = prompt('이름을 입력하세요:', u.name || '');
        if (newName !== null && newName.trim() !== (u.name || '')) {
          updateUserName(u.id, newName.trim(), tableBodyId);
        }
      };

      const pwBtn = document.createElement('button');
      pwBtn.type = 'button';
      pwBtn.className = 'btn-small';
      pwBtn.textContent = '비밀번호 변경';
      pwBtn.onclick = () => {
        const newPw = prompt('새 비밀번호를 입력하세요 (6자 이상):');
        if (newPw && newPw.length >= 6) updateUserPassword(u.id, newPw, tableBodyId);
        else if (newPw !== null) alert('비밀번호는 6자 이상이어야 합니다.');
      };

      const phoneDisplay = (u.phone && String(u.phone).trim()) ? String(u.phone).trim() : '-';
      const phoneEditBtn = document.createElement('button');
      phoneEditBtn.type = 'button';
      phoneEditBtn.className = 'btn-icon';
      phoneEditBtn.innerHTML = '<i class="bx bx-edit-alt"></i>';
      phoneEditBtn.title = '전화번호 수정';
      phoneEditBtn.onclick = () => {
        const newPhone = prompt('전화번호를 입력하세요:', u.phone || '');
        if (newPhone !== null) {
          updateUserPhone(u.id, formatPhoneNumber(newPhone).trim(), tableBodyId);
        }
      };

      const roleSelect = document.createElement('select');
      roleSelect.className = 'team-leader-select role-select';
      roleOptions.forEach(ro => {
        const opt = document.createElement('option');
        opt.value = ro.value;
        opt.textContent = ro.label;
        if (u.role === ro.value) opt.selected = true;
        roleSelect.appendChild(opt);
      });
      roleSelect.addEventListener('change', () => updateUserRole(u.id, roleSelect.value, tableBodyId));

      const tlSelect = document.createElement('select');
      tlSelect.className = 'team-leader-select';
      tlSelect.innerHTML = '<option value="">미지정</option>';
      (result.teamLeaders || []).forEach(tl => {
        const opt = document.createElement('option');
        opt.value = tl.id;
        opt.textContent = tl.username;
        if (u.team_leader_id === tl.id) opt.selected = true;
        tlSelect.appendChild(opt);
      });
      tlSelect.addEventListener('change', () => updateTeamLeader(u.id, tlSelect.value || null, tableBodyId));
      if (u.role === 'admin' || u.role === 'team_leader') {
        tlSelect.disabled = true;
        tlSelect.title = '관리자/팀장은 소속 팀장을 지정할 수 없습니다.';
      }

      const td1 = document.createElement('td');
      td1.className = 'col-name';
      td1.appendChild(document.createTextNode(nameDisplay));
      td1.appendChild(nameEditBtn);

      const td5 = document.createElement('td');
      td5.className = 'col-phone';
      td5.appendChild(document.createTextNode(phoneDisplay));
      td5.appendChild(phoneEditBtn);

      tr.innerHTML = `
        <td></td>
        <td>${escapeHtml(u.username)}</td>
        <td></td>
        <td>${escapeHtml(u.email)}</td>
        <td></td>
        <td></td>
        <td></td>
      `;
      tr.replaceChild(td1, tr.querySelector('td:nth-child(1)'));
      tr.replaceChild(td5, tr.querySelector('td:nth-child(5)'));
      tr.querySelector('td:nth-child(3)').appendChild(pwBtn);
      tr.querySelector('td:nth-child(6)').appendChild(roleSelect);
      tr.querySelector('td:nth-child(7)').appendChild(tlSelect);
      tbody.appendChild(tr);
    });
    return true;
  } catch (err) {
    console.error('사용자 목록 로드 실패:', err);
    return false;
  }
}

async function updateUserRole(userId, role, tableBodyId = 'employeesTableBody') {
  try {
    const res = await fetch(`/api/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const result = await res.json();
    if (result.success) loadUsers(tableBodyId);
    else alert(result.message || '역할 변경에 실패했습니다.');
  } catch (err) {
    console.error('역할 변경 실패:', err);
    alert('수정 중 오류가 발생했습니다.');
  }
}

async function updateUserName(userId, name, tableBodyId = 'employeesTableBody') {
  try {
    const res = await fetch(`/api/users/${userId}/name`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const result = await res.json();
    if (result.success) loadUsers(tableBodyId);
    else alert(result.message || '이름 변경에 실패했습니다.');
  } catch (err) {
    console.error('이름 변경 실패:', err);
    alert('수정 중 오류가 발생했습니다.');
  }
}

async function updateUserPhone(userId, phone, tableBodyId = 'employeesTableBody') {
  try {
    const res = await fetch(`/api/users/${userId}/phone`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const result = await res.json();
    if (result.success) loadUsers(tableBodyId);
    else alert(result.message || '전화번호 변경에 실패했습니다.');
  } catch (err) {
    console.error('전화번호 변경 실패:', err);
    alert('수정 중 오류가 발생했습니다.');
  }
}

async function updateUserPassword(userId, password, tableBodyId = 'employeesTableBody') {
  try {
    const res = await fetch(`/api/users/${userId}/password`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const result = await res.json();
    if (result.success) {
      loadUsers(tableBodyId);
      alert('비밀번호가 변경되었습니다.');
    } else {
      alert(result.message || '비밀번호 변경에 실패했습니다.');
    }
  } catch (err) {
    console.error('비밀번호 변경 실패:', err);
    alert('수정 중 오류가 발생했습니다.');
  }
}

async function updateTeamLeader(userId, teamLeaderId, tableBodyId = 'employeesTableBody') {
  try {
    const res = await fetch(`/api/users/${userId}/team-leader`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_leader_id: teamLeaderId })
    });
    const result = await res.json();
    if (result.success) loadUsers(tableBodyId);
    else alert(result.message || '수정에 실패했습니다.');
  } catch (err) {
    console.error('팀원 지정 실패:', err);
    alert('수정 중 오류가 발생했습니다.');
  }
}
