/*  public/nora-chat.js
 *  Nora — Client UI (centered, open by default)
 *  - 4-hour minimum is enforced by the /api/quote backend.
 *  - No travel line item (removed from API).
 *  - Fix: prevent the “Got it” assistant message from firing on page load,
 *    browser autofill, or programmatic resets of the date picker.
 */

(function () {
  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") node.className = v;
      else if (k === "style") Object.assign(node.style, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return node;
  };

  const currency = (n) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // ---------- styles (white UI, shadow card) ----------
  const css = `
  :root { --bg:#fff; --text:#111; --muted:#6b7280; --muted-2:#9ca3af; --line:#e5e7eb; --chip:#f3f4f6; --chipA:#111; --chipBg:#f1f5f9; --brand:#111; }
  .nora-wrap { display:flex; justify-content:center; padding:48px 16px; background:#fff; color:var(--text); font: 16px/1.4 system-ui, -apple-system, Segoe UI, Roboto,Helvetica,Arial; }
  .nora-card { width:min(980px, 94vw); background:var(--bg); border:1px solid var(--line); border-radius:14px; box-shadow:0 10px 35px rgba(0,0,0,.08); padding:18px; }
  .nora-h1 { text-align:center; font-weight:800; font-size: clamp(26px, 3.2vw, 40px); margin: 4px 0 2px; }
  .nora-sub { text-align:center; color:var(--muted); margin: 0 0 18px; }
  .nora-row { display:grid; grid-template-columns: 1fr; gap:14px; margin-top:8px; }
  @media (min-width: 720px){ .nora-row.two { grid-template-columns:1fr 1fr; } }
  .nora-msg { background:#f6f7f9; border:1px solid var(--line); border-radius:10px; padding:10px 12px; color:#0f172a; }
  .nora-label { font-weight:600; margin:14px 0 6px; }
  .nora-input, .nora-input[type="date"]{ width:100%; border:1px solid var(--line); border-radius:10px; padding:12px 12px; font-size:15px; background:#fff; color:var(--text); }
  .nora-chips { display:flex; flex-wrap:wrap; gap:10px; }
  .nora-chip { appearance:none; border:1px solid var(--line); background:var(--chip); color:#111; border-radius:999px; padding:9px 14px; cursor:pointer; font-weight:600; }
  .nora-chip.active { background:#111; color:#fff; }
  .nora-log { margin-top:14px; display:flex; gap:8px; }
  .nora-text { flex:1; border:1px solid var(--line); border-radius:10px; padding:11px 12px; }
  .nora-btn { background:#111; color:#fff; border:0; border-radius:10px; padding:10px 14px; font-weight:700; cursor:pointer; }
  .nora-quote { margin-top:18px; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .nora-qrow { display:flex; justify-content:space-between; padding:10px 12px; border-top:1px solid var(--line); }
  .nora-qrow:first-child{ border-top:0; }
  .nora-qmuted { color: var(--muted-2); }
  `;
  const styleTag = el("style", {}, css);
  document.head.appendChild(styleTag);

  // ---------- DOM ----------
  const wrap = el("div", { class: "nora-wrap" });
  const card = el("div", { class: "nora-card" });
  const title = el("div", { class: "nora-h1" }, "Ask Nora for a Quote");
  const sub = el("div", { class: "nora-sub" }, "Our AI assistant can generate instant videography quotes for your clients.");

  const chatArea = el("div");
  const m1 = el("div", { class: "nora-msg" }, "Hi! I’m Nora. I’ll get you a quick quote in a few taps.");
  const m2 = el("div", { class: "nora-msg", id: "nora-prompt-when" },
    "Hi. I’m Nora. What’s your event date and location? You can also tap add-ons below and I’ll calculate instantly."
  );

  // Inputs
  const rowTop = el("div", { class: "nora-row two" });
  const dateInput = el("input", {
    class: "nora-input",
    type: "date",
    placeholder: "dd/MM/yyyy",
    autocomplete: "off",
    inputmode: "none"
  });
  const locInput = el("input", {
    class: "nora-input",
    type: "text",
    placeholder: "Where is your event located? (city or ZIP)",
    autocomplete: "off"
  });
  rowTop.append(
    el("div", {}, el("div", { class: "nora-label" }, "What is your event date?"), dateInput),
    el("div", {}, el("div", { class: "nora-label" }, "Where is your event located?"), locInput)
  );

  const hoursLabel = el("div", { class: "nora-label" }, "Video Coverage — hours (4-hour minimum)");
  const hoursBar = el("div", { class: "nora-chips" });
  const hourOptions = [4, 6, 8, 10];
  const hourButtons = hourOptions.map(h =>
    el("button", { class: "nora-chip", "data-h": String(h) }, String(h))
  );
  hourButtons[0].classList.add("active");
  hourButtons.forEach(btn => hoursBar.appendChild(btn));

  const addonsLabel = el("div", { class: "nora-label" }, "Videography add-ons");
  const addonsBar = el("div", { class: "nora-chips" });
  const addonDefs = [
    ["drone", "Drone"],
    ["livestream", "Livestream"],
    ["rush48", "Rush 48 hr"],
    ["rush24", "Rush 24 hr"],
    ["usb", "USB Raw Footage Drive"]
  ];
  const addonButtons = addonDefs.map(([key, label]) =>
    el("button", { class: "nora-chip", "data-k": key }, label)
  );
  addonButtons.forEach(b => addonsBar.appendChild(b));

  const postLabel = el("div", { class: "nora-label" }, "Post-Production");
  const postBar = el("div", { class: "nora-chips" });
  const postDefs = [
    ["social", "Social Media Edit"],
    ["studio", "Highlights – (Studio Edit)"],
    ["clientDirected", "Highlights – (Client-Directed)"],
    ["fullProgram", "Full Program Edit"]
  ];
  const postButtons = postDefs.map(([k, label]) =>
    el("button", { class: "nora-chip", "data-k": k }, label)
  );
  postButtons.forEach(b => postBar.appendChild(b));

  // message input (not used for free-text yet, but keeps visual chat feel)
  const logRow = el("div", { class: "nora-log" });
  const freeText = el("input", { class: "nora-text", type: "text", placeholder: "Type here…" });
  const sendBtn = el("button", { class: "nora-btn" }, "Send");
  logRow.append(freeText, sendBtn);

  // Quote box
  const quoteBox = el("div", { class: "nora-quote", id: "nora-quote" });

  chatArea.append(m1, m2, rowTop, hoursLabel, hoursBar, addonsLabel, addonsBar, postLabel, postBar, logRow, quoteBox);
  card.append(title, sub, chatArea);
  wrap.append(card);
  document.body.appendChild(wrap);

  // ---------- state ----------
  const state = {
    hours: 4,
    addons: {},         // {drone:true, ...}
    userTouchedDate: false // prevents “Got it” until distinct user action
  };

  // Make chips toggleable
  function setHours(h) {
    state.hours = h;
    hourButtons.forEach(b => b.classList.toggle("active", Number(b.dataset.h) === h));
    announceUpdate();
    calculate();
  }

  function toggleAddon(key, btn) {
    state.addons[key] = !state.addons[key];
    btn.classList.toggle("active", !!state.addons[key]);
    announceUpdate();
    calculate();
  }

  hourButtons.forEach(b =>
    b.addEventListener("click", () => setHours(Number(b.dataset.h)))
  );
  [...addonButtons, ...postButtons].forEach(b =>
    b.addEventListener("click", () => toggleAddon(b.dataset.k, b))
  );

  // ---------- Prevent false “Got it” on refresh / autofill ----------
  // We: (1) clear any remembered value shortly after load,
  //     (2) only react to date when the user actually interacts.
  // (1) Clear possible autofill after paint:
  setTimeout(() => {
    // If the browser prefilled a date, clear it silently.
    if (dateInput.value) dateInput.value = "";
  }, 0);

  // (2) Mark that the user interacted (focus or pointer).
  ["pointerdown", "keydown", "focus"].forEach(evt => {
    dateInput.addEventListener(evt, () => { state.userTouchedDate = true; }, { once: true, passive: true });
  });

  // Only when the user changed it *and* we know they touched the field, show “Got it”.
  dateInput.addEventListener("change", (e) => {
    if (!state.userTouchedDate) return; // ignore programmatic/auto changes
    if (!dateInput.value) return;       // ignore clearing
    pushAssistant("Got it. What city or ZIP is the event in?");
  });

  // Basic “chat” output (assistant only for now)
  function pushAssistant(text) {
    const bubble = el("div", { class: "nora-msg" }, text);
    // insert before inputs so history stays above
    card.insertBefore(bubble, rowTop);
  }

  function announceUpdate() {
    const note = el("div", { class: "nora-msg nora-qmuted" }, "Updated your quote with the latest selections.");
    card.insertBefore(note, hoursLabel);
  }

  // ---------- Quote calculation ----------
  async function calculate() {
    try {
      const payload = {
        state: {
          hours: state.hours,
          addons: state.addons
        }
      };
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to get quote");
      renderQuote(data.quote);
    } catch (err) {
      renderError(String(err.message || err));
    }
  }

  function renderQuote(quote) {
    quoteBox.innerHTML = "";
    const header = el("div", { class: "nora-qrow" }, el("div", { class: "nora-qmuted" }, "Quote Summary"));
    quoteBox.appendChild(header);

    for (const li of quote.lineItems) {
      quoteBox.appendChild(el("div", { class: "nora-qrow" },
        el("div", {}, li.label),
        el("div", {}, currency(Number(li.price) || 0))
      ));
    }
    quoteBox.appendChild(el("div", { class: "nora-qrow" },
      el("div", { style: { fontWeight: "700" } }, "Total"),
      el("div", { style: { fontWeight: "700" } }, currency(quote.total))
    ));
  }

  function renderError(msg) {
    quoteBox.innerHTML = "";
    quoteBox.appendChild(el("div", { class: "nora-qrow" },
      el("div", {}, "Hmm — I couldn’t complete the quote."),
      el("div", { class: "nora-qmuted" }, msg)
    ));
  }

  // Initial computation (defaults: 4 hrs, no add-ons)
  calculate();

  // Optional “Send” click — currently no-op but keeps the feel of a chat input.
  sendBtn.addEventListener("click", () => {
    if (!freeText.value.trim()) return;
    pushAssistant("Thanks — noted.");
    freeText.value = "";
  });
})();
