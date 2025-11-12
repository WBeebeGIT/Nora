(function () {
  // ------- Helpers -------
  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  // Toggle pills in a segmented control (single select)
  function makeSingleSelect(segEl, onChange) {
    segEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn || btn.disabled) return;
      $all('.pill', segEl).forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      onChange?.(btn.dataset.value);
    });
    return () => {
      const active = $all('.pill', segEl).find(b => b.getAttribute('aria-pressed') === 'true');
      return active ? active.dataset.value : null;
    };
  }

  // Toggle pills in a segmented control (multi select)
  function makeMultiSelect(segEl, onChange) {
    segEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn || btn.disabled) return;
      const state = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!state));
      onChange?.(getState());
    });
    const getState = () => {
      const out = {};
      $all('.pill', segEl).forEach(b => {
        const key = b.dataset.key;
        if (!key) return;
        out[key] = b.getAttribute('aria-pressed') === 'true';
      });
      return out;
    };
    return getState;
  }

  // Convert "YYYY-MM-DD" from <input type="date"> to "dd/MM/yyyy"
  function toDDMMYYYY(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  // ------- Wire controls -------
  const eventTypeVal = makeSingleSelect($('#eventTypeSeg'), validateReady);
  const hoursVal     = makeSingleSelect($('#hoursSeg'), validateReady);
  const locationVal  = makeSingleSelect($('#locationSeg'), validateReady);
  const addonsState  = makeMultiSelect($('#addonsSeg'), () => { /* no-op */ });

  const dateInput    = $('#eventDate');
  const btnGet       = $('#getQuoteBtn');
  const statusText   = $('#statusText');

  const quoteArea    = $('#quoteArea');
  const quoteLines   = $('#quoteLines');
  const quoteTotal   = $('#quoteTotal');

  dateInput.addEventListener('change', validateReady);

  function validateReady() {
    const ok = Boolean(eventTypeVal()) && Boolean(hoursVal()) && Boolean(dateInput.value);
    btnGet.disabled = !ok;
    if (!ok) {
      statusText.textContent = 'Select event type, hours, and date to calculate.';
    } else {
      statusText.textContent = '';
    }
  }

  // ------- Quote click -------
  btnGet.addEventListener('click', async () => {
    quoteArea.hidden = true;
    statusText.textContent = 'Great — calculating your quote…';

    const payload = {
      eventType: eventTypeVal(),                             // "Wedding", etc.
      eventDate: toDDMMYYYY(dateInput.value),               // dd/MM/yyyy
      hours: Number(hoursVal()),                            // 4, 6, 8, 10
      studioAsLead: true,                                   // follow policy
      locationType: locationVal(),                          // "local" | "travel_far"
      crew: {
        lead: 1,
        second: addonsState().secondShooter ? 1 : 0,
        audioTech: addonsState().audioTech ? 1 : 0
      },
      addons: {
        drone:       !!addonsState().drone,
        livestream:  !!addonsState().livestream,
        rush48:      !!addonsState().rush48,
        rush24:      !!addonsState().rush24,
        usb:         true // always included, pill is disabled+on
      }
    };

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = await res.json();

      if (typeof data.total !== 'number') {
        throw new Error('Backend did not return a numeric "total".');
      }

      // Render breakdown
      quoteLines.innerHTML = '';
      (data.breakdown || []).forEach(line => {
        const row = document.createElement('div');
        row.className = 'pair';
        row.innerHTML = `<span>${line.label}</span><span>$${Number(line.amount).toLocaleString()}</span>`;
        quoteLines.appendChild(row);
      });
      quoteTotal.textContent = `$${Number(data.total).toLocaleString()}`;

      quoteArea.hidden = false;
      statusText.textContent = '';
    } catch (err) {
      console.error(err);
      statusText.textContent = 'Hmm — I couldn’t complete the quote.';
    }
  });

  // Initialize UI
  validateReady();
})();
