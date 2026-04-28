/**
 * dashboard.js - 진입점 (라우팅 + 인증 + 테마)
 * 각 기능은 modules/ 폴더의 모듈로 분리됨:
 *   modules/home.js      - 홈 차트 & 대시보드 데이터
 *   modules/projects.js  - 프로젝트 관리
 *   modules/vault.js     - 비밀번호 금고
 *   modules/vacation.js  - 휴가 관리
 *   modules/staff.js     - 직원 관리 (관리자)
 *   modules/customers.js - 견적서 관리(업체)
 *   modules/utils.js     - 공통 유틸
 */
import { initCharts, updateChartColors, loadDashboardData } from './modules/home.js';
import { initProjects, loadProjects } from './modules/projects.js';
import { initVault, loadVaultData } from './modules/vault.js';
import { initVacation, loadLeaveData } from './modules/vacation.js';
import { initStaff, loadStaffData } from './modules/staff.js';
import { initCustomers, loadCustomerData } from './modules/customers.js';
import { initQuote, loadQuotePage } from './modules/quote.js';
import { initAttendance, loadAttendance } from './modules/attendance.js';
import { initSchedule, loadSchedulePage } from './modules/schedule.js';
import { initOutsourcing, loadOutsourcing } from './modules/outsourcing.js';
import { initWorkreport, loadWorkreport } from './modules/workreport.js';

// ── 인증 체크 ──────────────────────────────────────────
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!token || !user.username) { window.location.href = '/login/'; }

// ── 사용자 정보 표시 ───────────────────────────────────
document.getElementById('userName').textContent = user.name || user.username;
document.getElementById('userEmail').textContent = user.email || '';
const avatarChar = (user.name || user.username || 'A').charAt(0).toUpperCase();
const userAvatarEl = document.getElementById('userAvatar');
if (userAvatarEl) userAvatarEl.textContent = avatarChar;
const sidebarAvatarEl = document.getElementById('sidebarUserAvatar');
if (sidebarAvatarEl) sidebarAvatarEl.textContent = avatarChar;
document.getElementById('sidebarUserName').textContent = user.name || user.username;
const roleMap = { admin: '관리자', team_leader: '팀장', user: '사원' };
const roleLabel = roleMap[user.role] || '멤버';
document.getElementById('sidebarUserRole').textContent = roleLabel;
const badge = document.getElementById('sidebarRoleBadge');
if (badge) badge.textContent = roleLabel;

if (user.role === 'admin') {
  document.getElementById('adminNavSection').style.display = '';
}

// ── 테마 ───────────────────────────────────────────────
const themeKey = 'AEROC-theme';
const savedTheme = localStorage.getItem(themeKey) || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

const themeToggle = document.getElementById('themeToggle');
const themeIconLight = document.getElementById('themeIconLight');
const themeIconDark = document.getElementById('themeIconDark');

function updateThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (themeIconLight) themeIconLight.style.display = isDark ? 'none' : 'block';
  if (themeIconDark) themeIconDark.style.display = isDark ? 'block' : 'none';
}
updateThemeIcons();

themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(themeKey, next);
  updateThemeIcons();
  updateChartColors();
});

// ── 사이드바 (모바일) ──────────────────────────────────
const sidebar = document.getElementById('sidebar');
const sidebarOpen = document.getElementById('sidebarOpen');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function closeSidebar() {
  sidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('active');
}
sidebarOpen?.addEventListener('click', () => { sidebar?.classList.add('open'); sidebarOverlay?.classList.add('active'); });
sidebarClose?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// ── 프로필 드롭다운 ────────────────────────────────────
const userProfile = document.getElementById('userProfile');
const profileDropdown = document.getElementById('profileDropdown');
userProfile?.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown?.classList.toggle('show'); });
document.addEventListener('click', () => profileDropdown?.classList.remove('show'));
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login/';
});

// ── 페이지 전환 ────────────────────────────────────────
const PAGES = {
  home: document.getElementById('dashboardContent'),
  'admin-dashboard': document.getElementById('dashboardContent'),
  projects: document.getElementById('projectsPage'),
  employees: document.getElementById('employeesPage'),
  'password-vault': document.getElementById('passwordVaultPage'),
  leave: document.getElementById('leavePage'),
  'staff-mgmt': document.getElementById('staffMgmtPage'),
  customers: document.getElementById('customersPage'),
  quote: document.getElementById('quotePage'),
  attendance: document.getElementById('attendancePage'),
  schedule: document.getElementById('schedulePage'),
  outsourcing: document.getElementById('outsourcingPage'),
  workreport: document.getElementById('workreportPage'),
};
const placeholder = document.getElementById('pagePlaceholder');

function hideAllPages() {
  placeholder.style.display = 'none';
  Object.values(PAGES).forEach(el => { if (el) el.style.display = 'none'; });
}

function showPage(pageName) {
  hideAllPages();

  switch (pageName) {
    case 'home':
      PAGES.home.style.display = 'block';
      loadDashboardData(token, { includeOutsourcing: false });
      break;
    case 'admin-dashboard':
      if (user.role !== 'admin') { placeholder.style.display = 'block'; placeholder.querySelector('p').textContent = '관리자만 접근할 수 있습니다.'; return; }
      PAGES['admin-dashboard'].style.display = 'block';
      loadDashboardData(token, { includeOutsourcing: true });
      break;
    case 'projects':
      PAGES.projects.style.display = 'block';
      document.getElementById('projectsListView').style.display = 'block';
      document.getElementById('projectFormView').style.display = 'none';
      loadProjects();
      break;
    case 'password-vault':
      if (PAGES['password-vault']) { PAGES['password-vault'].style.display = 'block'; loadVaultData(); }
      break;
    case 'leave':
      if (PAGES.leave) { PAGES.leave.style.display = 'flex'; loadLeaveData(); }
      break;
    case 'staff-mgmt':
      if (user.role !== 'admin') { placeholder.style.display = 'block'; placeholder.querySelector('p').textContent = '관리자만 접근할 수 있습니다.'; return; }
      if (PAGES['staff-mgmt']) { PAGES['staff-mgmt'].style.display = 'flex'; loadStaffData(); }
      break;
    case 'customers':
      if (PAGES.customers) { PAGES.customers.style.display = 'block'; loadCustomerData(); }
      break;
    case 'quote':
      if (PAGES.quote) { PAGES.quote.style.display = 'block'; loadQuotePage(); }
      break;
    case 'attendance':
      if (user.role !== 'admin') { placeholder.style.display = 'block'; placeholder.querySelector('p').textContent = '관리자만 접근할 수 있습니다.'; return; }
      if (PAGES.attendance) { PAGES.attendance.style.display = 'block'; loadAttendance(); }
      break;
    case 'schedule':
      if (PAGES.schedule) { PAGES.schedule.style.display = 'block'; loadSchedulePage(); }
      break;
    case 'outsourcing':
      if (user.role !== 'admin') { placeholder.style.display = 'block'; placeholder.querySelector('p').textContent = '관리자만 접근할 수 있습니다.'; return; }
      if (PAGES.outsourcing) { PAGES.outsourcing.style.display = 'block'; loadOutsourcing(); }
      break;
    case 'workreport':
      if (PAGES.workreport) { PAGES.workreport.style.display = 'block'; loadWorkreport(); }
      break;
    case 'employees':
      if (PAGES.employees) {
        PAGES.employees.style.display = 'block';
        const empSection = document.getElementById('employeesSection');
        const empPlaceholder = document.getElementById('employeesPlaceholder');
        if (empSection && empPlaceholder) {
          empSection.style.display = 'none';
          empPlaceholder.style.display = 'block';
          empPlaceholder.querySelector('p').textContent = '로딩 중...';
          // employees 페이지는 기존 loadUsers 함수 사용 (별도 모듈화 예정)
          window.loadUsers?.('employeesTableBody').then(isAdmin => {
            if (isAdmin) { empSection.style.display = 'block'; empPlaceholder.style.display = 'none'; }
            else { empPlaceholder.querySelector('p').textContent = '관리자만 접근할 수 있습니다.'; }
          });
        }
      }
      break;
    default:
      placeholder.style.display = 'block';
      placeholder.querySelector('p').textContent = `${document.querySelector(`[data-page="${pageName}"] .label`)?.textContent || pageName} - 준비 중인 페이지입니다.`;
  }
}

function getPageFromHash() {
  const hash = window.location.hash.slice(1);
  const validPages = ['home', 'admin-dashboard', 'projects', 'employees', 'password-vault', 'leave', 'staff-mgmt', 'customers', 'quote', 'attendance', 'schedule', 'outsourcing', 'workreport'];
  return validPages.includes(hash) ? hash : 'home';
}

function syncNavAndPage() {
  const page = getPageFromHash();
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  const link = document.querySelector(`.nav-link[data-page="${page}"]`);
  document.getElementById('pageTitle').textContent = link?.querySelector('.label')?.textContent || '대시보드';
  showPage(page);
}

window.addEventListener('hashchange', syncNavAndPage);
window.addEventListener('load', syncNavAndPage);
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => { if (window.innerWidth < 1024) closeSidebar(); });
});

// ── 모듈 초기화 ────────────────────────────────────────
initCharts();
initProjects(token, user);
initVault(token, user);
initVacation(token, user);
initStaff(token);
initCustomers(token);
initQuote();
initAttendance(token);
initSchedule(token);
initOutsourcing(token, user);
initWorkreport(token, user);
