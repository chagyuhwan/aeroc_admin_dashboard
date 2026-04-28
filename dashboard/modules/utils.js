// 공통 유틸리티

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

export function formatWon(amount) {
  if (!amount || amount === 0) return '₩0';
  if (amount >= 100000000) return `₩${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `₩${Math.round(amount / 10000).toLocaleString()}만`;
  return `₩${Math.round(amount).toLocaleString()}`;
}

export function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (/^01[0-9]/.test(digits)) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
