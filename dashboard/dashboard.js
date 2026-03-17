const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || !user.username) {
  window.location.href = '/login/';
}

// 테마 (다크/라이트)
const themeKey = 'AEROC-theme';
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
    if (window.monthlySalesChart) {
      monthlySalesChart.options.scales.y.grid.color = colors.grid;
      monthlySalesChart.update();
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

  const employeesPage = document.getElementById('employeesPage');
  dashboardContent.style.display = 'none';
  placeholder.style.display = 'none';
  projectsPage.style.display = 'none';
  if (employeesPage) employeesPage.style.display = 'none';

  if (pageName === 'dashboard') {
    dashboardContent.style.display = 'block';
    loadSalesData();
    loadContracts();
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
  } else {
    placeholder.style.display = 'block';
    placeholder.querySelector('p').textContent = `${document.querySelector(`[data-page="${pageName}"] .label`)?.textContent || pageName} - 준비 중인 페이지입니다.`;
  }
}

// URL 해시 기반 페이지 로드 (새로고침 시 현재 페이지 유지)
function getPageFromHash() {
  const hash = window.location.hash.slice(1);
  const validPages = ['dashboard', 'projects', 'employees'];
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
      label: '일일금액 (만원)',
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

const monthlyCtx = document.getElementById('monthlySalesChart').getContext('2d');
window.monthlySalesChart = new Chart(monthlyCtx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: '이번달 금액 (만원)',
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
      label: '누적금액 (만원)',
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

    document.querySelectorAll('.chart-card h4')[0].textContent = '일일금액';
    dailySalesChart.data.labels = result.daily.labels;
    dailySalesChart.data.datasets[0].data = result.daily.data;
    dailySalesChart.data.datasets[0].label = '만원';
    dailySalesChart.update();

    document.querySelectorAll('.chart-card h4')[1].textContent = '이번달 금액';
    monthlySalesChart.data.labels = result.monthly?.labels || [];
    monthlySalesChart.data.datasets[0].data = result.monthly?.data || [];
    monthlySalesChart.data.datasets[0].label = '만원';
    monthlySalesChart.update();

    document.querySelectorAll('.chart-card h4')[2].textContent = '누적금액';
    cumulativeSalesChart.data.labels = result.cumulative.labels;
    cumulativeSalesChart.data.datasets[0].data = result.cumulative.data;
    cumulativeSalesChart.data.datasets[0].label = '만원';
    cumulativeSalesChart.update();
  } catch (err) {
    console.error('매출 데이터 로드 실패:', err);
  }
}

async function loadContracts() {
  try {
    const res = await fetch('/api/contracts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '조회 실패');

    const tbody = document.getElementById('contractsListBody');
    if (!result.contracts || result.contracts.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="3">등록된 계약이 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = result.contracts.map(c => {
      const displayName = c.manager_name || c.manager || '-';
      const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '-';
      return `<tr>
        <td>${escapeHtml(c.company_name || '-')}</td>
        <td>${escapeHtml(displayName)}</td>
        <td>${dateStr}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('계약건 로드 실패:', err);
    document.getElementById('contractsListBody').innerHTML = '<tr class="empty-row"><td colspan="3">로드 실패</td></tr>';
  }
}

// 기간별 계약건·랭킹 초기화
(function initPeriodSelector() {
  const yearSelect = document.getElementById('periodYear');
  const monthSelect = document.getElementById('periodMonth');
  const now = new Date();
  const currentYear = now.getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '년';
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  monthSelect.value = String(now.getMonth() + 1);
})();

async function loadPeriodData() {
  const year = document.getElementById('periodYear').value;
  const month = document.getElementById('periodMonth').value;
  if (!year || !month) return;

  try {
    const [contractsRes, rankingRes] = await Promise.all([
      fetch(`/api/contracts?year=${year}&month=${month}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/sales/ranking?year=${year}&month=${month}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const contractsResult = await contractsRes.json();
    const rankingResult = await rankingRes.json();

    // 랭킹 배너
    const placeholder = document.getElementById('rankingPlaceholder');
    const content = document.getElementById('rankingContent');
    const rankName = document.getElementById('rankingName');
    const rankAmount = document.getElementById('rankingAmount');
    const rankCount = document.getElementById('rankingCount');

    if (rankingResult.success && rankingResult.ranking && rankingResult.ranking.length > 0) {
      const first = rankingResult.ranking[0];
      placeholder.style.display = 'none';
      content.style.display = 'flex';
      rankName.textContent = first.manager_name || first.manager || '-';
      rankAmount.textContent = '총 ' + (first.total || 0).toLocaleString() + '원';
      rankCount.textContent = (first.cnt || 0) + '건';
    } else {
      placeholder.style.display = 'block';
      content.style.display = 'none';
      placeholder.textContent = `${year}년 ${month}월 계약이 없습니다.`;
    }

    // 계약건 테이블
    const tbody = document.getElementById('periodContractsListBody');
    if (!contractsResult.success || !contractsResult.contracts || contractsResult.contracts.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4">${year}년 ${month}월 계약이 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = contractsResult.contracts.map(c => {
      const displayName = c.manager_name || c.manager || '-';
      const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '-';
      const priceStr = (c.price != null && c.price > 0) ? c.price.toLocaleString() + '원' : '-';
      return `<tr>
        <td>${escapeHtml(c.company_name || '-')}</td>
        <td>${escapeHtml(displayName)}</td>
        <td>${priceStr}</td>
        <td>${dateStr}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('기간별 데이터 로드 실패:', err);
    document.getElementById('periodContractsListBody').innerHTML = '<tr class="empty-row"><td colspan="4">로드 실패</td></tr>';
    document.getElementById('rankingPlaceholder').textContent = '로드 실패';
    document.getElementById('rankingPlaceholder').style.display = 'block';
    document.getElementById('rankingContent').style.display = 'none';
  }
}

document.getElementById('loadPeriodBtn').addEventListener('click', loadPeriodData);

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
      const isAdmin = result.isAdmin === true;
      const myId = user.id;
      result.projects.forEach(p => {
        const canModify = isAdmin || (p.created_by != null && String(p.created_by) === String(myId));
        const tr = document.createElement('tr');
        const created = new Date(p.created_at).toLocaleDateString('ko-KR');
        const periodDisplay = p.contract_period === 0 ? '-' : `${p.contract_period}년`;
        const priceDisplay = (p.price != null && p.price > 0) ? p.price.toLocaleString() + '원' : '-';
        const urgentBadge = p.is_urgent ? '<span class="urgent-badge">급 제작건</span>' : '-';
        const devDisplay = escapeHtml(p.developer || '-');
        const url = (p.website_url || '').trim();
        const urlDisplay = url && (url.startsWith('http://') || url.startsWith('https://'))
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="url-link">${escapeHtml(url)}</a>` : (url ? escapeHtml(url) : '-');
        const actionCell = canModify
          ? `<button type="button" class="row-action-btn" data-id="${p.id}" title="더보기"><i class='bx bx-dots-vertical-rounded'></i></button>`
          : '<span class="text-muted">-</span>';
        tr.innerHTML = `
          <td>${escapeHtml(p.company_name)}</td>
          <td>${escapeHtml(p.manager_name || p.manager || '-')}</td>
          <td>${devDisplay}</td>
          <td>${urlDisplay}</td>
          <td>${escapeHtml(p.project_type)}</td>
          <td>${periodDisplay}</td>
          <td>${priceDisplay}</td>
          <td>${urgentBadge}</td>
          <td><span class="status-badge ${p.status || '진행중'}">${p.status || '진행중'}</span></td>
          <td>${created}</td>
          <td class="col-action">${actionCell}</td>
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
  const actions = ['수정', '진행중', '완료됨', '대기중', '삭제'];
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
      else if (a === '수정') openEditProject(id);
      else updateProjectStatus(id, a);
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const pad = 8;
  let left = e.clientX;
  let top = e.clientY;
  if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
  if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  const close = () => { menu.remove(); document.removeEventListener('click', close); };
  setTimeout(() => document.addEventListener('click', close), 0);
}

let editingProjectId = null;

async function openEditProject(id) {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (!result.success || !result.project) {
      alert(result.message || '프로젝트를 불러올 수 없습니다.');
      return;
    }
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
    const pt = p.project_type || '';
    if (pt.startsWith('프로모션_')) {
      document.getElementById('projectType').value = pt;
    } else if (pt === '최고급형') {
      document.getElementById('projectType').value = '최고급형';
    } else {
      document.getElementById('projectType').value = `${pt}_${p.contract_period || 0}`;
    }
    syncProjectAmountField();
    document.getElementById('projectAmount').value = p.price ?? '';
    document.getElementById('developer').value = p.developer || '';
    document.getElementById('websiteUrl').value = p.website_url || '';
    document.getElementById('projectMemo').value = p.memo || '';
    document.getElementById('projectStatus').value = p.status || '진행중';
    document.getElementById('isUrgent').checked = !!p.is_urgent;
  } catch (err) {
    console.error(err);
    alert('프로젝트를 불러오는 중 오류가 발생했습니다.');
  }
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

const PRICE_MAP = {
  '기본형_3': 1980000,
  '기본형_5': 2640000,
  '고급형_3': 2376000,
  '고급형_5': 3300000,
  '최고급형': null,
  '프로모션_기본형': null,
  '프로모션_고급형': null,
  '프로모션_최고급형': null
};

const CUSTOM_AMOUNT_OPTIONS = ['최고급형', '프로모션_기본형', '프로모션_고급형', '프로모션_최고급형'];

function syncProjectAmountField() {
  const sel = document.getElementById('projectType');
  const wrap = document.getElementById('projectAmountWrap');
  const input = document.getElementById('projectAmount');
  const opt = sel?.value || '';
  if (!opt) {
    wrap.style.display = 'none';
    input.removeAttribute('required');
    input.value = '';
    return;
  }
  wrap.style.display = 'block';
  input.setAttribute('required', 'required');
  const defaultPrice = PRICE_MAP[opt];
  if (defaultPrice != null) {
    input.value = defaultPrice;
    input.placeholder = '금액을 입력하세요 (프로모션 시 수정 가능)';
  } else {
    input.value = '';
    input.placeholder = '금액을 입력하세요';
  }
}

document.getElementById('projectType').addEventListener('change', syncProjectAmountField);

document.getElementById('openProjectModal').addEventListener('click', () => {
  editingProjectId = null;
  projectsListView.style.display = 'none';
  projectFormView.style.display = 'block';
  document.getElementById('pageTitle').textContent = '편집 및 추가';
  document.getElementById('projectForm').reset();
  document.getElementById('projectStatus').value = '진행중';
  document.getElementById('isUrgent').checked = false;
  document.getElementById('manager').value = user.username || '';
  document.getElementById('manager').setAttribute('readonly', 'readonly');
  syncProjectAmountField();
});

document.getElementById('cancelProjectForm').addEventListener('click', () => {
  editingProjectId = null;
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
  csv += '업체명,담당자,개발자,홈페이지 URL,유형,계약기간,금액,급 제작건,상태,등록일\n';
  rows.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 10) {
      csv += `"${tds[0].textContent}","${tds[1].textContent}","${tds[2].textContent}","${tds[3].textContent}","${tds[4].textContent}","${tds[5].textContent}","${tds[6].textContent}","${tds[7].textContent}","${tds[8].textContent}","${tds[9].textContent}"\n`;
    }
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `프로젝트_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
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
  const amountStr = formData.get('project_amount') || '';
  const amountNum = amountStr ? parseInt(amountStr, 10) : 0;
  if (isNaN(amountNum) || amountNum < 0) {
    alert('금액을 올바르게 입력해주세요.');
    return;
  }
  if (CUSTOM_AMOUNT_OPTIONS.includes(projectTypeOption) && amountNum === 0) {
    alert('금액을 입력해주세요.');
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
    project_amount: amountNum,
    is_urgent: formData.get('is_urgent') === '1',
    memo: (formData.get('memo') || '').trim(),
    developer: (formData.get('developer') || '').trim(),
    website_url: (formData.get('website_url') || '').trim()
  };

  const saveBtn = form.querySelector('button[type="submit"]') || document.querySelector('button[form="projectForm"]');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> 저장 중...';
  }

  try {
    const isEdit = !!editingProjectId;
    const url = isEdit ? `/api/projects/${editingProjectId}` : '/api/projects';
    const method = isEdit ? 'PATCH' : 'POST';
    const body = isEdit ? { ...data, status: formData.get('status') || '진행중' } : data;

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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
      editingProjectId = null;
      document.getElementById('projectStatus').value = '진행중';
      document.getElementById('isUrgent').checked = false;
      projectFormView.style.display = 'none';
      projectsListView.style.display = 'block';
      document.getElementById('pageTitle').textContent = '프로젝트 관리';
      loadProjects();
      loadSalesData();
      alert(isEdit ? '프로젝트가 수정되었습니다.' : '프로젝트가 등록되었습니다.');
    } else {
      alert(result.message || (isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.'));
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

// 직원 관리 - 팀원 지정 (관리자 전용)
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
