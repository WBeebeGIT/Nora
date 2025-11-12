export default async function handler(req, res) {
  try {
    const payload = req.body || {};
    const POLICIES = {
      fourHourMinimum: 4,
      studioAsLead: true,
      leadRatePerHour: 150,
      secondRatePerHour: 100,
      usbRawFootageDrive: 100,
      localTravel: 100,
      extendedTravel: 400,
      localRegex: /(new york|bronx|brooklyn|queens|stamford|jersey city)/i
    };
    const ADDONS = { highlights: 600, livestream: 650, drone: 650 };
    function travelFor(city){ return POLICIES.localRegex.test(city||'') ? POLICIES.localTravel : POLICIES.extendedTravel; }
    const hours = Math.max(Number(payload.hours || 0), POLICIES.fourHourMinimum);
    let leads = 0, seconds = 0;
    const c = String(payload.coverage || '').toLowerCase();
    if (c.includes('2 lead')) leads = 2;
    else if (c.includes('lead + second')) { leads = 1; seconds = 1; }
    else if (c.includes('b-roll')) { leads = 1; }
    else { leads = 1; }
    const clientLeadsCost = leads * POLICIES.leadRatePerHour * hours;
    const clientSecondsCost = seconds * POLICIES.secondRatePerHour * hours;
    const studioLeadCost = POLICIES.studioAsLead ? POLICIES.leadRatePerHour * hours : 0;
    const usbCost = POLICIES.usbRawFootageDrive;
    const travelCost = travelFor(payload.city);
    const selected = (payload.deliverables || []).map(d => String(d).toLowerCase());
    let addOnCost = 0;
    if (selected.some(s => s.includes('highlight'))) addOnCost += ADDONS.highlights;
    if (selected.some(s => s.includes('live'))) addOnCost += ADDONS.livestream;
    if (selected.some(s => s.includes('drone'))) addOnCost += ADDONS.drone;
    const total = clientLeadsCost + clientSecondsCost + studioLeadCost + usbCost + travelCost + addOnCost;
    res.status(200).json({
      client_view: {
        event_date: payload.event_date || '',
        location_city: payload.city || '',
        summary: `${payload.coverage || 'Coverage'} (${hours} hours)` + (addOnCost ? ' + add-ons' : '') + ' + Raw Footage',
        total,
        notes: ['All coverage, selected add-ons, travel, and raw-footage drive included.']
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Quote generation failed' });
  }
}