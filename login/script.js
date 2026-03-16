const container = document.querySelector('.container');
const LoginLink = document.querySelector('.SignInLink');
const RegisterLink = document.querySelector('.SignUpLink');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const messageEl = document.getElementById('message');

// API 기본 URL (같은 서버에서 서빙되므로 상대 경로 사용)
const API_BASE = '/api/auth';

// 로그인/회원가입 폼 전환
RegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  container.classList.add('active');
  hideMessage();
});

LoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  container.classList.remove('active');
  hideMessage();
});

// 메시지 표시
function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = 'message ' + (isError ? 'error' : 'success');
  messageEl.style.display = 'block';
}

function hideMessage() {
  messageEl.style.display = 'none';
}

// 로그인 폼 제출
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showMessage('아이디와 비밀번호를 입력해주세요.', true);
    return;
  }

  const btn = loginForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = '로그인 중...';

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      showMessage('로그인 성공! 대시보드로 이동합니다.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } else {
      showMessage(data.message || '로그인에 실패했습니다.', true);
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  } catch (err) {
    showMessage('서버 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.', true);
    btn.disabled = false;
    btn.textContent = 'Login';
  }
});

// 전화번호 포맷 (010-0000-0000)
function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return digits.slice(0, 2) + '-' + digits.slice(2);
    return digits.slice(0, 2) + '-' + digits.slice(2, 6) + '-' + digits.slice(6, 10);
  }
  if (/^01[0-9]/.test(digits)) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + '-' + digits.slice(3);
    return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7, 11);
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + '-' + digits.slice(3);
  return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6, 10);
}
document.getElementById('regPhone')?.addEventListener('input', function() {
  this.value = formatPhone(this.value);
});

// 회원가입 폼 제출
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(registerForm);
  const name = (formData.get('name') || document.getElementById('regName')?.value || '').toString().trim();
  const username = (formData.get('username') || document.getElementById('regUsername')?.value || '').toString().trim();
  const password = (formData.get('password') || document.getElementById('regPassword')?.value || '').toString();
  const email = (formData.get('email') || document.getElementById('regEmail')?.value || '').toString().trim();
  const phone = (formData.get('phone') || document.getElementById('regPhone')?.value || '').toString().trim();

  if (!name || !username || !email || !password) {
    showMessage('이름, 아이디, 비밀번호, 이메일을 입력해주세요.', true);
    return;
  }

  const btn = registerForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = '가입 중...';

  const payload = { name, username, email, password, phone: phone || '' };

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      showMessage('회원가입이 완료되었습니다! 로그인해주세요.');
      container.classList.remove('active');
      registerForm.reset();
      btn.disabled = false;
      btn.textContent = '가입하기';
    } else {
      showMessage(data.message || '회원가입에 실패했습니다.', true);
      btn.disabled = false;
      btn.textContent = '가입하기';
    }
  } catch (err) {
    showMessage('서버 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.', true);
    btn.disabled = false;
    btn.textContent = '가입하기';
  }
});
