/**
 * ASAY PIKOL CLUB — Google Sheets backend (Google Apps Script)
 *
 * Setup (details in README.md):
 *  1. Create a Google Sheet, open Extensions > Apps Script, paste this file.
 *  2. Project Settings > Script properties > add  ADMIN_PASSCODE  = your secret passcode
 *     (optional) add  OWNER_EMAIL  = email to notify on new reservations / messages.
 *  3. Run  setup()  once and accept permissions.
 *  4. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 *  5. Copy the Web app URL into assets/js/config.js (apiUrl).
 */

var SHEETS = {
  schedule:      { name: 'Schedule',      cols: ['id','type','day','date','start','end','title','level','location','slots','fee','notes','status'] },
  announcements: { name: 'Announcements', cols: ['id','title','category','date','pinned','body','status'] },
  reservations:  { name: 'Reservations',  cols: ['id','createdAt','sessionId','session','date','name','phone','email','players','level','notes'] },
  messages:      { name: 'Messages',      cols: ['id','createdAt','name','email','phone','topic','message'] }
};
var PUBLIC_READ = { schedule: true, announcements: true };
var MAX_LEN = 2000;

/* ---------- one-time setup ---------- */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (key) {
    var def = SHEETS[key], sh = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
    sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols]).setFontWeight('bold').setBackground('#d9ff3f');
    sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), def.cols.length).setNumberFormat('@'); // keep dates/times as text
    sh.setFrozenRows(1);
  });
  var s = ss.getSheetByName(SHEETS.schedule.name);
  if (s.getLastRow() < 2) {
    s.getRange(2, 1, 2, 13).setValues([
      ['s1','Weekly','Monday','','18:00','20:00','Beginner Bounce','Beginner','Court 1-2','16','P150','Paddles and balls provided','Open'],
      ['s2','Weekly','Friday','','19:00','22:00','Friday Night Smash','Intermediate','Court 1-4','20','P180','Fast games, friendly vibes','Open']
    ]);
  }
  var a = ss.getSheetByName(SHEETS.announcements.name);
  if (a.getLastRow() < 2) {
    a.getRange(2, 1, 1, 7).setValues([['a1','Welcome to our new website!','News', Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd'),'yes','Check the schedule and reserve your spot. See you on the court!','Published']]);
  }
  ss.deleteSheet(ss.getSheetByName('Sheet1') || ss.insertSheet('tmp')); // tidy default sheet if present
}

/* ---------- HTTP ---------- */
function doGet(e) {
  try {
    var p = e.parameter || {};
    if (p.action === 'list') return json({ ok: true, rows: readPublic(p.sheet) });
    return json({ ok: true, service: 'Asay Pikol Club API' });
  } catch (err) { return json({ ok: false, error: String(err.message || err) }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents), a = body.action;

    if (a === 'contact')  return json(submit('messages', body.data));
    if (a === 'reserve')  return json(submit('reservations', body.data));

    requireAdmin(body.passcode);
    if (a === 'auth')      return json({ ok: true });
    if (a === 'adminList') return json({ ok: true, rows: readAll(body.sheet) });
    if (a === 'save')      return json({ ok: true, row: save(body.sheet, body.row) });
    if (a === 'delete')    return json({ ok: true, deleted: remove(body.sheet, body.id) });
    return json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

/* ---------- helpers ---------- */
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function requireAdmin(pass) {
  var real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSCODE');
  if (!real) throw new Error('Set ADMIN_PASSCODE in Script properties first.');
  var ok = String(pass || '').length === real.length, diff = 0;
  for (var i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ String(pass || '').charCodeAt(i);
  if (!ok || diff !== 0) { Utilities.sleep(800); throw new Error('Wrong passcode'); }
}

function getSheet(key) {
  var def = SHEETS[key]; if (!def) throw new Error('Unknown sheet');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(def.name);
  if (!sh) throw new Error('Run setup() first');
  return { sh: sh, cols: def.cols };
}

function norm(v, col) {
  if (v instanceof Date) {
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(v, tz, (col === 'start' || col === 'end') ? 'HH:mm' : (col === 'createdAt' ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd'));
  }
  return v === null || v === undefined ? '' : String(v);
}

function readAll(key) {
  var g = getSheet(key), last = g.sh.getLastRow();
  if (last < 2) return [];
  var data = g.sh.getRange(2, 1, last - 1, g.cols.length).getValues();
  return data.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var o = {}; g.cols.forEach(function (c, i) { o[c] = norm(r[i], c); }); return o;
  });
}

function readPublic(key) {
  if (!PUBLIC_READ[key]) throw new Error('Not allowed');
  var rows = readAll(key);
  if (key === 'announcements') rows = rows.filter(function (r) { return (r.status || 'Published') === 'Published'; });
  if (key === 'schedule')      rows = rows.filter(function (r) { return r.status !== 'Hidden'; });
  return rows;
}

function clean(row, cols) {
  var o = {}; cols.forEach(function (c) { var v = row[c]; o[c] = v == null ? '' : String(v).slice(0, MAX_LEN); }); return o;
}

function newId() { return 'id' + Utilities.getUuid().slice(0, 8); }

function save(key, row) {
  if (!PUBLIC_READ[key]) throw new Error('Not editable');
  var g = getSheet(key), o = clean(row, g.cols);
  if (!o.id) o.id = newId();
  var last = g.sh.getLastRow(), rowIndex = -1;
  if (last >= 2) {
    var ids = g.sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === o.id) { rowIndex = i + 2; break; }
  }
  var values = [g.cols.map(function (c) { return o[c]; })];
  if (rowIndex > 0) g.sh.getRange(rowIndex, 1, 1, g.cols.length).setNumberFormat('@').setValues(values);
  else { rowIndex = last + 1; g.sh.getRange(rowIndex, 1, 1, g.cols.length).setNumberFormat('@').setValues(values); }
  return o;
}

function remove(key, id) {
  var g = getSheet(key), last = g.sh.getLastRow();
  if (last < 2) return false;
  var ids = g.sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) { g.sh.deleteRow(i + 2); return true; }
  return false;
}

function submit(key, data) {
  data = data || {};
  var cache = CacheService.getScriptCache(), k = 'rate_' + Math.floor(Date.now() / 3600000), n = Number(cache.get(k) || 0);
  if (n > 60) throw new Error('Too many requests, try later');
  cache.put(k, String(n + 1), 3700);

  var g = getSheet(key), o = clean(data, g.cols);
  if (key === 'messages' && (!o.name || !o.message)) throw new Error('Name and message are required');
  if (key === 'reservations' && (!o.name || !o.phone || !o.sessionId)) throw new Error('Name, phone and session are required');
  o.id = newId(); o.createdAt = new Date().toISOString();
  g.sh.appendRow(g.cols.map(function (c) { return o[c]; }));

  var owner = PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL');
  if (owner) {
    var subject = key === 'messages' ? 'New website message from ' + o.name : 'New reservation: ' + o.session + ' (' + o.name + ')';
    MailApp.sendEmail(owner, subject, JSON.stringify(o, null, 2));
  }
  return { ok: true };
}
