/* ===================== STATE ===================== */
const KEY = "shiranski-game-v1";
const FRESH = ()=>({bridge:0, trivia:0, memory:0, puzzle:0, zoom:0, tf:0, odd:0, jigsaw:0, memory2:0, done:{}, prize:null, spins:0, who:null});
let S = FRESH();
try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s && s.done) S = Object.assign(FRESH(), s); }catch(e){}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
const MAX = {bridge:20, trivia:20, memory:3, puzzle:3, zoom:4, tf:10, odd:10, jigsaw:3, memory2:3};

const $ = (id)=>document.getElementById(id);
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
function show(id){ document.querySelectorAll(".screen").forEach(s=>s.hidden = s.id!==id); window.scrollTo({top:0}); }
document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",()=>{ renderLobby(); show("lobby"); }));
document.querySelectorAll("[data-backcat]").forEach(b=>b.addEventListener("click",backFromGame));

/* Placeholder plate (SVG) used until photos are added */
function platePlaceholder(name){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#28241F"/><circle cx="200" cy="200" r="150" fill="#F4EEE3"/><circle cx="200" cy="200" r="120" fill="none" stroke="#A9AC86" stroke-width="3"/><circle cx="200" cy="200" r="110" fill="none" stroke="#A9AC86" stroke-width="1"/><circle cx="185" cy="195" r="48" fill="#C9A96E"/><circle cx="225" cy="215" r="30" fill="#7E8160"/><circle cx="165" cy="230" r="16" fill="#C97A6E"/><path d="M110 60 c40 60 60 70 120 60" stroke="#A9AC86" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;
  return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
}
function photoSrc(p){ return p.src || platePlaceholder(p.name); }

/* ===================== LOBBY ===================== */
// main menu illustrations: Canva line drawings, traced to transparent SVG (img/ui)
const illSvg = k => `<img class="ill" src="img/ui/${k}.svg" alt="">`;
const CATS = [
  {id:"trivia", name:"טריוויה", desc:"כמה אתם מכירים את "+BRAND+"?", ico:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7"/><path d="M12 17h.01"/>'},
  {id:"flavor", name:"גשר ושילובי טעמים", desc:"מנות אמיתיות מהתפריטים. מה מחבר ביניהן?", ico:'<path d="M3 17c4-7 14-7 18 0"/><path d="M6 17v3M18 17v3M12 12v8"/>'},
  {id:"photo", name:"פאזלים מתמונות", desc:"תמונות אמיתיות מערבים ב"+BRAND+".", ico:'<path d="M4 4h6v3a2 2 0 1 0 4 0V4h6v6h-3a2 2 0 1 0 0 4h3v6h-6v-3a2 2 0 1 0-4 0v3H4v-6h3a2 2 0 1 0 0-4H4z"/>'},
  {id:"pairs", name:"זוגות מהתפריט", desc:"מוצאים את אותה המנה פעמיים.", ico:'<rect x="3" y="4" width="8" height="10" rx="2"/><rect x="13" y="10" width="8" height="10" rx="2"/>'},
];
const GAMES = [
  {id:"trivia", cat:"trivia", name:"מכירים את "+BRAND+"?", desc:"20 שאלות על הבית, על הטעמים ועל אליס.", time:"4 דק׳", ico:CATS[0].ico},
  {id:"tf",     cat:"trivia", name:"נכון או לא נכון", desc:"10 משפטים, 10 שניות לכל אחד. מהר!", time:"2 דק׳", ico:'<path d="M5 12l4 4 10-10"/>'},
  {id:"bridge", cat:"flavor", name:"הגשר", desc:"20 מנות אמיתיות מהתפריטים. מה הרכיב השלישי?", time:"4 דק׳", ico:CATS[1].ico},
  {id:"odd",    cat:"flavor", name:"מה לא שייך?", desc:"4 רכיבים, אחד מהם לא היה בצלחת.", time:"3 דק׳", ico:'<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><path d="M14 14l6 6M20 14l-6 6"/>'},
  {id:"puzzle", cat:"photo", name:"תמונה ושם", desc:"מתאימים כל תמונה לשם המנה שלה.", time:"2 דק׳", ico:CATS[2].ico},
  {id:"zoom",   cat:"photo", name:"מה בצלחת?", desc:"תקריב שהולך ונפתח. מזהים את המנה?", time:"1 דק׳", ico:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M11 8v6M8 11h6"/>'},
  {id:"jigsaw", cat:"photo", name:"פאזל חלקים", desc:"מנה מפורקת ל-9 חלקים. מחזירים אותה לצלחת.", time:"3 דק׳", ico:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'},
  {id:"memory", cat:"pairs", name:"זוגות מהתפריט", desc:"12 קלפים, 6 מנות. מוצאים כל מנה פעמיים.", time:"2 דק׳", ico:CATS[3].ico},
  {id:"memory2", cat:"pairs", name:"זוגות מהתפריט: שולחן גדול", desc:"20 קלפים, 10 מנות. לאלופים.", time:"4 דק׳", ico:'<rect x="2" y="4" width="6" height="8" rx="1"/><rect x="9" y="4" width="6" height="8" rx="1"/><rect x="16" y="4" width="6" height="8" rx="1"/><rect x="5" y="13" width="6" height="8" rx="1"/><rect x="13" y="13" width="6" height="8" rx="1"/>'},
];
let curCat = null;
function totalStars(){ return Object.keys(MAX).reduce((a,k)=>a+(S[k]||0),0); }
function totalMax(){ return Object.values(MAX).reduce((a,b)=>a+b,0); }
function catStars(c){ return GAMES.filter(g=>g.cat===c).reduce((a,g)=>a+S[g.id],0); }
function catMax(c){ return GAMES.filter(g=>g.cat===c).reduce((a,g)=>a+MAX[g.id],0); }
function gamesLeft(){ return GAMES.filter(g=>!S.done[g.id]).length; }
// Graded wheel: the more games finished, the more prize slots are open (both the chance and the prizes grow).
function gamesDone(){ return GAMES.length - gamesLeft(); }
function levelFor(n){ return n>=GAMES.length ? 4 : n>=6 ? 3 : n>=3 ? 2 : n>=1 ? 1 : 0; }
function level(){ return levelFor(gamesDone()); }
function slotOpen(i, lv){ return PRIZES[WHEEL[i]].opens <= lv; }
function chance(lv){ return Math.round(WHEEL.filter((k,i)=>slotOpen(i,lv)).length / WHEEL.length * 100); }
const pc = n => "\u2066"+n+"%\u2069"; // keeps "30%" the right way round inside Hebrew text
function spinsLeft(){ return Math.max(0, MAX_SPINS - (S.spins||0)); }
function gamesToNext(){ const n = gamesDone(); return n>=GAMES.length ? 0 : n>=6 ? GAMES.length-n : n>=3 ? 6-n : n>=1 ? 3-n : 1-n; }
function wheelOpen(){ return level()>=1 && spinsLeft()>0 && !S.redeemed; }
function spinsWord(n){ return n===1 ? "סיבוב אחד" : n+" סיבובים"; }
function renderPromo(){
  const n = GAMES.length, d = n - gamesLeft();
  $("promo_bar").style.width = (d/n*100)+"%";
  const lv = level(), prize = S.prize ? " · הפרס שלך: "+PRIZES[S.prize.k].label : "";
  $("promo_line").textContent = lv===0 ? "מסיימים משחק אחד ופותחים את גלגל המזל. כל משחק נוסף משפר את הסיכוי ואת הפרסים."
    : spinsLeft()===0 || S.redeemed ? (S.prize ? "הפרס שלך: "+PRIZES[S.prize.k].label+" · קוד "+S.prize.code : "השתמשת בכל הסיבובים.")
    : `גלגל המזל פתוח · רמה ${lv} מתוך 4 · סיכוי זכייה ${pc(chance(lv))} · נותרו ${spinsWord(spinsLeft())}${prize}`;
}
$("promo").addEventListener("click",e=>{ e.preventDefault(); if(level()>=1 || S.prize){ openWheel(); } else { toast("מסיימים משחק אחד ופותחים את גלגל המזל"); } });
$("bookBtn").href = TALLY_URL; $("lobby_terms").textContent = "פרסי גלגל המזל: "+PRIZE_TERMS;
function renderStart(){
  const nx = nextGame(), btn = $("startBtn");
  if(nx){ btn.hidden = false; btn.textContent = gamesDone()===0 ? `להתחיל לשחק: ${nx.name} · ${nx.time}` : `למשחק הבא: ${nx.name} · ${nx.time}`; btn.onclick = ()=>{ curCat = nx.cat; start(nx.id); }; }
  else if(wheelOpen()){ btn.hidden = false; btn.textContent = "לגלגל המזל"; btn.onclick = openWheel; }
  else btn.hidden = true;
}
function renderLobby(){
  curCat = null; renderPromo(); renderStart();
  $("gamelist").innerHTML = CATS.map(c=>{
    const n = GAMES.filter(g=>g.cat===c.id).length, done = GAMES.filter(g=>g.cat===c.id && S.done[g.id]).length;
    const pct = Math.round(catStars(c.id)/catMax(c.id)*100);
    return `<button class="tile" data-c="${c.id}">
      ${illSvg(c.id)}
      <span class="tile-body">
        <h3>${c.name}</h3>
        <span class="tile-meta">${n} ${n===1?"משחק":"משחקים"} · <span class="${done?'done':''}">★ ${catStars(c.id)}/${catMax(c.id)}</span></span>
        ${catComplete(c.id) ? `<span class="tile-badge">${BADGES[c.id].name}</span>` : ""}
        <span class="tile-bar"><i style="width:${pct}%"></i></span>
      </span>
    </button>`;}).join("");
  $("gamelist").querySelectorAll("[data-c]").forEach(b=>b.addEventListener("click",()=>{ renderCat(b.dataset.c); show("category"); }));
}
function renderCat(cid){
  curCat = cid; const c = CATS.find(x=>x.id===cid);
  $("c_title").textContent = c.name; $("c_desc").textContent = c.desc; $("c_ill").src = "img/ui/"+cid+".svg";
  $("c_list").innerHTML = GAMES.filter(g=>g.cat===cid).map(g=>`
    <button class="game" data-g="${g.id}">
      <span class="ico"><svg viewBox="0 0 24 24">${g.ico}</svg></span>
      <span><h3>${g.name}</h3><p>${g.desc}</p></span>
      <span class="meta"><span>${g.time}</span><span class="${S.done[g.id]?'done':''}">${S.done[g.id]? '★ '+S[g.id]+'/'+MAX[g.id] : '○ '+MAX[g.id]+' כוכבים'}</span></span>
    </button>`).join("");
  $("c_list").querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>start(b.dataset.g)));
}
function backFromGame(){ clearInterval(f && f.timer); if(curCat){ renderCat(curCat); show("category"); } else { renderLobby(); show("lobby"); } }
$("finishBtn").addEventListener("click", renderResult);
const gameName = id => (GAMES.find(g=>g.id===id)||{}).name || id;
function trackDone(id, stars){ TRACK.ev("סיום", gameName(id), stars); if(gamesLeft()===0) TRACK.ev("גלגל"); }
function catComplete(c){ return !!c && GAMES.filter(g=>g.cat===c).every(g=>S.done[g.id]); }
function nextGame(except){ const id = GAME_ORDER.find(x=>!S.done[x] && x!==except); return id ? GAMES.find(g=>g.id===id) : null; }
const reduceMotion = ()=> window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function countUp(el, to){
  if(reduceMotion() || to<=0){ el.textContent = to; return; }
  const t0 = performance.now(), dur = Math.min(900, 120 + to*60);
  (function step(t){ const k = Math.min(1,(t-t0)/dur); el.textContent = Math.round(to*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(step); else SFX.pop(); })(t0);
}
/* end of a game: stars, what it did to the wheel, a badge when a category is complete, and the next game */
function finishGame(id, stars, note){
  trackDone(id, stars);
  const g = GAMES.find(x=>x.id===id), max = MAX[id], ctx = curGame && curGame.id===id ? curGame : {wasDone:true, lvBefore:level(), catDoneBefore:true};
  const lv = level(), up = lv > ctx.lvBefore, newBadge = !ctx.catDoneBefore && catComplete(g.cat);
  const r = stars/max;
  $("d_game").textContent = g.name;
  $("d_title").textContent = r>=.9 ? "מושלם!" : r>=.6 ? "יפה מאוד!" : r>0 ? "סיימת!" : "סיימת. בפעם הבאה זה ילך יותר טוב.";
  $("d_max").textContent = max; $("d_note").textContent = note || "";
  // what this game did to the wheel
  let wheel = "";
  if(S.redeemed || (spinsLeft()===0 && S.prize)) wheel = "";
  else if(up && lv===1) wheel = `<b>גלגל המזל נפתח!</b><p>רמה 1 מתוך 4, סיכוי זכייה ${pc(chance(1))}. כל משחק נוסף משפר את הסיכוי ואת הפרסים.</p>`;
  else if(up && lv===4) wheel = `<b>הגלגל המלא נפתח!</b><p>כל המשבצות פתוחות: ${pc(100)} זכייה, כולל הפרסים הגדולים.</p>`;
  else if(up) wheel = `<b>עלית לרמה ${lv} בגלגל המזל!</b><p>הסיכוי לזכות עלה ל-${pc(chance(lv))}, ונפתחו פרסים חדשים.</p>`;
  else if(lv>=1 && lv<4){ const n = gamesToNext(); wheel = `<b>גלגל המזל: רמה ${lv}, סיכוי ${pc(chance(lv))}</b><p>עוד ${n===1?"משחק אחד":n+" משחקים"} לרמה ${lv+1}.</p>`; }
  $("d_wheel").innerHTML = wheel; $("d_wheel").hidden = !wheel;
  // badge + kitchen secret when the whole category is done for the first time
  if(newBadge){ const B = BADGES[g.cat]; $("d_badge").innerHTML = `<span class="eyebrow">תג חדש</span><b class="badge-name">${B.name}</b><p class="secret"><b>סוד מהמטבח:</b> ${B.secret}</p>`; }
  $("d_badge").hidden = !newBadge;
  // next steps
  const nx = nextGame(id), btns = [];
  if(nx) btns.push(`<button class="btn primary" id="d_next">למשחק הבא: ${nx.name} · ${nx.time}</button>`);
  if(up && wheelOpen()) btns.push(`<button class="btn gold" id="d_wheel_btn">לגלגל המזל</button>`);
  else if(!nx){ btns.push(wheelOpen() ? `<button class="btn gold" id="d_wheel_btn">לגלגל המזל</button>` : `<button class="btn gold" id="d_result">לתוצאה ולשיתוף</button>`); }
  btns.push(`<button class="btn ghost" id="d_back">חזרה לקטגוריה</button>`);
  $("d_actions").innerHTML = btns.join("");
  if($("d_next")) $("d_next").addEventListener("click",()=>{ curCat = nx.cat; start(nx.id); });
  if($("d_wheel_btn")) $("d_wheel_btn").addEventListener("click", openWheel);
  if($("d_result")) $("d_result").addEventListener("click", renderResult);
  $("d_back").addEventListener("click", backFromGame);
  show("done");
  $("d_stars").textContent = 0; setTimeout(()=>countUp($("d_stars"), stars), 250);
  SFX.done();
  if(up || newBadge) setTimeout(()=>{ SFX.fanfare(); if(!reduceMotion()) fireworks(lv===4 ? 3200 : 1800); }, 500);
}
let curGame = null;
function start(id){
  curGame = {id, wasDone: !!S.done[id], lvBefore: level(), catDoneBefore: catComplete((GAMES.find(g=>g.id===id)||{}).cat)};
  TRACK.ev("התחלה", gameName(id));
  if(id==="bridge") startBridge();
  if(id==="trivia") startTrivia();
  if(id==="memory") startMemory();
  if(id==="puzzle") startPuzzle();
  if(id==="zoom")   startZoom();
  if(id==="tf")     startTF();
  if(id==="odd")    startOdd();
  if(id==="jigsaw") startJigsaw();
  if(id==="memory2") startMemory(true);
}
function glow(el, silent){ if(!silent) SFX.good(); el.classList.remove("glow"); void el.offsetWidth; el.classList.add("glow"); if(navigator.vibrate) try{navigator.vibrate(30);}catch(e){} }
function setStars(prefix, n){ $(prefix+"_stars").textContent = n; }

/* ===================== BRIDGE ===================== */
let b = {i:0, score:0, order:[]};
function startBridge(){
  b = {i:0, score:0, order:shuffle(BRIDGE.map((_,i)=>i)).slice(0,20)};
  $("b_tot").textContent = 20; show("bridge"); renderBridge();
}
function renderBridge(){
  const r = BRIDGE[b.order[b.i]];
  $("b_q").textContent = "מנה מהתפריט: "+r.dish+". מה הרכיב השלישי?";
  $("b_n").textContent = b.i+1; $("b_prog").style.width = (b.i/20*100)+"%"; setStars("b", b.score);
  $("b_pair").innerHTML = `<span class="ing">${r.a}</span><span class="plus">+</span><span class="ing">${r.b}</span><span class="plus">+</span><span class="ing q">?</span>`;
  $("b_reveal").innerHTML = "";
  $("b_choices").innerHTML = shuffle(r.opts).map(o=>`<button class="choice">${o}</button>`).join("");
  $("b_choices").querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>{
    const good = btn.textContent===r.ok;
    $("b_choices").querySelectorAll(".choice").forEach(x=>{ x.disabled=true; if(x.textContent===r.ok) x.classList.add("ok"); });
    if(good){ b.score++; glow(btn); } else { btn.classList.add("bad"); SFX.bad(); }
    setStars("b", b.score);
    const last = b.i===19;
    $("b_reveal").innerHTML = `<div class="reveal"><b>${good?"בדיוק.":"כמעט."} השילוב ב${BRAND}: ${r.a} · ${r.b} · ${r.ok}</b><p>${r.why}</p></div><button class="btn primary" id="b_next">${last?"לסיום המשחק":"לשילוב הבא"}</button>`;
    $("b_next").addEventListener("click",()=>{ if(last){ S.bridge=b.score; S.done.bridge=true; save(); finishGame("bridge", b.score); } else { b.i++; renderBridge(); } });
  }));
}

/* ===================== TRIVIA ===================== */
let t = {i:0, score:0, order:[]};
function startTrivia(){
  t = {i:0, score:0, order:TRIVIA.map((_,i)=>i)};
  $("t_tot").textContent = TRIVIA.length; show("trivia"); renderTrivia();
}
function renderTrivia(){
  const r = TRIVIA[t.order[t.i]];
  $("t_n").textContent = t.i+1; $("t_prog").style.width = (t.i/TRIVIA.length*100)+"%"; setStars("t", t.score);
  $("t_q").textContent = r.q; $("t_reveal").innerHTML = "";
  $("t_choices").innerHTML = shuffle(r.opts).map(o=>`<button class="choice">${o}</button>`).join("");
  $("t_choices").querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>{
    const good = btn.textContent===r.ok;
    $("t_choices").querySelectorAll(".choice").forEach(x=>{ x.disabled=true; if(x.textContent===r.ok) x.classList.add("ok"); });
    if(good){ t.score++; glow(btn); } else { btn.classList.add("bad"); SFX.bad(); }
    setStars("t", t.score);
    const last = t.i===TRIVIA.length-1;
    $("t_reveal").innerHTML = `<div class="reveal"><b>${good?"נכון.":"התשובה: "+r.ok}</b><p>${r.why}</p></div><button class="btn primary" id="t_next">${last?"לסיום המשחק":"לשאלה הבאה"}</button>`;
    $("t_next").addEventListener("click",()=>{ if(last){ S.trivia=t.score; S.done.trivia=true; save(); finishGame("trivia", t.score); } else { t.i++; renderTrivia(); } });
  }));
}

/* ===================== MEMORY ===================== */
let m = {open:[], matched:0, moves:0, lock:false, big:false};
function startMemory(big){
  m = {open:[], matched:0, moves:0, lock:false, big:!!big};
  PAIRS = big ? shuffle(DISHES_MEM_BIG).slice(0,10).map(d=>[d,d]) : shuffle(DISHES_MEM).slice(0,6).map(d=>[d,d]);
  $("m_grid").classList.toggle("big", m.big); $("m_title").textContent = big ? "זוגות מהתפריט: שולחן גדול" : "זוגות מהתפריט";
  const cards = shuffle(PAIRS.flatMap((p,i)=>[{t:p[0],k:i},{t:p[1],k:i}]));
  $("m_moves").textContent = 0; $("m_reveal").innerHTML = ""; setStars("m",0);
  $("m_grid").innerHTML = cards.map((c,i)=>`<button class="mem" data-k="${c.k}" data-i="${i}" aria-label="קלף"><span class="in"><span class="f"><svg viewBox="0 0 24 24"><path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z"/></svg></span><span class="b">${c.t}</span></span></button>`).join("");
  $("m_grid").querySelectorAll(".mem").forEach(c=>c.addEventListener("click",()=>flip(c)));
  show("memory");
}
function flip(c){
  if(m.lock || c.classList.contains("flip")) return;
  c.classList.add("flip"); SFX.flip(); m.open.push(c);
  if(m.open.length<2) return;
  m.moves++; $("m_moves").textContent = m.moves; m.lock = true;
  const [a,bb] = m.open;
  if(a.dataset.k===bb.dataset.k){
    setTimeout(()=>{ a.classList.add("won"); bb.classList.add("won"); SFX.pair(); glow(a,true); glow(bb,true); m.open=[]; m.lock=false; m.matched++;
      if(m.matched===PAIRS.length) finishMemory(); },350);
  } else {
    setTimeout(()=>{ a.classList.remove("flip"); bb.classList.remove("flip"); m.open=[]; m.lock=false; },800);
  }
}
function finishMemory(){
  const stars = m.big ? (m.moves<=17?3 : m.moves<=24?2 : 1) : (m.moves<=9?3 : m.moves<=13?2 : 1);
  const key = m.big ? "memory2" : "memory";
  S[key] = Math.max(S[key]||0, stars); S.done[key] = true; save(); setStars("m", stars);
  setTimeout(()=>finishGame(key, stars, `${m.moves} ניסיונות. ${PAIRS.length} מנות אמיתיות מהתפריטים, ובפעם הבאה יהיו אחרות.`), 700);
}

/* ===================== MATCH (photo ↔ name) ===================== */
let p = {round:0, stars:0, sel:null, errors:0, set:[], left:0, pool:[]};
function startPuzzle(){
  p = {round:0, stars:0, sel:null, errors:0, set:[], left:0, pool:shuffle(PHOTOS)};
  $("p_reveal").innerHTML=""; setStars("p",0);
  show("puzzle"); renderMatch();
}
function renderMatch(){
  // 3 photos per round; cycle the pool so rounds differ
  const start = (p.round*3) % PHOTOS.length;
  p.set = [0,1,2].map(i=>p.pool[(start+i)%PHOTOS.length]);
  p.sel=null; p.errors=0; p.left=3;
  $("p_n").textContent = p.round+1; $("p_prog").style.width=(p.round/3*100)+"%";
  $("p_reveal").innerHTML="";
  $("p_photos").innerHTML = shuffle(p.set).map(ph=>`<button class="ph" data-id="${ph.id}" aria-label="תמונת מנה"><img src="${photoSrc(ph)}" alt=""></button>`).join("");
  $("p_names").innerHTML = shuffle(p.set).map(ph=>`<button class="choice" data-id="${ph.id}">${ph.name}</button>`).join("");
  $("p_photos").querySelectorAll(".ph").forEach(b=>b.addEventListener("click",()=>{
    if(b.classList.contains("done")) return;
    $("p_photos").querySelectorAll(".ph").forEach(x=>x.classList.remove("sel"));
    b.classList.add("sel"); p.sel=b.dataset.id;
  }));
  $("p_names").querySelectorAll(".choice").forEach(n=>n.addEventListener("click",()=>{
    if(n.classList.contains("done")) return;
    if(!p.sel){ n.classList.add("shake"); setTimeout(()=>n.classList.remove("shake"),300); return; }
    const photoBtn = $("p_photos").querySelector(`.ph[data-id="${p.sel}"]`);
    if(n.dataset.id===p.sel){
      photoBtn.classList.remove("sel"); photoBtn.classList.add("done"); n.classList.add("done"); glow(n);
      p.sel=null; p.left--;
      if(p.left===0) finishMatchRound();
    } else {
      p.errors++; SFX.bad(); photoBtn.classList.add("shake"); n.classList.add("bad");
      setTimeout(()=>{photoBtn.classList.remove("shake"); n.classList.remove("bad");},400);
    }
  }));
}
function finishMatchRound(){
  const won = p.errors===0; if(won) p.stars++;
  setStars("p", p.stars);
  const last = p.round===2;
  const names = p.set.map(x=>`<b>${x.name}</b>: ${x.hint}`).join("<br>");
  $("p_reveal").innerHTML = `<div class="reveal"><b>${won?"בלי טעויות. כוכב.":"הסיבוב הושלם, עם "+p.errors+" טעויות."}</b><p>${names}</p></div><button class="btn primary" id="p_next">${last?"לסיום המשחק":"לסיבוב הבא"}</button>`;
  $("p_next").addEventListener("click",()=>{ if(last){ S.puzzle=p.stars; S.done.puzzle=true; save(); finishGame("puzzle", p.stars); } else { p.round++; renderMatch(); } });
}

/* ===================== ZOOM ===================== */
let z = {i:0, score:0, set:[], level:0};
function startZoom(){
  z = {i:0, score:0, set:shuffle(PHOTOS).slice(0,4), level:0};
  $("z_tot").textContent = z.set.length; show("zoom"); renderZoom();
}
function renderZoom(){
  const ph = z.set[z.i]; z.level = 0;
  $("z_n").textContent = z.i+1; $("z_prog").style.width = (z.i/z.set.length*100)+"%"; setStars("z", z.score);
  $("z_box").innerHTML = `<img src="${photoSrc(ph)}" alt="" style="--z:4;--ox:${35+Math.random()*30}%;--oy:${35+Math.random()*30}%">`;
  $("z_reveal").innerHTML = "";
  const opts = shuffle([ph.name, ...shuffle(PHOTOS.filter(x=>x.id!==ph.id)).slice(0,3).map(x=>x.name)]);
  $("z_choices").innerHTML = opts.map(o=>`<button class="choice">${o}</button>`).join("") + `<button class="btn ghost" id="z_hint">להתרחק קצת</button>`;
  $("z_hint").addEventListener("click",()=>{ z.level++; const img=$("z_box").querySelector("img"); img.style.setProperty("--z", z.level>=2?1:2.2); if(z.level>=2) $("z_hint").disabled=true; });
  $("z_choices").querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>{
    const good = btn.textContent===ph.name;
    $("z_choices").querySelectorAll(".choice").forEach(x=>{ x.disabled=true; if(x.textContent===ph.name) x.classList.add("ok"); });
    $("z_box").querySelector("img").style.setProperty("--z",1);
    if(good){ z.score++; glow(btn); } else { btn.classList.add("bad"); SFX.bad(); }
    setStars("z", z.score);
    const last = z.i===z.set.length-1;
    $("z_reveal").innerHTML = `<div class="reveal"><b>${ph.name}</b><p>${ph.hint}.</p></div><button class="btn primary" id="z_next">${last?"לסיום המשחק":"לתמונה הבאה"}</button>`;
    $("z_next").addEventListener("click",()=>{ if(last){ S.zoom=z.score; S.done.zoom=true; save(); finishGame("zoom", z.score); } else { z.i++; renderZoom(); } });
  }));
}


/* ===================== TRUE / FALSE (timed) ===================== */
const TF_N = 10, TF_SEC = 10;
let f = {i:0, score:0, set:[], timer:null, left:0};
function startTF(){
  clearInterval(f.timer);
  f = {i:0, score:0, set:shuffle(TF).slice(0,TF_N), timer:null, left:0};
  show("tf"); renderTF();
}
function renderTF(){
  const r = f.set[f.i];
  $("f_n").textContent = f.i+1; $("f_prog").style.width = (f.i/TF_N*100)+"%"; setStars("f", f.score);
  $("f_q").textContent = r.s; $("f_reveal").innerHTML = "";
  $("f_choices").innerHTML = `<button class="choice tfbtn" data-v="1">נכון</button><button class="choice tfbtn" data-v="0">לא נכון</button>`;
  f.left = TF_SEC; $("f_time").style.transition="none"; $("f_time").style.width="100%"; void $("f_time").offsetWidth;
  $("f_time").style.transition=`width ${TF_SEC}s linear`; $("f_time").style.width="0%";
  $("f_sec").textContent = f.left;
  clearInterval(f.timer);
  f.timer = setInterval(()=>{ f.left--; $("f_sec").textContent = Math.max(0,f.left); if(f.left<=0) answerTF(null); },1000);
  $("f_choices").querySelectorAll(".tfbtn").forEach(btn=>btn.addEventListener("click",()=>answerTF(btn)));
}
function answerTF(btn){
  clearInterval(f.timer);
  const r = f.set[f.i];
  const tw = $("f_time"); tw.style.transition="none"; tw.style.width = getComputedStyle(tw).width;
  const good = btn && (btn.dataset.v==="1")===r.t;
  $("f_choices").querySelectorAll(".tfbtn").forEach(x=>{ x.disabled=true; if((x.dataset.v==="1")===r.t) x.classList.add("ok"); });
  if(good){ f.score++; glow(btn); } else { if(btn) btn.classList.add("bad"); SFX.bad(); }
  setStars("f", f.score);
  const last = f.i===TF_N-1;
  $("f_reveal").innerHTML = `<div class="reveal"><b>${!btn?"נגמר הזמן.":good?"נכון!":"לא בדיוק."} ${r.t?"זה נכון.":"זה לא נכון."}</b><p>${r.why}</p></div><button class="btn primary" id="f_next">${last?"לסיום המשחק":"למשפט הבא"}</button>`;
  $("f_next").addEventListener("click",()=>{ if(last){ S.tf=Math.max(S.tf,f.score); S.done.tf=true; save(); finishGame("tf", f.score); } else { f.i++; renderTF(); } });
}

/* ===================== ODD ONE OUT ===================== */
const ODD_N = 10;
let o = {i:0, score:0, set:[]};
function startOdd(){
  o = {i:0, score:0, set:shuffle(BRIDGE).slice(0,ODD_N)};
  show("odd"); renderOdd();
}
function renderOdd(){
  const r = o.set[o.i];
  const intruder = shuffle(r.opts.filter(x=>x!==r.ok))[0];
  o.cur = {r, intruder};
  $("o_n").textContent = o.i+1; $("o_prog").style.width=(o.i/ODD_N*100)+"%"; setStars("o", o.score);
  $("o_q").textContent = "מנה מהתפריט: "+r.dish+". מה לא היה בצלחת?";
  $("o_reveal").innerHTML="";
  $("o_choices").innerHTML = shuffle([r.a, r.b, r.ok, intruder]).map(x=>`<button class="choice oddbtn">${x}</button>`).join("");
  $("o_choices").querySelectorAll(".oddbtn").forEach(btn=>btn.addEventListener("click",()=>{
    const good = btn.textContent===intruder;
    $("o_choices").querySelectorAll(".oddbtn").forEach(x=>{ x.disabled=true; if(x.textContent===intruder) x.classList.add("bad"); else x.classList.add("ok"); });
    if(good){ o.score++; glow(btn); } else SFX.bad();
    setStars("o", o.score);
    const last = o.i===ODD_N-1;
    $("o_reveal").innerHTML = `<div class="reveal"><b>${good?"תפסת אותו.":"הזר היה: "+intruder+"."} בצלחת: ${r.a} · ${r.b} · ${r.ok}</b><p>${r.why}</p></div><button class="btn primary" id="o_next">${last?"לסיום המשחק":"למנה הבאה"}</button>`;
    $("o_next").addEventListener("click",()=>{ if(last){ S.odd=Math.max(S.odd,o.score); S.done.odd=true; save(); finishGame("odd", o.score); } else { o.i++; renderOdd(); } });
  }));
}

/* ===================== JIGSAW (3x3 swap) ===================== */
const JIG_ROUNDS = 3, JIG_PAR = 12;
let j = {round:0, stars:0, photos:[], order:[], sel:null, swaps:0};
function startJigsaw(){
  j = {round:0, stars:0, photos:shuffle(PHOTOS).slice(0,JIG_ROUNDS), order:[], sel:null, swaps:0};
  setStars("j",0); show("jigsaw"); renderJig();
}
function renderJig(){
  const ph = j.photos[j.round];
  do { j.order = shuffle([0,1,2,3,4,5,6,7,8]); } while(j.order.filter((v,i)=>v===i).length>2);
  j.sel=null; j.swaps=0;
  $("j_n").textContent = j.round+1; $("j_prog").style.width=(j.round/JIG_ROUNDS*100)+"%"; $("j_swaps").textContent=0;
  $("j_reveal").innerHTML=""; $("j_ghost").style.backgroundImage=`url('${photoSrc(ph)}')`;
  drawJig();
}
function drawJig(){
  const ph = j.photos[j.round];
  $("j_board").innerHTML = j.order.map((piece,pos)=>`<button class="jp${j.sel===pos?' sel':''}${piece===pos?' home':''}" data-pos="${pos}" aria-label="חלק" style="background-image:url('${photoSrc(ph)}');background-position:${(piece%3)*50}% ${Math.floor(piece/3)*50}%"></button>`).join("");
  $("j_board").querySelectorAll(".jp").forEach(b=>b.addEventListener("click",()=>tapJig(+b.dataset.pos)));
}
function tapJig(pos){
  if(j.done) return;
  if(j.sel===null){ j.sel=pos; drawJig(); return; }
  if(j.sel===pos){ j.sel=null; drawJig(); return; }
  [j.order[j.sel], j.order[pos]] = [j.order[pos], j.order[j.sel]];
  j.sel=null; j.swaps++; SFX.flip(); $("j_swaps").textContent=j.swaps; drawJig();
  if(j.order.every((v,i)=>v===i)) finishJig();
}
function finishJig(){
  const ph = j.photos[j.round]; j.done=true;
  const won = j.swaps<=JIG_PAR; if(won) j.stars++; setStars("j", j.stars);
  $("j_board").classList.add("solved"); glow($("j_board"),true); SFX.done();
  const last = j.round===JIG_ROUNDS-1;
  $("j_reveal").innerHTML = `<div class="reveal"><b>${ph.name} · ${j.swaps} החלפות${won?". כוכב!":""}</b><p>${ph.hint}.</p></div><button class="btn primary" id="j_next">${last?"לסיום המשחק":"לפאזל הבא"}</button>`;
  $("j_next").addEventListener("click",()=>{ j.done=false; $("j_board").classList.remove("solved"); if(last){ S.jigsaw=Math.max(S.jigsaw,j.stars); S.done.jigsaw=true; save(); finishGame("jigsaw", j.stars); } else { j.round++; renderJig(); } });
}


/* ===================== WHEEL OF FORTUNE (graded) ===================== */
let spinning = false, armed = false;
function drawWheel(lv){
  const n = WHEEL.length, R = 150, cx = 160, cy = 160, a = 2*Math.PI/n;
  let svg = `<svg viewBox="0 0 320 320" aria-label="גלגל המזל">`;
  WHEEL.forEach((k,i)=>{
    const open = slotOpen(i, lv);
    const a0 = -Math.PI/2 - a/2 + i*a, a1 = a0 + a;
    const x0 = cx+R*Math.cos(a0), y0 = cy+R*Math.sin(a0), x1 = cx+R*Math.cos(a1), y1 = cy+R*Math.sin(a1);
    const fill = open ? (PRIZES[k].fill || (i%2 ? "#1F1C19" : "#2A2621")) : "#0E0C0B";
    const ink = open ? (PRIZES[k].ink || "#F4EEE3") : "rgba(244,238,227,.26)";
    const mid = a0 + a/2, deg = mid*180/Math.PI;
    const tx = cx+R*0.62*Math.cos(mid), ty = cy+R*0.62*Math.sin(mid);
    const len = PRIZES[k].short.length;
    svg += `<path class="slot${open?'':' closed'}" d="M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" fill="${fill}" stroke="rgba(201,169,110,${open?'.55':'.18'})" stroke-width="1"/>`;
    svg += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="${ink}" font-size="${len>12?8.6:len>5?9.5:13}" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(deg+(Math.cos(mid)<0?180:0)).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" font-family="Assistant, sans-serif">${PRIZES[k].short}</text>`;
  });
  svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#C9A96E" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${R+6}" fill="none" stroke="rgba(201,169,110,.25)" stroke-width="1"/>`;
  for(let i=0;i<n;i++){ const t=-Math.PI/2 - a/2 + i*a; svg+=`<circle cx="${(cx+(R+6)*Math.cos(t)).toFixed(1)}" cy="${(cy+(R+6)*Math.sin(t)).toFixed(1)}" r="2.2" fill="#C9A96E"/>`; }
  $("w_wheel").innerHTML = svg + `</svg>`;
}
function wheelStatus(){
  const lv = level(), left = spinsLeft(), next = gamesToNext();
  const parts = [`נותרו ${spinsWord(left)} מתוך ${MAX_SPINS}`];
  if(S.prize) parts.push("הפרס השמור שלך: "+PRIZES[S.prize.k].label);
  $("w_status").textContent = parts.join(" · ");
  $("w_next").textContent = lv>=4 ? "זה הגלגל המלא: כל המשבצות פתוחות."
    : lv===0 ? "מסיימים משחק אחד ופותחים את הגלגל."
    : `משבצות כהות ריקות ברמה הזו. עוד ${next===1?"משחק אחד":next+" משחקים"} ופותחים את רמה ${lv+1} (סיכוי ${pc(chance(lv+1))}).`;
}
function setHead(){
  const lv = level();
  $("w_head").textContent = S.redeemed ? "הפרס שלך כבר מומש" : spinsLeft()===0 ? "השתמשת בכל הסיבובים" : `רמה ${lv} מתוך 4 · סיכוי זכייה ${pc(chance(lv))}`;
}
function renderWho(){
  const known = !!(S.who && S.who.name);
  $("w_form").hidden = known || !wheelOpen();
  $("w_who").hidden = !known || !wheelOpen();
  if(known) $("w_whoname").textContent = S.who.name;
  // marketing consent: never ticked in advance; once given it stays, and the box is not shown again
  const ask = wheelOpen() && !(S.who && S.who.consent);
  $("w_consentbox").hidden = !ask; $("w_privacy").hidden = !ask;
}
function openWheel(){
  armed = false;
  const lv = level();
  drawWheel(lv); $("w_terms").textContent = PRIZE_TERMS; $("w_reveal").innerHTML = ""; $("w_warn").innerHTML = "";
  const w = $("w_wheel"); w.style.transition = "none";
  w.style.transform = S.prize && S.prize.slot!=null ? `rotate(${-S.prize.slot*360/WHEEL.length}deg)` : "rotate(0deg)";
  $("w_spin").disabled = !wheelOpen(); $("w_spin").textContent = "לסובב";
  setHead(); wheelStatus(); renderWho();
  if(S.prize) showPrize();
  show("wheel");
}
$("w_spin").addEventListener("click", spin);
$("w_change").addEventListener("click", ()=>{ S.who = null; save(); $("w_consent").checked = false; renderWho(); $("w_name").focus(); });
function tickWhileSpinning(el, ms){
  const n = WHEEL.length, slice = 360/n, end = performance.now()+ms; let last = null, total = 0;
  (function step(){
    const m = getComputedStyle(el).transform;
    if(m && m!=="none"){ const v = m.match(/matrix\(([^)]+)\)/); if(v){ const [a,b] = v[1].split(",").map(Number); const ang = Math.atan2(b,a)*180/Math.PI;
      if(last!==null){ let d = ang-last; if(d<-180) d+=360; if(d>180) d-=360; total += Math.abs(d); while(total>=slice){ total-=slice; SFX.tick(); } } last = ang; } }
    if(performance.now()<end) requestAnimationFrame(step);
  })();
}
function warnBeforeSpin(){
  // spinning before the full wheel is allowed, but the player should know what they give up
  const lv = level(), left = spinsLeft();
  $("w_reveal").innerHTML = "";
  $("w_warn").innerHTML = `<div class="reveal warn"><b>${left===1?"זה הסיבוב האחרון שלך.":"נשארו לך "+spinsWord(left)+"."}</b><p>ברמה ${lv} הסיכוי לזכות הוא ${pc(chance(lv))}. הגלגל המלא, עם ${pc(100)} זכייה והפרסים הגדולים, נפתח אחרי כל ${GAMES.length} המשחקים. לסובב עכשיו?</p></div><button class="btn ghost" id="w_later">להמשיך לשחק קודם</button>`;
  $("w_later").addEventListener("click",()=>{ renderLobby(); show("lobby"); });
  $("w_spin").textContent = "כן, לסובב";
  armed = true;
}
async function spin(){
  if(spinning || !wheelOpen()) return;
  let name, phone;
  if(S.who && S.who.name){ name = S.who.name; phone = S.who.phone; }
  else {
    name = $("w_name").value.trim(); phone = $("w_phone").value.replace(/[^\d+]/g,"");
    if(name.length<2 || phone.replace(/\D/g,"").length<9){ toast("צריך שם וטלפון כדי לסובב"); (name.length<2?$("w_name"):$("w_phone")).focus(); return; }
  }
  const consent = !!((S.who && S.who.consent) || $("w_consent").checked);
  if(level()<4 && !armed){ S.who = {name, phone, consent}; save(); renderWho(); warnBeforeSpin(); return; }
  armed = false; $("w_warn").innerHTML = ""; $("w_reveal").innerHTML = "";
  spinning = true; $("w_spin").disabled = true; $("w_spin").textContent = "...";
  const w = $("w_wheel"); w.classList.add("waiting");
  const lv = level();
  let res = null;
  try{
    const ctrl = new AbortController(); const tm = setTimeout(()=>ctrl.abort(), 25000);
    const r = await fetch(SPIN_URL, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({a:"spin", name, phone, games:gamesDone(), consent, src:TRACK.src}), signal:ctrl.signal});
    clearTimeout(tm); res = await r.json();
  }catch(e){ res = null; }
  w.classList.remove("waiting");
  const valid = res && res.ok && Number.isInteger(res.slot) && res.slot>=0 && res.slot<WHEEL.length
    && (res.win ? WHEEL[res.slot]===res.k : !res.k) && (!res.best || (PRIZES[res.best] && /^SH-[0-9A-F]{6}$/.test(res.code)));
  if(!valid){
    spinning = false; $("w_spin").textContent = "לסובב";
    if(res && res.err==="nospins"){ S.spins = MAX_SPINS; if(res.best) S.prize = {k:res.best, code:res.code}; save(); toast("כבר השתמשת בכל "+MAX_SPINS+" הסיבובים"); openWheel(); return; }
    if(res && res.err==="redeemed"){ S.redeemed = true; save(); toast("הפרס שלך כבר מומש. המתנה לאירוע אחד בלבד."); openWheel(); return; }
    $("w_spin").disabled = false;
    toast("לא הצלחנו להגריל כרגע. נסו שוב בעוד רגע."); return;
  }
  S.who = {name, phone, consent};
  const n = WHEEL.length, jitter = (Math.random()-.5) * (360/n) * 0.7;
  const deg = 360*6 - res.slot*360/n + jitter;
  w.style.transition = "none"; w.style.transform = "rotate(0deg)"; void w.offsetWidth;
  w.style.transition = "transform 5.2s cubic-bezier(.12,.62,.08,1)"; w.style.transform = `rotate(${deg}deg)`;
  SFX.whoosh(); tickWhileSpinning(w, 5300);
  const before = S.prize ? S.prize.k : null;
  setTimeout(()=>{
    S.spins = MAX_SPINS - res.spinsLeft;
    if(res.best) S.prize = {k:res.best, code:res.code, slot:res.best===res.k ? res.slot : (S.prize && S.prize.slot), at:new Date().toISOString().slice(0,10)};
    save();
    TRACK.ev("סיבוב", "רמה "+lv, res.win ? PRIZES[res.k].label : "ריק"); TRACK.flush();
    spinning = false; $("w_spin").textContent = "לסובב"; $("w_spin").disabled = !wheelOpen();
    renderWho(); wheelStatus();
    const left = spinsLeft(), more = left>0 && lv<4 ? " כל משחק נוסף פותח עוד משבצות פרס." : "";
    if(res.win){
      // every win: applause + cheering. Top two prizes (Z, V): festive trumpets; others: the regular fanfare
      if(res.k==="Z" || res.k==="V") SFX.trumpets(); else SFX.fanfare();
      SFX.applause(); SFX.cheer(); fireworks(res.k==="Z" ? 5200 : 3800);
      const better = res.best===res.k && before!==res.k;
      $("w_head").textContent = better ? (before ? "שדרוג! הפרס שלך עלה" : "יש לנו זוכה!") : "זכית, והפרס השמור שלך עדיין גבוה יותר";
      showPrize(better ? "" : `בסיבוב הזה יצא ${PRIZES[res.k].label}. נשאר לך הפרס הגבוה.`+more);
    } else {
      SFX.bad();
      $("w_head").textContent = "לא הפעם";
      if(S.prize) showPrize("הפרס השמור שלך לא נפגע."+more);
      else $("w_reveal").innerHTML = `<div class="reveal"><b>החץ נעצר על משבצת ריקה.</b><p>${left>0 ? "נשארו לך "+spinsWord(left)+"."+more : "השתמשת בכל הסיבובים."}</p></div>`
        + (left>0 && lv<4 ? `<button class="btn primary" id="w_play">להמשיך לשחק ולשדרג את הגלגל</button>` : "");
      if($("w_play")) $("w_play").addEventListener("click",()=>{ renderLobby(); show("lobby"); });
    }
  }, 5400);
}
function showPrize(note){
  const P = PRIZES[S.prize.k], left = spinsLeft(), lv = level();
  $("w_reveal").innerHTML = `<div class="reveal prize"><span class="eyebrow">הפרס שלך</span><b class="prize-name">${P.label}</b><span class="prize-code">${S.prize.code}</span>${note?`<p>${note}</p>`:""}<p>כדי לממש: בטופס הזמנת המקום, כתבו את הקוד בשדה ההערות. קוד אחד לשחקן: אם תזכו בפרס גבוה יותר, הקוד נשאר והפרס משתדרג.</p></div>
    <button class="btn ghost" id="w_copy">להעתיק את הקוד</button>
    ${left>0 && lv<4 ? `<button class="btn primary" id="w_play">להמשיך לשחק ולשדרג את הגלגל</button>` : ""}
    <a class="btn gold" href="${TALLY_URL}" target="_blank" rel="noopener">להזמנת מקום עם הפרס</a>`;
  $("w_copy").addEventListener("click",()=>{ navigator.clipboard.writeText(S.prize.code).then(()=>toast("הקוד הועתק")).catch(()=>toast("לא הצלחנו להעתיק")); });
  if($("w_play")) $("w_play").addEventListener("click",()=>{ renderLobby(); show("lobby"); });
}

/* ===================== RESULT ===================== */
function titleFor(score, max){
  const r = score/max;
  if(r>=.9) return "סו-שף של "+BRAND;
  if(r>=.7) return "אורח של כבוד ב"+BRAND;
  if(r>=.45) return "אורח קבוע ב"+BRAND;
  return "אורח חדש ב"+BRAND;
}
function renderResult(){
  const score = totalStars(), max = totalMax();
  const title = titleFor(score,max);
  $("r_title").textContent = title; $("r_score").textContent = score; $("r_max").textContent = max;
  const played = GAMES.filter(g=>S.done[g.id]).length;
  $("r_line").textContent = played===0 ? "עוד לא שיחקת. הכוכבים מחכים בתפריט הראשי." : played<GAMES.length ? `שיחקת ${played} מתוך ${GAMES.length} משחקים. אפשר להמשיך לאסוף.` : "שיחקת בכל המשחקים.";
  const lv = level();
  $("r_wheel").innerHTML = wheelOpen() ? `<div class="reveal"><b>גלגל המזל פתוח: רמה ${lv} מתוך 4, סיכוי זכייה ${pc(chance(lv))}.</b><p>נותרו ${spinsWord(spinsLeft())}.${lv<4?" כל משחק נוסף משפר את הסיכוי ואת הפרסים.":""}</p></div><button class="btn gold" id="r_spin">לגלגל המזל</button>`
    : S.prize ? `<button class="btn gold" id="r_spin">לראות את הפרס שלי</button>`
    : lv===0 ? `<p class="note">מסיימים משחק אחד ופותחים את גלגל המזל.</p>` : "";
  if($("r_spin")) $("r_spin").addEventListener("click", openWheel);
  if(wheelOpen() && lv===4 && !S.prize){ SFX.fanfare(); fireworks(2600); }
  $("r_tags").innerHTML = CATS.map(c=>{ const d=GAMES.some(g=>g.cat===c.id&&S.done[g.id]); return `<span class="tag ${d?'on':''}">${c.name} ${d?'★'+catStars(c.id):''}${catComplete(c.id)?' · '+BADGES[c.id].name:''}</span>`; }).join("");
  const text = `${title} 🍽️\n${score} מתוך ${max} כוכבים במשחק "המטבח של ${BRAND}".\nתנסו גם: ${location.href.split('#')[0]}`;
  $("shareBtn").href = "https://wa.me/?text="+encodeURIComponent(text);
  $("copyBtn").onclick = ()=>{ navigator.clipboard.writeText(text).then(()=>toast("הועתק")).catch(()=>toast("לא הצלחנו להעתיק")); };
  show("result");
}
$("resetBtn").addEventListener("click",()=>{ const keep={prize:S.prize, spins:S.spins, who:S.who, redeemed:S.redeemed}; S=Object.assign(FRESH(), keep); save(); renderLobby(); show("lobby"); });
function toast(msg){ const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),1600); }

/* statistics: booking and sharing clicks */
document.addEventListener("click", e=>{
  const a = e.target.closest("a, button"); if(!a) return;
  const href = a.getAttribute("href") || "";
  if(href.indexOf(TALLY_URL)===0) { TRACK.ev("הזמנה", "", a.closest("#wheel") ? "טופס מהגלגל" : "טופס"); TRACK.flush(); }
  else if(href.indexOf("https://wa.me/972")===0) { TRACK.ev("הזמנה", "", "וואטסאפ"); TRACK.flush(); }
  else if(a.id==="shareBtn") { TRACK.ev("שיתוף", "", "וואטסאפ"); TRACK.flush(); }
  else if(a.id==="copyBtn") TRACK.ev("שיתוף", "", "העתקה");
}, true);

/* sound: soft click on ordinary buttons; answers have their own sounds */
document.addEventListener("click", e=>{
  const el = e.target.closest("button, a"); if(!el || el.disabled) return;
  if(el.matches(".choice, .mem, .hub, .jp, #muteBtn")) return;
  SFX.click();
}, true);
function renderMute(){ const b=$("muteBtn"); b.setAttribute("aria-pressed", SFX.muted?"true":"false"); b.setAttribute("aria-label", SFX.muted?"להפעיל צלילים":"להשתיק צלילים"); b.classList.toggle("off", SFX.muted); }
$("muteBtn").addEventListener("click",()=>{ SFX.setMuted(!SFX.muted); renderMute(); if(!SFX.muted) SFX.click(); });
renderMute();

/* boot */
renderLobby(); show("lobby");
