// 견적서 발행 모듈

let quoteItems = [];
let quoteNumber = '';

const fmt = n => '₩' + Math.round(Number(n) || 0).toLocaleString('ko-KR');

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genQuoteNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `AEROC-${ymd}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function renderItemRows() {
  const container = document.getElementById('quoteItemRows');
  if (!container) return;

  container.innerHTML = quoteItems.map((item, i) => `
    <div class="qi-row" data-i="${i}">
      <input class="qi-name form-control" type="text" placeholder="항목명" value="${escHtml(item.name)}">
      <input class="qi-price form-control" type="number" placeholder="단가" value="${item.price || ''}">
      <input class="qi-qty form-control" type="number" placeholder="수량" value="${item.qty}" min="1">
      <span class="qi-amount">${fmt((item.price || 0) * (item.qty || 1))}</span>
      <button type="button" class="qi-del-btn" title="삭제"><i class='bx bx-trash'></i></button>
    </div>
  `).join('');

  container.querySelectorAll('.qi-row').forEach((row, i) => {
    row.querySelector('.qi-name').addEventListener('input', e => {
      quoteItems[i].name = e.target.value;
      updatePreview();
    });
    row.querySelector('.qi-price').addEventListener('input', e => {
      quoteItems[i].price = parseFloat(e.target.value) || 0;
      row.querySelector('.qi-amount').textContent = fmt(quoteItems[i].price * (quoteItems[i].qty || 1));
      updatePreview();
    });
    row.querySelector('.qi-qty').addEventListener('input', e => {
      quoteItems[i].qty = parseInt(e.target.value) || 1;
      row.querySelector('.qi-amount').textContent = fmt((quoteItems[i].price || 0) * quoteItems[i].qty);
      updatePreview();
    });
    row.querySelector('.qi-del-btn').addEventListener('click', () => {
      quoteItems.splice(i, 1);
      renderItemRows();
      updatePreview();
    });
  });
}

function updatePreview() {
  const company = document.getElementById('qfCompany')?.value || '';
  const project = document.getElementById('qfProject')?.value || '';
  const dateVal = document.getElementById('qfDate')?.value || '';

  const qdCompany = document.getElementById('qdCompany');
  if (qdCompany) qdCompany.textContent = company || '(업체명)';

  const qdNumber = document.getElementById('qdNumber');
  if (qdNumber) qdNumber.textContent = quoteNumber;

  const qdDate = document.getElementById('qdDate');
  if (qdDate) {
    qdDate.textContent = dateVal
      ? new Date(dateVal + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '-';
  }

  const projEl = document.getElementById('qdProject');
  if (projEl) projEl.textContent = project ? `프로젝트명: ${project}` : '';

  let subtotal = 0;
  const tbody = document.getElementById('qdItemsBody');
  if (tbody) {
    tbody.innerHTML = quoteItems.length
      ? quoteItems.map((item, i) => {
          const amount = (item.price || 0) * (item.qty || 1);
          subtotal += amount;
          return `<tr>
            <td class="td-no">${i + 1}</td>
            <td class="td-name">${escHtml(item.name) || '-'}</td>
            <td class="td-price">${fmt(item.price || 0)}</td>
            <td class="td-qty">${item.qty || 1}</td>
            <td class="td-amount">${fmt(amount)}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" class="qd-empty-row">항목을 추가해주세요</td></tr>';
  }

  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;
  const qdSubtotal = document.getElementById('qdSubtotal');
  const qdVat = document.getElementById('qdVat');
  const qdTotal = document.getElementById('qdTotal');
  if (qdSubtotal) qdSubtotal.textContent = fmt(subtotal);
  if (qdVat) qdVat.textContent = fmt(vat);
  if (qdTotal) qdTotal.textContent = fmt(total);
}

function resetQuoteForm(companyName = '') {
  const today = new Date().toISOString().slice(0, 10);
  const dateEl = document.getElementById('qfDate');
  const companyEl = document.getElementById('qfCompany');
  const projectEl = document.getElementById('qfProject');
  if (dateEl) dateEl.value = today;
  if (companyEl) companyEl.value = companyName;
  if (projectEl) projectEl.value = '';
  quoteItems = [{ name: '', price: 0, qty: 1 }];
  quoteNumber = genQuoteNumber();
  renderItemRows();
  updatePreview();
}

export function loadQuotePage() {
  const preset = sessionStorage.getItem('_quoteCompany');
  if (preset !== null) {
    resetQuoteForm(preset);
    sessionStorage.removeItem('_quoteCompany');
  } else {
    updatePreview();
  }
}

export function initQuote() {
  resetQuoteForm();

  document.getElementById('qfDate')?.addEventListener('input', updatePreview);
  document.getElementById('qfCompany')?.addEventListener('input', updatePreview);
  document.getElementById('qfProject')?.addEventListener('input', updatePreview);

  document.getElementById('addQuoteItemBtn')?.addEventListener('click', () => {
    quoteItems.push({ name: '', price: 0, qty: 1 });
    renderItemRows();
    updatePreview();
  });

  document.getElementById('quoteResetBtn')?.addEventListener('click', () => {
    if (!confirm('견적서를 초기화하시겠습니까?')) return;
    resetQuoteForm();
  });

  document.getElementById('quoteBackBtn')?.addEventListener('click', () => {
    window.location.hash = 'customers';
  });

  document.getElementById('quotePdfBtn')?.addEventListener('click', () => {
    if (typeof html2pdf === 'undefined') {
      alert('PDF 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    const company = document.getElementById('qfCompany')?.value.trim() || '견적서';
    const date = document.getElementById('qfDate')?.value || new Date().toISOString().slice(0, 10);
    const btn = document.getElementById('quotePdfBtn');
    btn.disabled = true;
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> 생성 중...";

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `견적서_${company}_${date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(document.getElementById('quoteDocument')).save()
      .then(() => {
        btn.disabled = false;
        btn.innerHTML = "<i class='bx bx-download'></i> PDF 다운로드";
      })
      .catch(() => {
        btn.disabled = false;
        btn.innerHTML = "<i class='bx bx-download'></i> PDF 다운로드";
        alert('PDF 생성 중 오류가 발생했습니다.');
      });
  });
}
