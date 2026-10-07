// Checks the game server (tools/stats-apps-script.gs) in Node, with fake Google Sheets.
// The wheel draw and the prize codes live there, so its rules are tested before every publish.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fakeSheet(rows) {
  const data = rows.map(r => r.slice());
  return {
    data,
    getLastRow: () => data.length,
    appendRow: r => data.push(r.slice()),
    setFrozenRows: () => {},
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => data.slice(r - 1, r - 1 + nr).map(row => { const out = []; for (let j = 0; j < nc; j++) out.push(row[c - 1 + j] ?? ''); return out; }),
      setValue: v => { while (data.length < r) data.push([]); data[r - 1][c - 1] = v; },
      setValues: vs => vs.forEach((row, i) => { while (data.length < r + i) data.push([]); row.forEach((v, j) => data[r - 1 + i][c - 1 + j] = v); }),
    }),
  };
}

module.exports = function serverChecks(check) {
  const src = fs.readFileSync(path.join(ROOT, 'tools/stats-apps-script.gs'), 'utf8');
  let rand = 0;
  const books = {};
  const ctx = {
    Math: Object.create(Math, { random: { value: () => rand } }),
    Date, JSON, String, Number, Array, Object,
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => 'abcdef12-3456-7890-abcd-ef1234567890', formatDate: (d, tz, f) => (f === 'HH:mm' ? '12:00' : '07/10/2026') },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ t, setMimeType() { return this; } }) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => books.stats,
      openById: id => books[id],
    },
  };
  vm.createContext(ctx);
  vm.runInContext(src + ';this.API={spin,stats,levelFor,chanceFor,WHEEL,LABEL,doPost};', ctx);
  const A = ctx.API;
  const reset = () => {
    const tabs = { 'Untitled': fakeSheet([['תאריך', 'שעה', 'שם', 'טלפון', 'קוד', 'פרס', 'סטטוס', 'הערות']]) };
    books['1l9FRHLbs9lEVBGqEiRxXD4J1mYrsHS5vKIpebmWlO3A'] = { getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = fakeSheet([])) };
    books.stats = { getSheetByName: n => (n === 'אירועים' ? (books.statsTab = books.statsTab || fakeSheet([['h']])) : null) };
    return tabs;
  };
  const slotOf = k => A.WHEEL.indexOf(k);
  const at = slot => { rand = (slot + 0.5) / 20; };
  const go = (games, phone = '050-1234567') => A.spin({ a: 'spin', name: 'בדיקה', phone, games });

  console.log('שרת הגלגל');
  check(src.includes("'" + 'K,M,R,K,T,M,K,V,R,M,K,Z,R,K,M,T,R,K,V,M' + "'"), 'שרת: סדר המשבצות זהה למשחק');
  check([0, 1, 2, 3, 5, 6, 8, 9].map(A.levelFor).join() === '0,1,1,2,2,3,3,4', 'שרת: רמה לפי מספר משחקים (1–2, 3–5, 6–8, 9)');
  check([1, 2, 3, 4].map(l => Math.round(A.chanceFor(l) * 100)).join() === '30,55,75,100', 'שרת: סיכוי זכייה 30% · 55% · 75% · 100%');

  let tabs = reset();
  at(slotOf('Z')); let r = go(0);
  check(!r.ok && r.err === 'locked', 'שרת: בלי משחק אחד לפחות אין סיבוב');
  r = A.spin({ a: 'spin', name: 'x', phone: '123', games: 9 });
  check(!r.ok && r.err === 'details', 'שרת: בלי שם וטלפון אין סיבוב');

  at(slotOf('M')); r = go(1);
  check(r.ok && !r.win && r.spinsLeft === 4 && !r.code && tabs['Untitled'].data.length === 1, 'שרת: ברמה 1 משבצת 10% ריקה, בלי קוד, נשארו 4');
  at(slotOf('K')); r = go(2);
  check(r.ok && r.win && r.k === 'K' && /^SH-[0-9A-F]{6}$/.test(r.code) && tabs['Untitled'].data.length === 2, 'שרת: זכייה ראשונה יוצרת קוד ושורה בגיליון');
  const code = r.code;
  at(slotOf('R')); r = go(6);
  check(r.ok && r.win && r.best === 'R' && r.upgraded && r.code === code && tabs['Untitled'].data[1][5] === '15% הנחה', 'שרת: פרס גבוה יותר משדרג את אותו קוד');
  at(slotOf('K')); r = go(9, '972501234567');
  check(r.ok && r.win && r.best === 'R' && !r.upgraded && tabs['Untitled'].data[1][5] === '15% הנחה', 'שרת: פרס נמוך יותר לא מוריד את הפרס (גם עם 972)');
  at(slotOf('Z')); r = go(9);
  check(r.ok && r.best === 'Z' && r.spinsLeft === 0, 'שרת: הסיבוב החמישי, הגלגל המלא');
  r = go(9);
  check(!r.ok && r.err === 'nospins' && r.best === 'Z', 'שרת: אחרי 5 סיבובים אין עוד');
  check(tabs['סיבובים'].data.length === 6 && tabs['Untitled'].data.length === 2, 'שרת: כל סיבוב ביומן, קוד אחד לשחקן');

  tabs = reset();
  tabs['Untitled'].data.push(['06/10/2026', '08:27', 'לקוחה', '0546306131', 'SH-F98DAC', '5% הנחה', 'מומש', '']);
  at(slotOf('Z')); r = go(9, '0546306131');
  check(!r.ok && r.err === 'redeemed', 'שרת: מי שכבר מימש פרס לא מסובב שוב');

  reset();
  const out = A.doPost({ postData: { contents: JSON.stringify({ p: 'abc123def0', s: 'qr', d: 'טלפון', ev: [[Date.now(), 'כניסה', '', 'חדש'], [0, 'זדוני', '', '']] }) } });
  check(out.t === 'ok' && books.statsTab.data.length === 2 && books.statsTab.data[1][2] === 'qr', 'שרת: נתונים נרשמים, אירוע לא מוכר נזרק');
};
