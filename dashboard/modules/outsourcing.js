// 외주관리 모듈 (관리자 전용)
import { escapeHtml, formatPhoneNumber } from './utils.js';

let token = '';
let currentUser = {};
let editingId = null;
let filters = { status: '전체', search: '' };

const OUTSOURCE_PRICES = { '기본형': 150000, '고급형': 200000 };

function syncPriceDisplay() {
  const type = document.getElementById('outType')?.value;
  const el = document.getElementById('outPriceDisplay');
  if (!el) return;
  if (type && OUTSOURCE_PRICES[type] !== undefined) {
    el.textContent = OUTSOURCE_PRICES[type].toLocaleString('ko-KR') + '원';
    el.style.fontSize = '18px';
    el.style.fontWeight = '700';
    el.style.color = '';
  } else {
    el.textContent = '유형을 선택하면 자동 계산됩니다';
    el.style.fontSize = '13.5px';
    el.style.fontWeight = '400';
    el.style.color = 'var(--text-secondary)';
  }
}

// ── 데이터 로드 ───────────────────────────────────────────
export async function loadOutsourcing() {
  try {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== '전체') params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);

    const res = await fetch('/api/outsourcing?' + params.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    document.getElementById('outCountAll').textContent      = result.counts?.전체   ?? 0;
    document.getElementById('outCountProgress').textContent = result.counts?.진행중 ?? 0;
    document.getElementById('outCountDone').textContent     = result.counts?.완료됨 ?? 0;
    document.getElementById('outCountPending').textContent  = result.counts?.대기중 ?? 0;

    const tbody    = document.getElementById('outsourcingListBody');
    const emptyRow = document.getElementById('outsourcingEmptyRow');
    tbody.querySelectorAll('tr:not(.empty-row)').forEach(r => r.remove());

    if (!result.items.length) {
      emptyRow.style.display = '';
    } else {
      emptyRow.style.display = 'none';
      result.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const priceDisplay = item.price ? Number(item.price).toLocaleString('ko-KR') + '원' : '-';

        tr.innerHTML = `
          <td>${escapeHtml(item.company_name)}</td>
          <td>${escapeHtml(item.representative || '-')}</td>
          <td>${escapeHtml(item.phone || '-')}</td>
          <td>${escapeHtml(item.outsource_type)}</td>
          <td>${priceDisplay}</td>
          <td>${escapeHtml(item.manager || '-')}</td>
          <td><span class="status-badge ${item.status || '진행중'}">${item.status || '진행중'}</span></td>
          <td>${new Date(item.created_at).toLocaleDateString('ko-KR')}</td>
          <td class="col-action"><div class="col-action-wrap">
            <button type="button" class="row-action-btn" data-id="${item.id}" title="더보기"><i class='bx bx-dots-vertical-rounded'></i></button>
          </div></td>`;

        tr.addEventListener('click', e => {
          if (e.target.closest('.row-action-btn')) return;
          openEditView(item.id);
        });
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.row-action-btn').forEach(btn => {
        btn.addEventListener('click', e => showRowMenu(e, btn.dataset.id));
      });
    }
  } catch (err) {
    console.error('외주 목록 로드 실패:', err);
  }
}

// ── 행 메뉴 ─────────────────────────────────────────────
function showRowMenu(e, id) {
  e.stopPropagation();
  document.getElementById('outRowMenu')?.remove();
  const menu = document.createElement('div');
  menu.id = 'outRowMenu';
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px;z-index:300;min-width:120px;`;
  ['수정', '진행중', '완료됨', '대기중', '삭제'].forEach(a => {
    const btn = document.createElement('button');
    btn.className = a === '삭제' ? 'row-menu-item delete' : 'row-menu-item';
    btn.textContent = a;
    btn.onclick = () => {
      menu.remove();
      if (a === '삭제') deleteItem(id);
      else if (a === '수정') openEditView(id);
      else updateStatus(id, a);
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const pad = 8;
  let left = e.clientX, top = e.clientY;
  if (left + rect.width  > window.innerWidth  - pad) left = window.innerWidth  - rect.width  - pad;
  if (top  + rect.height > window.innerHeight - pad) top  = window.innerHeight - rect.height - pad;
  menu.style.left = `${left}px`; menu.style.top = `${top}px`;
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

// ── 상태 변경 ────────────────────────────────────────────
async function updateStatus(id, status) {
  try {
    const res = await fetch(`/api/outsourcing/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) loadOutsourcing();
  } catch (err) { console.error(err); }
}

// ── 삭제 ─────────────────────────────────────────────────
async function deleteItem(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/outsourcing/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.success) loadOutsourcing();
    else alert(result.message || '삭제 실패');
  } catch (err) { alert('삭제 중 오류가 발생했습니다.'); }
}

// ── 등록/수정 뷰 열기 ─────────────────────────────────────
async function openEditView(id) {
  const listView = document.getElementById('outsourcingListView');
  const formView = document.getElementById('outsourcingFormView');
  listView.style.display = 'none';
  formView.style.display = 'block';

  if (id) {
    editingId = id;
    document.getElementById('outPageTitle').textContent = '외주 수정';
    try {
      const res = await fetch(`/api/outsourcing/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (!result.success) { alert(result.message || '불러오기 실패'); return; }
      const p = result.item;
      document.getElementById('outCompanyName').value    = p.company_name    || '';
      document.getElementById('outRepresentative').value = p.representative  || '';
      document.getElementById('outPhone').value          = p.phone           || '';
      document.getElementById('outManager').value        = p.manager         || '';
      document.getElementById('outType').value           = p.outsource_type  || '';
      document.getElementById('outStatus').value         = p.status          || '진행중';
      document.getElementById('outMemo').value           = p.memo            || '';
      syncPriceDisplay();
    } catch { alert('불러오는 중 오류가 발생했습니다.'); }
  } else {
    editingId = null;
    document.getElementById('outPageTitle').textContent = '외주 등록';
    document.getElementById('outsourcingForm').reset();
    document.getElementById('outStatus').value  = '진행중';
    document.getElementById('outManager').value = currentUser.name || currentUser.username || '';
    syncPriceDisplay();
  }
}

// ── 공개 API ─────────────────────────────────────────────
export function initOutsourcing(authToken, user) {
  token = authToken;
  currentUser = user;

  const listView = document.getElementById('outsourcingListView');
  const formView = document.getElementById('outsourcingFormView');

  document.getElementById('openOutsourcingModal')?.addEventListener('click', () => openEditView(null));

  document.getElementById('outType')?.addEventListener('change', syncPriceDisplay);

  document.getElementById('outPhone')?.addEventListener('input', function () {
    this.value = formatPhoneNumber(this.value);
  });

  document.getElementById('cancelOutsourcingForm')?.addEventListener('click', () => {
    editingId = null;
    formView.style.display  = 'none';
    listView.style.display  = 'block';
    document.getElementById('outPageTitle').textContent = '외주관리';
  });

  document.querySelectorAll('.out-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.out-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filters.status = btn.dataset.status;
      loadOutsourcing();
    });
  });

  document.getElementById('outSearchBtn')?.addEventListener('click', () => {
    filters.search = document.getElementById('outSearchInput').value.trim();
    loadOutsourcing();
  });
  document.getElementById('outSearchInput')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('outSearchBtn').click();
  });

  document.getElementById('outExcelDownload')?.addEventListener('click', () => {
    const rows = document.querySelectorAll('#outsourcingListBody tr:not(.empty-row)');
    if (!rows.length) { alert('다운로드할 데이터가 없습니다.'); return; }
    let csv = '\uFEFF업체명,업체대표,전화번호,홈페이지유형,금액,담당자,상태,등록일\n';
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 8) csv += Array.from(tds).slice(0, 8).map(td => `"${td.textContent.trim()}"`).join(',') + '\n';
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `외주관리_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });

  document.getElementById('outsourcingForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const company_name    = document.getElementById('outCompanyName').value.trim();
    const outsource_type  = document.getElementById('outType').value;
    const representative  = document.getElementById('outRepresentative').value.trim();
    const phone           = document.getElementById('outPhone').value.trim();
    const manager         = document.getElementById('outManager').value.trim();
    const status          = document.getElementById('outStatus').value;
    const memo            = document.getElementById('outMemo').value.trim();

    if (!company_name)   { alert('업체명을 입력해주세요.'); return; }
    if (!outsource_type) { alert('홈페이지 유형을 선택해주세요.'); return; }

    const body = { company_name, outsource_type, representative, phone, manager, status, memo };
    const saveBtn = e.target.querySelector('button[type="submit"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> 저장 중...'; }

    try {
      const isEdit = !!editingId;
      const url    = isEdit ? `/api/outsourcing/${editingId}` : '/api/outsourcing';
      const res    = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        editingId = null;
        formView.style.display = 'none';
        listView.style.display  = 'block';
        document.getElementById('outPageTitle').textContent = '외주관리';
        loadOutsourcing();
        alert(isEdit ? '수정되었습니다.' : '등록되었습니다.');
      } else { alert(result.message || '저장 실패'); }
    } catch { alert('저장 중 오류가 발생했습니다.'); }
    finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="bx bx-save"></i> 저장'; } }
  });
}
