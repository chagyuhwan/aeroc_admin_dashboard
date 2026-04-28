// 비밀번호 금고 모듈
import { escapeHtml } from './utils.js';

let token = '';
let currentUser = {};
let vaultEditingId = null;
let vaultSelectedImage = null;
let vaultIsPublic = 0;

export async function loadVaultData() {
  const search = document.getElementById('vaultSearchInput')?.value.trim() || '';
  const category = document.getElementById('vaultCategorySelect')?.value || '전체';
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category !== '전체') params.set('category', category);
    const res = await fetch('/api/passwords?' + params.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.success) renderVaultCards(result.passwords);
  } catch (err) { console.error('비밀번호 로드 실패:', err); }
}

function renderVaultCards(list) {
  const grid = document.getElementById('vaultGrid');
  const empty = document.getElementById('vaultEmpty');
  grid.querySelectorAll('.vault-card').forEach(c => c.remove());
  if (!list || list.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'vault-card';
    const initial = (p.service_name || '?').charAt(0).toUpperCase();
    const color = p.icon_color || '#6366f1';
    const iconHtml = p.icon_image
      ? `<div class="vault-icon"><img src="${p.icon_image}" alt="${escapeHtml(initial)}"></div>`
      : `<div class="vault-icon" style="background:${color}">${initial}</div>`;

    card.innerHTML = `
      <div class="vault-card-top">
        ${iconHtml}
        <div class="vault-card-info">
          <div class="vault-service-name-row">
            <span class="vault-service-name">${escapeHtml(p.service_name)}</span>
            ${p.service_url ? `<button class="vault-url-btn" title="URL 열기"><i class='bx bx-link-external'></i></button>` : ''}
          </div>
        </div>
        <div class="vault-card-right">
          <span class="vault-badge vault-badge-${p.category || '기타'}">${escapeHtml(p.category || '기타')}</span>
          <span class="vault-visibility-badge ${p.is_public ? 'public' : 'private'}">
            <i class='bx ${p.is_public ? 'bx-globe' : 'bx-lock-alt'}'></i>
            ${p.is_public ? '공개' : '비공개'}
          </span>
        </div>
      </div>
      <div class="vault-field">
        <span class="vault-field-label">ID</span>
        <div class="vault-field-row">
          <span class="vault-field-val ${!p.username ? 'empty' : ''}">${p.username ? escapeHtml(p.username) : '—'}</span>
          ${p.username ? `<button class="vault-copy-btn" data-val="${escapeHtml(p.username)}" title="복사"><i class='bx bx-copy'></i></button>` : ''}
        </div>
      </div>
      <div class="vault-field">
        <span class="vault-field-label">PASSWORD</span>
        <div class="vault-field-row">
          <span class="vault-field-val vault-pw-display ${!p.password ? 'empty' : ''}" data-pw="${escapeHtml(p.password || '')}">${p.password ? '••••••••••••' : '—'}</span>
          ${p.password ? `<button class="vault-pw-eye-card" title="보기/숨기기"><i class='bx bx-show'></i></button>` : ''}
          ${p.password ? `<button class="vault-copy-btn" data-val="${escapeHtml(p.password)}" title="복사"><i class='bx bx-copy'></i></button>` : ''}
        </div>
      </div>`;

    const nameEl = card.querySelector('.vault-service-name');
    if (nameEl) {
      if (currentUser.role === 'admin') { nameEl.addEventListener('click', () => openVaultModal(p)); }
      else { nameEl.style.cursor = 'default'; nameEl.style.textDecoration = 'none'; }
    }
    card.querySelector('.vault-url-btn')?.addEventListener('click', () => window.open(p.service_url, '_blank'));
    card.querySelectorAll('.vault-copy-btn[data-val]').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.val, btn));
    });
    const eyeBtn = card.querySelector('.vault-pw-eye-card');
    const pwDisplay = card.querySelector('.vault-pw-display');
    if (eyeBtn && pwDisplay) {
      eyeBtn.addEventListener('click', () => {
        const isShowing = eyeBtn.querySelector('i').classList.contains('bx-hide');
        pwDisplay.textContent = isShowing ? '••••••••••••' : pwDisplay.dataset.pw;
        eyeBtn.querySelector('i').className = isShowing ? 'bx bx-show' : 'bx bx-hide';
      });
    }
    grid.appendChild(card);
  });
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector('i');
    const orig = icon.className;
    icon.className = 'bx bx-check'; btn.classList.add('copied');
    setTimeout(() => { icon.className = orig; btn.classList.remove('copied'); }, 1500);
  });
}

function openVaultModal(data = null) {
  vaultEditingId = data ? data.id : null;
  vaultSelectedImage = data?.icon_image || null;
  vaultIsPublic = data ? (data.is_public || 0) : 0;
  document.getElementById('vaultModalTitle').textContent = data ? '비밀번호 수정' : '비밀번호 추가';
  document.getElementById('vfServiceName').value = data?.service_name || '';
  document.getElementById('vfServiceUrl').value = data?.service_url || '';
  document.getElementById('vfCategory').value = data?.category || '업무용';
  document.getElementById('vfUsername').value = data?.username || '';
  document.getElementById('vfPassword').value = data?.password || '';
  updateVisibilityToggle(vaultIsPublic);
  updateIconPreview(data?.service_name || '?', data?.icon_color || '#6366f1');
  const deleteBtn = document.getElementById('vaultDeleteBtn');
  if (deleteBtn) deleteBtn.style.display = data ? 'block' : 'none';
  const fileInput = document.getElementById('vfIconFile');
  if (fileInput) fileInput.value = '';
  document.getElementById('vaultModalOverlay').style.display = 'flex';
}

function updateVisibilityToggle(isPublic) {
  document.getElementById('vfVisPrivate')?.classList.toggle('active', !isPublic);
  document.getElementById('vfVisPublic')?.classList.toggle('active', !!isPublic);
}

function updateIconPreview(serviceName, fallbackColor) {
  const preview = document.getElementById('vfIconPreview');
  if (!preview) return;
  const initial = (serviceName || '?').charAt(0).toUpperCase();
  if (vaultSelectedImage) {
    preview.style.background = 'transparent';
    preview.innerHTML = `<img src="${vaultSelectedImage}" alt="${initial}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
  } else {
    preview.style.background = fallbackColor || '#6366f1';
    preview.innerHTML = `<span style="font-size:22px;font-weight:700;color:#fff;">${initial}</span>`;
  }
}

function closeVaultModal() {
  document.getElementById('vaultModalOverlay').style.display = 'none';
  vaultEditingId = null; vaultSelectedImage = null;
  const fileInput = document.getElementById('vfIconFile');
  if (fileInput) fileInput.value = '';
}

async function deleteVaultItem(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/passwords/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.success) { closeVaultModal(); loadVaultData(); }
    else alert(result.message || '삭제 실패');
  } catch (err) { alert('삭제 중 오류가 발생했습니다.'); }
}

export function initVault(authToken, user) {
  token = authToken;
  currentUser = user;

  const vaultAddBtnEl = document.getElementById('vaultAddBtn');
  if (vaultAddBtnEl) {
    if (user.role === 'admin') { vaultAddBtnEl.addEventListener('click', () => openVaultModal()); }
    else { vaultAddBtnEl.style.display = 'none'; }
  }

  document.getElementById('vfIconFile')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { vaultSelectedImage = ev.target.result; updateIconPreview(document.getElementById('vfServiceName')?.value || '?', '#6366f1'); };
    reader.readAsDataURL(file);
  });

  document.getElementById('vfIconRemove')?.addEventListener('click', () => {
    vaultSelectedImage = null;
    const fileInput = document.getElementById('vfIconFile');
    if (fileInput) fileInput.value = '';
    updateIconPreview(document.getElementById('vfServiceName')?.value || '?', '#6366f1');
  });

  document.getElementById('vfServiceName')?.addEventListener('input', (e) => {
    if (!vaultSelectedImage) updateIconPreview(e.target.value, '#6366f1');
  });

  document.getElementById('vfPwToggle')?.addEventListener('click', () => {
    const input = document.getElementById('vfPassword');
    const icon = document.querySelector('#vfPwToggle i');
    if (input.type === 'password') { input.type = 'text'; icon.className = 'bx bx-hide'; }
    else { input.type = 'password'; icon.className = 'bx bx-show'; }
  });

  document.getElementById('vfVisPrivate')?.addEventListener('click', () => { vaultIsPublic = 0; updateVisibilityToggle(0); });
  document.getElementById('vfVisPublic')?.addEventListener('click', () => { vaultIsPublic = 1; updateVisibilityToggle(1); });
  document.getElementById('vaultDeleteBtn')?.addEventListener('click', () => { if (vaultEditingId) deleteVaultItem(vaultEditingId); });
  document.getElementById('vaultModalClose')?.addEventListener('click', closeVaultModal);
  document.getElementById('vaultModalCancel')?.addEventListener('click', closeVaultModal);
  document.getElementById('vaultModalOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeVaultModal(); });
  document.getElementById('vaultSearchBtn')?.addEventListener('click', loadVaultData);
  document.getElementById('vaultSearchInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadVaultData(); });

  document.getElementById('vaultSaveBtn')?.addEventListener('click', async () => {
    const serviceName = document.getElementById('vfServiceName').value.trim();
    if (!serviceName) { alert('서비스명을 입력해주세요.'); return; }
    const body = {
      service_name: serviceName,
      service_url: document.getElementById('vfServiceUrl').value.trim(),
      category: document.getElementById('vfCategory').value,
      username: document.getElementById('vfUsername').value.trim(),
      password: document.getElementById('vfPassword').value,
      icon_image: vaultSelectedImage,
      is_public: vaultIsPublic
    };
    const saveBtn = document.getElementById('vaultSaveBtn');
    if (saveBtn) { saveBtn.disabled = true; }
    try {
      const url = vaultEditingId ? `/api/passwords/${vaultEditingId}` : '/api/passwords';
      const method = vaultEditingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await res.json();
      if (result.success) { closeVaultModal(); loadVaultData(); }
      else alert(result.message || '저장 실패');
    } catch (err) { alert('저장 중 오류가 발생했습니다.'); }
    finally { if (saveBtn) saveBtn.disabled = false; }
  });
}
