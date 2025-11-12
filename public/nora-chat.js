(function () {
  const opt = Object.assign({
    mount: '#nora-chat',
    theme: 'light',
    bubble: false,
    open: true,
    hideHeader: true,
    dateFormat: 'dd/MM/yyyy'
  }, (window.NORA_OPTIONS || {}));

  // find mount
  const root = document.querySelector(opt.mount);
  if (!root) {
    console.warn('[Nora] mount selector not found:', opt.mount);
    return;
  }

  // wipe anything pre-existing in case of hot reloads
  root.innerHTML = '';

  // styles scoped to this widget
  const style = document.createElement('style');
  style.textContent = `
    .nora-wrap{position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;color:#111}
    .nora-header{display:${opt.hideHeader ? 'none':'flex'};align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eee}
    .nora-body{flex:1;overflow:auto;padding:16px}
    .nora-row{margin-bottom:10px}
    .nora-row input[type="text"]{
      width:100%;max-width:640px;height:40px;border:1px solid #ddd;border-radius:8px;padding:0 12px;font:inherit;color:#111;background:#fff;
    }
    .nora-row .pill{
      display:inline-block;border:1px solid #ddd;border-radius:999px;padding:6px 10px;margin-right:8px;margin-top:6px;cursor:pointer;
      color:#111;background:#fff;user-select:none;
    }
    .pill.active{border-color:#111;background:#111;color:#fff}
    .nora-button{
      height:40px;border:none;border-radius:10px;background:#111;color:#fff;padding:0 14px;cursor:pointer;
    }
    .nora-bubble,.nora-floating{display:none!important}
    .nora-note{color:#555;font-size:13px;margin-top:6px}
    .nora-msg{background:#f6f7f8;border:1px solid #e9eaec;border-radius:10px;padding:10px 12px;margin:8px 0;max-width:680px}
  `;
  root.appendChild(style);

  // widget skeleton
  const wrap = document.createElement('div');
  wrap.className = 'nora-wrap';
  wrap.innerHTML = `
    <div class="nora-header">
      <strong>Nora — Cinematic Videographers</strong>
    </div>
    <div class="nora-body">
      <div class="nora-msg">Hi! I’m Nora. I’ll get you a quick quote in a few taps.</div>

      <div class="nora-row">
        <div class="nora-msg">What type of event is this? (Corporate, Wedding, Mitzvah, Other)</div>
        <div class="nora-pills">
          <span class="pill" data-v="Corporate">Corporate</span>
          <span class="pill" data-v="Wedding">Wedding</span>
          <span class="pill" data-v="Mitzvah">Mitzvah</span>
          <span class="pill" data-v="Other">Other</span>
        </div>
      </div>

      <div class="nora-row">
        <input id="nora-date" type="text" placeholder="${opt.dateFormat}">
        <div class="nora-note">Event date (format: ${opt.dateFormat})</div>
      </div>

      <div class="nora-row">
        <button class="nora-button" id="nora-quote">Get Quote</button>
      </div>

      <div id="nora-output" style="margin-top:10px;"></div>
    </div>
  `;
  root.appendChild(wrap);

  // behavior
  let eventType = null;
  const pills = wrap.querySelectorAll('.pill');
  pills.forEach(p => {
    p.addEventListener('click', () => {
      pills.forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      eventType = p.getAttribute('data-v');
    });
  });

  // send to your quote API
  const out = wrap.querySelector('#nora-output');
  const btn = wrap.querySelector('#nora-quote');
  const dateEl = wrap.querySelector('#nora-date');

  const show = (txt) => {
    const d = document.createElement('div');
    d.className = 'nora-msg';
    d.textContent = txt;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  };

  btn.addEventListener('click', async () => {
    const dateRaw = (dateEl.value || '').trim();
    if (!eventType) return show('Please choose an event type first.');
    if (!dateRaw) return show('Please enter the event date (dd/mm/yyyy).');

    // normalize dd/mm/yyyy to ISO for backend, but keep dd/mm/yyyy UX
    let isoDate = null;
    const m = dateRaw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m) {
      const [_, dd, mm, yyyy] = m;
      isoDate = `${yyyy}-${mm}-${dd}`;
    } else {
      return show('Date must be in dd/mm/yyyy format.');
    }

    show('Great — calculating your quote...');
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: eventType, date: isoDate })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Quote failed');

      // Expect { total, breakdown } etc. Adjust to your API.
      if (data?.total) {
        show(`Total Quote: $${Number(data.total).toLocaleString()}`);
        if (data?.note) show(String(data.note));
      } else {
        show('Quote ready. (Backend did not return a "total" field.)');
      }
    } catch (e) {
      show(`Error: ${e.message}`);
    }
  });

  // no float bubble — hard kill anything injected by previous versions
  const nukeBubble = () => {
    document.querySelectorAll(
      '.nora-bubble,[data-nora-bubble],[class*="bubble"],div[style*="position: fixed"][style*="bottom"][style*="right"]'
    ).forEach(n => n.remove());
  };
  new MutationObserver(nukeBubble).observe(document.documentElement, { childList:true, subtree:true });
  nukeBubble();
})();
