// /api/quote.js
// Simple pricing engine for Nora. No travel charges, 4-hour minimum enforced.
// POST JSON: { hours, addons }  OR  { state: { hours, addons } }

const HOURLY = 400;    // Videography coverage
const MIN_HOURS = 4;   // 4-hour minimum

const ADDON_PRICES = {
  // Videography add-ons
  drone: 700,
  livestream: 700,
  rush48: 200,
  rush24: 400,
  usb: 100,

  // Post-production (set real values if/when you want these charged)
  social: 0,            // Social Media Edit
  studio: 0,            // Highlights – (Studio Edit)
  clientDirected: 0,    // Highlights – (Client-Directed)
  fullProgram: 0        // Full Program Edit
};

// core calculator — used by both /api/quote and /api/nora
function buildQuote(input = {}) {
  const state = input.state || input; // accept either {state:{...}} or flat
  const hours = Math.max(MIN_HOURS, Number(state.hours) || 0);
  const a = state.addons || {};

  const lineItems = [
    { label: `Coverage (${hours} hrs)`, price: HOURLY * hours }
  ];

  // Videography add-ons
  if (a.drone)        lineItems.push({ label: 'Drone', price: ADDON_PRICES.drone });
  if (a.livestream)   lineItems.push({ label: 'Livestream', price: ADDON_PRICES.livestream });
  if (a.rush48)       lineItems.push({ label: 'Rush 48 hr', price: ADDON_PRICES.rush48 });
  if (a.rush24)       lineItems.push({ label: 'Rush 24 hr', price: ADDON_PRICES.rush24 });
  if (a.usb)          lineItems.push({ label: 'USB Raw Footage Drive', price: ADDON_PRICES.usb });

  // Post-production
  if (a.social)         lineItems.push({ label: 'Social Media Edit', price: ADDON_PRICES.social });
  if (a.studio)         lineItems.push({ label: 'Highlights – (Studio Edit)', price: ADDON_PRICES.studio });
  if (a.clientDirected) lineItems.push({ label: 'Highlights – (Client-Directed)', price: ADDON_PRICES.clientDirected });
  if (a.fullProgram)    lineItems.push({ label: 'Full Program Edit', price: ADDON_PRICES.fullProgram });

  const total = lineItems.reduce((s, li) => s + (Number(li.price) || 0), 0);

  return { total, lineItems, meta: { hours } };
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  // lightweight CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const quote = buildQuote(body);
    return send(res, 200, { ok: true, quote });
  } catch (err) {
    return send(res, 400, { ok: false, error: String(err?.message || err) });
  }
};

// (Optional) export the calculator for other routes to reuse
module.exports._buildQuote = buildQuote;
