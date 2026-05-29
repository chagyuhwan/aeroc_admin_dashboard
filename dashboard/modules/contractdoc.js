// 계약서 관리 모듈 (홈페이지 제작 계약서)

let token = '';
let contractList = [];
let editingId = null;

const AEROC_DEFAULTS_KEY = 'AEROC_contract_defaults';

const DEFAULT_CONTRACT_BODY =
`제1조 (목적)
본 계약은 주식회사 ○○○○(이하 "공급사")와 ○○○○(이하 "고객사") 간의 홈페이지 제작, 프로그램 개발 및 서버 세팅(이하 "본 건 작업")에 관한 조건과 절차를 규정하고, 상호 신뢰를 바탕으로 계약 사항을 성실히 이행하는 것을 목적으로 한다.

제2조 (작업 범위 및 포털 사이트 상위노출에 대한 면책)

"공급사"는 "고객사"가 요청한 기획, 프로그램 개발, 디자인 및 서버 세팅을 수행하며, 작업 완료 후 네이버 및 구글 등 주요 포털 사이트에 사이트 등록을 진행한다.

[검색포털 상위노출 관련 면책 조항] "공급사"는 최신의 SEO(검색엔진 최적화) 가이드에 맞추어 홈페이지를 제작하고 상위노출이 가능하도록 기술적 조치를 취할 수 있으나, 주요 포털 사이트(네이버, 구글 등)의 검색 노출 순위는 각 포털 사의 고유 알고리즘 및 외부 시장 환경에 의해 결정된다. 따라서 "공급사"는 상위노출 가능성을 제고할 뿐, 특정 키워드의 상위노출을 무조건적으로 보장하거나 확약하지 않으며, 상위노출 여부 및 순위 변동을 이유로 한 환불이나 손해배상 청구는 일체 불가하다.

제3조 (계약 해지 및 단계별 위약금)
본 건 작업은 계약 체결 즉시 기획 프로세스가 가동되고 프로그램 및 서버 세팅 자원이 즉각 투입되는 도급 작업의 특성을 가진다. 이에 따라 계약 등록 이후 "고객사"의 단순 변심 또는 일방적인 취소 요청 시, 작업 진행 단계에 따라 다음과 같이 위약금이 발생하며 "고객사"는 이를 전액 부담한다.

[1단계 : 계약 등록 후 단순 변심 및 취소 요청]
계약 체결 및 등록 완료 후 "고객사"의 단순 변심이나 사정으로 취소를 요청할 경우, 기획 및 프로그램 서버 세팅이 즉시 진행되므로 최소 총 제작비의 30% 이상의 위약금이 발생한다.

[2단계 : 디자인 시안 도출 후 취소 요청]
기획 및 프로그램 서버 세팅이 완료된 후, 디자인 시안(메인 및 서브 화면 등 포함)이 1회 이상 제공된 상태에서 "고객사"가 취소를 요청할 경우, 총 제작비의 80% 이상의 위약금이 발생한다.

[3단계 : 사이트 등록 완료 후 취소 불가의 원칙]
"공급사"가 최종 결과물에 대하여 네이버 또는 구글 등 포털 사이트에 사이트 등록 접수 및 완료 처리를 진행한 이후에는 작업을 기성 완료한 것으로 간주하여 계약 취소 및 환불이 절대 불가능하다.

제4조 (위약금의 정산 및 청구)

제3조에 따른 위약금 발생 시, "고객사"가 기지급한 선금(계약금)이 있을 경우 위약금 조로 "공급사"에 당연 귀속되며, 선금이 위약금 총액에 미달할 경우 "고객사"는 "공급사"의 청구일로부터 7일 이내에 잔여 위약금을 현금으로 추가 지급하여야 한다.

"고객사"의 귀책사유나 자료 제공 지연 등으로 인해 작업이 30일 이상 중단될 경우에도 "공급사"는 계약을 해지하고 본 조 및 제3조에 따른 위약금을 청구할 수 있다.

제5조 (기타 사항)
본 계약서에 명시되지 않은 사항은 상법 및 일반 상관례에 따르며, 본 계약과 관련하여 분쟁이 발생할 경우 "공급사"의 본점 소재지 관할 법원을 합의 관할 법원으로 한다.`;

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── 자동 하이픈 포맷터 ────────────────────────────────
function formatPhone(val) {
  const d = val.replace(/\D/g, '').slice(0, 11);
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0,2)}-${d.slice(2,5)}-${d.slice(5)}`;
    return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}

function formatBizNo(val) {
  const d = val.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}`;
}

function formatResidentNo(val) {
  const d = val.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 6) return d;
  return `${d.slice(0,6)}-${d.slice(6)}`;
}

function applyAutoFormat(inputEl, formatter) {
  inputEl.addEventListener('input', () => {
    const pos = inputEl.selectionStart;
    const raw = inputEl.value;
    const formatted = formatter(raw);
    if (formatted !== raw) {
      // 커서 위치 보정 (하이픈 추가로 인한 이동)
      const diff = formatted.length - raw.length;
      inputEl.value = formatted;
      const newPos = Math.max(0, pos + diff);
      inputEl.setSelectionRange(newPos, newPos);
    }
    updatePreview();
  });
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
  set('cdSigClientName',    clientName);
  set('cdSigClientRep',     clientRep);
  set('cdSigClientAddress', clientAddr);
  set('cdSigAerocRep',      aerocRep);
  set('cdSigAerocAddress',  get('cdAerocAddress'));

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
    document.getElementById('cdContractTitle').value = '홈페이지 제작 및 시스템 구축 표준 계약서';
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

    document.getElementById('cdContractTitle').value  = doc.contract_title   || '홈페이지 제작 및 시스템 구축 표준 계약서';
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
  // cdClientPhone, cdClientBizNo, cdClientIdNo 는 applyAutoFormat에서 updatePreview 처리
  const liveFields = [
    'cdContractTitle','cdClientName','cdClientRep',
    'cdClientAddress',
    'cdAerocRep','cdAerocBizNo','cdAerocAddress',
    'cdAmount','cdStartDate','cdEndDate',
    'cdContractBody','cdSpecialTerms','cdContractDate'
  ];
  liveFields.forEach(id => document.getElementById(id)?.addEventListener('input', updatePreview));

  // 자동 하이픈 포맷팅
  const phoneEl  = document.getElementById('cdClientPhone');
  const bizNoEl  = document.getElementById('cdClientBizNo');
  const idNoEl   = document.getElementById('cdClientIdNo');
  if (phoneEl)  applyAutoFormat(phoneEl,  formatPhone);
  if (bizNoEl)  applyAutoFormat(bizNoEl,  formatBizNo);
  if (idNoEl)   applyAutoFormat(idNoEl,   formatResidentNo);

  // 라디오 버튼 변경 시 미리보기
  document.querySelectorAll('input[name="homepageType"]').forEach(r => {
    r.addEventListener('change', updatePreview);
  });
}
