/* ===================== STATE ===================== */
const KEY = "shiranski-game-v1";
const FRESH = ()=>({bridge:0, trivia:0, memory:0, puzzle:0, zoom:0, tf:0, odd:0, jigsaw:0, memory2:0, done:{}});
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
// line illustrations for the main menu tiles (gold line on dark card; to be replaced by Canva art)
const ILL = {
 trivia:`<path d="M22 82 Q22 38 60 38 Q98 38 98 82 Z"/><path d="M12 88 H108"/><circle cx="60" cy="31" r="5"/><path d="M52 58 q0-9 8-9 q9 0 9 8 q0 6-7 8 q-2 1-2 5"/><circle cx="60" cy="75" r=".8" fill="currentColor"/><path d="M30 96 q30 8 60 0" opacity=".5"/>`,
 flavor:`<path d="M14 82 Q60 30 106 82"/><path d="M26 82 v14 M94 82 v14 M60 56 v40" opacity=".5"/><circle cx="22" cy="70" r="11"/><path d="M22 59 v22 M11 70 h22 M14 62 l16 16 M30 62 l-16 16" opacity=".6"/><path d="M60 46 c-10-8-4-22 0-26 c4 4 10 18 0 26z"/><path d="M60 46 v-22" opacity=".6"/><path d="M92 74 c-4-12 2-20 6-22 c4 2 10 10 6 22 c-3 6-9 6-12 0z"/><path d="M98 52 q2-6 6-7"/>`,
 photo:`<circle cx="60" cy="62" r="34"/><circle cx="60" cy="62" r="24" opacity=".5"/><path d="M60 28 v14 q-6 0-6 6 q0 6 6 6 v16 M26 62 h16 q0-6 6-6 q6 0 6 6 h40" /><path d="M14 30 v48 M10 30 v12 q0 6 4 6 q4 0 4-6 v-12" /><path d="M106 30 q-8 10 0 26 v22"/>`,
 pairs:`<rect x="18" y="24" width="44" height="62" rx="7" transform="rotate(-8 40 55)"/><rect x="58" y="30" width="44" height="62" rx="7" transform="rotate(7 80 61)"/><circle cx="40" cy="55" r="11" transform="rotate(-8 40 55)"/><circle cx="80" cy="61" r="11"/><path d="M36 54 q4-5 8 0 M76 60 q4-5 8 0" opacity=".6"/>`
};
const illSvg = k => `<svg class="ill" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ILL[k]}</svg>`;
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
function renderLobby(){
  curCat = null;
  $("gamelist").innerHTML = CATS.map(c=>{
    const n = GAMES.filter(g=>g.cat===c.id).length, done = GAMES.filter(g=>g.cat===c.id && S.done[g.id]).length;
    const pct = Math.round(catStars(c.id)/catMax(c.id)*100);
    return `<button class="tile" data-c="${c.id}">
      ${illSvg(c.id)}
      <span class="tile-body">
        <h3>${c.name}</h3>
        <span class="tile-meta">${n} ${n===1?"משחק":"משחקים"} · <span class="${done?'done':''}">★ ${catStars(c.id)}/${catMax(c.id)}</span></span>
        <span class="tile-bar"><i style="width:${pct}%"></i></span>
      </span>
    </button>`;}).join("");
  $("gamelist").querySelectorAll("[data-c]").forEach(b=>b.addEventListener("click",()=>{ renderCat(b.dataset.c); show("category"); }));
}
function renderCat(cid){
  curCat = cid; const c = CATS.find(x=>x.id===cid);
  $("c_title").textContent = c.name; $("c_desc").textContent = c.desc;
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
function start(id){
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
function glow(el){ el.classList.remove("glow"); void el.offsetWidth; el.classList.add("glow"); if(navigator.vibrate) try{navigator.vibrate(30);}catch(e){} }
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
    if(good){ b.score++; glow(btn); } else btn.classList.add("bad");
    setStars("b", b.score);
    const last = b.i===19;
    $("b_reveal").innerHTML = `<div class="reveal"><b>${good?"בדיוק.":"כמעט."} השילוב ב${BRAND}: ${r.a} · ${r.b} · ${r.ok}</b><p>${r.why}</p></div><button class="btn primary" id="b_next">${last?"לסיום המשחק":"לשילוב הבא"}</button>`;
    $("b_next").addEventListener("click",()=>{ if(last){ S.bridge=b.score; S.done.bridge=true; save(); backFromGame(); } else { b.i++; renderBridge(); } });
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
    if(good){ t.score++; glow(btn); } else btn.classList.add("bad");
    setStars("t", t.score);
    const last = t.i===TRIVIA.length-1;
    $("t_reveal").innerHTML = `<div class="reveal"><b>${good?"נכון.":"התשובה: "+r.ok}</b><p>${r.why}</p></div><button class="btn primary" id="t_next">${last?"לסיום המשחק":"לשאלה הבאה"}</button>`;
    $("t_next").addEventListener("click",()=>{ if(last){ S.trivia=t.score; S.done.trivia=true; save(); backFromGame(); } else { t.i++; renderTrivia(); } });
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
  c.classList.add("flip"); m.open.push(c);
  if(m.open.length<2) return;
  m.moves++; $("m_moves").textContent = m.moves; m.lock = true;
  const [a,bb] = m.open;
  if(a.dataset.k===bb.dataset.k){
    setTimeout(()=>{ a.classList.add("won"); bb.classList.add("won"); glow(a); glow(bb); m.open=[]; m.lock=false; m.matched++;
      if(m.matched===PAIRS.length) finishMemory(); },350);
  } else {
    setTimeout(()=>{ a.classList.remove("flip"); bb.classList.remove("flip"); m.open=[]; m.lock=false; },800);
  }
}
function finishMemory(){
  const stars = m.big ? (m.moves<=17?3 : m.moves<=24?2 : 1) : (m.moves<=9?3 : m.moves<=13?2 : 1);
  const key = m.big ? "memory2" : "memory";
  S[key] = Math.max(S[key]||0, stars); S.done[key] = true; save(); setStars("m", stars);
  $("m_reveal").innerHTML = `<div class="reveal"><b>${m.moves} ניסיונות, ${stars} כוכבים</b><p>${PAIRS.length} מנות אמיתיות מהתפריטים של ${BRAND}. בפעם הבאה יהיו אחרות.</p></div><button class="btn primary" id="m_done">חזרה לקטגוריה</button>`;
  $("m_done").addEventListener("click",backFromGame);
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
      p.errors++; photoBtn.classList.add("shake"); n.classList.add("bad");
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
  $("p_next").addEventListener("click",()=>{ if(last){ S.puzzle=p.stars; S.done.puzzle=true; save(); backFromGame(); } else { p.round++; renderMatch(); } });
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
    if(good){ z.score++; glow(btn); } else btn.classList.add("bad");
    setStars("z", z.score);
    const last = z.i===z.set.length-1;
    $("z_reveal").innerHTML = `<div class="reveal"><b>${ph.name}</b><p>${ph.hint}.</p></div><button class="btn primary" id="z_next">${last?"לסיום המשחק":"לתמונה הבאה"}</button>`;
    $("z_next").addEventListener("click",()=>{ if(last){ S.zoom=z.score; S.done.zoom=true; save(); backFromGame(); } else { z.i++; renderZoom(); } });
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
  if(good){ f.score++; glow(btn); } else if(btn) btn.classList.add("bad");
  setStars("f", f.score);
  const last = f.i===TF_N-1;
  $("f_reveal").innerHTML = `<div class="reveal"><b>${!btn?"נגמר הזמן.":good?"נכון!":"לא בדיוק."} ${r.t?"זה נכון.":"זה לא נכון."}</b><p>${r.why}</p></div><button class="btn primary" id="f_next">${last?"לסיום המשחק":"למשפט הבא"}</button>`;
  $("f_next").addEventListener("click",()=>{ if(last){ S.tf=Math.max(S.tf,f.score); S.done.tf=true; save(); backFromGame(); } else { f.i++; renderTF(); } });
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
    if(good){ o.score++; glow(btn); }
    setStars("o", o.score);
    const last = o.i===ODD_N-1;
    $("o_reveal").innerHTML = `<div class="reveal"><b>${good?"תפסת אותו.":"הזר היה: "+intruder+"."} בצלחת: ${r.a} · ${r.b} · ${r.ok}</b><p>${r.why}</p></div><button class="btn primary" id="o_next">${last?"לסיום המשחק":"למנה הבאה"}</button>`;
    $("o_next").addEventListener("click",()=>{ if(last){ S.odd=Math.max(S.odd,o.score); S.done.odd=true; save(); backFromGame(); } else { o.i++; renderOdd(); } });
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
  j.sel=null; j.swaps++; $("j_swaps").textContent=j.swaps; drawJig();
  if(j.order.every((v,i)=>v===i)) finishJig();
}
function finishJig(){
  const ph = j.photos[j.round]; j.done=true;
  const won = j.swaps<=JIG_PAR; if(won) j.stars++; setStars("j", j.stars);
  $("j_board").classList.add("solved"); glow($("j_board"));
  const last = j.round===JIG_ROUNDS-1;
  $("j_reveal").innerHTML = `<div class="reveal"><b>${ph.name} · ${j.swaps} החלפות${won?". כוכב!":""}</b><p>${ph.hint}.</p></div><button class="btn primary" id="j_next">${last?"לסיום המשחק":"לפאזל הבא"}</button>`;
  $("j_next").addEventListener("click",()=>{ j.done=false; $("j_board").classList.remove("solved"); if(last){ S.jigsaw=Math.max(S.jigsaw,j.stars); S.done.jigsaw=true; save(); backFromGame(); } else { j.round++; renderJig(); } });
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
  $("r_tags").innerHTML = CATS.map(c=>{ const d=GAMES.some(g=>g.cat===c.id&&S.done[g.id]); return `<span class="tag ${d?'on':''}">${c.name} ${d?'★'+catStars(c.id):''}</span>`; }).join("");
  const text = `${title} 🍽️\n${score} מתוך ${max} כוכבים במשחק "המטבח של ${BRAND}".\nתנסו גם: ${location.href.split('#')[0]}`;
  $("shareBtn").href = "https://wa.me/?text="+encodeURIComponent(text);
  $("copyBtn").onclick = ()=>{ navigator.clipboard.writeText(text).then(()=>toast("הועתק")).catch(()=>toast("לא הצלחנו להעתיק")); };
  show("result");
}
$("resetBtn").addEventListener("click",()=>{ S=FRESH(); save(); renderLobby(); show("lobby"); });
function toast(msg){ const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),1600); }

/* boot */
renderLobby(); show("lobby");
