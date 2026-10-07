/**
 * המטבח של שירנסקי מארח – שרת המשחק (Apps Script של הגיליון "נתוני משחק – שירנסקי מארח")
 *
 * שני תפקידים:
 * 1. נתונים אנונימיים: {p, s, d, ev:[[זמן, אירוע, משחק, ערך], ...]} → שורות בלשונית "אירועים".
 * 2. גלגל המזל המדורג: {a:"spin", name, phone, games} → הגרלה כאן בשרת, רישום בגיליון "קודי פרסים – שירנסקי מארח".
 *
 * פרסום: Deploy > Manage deployments > עריכה > Version: New version > Deploy (הכתובת נשארת אותה כתובת).
 * אחרי שינוי הרשאות: לבחור doGet ולהריץ Run פעם אחת כדי לאשר.
 */

/* ---------- הגדרות ---------- */
const STATS_SHEET = 'אירועים';
const EVENTS = ['כניסה', 'התחלה', 'סיום', 'גלגל', 'סיבוב', 'הזמנה', 'שיתוף'];
const MAX_EVENTS = 40;

const CODES_ID = '1l9FRHLbs9lEVBGqEiRxXD4J1mYrsHS5vKIpebmWlO3A'; // קודי פרסים – שירנסקי מארח
const CODES_TAB = 'Untitled';      // A:H נקראות ע"י "בודק קודי פרסים": תאריך, שעה, שם, טלפון, קוד, פרס, סטטוס, הערות
const SPINS_TAB = 'סיבובים';        // יומן של כל סיבוב, נוצר לבד

// חייב להיות זהה ל-WHEEL ב-js/data.js (הבדיקה האוטומטית משווה)
const WHEEL = 'K,M,R,K,T,M,K,V,R,M,K,Z,R,K,M,T,R,K,V,M'.split(',');
const LABEL = {K: '5% הנחה', M: '10% הנחה', R: '15% הנחה', T: '20% הנחה', V: 'ארוחה ל-3 במחיר של 2', Z: '2 זוגות במחיר של זוג'};
const RANK = {K: 1, M: 2, R: 3, T: 4, V: 5, Z: 6};        // מה נחשב פרס גבוה יותר
const OPENS_AT = {K: 1, M: 2, R: 3, T: 4, V: 4, Z: 4};    // באיזו רמה המשבצת נפתחת
const MAX_SPINS = 5;
const TOTAL_GAMES = 9;

/* ---------- כללי הגלגל (פונקציות טהורות, נבדקות אוטומטית) ---------- */
function levelFor(games) {
  games = Math.floor(Number(games) || 0);
  if (games >= TOTAL_GAMES) return 4;
  if (games >= 6) return 3;
  if (games >= 3) return 2;
  if (games >= 1) return 1;
  return 0;
}
function slotOpen(slot, level) { return OPENS_AT[WHEEL[slot]] <= level; }
function chanceFor(level) { return WHEEL.filter((k, i) => slotOpen(i, level)).length / WHEEL.length; }
function digits(v) { return String(v == null ? '' : v).replace(/\D/g, '').replace(/^972/, '0'); }
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>=+@]/g, '').trim().slice(0, max); }
function prizeKey(label) { for (const k in LABEL) if (LABEL[k] === label) return k; return ''; }
function newCode() { return 'SH-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase(); }

/* ---------- כניסה ---------- */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return text('bad'); }
  if (body && body.a === 'spin') return json(spin(body));
  return text(stats(body));
}
function doGet() { return text('ok'); }
function text(msg) { return ContentService.createTextOutput(msg); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- 1. נתונים ---------- */
function stats(body) {
  try {
    const p = clean(body.p, 16);
    if (!/^[a-z0-9]{6,16}$/.test(p) || !Array.isArray(body.ev)) return 'bad';
    const s = clean(body.s, 24) || 'ישיר';
    const d = body.d === 'מחשב' ? 'מחשב' : 'טלפון';
    const now = Date.now();
    const rows = body.ev.slice(0, MAX_EVENTS)
      .filter(x => Array.isArray(x) && EVENTS.indexOf(x[1]) >= 0)
      .map(x => {
        const t = Number(x[0]);
        const when = (t > now - 86400000 && t <= now + 60000) ? new Date(t) : new Date();
        return [when, p, s, x[1], clean(x[2], 40), clean(x[3], 24), d];
      });
    if (!rows.length) return 'empty';
    withLock(() => {
      const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STATS_SHEET);
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    });
    return 'ok';
  } catch (err) {
    return 'error';
  }
}

/* ---------- 2. גלגל המזל ---------- */
function spin(body) {
  const name = clean(body.name, 60);
  const phone = digits(body.phone).slice(0, 15);
  const level = levelFor(body.games);
  if (name.length < 2 || phone.length < 9) return {ok: false, err: 'details'};
  if (level < 1) return {ok: false, err: 'locked'};
  try {
    return withLock(() => {
      const book = SpreadsheetApp.openById(CODES_ID);
      const codes = book.getSheetByName(CODES_TAB);
      let log = book.getSheetByName(SPINS_TAB);
      if (!log) {
        log = book.insertSheet(SPINS_TAB);
        log.appendRow(['תאריך', 'שעה', 'שם', 'טלפון', 'רמה', 'משחקים', 'יצא', 'פרס בסיבוב', 'הפרס השמור', 'קוד']);
        log.setFrozenRows(1);
      }
      // how many spins this phone already used
      const logVals = log.getLastRow() > 1 ? log.getRange(2, 4, log.getLastRow() - 1, 1).getValues() : [];
      const used = logVals.filter(r => digits(r[0]) === phone).length;
      // this phone's prize row (one code per player)
      const last = codes.getLastRow();
      const vals = last > 1 ? codes.getRange(2, 1, last - 1, 8).getValues() : [];
      let rowIdx = -1;
      for (let i = vals.length - 1; i >= 0; i--) if (digits(vals[i][3]) === phone) { rowIdx = i; break; }
      const row = rowIdx >= 0 ? vals[rowIdx] : null;
      const bestK = row ? prizeKey(row[5]) : '';
      const code = row ? String(row[4]) : '';
      if (row && String(row[6]).trim() === 'מומש') {
        return {ok: false, err: 'redeemed', best: bestK, code: code, spinsLeft: 0, level: level};
      }
      if (used >= MAX_SPINS) {
        return {ok: false, err: 'nospins', best: bestK, code: code, spinsLeft: 0, level: level};
      }
      // the draw: every one of the 20 slots is equally likely; a slot that is still closed at this level is empty
      const slot = Math.floor(Math.random() * WHEEL.length);
      const win = slotOpen(slot, level);
      const k = win ? WHEEL[slot] : '';
      const tz = 'Asia/Jerusalem', now = new Date();
      const date = Utilities.formatDate(now, tz, 'dd/MM/yyyy'), time = Utilities.formatDate(now, tz, 'HH:mm');
      let newBest = bestK, newCodeVal = code, upgraded = false;
      if (win && (!bestK || RANK[k] > RANK[bestK])) {
        upgraded = !!bestK;
        newBest = k;
        if (row) {
          codes.getRange(rowIdx + 2, 6).setValue(LABEL[k]);
          const note = String(row[7] || '');
          codes.getRange(rowIdx + 2, 8).setValue((note ? note + ' · ' : '') + 'שודרג מ-' + LABEL[bestK] + ' ב-' + date);
        } else {
          newCodeVal = newCode();
          codes.appendRow([date, time, name, "'" + phone, newCodeVal, LABEL[k], 'חדש', '']);
        }
      }
      log.appendRow([date, time, name, "'" + phone, level, Math.floor(Number(body.games) || 0),
        win ? 'זכייה' : 'ריק', win ? LABEL[k] : '', newBest ? LABEL[newBest] : '', newCodeVal]);
      return {ok: true, slot: slot, win: win, k: k, best: newBest, code: newCodeVal, upgraded: upgraded,
        spinsLeft: MAX_SPINS - used - 1, level: level};
    });
  } catch (err) {
    return {ok: false, err: 'server'};
  }
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}
