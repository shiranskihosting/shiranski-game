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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + ';this.D={BRAND,PHOTOS,BRIDGE,TRIVIA,TF,DISHES_MEM,DISHES_MEM_BIG,PRIZES,WHEEL,TALLY_URL,SPIN_URL};', ctx);
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
check(D.WHEEL.join(',') === 'K,M,R,K,T,M,K,V,R,M,K,Z,R,K,M,T,R,K,V,M', 'גלגל: סדר המשבצות זהה לסדר ב-Make');
const allText = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check(!/שירנסקי(?!\s*מארח)(?![-\w])/.test(allText.replace(/shiranski/gi, '')), '"שירנסקי מארח" תמיד בשם המלא');
for (const f of ['img/ui/trivia.svg', 'img/ui/flavor.svg', 'img/ui/photo.svg', 'img/ui/pairs.svg']) check(fs.existsSync(path.join(ROOT, f)), 'איור קיים: ' + f);

// ---------- 2. Playing the game in a phone-size browser ----------
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://hook.eu1.make.com/**', r => r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ slot: 11, k: 'Z', code: 'SH-7E57A1' }) }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const width = () => page.evaluate(() => document.documentElement.scrollWidth);
  const visible = () => page.evaluate(() => [...document.querySelectorAll('.screen')].find(s => !s.hidden).id);
  const fresh = async () => { await page.goto(URL); await page.evaluate(() => { localStorage.clear(); }); await page.goto(URL, { waitUntil: 'load' }); };

  console.log('משחק');
  await fresh();
  check(await page.locator('.tile').count() === 4, 'תפריט ראשי: 4 קטגוריות');
  check(await width() <= 390, 'תפריט ראשי: אין גלילה הצידה');
  check((await page.getAttribute('#bookBtn', 'href')) === D.TALLY_URL, 'כפתור הזמנת מקום מוביל לטופס Tally');
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
    check(await visible() === 'category', `${game}: בסוף חוזרים לקטגוריה`);
    await page.click('#category [data-back]');
  };
  await play('trivia', 'trivia', async () => { for (let i = 0; i < 20; i++) { await page.click('#t_choices .choice >> nth=0'); await page.click('#t_next'); } });
  await play('trivia', 'tf', async () => { for (let i = 0; i < 10; i++) { await page.click('#f_choices .tfbtn >> nth=1'); await page.click('#f_next'); } });
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
    await page.click('#m_done');
    return n;
  };
  await play('pairs', 'memory', async () => check(await pairs() === 12, 'זוגות מהתפריט: 12 קלפים'));
  await play('pairs', 'memory2', async () => check(await pairs() === 20, 'שולחן גדול: 20 קלפים'));

  console.log('גלגל המזל');
  await page.evaluate(() => { localStorage.clear(); S = FRESH(); for (const g of GAMES.slice(1)) S.done[g.id] = true; save(); renderLobby(); });
  await page.click('#finishBtn');
  check(await page.locator('#r_spin').count() === 0, 'מסך תוצאה: לפני שמסיימים את כל המשחקים הגלגל סגור');
  await page.click('#result [data-back]');
  await page.evaluate(() => { for (const g of GAMES) S.done[g.id] = true; save(); renderLobby(); });
  check((await page.textContent('#promo')).includes('שחקו כדי לקבל ממני מתנה'), 'פרומו: "שחקו כדי לקבל ממני מתנה!"');
  await page.click('#finishBtn');
  check(await page.locator('#r_spin').count() === 1, 'מסך תוצאה: מי שסיים את כל המשחקים מקבל את הגלגל, בלי קשר לניקוד');
  await page.click('#r_spin');
  await page.click('#w_spin');
  check(await page.evaluate(() => S.prize) === null, 'גלגל: אי אפשר לסובב בלי שם וטלפון');
  await page.fill('#w_name', 'בדיקה אוטומטית'); await page.fill('#w_phone', '0500000000');
  await page.click('#w_spin'); await page.waitForTimeout(6000);
  const prize = await page.evaluate(() => S.prize);
  check(prize && prize.k === 'Z' && prize.code === 'SH-7E57A1', 'גלגל: הפרס והקוד מגיעים מ-Make ונשמרים');
  check(await width() <= 390, 'גלגל: נכנס למסך');
  check((await page.textContent('#w_reveal')).includes('SH-7E57A1'), 'גלגל: הקוד מוצג ללקוח');

  console.log('כללי');
  check(errors.length === 0, 'אין שגיאות JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails.length ? `\n✗ ${fails.length} בדיקות נכשלו. האתר לא עודכן.` : '\n✓ כל הבדיקות עברו.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
