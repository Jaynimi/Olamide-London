// script.js
document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('phone');
  const phoneError = document.getElementById('phoneError');

  const decreaseBtn = document.getElementById('decrease');
  const increaseBtn = document.getElementById('increase');
  const entriesCountEl = document.getElementById('entriesCount');
  const totalPriceEl = document.getElementById('totalPrice');

  const terms = document.getElementById('terms');
  const termsError = document.getElementById('termsError');

  const form = document.getElementById('entryForm');
  const PRICE_PER_ENTRY = 500;

  // initial state
  let entries = 1;
  updateUI();

  // Helpers
  function formatNaira(amount) {
    return '₦' + amount.toLocaleString();
  }

  function updateUI() {
    entriesCountEl.textContent = entries;
    totalPriceEl.textContent = formatNaira(PRICE_PER_ENTRY * entries);
    decreaseBtn.disabled = entries <= 1;
  }

  // Entry controls
  decreaseBtn.addEventListener('click', () => {
    if (entries > 1) {
      entries -= 1;
      updateUI();
    }
  });

  increaseBtn.addEventListener('click', () => {
    entries += 1;
    updateUI();
  });

  /* ==========================
     PHONE INPUT: nigerian-only
     - visible input holds ONLY the 10 local digits (e.g. 8012345678)
     - prefix "+234" is added on submit (not editable)
     - handles paste of +234..., 0..., or raw 10-digit numbers
     - prevents non-digit typing and prevents typing past 10 digits
     ========================== */

  // Keep input to digits only and at most 10 digits (handles typing & paste)
  phoneInput.addEventListener('input', () => {
    phoneError.textContent = '';

    // strip non-digits
    let digits = (phoneInput.value || '').replace(/\D/g, '');

    // if user pasted something long like '+2348012345678' or '08012345678',
    // keep the last 10 digits (the local part)
    if (digits.length > 10) {
      digits = digits.slice(-10);
    }

    // show only the local 10-digit part
    phoneInput.value = digits;
  });

  // Optional UX improvement: block non-digit keys and prevent typing beyond 10 digits
  phoneInput.addEventListener('keydown', (ev) => {
    const allowed = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'
    ];
    if (allowed.includes(ev.key) || ev.ctrlKey || ev.metaKey) return;

    // allow digits only
    if (!/^\d$/.test(ev.key)) {
      ev.preventDefault();
      return;
    }

    // prevent typing beyond 10 digits
    const digits = (phoneInput.value || '').replace(/\D/g, '');
    if (digits.length >= 10) {
      ev.preventDefault();
    }
  });

  // Submit: validate local 10 digits then build the full +234 number
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    phoneError.textContent = '';
    termsError.textContent = '';

    const localDigits = (phoneInput.value || '').replace(/\D/g, '');
    let ok = true;

    // Validate exactly 10 digits
    if (!/^\d{10}$/.test(localDigits)) {
      phoneError.textContent = 'Enter your 10-digit Nigerian number (e.g. 8012345678).';
      ok = false;
      phoneInput.focus();
    }

    if (!terms.checked) {
      termsError.textContent = 'You must accept the terms and conditions to proceed.';
      ok = false;
      // don't steal focus if phone invalid
      if (ok) terms.focus();
    }

    if (!ok) return;

    // Build the full E.164-like phone number
    const fullPhone = '+234' + localDigits;

    const payload = {
      phone: fullPhone,
      entries,
      total: PRICE_PER_ENTRY * entries,
      acceptedTerms: true,
      timestamp: new Date().toISOString()
    };

    // Demo: show confirmation. Replace with your API call as needed.
    alert(`Entry submitted!\nPhone: ${payload.phone}\nEntries: ${payload.entries}\nTotal: ₦${payload.total.toLocaleString()}`);

    // OPTIONAL: uncomment if you want to reset form after successful submit
    // form.reset();
    // entries = 1;
    // updateUI();
  });
});
