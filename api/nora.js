// /api/nora.js
// Vercel Serverless Function — calculates the quote and replies to the UI

const HOURLY          = 400; // lead videography coverage
const MIN_HOURS       = 4;
const TRAVEL_FLAT     = 200; // always added silently (NOT shown in line items)

// Flat-price add-ons
const PRICES = {
  drone: 700,
  livestream: 700,
  rush48: 200,
  rush24: 400,
  usb: 100,

  // Post-production (set to 0 for now; wire real values when ready)
  social: 0,            // Social Media Edit
  studio: 0,            // Highlights – (Studio Edit)
  clientDirected: 0,    // Highlights – (Client-Directed)
  fullProgram: 0        // Full Program Edit
};

function calcQuote(state) {
  const hours = Math.max(MIN_HOURS, Number(state?.hours) || MIN_HOURS);

  // Base coverage (we do NOT expose the $/hr in UI; this is server-side only)
  const coverage = HOURLY * hours;

  const lineItems = [
    { label: `Coverage (${hours} hrs)`, price: coverage, note: null }
    // IMPORTANT: no travel line item here
  ];

  // Videography add-ons
  if (state?.addons?.drone)        lineItems.push({ label: 'Drone',        price: PRICES.drone });
  if (state?.addons?.livestream)   lineItems.push({ label: 'Livestream',   price: PRICES.livestream });
  if (state?.addons?.rush48)       lineItems.push({ label: 'Rush 48 hr',   price: PRICES.rush48 });
  if (state?.addons?.rush24)       lineItems.push({ label: 'Rush 24 hr',   price: PRICES.rush24 });
  if (state?.addons?.usb)          lineItems.push({ label: 'USB Raw Footage Drive', price: PRICES.usb });

  // Post-production selections (currently $0 until you decide pricing)
  if (state?.addons?.social)         lineItems.push({ label: 'Social Media Edit',                price: PRICES.social });
  if (state?.addons?.studio)         lineItems.push({ label: 'Highlights – (Studio Edit)',       price: PRICES.studio });
  if (state?.addons?.clientDirected) lineItems.push({ label: 'Highlights – (Client-Directed)',   price: PRICES.clientDirected });
  if (state?.addons?.fullProgram)    lineItems.push({ label: 'Full Program Edit',                price: PRICES.fullProgram });

  const subtotal = lineItems.reduce((s, li) => s + (li.price || 0), 0);

  // Always add $200 travel silently (not added to lineItems)
  const total = subtotal + TRAVEL_FLAT;

  return {
    lineItems,     // shown in the UI summary
    total,         // includes the silent $200 travel
    meta: {
      hours,
      // you can inspect state.date / state.location here if needed,
      // but we intentionally do not expose travel as a visible row
    }
  };
}

function conversationalReply(payload, state) {
  // Keep replies simple and neutral; rates remain server-side
  if (payload?.type === 'update') {
    if (!state?.date)      return "Great — pick a date and I’ll update your quote.";
    if (!state?.location)  return "Got it. Add your city or ZIP and I’ll refine the quote.";
    return "Updated your quote with the latest selections.";
  }
  if (payload?.type === 'user') {
    return "Thanks! I’ve updated your quote.";
  }
  return "Okay! I’ve refreshed your quote.";
}

export default async function handler(req, res) {
  try {
    const { payload, state } = req.body || {};
    const reply = conversationalReply(payload, state);
    const quote = calcQuote(state || {});
    res.status(200).json({ reply, quote, state });
  } catch (err) {
    console.error(err);
    res.status(200).json({
      reply: "Hmm — I couldn’t complete the quote.",
      quote: { lineItems: [], total: 0 },
    });
  }
}
