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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + ';this.D={BRAND,PHOTOS,BRIDGE,TRIVIA,TF,DISHES_MEM,DISHES_MEM_BIG,PRIZES,WHEEL,TALLY_URL,SPIN_URL,TRACK_URL,BADGES,GAME_ORDER,SEASONS};', ctx);
const D = ctx.D;
check(D.BRIDGE.length >= 20, `הגשר: לפחות 20 מנות (${D.BRIDGE.length})`);
check(D.BRIDGE.every(r => r.opts.includes(r.ok) && new Set(r.opts).size === 4), 'הגשר: בכל מנה 4 אפשרויות שונות והתשובה ביניהן');
check(D.TRIVIA.length >= 20 && D.TRIVIA.every(r => r.opts.includes(r.ok)), 'טריוויה: 20 שאלות והתשובה הנכונה בין האפשרויות');
check(D.TF.length >= 10 && D.TF.every(r => typeof r.t === 'boolean' && r.s && r.why), 'נכון או לא נכון: לפחות 10 משפטים תקינים');
check(D.DISHES_MEM.length >= 6 && new Set(D.DISHES_MEM).size === D.DISHES_MEM.length, 'זוגות מהתפריט: מספיק מנות ובלי כפולות');
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
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
  check(await page.locator('.tile').count() === 4, 'תפריט ראשי: 4 קטגוריות') ; check(await page.locator('#finishBtn').count() === 0, 'תפריט ראשי: בלי כפתור "לתוצאה ולשיתוף"') ; check(await page.evaluate(() => GAMES.length) === 7, 'סך הכול 7 משחקים');
  check(await width() <= 390, 'תפריט ראשי: אין גלילה הצידה');
  check((await page.getAttribute('#bookBtn', 'href')) === D.TALLY_URL, 'כפתור הזמנת מקום מוביל לטופס Tally (בלי פרטים כשאין)');
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
  await play('trivia', 'trivia', async () => { for (let i = 0; i < 10; i++) { await page.click('#t_choices .choice >> nth=0'); await page.click('#t_next'); } });
  await play('trivia', 'tf', async () => {
    for (let i = 0; i < 10; i++) { await page.click('#f_choices .tfbtn >> nth=1'); await page.click('#f_next'); }
    check(await page.isVisible('#d_badge') && (await page.textContent('#d_badge')).includes(D.BADGES.trivia.name) && (await page.textContent('#d_badge')).includes('סוד מהמטבח'), 'סיום קטגוריה: תג וסוד מהמטבח');
  });
  await play('flavor', 'bridge', async () => { for (let i = 0; i < 10; i++) { await page.click('#b_choices .choice >> nth=0'); await page.click('#b_next'); } });
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

  console.log('כפתור אחורה בטלפון');
  const back = async () => { await page.evaluate(() => history.back()); await page.waitForTimeout(250); };
  await page.evaluate(() => { localStorage.clear(); S = FRESH(); save(); renderLobby(); show('lobby'); });
  await page.click('[data-c="photo"]'); await page.click('[data-g="zoom"]');
  await back(); check(await visible() === 'category', 'אחורה ממשחק: חוזרים לקטגוריה');
  await back(); check(await visible() === 'lobby' && await page.isHidden('#exitDlg'), 'אחורה מקטגוריה: חוזרים לתפריט הראשי');
  await back(); check(await visible() === 'lobby' && await page.isVisible('#exitDlg'), 'אחורה בתפריט הראשי: נפתח חלון "לצאת מהמשחק?"');
  await page.click('#exitStay'); check(await page.isHidden('#exitDlg') && await visible() === 'lobby', '"להישאר" סוגר את החלון ונשארים במשחק');

  console.log('גלגל המזל המדורג');
  check(D.WHEEL.join(',') === 'K,M,R,K,T,M,K,V,R,M,K,Z,R,K,M,T,R,K,V,M', 'גלגל: סדר המשבצות זהה לשרת');
  const setDone = n => page.evaluate(n => { for (const [i, g] of GAMES.entries()) S.done[g.id] = i < n; save(); renderLobby(); show('lobby'); }, n);
  await page.evaluate(() => { localStorage.clear(); S = FRESH(); save(); renderLobby(); show('lobby'); });
  check((await page.textContent('#promo')).includes('שחקו כדי לקבל ממני מתנה'), 'פרומו: "שחקו כדי לקבל ממני מתנה!"');
  check((await page.textContent('#promo_line')).includes('מסיימים משחק אחד'), 'פרומו: לפני משחק ראשון הגלגל סגור');
  await page.evaluate(() => renderResult());
  check(await page.locator('#r_spin').count() === 0, 'מסך תוצאה: בלי משחק אחד אין גלגל');
  await page.click('#result [data-back]');
  await setDone(1);
  check(/רמה 1 .*30%.*3 סיבובים/.test(await page.textContent('#promo_line')), 'פרומו: אחרי משחק אחד – רמה 1, סיכוי 30%, 3 סיבובים');
  await page.click('#promo');
  check(await visible() === 'wheel' && await page.locator('#w_wheel .slot.closed').count() === 14, 'גלגל רמה 1: 14 משבצות ריקות (כהות)');
  check((await page.textContent('#w_next')).includes('עוד 2 משחקים'), 'גלגל: כתוב כמה משחקים עד הרמה הבאה');
  await page.click('#w_spin');
  check(await page.evaluate(() => S.spins) === 0 && spinBodies.length === 0, 'גלגל: אי אפשר לסובב בלי שם וטלפון');
  check(await page.isVisible('#w_consent') && !(await page.isChecked('#w_consent')), 'גלגל: תיבת הסכמה לדיוור מופיעה ולא מסומנת מראש');
  await page.fill('#w_name', 'בדיקה אוטומטית'); await page.fill('#w_phone', '0500000000');
  await page.click('#w_spin');
  check(spinBodies.length === 0 && (await page.textContent('#w_warn')).includes('100%'), 'גלגל: לפני סיבוב מוקדם מופיעה אזהרה, בלי סיבוב');
  nextSpin = { ok: true, slot: 1, win: false, k: '', best: '', code: '', upgraded: false, spinsLeft: 2, level: 1 };
  await page.click('#w_spin'); await page.waitForTimeout(6000);
  check(spinBodies.length === 1 && spinBodies[0].games === 1 && spinBodies[0].phone === '0500000000', 'גלגל: השרת מקבל שם, טלפון ומספר משחקים');
  check(spinBodies[0].consent === false && typeof spinBodies[0].src === 'string', 'גלגל: בלי סימון נשלח "אין הסכמה", יחד עם המקור');
  check(await page.isVisible('#w_consent'), 'גלגל: מי שלא הסכים יכול לסמן בסיבוב הבא');
  await page.check('#w_consent');
  check((await page.textContent('#w_head')).includes('לא הפעם') && await page.evaluate(() => S.spins) === 1 && (await page.textContent('#w_status')).includes('2 סיבובים'), 'גלגל: משבצת ריקה – "לא הפעם", נשארו 2');
  await page.click('#wheel [data-back]');
  await setDone(7);
  await page.click('#promo');
  check(await page.locator('#w_wheel .slot.closed').count() === 0 && (await page.textContent('#w_head')).includes('100%'), 'גלגל מלא אחרי כל 7 המשחקים: כל המשבצות פתוחות, 100%');
  check(await page.locator('#w_form').isHidden(), 'גלגל: השם והטלפון נשמרים לסיבוב הבא');
  nextSpin = { ok: true, slot: 11, win: true, k: 'Z', best: 'Z', code: 'SH-7E57A1', upgraded: false, spinsLeft: 1, level: 4 };
  await page.click('#w_spin'); await page.waitForTimeout(6000);
  const prize = await page.evaluate(() => S.prize);
  check(spinBodies.length === 2 && prize && prize.k === 'Z' && prize.code === 'SH-7E57A1', 'גלגל: ברמה 4 בלי אזהרה; הפרס והקוד מהשרת נשמרים');
  check(spinBodies[1].consent === true && await page.isHidden('#w_consentbox'), 'גלגל: הסכמה נשלחת, והתיבה לא מוצגת שוב');
  check(spinBodies[1].games === 9 && spinBodies[1].played === 7, 'גלגל: אחרי 7 משחקים השרת מקבל את הרמה המלאה');
  check(await page.evaluate(() => [0,1,2,3,4,5,6,7].map(levelFor).join()) === '0,1,1,2,2,3,3,4', 'גלגל: רמות לפי 7 משחקים (1–2, 3–4, 5–6, 7)');
  check((await page.textContent('#w_reveal')).includes('SH-7E57A1') && await width() <= 390, 'גלגל: הקוד מוצג ללקוח ונכנס למסך');
  const bookHref = await page.getAttribute('#w_book', 'href');
  check(bookHref === D.TALLY_URL + '?name=' + encodeURIComponent('בדיקה אוטומטית') + '&phone=' + encodeURIComponent('+972500000000') + '&code=SH-7E57A1', 'טופס הזמנה: השם, הטלפון והקוד נשלחים לטופס מראש');
  check((await page.getAttribute('#bookBtn', 'href')) === bookHref, 'טופס הזמנה: גם הכפתור בתפריט הראשי ממלא את הפרטים');
  check(await page.locator('#w_copy').count() === 0, 'גלגל: אין כפתור "להעתיק את הקוד" (הקוד נכנס לטופס לבד)');
  await page.click('#w_card'); await page.waitForSelector('#cardDlg:not([hidden])');
  check(await page.evaluate(() => document.getElementById('cardImg').naturalWidth) === 1080, 'כרטיס פרס: נפתח כתמונה לשמירה (בלי חלון שיתוף)');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#cardDownload')]);
  const dlPath = await dl.path(); const png = fs.readFileSync(dlPath);
  check(dl.suggestedFilename() === 'shiranski-prize-SH-7E57A1.jpg' && png[0] === 0xFF && png[1] === 0xD8 && png.length > 30000, 'כרטיס פרס: "להוריד" שומר קובץ תמונה עם הקוד בשם');
  await page.click('#cardClose');
  nextSpin = { ok: true, slot: 0, win: true, k: 'K', best: 'Z', code: 'SH-7E57A1', upgraded: false, spinsLeft: 0, level: 4 };
  await page.click('#w_spin'); await page.waitForTimeout(6000);
  check(await page.evaluate(() => S.prize.k) === 'Z' && (await page.textContent('#w_reveal')).includes('נשאר לך הפרס הגבוה'), 'גלגל: פרס נמוך יותר לא מחליף את הפרס השמור');
  check(await page.evaluate(() => S.spins) === 3 && await page.isDisabled('#w_spin') && spinBodies.length === 3, 'גלגל: אחרי 3 סיבובים הכפתור נסגר');

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

  console.log('סט עונתי');
  check(D.SEASONS.every(x => x.items.length >= 6 && x.items.every(i => typeof i.t === 'boolean' && i.s && i.why) && x.from <= x.to && x.badge && x.badge.secret), 'סט עונתי: תוכן תקין');
  const sp = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  sp.on('pageerror', e => errors.push(e.message));
  await sp.route('https://script.google.com/**', r => r.fulfill({ status: 200, body: 'ok' }));
  await sp.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await sp.addInitScript(() => { window.TODAY_OVERRIDE = '2026-10-08'; });
  await sp.goto(URL); await sp.evaluate(() => localStorage.clear()); await sp.goto(URL, { waitUntil: 'load' });
  check(await sp.locator('#seasonBtn').count() === 0, 'סט עונתי: מחוץ לתאריכים הוא לא מופיע');
  await sp.close();
  const sp2 = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  sp2.on('pageerror', e => errors.push(e.message));
  await sp2.route('https://script.google.com/**', r => r.fulfill({ status: 200, body: 'ok' }));
  await sp2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await sp2.addInitScript(() => { window.TODAY_OVERRIDE = '2026-12-06'; });
  await sp2.goto(URL); await sp2.evaluate(() => localStorage.clear()); await sp2.goto(URL, { waitUntil: 'load' });
  check((await sp2.textContent('#seasonBtn')).includes('סט חנוכה') && (await sp2.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'סט עונתי: בחנוכה מופיע בתפריט ונכנס למסך');
  await sp2.click('#seasonBtn');
  const n = D.SEASONS[0].items.length;
  check((await sp2.textContent('#f_tot')) === String(n), 'סט עונתי: מספר המשפטים נכון');
  for (let i = 0; i < n; i++) { await sp2.click('#f_choices .tfbtn >> nth=0'); await sp2.click('#f_next'); }
  check((await sp2.textContent('#d_badge')).includes(D.SEASONS[0].badge.name) && await sp2.evaluate(() => gamesDone() === 0 && S.season.hanukkah2026 >= 0), 'סט עונתי: תג וסוד בסוף, והגלגל לא משתנה');
  await sp2.close();

  console.log('כללי');
  check(errors.length === 0, 'אין שגיאות JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails.length ? `\n✗ ${fails.length} בדיקות נכשלו. האתר לא עודכן.` : '\n✓ כל הבדיקות עברו.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
