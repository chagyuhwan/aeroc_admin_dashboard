// 월간 일정표 모듈

let token = '';
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let scheduleList = [];
let editingId    = null;

const PRESET_COLORS = [
  '#3b82f6','#22c55e','#f59e0b','#ef4444',
  '#a855f7','#14b8a6','#f43f5e','#84cc16',
  '#06b6d4','#fb923c',
];

const EVENT_H  = 26; // 이벤트 바 높이 (px)
const EVENT_GAP = 4; // 이벤트 바 간격 (px)
const DATE_AREA = 40; // 날짜 숫자 영역 높이 (px)

function pad(n) { return String(n).padStart(2, '0'); }
function mkDate(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }
function hexRgb(hex) {
  const h = (hex || '#3b82f6').replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
}

// ── 데이터 로드 ─────────────────────────────────
async function loadSchedules() {
  try {
    const res = await fetch(`/api/schedules?year=${currentYear}&month=${currentMonth}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    scheduleList = data.schedules || [];
  } catch (e) { console.error('일정 조회 오류', e); }
}

// ── 달력 렌더링 ─────────────────────────────────
function renderCalendar() {
  document.getElementById('schMonthLabel').textContent = `${currentYear}년 ${currentMonth}월`;

  const firstDow  = new Date(currentYear, currentMonth - 1, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth, 0).getDate();
  const today     = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const container = document.getElementById('schCalGrid');
  if (!container) return;
  container.innerHTML = '';

  // ─ 요일 헤더 ─
  const hdr = document.createElement('div');
  hdr.className = 'sch-dow-header';
  ['일','월','화','수','목','금','토'].forEach((d, i) => {
    const th = document.createElement('div');
    th.className = 'sch-dow-cell' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '');
    th.textContent = d;
    hdr.appendChild(th);
  });
  container.appendChild(hdr);

  // ─ 주(week) 렌더 ─
  weeks.forEach(week => {
    const weekDates = week.map(d => (d === null ? null : mkDate(currentYear, currentMonth, d)));
    const weekStart = weekDates.find(x => x !== null);
    const weekEnd   = [...weekDates].reverse().find(x => x !== null);

    // 이 주에 걸치는 이벤트 계산 (row 배치 포함)
    const weekEvents = weekStart ? scheduleList.filter(s => {
      const start = s.date;
      const end   = s.end_date || s.date;
      return start <= weekEnd && end >= weekStart;
    }) : [];

    const rowEnds = [];
    const placed  = weekEvents.map(s => {
      const evStart = s.date < weekStart ? weekStart : s.date;
      const evEnd   = (s.end_date || s.date) > weekEnd ? weekEnd : (s.end_date || s.date);
      const colStart = weekDates.indexOf(evStart) + 1;
      const colEnd   = weekDates.indexOf(evEnd)   + 1;
      if (colStart < 1 || colEnd < 1) return null;

      let rowIdx = rowEnds.findIndex(last => last < colStart);
      if (rowIdx === -1) { rowIdx = rowEnds.length; rowEnds.push(0); }
      rowEnds[rowIdx] = colEnd;

      return { s, colStart, colEnd, rowIdx,
               isFirst: s.date >= weekStart,
               isLast:  (s.end_date || s.date) <= weekEnd };
    }).filter(Boolean);

    // 이 주에 필요한 셀 높이 결정
    const rowCount = rowEnds.length;
    const cellH = Math.max(160, DATE_AREA + rowCount * (EVENT_H + EVENT_GAP) + EVENT_GAP + 8);

    /*
     * .sch-week (position:relative, display:grid, 7열)
     *   ├ .sch-date-cell × 7  (날짜 숫자 + + 버튼)
     *   └ .sch-event-bar × n  (position:absolute, 가로 spanning)
     */
    const weekEl = document.createElement('div');
    weekEl.className = 'sch-week';
    weekEl.style.gridTemplateRows = `${cellH}px`; // 단일 행 높이

    // ── 날짜 셀 ──
    week.forEach((d, col) => {
      const cell = document.createElement('div');
      cell.style.gridColumn = col + 1;

      if (d === null) {
        cell.className = 'sch-date-cell sch-date-empty';
      } else {
        const dateStr = weekDates[col];
        const isToday = dateStr === today;
        cell.className = 'sch-date-cell'
          + (col === 0 ? ' sun' : col === 6 ? ' sat' : '')
          + (isToday ? ' is-today' : '');
        cell.dataset.date = dateStr;

        const num = document.createElement('span');
        num.className = 'sch-date-num';
        num.innerHTML = isToday
          ? `<span class="sch-today-badge">${d}</span>`
          : d;
        cell.appendChild(num);

        const btn = document.createElement('button');
        btn.className = 'sch-add-btn';
        btn.textContent = '+';
        btn.title = '일정 추가';
        btn.addEventListener('click', e => { e.stopPropagation(); openAddModal(dateStr); });
        cell.appendChild(btn);
      }
      weekEl.appendChild(cell);
    });

    // ── 이벤트 바 (absolute) ──
    placed.forEach(({ s, colStart, colEnd, rowIdx, isFirst, isLast }) => {
      const color = s.color || '#3b82f6';
      const rgb   = hexRgb(color);

      const bar = document.createElement('div');
      bar.className = 'sch-event-bar';

      // 가로 위치: 열 인덱스 기반 퍼센트
      const pctLeft  = ((colStart - 1) / 7) * 100;
      const pctWidth = ((colEnd - colStart + 1) / 7) * 100;
      bar.style.left    = `calc(${pctLeft}% + ${isFirst ? 4 : 0}px)`;
      bar.style.width   = `calc(${pctWidth}% - ${(isFirst ? 4 : 0) + (isLast ? 4 : 0)}px)`;
      bar.style.top     = `${DATE_AREA + rowIdx * (EVENT_H + EVENT_GAP)}px`;
      bar.style.height  = `${EVENT_H}px`;

      bar.style.background = `rgba(${rgb}, 0.18)`;
      bar.style.borderLeft = isFirst ? `3px solid ${color}` : '3px solid transparent';
      bar.style.color      = color;
      bar.style.borderRadius = (isFirst && isLast) ? '5px'
        : isFirst ? '5px 0 0 5px' : isLast ? '0 5px 5px 0' : '0';

      bar.dataset.id = s.id;
      bar.title = s.title + (s.memo ? `\n${s.memo}` : '');

      const title = document.createElement('span');
      title.className = 'sch-bar-title';
      title.textContent = isFirst ? s.title : '';
      bar.appendChild(title);

      bar.addEventListener('click', e => { e.stopPropagation(); openEditModal(s.id); });
      weekEl.appendChild(bar);
    });

    container.appendChild(weekEl);
  });
}

// ── 모달 ────────────────────────────────────────
function openAddModal(date) {
  editingId = null;
  document.getElementById('schModalTitle').textContent = '일정 추가';
  document.getElementById('schEditTitle').value    = '';
  document.getElementById('schEditDate').value     = date;
  document.getElementById('schEditEndDate').value  = date;
  document.getElementById('schEditColor').value    = '#3b82f6';
  document.getElementById('schEditMemo').value     = '';
  document.getElementById('schDeleteBtn').style.display = 'none';
  renderColorPicker('#3b82f6');
  document.getElementById('schModalOverlay').style.display = 'flex';
  setTimeout(() => document.getElementById('schEditTitle').focus(), 50);
}

function openEditModal(id) {
  const s = scheduleList.find(x => x.id === id);
  if (!s) return;
  editingId = id;
  document.getElementById('schModalTitle').textContent = '일정 수정';
  document.getElementById('schEditTitle').value    = s.title    || '';
  document.getElementById('schEditDate').value     = s.date     || '';
  document.getElementById('schEditEndDate').value  = s.end_date || s.date || '';
  document.getElementById('schEditColor').value    = s.color    || '#3b82f6';
  document.getElementById('schEditMemo').value     = s.memo     || '';
  document.getElementById('schDeleteBtn').style.display = 'inline-flex';
  renderColorPicker(s.color || '#3b82f6');
  document.getElementById('schModalOverlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('schModalOverlay').style.display = 'none';
  editingId = null;
}

function renderColorPicker(selected) {
  const wrap = document.getElementById('schColorPicker');
  if (!wrap) return;
  wrap.innerHTML = PRESET_COLORS.map(c => `
    <button type="button" class="sch-color-dot${c === selected ? ' selected' : ''}"
      style="background:${c};" data-color="${c}"></button>
  `).join('');
  wrap.querySelectorAll('.sch-color-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('schEditColor').value = btn.dataset.color;
      wrap.querySelectorAll('.sch-color-dot').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

async function saveSchedule() {
  const title   = document.getElementById('schEditTitle').value.trim();
  const date    = document.getElementById('schEditDate').value;
  const endDate = document.getElementById('schEditEndDate').value;
  const color   = document.getElementById('schEditColor').value;
  const memo    = document.getElementById('schEditMemo').value.trim();
  if (!title) { alert('제목을 입력해주세요.'); return; }
  if (!date)  { alert('날짜를 입력해주세요.'); return; }
  const saveBtn = document.getElementById('schSaveBtn');
  saveBtn.disabled = true;
  try {
    const url    = editingId ? `/api/schedules/${editingId}` : '/api/schedules';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, end_date: endDate || date, color, memo }),
    });
    const data = await res.json();
    if (data.success) { closeModal(); await loadAndRender(); }
    else alert(data.message || '저장 실패');
  } catch (e) { alert('오류가 발생했습니다.'); }
  finally { saveBtn.disabled = false; }
}

async function deleteSchedule() {
  if (!editingId || !confirm('이 일정을 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/schedules/${editingId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) { closeModal(); await loadAndRender(); }
    else alert(data.message || '삭제 실패');
  } catch (e) { alert('오류가 발생했습니다.'); }
}

async function loadAndRender() {
  await loadSchedules();
  renderCalendar();
}

export async function loadSchedulePage() { await loadAndRender(); }

export function initSchedule(authToken) {
  token = authToken;
  document.getElementById('schPrevBtn')?.addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    await loadAndRender();
  });
  document.getElementById('schNextBtn')?.addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    await loadAndRender();
  });
  document.getElementById('schTodayBtn')?.addEventListener('click', async () => {
    currentYear  = new Date().getFullYear();
    currentMonth = new Date().getMonth() + 1;
    await loadAndRender();
  });
  document.getElementById('schAddBtn')?.addEventListener('click', () => {
    openAddModal(new Date().toISOString().slice(0, 10));
  });
  document.getElementById('schModalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('schModalClose')?.addEventListener('click', closeModal);
  document.getElementById('schModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('schSaveBtn')?.addEventListener('click', saveSchedule);
  document.getElementById('schDeleteBtn')?.addEventListener('click', deleteSchedule);
}
