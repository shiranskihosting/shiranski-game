/**
 * המטבח של שירנסקי מארח – קליטת נתוני משחק אנונימיים
 * מודבק ב: גיליון "נתוני משחק – שירנסקי מארח" > תוספים > Apps Script
 * פרסום: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 *
 * המשחק שולח: {p: מזהה שחקן, s: מקור, d: מכשיר, ev: [[זמן, אירוע, משחק, ערך], ...]}
 * כל אירוע הופך לשורה בלשונית "אירועים". אין כאן שמות או טלפונים.
 */
const SHEET = 'אירועים';
const EVENTS = ['כניסה', 'התחלה', 'סיום', 'גלגל', 'סיבוב', 'הזמנה', 'שיתוף'];
const MAX_EVENTS = 40;

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f<>=+@]/g, '').slice(0, max);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const p = clean(body.p, 16);
    if (!/^[a-z0-9]{6,16}$/.test(p) || !Array.isArray(body.ev)) return out('bad');
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
    if (!rows.length) return out('empty');
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET);
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
    return out('ok');
  } catch (err) {
    return out('error');
  }
}

function doGet() {
  return out('ok');
}

function out(msg) {
  return ContentService.createTextOutput(msg);
}
