// public/nora-chat.js

const msgsEl = document.getElementById('msgs');
const boxEl  = document.getElementById('box');
const sendEl = document.getElementById('send');
const ctrls  = document.getElementById('controls');

// Conversation memory we keep client-side (server also keeps state)
const convo = [];
const state = {
  date: null,           // dd/MM/yyyy
  location: '',         // free text or ZIP
  hours: 4,             // 4,6,8,10
  addons: {             // toggles
    drone: false,
    livestream: false,
    rush48: false,
    rush24: false,
    usb: false,
    social: false,
    studio: false,
    clientDirected: false,
    fullProgram: false,
  }
};

function addMsg(text, who='her'){
  const div = document.createElement('div');
  div.className = `msg ${who==='me'?'me':'her'}`;
  div.textContent = text;
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

function addTotalView(payload){
  const wrap = document.createElement('div');
  wrap.className = 'total';
  wrap.innerHTML = `
    <div class="bold" style="margin-bottom:6px;">Quote Summary</div>
    ${payload.lineItems.map(li => `
      <div class="li">
        <span>${li.label}</span>
        <span>${li.price > 0 ? '$'+li.price.toLocaleString() : (li.note || '')}</span>
      </div>`).join('')}
    <div class="line"></div>
    <div class="li bold"><span>Total</span><span>$${payload.total.toLocaleString()}</span></div>
  `;
  msgsEl.appendChild(wrap);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

function chip(label, on, key){
  const b = document.createElement('button');
  b.className = 'chip';
  b.textContent = label;
  b.setAttribute('data-active', on ? '1' : '0');
  b.onclick = ()=>{
    const active = b.getAttribute('data-active') === '1';
    b.setAttribute('data-active', active ? '0' : '1');
    state.addons[key] = !active;
    // send silent update so server can re-check readiness
    postToNora({type:'update', state});
  };
  return b;
}

function hoursRow(){
  const row = document.createElement('div'); row.className = 'row';
  [4,6,8,10].forEach(h=>{
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = String(h);
    if(state.hours===h) b.setAttribute('data-active','1');
    b.onclick = ()=>{
      Array.from(row.children).forEach(c=>c.setAttribute('data-active','0'));
      b.setAttribute('data-active','1');
      state.hours = h;
      postToNora({type:'update', state});
    };
    row.appendChild(b);
  });
  return row;
}

function controls(){
  ctrls.innerHTML = '';
  // Date + Location
  const row1 = document.createElement('div'); row1.className = 'row';
  const date = document.createElement('input'); date.type='date';
  date.valueAsDate = state.date ? toISODate(state.date) : new Date();
  date.onchange = ()=>{
    state.date = fromISOToDisplay(date.value); // dd/MM/yyyy
    postToNora({type:'update', state});
  };
  const loc = document.createElement('input'); loc.type='text'; loc.placeholder='Where is your event located? (city or ZIP)';
  loc.value = state.location || '';
  loc.onchange = ()=>{ state.location = loc.value.trim(); postToNora({type:'update', state}); };
  row1.append(date, loc);

  // Hours
  const hLabel = document.createElement('div'); hLabel.className='muted'; hLabel.style.margin='6px 0 -2px'; hLabel.textContent='Video Coverage — hours (4-hour minimum)';
  const row2 = hoursRow();

  // Add-ons
  const aLabel = document.createElement('div'); aLabel.className='muted'; aLabel.style.margin='10px 0 -2px'; aLabel.textContent='Videography add-ons';
  const aRow = document.createElement('div'); aRow.className='row';
  aRow.append(
    chip('Drone', state.addons.drone, 'drone'),
    chip('Livestream', state.addons.livestream, 'livestream'),
    chip('Rush 48 hr', state.addons.rush48, 'rush48'),
    chip('Rush 24 hr', state.addons.rush24, 'rush24'),
    chip('USB Raw Footage Drive', state.addons.usb, 'usb'),
  );

  // Post
  const pLabel = document.createElement('div'); pLabel.className='muted'; pLabel.style.margin='10px 0 -2px'; pLabel.textContent='Post-Production';
  const pRow = document.createElement('div'); pRow.className='row';
  pRow.append(
    chip('Social Media Edit', state.addons.social, 'social'),
    chip('Highlights – (Studio Edit)', state.addons.studio, 'studio'),
    chip('Highlights – (Client-Directed)', state.addons.clientDirected, 'clientDirected'),
    chip('Full Program Edit', state.addons.fullProgram, 'fullProgram'),
  );

  ctrls.append(row1, hLabel, row2, aLabel, aRow, pLabel, pRow);
}

function toISODate(ddmmyyyy){
  // dd/MM/yyyy -> yyyy-MM-dd
  const [d,m,y]=ddmmyyyy.split('/').map(Number);
  return new Date(Date.UTC(y, m-1, d));
}
function fromISOToDisplay(iso){
  // yyyy-MM-dd -> dd/MM/yyyy
  const [y,m,d]=iso.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

async function postToNora(payload){
  const res = await fetch('/api/nora', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ payload, state, convo })
  });
  const data = await res.json();

  // Render any assistant text
  if(data.reply){
    addMsg(data.reply, 'her');
  }
  // Render total if present
  if(data.quote){
    addTotalView(data.quote);
  }
  // Update any canonical state
  if(data.state){
    Object.assign(state, data.state);
  }
}

// Send typed text (Nora can still understand free text)
sendEl.onclick = async ()=>{
  const text = boxEl.value.trim();
  if(!text) return;
  addMsg(text,'me'); boxEl.value='';
  await postToNora({ type:'user', text });
};

(function init(){
  // set default date as today (dd/MM/yyyy)
  const today = new Date();
  const d = String(today.getDate()).padStart(2,'0');
  const m = String(today.getMonth()+1).padStart(2,'0');
  const y = today.getFullYear();
  state.date = `${d}/${m}/${y}`;
  controls();

  // initial greeting / first step
  addMsg("Hi! I’m Nora. What’s your event date and location? You can also tap add-ons below and I’ll calculate instantly.");
  // send initial snapshot so backend can show tips or auto-reply
  postToNora({ type:'hello', state });
})();
