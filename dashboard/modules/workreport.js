// 업무보고서 모듈 (출근기록부와 동일한 캘린더 구조)

let token = '';
let currentUser  = null; // { id, role, ... }
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let userList  = [];
let recordMap = {}; // key: "userId_YYYY-MM-DD" → record

// 첨부 파일 상태
let pendingFile        = null; // 새로 선택된 파일 (아직 업로드 전)
let deleteAttachment   = false; // 기존 첨부 삭제 예약

const USER_COLORS = [
  '#3b82f6','#22c55e','#f59e0b','#a855f7',
  '#14b8a6','#f43f5e','#84cc16','#06b6d4',
  '#8b5cf6','#fb923c',
];
const userColorMap = {};

function pad(n) { return String(n).padStart(2, '0'); }

function getUserColor(userId) {
  if (!userColorMap[userId]) {
    const idx = Object.keys(userColorMap).length % USER_COLORS.length;
    userColorMap[userId] = USER_COLORS[idx];
  }
  return userColorMap[userId];
}

// ── 첨부파일 UI 초기화 ─────────────────────────────────────
function resetAttachUI() {
  pendingFile      = null;
  deleteAttachment = false;
  const fileInput    = document.getElementById('wrFileInput');
  const pendingEl    = document.getElementById('wrAttachPending');
  const currentEl    = document.getElementById('wrAttachCurrent');
  if (fileInput)  fileInput.value = '';
  if (pendingEl)  pendingEl.style.display = 'none';
  if (currentEl)  currentEl.style.display = 'none';
}

function showPendingFile(file) {
  const pendingEl  = document.getElementById('wrAttachPending');
  const nameEl     = document.getElementById('wrAttachPendingName');
  const currentEl  = document.getElementById('wrAttachCurrent');
  if (pendingEl)  { pendingEl.style.display = 'flex'; }
  if (nameEl)     { nameEl.textContent = file.name; }
  if (currentEl)  { currentEl.style.display = 'none'; }
}

function showCurrentAttachment(recordId, attachName) {
  const currentEl   = document.getElementById('wrAttachCurrent');
  const linkEl      = document.getElementById('wrAttachCurrentLink');
  const nameEl      = document.getElementById('wrAttachCurrentName');
  const pendingEl   = document.getElementById('wrAttachPending');
  const deleteBtn   = document.getElementById('wrAttachDeleteBtn');
  if (currentEl)  { currentEl.style.display = 'flex'; }
  if (linkEl) {
    linkEl.href = '#';
    linkEl.dataset.rid = recordId;
    linkEl.onclick = async (e) => {
      e.preventDefault();
      await openAttachmentBlob(recordId);
    };
  }
  if (nameEl)   { nameEl.textContent = attachName || '첨부 이미지'; }
  if (pendingEl){ pendingEl.style.display = 'none'; }
  // 첨부 삭제 버튼: 관리자만 표시
  if (deleteBtn){ deleteBtn.style.display = currentUser?.role === 'admin' ? 'flex' : 'none'; }
}

async function openAttachmentBlob(recordId) {
  try {
    const res = await fetch(`/api/attachments/workreport/${recordId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { alert('이미지를 불러올 수 없습니다.'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    // 새 탭이 로드된 뒤 Blob URL 해제
    if (win) {
      win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    }
  } catch (e) {
    alert('이미지를 불러오는 중 오류가 발생했습니다.');
  }
}

// ── 데이터 로드 ───────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await fetch('/api/workreport/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      userList = data.users || [];
      renderLegend();
    }
  } catch (e) { console.error('직원 목록 오류', e); }
}

async function loadRecords() {
  try {
    const res = await fetch(`/api/workreport?year=${currentYear}&month=${currentMonth}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    recordMap = {};
    (data.records || []).forEach(r => {
      recordMap[`${r.user_id}_${r.date}`] = r;
    });
  } catch (e) { console.error('업무보고서 조회 오류', e); }
}

// ── 범례 렌더링 ───────────────────────────────────────────
function renderLegend() {
  const el = document.getElementById('wrLegend');
  if (!el || !userList.length) return;
  el.innerHTML = userList.map(u => {
    const color = getUserColor(u.id);
    return `<span class="att-legend-chip" style="--chip-color:${color}">
      <span class="att-legend-dot" style="background:${color}"></span>
      ${u.name || u.username}
    </span>`;
  }).join('');
}

// ── 달력 렌더링 ───────────────────────────────────────────
function renderCalendar() {
  document.getElementById('wrMonthLabel').textContent =
    `${currentYear}년 ${currentMonth}월`;

  const firstDow  = new Date(currentYear, currentMonth - 1, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth, 0).getDate();
  const today     = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const tbody = document.getElementById('wrCalBody');
  if (!tbody) return;

  tbody.innerHTML = weeks.map(week => `
    <tr class="att-week-row">
      ${week.map((d, dow) => {
        if (d === null) return `<td class="att-day-cell att-day-empty"></td>`;
        const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(d)}`;
        const isToday = dateStr === today;
        const isSun = dow === 0;
        const isSat = dow === 6;
        let cls = 'att-day-cell';
        if (isToday) cls += ' att-today';
        if (isSun)   cls += ' att-sun';
        if (isSat)   cls += ' att-sat';

        const chips = userList.map(u => {
          const rec = recordMap[`${u.id}_${dateStr}`];
          if (!rec) return '';
          const color = getUserColor(u.id);
          return `<div class="att-chip" style="background:${color}22;border-left:3px solid ${color};"
            data-uid="${u.id}" data-date="${dateStr}" data-rid="${rec.id}">
            <span class="att-chip-name" style="color:${color}">${u.name || u.username}</span>
            <span class="att-chip-time">${rec.title ? rec.title.slice(0, 10) : '보고'}</span>
          </div>`;
        }).join('');

        const dateNumCls = isSun ? 'att-date-num sun' : isSat ? 'att-date-num sat' : 'att-date-num';

        return `<td class="${cls}" data-date="${dateStr}">
          <div class="att-day-inner">
            <span class="${dateNumCls}">${isToday ? `<span class="att-today-badge">${d}</span>` : d}</span>
            <div class="att-chips">${chips}</div>
            <button class="att-add-btn" data-date="${dateStr}" title="업무 보고 추가">+</button>
          </div>
        </td>`;
      }).join('')}
    </tr>
  `).join('');

  tbody.querySelectorAll('.att-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      openEditModal(Number(chip.dataset.uid), chip.dataset.date, Number(chip.dataset.rid));
    });
  });

  tbody.querySelectorAll('.att-add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openAddModal(btn.dataset.date);
    });
  });
}

// ── 모달: 직원 선택 후 보고서 추가 ──────────────────────────
function openAddModal(date) {
  const sel = document.getElementById('wrModalUserSelect');
  sel.innerHTML = userList.map(u =>
    `<option value="${u.id}">${u.name || u.username}</option>`
  ).join('');

  document.getElementById('wrModalTitle').textContent = `업무 보고 추가 — ${date}`;
  document.getElementById('wrEditUserId').value    = '';
  document.getElementById('wrEditDate').value      = date;
  document.getElementById('wrEditRecordId').value  = '';
  document.getElementById('wrEditTitle').value     = date;
  document.getElementById('wrEditCallTime').value  = '';
  document.getElementById('wrEditCallCount').value = '';
  document.getElementById('wrEditMaterials').value = '';
  document.getElementById('wrDeleteBtn').style.display = 'none';
  document.getElementById('wrSaveBtn').style.display   = '';
  // 입력 필드 활성화 (추가는 누구나 가능)
  ['wrEditCallTime','wrEditCallCount','wrEditMaterials'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
  const labelAdd = document.querySelector('#wrAttachUploadArea .wr-attach-label');
  if (labelAdd) labelAdd.style.display = '';
  document.getElementById('wrModalUserRow').style.display = 'flex';
  resetAttachUI();
  document.getElementById('wrModalOverlay').style.display = 'flex';
}

function openEditModal(userId, date, recordId) {
  const user    = userList.find(u => u.id === userId);
  const rec     = recordMap[`${userId}_${date}`] || {};
  const isAdmin = currentUser?.role === 'admin';

  document.getElementById('wrModalTitle').textContent =
    `${user?.name || user?.username || ''} — ${date}${isAdmin ? '' : ' (읽기 전용)'}`;
  document.getElementById('wrEditUserId').value    = userId;
  document.getElementById('wrEditDate').value      = date;
  document.getElementById('wrEditRecordId').value  = recordId || '';
  document.getElementById('wrEditTitle').value     = rec.title || date;
  document.getElementById('wrEditCallTime').value  = rec.call_time  || '';
  document.getElementById('wrEditCallCount').value = rec.call_count || '';
  document.getElementById('wrEditMaterials').value = rec.materials  || '';

  // 읽기 전용: 비관리자는 입력 필드 비활성화
  ['wrEditCallTime','wrEditCallCount','wrEditMaterials'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isAdmin;
  });

  // 저장/삭제 버튼: 관리자만 표시
  document.getElementById('wrSaveBtn').style.display   = isAdmin ? '' : 'none';
  document.getElementById('wrDeleteBtn').style.display = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('wrModalUserRow').style.display = 'none';
  resetAttachUI();
  if (rec.attachment_key && recordId) {
    showCurrentAttachment(recordId, rec.attachment_name);
  }
  // 첨부 업로드 버튼: 비관리자는 숨김
  const label = document.querySelector('#wrAttachUploadArea .wr-attach-label');
  if (label) label.style.display = isAdmin ? '' : 'none';
  document.getElementById('wrModalOverlay').style.display = 'flex';
}

function closeModal() {
  resetAttachUI();
  document.getElementById('wrModalOverlay').style.display = 'none';
}

// ── 저장 ─────────────────────────────────────────────────
async function saveRecord() {
  let user_id = document.getElementById('wrEditUserId').value;
  const userRow = document.getElementById('wrModalUserRow');
  if (userRow.style.display !== 'none') {
    user_id = document.getElementById('wrModalUserSelect').value;
  }
  const date       = document.getElementById('wrEditDate').value;
  const title      = document.getElementById('wrEditTitle').value.trim();
  const call_time  = document.getElementById('wrEditCallTime').value.trim();
  const call_count = document.getElementById('wrEditCallCount').value;
  const materials  = document.getElementById('wrEditMaterials').value.trim();

  const saveBtn = document.getElementById('wrSaveBtn');
  saveBtn.disabled = true;
  try {
    // 1) 보고서 저장
    const res = await fetch('/api/workreport', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, date, title, call_time, call_count: call_count ? Number(call_count) : 0, materials })
    });
    const data = await res.json();
    if (!data.success) { alert(data.message || '저장 실패'); return; }

    const recordId = data.id;

    // 2) 첨부 파일 삭제 예약
    if (deleteAttachment && recordId) {
      await fetch(`/api/attachments/workreport/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    // 3) 새 파일 업로드
    if (pendingFile && recordId) {
      await uploadFile(recordId, pendingFile);
    }

    closeModal();
    await loadRecords();
    renderCalendar();
  } catch (e) { alert('오류가 발생했습니다.'); }
  finally { saveBtn.disabled = false; }
}

// ── 파일 → base64 업로드 ──────────────────────────────────
function uploadFile(recordId, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const res = await fetch(`/api/attachments/workreport/${recordId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, mime: file.type, data: base64 })
        });
        resolve(await res.json());
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── 삭제 ─────────────────────────────────────────────────
async function deleteRecord() {
  const rid = document.getElementById('wrEditRecordId').value;
  if (!rid || !confirm('이 업무보고서를 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/workreport/${rid}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      closeModal();
      await loadRecords();
      renderCalendar();
    } else { alert(data.message || '삭제 실패'); }
  } catch (e) { alert('오류가 발생했습니다.'); }
}

// ── 공개 API ─────────────────────────────────────────────
export async function loadWorkreport() {
  await loadRecords();
  renderCalendar();
}

export async function initWorkreport(authToken, userInfo) {
  token = authToken;
  currentUser = userInfo || null;

  document.getElementById('wrPrevBtn')?.addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    await loadWorkreport();
  });
  document.getElementById('wrNextBtn')?.addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    await loadWorkreport();
  });
  document.getElementById('wrTodayBtn')?.addEventListener('click', async () => {
    currentYear  = new Date().getFullYear();
    currentMonth = new Date().getMonth() + 1;
    await loadWorkreport();
  });

  document.getElementById('wrModalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('wrModalClose')?.addEventListener('click', closeModal);
  document.getElementById('wrModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('wrSaveBtn')?.addEventListener('click', saveRecord);
  document.getElementById('wrDeleteBtn')?.addEventListener('click', deleteRecord);

  // 파일 선택
  document.getElementById('wrFileInput')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFile      = file;
    deleteAttachment = false;
    showPendingFile(file);
  });

  // 대기 파일 취소
  document.getElementById('wrAttachCancelBtn')?.addEventListener('click', () => {
    pendingFile = null;
    document.getElementById('wrFileInput').value = '';
    document.getElementById('wrAttachPending').style.display = 'none';
    const rid = document.getElementById('wrEditRecordId').value;
    const rec = rid ? Object.values(recordMap).find(r => r.id == rid) : null;
    if (rec?.attachment_key) showCurrentAttachment(rid, rec.attachment_name);
  });

  // 기존 첨부 삭제
  document.getElementById('wrAttachDeleteBtn')?.addEventListener('click', () => {
    deleteAttachment = true;
    document.getElementById('wrAttachCurrent').style.display = 'none';
  });

  await loadUsers();
}
