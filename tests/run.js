// Automatic check before every publish. Exit code 1 = something is broken and the site is NOT updated.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + ROOT + '/index.html';
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); console.log((ok ? '  ✓ ' : '  ✗ ') + msg); };

// ---------- 1. Content checks (no browser) ----------
console.log('תוכן');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + ';this.D={BRAND,PHOTOS,BRIDGE,TRIVIA,TF,DISHES_MEM,DISHES_MEM_BIG,PRIZES,WHEEL,TALLY_URL,SPIN_URL,TRACK_URL,BADGES,GAME_ORDER};', ctx);
const D = ctx.D;
check(D.BRIDGE.length >= 20, `הגשר: לפחות 20 מנות (${D.BRIDGE.length})`);
check(D.BRIDGE.every(r => r.opts.includes(r.ok) && new Set(r.opts).size === 4), 'הגשר: בכל מנה 4 אפשרויות שונות והתשובה ביניהן');
check(D.TRIVIA.length >= 20 && D.TRIVIA.every(r => r.opts.includes(r.ok)), 'טריוויה: 20 שאלות והתשובה הנכונה בין האפשרויות');
check(D.TF.length >= 10 && D.TF.every(r => typeof r.t === 'boolean' && r.s && r.why), 'נכון או לא נכון: לפחות 10 משפטים תקינים');
check(D.DISHES_MEM.length >= 6 && D.DISHES_MEM_BIG.length >= 10 && new Set(D.DISHES_MEM_BIG).size === D.DISHES_MEM_BIG.length, 'זוגות מהתפריט: מספיק מנות ובלי כפולות');
const missing = D.PHOTOS.filter(p => !fs.existsSync(path.join(ROOT, p.src)));
check(missing.length === 0, `תמונות: כל ${D.PHOTOS.length} הקבצים קיימים` + (missing.length ? ' (חסר: ' + missing.map(p => p.src).join(', ') + ')' : ''));
check(new Set(D.PHOTOS.map(p => p.name)).size === D.PHOTOS.length, 'תמונות: אין שני שמות זהים');
const big = D.PHOTOS.filter(p => fs.existsSync(path.join(ROOT, p.src)) && fs.statSync(path.join(ROOT, p.src)).size > 300 * 1024);
check(big.length === 0, 'תמונות: כולן מתחת ל-300KB' + (big.length ? ' (' + big.map(p => p.src).join(', ') + ')' : ''));
const cnt = {}; D.WHEEL.forEach(k => cnt[k] = (cnt[k] || 0) + 1);
check(D.WHEEL.length === 20 && Object.keys(D.PRIZES).every(k => D.PRIZES[k].slices === cnt[k]), 'גלגל: 20 משבצות ומספר המשבצות של כל פרס תואם');
check(D.WHEEL.join(',') === 'K,M,R,K,T,M,K,V,R,M,K,Z,R,K,M,T,R,K,V,M', 'גלגל: 20 משבצות בסדר הקבוע');
const allText = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check(!/שירנסקי(?!\s*מארח)(?![-\w])/.test(allText.replace(/shiranski/gi, '')), '"שירנסקי מארח" תמיד בשם המלא');
const og = path.join(ROOT, 'img/og.jpg');
check(fs.existsSync(og) && fs.statSync(og).size < 300 * 1024, 'תצוגה מקדימה לוואטסאפ: og.jpg קיים ומתחת ל-300KB');
const head = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check(/og:image" content="https:\/\/shiranskihosting\.github\.io\/shiranski-game\/img\/og\.jpg"/.test(head) && /og:title/.test(head) && /og:description/.test(head), 'תצוגה מקדימה לוואטסאפ: תגיות og במקום');
for (const f of ['img/ui/trivia.svg', 'img/ui/flavor.svg', 'img/ui/photo.svg', 'img/ui/pairs.svg']) check(fs.existsSync(path.join(ROOT, f)), 'איור קיים: ' + f);
require('./server')(check);

// ---------- 2. Playing the game in a phone-size browser ----------
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // fake game server: statistics → 'ok', spin → the next prepared answer
  let nextSpin = null; const spinBodies = [];
  await page.route('https://script.google.com/**', r => {
    const body = r.request().postData() || '';
    if (body.includes('"a":"spin"')) { spinBodies.push(JSON.parse(body)); return r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify(nextSpin) }); }
    r.fulfill({ status: 200, body: 'ok' });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const width = () => page.evaluate(() => document.documentElement.scrollWidth);
  const visible = () => page.evaluate(() => [...document.querySelectorAll('.screen')].find(s => !s.hidden).id);
  const fresh = async () => { await page.goto(URL); await page.evaluate(() => { localStorage.clear(); }); await page.goto(URL, { waitUntil: 'load' }); };

  console.log('משחק');
  await fresh();
  check(await page.locator('.tile').count() === 4, 'תפריט ראשי: 4 קטגוריות');
  check(await width() <= 390, 'תפריט ראשי: אין גלילה הצידה');
  check((await page.getAttribute('#bookBtn', 'href')) === D.TALLY_URL, 'כפתור הזמנת מקום מוביל לטופס Tally');
  check((await page.textContent('#startBtn')).includes('נכון או לא נכון'), 'תפריט ראשי: כפתור "להתחיל לשחק" מציע משחק קצר');
  await page.click('#startBtn');
  check(await visible() === 'tf', 'כפתור "להתחיל לשחק" פותח את המשחק');
  for (let i = 0; i < 10; i++) { await page.click('#f_choices .tfbtn >> nth=0'); await page.click('#f_next'); }
  check(await visible() === 'done' && (await page.textContent('#d_wheel')).includes('גלגל המזל נפתח'), 'מסך סיום: אחרי המשחק הראשון כתוב שהגלגל נפתח');
  check((await page.textContent('#d_next')).includes(D.GAME_ORDER ? 'מה בצלחת?' : ''), 'מסך סיום: כפתור "למשחק הבא" עם המשחק הבא בתור');
  await page.evaluate(() => { localStorage.clear(); S = FRESH(); save(); renderLobby(); show('lobby'); });
  for (const c of ['trivia', 'flavor', 'photo', 'pairs']) {
    await page.click(`[data-c="${c}"]`);
    check(await visible() === 'category' && await width() <= 390, `קטגוריה ${c}: נפתחת ונכנסת למסך`);
    await page.click('#category [data-back]');
  }
  const play = async (cat, game, loop) => {
    await page.click(`[data-c="${cat}"]`); await page.click(`[data-g="${game}"]`);
    check(await width() <= 390, `${game}: נכנס למסך`);
    await loop();
    const done = await page.evaluate(g => JSON.parse(localStorage.getItem('shiranski-game-v1')).done[g] === true, game);
    check(done, `${game}: אפשר לשחק עד הסוף והתוצאה נשמרת`);
    check(await visible() === 'done' && (await page.textContent('#d_game')) === await page.evaluate(g => GAMES.find(x => x.id === g).name, game), `${game}: בסוף מסך סיום עם שם המשחק`);
    await page.click('#d_back');
    check(await visible() === 'category', `${game}: מהמסך סיום חוזרים לקטגוריה`);
    await page.click('#category [data-back]');
  };
  await play('trivia', 'trivia', async () => { for (let i = 0; i < 20; i++) { await page.click('#t_choices .choice >> nth=0'); await page.click('#t_next'); } });
  await play('trivia', 'tf', async () => {
    for (let i = 0; i < 10; i++) { await page.click('#f_choices .tfbtn >> nth=1'); await page.click('#f_next'); }
    check(await page.isVisible('#d_badge') && (await page.textContent('#d_badge')).includes(D.BADGES.trivia.name) && (await page.textContent('#d_badge')).includes('סוד מהמטבח'), 'סיום קטגוריה: תג וסוד מהמטבח');
  });
  await play('flavor', 'bridge', async () => { for (let i = 0; i < 20; i++) { await page.click('#b_choices .choice >> nth=0'); await page.click('#b_next'); } });
  await play('flavor', 'odd', async () => { for (let i = 0; i < 10; i++) { await page.click('#o_choices .oddbtn >> nth=0'); await page.click('#o_next'); } });
  await play('photo', 'puzzle', async () => {
    for (let r = 0; r < 3; r++) {
      const ids = await page.$$eval('#p_photos .ph', els => els.map(e => e.dataset.id));
      for (const id of ids) { await page.click(`#p_photos .ph[data-id="${id}"]`); await page.click(`#p_names .choice[data-id="${id}"]`); }
      await page.click('#p_next');
    }
  });
  await play('photo', 'zoom', async () => { for (let i = 0; i < 4; i++) { await page.click('#z_choices .choice >> nth=0'); await page.click('#z_next'); } });
  await play('photo', 'jigsaw', async () => {
    for (let r = 0; r < 3; r++) {
      await page.evaluate(() => { for (let k = 0; k < 9; k++) { const pos = j.order.indexOf(k); if (pos !== k) { tapJig(k); tapJig(pos); } } });
      await page.click('#j_next');
    }
  });
  const pairs = async () => {
    const n = await page.locator('#m_grid .mem').count();
    const keys = await page.$$eval('#m_grid .mem', els => els.map(e => e.dataset.k));
    const by = {}; keys.forEach((k, i) => (by[k] = by[k] || []).push(i));
    for (const k in by) { await page.click(`#m_grid .mem >> nth=${by[k][0]}`); await page.click(`#m_grid .mem >> nth=${by[k][1]}`); await page.waitForTimeout(420); }
    await page.waitForSelector('#done:not([hidden])');
    return n;
  };
  await play('pairs', 'memory', async () => check(await pairs() === 12, 'זוגות מהתפריט: 12 קלפים'));
  await play('pairs', 'memory2', async () => check(await pairs() === 20, 'שולחן גדול: 20 קלפים'));

  console.log('גלגל המזל המדורג');
  check(D.WHEEL.join(',') === 'K,M,R,K,T,M,K,V,R,M,K,Z,R,K,M,T,R,K,V,M', 'גלגל: סדר המשבצות זהה לשרת');
  const setDone = n => page.evaluate(n => { for (const [i, g] of GAMES.entries()) S.done[g.id] = i < n; save(); renderLobby(); show('lobby'); }, n);
  await page.evaluate(() => { localStorage.clear(); S = FRESH(); save(); renderLobby(); show('lobby'); });
  check((await page.textContent('#promo')).includes('שחקו כדי לקבל ממני מתנה'), 'פרומו: "שחקו כדי לקבל ממני מתנה!"');
  check((await page.textContent('#promo_line')).includes('מסיימים משחק אחד'), 'פרומו: לפני משחק ראשון הגלגל סגור');
  await page.click('#finishBtn');
  check(await page.locator('#r_spin').count() === 0, 'מסך תוצאה: בלי משחק אחד אין גלגל');
  await page.click('#result [data-back]');
  await setDone(1);
  check(/רמה 1 .*30%.*5 סיבובים/.test(await page.textContent('#promo_line')), 'פרומו: אחרי משחק אחד – רמה 1, סיכוי 30%, 5 סיבובים');
  await page.click('#promo');
  check(await visible() === 'wheel' && await page.locator('#w_wheel .slot.closed').count() === 14, 'גלגל רמה 1: 14 משבצות ריקות (כהות)');
  check((await page.textContent('#w_next')).includes('עוד 2 משחקים'), 'גלגל: כתוב כמה משחקים עד הרמה הבאה');
  await page.click('#w_spin');
  check(await page.evaluate(() => S.spins) === 0 && spinBodies.length === 0, 'גלגל: אי אפשר לסובב בלי שם וטלפון');
  await page.fill('#w_name', 'בדיקה אוטומטית'); await page.fill('#w_phone', '0500000000');
  await page.click('#w_spin');
  check(spinBodies.length === 0 && (await page.textContent('#w_warn')).includes('100%'), 'גלגל: לפני סיבוב מוקדם מופיעה אזהרה, בלי סיבוב');
  nextSpin = { ok: true, slot: 1, win: false, k: '', best: '', code: '', upgraded: false, spinsLeft: 4, level: 1 };
  await page.click('#w_spin'); await page.waitForTimeout(6000);
  check(spinBodies.length === 1 && spinBodies[0].games === 1 && spinBodies[0].phone === '0500000000', 'גלגל: השרת מקבל שם, טלפון ומספר משחקים');
  check((await page.textContent('#w_head')).includes('לא הפעם') && await page.evaluate(() => S.spins) === 1 && (await page.textContent('#w_status')).includes('4 סיבובים'), 'גלגל: משבצת ריקה – "לא הפעם", נשארו 4');
  await page.click('#wheel [data-back]');
  await setDone(9);
  await page.click('#promo');
  check(await page.locator('#w_wheel .slot.closed').count() === 0 && (await page.textContent('#w_head')).includes('100%'), 'גלגל מלא אחרי 9 משחקים: כל המשבצות פתוחות, 100%');
  check(await page.locator('#w_form').isHidden(), 'גלגל: השם והטלפון נשמרים לסיבוב הבא');
  nextSpin = { ok: true, slot: 11, win: true, k: 'Z', best: 'Z', code: 'SH-7E57A1', upgraded: false, spinsLeft: 3, level: 4 };
  await page.click('#w_spin'); await page.waitForTimeout(6000);
  const prize = await page.evaluate(() => S.prize);
  check(spinBodies.length === 2 && prize && prize.k === 'Z' && prize.code === 'SH-7E57A1', 'גלגל: ברמה 4 בלי אזהרה; הפרס והקוד מהשרת נשמרים');
  check((await page.textContent('#w_reveal')).includes('SH-7E57A1') && await width() <= 390, 'גלגל: הקוד מוצג ללקוח ונכנס למסך');
  nextSpin = { ok: true, slot: 0, win: true, k: 'K', best: 'Z', code: 'SH-7E57A1', upgraded: false, spinsLeft: 2, level: 4 };
  await page.click('#w_spin'); await page.waitForTimeout(6000);
  check(await page.evaluate(() => S.prize.k) === 'Z' && (await page.textContent('#w_reveal')).includes('נשאר לך הפרס הגבוה'), 'גלגל: פרס נמוך יותר לא מחליף את הפרס השמור');
  nextSpin = { ok: false, err: 'nospins', best: 'Z', code: 'SH-7E57A1', spinsLeft: 0, level: 4 };
  await page.click('#w_spin'); await page.waitForTimeout(600);
  check(await page.evaluate(() => S.spins) === 5 && await page.isDisabled('#w_spin'), 'גלגל: אחרי 5 סיבובים הכפתור נסגר');

  console.log('נתונים סטטיסטיים');
  check(D.TRACK_URL === '' || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(D.TRACK_URL), 'נתונים: כתובת הגיליון ריקה או כתובת Apps Script תקינה');
  const stats = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  stats.on('pageerror', e => errors.push(e.message));
  const got = [];
  await stats.route('https://script.google.com/**', r => { got.push(r.request().postData()); r.fulfill({ status: 200, body: 'ok' }); });
  await stats.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await stats.addInitScript(() => { window.TRACK_TEST_URL = 'https://script.google.com/macros/s/TEST/exec'; });
  await stats.goto(URL + '?src=qr'); await stats.evaluate(() => localStorage.clear()); await stats.goto(URL + '?src=qr', { waitUntil: 'load' });
  await stats.click('[data-c="trivia"]'); await stats.click('[data-g="tf"]');
  for (let i = 0; i < 10; i++) { await stats.click('#f_choices .tfbtn >> nth=0'); await stats.click('#f_next'); }
  await stats.evaluate(() => TRACK.flush());
  await stats.waitForTimeout(400);
  const evs = got.flatMap(b => { const j = JSON.parse(b); return j.ev.map(e => ({ s: j.s, p: j.p, e: e[1], g: e[2], v: e[3] })); });
  check(evs.some(e => e.e === 'כניסה' && e.v === 'חדש' && e.s === 'qr'), 'נתונים: כניסה של שחקן חדש נרשמת עם המקור מהקישור (?src=qr)');
  check(evs.some(e => e.e === 'התחלה' && e.g === 'נכון או לא נכון') && evs.some(e => e.e === 'סיום' && e.g === 'נכון או לא נכון'), 'נתונים: התחלה וסיום משחק נרשמים בשם המשחק');
  check(evs.length > 0 && evs.every(e => /^[a-z0-9]{6,16}$/.test(e.p)) && got.every(b => !/"name"|"phone"/.test(b)), 'נתונים: אנונימיים, בלי שם או טלפון');
  await stats.close();

  console.log('כללי');
  check(errors.length === 0, 'אין שגיאות JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails.length ? `\n✗ ${fails.length} בדיקות נכשלו. האתר לא עודכן.` : '\n✓ כל הבדיקות עברו.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
