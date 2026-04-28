// 견적서 관리(업체) 모듈

let token = '';
let customerEditingId = null;
let customerList = [];

export async function loadCustomerData() {
  try {
    const q = document.getElementById('customerSearch')?.value.trim() || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const res = await fetch('/api/customers?' + params.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    customerList = data.customers || [];
    renderCustomerTable(customerList);
  } catch (err) { console.error('고객 목록 로드 오류:', err); }
}

function renderCustomerTable(list) {
  const tbody = document.getElementById('customerTableBody');
  const countEl = document.getElementById('customerCount');
  if (!tbody) return;
  if (countEl) countEl.textContent = list.length.toLocaleString();

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="customer-empty">업체 정보가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>
        <button class="cust-quote-btn" data-name="${(c.name || '').replace(/"/g, '&quot;')}" title="견적서 발행">
          <i class='bx bx-receipt'></i> 견적서
        </button>
      </td>
      <td class="fw-500">${c.name || '-'}</td>
      <td>${c.representative || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td class="text-muted">${c.address || '-'}</td>
      <td>${c.manager || '-'}</td>
      <td><button class="customer-detail-btn cust-open-btn" data-id="${c.id}">수정</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.cust-open-btn').forEach(btn => {
    btn.addEventListener('click', () => openCustomerModal(Number(btn.dataset.id)));
  });

  tbody.querySelectorAll('.cust-quote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.setItem('_quoteCompany', btn.dataset.name || '');
      window.location.hash = 'quote';
    });
  });
}

function openCustomerModal(id = null) {
  customerEditingId = id;
  const overlay = document.getElementById('customerModalOverlay');
  const title = document.getElementById('customerModalTitle');
  const delBtn = document.getElementById('customerDeleteBtn');

  ['cfName', 'cfRepresentative', 'cfPhone', 'cfAddress', 'cfManager'].forEach(f => {
    const el = document.getElementById(f); if (el) el.value = '';
  });

  if (id) {
    const c = customerList.find(x => x.id === id);
    if (c) {
      document.getElementById('cfName').value = c.name || '';
      document.getElementById('cfRepresentative').value = c.representative || '';
      document.getElementById('cfPhone').value = c.phone || '';
      document.getElementById('cfAddress').value = c.address || '';
      document.getElementById('cfManager').value = c.manager || '';
    }
    title.textContent = '업체 수정';
    delBtn.style.display = 'inline-flex';
  } else {
    title.textContent = '업체 추가';
    delBtn.style.display = 'none';
  }
  overlay.style.display = 'flex';
}

function closeCustomerModal() {
  document.getElementById('customerModalOverlay').style.display = 'none';
  customerEditingId = null;
}

export function initCustomers(authToken) {
  token = authToken;

  document.getElementById('openCustomerModal')?.addEventListener('click', () => openCustomerModal());
  document.getElementById('closeCustomerModal')?.addEventListener('click', closeCustomerModal);
  document.getElementById('cancelCustomerModal')?.addEventListener('click', closeCustomerModal);
  document.getElementById('customerModalOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeCustomerModal(); });
  document.getElementById('customerSearchBtn')?.addEventListener('click', loadCustomerData);
  document.getElementById('customerSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') loadCustomerData(); });

  document.getElementById('customerDeleteBtn')?.addEventListener('click', async () => {
    if (!customerEditingId || !confirm('이 업체를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/customers/${customerEditingId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { closeCustomerModal(); loadCustomerData(); }
      else alert(data.message || '삭제 실패');
    } catch (err) { alert('오류가 발생했습니다.'); }
  });

  document.getElementById('saveCustomerBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('cfName').value.trim();
    if (!name) { alert('업체명을 입력해주세요.'); return; }
    const body = {
      name,
      representative: document.getElementById('cfRepresentative').value.trim(),
      phone: document.getElementById('cfPhone').value.trim(),
      address: document.getElementById('cfAddress').value.trim(),
      manager: document.getElementById('cfManager').value.trim(),
    };
    const saveBtn = document.getElementById('saveCustomerBtn');
    saveBtn.disabled = true;
    try {
      const url = customerEditingId ? `/api/customers/${customerEditingId}` : '/api/customers';
      const res = await fetch(url, { method: customerEditingId ? 'PATCH' : 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { closeCustomerModal(); loadCustomerData(); }
      else alert(data.message || '저장 실패');
    } catch (err) { alert('오류가 발생했습니다.'); }
    finally { saveBtn.disabled = false; }
  });
}
