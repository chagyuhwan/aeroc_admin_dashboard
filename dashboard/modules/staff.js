// 직원 관리 모듈 (관리자 전용)

let token = '';
let staffEditingId = null;
const roleLabels = { admin: '관리자', team_leader: '팀장', user: '사원' };

export async function loadStaffData() {
  const search = document.getElementById('staffSearchInput')?.value.trim().toLowerCase() || '';
  try {
    const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!data.success) { alert(data.message || '오류'); return; }
    const filtered = search
      ? data.users.filter(u => (u.name || '').toLowerCase().includes(search) || u.username.toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search))
      : data.users;
    renderStaffTable(filtered);
  } catch (err) { console.error('직원 목록 오류:', err); }
}

function renderStaffTable(list) {
  const tbody = document.getElementById('staffTableBody');
  const countEl = document.getElementById('staffTableCount');
  if (!tbody) return;
  if (countEl) countEl.textContent = `직원 (${list.length}명)`;
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="7" class="leave-empty">등록된 직원이 없습니다.</td></tr>`; return; }

  tbody.innerHTML = list.map(u => {
    const roleClass = u.role === 'admin' ? 'admin' : u.role === 'team_leader' ? 'team_leader' : 'user';
    const roleName = roleLabels[u.role] || u.role;
    const pwVal = u.plain_password || '-';
    return `<tr>
      <td>${u.name || '-'}</td>
      <td>${u.username}</td>
      <td>${u.email || '-'}</td>
      <td>${u.phone || '-'}</td>
      <td>
        <div class="pw-cell">
          <span class="staff-pw-val" style="filter:blur(4px);" data-id="${u.id}">${pwVal}</span>
          <button class="staff-pw-toggle" data-id="${u.id}" title="비밀번호 보기"><i class='bx bx-show'></i></button>
        </div>
      </td>
      <td><span class="staff-role-badge ${roleClass}">${roleName}</span></td>
      <td><button class="staff-edit-btn btn btn-secondary" data-id="${u.id}" style="font-size:12px;padding:3px 10px;">수정</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.staff-pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const valEl = tbody.querySelector(`.staff-pw-val[data-id="${id}"]`);
      const icon = btn.querySelector('i');
      if (valEl.style.filter === 'none') {
        valEl.style.filter = 'blur(4px)';
        icon.className = 'bx bx-show';
      } else {
        valEl.style.filter = 'none';
        icon.className = 'bx bx-hide';
      }
    });
  });

  tbody.querySelectorAll('.staff-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const u = list.find(x => String(x.id) === String(id));
      if (u) openStaffModal(u);
    });
  });
}

function openStaffModal(data = null) {
  staffEditingId = data ? data.id : null;
  document.getElementById('staffModalTitle').textContent = data ? '직원 수정' : '직원 추가';
  document.getElementById('sfName').value = data?.name || '';
  document.getElementById('sfPhone').value = data?.phone || '';
  document.getElementById('sfUsername').value = data?.username || '';
  document.getElementById('sfEmail').value = data?.email || '';
  document.getElementById('sfPassword').value = '';
  document.getElementById('sfRole').value = data?.role || 'user';

  const hint = document.getElementById('sfPasswordHint');
  if (hint) hint.textContent = data ? '변경할 경우에만 입력하세요' : '';
  const label = document.getElementById('sfPasswordLabel');
  if (label) label.innerHTML = data ? '비밀번호' : '비밀번호 <span class="req">*</span>';

  const deleteBtn = document.getElementById('staffDeleteBtn');
  if (deleteBtn) deleteBtn.style.display = data ? 'block' : 'none';

  document.getElementById('sfUsername').readOnly = !!data;
  document.getElementById('sfUsername').style.background = data ? 'var(--bg-main)' : '';
  document.getElementById('staffModalOverlay').style.display = 'flex';
}

function closeStaffModal() {
  document.getElementById('staffModalOverlay').style.display = 'none';
  staffEditingId = null;
}

export function initStaff(authToken) {
  token = authToken;

  document.getElementById('staffAddBtn')?.addEventListener('click', () => openStaffModal());
  document.getElementById('staffModalClose')?.addEventListener('click', closeStaffModal);
  document.getElementById('staffModalCancel')?.addEventListener('click', closeStaffModal);
  document.getElementById('staffModalOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeStaffModal(); });
  document.getElementById('staffSearchBtn')?.addEventListener('click', loadStaffData);
  document.getElementById('staffSearchInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadStaffData(); });

  document.getElementById('sfPwToggle')?.addEventListener('click', () => {
    const input = document.getElementById('sfPassword');
    const icon = document.querySelector('#sfPwToggle i');
    if (input.type === 'password') { input.type = 'text'; icon.className = 'bx bx-hide'; }
    else { input.type = 'password'; icon.className = 'bx bx-show'; }
  });

  document.getElementById('staffDeleteBtn')?.addEventListener('click', async () => {
    if (!staffEditingId || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/users/${staffEditingId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { closeStaffModal(); loadStaffData(); }
      else alert(data.message || '삭제 실패');
    } catch (err) { alert('오류가 발생했습니다.'); }
  });

  document.getElementById('staffForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('sfName').value.trim();
    const phone = document.getElementById('sfPhone').value.trim();
    const username = document.getElementById('sfUsername').value.trim();
    const email = document.getElementById('sfEmail').value.trim();
    const password = document.getElementById('sfPassword').value;
    const role = document.getElementById('sfRole').value;

    if (!username || !email) { alert('아이디와 이메일은 필수입니다.'); return; }
    if (!staffEditingId && !password) { alert('비밀번호를 입력해주세요.'); return; }

    const saveBtn = document.getElementById('staffSaveBtn');
    saveBtn.disabled = true;
    try {
      let res;
      if (staffEditingId) {
        const body = { name, email, phone, role };
        if (password) body.password = password;
        res = await fetch(`/api/users/${staffEditingId}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        res = await fetch('/api/users', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, name, phone, role }) });
      }
      const data = await res.json();
      if (data.success) { closeStaffModal(); loadStaffData(); }
      else alert(data.message || '저장 실패');
    } catch (err) { alert('오류가 발생했습니다.'); }
    finally { saveBtn.disabled = false; }
  });
}
