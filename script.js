// script.js
document.addEventListener('DOMContentLoaded', () => {
  const PRICE_PER_ENTRY = 500;

  // Elements (may be null depending on page)
  const phoneInput = document.getElementById('phone');
  const phoneError = document.getElementById('phoneError');

  const decreaseBtn = document.getElementById('decrease');
  const increaseBtn = document.getElementById('increase');
  const entriesCountEl = document.getElementById('entriesCount');
  const totalPriceEl = document.getElementById('totalPrice');

  const terms = document.getElementById('terms');
  const termsError = document.getElementById('termsError');

  const form = document.getElementById('entryForm');

  // Modal elements
  const modal = document.getElementById('termsModal');
  const openBtn = document.getElementById('openTerms');
  const closeBtn = document.getElementById('closeModal');
  const modalContent = document.getElementById('termsContent');

  // Success page elements (on success.html)
  const entriesSuccessEl = document.getElementById('entriesCountSuccess');
  const totalPriceSuccessEl = document.getElementById('totalPriceSuccess');
  const playAgainBtn = document.getElementById('playAgain');

  // ---- initial state for form page ----
  let entries = 1;
  updateUI();

  // ---- helpers ----
  function formatNaira(amount) {
    return '₦' + amount.toLocaleString();
  }

  function updateUI() {
    if (entriesCountEl) entriesCountEl.textContent = entries;
    if (totalPriceEl) totalPriceEl.textContent = formatNaira(PRICE_PER_ENTRY * entries);
    if (decreaseBtn) decreaseBtn.disabled = entries <= 1;
  }

  // localStorage map helpers
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

  // Migration: if the app previously stored legacy keys (entries + phone) but map is empty,
  // migrate that single session into entriesByPhone so old data isn't lost.
  (function migrateLegacyIfNeeded() {
    try {
      const map = loadEntriesMap();
      const isMapEmpty = Object.keys(map).length === 0;
      const legacyPhone = localStorage.getItem('phone'); // older flows may have saved phone
      const legacyEntries = localStorage.getItem('entries');

      if (isMapEmpty && legacyPhone && legacyEntries) {
        const num = Number(legacyEntries) || 0;
        if (num > 0) {
          map[legacyPhone] = (Number(map[legacyPhone] || 0) + num);
          saveEntriesMap(map);
          // remove legacy keys to avoid confusion going forward
          try { localStorage.removeItem('entries'); localStorage.removeItem('total'); } catch (_) {}
          console.info('Migrated legacy entries into entriesByPhone for', legacyPhone);
        }
      }
    } catch (err) {
      // non-fatal
      console.warn('Migration check failed', err);
    }
  })();

  // ---- Form page logic (index.html) ----
  if (form) {
    // Entry buttons
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        if (entries > 1) {
          entries -= 1;
          updateUI();
        }
      });
    }
    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        entries += 1;
        updateUI();
      });
    }

    // Phone input handling
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
        if (!/^\d$/.test(ev.key)) {
          ev.preventDefault();
          return;
        }
        const digits = (phoneInput.value || '').replace(/\D/g, '');
        if (digits.length >= 10) ev.preventDefault();
      });
    }

    // Submit handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (phoneError) phoneError.textContent = '';
      if (termsError) termsError.textContent = '';

      const localDigits = (phoneInput?.value || '').replace(/\D/g, '');
      let ok = true;
      if (!/^\d{10}$/.test(localDigits)) {
        if (phoneError) phoneError.textContent = 'Enter your 10-digit Nigerian number (e.g. 8012345678).';
        ok = false;
        phoneInput?.focus();
      }
      if (!terms || !terms.checked) {
        if (termsError) termsError.textContent = 'You must accept the terms and conditions to proceed.';
        ok = false;
      }
      if (!ok) return;

      const fullPhone = '+234' + localDigits;
      const sessionEntries = Number(entries);
      const sessionTotal = PRICE_PER_ENTRY * sessionEntries;

      try {
        // Increment the per-phone cumulative map
        const cumulativeEntries = incrementEntriesForPhone(fullPhone, sessionEntries);

        // Save references for success page
        localStorage.setItem('lastPhone', fullPhone);
        localStorage.setItem('lastSessionEntries', String(sessionEntries));
        localStorage.setItem('lastSessionTotal', String(sessionTotal));

        // IMPORTANT: do NOT write legacy 'entries' / 'total' keys here (they hide cumulative totals)
        // Redirect to success
        window.location.assign('success.html');
      } catch (err) {
        console.error('Storage/redirect error', err);
        // fallback to query params for the redirect
        const params = new URLSearchParams({
          phone: fullPhone,
          entries: String(sessionEntries),
          total: String(sessionTotal)
        });
        window.location.assign(`success.html?${params.toString()}`);
      }
    });
  }

  // ---- Modal logic (works on both pages if modal present) ----
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

  // ---- Success page logic (success.html) ----
  if (entriesSuccessEl || totalPriceSuccessEl || playAgainBtn) {
    (function populateSuccess() {
      const lastPhone = localStorage.getItem('lastPhone');
      const map = loadEntriesMap();

      // fallback query params
      const params = new URLSearchParams(window.location.search);
      const queryPhone = params.get('phone');
      const queryEntries = params.has('entries') ? Number(params.get('entries')) : null;
      const queryTotal = params.has('total') ? Number(params.get('total')) : null;

      let displayEntries = 0;
      let displayTotal = 0;

      // Prefer cumulative per-phone map ALWAYS when available
      if (lastPhone && map[lastPhone] != null) {
        displayEntries = Number(map[lastPhone]);
        displayTotal = displayEntries * PRICE_PER_ENTRY;
      } else if (queryPhone && map[queryPhone] != null) {
        displayEntries = Number(map[queryPhone]);
        displayTotal = displayEntries * PRICE_PER_ENTRY;
      } else if (queryEntries != null) {
        // fallback if redirected with query params
        displayEntries = queryEntries;
        displayTotal = queryTotal != null ? queryTotal : (displayEntries * PRICE_PER_ENTRY);
      } else {
        // final fallback to lastSession or legacy keys (only used if map missing)
        const sessionEntries = Number(localStorage.getItem('lastSessionEntries') || 0);
        const sessionTotal = Number(localStorage.getItem('lastSessionTotal') || (sessionEntries * PRICE_PER_ENTRY));
        displayEntries = sessionEntries;
        displayTotal = sessionTotal;
      }

      // Populate DOM. totalPriceSuccessEl expects numeric-only (currency symbol outside)
      if (entriesSuccessEl) entriesSuccessEl.textContent = String(displayEntries || 0);
      if (totalPriceSuccessEl) {
        const t = Number(displayTotal);
        totalPriceSuccessEl.textContent = isNaN(t) ? String(displayTotal || 0) : t.toLocaleString();
      }

      // Play again click
      if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
          // Optionally clear session-only values here if you'd like:
          // localStorage.removeItem('lastSessionEntries'); localStorage.removeItem('lastSessionTotal');
          window.location.href = 'index.html';
        });
      }
    })();
  }
});
