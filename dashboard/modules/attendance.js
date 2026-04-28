// 출근기록부 모듈 (관리자 전용)

let token = '';
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let userList  = [];
let recordMap = {}; // key: "userId_YYYY-MM-DD" → record

// 직원별 고정 색상
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

// ── 데이터 로드 ───────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await fetch('/api/attendance/users', {
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
    const res = await fetch(`/api/attendance?year=${currentYear}&month=${currentMonth}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    recordMap = {};
    (data.records || []).forEach(r => {
      recordMap[`${r.user_id}_${r.date}`] = r;
    });
  } catch (e) { console.error('출근기록 조회 오류', e); }
}

// ── 범례 렌더링 ───────────────────────────────────────────
function renderLegend() {
  const el = document.getElementById('attLegend');
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
  document.getElementById('attMonthLabel').textContent =
    `${currentYear}년 ${currentMonth}월`;

  const firstDow  = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=일
  const totalDays = new Date(currentYear, currentMonth, 0).getDate();
  const today     = new Date().toISOString().slice(0, 10);

  // 6주 × 7일 격자 생성
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null); // 앞 빈칸
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);     // 뒤 빈칸

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const tbody = document.getElementById('attCalBody');
  if (!tbody) return;

  tbody.innerHTML = weeks.map(week => `
    <tr class="att-week-row">
      ${week.map((d, dow) => {
        if (d === null) {
          return `<td class="att-day-cell att-day-empty"></td>`;
        }
        const dateStr  = `${currentYear}-${pad(currentMonth)}-${pad(d)}`;
        const isToday  = dateStr === today;
        const isSun    = dow === 0;
        const isSat    = dow === 6;
        let cls = 'att-day-cell';
        if (isToday) cls += ' att-today';
        if (isSun)   cls += ' att-sun';
        if (isSat)   cls += ' att-sat';

        // 해당 날의 출근 기록 칩
        const chips = userList.map(u => {
          const rec = recordMap[`${u.id}_${dateStr}`];
          if (!rec) return '';
          const color = getUserColor(u.id);
          const inT  = rec.check_in  ? rec.check_in.slice(0,5)  : '';
          const outT = rec.check_out ? rec.check_out.slice(0,5) : '';
          const timeStr = [inT, outT].filter(Boolean).join(' ~ ') || '기록';
          return `<div class="att-chip" style="background:${color}22;border-left:3px solid ${color};"
            data-uid="${u.id}" data-date="${dateStr}" data-rid="${rec.id}">
            <span class="att-chip-name" style="color:${color}">${u.name || u.username}</span>
            <span class="att-chip-time">${timeStr}</span>
          </div>`;
        }).join('');

        const dateNumCls = isSun ? 'att-date-num sun' : isSat ? 'att-date-num sat' : 'att-date-num';

        return `<td class="${cls}" data-date="${dateStr}">
          <div class="att-day-inner">
            <span class="${dateNumCls}">${isToday ? `<span class="att-today-badge">${d}</span>` : d}</span>
            <div class="att-chips">${chips}</div>
            <button class="att-add-btn" data-date="${dateStr}" title="출근 기록 추가">+</button>
          </div>
        </td>`;
      }).join('')}
    </tr>
  `).join('');

  // 이벤트 바인딩
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

// ── 모달: 직원 선택 후 기록 추가 ──────────────────────────
function openAddModal(date) {
  // 직원 선택 드롭다운 채우기
  const sel = document.getElementById('attModalUserSelect');
  sel.innerHTML = userList.map(u =>
    `<option value="${u.id}">${u.name || u.username}</option>`
  ).join('');

  document.getElementById('attModalTitle').textContent = `출근 기록 추가 — ${date}`;
  document.getElementById('attEditUserId').value  = '';
  document.getElementById('attEditDate').value    = date;
  document.getElementById('attEditRecordId').value = '';
  document.getElementById('attEditCheckIn').value  = '';
  document.getElementById('attEditCheckOut').value = '';
  document.getElementById('attEditNote').value     = '';
  document.getElementById('attDeleteBtn').style.display = 'none';
  document.getElementById('attModalUserRow').style.display = 'flex';
  document.getElementById('attModalOverlay').style.display = 'flex';
}

function openEditModal(userId, date, recordId) {
  const user = userList.find(u => u.id === userId);
  const rec  = recordMap[`${userId}_${date}`] || {};

  document.getElementById('attModalTitle').textContent =
    `${user?.name || user?.username || ''} — ${date}`;
  document.getElementById('attEditUserId').value   = userId;
  document.getElementById('attEditDate').value     = date;
  document.getElementById('attEditRecordId').value = recordId || '';
  document.getElementById('attEditCheckIn').value  = rec.check_in  || '';
  document.getElementById('attEditCheckOut').value = rec.check_out || '';
  document.getElementById('attEditNote').value     = rec.note || '';
  document.getElementById('attDeleteBtn').style.display = 'inline-flex';
  document.getElementById('attModalUserRow').style.display = 'none';
  document.getElementById('attModalOverlay').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('attModalOverlay').style.display = 'none';
}

// ── 저장 ─────────────────────────────────────────────────
async function saveRecord() {
  let user_id = document.getElementById('attEditUserId').value;
  // 직원 선택 row가 보이면 select에서 가져옴
  const userRow = document.getElementById('attModalUserRow');
  if (userRow.style.display !== 'none') {
    user_id = document.getElementById('attModalUserSelect').value;
  }
  const date      = document.getElementById('attEditDate').value;
  const check_in  = document.getElementById('attEditCheckIn').value.trim();
  const check_out = document.getElementById('attEditCheckOut').value.trim();
  const note      = document.getElementById('attEditNote').value.trim();

  const saveBtn = document.getElementById('attSaveBtn');
  saveBtn.disabled = true;
  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, date, check_in, check_out, note })
    });
    const data = await res.json();
    if (data.success) {
      closeEditModal();
      await loadRecords();
      renderCalendar();
    } else { alert(data.message || '저장 실패'); }
  } catch (e) { alert('오류가 발생했습니다.'); }
  finally { saveBtn.disabled = false; }
}

// ── 삭제 ─────────────────────────────────────────────────
async function deleteRecord() {
  const rid = document.getElementById('attEditRecordId').value;
  if (!rid || !confirm('이 출근기록을 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/attendance/${rid}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      closeEditModal();
      await loadRecords();
      renderCalendar();
    } else { alert(data.message || '삭제 실패'); }
  } catch (e) { alert('오류가 발생했습니다.'); }
}

// ── 공개 API ─────────────────────────────────────────────
export async function loadAttendance() {
  await loadRecords();
  renderCalendar();
}

export async function initAttendance(authToken) {
  token = authToken;

  document.getElementById('attPrevBtn')?.addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    await loadAttendance();
  });
  document.getElementById('attNextBtn')?.addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    await loadAttendance();
  });
  document.getElementById('attTodayBtn')?.addEventListener('click', async () => {
    currentYear  = new Date().getFullYear();
    currentMonth = new Date().getMonth() + 1;
    await loadAttendance();
  });

  document.getElementById('attModalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.getElementById('attModalClose')?.addEventListener('click', closeEditModal);
  document.getElementById('attModalCancel')?.addEventListener('click', closeEditModal);
  document.getElementById('attSaveBtn')?.addEventListener('click', saveRecord);
  document.getElementById('attDeleteBtn')?.addEventListener('click', deleteRecord);

  await loadUsers();
}
