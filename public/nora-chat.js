(function(){
  const STYLE = `
  #nora-chat * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; }
  #nora-chat { position: fixed; right: 20px; bottom: 20px; z-index: 99999; }
  #nora-bubble { width: 54px; height: 54px; border-radius: 999px; background:#111827; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow: 0 8px 24px rgba(0,0,0,.2); cursor:pointer; }
  #nora-panel { width: 360px; height: 520px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow:0 12px 36px rgba(0,0,0,.2); overflow:hidden; display:none; flex-direction:column; }
  #nora-head { background:#111827; color:#fff; padding:12px 14px; font-weight:700; display:flex; align-items:center; justify-content:space-between; }
  #nora-body { flex:1; padding:12px; overflow:auto; background:#fafafa; }
  .msg { display:flex; margin:8px 0; }
  .msg.bot { justify-content:flex-start; }
  .msg.user { justify-content:flex-end; }
  .bubble { max-width: 80%; padding:10px 12px; border-radius:14px; font-size:14px; line-height:1.3; white-space:pre-wrap; }
  .bot .bubble { background:#fff; border:1px solid #e5e7eb; color:#111827; }
  .user .bubble { background:#111827; color:#fff; }
  #nora-input { display:flex; gap:8px; padding:10px; border-top:1px solid #e5e7eb; }
  #nora-input input { flex:1; padding:10px; border:1px solid #d1d5db; border-radius:10px; }
  #nora-input button { padding:10px 12px; background:#111827; color:#fff; border:none; border-radius:10px; }
  .btns { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
  .btn { padding:8px 10px; border-radius:999px; border:1px solid #d1d5db; background:#fff; cursor:pointer; font-size:13px; }
  .btn.primary { background:#111827; color:#fff; border:none; }
  `;
  function el(tag, props={}, children){ const e=document.createElement(tag); Object.assign(e, props); (children||[]).forEach(c=>e.appendChild(typeof c==='string'?document.createTextNode(c):c)); return e; }
  function chatUI(mountSel){ const mount=document.querySelector(mountSel||'#nora-chat')||document.body.appendChild(el('div',{id:'nora-chat'})); const style=el('style'); style.textContent=STYLE; mount.appendChild(style); const panel=el('div',{id:'nora-panel',style:'display:none'}); const head=el('div',{id:'nora-head'},[el('div',{},['Nora — Cinematic Videographers']), el('button',{onclick:()=>{panel.style.display='none'; bubble.style.display='flex';}},['×'])]); const body=el('div',{id:'nora-body'}); const input=el('div',{id:'nora-input'}); const text=el('input',{placeholder:'Type here…'}); const send=el('button',{innerText:'Send'}); input.appendChild(text); input.appendChild(send); panel.appendChild(head); panel.appendChild(body); panel.appendChild(input); const bubble=el('div',{id:'nora-bubble'},[el('span',{innerText:'💬'})]); bubble.onclick=()=>{bubble.style.display='none'; panel.style.display='flex'; text.focus();}; mount.appendChild(panel); mount.appendChild(bubble); function add(from, content){ const row=el('div',{className:'msg '+from},[el('div',{className:'bubble'},[content])]); body.appendChild(row); body.scrollTop=body.scrollHeight; } return { body, text, send, add }; }
  const steps=[
    {key:'event_type',prompt:'What type of event is this? (Corporate, Wedding, Mitzvah, Other)',kind:'choice',options:['Corporate','Wedding','Mitzvah','Other']},
    {key:'event_date',prompt:'What is the event date?',kind:'input',placeholder:'YYYY-MM-DD'},
    {key:'city',prompt:'What city/venue is it in?',kind:'input',placeholder:'e.g., Washington, DC'},
    {key:'hours',prompt:'How many hours of coverage?',kind:'input',placeholder:'e.g., 8'},
    {key:'coverage',prompt:'Coverage needed?',kind:'choice',options:['2 Lead Videographers','Lead + Second','1 Lead Videographer','B-roll Support']},
    {key:'deliverables',prompt:'Any deliverables to add?',kind:'multi',options:['Raw Footage (secure transfer)','3–5 min Highlights','Livestream','Drone']}
  ];
  function NoraChat(){ const ui=chatUI(); let idx=0; const state={};
    function ask(){ const s=steps[idx]; if(!s) return summarize(); ui.add('bot', s.prompt); const container=document.createElement('div'); container.className='btns';
      if(s.kind==='choice'||s.kind==='multi'){ s.options.forEach(opt=>{ const b=document.createElement('button'); b.className='btn'; b.innerText=opt; b.onclick=()=>{ if(s.kind==='multi'){ b.classList.toggle('primary'); } else { state[s.key]=opt; ui.add('user', opt); idx++; ask(); } }; container.appendChild(b); }); if(s.kind==='multi'){ const done=document.createElement('button'); done.className='btn primary'; done.innerText='Done'; done.onclick=()=>{ const selected=Array.from(container.querySelectorAll('.btn.primary')).map(b=>b.innerText); state[s.key]=selected; ui.add('user', selected.length?selected.join(', '):'None'); idx++; ask(); }; container.appendChild(done); } ui.body.appendChild(container); ui.body.scrollTop=ui.body.scrollHeight; }
      else { ui.text.placeholder=s.placeholder||''; const handler=()=>{ const val=ui.text.value.trim(); if(!val) return; ui.add('user', val); state[s.key]=val; ui.text.value=''; ui.send.removeEventListener('click', handler); idx++; ask(); }; ui.send.addEventListener('click', handler); }
    }
    async function summarize(){ ui.add('bot','Great — calculating your quote…'); try{ const res=await fetch('/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)}); const q=await res.json(); const total=(q.client_view&&q.client_view.total)?q.client_view.total:0; const summary=(q.client_view&&q.client_view.summary)?q.client_view.summary:'Quote'; ui.add('bot', `Total Quote: $${(total||0).toLocaleString()}\n${summary}\nAll coverage, travel, and raw-footage drive included.`); }catch(e){ ui.add('bot','Oops, something went wrong. Please try again.'); } }
    setTimeout(()=>{ ui.add('bot','Hi! I’m Nora. I’ll get you a quick quote in a few taps.'); ask(); },300);
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', NoraChat); } else { NoraChat(); }
})();