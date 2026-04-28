// 휴가 관리 모듈
import { escapeHtml } from './utils.js';

let token = '';
let currentUser = {};

export async function loadLeaveData() {
  await Promise.all([loadLeaveQuota(), loadLeaveList()]);
}

async function loadLeaveQuota() {
  try {
    const res = await fetch('/api/vacations/my', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      document.getElementById('leaveQuotaTitle').textContent = `휴가 잔량 (${data.year}년)`;
      document.getElementById('leaveTotalDays').textContent = `${data.totalDays}일`;
      document.getElementById('leaveUsedDays').textContent = `${data.usedDays}일`;
      document.getElementById('leaveRemainDays').textContent = `${data.remainDays}일`;
    }
  } catch (err) { console.error('휴가 잔량 오류:', err); }
}

async function loadLeaveList() {
  const status = document.getElementById('leaveStatusSelect')?.value || '전체';
  try {
    const params = new URLSearchParams();
    if (status !== '전체') params.set('status', status);
    const res = await fetch('/api/vacations?' + params.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) renderLeaveTable(data.vacations);
  } catch (err) { console.error('휴가 목록 오류:', err); }
}

function renderLeaveTable(list) {
  const tbody = document.getElementById('leaveTableBody');
  const countEl = document.getElementById('leaveTableCount');
  const actionTh = document.getElementById('leaveActionTh');
  if (!tbody) return;
  const isAdmin = currentUser.role === 'admin';
  if (actionTh) actionTh.textContent = isAdmin ? '처리' : '취소';
  if (countEl) countEl.textContent = `휴가 내역 (${list.length}건)`;
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="7" class="leave-empty">신청된 휴가가 없습니다.</td></tr>`; return; }

  tbody.innerHTML = list.map(v => {
    const statusBadge = `<span class="leave-status-badge ${v.status}">${v.status}</span>`;
    let actionCell;
    if (isAdmin) {
      actionCell = v.status === '대기'
        ? `<div class="leave-admin-actions"><button class="leave-approve-btn" data-id="${v.id}"><i class='bx bx-check'></i></button><button class="leave-reject-btn" data-id="${v.id}"><i class='bx bx-x'></i></button></div>`
        : `<button class="leave-reset-btn" data-id="${v.id}"><i class='bx bx-reset'></i></button>`;
    } else {
      actionCell = v.status === '대기'
        ? `<button class="leave-cancel-btn" data-id="${v.id}"><i class='bx bx-x'></i></button>`
        : `<button class="leave-cancel-btn" disabled><i class='bx bx-minus'></i></button>`;
    }
    return `<tr>
      <td>${escapeHtml(v.user_name || v.user_username || '—')}</td>
      <td>${v.start_date}</td><td>${v.end_date}</td><td>${v.days}일</td>
      <td>${statusBadge}</td>
      <td>${(v.created_at || '').slice(0, 16).replace('T', ' ')}</td>
      <td>${actionCell}</td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.leave-cancel-btn[data-id]').forEach(btn => btn.addEventListener('click', () => cancelLeave(btn.dataset.id)));
  tbody.querySelectorAll('.leave-approve-btn').forEach(btn => btn.addEventListener('click', () => changeLeaveStatus(btn.dataset.id, '승인')));
  tbody.querySelectorAll('.leave-reject-btn').forEach(btn => btn.addEventListener('click', () => changeLeaveStatus(btn.dataset.id, '반려')));
  tbody.querySelectorAll('.leave-reset-btn').forEach(btn => btn.addEventListener('click', () => changeLeaveStatus(btn.dataset.id, '대기')));
}

async function changeLeaveStatus(id, status) {
  const label = { '승인': '승인', '반려': '반려', '대기': '대기 상태로 되돌리기' };
  if (!confirm(`해당 휴가를 ${label[status]}하시겠습니까?`)) return;
  try {
    const res = await fetch(`/api/vacations/${id}/status`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data.success) loadLeaveData();
    else alert(data.message || '처리 실패');
  } catch (err) { alert('오류가 발생했습니다.'); }
}

async function cancelLeave(id) {
  if (!confirm('해당 휴가 신청을 취소하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/vacations/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) loadLeaveData();
    else alert(data.message || '취소 실패');
  } catch (err) { alert('오류가 발생했습니다.'); }
}

function calcLeaveDays() {
  const start = document.getElementById('lfStartDate')?.value;
  const end = document.getElementById('lfEndDate')?.value;
  if (start && end) {
    const days = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1);
    const daysEl = document.getElementById('lfDays');
    if (daysEl) daysEl.value = days;
  }
}

function openLeaveModal() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('lfStartDate').value = today;
  document.getElementById('lfEndDate').value = today;
  document.getElementById('lfDays').value = 1;
  document.getElementById('lfReason').value = '';
  document.getElementById('leaveModalOverlay').style.display = 'flex';
}

function closeLeaveModal() {
  document.getElementById('leaveModalOverlay').style.display = 'none';
}

export function initVacation(authToken, user) {
  token = authToken;
  currentUser = user;

  document.getElementById('lfStartDate')?.addEventListener('change', calcLeaveDays);
  document.getElementById('lfEndDate')?.addEventListener('change', calcLeaveDays);
  document.getElementById('leaveApplyBtn')?.addEventListener('click', openLeaveModal);
  document.getElementById('leaveModalClose')?.addEventListener('click', closeLeaveModal);
  document.getElementById('leaveModalCancel')?.addEventListener('click', closeLeaveModal);
  document.getElementById('leaveModalOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeLeaveModal(); });
  document.getElementById('leaveSearchBtn')?.addEventListener('click', loadLeaveList);
  document.getElementById('leaveStatusSelect')?.addEventListener('change', loadLeaveList);

  document.getElementById('leaveForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const start = document.getElementById('lfStartDate').value;
    const end = document.getElementById('lfEndDate').value;
    const days = document.getElementById('lfDays').value;
    const reason = document.getElementById('lfReason').value.trim();
    if (!start || !end) { alert('날짜를 입력해주세요.'); return; }
    if (new Date(end) < new Date(start)) { alert('종료일은 시작일 이후여야 합니다.'); return; }
    const saveBtn = document.getElementById('leaveSaveBtn');
    saveBtn.disabled = true;
    try {
      const res = await fetch('/api/vacations', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ start_date: start, end_date: end, days: Number(days), reason }) });
      const data = await res.json();
      if (data.success) { closeLeaveModal(); loadLeaveData(); }
      else alert(data.message || '신청 실패');
    } catch (err) { alert('오류가 발생했습니다.'); }
    finally { saveBtn.disabled = false; }
  });
}
