/* Sound (synthesized with Web Audio, no files) and fireworks (canvas). Loaded before app.js. */
const SFX = (() => {
  let ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem("shiranski-mute") === "1"; } catch (e) {}
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, t0, dur, { type = "sine", vol = 0.25, to = null, attack = 0.005 } = {}) {
    const c = ac(); if (!c || muted) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t0, dur, { vol = 0.2, freq = 2000, q = 1, type = "bandpass" } = {}) {
    const c = ac(); if (!c || muted) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  return {
    get muted() { return muted; },
    setMuted(v) { muted = !!v; try { localStorage.setItem("shiranski-mute", muted ? "1" : "0"); } catch (e) {} if (!muted) ac(); },
    unlock() { ac(); },
    click() { tone(880, 0, 0.05, { type: "triangle", vol: 0.12 }); },
    good() { tone(784, 0, 0.14, { type: "triangle", vol: 0.22 }); tone(1175, 0.09, 0.22, { type: "triangle", vol: 0.2 }); },
    bad() { tone(220, 0, 0.22, { type: "sine", vol: 0.28, to: 140 }); },
    flip() { noise(0, 0.07, { vol: 0.18, freq: 3200, q: 0.8 }); },
    pair() { tone(988, 0, 0.12, { type: "sine", vol: 0.18 }); tone(1319, 0.07, 0.18, { type: "sine", vol: 0.16 }); },
    tick() { noise(0, 0.025, { vol: 0.35, freq: 2600, q: 4 }); tone(1500, 0, 0.02, { type: "square", vol: 0.04 }); },
    whoosh() { noise(0, 0.5, { vol: 0.12, freq: 700, q: 0.6, type: "lowpass" }); },
    done() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, { type: "triangle", vol: 0.18 })); },
    fanfare() {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, i === 6 ? 0.7 : 0.2, { type: "triangle", vol: 0.2 }));
      [0.2, 0.55, 0.9, 1.3].forEach(t => noise(t, 0.35, { vol: 0.12, freq: 900, q: 0.5, type: "lowpass" }));
    },
    pop() { noise(0, 0.18, { vol: 0.16, freq: 1200, q: 0.7 }); },
    // crowd clapping: hundreds of short random claps that swell and fade
    applause(dur = 4.2) {
      const c = ac(); if (!c || muted) return;
      const n = Math.floor(dur * 70);
      for (let i = 0; i < n; i++) {
        const t = Math.random() * dur, env = Math.min(1, t / 0.5) * Math.min(1, (dur - t) / 1.4);
        noise(t, 0.03 + Math.random() * 0.03, { vol: 0.05 + 0.13 * env * Math.random(), freq: 1100 + Math.random() * 1800, q: 1.2 + Math.random() });
      }
    },
    // crowd cheering: a few voices gliding up ("wooo!") with vibrato, through a vowel-like filter
    cheer() {
      const c = ac(); if (!c || muted) return;
      const t0 = c.currentTime + 0.05;
      for (let i = 0; i < 7; i++) {
        const o = c.createOscillator(), vib = c.createOscillator(), vg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
        const base = 260 + Math.random() * 260, st = t0 + Math.random() * 0.35, d = 1.1 + Math.random() * 0.8;
        o.type = "sawtooth"; o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * 1.55, st + 0.35); o.frequency.exponentialRampToValueAtTime(base * 1.25, st + d);
        vib.frequency.value = 5 + Math.random() * 2; vg.gain.value = base * 0.025; vib.connect(vg); vg.connect(o.frequency);
        f.type = "bandpass"; f.frequency.value = 900 + Math.random() * 500; f.Q.value = 2.2;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.045, st + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, st + d);
        o.connect(f); f.connect(g); g.connect(master); o.start(st); vib.start(st); o.stop(st + d + 0.05); vib.stop(st + d + 0.05);
      }
    },
    // festive brass fanfare: layered sawtooth "trumpets" with a brassy swell
    trumpets() {
      const c = ac(); if (!c || muted) return;
      const notes = [[392, 0, .16], [523, .18, .16], [659, .36, .16], [784, .54, .5], [659, 1.08, .14], [784, 1.24, .9]];
      notes.forEach(([f0, t, d]) => {
        [0, 4, -4].forEach(cents => {
          const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), st = c.currentTime + 0.05 + t;
          o.type = "sawtooth"; o.frequency.value = f0; o.detune.value = cents;
          f.type = "lowpass"; f.Q.value = 1.5; f.frequency.setValueAtTime(600, st); f.frequency.linearRampToValueAtTime(3200, st + 0.06); f.frequency.linearRampToValueAtTime(1800, st + d);
          g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.06, st + 0.04); g.gain.setValueAtTime(0.06, st + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, st + d + 0.08);
          o.connect(f); f.connect(g); g.connect(master); o.start(st); o.stop(st + d + 0.12);
        });
      });
      noise(1.24, 0.9, { vol: 0.08, freq: 300, q: 0.5, type: "lowpass" });
    },
  };
})();

/* Fireworks: gold, cream and olive bursts over the whole screen. */
function fireworks(duration = 3800) {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas"); cv.className = "fireworks"; cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  const g = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener("resize", resize);
  const COLORS = ["#C9A96E", "#E6CF9E", "#F4EEE3", "#A9AC86", "#D8B56A"];
  const parts = [], rockets = [];
  const start = performance.now();
  let nextLaunch = 0;
  function launch() {
    rockets.push({ x: innerWidth * (0.15 + Math.random() * 0.7), y: innerHeight + 10, vy: -(innerHeight * 0.011 + Math.random() * 3), target: innerHeight * (0.15 + Math.random() * 0.35) });
  }
  function burst(x, y) {
    const col = COLORS[Math.floor(Math.random() * COLORS.length)], n = 46 + Math.floor(Math.random() * 20);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, s = 2.2 + Math.random() * 2.6;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col: Math.random() < 0.25 ? "#F4EEE3" : col });
    }
    SFX.pop();
  }
  function frame(now) {
    const t = now - start;
    g.globalCompositeOperation = "destination-out"; g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(0, 0, innerWidth, innerHeight);
    g.globalCompositeOperation = "lighter";
    if (t < duration - 1200 && t > nextLaunch) { launch(); nextLaunch = t + 260 + Math.random() * 280; }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.y += r.vy; r.vy *= 0.985;
      g.fillStyle = "#F4EEE3"; g.beginPath(); g.arc(r.x, r.y, 2, 0, 7); g.fill();
      if (r.y <= r.target || r.vy > -1.5) { burst(r.x, r.y); rockets.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.012;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, 2.1, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    if (t < duration || parts.length || rockets.length) requestAnimationFrame(frame);
    else { removeEventListener("resize", resize); cv.remove(); }
  }
  requestAnimationFrame(frame);
}
