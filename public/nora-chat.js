// public/nora-chat.js

const msgsEl = document.getElementById('msgs');
const boxEl  = document.getElementById('box');
const sendEl = document.getElementById('send');
const ctrls  = document.getElementById('controls');

const convo = [];
const state = {
  date: null,           // keep null until user picks a date
  location: '',
  hours: 4,
  addons: {
    drone:false, livestream:false, rush48:false, rush24:false, usb:false,
    social:false, studio:false, clientDirected:false, fullProgram:false,
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
        <span>${li.label}${li.note ? ` <span class="muted">(${li.note})</span>` : ''}</span>
        <span>${li.price > 0 ? '$'+li.price.toLocaleString() : ''}</span>
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

// simple debounce
function debounce(fn, ms=300){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

let dateInput, locInput;

function controls(){
  ctrls.innerHTML = '';

  const row1 = document.createElement('div'); row1.className = 'row';

  // DATE: do NOT pre-fill; disable autocomplete; clear value on build
  dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.autocomplete = 'off';
  dateInput.value = '';                  // prevents restored value
  dateInput.placeholder = 'dd/mm/yyyy';
  dateInput.onchange = ()=>{
    // convert yyyy-mm-dd -> dd/mm/yyyy
    if (dateInput.value) {
      const [y,m,d] = dateInput.value.split('-');
      state.date = `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
    } else {
      state.date = null;
    }
    postToNora({type:'update', state});
  };

  // LOCATION: disable autocomplete; live updates (debounced)
  locInput = document.createElement('input');
  locInput.type = 'text';
  locInput.autocomplete = 'off';
  locInput.placeholder = 'Where is your event located? (city or ZIP)';
  locInput.value = '';
  locInput.oninput = debounce(()=>{
    state.location = (locInput.value || '').trim();
    postToNora({type:'update', state});
  }, 250);

  row1.append(dateInput, locInput);

  const hLabel = document.createElement('div'); hLabel.className='muted'; hLabel.style.margin='6px 0 -2px'; hLabel.textContent='Video Coverage — hours (4-hour minimum)';
  const row2 = hoursRow();

  const aLabel = document.createElement('div'); aLabel.className='muted'; aLabel.style.margin='10px 0 -2px'; aLabel.textContent='Videography add-ons';
  const aRow = document.createElement('div'); aRow.className='row';
  aRow.append(
    chip('Drone', state.addons.drone, 'drone'),
    chip('Livestream', state.addons.livestream, 'livestream'),
    chip('Rush 48 hr', state.addons.rush48, 'rush48'),
    chip('Rush 24 hr', state.addons.rush24, 'rush24'),
    chip('USB Raw Footage Drive', state.addons.usb, 'usb'),
  );

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

// BFCache/page-restore safety: clear any restored values
window.addEventListener('pageshow', (e)=>{
  if (e.persisted) {
    state.date = null;
    state.location = '';
    controls();
  }
});

async function postToNora(payload){
  const res = await fetch('/api/nora', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ payload, state, convo })
  });
  const data = await res.json();
  if(data.reply){ addMsg(data.reply, 'her'); }
  if(data.quote){ addTotalView(data.quote); }
  if(data.state){ Object.assign(state, data.state); }
}

sendEl.onclick = async ()=>{
  const text = boxEl.value.trim();
  if(!text) return;
  addMsg(text,'me'); boxEl.value='';
  await postToNora({ type:'user', text });
};

(function init(){
  // IMPORTANT: do NOT seed state.date here (prevents “Got it” on refresh)
  controls();
  addMsg("Hi! I’m Nora. I’ll get you a quick quote in a few taps.");
  addMsg("Hi! I’m Nora. What’s your event date and location? You can also tap add-ons below and I’ll calculate instantly.");
  addMsg("Got it. What city or ZIP is the event in?");
})();
