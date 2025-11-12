// /api/quote.js
// Vercel/Next.js API route – calculates an instant quote.
// Accepts JSON body. Safe against addons/post as array OR object.
// Date is accepted as any string (UI sends dd/MM/yyyy).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  // Try to parse JSON safely (in case someone posts text/plain)
  let payload = {};
  try {
    if (req.headers["content-type"]?.includes("application/json")) {
      payload = req.body || {};
    } else {
      const text = req.body?.toString?.() ?? "";
      payload = text ? JSON.parse(text) : {};
    }
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Invalid JSON body" });
  }

  // ---- Inputs (all optional; we guard below) ----
  const {
    // UI fields
    date,                // e.g. "14/11/2025"
    location,            // freeform location / zip (used later for geo travel)
    hours,               // 4, 6, 8, 10 (or any number)
    addons,              // array like ["drone","rush48"] OR object {drone:true,...}
    post,                // array/object for post-production selections
    // Optional explicit travel flag from UI until geo-calc is wired:
    travelFar            // boolean | "far" | "local"
  } = payload || {};

  // ---- Pricing (current setup) ----
  const COVERAGE_PER_HOUR = 400;      // Videography Coverage: $400/hr
  const MIN_HOURS = 4;                // 4-hour minimum enforced

  // Add-ons
  const DRONE = 700;                  // flat
  const LIVESTREAM = 700;             // flat
  const RUSH48 = 200;                 // +$200
  const RUSH24 = 400;                 // +$400
  const USB = 100;                    // Raw Footage USB Drive (flat)

  // Travel – placeholder until geo distance calc is wired
  const TRAVEL_FAR_FLAT = 400;

  // Post-production (update to your exact pricing if desired)
  const SOCIAL_MEDIA_EDIT = 100;      // from your standard rates
  const STUDIO_EDIT = 0;              // "as-is" edit (set as needed)
  const CLIENT_DIRECTED_EDIT = 600;   // you specified this value
  const FULL_PROGRAM_EDIT = 500;      // typical full program price (adjust as needed)

  // ---- Helpers ----
  const asBoolMap = (value) => {
    // Accept array or object; normalize to {key: true}
    if (Array.isArray(value)) {
      return value.reduce((m, k) => {
        if (typeof k === "string") m[k.toLowerCase()] = true;
        return m;
      }, {});
    }
    if (value && typeof value === "object") {
      // Normalize keys to lowercase truthy
      return Object.keys(value).reduce((m, k) => {
        if (value[k]) m[k.toLowerCase()] = true;
        return m;
      }, {});
    }
    return {};
  };

  const has = (map, key) => !!map[key.toLowerCase()];

  // Normalize selections
  const addonMap = asBoolMap(addons);
  const postMap = asBoolMap(post);

  // Hours (with 4-hr minimum)
  const rawHours = Number(hours) || MIN_HOURS;
  const billableHours = Math.max(MIN_HOURS, Math.ceil(rawHours));

  // Line items builder
  const lineItems = [];
  const addLine = (label, amount) => {
    if (!amount || isNaN(amount)) return;
    lineItems.push({ label, amount: Number(amount) });
  };

  // ---- Coverage ----
  addLine(`Videography Coverage (${billableHours} hr @ $${COVERAGE_PER_HOUR}/hr)`,
          billableHours * COVERAGE_PER_HOUR);

  // ---- Add-ons ----
  if (has(addonMap, "drone"))      addLine("Drone (flat)", DRONE);
  if (has(addonMap, "livestream")) addLine("Livestream (flat)", LIVESTREAM);

  // If both rush options arrive, we add both; if you prefer "highest only", flip logic below.
  const rush24Selected = has(addonMap, "rush24");
  const rush48Selected = has(addonMap, "rush48");
  if (rush24Selected) addLine("Rush 24 hr", RUSH24);
  else if (rush48Selected) addLine("Rush 48 hr", RUSH48);

  if (has(addonMap, "usb")) addLine("Raw Footage USB Drive", USB);

  // ---- Travel (temporary flag until geo-calc) ----
  // Accepts: travelFar === true | "far"
  if (travelFar === true || (typeof travelFar === "string" && travelFar.toLowerCase() === "far")) {
    addLine("Travel (> 1.5 hr)", TRAVEL_FAR_FLAT);
  }

  // ---- Post-Production ----
  if (has(postMap, "social"))          addLine("Social Media Edit", SOCIAL_MEDIA_EDIT);
  if (has(postMap, "studio"))          addLine("Highlights – Studio Edit", STUDIO_EDIT);
  if (has(postMap, "clientdirected"))  addLine("Highlights – Client-Directed Edit", CLIENT_DIRECTED_EDIT);
  if (has(postMap, "fullprogram"))     addLine("Full Program Edit", FULL_PROGRAM_EDIT);

  // ---- Totals ----
  const total = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);

  // Pretty currency
  const usd = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  // Echo some meta back
  const meta = {
    date: date || null,
    location: location || null,
    rawHours,
    billableHours,
  };

  return res.status(200).json({
    ok: true,
    total,
    total_formatted: usd(total),
    currency: "USD",
    lineItems,
    meta,
  });
}
