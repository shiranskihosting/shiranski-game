/* Anonymous play statistics → Google Sheet "נתוני משחק – שירנסקי מארח" (Apps Script web app).
   No names or phones are ever sent: only a random player id, the source (?src=), device type and game events.
   Events are queued and sent in small batches (when the page is hidden, or every few seconds). */
const TRACK = (()=>{
  const PID_KEY = "shiranski-pid", SRC_KEY = "shiranski-src";
  const ls = {
    get:k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} }
  };
  // player id: random, survives "play again" (separate key from the game state)
  let pid = ls.get(PID_KEY), isNew = false;
  if(!pid || !/^[a-z0-9]{6,16}$/.test(pid)){ pid = Math.random().toString(36).slice(2,12).padEnd(10,"0"); ls.set(PID_KEY,pid); isNew = true; }
  // source: first touch wins (?src=qr / fb / ig / wa ...)
  let src = ls.get(SRC_KEY);
  try{ const q = new URLSearchParams(location.search).get("src"); if(q && !src){ src = q.toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,20); ls.set(SRC_KEY,src); } }catch(e){}
  if(!src) src = "ישיר";
  const dev = (window.matchMedia && matchMedia("(pointer:coarse)").matches) ? "טלפון" : "מחשב";
  const URL_ = window.TRACK_TEST_URL || TRACK_URL; // tests point this at a fake address
  const q = [], sent = [];
  let timer = null;
  function flush(){
    clearTimeout(timer); timer = null;
    if(!q.length || !URL_) { q.length = 0; return; }
    const body = JSON.stringify({p:pid, s:src, d:dev, ev:q.splice(0, q.length)});
    sent.push(body);
    try{ fetch(URL_, {method:"POST", mode:"no-cors", keepalive:true, headers:{"Content-Type":"text/plain;charset=utf-8"}, body}).catch(()=>{}); }
    catch(e){ try{ navigator.sendBeacon && navigator.sendBeacon(URL_, body); }catch(_){} }
  }
  function ev(name, game, value){
    if(!URL_) return;
    q.push([Date.now(), name, game||"", value==null ? "" : String(value)]);
    if(q.length >= 8) flush(); else if(!timer) timer = setTimeout(flush, 5000);
  }
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") flush(); });
  window.addEventListener("pagehide", flush);
  ev("כניסה", "", isNew ? "חדש" : "חוזר");
  return {ev, flush, sent, get pid(){ return pid; }, get src(){ return src; }};
})();
