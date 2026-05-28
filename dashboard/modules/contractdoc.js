// 계약서 관리 모듈 (홈페이지 제작 계약서)

let token = '';
let contractList = [];
let editingId = null;

const AEROC_DEFAULTS_KEY = 'AEROC_contract_defaults';

const DEFAULT_CONTRACT_BODY =
`제1조 (계약의 목적)
본 계약은 수급인(이하 "을")이 위탁자(이하 "갑")의 홈페이지를 제작함에 있어 쌍방의 권리와 의무를 명확히 하고 이를 성실히 이행함을 목적으로 한다.

제2조 (제작 범위)
① 을은 갑에게 본 계약에 명시된 홈페이지를 제작·납품한다.
② 제작 범위 및 세부 사항은 별도 제안서 또는 기획안에 따른다.

제3조 (계약 금액 및 결제)
① 본 계약의 총 금액은 계약서에 명시된 금액으로 한다.
② 계약금은 계약 체결 시 총 금액의 50%를 납부하며, 잔금은 홈페이지 오픈 전 납부를 원칙으로 한다.

제4조 (저작권)
① 제작 완료된 홈페이지의 저작권은 잔금 완납 시점부터 갑에게 귀속된다.
② 을은 포트폴리오 목적으로 해당 홈페이지를 활용할 수 있다.

제5조 (하자보수)
① 홈페이지 오픈 후 30일 이내에 발생한 하자에 대해 을은 무상으로 보수한다.
② 단, 갑의 임의 수정으로 인한 오류 및 하자는 적용되지 않는다.

제6조 (계약 해제)
쌍방 합의 없이 일방적으로 계약을 해제할 경우, 귀책사유가 있는 자는 상대방에게 계약금액의 30%에 해당하는 위약금을 지급한다.

제7조 (기타)
본 계약에 명시되지 않은 사항은 민법 및 상관례에 따른다.`;

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtMoney(n) {
  const v = parseInt(n) || 0;
  return v > 0 ? '₩' + v.toLocaleString('ko-KR') : '';
}

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y}년 ${m}월 ${d}일`;
}

// ── 실시간 미리보기 ───────────────────────────────────
function updatePreview() {
  const get = id => (document.getElementById(id)?.value || '').trim();

  const title        = get('cdContractTitle') || '홈페이지 제작 계약서';
  const clientName   = get('cdClientName');
  const clientRep    = get('cdClientRep');
  const clientPhone  = get('cdClientPhone');
  const clientBizNo  = get('cdClientBizNo');
  const clientIdNo   = get('cdClientIdNo');
  const clientAddr   = get('cdClientAddress');
  const amount       = get('cdAmount');
  const startDate    = get('cdStartDate');
  const endDate      = get('cdEndDate');
  const contractBody = get('cdContractBody');
  const specialTerms = get('cdSpecialTerms');
  const contractDate = get('cdContractDate');
  const aerocRep     = get('cdAerocRep');

  // 홈페이지 유형
  const homepageType = document.querySelector('input[name="homepageType"]:checked')?.value || '고급형';

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // 제목 (글자 사이 띄어쓰기)
  const titleEl = document.getElementById('cdPvTitle');
  if (titleEl) titleEl.textContent = title.split('').join(' ');

  // 고객 기본사항
  set('cdPvClientName',   clientName);
  set('cdPvClientRep',    clientRep);
  set('cdPvClientPhone',  clientPhone);
  set('cdPvClientBizNo',  clientBizNo);
  set('cdPvClientIdNo',   clientIdNo);
  set('cdPvClientAddress',clientAddr);
  set('cdPvAmount',       fmtMoney(amount));

  // 서명 블록
  set('cdSigClientName', clientName);
  set('cdSigClientRep',  clientRep);
  set('cdSigAerocRep',   aerocRep);

  // 홈페이지 유형 체크박스
  const chkAdv   = document.getElementById('cdPvChkAdv');
  const chkBasic = document.getElementById('cdPvChkBasic');
  if (chkAdv)   chkAdv.textContent   = homepageType === '고급형' ? '☑' : '☐';
  if (chkBasic) chkBasic.textContent = homepageType === '기본형' ? '☑' : '☐';

  // 유형 강조
  const pvAdv   = document.getElementById('cdPvTypeAdv');
  const pvBasic = document.getElementById('cdPvTypeBasic');
  if (pvAdv)   pvAdv.classList.toggle('selected', homepageType === '고급형');
  if (pvBasic) pvBasic.classList.toggle('selected', homepageType === '기본형');

  // 계약 기간
  const periodEl = document.getElementById('cdPvPeriod');
  if (periodEl) {
    if (startDate && endDate) {
      periodEl.textContent = `${fmtDate(startDate)} ~ ${fmtDate(endDate)}`;
    } else if (startDate) {
      periodEl.textContent = `${fmtDate(startDate)} ~`;
    } else {
      periodEl.textContent = '-';
    }
  }

  // 계약 내용 본문 (줄바꿈 유지)
  const bodyEl = document.getElementById('cdPvBody');
  if (bodyEl) bodyEl.innerHTML = contractBody
    ? esc(contractBody).replace(/\n/g, '<br>')
    : '';

  // 특약 사항
  const specialWrap = document.getElementById('cdPvSpecialWrap');
  const specialEl   = document.getElementById('cdPvSpecialTerms');
  if (specialEl) {
    specialEl.innerHTML = specialTerms ? esc(specialTerms).replace(/\n/g, '<br>') : '';
    if (specialWrap) specialWrap.style.display = specialTerms ? '' : 'none';
  }

  // 계약일
  set('cdPvContractDate', contractDate ? fmtDate(contractDate) : '____년 ____월 ____일');
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

  const defaults = JSON.parse(localStorage.getItem(AEROC_DEFAULTS_KEY) || '{}');

  // 폼 초기화
  document.getElementById('cdContractTitle').value = '홈페이지 제작 계약서';
  ['cdClientName','cdClientRep','cdClientPhone','cdClientBizNo','cdClientIdNo','cdClientAddress',
   'cdAmount','cdStartDate','cdEndDate','cdSpecialTerms','cdContractDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('cdContractBody').value = DEFAULT_CONTRACT_BODY;
  document.querySelector('input[name="homepageType"][value="고급형"]').checked = true;

  // 에어록 기본값
  document.getElementById('cdAerocRep').value     = defaults.aerocRep     || '';
  document.getElementById('cdAerocBizNo').value   = defaults.aerocBizNo   || '';
  document.getElementById('cdAerocAddress').value = defaults.aerocAddress || '';

  if (doc) {
    editingId = doc.id;
    titleEl.textContent = `계약서 수정 — ${doc.contract_no}`;
    delBtn.style.display = 'inline-flex';

    document.getElementById('cdContractTitle').value  = doc.contract_title   || '홈페이지 제작 계약서';
    document.getElementById('cdClientName').value     = doc.client_name      || '';
    document.getElementById('cdClientRep').value      = doc.client_rep       || '';
    document.getElementById('cdClientPhone').value    = doc.client_phone     || '';
    document.getElementById('cdClientBizNo').value    = doc.client_biz_no    || '';
    document.getElementById('cdClientIdNo').value     = doc.client_id_no     || '';
    document.getElementById('cdClientAddress').value  = doc.client_address   || '';
    document.getElementById('cdAmount').value         = doc.amount           || '';
    document.getElementById('cdStartDate').value      = doc.start_date       || '';
    document.getElementById('cdEndDate').value        = doc.end_date         || '';
    document.getElementById('cdContractBody').value   = doc.contract_body    || DEFAULT_CONTRACT_BODY;
    document.getElementById('cdSpecialTerms').value   = doc.special_terms    || '';
    document.getElementById('cdContractDate').value   = doc.contract_date    || '';
    document.getElementById('cdAerocRep').value       = doc.aeroc_rep        || defaults.aerocRep     || '';
    document.getElementById('cdAerocBizNo').value     = doc.aeroc_biz_no     || defaults.aerocBizNo   || '';
    document.getElementById('cdAerocAddress').value   = doc.aeroc_address    || defaults.aerocAddress || '';

    const typeVal = doc.homepage_type || '고급형';
    const radioEl = document.querySelector(`input[name="homepageType"][value="${typeVal}"]`);
    if (radioEl) radioEl.checked = true;
  } else {
    editingId = null;
    titleEl.textContent = '새 계약서';
    delBtn.style.display = 'none';
    document.getElementById('cdContractDate').value = new Date().toISOString().slice(0, 10);
  }

  updatePreview();
  setTimeout(() => document.getElementById('cdClientName')?.focus(), 50);
}

// ── 목록 로드 ─────────────────────────────────────────
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
      <td><span class="cd-type-badge ${d.homepage_type === '고급형' ? 'adv' : 'basic'}">${esc(d.homepage_type || '고급형')}</span></td>
      <td style="text-align:right;">${d.amount ? '₩' + (+d.amount).toLocaleString('ko-KR') : '-'}</td>
      <td style="font-size:12px;">${d.start_date && d.end_date ? `${d.start_date} ~ ${d.end_date}` : (d.start_date || '-')}</td>
      <td style="font-size:12px;">${d.contract_date || '-'}</td>
      <td><button class="customer-detail-btn cd-edit-btn" data-id="${d.id}">수정/보기</button></td>
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

  const contract_title  = get('cdContractTitle') || '홈페이지 제작 계약서';
  const client_name     = get('cdClientName');
  const contract_date   = get('cdContractDate');

  if (!client_name)   { alert('상호를 입력해주세요.'); return; }
  if (!contract_date) { alert('계약일을 입력해주세요.'); return; }

  const aeroc_rep     = get('cdAerocRep');
  const aeroc_biz_no  = get('cdAerocBizNo');
  const aeroc_address = get('cdAerocAddress');
  if (aeroc_rep || aeroc_biz_no || aeroc_address) {
    localStorage.setItem(AEROC_DEFAULTS_KEY, JSON.stringify({ aerocRep: aeroc_rep, aerocBizNo: aeroc_biz_no, aerocAddress: aeroc_address }));
  }

  const body = {
    contract_title,
    client_name,
    client_rep:     get('cdClientRep'),
    client_phone:   get('cdClientPhone'),
    client_biz_no:  get('cdClientBizNo'),
    client_id_no:   get('cdClientIdNo'),
    client_address: get('cdClientAddress'),
    homepage_type:  document.querySelector('input[name="homepageType"]:checked')?.value || '고급형',
    amount:         parseInt(get('cdAmount')) || 0,
    start_date:     get('cdStartDate') || null,
    end_date:       get('cdEndDate') || null,
    contract_body:  get('cdContractBody'),
    special_terms:  get('cdSpecialTerms'),
    contract_date,
    aeroc_rep, aeroc_biz_no, aeroc_address,
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
      if (!editingId && data.id) {
        editingId = data.id;
        const titleEl = document.getElementById('cdEditorTitle');
        if (data.contract_no && titleEl) titleEl.textContent = `계약서 수정 — ${data.contract_no}`;
        document.getElementById('cdDeleteBtn').style.display = 'inline-flex';
      }
      await loadContractDocs();
      alert(method === 'PATCH' ? '저장되었습니다.' : '계약서가 등록되었습니다.');
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
    const clientName   = (document.getElementById('cdClientName')?.value || '계약서').trim();
    const contractDate = document.getElementById('cdContractDate')?.value || new Date().toISOString().slice(0, 10);

    const canvas = await html2canvas(docEl, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
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
  document.getElementById('cdBackBtn')?.addEventListener('click', () => { showListView(); loadContractDocs(); });
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
      if (data.success) { showListView(); loadContractDocs(); }
      else alert(data.message || '삭제 실패');
    } catch { alert('오류가 발생했습니다.'); }
  });

  document.getElementById('cdSearchBtn')?.addEventListener('click', loadContractDocs);
  document.getElementById('cdSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadContractDocs();
  });

  // 실시간 미리보기
  const liveFields = [
    'cdContractTitle','cdClientName','cdClientRep','cdClientPhone',
    'cdClientBizNo','cdClientIdNo','cdClientAddress',
    'cdAerocRep','cdAerocBizNo','cdAerocAddress',
    'cdAmount','cdStartDate','cdEndDate',
    'cdContractBody','cdSpecialTerms','cdContractDate'
  ];
  liveFields.forEach(id => document.getElementById(id)?.addEventListener('input', updatePreview));

  // 라디오 버튼 변경 시 미리보기
  document.querySelectorAll('input[name="homepageType"]').forEach(r => {
    r.addEventListener('change', updatePreview);
  });
}
