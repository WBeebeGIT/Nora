// /api/nora.js
// Vercel serverless function: returns a quote with NO travel charges.
// Expects POST JSON: { state: { hours, addons: { drone, livestream, rush48, rush24, usb, social, studio, clientDirected, fullProgram } } }

const HOURLY = 400;       // Videography coverage rate
const MIN_HOURS = 4;      // 4-hour minimum

const PRICES = {
  // Videography add-ons
  drone: 700,
  livestream: 700,
  rush48: 200,
  rush24: 400,
  usb: 100,

  // Post-production (set to your real numbers when ready)
  social: 0,
  studio: 0,
  clientDirected: 0,
  fullProgram: 0
};

// Pure calculator (no travel)
function calcQuote(state = {}) {
  const hours = Math.max(MIN_HOURS, Number(state.hours) || 0);

  const lineItems = [
    { label: `Coverage (${hours} hrs)`, price: HOURLY * hours }
  ];

  const a = state.addons || {};

  // Videography add-ons
  if (a.drone)        lineItems.push({ label: 'Drone', price: PRICES.drone });
  if (a.livestream)   lineItems.push({ label: 'Livestream', price: PRICES.livestream });
  if (a.rush48)       lineItems.push({ label: 'Rush 48 hr', price: PRICES.rush48 });
  if (a.rush24)       lineItems.push({ label: 'Rush 24 hr', price: PRICES.rush24 });
  if (a.usb)          lineItems.push({ label: 'USB Raw Footage Drive', price: PRICES.usb });

  // Post-production
  if (a.social)         lineItems.push({ label: 'Social Media Edit', price: PRICES.social });
  if (a.studio)         lineItems.push({ label: 'Highlights – (Studio Edit)', price: PRICES.studio });
  if (a.clientDirected) lineItems.push({ label: 'Highlights – (Client-Directed)', price: PRICES.clientDirected });
  if (a.fullProgram)    lineItems.push({ label: 'Full Program Edit', price: PRICES.fullProgram });

  const total = lineItems.reduce((sum, li) => sum + (Number(li.price) || 0), 0);

  return { lineItems, total, meta: { hours } };
}

function sendJSON(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  // Basic CORS (optional)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const state = body.state || {};
    const quote = calcQuote(state);
    return sendJSON(res, 200, { ok: true, quote });
  } catch (err) {
    return sendJSON(res, 400, { ok: false, error: String(err?.message || err) });
  }
};
