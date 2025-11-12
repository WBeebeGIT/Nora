// api/nora.js
// Vercel serverless function
export const config = { runtime: 'edge' }; // fast & scalable

const USD = n => Math.round(n);

// ------- QUOTE MATH (your current structure) -------
function buildQuote(state){
  // Inputs
  const hours = Math.max(4, Number(state.hours || 4)); // 4-hour minimum
  const addons = state.addons || {};
  const location = (state.location || '').trim();

  // Base coverage
  const coverage = 400 * hours;

  // Add-ons
  let add = 0;
  const items = [
    { label: `Coverage (${hours} hrs @ $400/hr)`, price: USD(coverage) }
  ];

  if(addons.drone){ add += 700; items.push({ label: 'Drone', price: 700 }); }
  if(addons.livestream){ add += 700; items.push({ label: 'Livestream', price: 700 }); }
  if(addons.rush48){ add += 200; items.push({ label: 'Rush 48 hr', price: 200 }); }
  if(addons.rush24){ add += 400; items.push({ label: 'Rush 24 hr', price: 400 }); }
  if(addons.usb){ add += 100; items.push({ label: 'Raw Footage USB Drive', price: 100 }); }

  if(addons.social){ add += 100; items.push({ label: 'Post: Social Media Edit', price: 100 }); }
  if(addons.studio){ add += 600; items.push({ label: 'Post: Highlights (Studio Edit)', price: 600 }); }
  if(addons.clientDirected){ add += 600; items.push({ label: 'Post: Highlights (Client-Directed)', price: 600 }); }
  if(addons.fullProgram){ add += 350; items.push({ label: 'Post: Full Program Edit', price: 350 }); }

  // Travel — TBD: distance-based calc (kept client-clean)
  let travel = 0;
  if(location){
    items.push({ label: 'Travel', price: 0, note: 'TBD (based on final location)' });
  }

  const total = USD(coverage + add + travel);
  return { total, lineItems: items };
}

// --------- MINI CONVERSATION ENGINE ----------
function needMore(state){
  if(!state?.date) return 'date';
  if(!state?.location) return 'location';
  if(!state?.hours) return 'hours';
  return null;
}

export default async function handler(req){
  try{
    const { payload, state } = await req.json();

    // Lightweight “assistant” replies without hitting LLM (deterministic)
    if(payload?.type === 'hello'){
      const missing = needMore(state);
      if(missing === 'date')  return json({ reply: 'Please set your event date (calendar above), then pick hours and any add-ons.' , state });
      if(missing === 'location') return json({ reply: 'Got it. What city or ZIP is the event in?', state });
      // If enough info, return a first quote
      const quote = buildQuote(state);
      return json({ reply: 'All set. Here’s a quick quote you can refine with add-ons:', quote, state });
    }

    if(payload?.type === 'update'){
      const missing = needMore(state);
      if(!missing){
        const quote = buildQuote(state);
        return json({ reply: 'Updated your quote with the latest selections.', quote, state });
      }
      // gentle nudge
      if(missing === 'location') return json({ reply: 'What city or ZIP is the event in?', state });
      if(missing === 'hours') return json({ reply: 'Choose your coverage hours (4, 6, 8, or 10).', state });
      return json({ state });
    }

    if(payload?.type === 'user'){
      // very simple intent detection
      const text = (payload.text || '').toLowerCase();
      if(text.includes('date')){
        return json({ reply:'Use the calendar above to set your event date (dd/mm/yyyy).', state });
      }
      if(text.includes('hours') || text.includes('coverage')){
        return json({ reply:'Choose 4, 6, 8, or 10 hours. 4-hour minimum is enforced.', state });
      }
      if(text.includes('quote') || text.includes('total')){
        const missing = needMore(state);
        if(!missing){
          const quote = buildQuote(state);
          return json({ reply:'Here’s your current quote:', quote, state });
        }
        return json({ reply:'Set your date, location, and hours to get a quote.', state });
      }
      // default
      return json({ reply:'I’m listening. You can also toggle add-ons below and I’ll update the quote automatically.', state });
    }

    // fallback
    return json({ reply:'Let me know your date, location, and hours to get started.', state });
  }catch(e){
    return json({ reply:'Hmm — I couldn’t complete that. Try again in a moment.', error:String(e) }, 200);
  }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {
    status,
    headers:{'content-type':'application/json'}
  });
}
