// 블로그 관리 모듈 (관리자 전용)
import { escapeHtml } from './utils.js';

let token = '';
let blogList = [];
let editingId = null;

// ── 날짜 유틸 ─────────────────────────────────────────
function parseDate(str) {
  // 'YYYY-MM-DD' → Date (시간 없이)
  const [y, m, d] = (str || '').split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 첫 업로드일 기준, 오늘 이후 가장 가까운 업로드 예정일 반환
 * 규칙: 매달 first_post_date와 같은 날짜
 */
function getNextPostDate(firstPostDateStr) {
  if (!firstPostDateStr) return null;
  const first = parseDate(firstPostDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today <= first) return first;

  const postDay = first.getDate();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), postDay);

  return today <= thisMonth
    ? thisMonth
    : new Date(today.getFullYear(), today.getMonth() + 1, postDay);
}

function getDaysRemaining(firstPostDateStr) {
  const next = getNextPostDate(firstPostDateStr);
  if (!next) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((next - today) / 86400000);
}

function formatNextDate(firstPostDateStr) {
  const next = getNextPostDate(firstPostDateStr);
  if (!next) return '-';
  return next.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function renderDaysBadge(days) {
  if (days === null) return '-';
  if (days < 0) {
    return `<span class="blog-days-badge overdue">${Math.abs(days)}일 초과</span>`;
  }
  if (days === 0) {
    return `<span class="blog-days-badge today">오늘!</span>`;
  }
  if (days <= 7) {
    return `<span class="blog-days-badge urgent">${days}일 후</span>`;
  }
  if (days <= 14) {
    return `<span class="blog-days-badge soon">${days}일 후</span>`;
  }
  return `<span class="blog-days-badge safe">${days}일 후</span>`;
}

// ── 데이터 로드 ───────────────────────────────────────
export async function loadBlogPosts() {
  try {
    const q = document.getElementById('blogSearch')?.value.trim() || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);

    const res = await fetch('/api/blog?' + params.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // 남은 날짜 계산 후 오름차순 정렬
    blogList = (data.clients || [])
      .map(c => ({ ...c, _days: getDaysRemaining(c.first_post_date) }))
      .sort((a, b) => {
        if (a._days === null) return 1;
        if (b._days === null) return -1;
        return a._days - b._days;
      });

    const countEl = document.getElementById('blogCount');
    if (countEl) countEl.textContent = blogList.length.toLocaleString();

    renderBlogTable(blogList);
  } catch (err) {
    console.error('블로그 목록 로드 오류:', err);
  }
}

// ── 테이블 렌더 ───────────────────────────────────────
function renderBlogTable(list) {
  const tbody = document.getElementById('blogTableBody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="customer-empty">등록된 블로그가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => {
    const planBadge = c.plan_type === '2년24회'
      ? `<span class="blog-plan-badge plan24">${c.plan_type}</span>`
      : `<span class="blog-plan-badge plan12">${c.plan_type}</span>`;
    const blogLink = c.blog_url
      ? `<a href="${escapeHtml(c.blog_url)}" target="_blank" rel="noopener" class="blog-url-link">${escapeHtml(c.blog_url)}</a>`
      : '-';
    return `
      <tr>
        <td class="fw-500">${escapeHtml(c.company_name)}</td>
        <td>${planBadge}</td>
        <td>${escapeHtml(c.naver_id || '-')}</td>
        <td>${blogLink}</td>
        <td class="text-muted">${escapeHtml(c.keyword || '-')}</td>
        <td>${c.first_post_date || '-'}</td>
        <td>${formatNextDate(c.first_post_date)}</td>
        <td>${renderDaysBadge(c._days)}</td>
        <td><button class="customer-detail-btn blog-edit-btn" data-id="${c.id}">수정</button></td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.blog-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openBlogModal(Number(btn.dataset.id)));
  });
}

// ── 모달 ─────────────────────────────────────────────
function openBlogModal(id = null) {
  editingId = id;
  const overlay = document.getElementById('blogModalOverlay');
  const titleEl = document.getElementById('blogModalTitle');
  const delBtn  = document.getElementById('blogDeleteBtn');

  ['blogCompanyName', 'blogNaverId', 'blogNaverPw', 'blogUrl', 'blogKeyword', 'blogFirstDate'].forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
  });
  document.getElementById('blogPlanType').value = '1년12회';

  if (id) {
    const c = blogList.find(x => x.id === id);
    if (c) {
      document.getElementById('blogCompanyName').value = c.company_name || '';
      document.getElementById('blogPlanType').value    = c.plan_type || '1년12회';
      document.getElementById('blogNaverId').value     = c.naver_id || '';
      document.getElementById('blogNaverPw').value     = c.naver_password || '';
      document.getElementById('blogUrl').value         = c.blog_url || '';
      document.getElementById('blogKeyword').value     = c.keyword || '';
      document.getElementById('blogFirstDate').value   = c.first_post_date || '';
    }
    titleEl.textContent = '블로그 수정';
    delBtn.style.display = 'inline-flex';
  } else {
    titleEl.textContent = '블로그 등록';
    delBtn.style.display = 'none';
  }
  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('blogCompanyName')?.focus(), 50);
}

function closeBlogModal() {
  document.getElementById('blogModalOverlay').style.display = 'none';
  editingId = null;
}

// ── 공개 API ──────────────────────────────────────────
export function initBlog(authToken) {
  token = authToken;

  document.getElementById('openBlogModal')?.addEventListener('click', () => openBlogModal());
  document.getElementById('closeBlogModal')?.addEventListener('click', closeBlogModal);
  document.getElementById('cancelBlogModal')?.addEventListener('click', closeBlogModal);
  document.getElementById('blogModalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeBlogModal();
  });

  // 비밀번호 보기/숨기기
  document.getElementById('blogNaverPwToggle')?.addEventListener('click', () => {
    const inp = document.getElementById('blogNaverPw');
    const icon = document.getElementById('blogNaverPwToggle').querySelector('i');
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    if (icon) icon.className = inp.type === 'password' ? 'bx bx-show' : 'bx bx-hide';
  });

  document.getElementById('blogSearchBtn')?.addEventListener('click', loadBlogPosts);
  document.getElementById('blogSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadBlogPosts();
  });

  document.getElementById('blogDeleteBtn')?.addEventListener('click', async () => {
    if (!editingId || !confirm('이 블로그를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/blog/${editingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { closeBlogModal(); loadBlogPosts(); }
      else alert(data.message || '삭제 실패');
    } catch { alert('오류가 발생했습니다.'); }
  });

  document.getElementById('saveBlogBtn')?.addEventListener('click', async () => {
    const company_name   = document.getElementById('blogCompanyName').value.trim();
    const plan_type      = document.getElementById('blogPlanType').value;
    const naver_id       = document.getElementById('blogNaverId').value.trim();
    const naver_password = document.getElementById('blogNaverPw').value.trim();
    const blog_url       = document.getElementById('blogUrl').value.trim();
    const keyword        = document.getElementById('blogKeyword').value.trim();
    const first_post_date = document.getElementById('blogFirstDate').value;

    if (!company_name)   { alert('업체명을 입력해주세요.'); return; }
    if (!first_post_date){ alert('첫 업로드 날짜를 입력해주세요.'); return; }

    const body = { company_name, plan_type, naver_id, naver_password, blog_url, keyword, first_post_date };
    const saveBtn = document.getElementById('saveBlogBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '저장 중...'; }

    try {
      const url    = editingId ? `/api/blog/${editingId}` : '/api/blog';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        closeBlogModal();
        loadBlogPosts();
        alert(editingId ? '수정되었습니다.' : '등록되었습니다.');
      } else alert(data.message || '저장 실패');
    } catch { alert('저장 중 오류가 발생했습니다.'); }
    finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '저장'; } }
  });
}
