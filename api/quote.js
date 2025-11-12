// /api/quote.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      eventDate = '',
      location = '',
      hours = 4,
      addons = [],          // ['Drone','Livestream','Rush48','Rush24','USB']
      post = []             // ['Social','StudioEdit','ClientDirected']
    } = req.body || {};

    // ---- Pricing rules (client-facing UI removed; all math here) ----
    const HOURLY = 400;                   // Videography coverage
    const MIN_HOURS = 4;                  // 4-hour minimum enforced
    const DRONE = 700;                    // flat
    const LIVESTREAM = 700;               // flat
    const RUSH48 = 200;                   // flat
    const RUSH24 = 400;                   // flat
    const USB = 100;                      // flat

    // Post-production (you can tune these any time)
    const POST_PRICES = {
      Social: 100,            // Social Media Edit
      StudioEdit: 600,        // “as-is” studio edit, no revisions
      ClientDirected: 600     // with two rounds of revisions (adjust later if needed)
    };

    // --- 4-hour minimum ---
    const billableHours = Math.max(Number(hours || 0), MIN_HOURS);

    // --- Travel (simple heuristic, change later to distance API) ---
    // Treat “local” NYC metro ZIPs as in-radius => $0 travel.
    // Otherwise add $400 flat.
    const zipMatch = String(location).match(/\b(\d{5})\b/);
    const zip = zipMatch ? zipMatch[1] : null;

    // NYC-ish: 100xx–104xx (Manhattan/Bronx/Staten Is.), 110–114 (Queens/LI edge)
    const isLocalZip = zip
      ? (/^(100|101|102|103|104|110|111|112|113|114)/.test(zip))
      : true; // if no zip typed, assume local rather than scaring the user

    const travelFee = isLocalZip ? 0 : 400;

    // --- Build line items ---
    const lineItems = [];

    lineItems.push({
      label: 'Videography Coverage',
      qty: billableHours,
      amount: billableHours * HOURLY
    });

    if (addons.includes('Drone'))      lineItems.push({ label: 'Drone', amount: DRONE });
    if (addons.includes('Livestream')) lineItems.push({ label: 'Livestream', amount: LIVESTREAM });
    if (addons.includes('Rush48'))     lineItems.push({ label: 'Rush 48 hr', amount: RUSH48 });
    if (addons.includes('Rush24'))     lineItems.push({ label: 'Rush 24 hr', amount: RUSH24 });
    if (addons.includes('USB'))        lineItems.push({ label: 'Raw Footage USB Drive', amount: USB });

    // Post
    for (const p of post) {
      if (POST_PRICES[p] != null) {
        const labelMap = {
          Social: 'Social Media Edit',
          StudioEdit: 'Studio Edit (as-is)',
          ClientDirected: 'Client-Directed Edit (2 rounds)'
        };
        lineItems.push({ label: labelMap[p] || p, amount: POST_PRICES[p] });
      }
    }

    if (travelFee) lineItems.push({ label: 'Travel (> 1.5 hr est.)', amount: travelFee });

    const total = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);

    return res.status(200).json({
      inputs: { eventDate, location, hours: billableHours, addons, post },
      total,
      lineItems
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Quote error' });
  }
}
