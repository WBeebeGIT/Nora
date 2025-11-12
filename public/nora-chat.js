// public/nora-chat.js
// Nora – client UI controller (safe JSON handling + no travel + date "Got it" fix)

(function () {
  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") n.className = v;
      else if (k === "style" && v && typeof v === "object") Object.assign(n.style, v);
      else if (v !== undefined && v !== null) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return n;
  };
  const currency = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      Number.isFinite(+n) ? +n : 0
    );

  // ---------- wiring (adjust selectors here if needed) ----------
  const dateEl = $("#nora-date");
  const locEl = $("#nora-loc");
  const quoteBox = $("#nora-quote");
  const getBtn = $("#nora-get");

  // hour chips: <button data-hours="4">4</button>
  const hourBtns = $$("[data-hours]");
  // add-on chips: <button data-addon="drone">Drone</button>
  const addonBtns = $$("[data-addon]");

  // optional chat bits (if present we will write "Got it" progress)
  const talkBox = $("#nora-talk");
  const chatInput = $("#nora-input");
  const chatSend = $("#nora-send");

  // ---------- state ----------
  const state = {
    hours: 4,             // default 4-hr min
    addons: new Set(),     // Set of addon keys
    date: "",              // ISO string or dd/MM/yyyy as you pass
    location: "",          // user-typed
  };

  // **important**: avoid "Got it" on initial refresh because the date input might keep a cached value.
  // We'll only treat the date as "chosen" after the user changes it in this session.
  let userTouchedDate = false;

  // ---------- UI helpers ----------
  function logBubble(text) {
    if (!talkBox) return; // chat UI is optional
    talkBox.appendChild(el("div", { class: "nora-bubble nora-assistant" }, text));
    talkBox.scrollTop = talkBox.scrollHeight;
  }

  function renderError(message) {
    if (quoteBox) {
      quoteBox.innerHTML = "";
      quoteBox.appendChild(
        el(
          "div",
          { class: "nora-qerror" },
          typeof message === "string" ? message : "Hmm — I couldn’t complete the quote."
        )
      );
    }
    logBubble("Hmm — I couldn’t complete the quote.");
  }

  function renderQuote(quote) {
    // Tolerate missing pieces
    const items = Array.isArray(quote?.lineItems) ? quote.lineItems : [];
    const total = Number(quote?.total || 0);

    if (!quoteBox) return;
    quoteBox.innerHTML = "";

    // Header
    quoteBox.appendChild(
      el("div", { class: "nora-qrow nora-qmuted" }, el("div", {}, "Quote Summary"))
    );

    // Line items
    for (const li of items) {
      const label = String(li?.label ?? "");
      const price = Number(li?.price || 0);
      quoteBox.appendChild(
        el(
          "div",
          { class: "nora-qrow" },
          el("div", {}, label),
          el("div", {}, currency(price))
        )
      );
    }

    // Total
    quoteBox.appendChild(
      el(
        "div",
        { class: "nora-qrow" },
        el("div", { style: { fontWeight: "700" } }, "Total"),
        el("div", { style: { fontWeight: "700" } }, currency(total))
      )
    );
  }

  function setActive(btns, predicate) {
    btns.forEach((b) => {
      if (predicate(b)) b.classList.add("active");
      else b.classList.remove("active");
    });
  }

  // ---------- event handlers ----------
  if (dateEl) {
    // Reset visible value (prevents cached “selected” date from firing logic)
    // and let the placeholder/empty UI show until the user interacts.
    if (dateEl.type === "date") {
      dateEl.value = ""; // clears it on load
    } else {
      // if it's a text mask dd/MM/yyyy, clear its value too:
      dateEl.value = "";
    }

    dateEl.addEventListener("change", () => {
      userTouchedDate = true;
      state.date = dateEl.value?.trim() || "";
      // Only chat “Got it” if user actually changed it this session
      if (state.date) logBubble("Got it. What city or ZIP is the event in?");
    });
  }

  if (locEl) {
    locEl.addEventListener("input", () => {
      state.location = locEl.value?.trim() || "";
    });
  }

  hourBtns.forEach((b) => {
    b.addEventListener("click", () => {
      const h = Number(b.getAttribute("data-hours") || "4") || 4;
      state.hours = h;
      setActive(hourBtns, (x) => x === b);
    });
  });

  addonBtns.forEach((b) => {
    b.addEventListener("click", () => {
      const key = b.getAttribute("data-addon");
      if (!key) return;
      if (state.addons.has(key)) {
        state.addons.delete(key);
        b.classList.remove("active");
      } else {
        state.addons.add(key);
        b.classList.add("active");
      }
    });
  });

  if (getBtn) {
    getBtn.addEventListener("click", () => {
      // Optional: basic guard—don’t compute if user didn’t actually pick a date this session
      if (!userTouchedDate || !state.date) {
        renderError("Please pick your event date first.");
        return;
      }
      calculate();
    });
  }

  if (chatSend && chatInput) {
    chatSend.addEventListener("click", () => {
      const val = chatInput.value.trim();
      if (!val) return;
      chatInput.value = "";
      if (talkBox) {
        talkBox.appendChild(el("div", { class: "nora-bubble nora-user" }, val));
        talkBox.scrollTop = talkBox.scrollHeight;
      }
    });
  }

  // ---------- network (robust JSON parsing) ----------
  async function calculate() {
    try {
      const payload = {
        // send raw state to server; **no travel** done here
        date: state.date,
        location: state.location,
        hours: state.hours,
        addons: Array.from(state.addons),
      };

      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      let data = null;

      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text?.slice(0, 200) || "Server returned a non-JSON error.");
      }

      if (!res.ok) {
        throw new Error(
          (data && (data.error || data.message)) || `Request failed (${res.status})`
        );
      }
      if (!data || typeof data !== "object" || !data.quote) {
        throw new Error("Malformed response from /api/quote.");
      }

      renderQuote(data.quote);
    } catch (err) {
      renderError(String(err.message || err));
      console.error("[nora-chat] quote error:", err);
    }
  }

  // ---------- initial UI state ----------
  // ensure the default hour chip is highlighted (4 hrs)
  setActive(hourBtns, (b) => Number(b.getAttribute("data-hours") || "0") === state.hours);

  // initial empty quote
  if (quoteBox) {
    quoteBox.innerHTML = "";
    quoteBox.appendChild(
      el("div", { class: "nora-qmuted" }, "Select your hours and add-ons, then tap Get Quote.")
    );
  }

  // greet in chat if present
  if (talkBox) {
    talkBox.innerHTML = "";
    logBubble("Hi! I’m Nora. I’ll get you a quick quote in a few taps.");
    logBubble("Hi. I’m Nora. What’s your event date and location? You can also tap add-ons below and I’ll calculate instantly.");
  }
})();
