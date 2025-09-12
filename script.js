// script.js
document.addEventListener('DOMContentLoaded', () => {
  const PRICE_PER_ENTRY = 500;

  // ----- Common element references (may be null depending on page) -----
  const phoneInput = document.getElementById('phone');
  const phoneError = document.getElementById('phoneError');

  const decreaseBtn = document.getElementById('decrease');
  const increaseBtn = document.getElementById('increase');
  const entriesCountEl = document.getElementById('entriesCount');
  const totalPriceEl = document.getElementById('totalPrice');

  const terms = document.getElementById('terms');
  const termsError = document.getElementById('termsError');

  const form = document.getElementById('entryForm');

  // Modal
  const modal = document.getElementById('termsModal');
  const openBtn = document.getElementById('openTerms');
  const closeBtn = document.getElementById('closeModal');
  const modalContent = document.getElementById('termsContent');

  // Success page elements
  const entriesSuccessEl = document.getElementById('entriesCountSuccess');
  const totalPriceSuccessEl = document.getElementById('totalPriceSuccess');
  const playAgainBtn = document.getElementById('playAgain');

  // ----- Form initial state -----
  let entries = 1;
  updateUI();

  // ----- Toast (top-right) utilities using #toast-container -----
  let toastTimer = null;
  function buildToastContainer() {
    let container = document.getElementById('toast-container');
    if (container) return container;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'assertive');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    return container;
  }

  function showToast(messages = [], title = '') {
    if (!Array.isArray(messages) || messages.length === 0) return;
    const container = buildToastContainer();

    // Option: clear previous toasts so only one visible at once
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');

    // optional title
    if (title) {
      const h = document.createElement('h4');
      h.textContent = title;
      toast.appendChild(h);
    }

    const ul = document.createElement('ul');
    messages.forEach(msg => {
      const li = document.createElement('li');
      li.textContent = msg;
      ul.appendChild(li);
    });
    toast.appendChild(ul);

    // close button (small "x")
    const closeBtnToast = document.createElement('button');
    closeBtnToast.className = 'close-toast';
    closeBtnToast.setAttribute('aria-label', 'Dismiss');
    closeBtnToast.innerHTML = '&times;';
    closeBtnToast.style.position = 'absolute';
    closeBtnToast.style.top = '8px';
    closeBtnToast.style.right = '10px';
    closeBtnToast.style.background = 'transparent';
    closeBtnToast.style.border = 'none';
    closeBtnToast.style.color = '#fff';
    closeBtnToast.style.fontSize = '18px';
    closeBtnToast.style.cursor = 'pointer';
    closeBtnToast.addEventListener('click', () => {
      if (container && toast.parentNode === container) container.removeChild(toast);
      if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    });
    toast.appendChild(closeBtnToast);

    // ensure toast has relative positioning for the close button
    toast.style.position = 'relative';

    container.appendChild(toast);

    // auto-dismiss after 5s
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastTimer = setTimeout(() => {
      if (container && toast.parentNode === container) container.removeChild(toast);
      toastTimer = null;
    }, 5000);
  }

  // ----- Helpers -----
  function formatNaira(amount) {
    return '₦' + amount.toLocaleString();
  }

  function updateUI() {
    if (entriesCountEl) entriesCountEl.textContent = entries;
    if (totalPriceEl) totalPriceEl.textContent = formatNaira(PRICE_PER_ENTRY * entries);
    if (decreaseBtn) decreaseBtn.disabled = entries <= 1;
  }

  // ----- Persistent per-phone storage helpers -----
  function loadEntriesMap() {
    try {
      const raw = localStorage.getItem('entriesByPhone');
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn('Failed to parse entriesByPhone', err);
      return {};
    }
  }

  function saveEntriesMap(map) {
    try {
      localStorage.setItem('entriesByPhone', JSON.stringify(map));
      return true;
    } catch (err) {
      console.warn('Failed to save entriesByPhone', err);
      return false;
    }
  }

  function incrementEntriesForPhone(phone, amount) {
    const map = loadEntriesMap();
    const prev = Number(map[phone] || 0);
    const next = prev + Number(amount);
    map[phone] = next;
    saveEntriesMap(map);
    return next;
  }

  // ----- Migration: move legacy single-session keys into map if needed -----
  (function migrateLegacyIfNeeded() {
    try {
      const map = loadEntriesMap();
      const isMapEmpty = Object.keys(map).length === 0;
      const legacyPhone = localStorage.getItem('phone'); // older flows maybe used this
      const legacyEntries = localStorage.getItem('entries');

      if (isMapEmpty && legacyPhone && legacyEntries) {
        const num = Number(legacyEntries) || 0;
        if (num > 0) {
          map[legacyPhone] = (Number(map[legacyPhone] || 0) + num);
          saveEntriesMap(map);
          try { localStorage.removeItem('entries'); localStorage.removeItem('total'); } catch (_) {}
          console.info('Migrated legacy entries into entriesByPhone for', legacyPhone);
        }
      }
    } catch (err) {
      console.warn('Migration check failed', err);
    }
  })();

  // ----- Form page logic (index.html) -----
  if (form) {
    // entry increment/decrement
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        if (entries > 1) { entries -= 1; updateUI(); }
      });
    }
    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        entries += 1;
        updateUI();
      });
    }

    // phone input sanitation / length limit
    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        if (phoneError) phoneError.textContent = '';
        let digits = (phoneInput.value || '').replace(/\D/g, '');
        if (digits.length > 10) digits = digits.slice(-10);
        phoneInput.value = digits;
      });

      phoneInput.addEventListener('keydown', (ev) => {
        const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowed.includes(ev.key) || ev.ctrlKey || ev.metaKey) return;
        if (!/^\d$/.test(ev.key)) { ev.preventDefault(); return; }
        const digits = (phoneInput.value || '').replace(/\D/g, '');
        if (digits.length >= 10) ev.preventDefault();
      });
    }

    // submit with toast errors and cumulative storage
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // clear inline errors (we keep them for accessibility if you want)
      if (phoneError) phoneError.textContent = '';
      if (termsError) termsError.textContent = '';

      const errors = [];
      const localDigits = (phoneInput?.value || '').replace(/\D/g, '');

      // validation
      if (!/^\d{10}$/.test(localDigits)) {
        errors.push('Enter your 10-digit Nigerian number (e.g. 8012345678).');
      }
      if (!terms || !terms.checked) {
        errors.push('You must accept the terms and conditions to proceed.');
      }

      if (errors.length > 0) {
        // show one toast with all errors
        showToast(errors, 'Please fix the following:');
        // focus first invalid control
        if (!/^\d{10}$/.test(localDigits) && phoneInput) phoneInput.focus();
        else if (terms && !terms.checked) terms.focus();
        return;
      }

      // all good: record entries and redirect
      const fullPhone = '+234' + localDigits;
      const sessionEntries = Number(entries);
      const sessionTotal = PRICE_PER_ENTRY * sessionEntries;

      try {
        const cumulative = incrementEntriesForPhone(fullPhone, sessionEntries);
        localStorage.setItem('lastPhone', fullPhone);
        localStorage.setItem('lastSessionEntries', String(sessionEntries));
        localStorage.setItem('lastSessionTotal', String(sessionTotal));
        console.info('Recorded session', { phone: fullPhone, sessionEntries, cumulative });

        // redirect to success page
        window.location.assign('success.html');
      } catch (err) {
        console.error('Storage/redirect error', err);
        const params = new URLSearchParams({
          phone: fullPhone,
          entries: String(sessionEntries),
          total: String(sessionTotal)
        });
        window.location.assign(`success.html?${params.toString()}`);
      }
    });
  } // end form block

  // ----- Modal logic (works on any page with modal elements) -----
  function openModal() {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    if (modalContent?.focus) modalContent.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.classList.remove('no-scroll');
    if (openBtn) openBtn.focus();
  }
  if (openBtn) openBtn.addEventListener('click', (ev) => { ev.preventDefault(); openModal(); });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  window.addEventListener('click', (ev) => { if (ev.target === modal) closeModal(); });
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && modal && modal.style.display === 'flex') closeModal(); });

  // ----- Success page logic (success.html) -----
  if (entriesSuccessEl || totalPriceSuccessEl || playAgainBtn) {
    (function populateSuccess() {
      const lastPhone = localStorage.getItem('lastPhone');
      const map = loadEntriesMap();

      // fallback query params
      const params = new URLSearchParams(window.location.search);
      const qPhone = params.get('phone');
      const qEntries = params.has('entries') ? Number(params.get('entries')) : null;
      const qTotal = params.has('total') ? Number(params.get('total')) : null;

      let displayEntries = 0;
      let displayTotal = 0;

      if (lastPhone && map[lastPhone] != null) {
        displayEntries = Number(map[lastPhone]);
        displayTotal = displayEntries * PRICE_PER_ENTRY;
      } else if (qPhone && map[qPhone] != null) {
        displayEntries = Number(map[qPhone]);
        displayTotal = displayEntries * PRICE_PER_ENTRY;
      } else if (qEntries != null) {
        displayEntries = qEntries;
        displayTotal = qTotal != null ? qTotal : (displayEntries * PRICE_PER_ENTRY);
      } else {
        const sEntries = Number(localStorage.getItem('lastSessionEntries') || 0);
        const sTotal = Number(localStorage.getItem('lastSessionTotal') || (sEntries * PRICE_PER_ENTRY));
        displayEntries = sEntries;
        displayTotal = sTotal;
      }

      if (entriesSuccessEl) entriesSuccessEl.textContent = String(displayEntries || 0);
      if (totalPriceSuccessEl) {
        const t = Number(displayTotal);
        totalPriceSuccessEl.textContent = isNaN(t) ? String(displayTotal || 0) : t.toLocaleString();
      }

      if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
          // optional: clear session-only keys if desired
          // localStorage.removeItem('lastSessionEntries'); localStorage.removeItem('lastSessionTotal');
          window.location.href = 'index.html';
        });
      }
    })();
  }
});
