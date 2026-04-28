// 홈 대시보드 - 차트 초기화 및 데이터 로드
import { escapeHtml, formatWon } from './utils.js';

let token = '';

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(229,231,235,0.8)',
    text: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb'
  };
}

export function initCharts() {
  const colors = getChartColors();
  Chart.defaults.color = colors.text;
  Chart.defaults.borderColor = colors.border;

  const dailyCtx = document.getElementById('dailySalesChart')?.getContext('2d');
  if (dailyCtx) {
    window.dailySalesChartInst = new Chart(dailyCtx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: '매출 (만원)', data: [], borderColor: '#0064FF', backgroundColor: 'rgba(0,100,255,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#0064FF', borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}만원` } } }, scales: { y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } } }
    });
  }

  const projectStatusCtx = document.getElementById('projectStatusChart')?.getContext('2d');
  if (projectStatusCtx) {
    window.projectStatusChartInst = new Chart(projectStatusCtx, {
      type: 'doughnut',
      data: { labels: ['진행중', '완료됨', '대기중'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#0064FF', '#22c55e', '#e5e7eb'], borderWidth: 0, hoverOffset: 3 }] },
      options: { responsive: true, maintainAspectRatio: true, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}건` } } } }
    });
  }

  const contractRateCtx = document.getElementById('contractRateChart')?.getContext('2d');
  if (contractRateCtx) {
    window.contractRateChartInst = new Chart(contractRateCtx, {
      type: 'doughnut',
      data: { labels: ['최근(7일)', '이번달', '이전'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#f59e0b', '#0064FF', '#e5e7eb'], borderWidth: 0, hoverOffset: 3 }] },
      options: { responsive: true, maintainAspectRatio: true, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}건` } } } }
    });
  }
}

export function updateChartColors() {
  const colors = getChartColors();
  Chart.defaults.color = colors.text;
  Chart.defaults.borderColor = colors.border;
  if (window.dailySalesChartInst) {
    window.dailySalesChartInst.options.scales.y.grid.color = colors.grid;
    window.dailySalesChartInst.update();
  }
}

export async function loadDashboardData(authToken, options = {}) {
  token = authToken;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const h = { 'Authorization': `Bearer ${token}` };
  const out = options.includeOutsourcing ? '&include_outsourcing=1' : '';
  const outQ = options.includeOutsourcing ? '?include_outsourcing=1' : '';

  try {
    const [projectsRes, allContractsRes, monthlyContractsRes, salesRes, rankingRes] = await Promise.all([
      fetch('/api/projects', { headers: h }),
      fetch(`/api/contracts${outQ}`, { headers: h }),
      fetch(`/api/contracts?year=${year}&month=${month}${out}`, { headers: h }),
      fetch(`/api/sales${outQ}`, { headers: h }),
      fetch(`/api/sales/ranking?year=${year}&month=${month}${out}`, { headers: h })
    ]);
    const [projects, allContracts, monthlyContracts, sales, ranking] = await Promise.all([
      projectsRes.json(), allContractsRes.json(), monthlyContractsRes.json(), salesRes.json(), rankingRes.json()
    ]);

    if (projects.success) updateProjectWidgets(projects);
    if (allContracts.success && monthlyContracts.success) updateContractWidgets(allContracts, monthlyContracts);
    if (sales.success) updateSalesWidgets(sales, monthlyContracts);
    if (ranking.success) updateRankingWidget(ranking, year, month);
  } catch (err) {
    console.error('대시보드 데이터 로드 실패:', err);
  }
}

function updateProjectWidgets(projects) {
  const counts = projects.counts || {};
  const inProgress = counts['진행중'] || 0;
  const done = counts['완료됨'] || 0;
  const pending = counts['대기중'] || 0;
  const total = counts['전체'] || 0;

  document.getElementById('statProgress').textContent = inProgress;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statDone').textContent = done;

  const completePct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('projectCompletePct').textContent = `${completePct}%`;
  document.getElementById('legendProgress').textContent = `${inProgress}건`;
  document.getElementById('legendDone').textContent = `${done}건`;
  document.getElementById('legendTotal').textContent = `${total}건`;

  if (window.projectStatusChartInst) {
    window.projectStatusChartInst.data.datasets[0].data = [inProgress, done, pending || 0.001];
    window.projectStatusChartInst.update();
  }

  document.getElementById('settlementPending').textContent = `${inProgress}건`;
  document.getElementById('settlementDone').textContent = `${done}건`;
  document.getElementById('pendingCount').textContent = `${pending}건`;
}

function updateContractWidgets(allContracts, monthlyContracts) {
  const allList = allContracts.contracts || [];
  const monthlyList = monthlyContracts.contracts || [];
  const totalCount = allList.length;
  const monthCount = monthlyList.length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCount = allList.filter(c => c.created_at && new Date(c.created_at) >= sevenDaysAgo).length;

  document.getElementById('statMonthlyContracts').textContent = monthCount;
  const remainCount = Math.max(totalCount - monthCount - recentCount, 0);
  const contractRate = totalCount > 0 ? Math.round((monthCount / totalCount) * 100) : 0;
  document.getElementById('contractRatePct').textContent = `${contractRate}%`;
  document.getElementById('contractRecent').textContent = `${recentCount}건`;
  document.getElementById('contractMonth').textContent = `${monthCount}건`;
  document.getElementById('contractTotal').textContent = `${totalCount}건`;

  if (window.contractRateChartInst) {
    window.contractRateChartInst.data.datasets[0].data = [recentCount || 0.001, monthCount || 0.001, remainCount || 0.001];
    window.contractRateChartInst.update();
  }

  if (allList.length > 0) {
    const latest = allList[0];
    const d = latest.created_at ? new Date(latest.created_at) : new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    document.getElementById('bannerDay').textContent = d.getDate();
    document.getElementById('bannerMonth').textContent = months[d.getMonth()];
    document.getElementById('bannerCompany').textContent = latest.company_name || '-';
    document.getElementById('bannerMeta').textContent = `담당: ${latest.manager_name || latest.manager || '-'}`;
  }
  updateRecentContractsList(allList.slice(0, 6));
}

function updateRecentContractsList(contracts) {
  const el = document.getElementById('recentContractsList');
  if (!el) return;
  if (!contracts || contracts.length === 0) { el.innerHTML = '<div class="recent-empty">등록된 계약이 없습니다.</div>'; return; }
  el.innerHTML = contracts.map(c => `
    <div class="recent-item">
      <div class="recent-item-left">
        <span class="recent-item-name">${escapeHtml(c.company_name || '-')}</span>
        <span class="recent-item-sub">${escapeHtml(c.manager_name || c.manager || '-')}</span>
      </div>
      <span class="recent-item-badge">${c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}</span>
    </div>
  `).join('');
}

function updateSalesWidgets(sales, monthlyContracts) {
  const monthlyData = sales.monthly?.data || [];
  const monthlyTotalWon = monthlyData.reduce((sum, v) => sum + v, 0) * 10000;
  const cumulativeData = sales.cumulative?.data || [];
  const cumulativeTotalWon = (cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1] : 0) * 10000;
  const monthlyList = (monthlyContracts.contracts || []).filter(c => c.price && c.price > 0);
  const avgPrice = monthlyList.length > 0 ? Math.round(monthlyList.reduce((sum, c) => sum + c.price, 0) / monthlyList.length) : 0;

  document.getElementById('avgPrice').textContent = formatWon(avgPrice);
  document.getElementById('avgPriceSub').textContent = '이번달 평균 단가';
  document.getElementById('cumulativeTotal').textContent = formatWon(cumulativeTotalWon);
  document.getElementById('monthlyTotalAmt').textContent = formatWon(monthlyTotalWon);
  document.getElementById('monthlyContractCnt').textContent = (monthlyContracts.contracts || []).length;
  document.getElementById('settlementAmount').textContent = formatWon(monthlyTotalWon);

  if (window.dailySalesChartInst) {
    window.dailySalesChartInst.data.labels = sales.daily?.labels || [];
    window.dailySalesChartInst.data.datasets[0].data = sales.daily?.data || [];
    window.dailySalesChartInst.update();
  }
}

function updateRankingWidget(ranking, year, month) {
  const el = document.getElementById('rankingList');
  document.getElementById('rankingMonthLabel').textContent = `${month}월`;
  const list = ranking.ranking || [];
  if (!el) return;
  if (list.length === 0) { el.innerHTML = '<div class="recent-empty">이번달 데이터가 없습니다.</div>'; return; }
  const maxTotal = list[0].total || 1;
  el.innerHTML = list.slice(0, 5).map(r => {
    const pct = Math.round((r.total / maxTotal) * 100);
    return `
      <div class="resource-item">
        <div class="resource-item-header">
          <span class="resource-name">${escapeHtml(r.manager_name || r.manager || '-')}</span>
          <span class="resource-meta">매출: ${formatWon(r.total || 0)} · ${r.cnt || 0}건</span>
        </div>
        <div class="resource-bar-bg"><div class="resource-bar-fill" style="width: ${pct}%"></div></div>
      </div>`;
  }).join('');
}
