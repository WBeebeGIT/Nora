/* Nora Chat – Embedded, no bubble, auto-open, centered in #nora-host
   - Renders a clean chat window inside a card host
   - No floating bubble
   - Uses dd/mm/yyyy for date placeholder
   - Calls /api/nora (general chat) and /api/quote (when user taps “Get Quote”)
   - Minimal vanilla JS, no dependencies
*/

(function () {
  // ---------- CONFIG ----------
  const CONFIG = {
    title: "Nora — Cinematic Videographers",
    logoSrc: "/assets/cv-logo.png",      // <-- upload logo here: /public/assets/cv-logo.png
    hostId: "nora-host",                 // container in your HTML
    theme: {
      bg: "#0f1720",        // page bg (in case host is full-screen)
      panel: "#111a22",     // card bg
      header: "#0b1218",    // chat header bg
      text: "#d8e1e8",
      subtext: "#9fb0bb",
      input: "#0f1820",
      primary: "#101820",
      border: "rgba(255,255,255,0.06)",
      accent: "#c6f6d5"
    },
    // API endpoints (already in your repo from earlier steps)
    endpoints: {
      chat: "/api/nora",
      quote: "/api/quote"
    },
    datePlaceholder: "dd/mm/yyyy"
  };

  // ---------- UTIL ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const el = (tag, props = {}, ...children) => {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === "style") Object.assign(n.style, v);
      else if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    children.forEach(c => (typeof c === "string" ? n.appendChild(document.createTextNode(c)) : c && n.appendChild(c)));
    return n;
  };

  const fmtDateToDMY = (value) => {
    // Accepts many forms and normalizes to dd/mm/yyyy
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  // ---------- STYLES ----------
  const css = `
  :root {
    --bg:${CONFIG.theme.bg};
    --panel:${CONFIG.theme.panel};
    --header:${CONFIG.theme.header};
    --text:${CONFIG.theme.text};
    --subtext:${CONFIG.theme.subtext};
    --input:${CONFIG.theme.input};
    --border:${CONFIG.theme.border};
  }
  #${CONFIG.hostId} {
    position: relative;
    width: min(1100px, 92vw);
    height: clamp(520px, 70vh, 760px);
    margin: 0 auto;
    border-radius: 14px;
    background: var(--panel);
    box-shadow: 0 30px 80px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .nora-wrap {
    position:absolute; inset:0; display:flex; flex-direction:column;
  }
  .nora-head {
    display:flex; align-items:center; gap:.75rem;
    padding: .9rem 1.1rem;
    background: var(--header);
    color: var(--text);
    border-bottom: 1px solid var(--border);
  }
  .nora-head img { height:18px; width:auto; opacity:.9; }
  .nora-head .title { font-weight:600; letter-spacing:.2px; }
  .nora-body {
    flex:1; overflow:auto; padding: 1rem;
    background: radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,.04), transparent 60%);
  }
  .nora-msg {
    max-width: 78%;
    border-radius: 12px;
    padding: .75rem .9rem;
    margin: .3rem 0;
    line-height: 1.4;
    word-break: break-word;
    border:1px solid var(--border);
    background: #0e151b;
    color: var(--text);
  }
  .nora-msg.user { margin-left:auto; background:#16212a; }
  .nora-actions { display:flex; flex-wrap:wrap; gap:.5rem; margin:.4rem 0 .6rem; }
  .nora-chip {
    border:1px solid var(--border);
    background:#0f1820; color:var(--text);
    padding:.45rem .7rem; font-size:.9rem; border-radius: 999px; cursor:pointer;
  }
  .nora-input {
    display:flex; gap:.6rem; padding: .9rem; border-top:1px solid var(--border); background: var(--panel);
  }
  .nora-input input[type="text"] {
    flex:1; background: var(--input); color: var(--text);
    border:1px solid var(--border); border-radius: 10px;
    padding:.7rem .9rem; outline:none;
  }
  .nora-input button {
    background:#0d1117; color:#e7eef6;
    border:1px solid var(--border);
    padding:.7rem 1rem; border-radius:10px; cursor:pointer;
  }
  `;

  function injectStyles() {
    if ($("#nora-style")) return;
    document.head.appendChild(el("style", { id: "nora-style" }, css));
  }

  // ---------- VIEW ----------
  function buildUI(host) {
    host.innerHTML = "";
    const wrap = el("div", { class: "nora-wrap" });

    const head = el("div", { class: "nora-head" },
      CONFIG.logoSrc ? el("img", { src: CONFIG.logoSrc, alt: "Cinematic Videographers" }) : null,
      el("div", { class: "title" }, CONFIG.title)
    );

    const body = el("div", { class: "nora-body" });
    const input = el("div", { class: "nora-input" },
      el("input", {
        type: "text",
        placeholder: CONFIG.datePlaceholder, // default placeholder; we’ll swap text as needed
        id: "nora-text"
      }),
      el("button", { id: "nora-send" }, "Send")
    );

    wrap.append(head, body, input);
    host.appendChild(wrap);

    return { body, inputEl: $("#nora-text", wrap), sendBtn: $("#nora-send", wrap) };
  }

  function msgNode(txt, who = "bot") {
    return el("div", { class: `nora-msg ${who === "user" ? "user" : ""}` }, txt);
  }

  function chipsRow(labels, onPick) {
    const row = el("div", { class: "nora-actions" });
    labels.forEach(l =>
      row.appendChild(el("button", { class: "nora-chip", onclick: () => onPick(l) }, l))
    );
    return row;
  }

  // ---------- CHAT LOGIC ----------
  function startChat(ui) {
    const { body, inputEl, sendBtn } = ui;

    // Greeting + quick chips
    body.append(
      msgNode("Hi! I’m Nora. I’ll get you a quick quote in a few taps."),
      msgNode("What type of event is this? (Corporate, Wedding, Mitzvah, Other)")
    );
    body.append(chipsRow(["Corporate", "Wedding", "Mitzvah", "Other"], pick));

    // Ensure dd/mm/yyyy placeholder for date-type questions
    function maybeSetDatePlaceholder() {
      if (inputEl) inputEl.placeholder = CONFIG.datePlaceholder;
    }
    maybeSetDatePlaceholder();

    function scroll() {
      body.scrollTop = body.scrollHeight;
    }

    async function handleSend(text) {
      if (!text.trim()) return;
      ui.body.append(msgNode(text, "user"));
      scroll();

      try {
        const res = await fetch(CONFIG.endpoints.chat, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();

        // If server replies with “date wanted” or similar, we still keep dd/mm/yyyy
        if (/date/.test((data?.hint || "").toLowerCase())) {
          maybeSetDatePlaceholder();
        }

        ui.body.append(msgNode(data?.reply || "Okay. Noted."));
        // Optional: if the backend signals when to show an action row
        if (Array.isArray(data?.options) && data.options.length) {
          ui.body.append(chipsRow(data.options, pick));
        }
      } catch (e) {
        ui.body.append(msgNode("Network problem. Please try again."));
      }
      scroll();
    }

    function pick(label) {
      handleSend(label);
    }

    sendBtn.addEventListener("click", () => {
      const v = inputEl.value.trim();
      inputEl.value = "";
      // normalize date formats on the way out (to help the API),
      // but display remains dd/mm/yyyy for users.
      const normalized = v.replace(
        /^(\d{4})[-/.](\d{2})[-/.](\d{2})$/,
        (_, y, m, d) => `${d}/${m}/${y}`
      );
      handleSend(normalized);
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendBtn.click();
    });

    // Example: surface “Get Quote” CTA after initial selection
    setTimeout(() => {
      ui.body.append(chipsRow(["Get Quote"], async () => {
        ui.body.append(msgNode("Get Quote", "user"));
        scroll();
        try {
          const r = await fetch(CONFIG.endpoints.quote, { method: "POST" });
          const j = await r.json();
          ui.body.append(msgNode(j?.summary || "Generated your quote."));
        } catch {
          ui.body.append(msgNode("Couldn’t generate the quote just now."));
        }
        scroll();
      }));
    }, 600);
  }

  // ---------- MOUNT ----------
  function mount() {
    injectStyles();
    const host = document.getElementById(CONFIG.hostId);
    if (!host) {
      // Create one if missing (failsafe)
      const fallback = el("div", { id: CONFIG.hostId });
      document.body.appendChild(fallback);
    }
    const ui = buildUI(document.getElementById(CONFIG.hostId));
    startChat(ui);
  }

  // Auto-open immediately when script loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
