// 계약서 관리 모듈

let token = '';
let contractList = [];
let editingId = null;

const AEROC_DEFAULTS_KEY = 'AEROC_contract_defaults';

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtMoney(n) {
  const v = parseInt(n) || 0;
  return v.toLocaleString('ko-KR');
}

function fmtDate(str) {
  if (!str) return '-';
  const [y, m, d] = str.split('-');
  return `${y}년 ${String(+m).padStart(2, '0')}월 ${String(+d).padStart(2, '0')}일`;
}

// ── 실시간 미리보기 업데이트 ──────────────────────────
function updatePreview() {
  const get = id => (document.getElementById(id)?.value || '').trim();

  const contractTitle = get('cdContractTitle') || '계약서';
  const clientName   = get('cdClientName');
  const clientRep    = get('cdClientRep');
  const clientBizNo  = get('cdClientBizNo');
  const clientAddr   = get('cdClientAddress');
  const aerocRep     = get('cdAerocRep');
  const aerocBizNo   = get('cdAerocBizNo');
  const aerocAddr    = get('cdAerocAddress');
  const svcTitle     = get('cdServiceTitle');
  const svcDetail    = get('cdServiceDetail');
  const amount       = get('cdAmount');
  const startDate    = get('cdStartDate');
  const endDate      = get('cdEndDate');
  const specialTerms = get('cdSpecialTerms');
  const contractDate = get('cdContractDate');

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };

  // 계약서 제목 — 띄어쓰기 삽입하여 간격 있는 스타일
  const titleEl2 = document.getElementById('cdPvTitle');
  if (titleEl2) titleEl2.textContent = contractTitle.split('').join(' ');

  set('cdPvClientName',   clientName  || '-');
  set('cdPvClientRep',    clientRep   || '-');
  set('cdPvClientBizNo',  clientBizNo || '-');
  set('cdPvClientAddress',clientAddr  || '-');
  set('cdPvAerocRep',     aerocRep    || '-');
  set('cdPvAerocBizNo',   aerocBizNo  || '-');
  set('cdPvAerocAddress', aerocAddr   || '-');
  set('cdPvServiceTitle', svcTitle    || '[서비스명]');
  set('cdSigClientName',  clientName  || '-');
  set('cdSigClientRep',   clientRep   || '-');
  set('cdSigAerocRep',    aerocRep    || '-');

  // 서비스 상세 (줄바꿈 유지)
  const detailEl = document.getElementById('cdPvServiceDetail');
  if (detailEl) detailEl.innerHTML = svcDetail ? esc(svcDetail).replace(/\n/g, '<br>') : '-';

  // 금액
  const amountEl = document.getElementById('cdPvAmount');
  if (amountEl) amountEl.textContent = amount ? fmtMoney(amount) : '-';

  // 계약 기간
  const periodEl = document.getElementById('cdPvPeriod');
  if (periodEl) {
    if (startDate && endDate) {
      periodEl.textContent = `${fmtDate(startDate)} ~ ${fmtDate(endDate)}`;
    } else if (startDate) {
      periodEl.textContent = `${fmtDate(startDate)}부터`;
    } else {
      periodEl.textContent = '-';
    }
  }

  // 특약 사항 조항 표시/숨김
  const specialArticle = document.getElementById('cdPvSpecialArticle');
  const specialEl = document.getElementById('cdPvSpecialTerms');
  if (specialEl) {
    if (specialTerms) {
      specialEl.innerHTML = esc(specialTerms).replace(/\n/g, '<br>');
      if (specialArticle) specialArticle.style.display = '';
    } else {
      specialEl.textContent = '-';
    }
  }

  // 계약일
  const cdDateEl = document.getElementById('cdPvContractDate');
  if (cdDateEl) cdDateEl.textContent = contractDate ? fmtDate(contractDate) : '-';
}

// ── 뷰 전환 ──────────────────────────────────────────
function showListView() {
  document.getElementById('contractListView').style.display = 'block';
  document.getElementById('contractEditorView').style.display = 'none';
  editingId = null;
}

function showEditorView(doc = null) {
  document.getElementById('contractListView').style.display = 'none';
  document.getElementById('contractEditorView').style.display = 'block';

  const titleEl = document.getElementById('cdEditorTitle');
  const delBtn  = document.getElementById('cdDeleteBtn');

  // 에어록 기본값 로드 (localStorage)
  const defaults = JSON.parse(localStorage.getItem(AEROC_DEFAULTS_KEY) || '{}');

  // 폼 초기화
  const fields = [
    'cdContractTitle',
    'cdClientName','cdClientRep','cdClientBizNo','cdClientAddress',
    'cdAerocRep','cdAerocBizNo','cdAerocAddress',
    'cdServiceTitle','cdServiceDetail','cdAmount',
    'cdStartDate','cdEndDate','cdSpecialTerms','cdContractDate'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // 에어록 기본값 적용
  if (defaults.aerocRep)     document.getElementById('cdAerocRep').value     = defaults.aerocRep;
  if (defaults.aerocBizNo)   document.getElementById('cdAerocBizNo').value   = defaults.aerocBizNo;
  if (defaults.aerocAddress) document.getElementById('cdAerocAddress').value = defaults.aerocAddress;

  // 새 계약서일 때 제목 기본값 설정
  const titleInput = document.getElementById('cdContractTitle');
  if (titleInput && !doc) titleInput.value = '계약서';

  if (doc) {
    editingId = doc.id;
    titleEl.textContent = `계약서 수정 — ${doc.contract_no}`;
    delBtn.style.display = 'inline-flex';

    if (titleInput) titleInput.value = doc.contract_title || '계약서';
    document.getElementById('cdClientName').value    = doc.client_name    || '';
    document.getElementById('cdClientRep').value     = doc.client_rep     || '';
    document.getElementById('cdClientBizNo').value   = doc.client_biz_no  || '';
    document.getElementById('cdClientAddress').value = doc.client_address  || '';
    document.getElementById('cdAerocRep').value      = doc.aeroc_rep      || defaults.aerocRep     || '';
    document.getElementById('cdAerocBizNo').value    = doc.aeroc_biz_no   || defaults.aerocBizNo   || '';
    document.getElementById('cdAerocAddress').value  = doc.aeroc_address  || defaults.aerocAddress || '';
    document.getElementById('cdServiceTitle').value  = doc.service_title  || '';
    document.getElementById('cdServiceDetail').value = doc.service_detail || '';
    document.getElementById('cdAmount').value        = doc.amount || '';
    document.getElementById('cdStartDate').value     = doc.start_date     || '';
    document.getElementById('cdEndDate').value       = doc.end_date       || '';
    document.getElementById('cdSpecialTerms').value  = doc.special_terms  || '';
    document.getElementById('cdContractDate').value  = doc.contract_date  || '';
  } else {
    editingId = null;
    titleEl.textContent = '새 계약서';
    delBtn.style.display = 'none';
    document.getElementById('cdContractDate').value = new Date().toISOString().slice(0, 10);
  }

  updatePreview();
  setTimeout(() => document.getElementById('cdClientName')?.focus(), 50);
}

// ── 데이터 로드 ──────────────────────────────────────
export async function loadContractDocs() {
  try {
    const q = document.getElementById('cdSearch')?.value.trim() || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);

    const res = await fetch('/api/contract-docs?' + params.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    contractList = data.docs || [];
    const countEl = document.getElementById('cdCount');
    if (countEl) countEl.textContent = contractList.length.toLocaleString();

    renderContractTable(contractList);
  } catch (err) {
    console.error('계약서 목록 로드 오류:', err);
  }
}

function renderContractTable(list) {
  const tbody = document.getElementById('cdTableBody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="customer-empty">등록된 계약서가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(d => `
    <tr>
      <td class="text-muted" style="font-size:12px;">${esc(d.contract_no)}</td>
      <td class="fw-500">${esc(d.client_name)}</td>
      <td>${esc(d.service_title)}</td>
      <td style="text-align:right;">${d.amount ? '₩' + fmtMoney(d.amount) : '-'}</td>
      <td style="font-size:12px;">${d.start_date && d.end_date ? `${d.start_date} ~ ${d.end_date}` : (d.start_date || '-')}</td>
      <td style="font-size:12px;">${d.contract_date || '-'}</td>
      <td>
        <button class="customer-detail-btn cd-edit-btn" data-id="${d.id}">수정/보기</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.cd-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const doc = contractList.find(d => d.id === Number(btn.dataset.id));
      if (doc) showEditorView(doc);
    });
  });
}

// ── 저장 ─────────────────────────────────────────────
async function saveContract() {
  const get = id => (document.getElementById(id)?.value || '').trim();

  const contract_title = get('cdContractTitle') || '계약서';
  const client_name    = get('cdClientName');
  const service_title  = get('cdServiceTitle');
  const contract_date  = get('cdContractDate');

  if (!client_name)   { alert('업체명을 입력해주세요.'); return; }
  if (!service_title) { alert('서비스명을 입력해주세요.'); return; }
  if (!contract_date) { alert('계약일을 입력해주세요.'); return; }

  // 에어록 기본값 저장 (localStorage)
  const aerocRep     = get('cdAerocRep');
  const aerocBizNo   = get('cdAerocBizNo');
  const aerocAddress = get('cdAerocAddress');
  if (aerocRep || aerocBizNo || aerocAddress) {
    localStorage.setItem(AEROC_DEFAULTS_KEY, JSON.stringify({ aerocRep, aerocBizNo, aerocAddress }));
  }

  const body = {
    contract_title,
    client_name,
    client_rep:     get('cdClientRep'),
    client_biz_no:  get('cdClientBizNo'),
    client_address: get('cdClientAddress'),
    service_title,
    service_detail: get('cdServiceDetail'),
    amount:         parseInt(get('cdAmount')) || 0,
    start_date:     get('cdStartDate') || null,
    end_date:       get('cdEndDate') || null,
    special_terms:  get('cdSpecialTerms'),
    contract_date,
    aeroc_rep:      aerocRep,
    aeroc_biz_no:   aerocBizNo,
    aeroc_address:  aerocAddress,
  };

  const saveBtn = document.getElementById('cdSaveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '저장 중...'; }

  try {
    const url    = editingId ? `/api/contract-docs/${editingId}` : '/api/contract-docs';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      if (!editingId && data.id) editingId = data.id;
      const titleEl = document.getElementById('cdEditorTitle');
      if (data.contract_no && titleEl) titleEl.textContent = `계약서 수정 — ${data.contract_no}`;
      document.getElementById('cdDeleteBtn').style.display = 'inline-flex';
      alert(editingId && method === 'PATCH' ? '저장되었습니다.' : '계약서가 등록되었습니다.');
      await loadContractDocs();
    } else alert(data.message || '저장 실패');
  } catch { alert('저장 중 오류가 발생했습니다.'); }
  finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = "<i class='bx bx-save'></i> 저장"; } }
}

// ── 이미지 다운로드 ───────────────────────────────────
async function downloadImage() {
  if (typeof html2canvas === 'undefined') {
    alert('이미지 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  const docEl = document.getElementById('contractDocument');
  if (!docEl) return;

  const btn = document.getElementById('cdDownloadBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> 생성 중..."; }

  try {
    const clientName  = (document.getElementById('cdClientName')?.value || '계약서').trim();
    const contractDate = (document.getElementById('cdContractDate')?.value || new Date().toISOString().slice(0, 10));

    const canvas = await html2canvas(docEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const link = document.createElement('a');
    link.download = `계약서_${clientName}_${contractDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('이미지 생성 오류:', err);
    alert('이미지 생성 중 오류가 발생했습니다.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = "<i class='bx bx-image-download'></i> 이미지 다운로드"; }
  }
}

// ── 초기화 ────────────────────────────────────────────
export function initContractDoc(authToken) {
  token = authToken;

  document.getElementById('cdNewBtn')?.addEventListener('click', () => showEditorView());
  document.getElementById('cdBackBtn')?.addEventListener('click', () => {
    showListView();
    loadContractDocs();
  });
  document.getElementById('cdSaveBtn')?.addEventListener('click', saveContract);
  document.getElementById('cdDownloadBtn')?.addEventListener('click', downloadImage);

  document.getElementById('cdDeleteBtn')?.addEventListener('click', async () => {
    if (!editingId || !confirm('이 계약서를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/contract-docs/${editingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showListView();
        loadContractDocs();
      } else alert(data.message || '삭제 실패');
    } catch { alert('오류가 발생했습니다.'); }
  });

  document.getElementById('cdSearchBtn')?.addEventListener('click', loadContractDocs);
  document.getElementById('cdSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadContractDocs();
  });

  // 모든 입력 필드에서 실시간 미리보기
  const liveFields = [
    'cdContractTitle',
    'cdClientName','cdClientRep','cdClientBizNo','cdClientAddress',
    'cdAerocRep','cdAerocBizNo','cdAerocAddress',
    'cdServiceTitle','cdServiceDetail','cdAmount',
    'cdStartDate','cdEndDate','cdSpecialTerms','cdContractDate'
  ];
  liveFields.forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });
}
