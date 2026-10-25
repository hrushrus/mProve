/**
 * Table helpers. Every tab is plain text with headers in row 1, so values are
 * read and written as strings and columns are found by header name.
 */

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Tab "' + name + '" is missing. Run mProve › Set up workbook first.');
  return sh;
}

function headers_(sh) {
  var lastCol = sh.getLastColumn();
  if (lastCol === 0) return [];
  return sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
}

/** All rows of a tab as objects. Each object carries its sheet row number in _row. */
function readTable_(name) {
  var sh = sheet_(name);
  var hdr = headers_(sh);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, hdr.length).getDisplayValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (row.join('') === '') continue;
    var o = { _row: i + 2 };
    for (var c = 0; c < hdr.length; c++) if (hdr[c]) o[hdr[c]] = row[c];
    out.push(o);
  }
  return out;
}

function appendRows_(name, objs) {
  if (!objs.length) return;
  var sh = sheet_(name);
  var hdr = headers_(sh);
  var rows = objs.map(function (o) {
    return hdr.map(function (h) { return o[h] === undefined || o[h] === null ? '' : String(o[h]); });
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, hdr.length).setValues(rows);
}

function updateRow_(name, rowNum, patch) {
  var sh = sheet_(name);
  var hdr = headers_(sh);
  Object.keys(patch).forEach(function (k) {
    var c = hdr.indexOf(k);
    if (c === -1) throw new Error('Column ' + k + ' not found in ' + name);
    sh.getRange(rowNum, c + 1).setValue(patch[k] === null ? '' : String(patch[k]));
  });
}

/** Next ID such as OBS-117: the highest existing number plus one. */
function nextId_(rows, col, prefix, width) {
  var max = 0;
  rows.forEach(function (r) {
    var m = String(r[col] || '').match(new RegExp('^' + prefix + '-(\\d+)$'));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return prefix + '-' + String(max + 1).padStart(width || 3, '0');
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- dates (script time zone, America/Toronto) ---------- */

function tz_() { return Session.getScriptTimeZone(); }

function fmtDateTime_(d) { return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd HH:mm'); }
function fmtDate_(d) { return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); }

/** Parses "2026-10-20" or "2026-10-20 17:14" as a local date. */
function parseLocal_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}

/** Monday of the week containing the given yyyy-MM-dd string. */
function weekStartOf_(dateStr) {
  var d = parseLocal_(dateStr);
  var dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return fmtDate_(d);
}

function addDays_(dateStr, n) {
  var d = parseLocal_(dateStr);
  d.setDate(d.getDate() + n);
  return fmtDate_(d);
}

/** True when a "yyyy-MM-dd[ HH:mm]" value falls in the week starting weekStart. */
function inWeek_(value, weekStart) {
  var day = String(value || '').slice(0, 10);
  return day >= weekStart && day < addDays_(weekStart, 7);
}

function splitList_(s) {
  return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}
