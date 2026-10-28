/**
 * Workbook setup: turns the stacked "mProve Master Database V2" sheet into
 * five tabs, keeps the original as Archive_V2, and installs the menu.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('mProve')
    .addItem('Set up workbook', 'setupWorkbook')
    .addItem('Set Gemini API key', 'promptGeminiKey')
    .addItem('Show app links', 'showAppLinks')
    .addSeparator()
    .addItem('Generate weekly drafts (this week)', 'menuGenerateThisWeek')
    .addItem('Send approved check-ins', 'menuSendApproved')
    .addSeparator()
    .addItem('Install schedules (Sunday drafts, audio cleanup)', 'installTriggers')
    .addToUi();
}

function promptGeminiKey() {
  requireSheetUi_();
  var ui = SpreadsheetApp.getUi();
  var current = prop_('GEMINI_API_KEY', '');
  var status = current ? 'A key is currently saved (ends in …' + current.slice(-4) + ').' : 'No key is saved yet.';
  var res = ui.prompt(
    'mProve — Gemini API key',
    status + '\nPaste your Gemini API key from https://aistudio.google.com/apikey:',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var key = String(res.getResponseText() || '').trim();
  if (!key) {
    ui.alert('No key entered; keeping existing setting.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  ui.alert('Gemini API key saved.');
}

function setupWorkbook() {
  requireSheetUi_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = migrateStacked_(ss);

  Object.keys(TABS).forEach(function (name) { ensureTab_(ss, name); });
  report.push(fillRosterDefaults_());
  report.push(fillFeedbackDefaults_());
  report.push(fillThreadDefaults_());
  ensureAudioFolder_();

  var msg = report.filter(String).join('\n');
  SpreadsheetApp.getUi().alert('mProve setup', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  return msg;
}

/** Creates a tab with its header row, or appends any missing added columns. */
function ensureTab_(ss, name) {
  var cols = TABS[name];
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  } else {
    var hdr = headers_(sh);
    var missing = cols.filter(function (c) { return hdr.indexOf(c) === -1; });
    if (missing.length) sh.getRange(1, hdr.length + 1, 1, missing.length).setValues([missing]);
  }
  var width = sh.getLastColumn();
  sh.getRange(1, 1, sh.getMaxRows(), width).setNumberFormat('@');
  sh.getRange(1, 1, 1, width).setFontWeight('bold');
  sh.setFrozenRows(1);

  var hdrNow = headers_(sh);
  var choices = CHOICES[name] || {};
  Object.keys(choices).forEach(function (col) {
    var c = hdrNow.indexOf(col);
    if (c === -1) return;
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(choices[col], true)
      .setAllowInvalid(true).build();
    sh.getRange(2, c + 1, sh.getMaxRows() - 1, 1).setDataValidation(rule);
  });
  return sh;
}

/**
 * Finds the stacked sheet (column A holds tab names, a header row above each
 * block) and copies each block into its own tab. Tabs that already hold data
 * are left alone, so running setup twice never duplicates rows.
 */
function migrateStacked_(ss) {
  var report = [];
  var src = null;
  ss.getSheets().forEach(function (sh) {
    if (src || TABS[sh.getName()] || sh.getName() === 'Archive_V2') return;
    if (sh.getLastRow() === 0) return;
    var colA = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(function (r) { return r[0]; });
    if (colA.some(function (v) { return TABS[v]; })) src = sh;
  });
  if (!src) { report.push('No stacked sheet found; existing tabs kept as they are.'); return report; }

  var blocks = parseStacked_(src.getDataRange().getDisplayValues());
  Object.keys(blocks).forEach(function (name) {
    var sh = ensureTab_(ss, name);
    if (sh.getLastRow() > 1) { report.push(name + ': already has rows, not copied again.'); return; }
    var rows = blocks[name];
    if (name === 'Athlete_Self_Journal') rows = splitJournalMetrics_(rows);
    var hdr = headers_(sh);
    var values = rows.map(function (o) { return hdr.map(function (h) { return o[h] || ''; }); });
    if (values.length) sh.getRange(2, 1, values.length, hdr.length).setValues(values);
    report.push(name + ': ' + values.length + ' rows copied.');
  });

  src.setName('Archive_V2');
  src.setTabColor('#999999');
  report.push('Original sheet kept as "Archive_V2".');
  return report;
}

/** Pure parser for the stacked layout; returns { tabName: [rowObject] }. */
function parseStacked_(values) {
  var blocks = {};
  var header = null;
  values.forEach(function (row) {
    var tab = String(row[0]).trim();
    var rest = row.slice(1).map(function (v) { return String(v).trim(); });
    if (TABS[tab]) {
      if (!header) return;
      var o = {};
      header.forEach(function (h, i) { if (h) o[h] = rest[i] || ''; });
      (blocks[tab] = blocks[tab] || []).push(o);
    } else if (rest[0] && tab !== 'TAB_NAME') {
      header = rest; // a block's header row (column A shows #ERROR! or is blank)
    }
  });
  return blocks;
}

/**
 * "6 UW Kicks / 14 Strokes per 25m" becomes two rows with the same Jrn_ID:
 * value 6 "UW Kicks", value 14 "Strokes per 25m". "28.4s Avg" becomes value
 * 28.4, unit s. Anything that doesn't parse is kept as one row unchanged.
 */
function splitJournalMetrics_(rows) {
  var out = [];
  rows.forEach(function (r) {
    var parts = String(r.Metric_Value || '').split(' / ');
    var parsed = parts.map(parseMetric_);
    if (parts.length < 1 || parsed.some(function (p) { return !p; })) { out.push(r); return; }
    var types = String(r.Metric_Type || '').split(' / ');
    parsed.forEach(function (p, i) {
      var o = {};
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      o.Metric_Value = p.value;
      o.Metric_Unit = p.unit;
      o.Metric_Type = p.label || (types.length === parts.length ? types[i] : r.Metric_Type);
      out.push(o);
    });
  });
  return out;
}

function parseMetric_(s) {
  var m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*(s|sec|m)?\b\s*(.*)$/i);
  if (!m) return null;
  var unit = (m[2] || '').toLowerCase();
  var label = m[3].trim();
  if (unit === 's' || unit === 'sec') {
    return { value: m[1], unit: 's', label: 'Time' + (label ? ' (' + label + ')' : '') };
  }
  return { value: m[1], unit: unit || 'count', label: label };
}

/** Role, Active and a personal Access_Code for everyone; adds a coach row if none exists. */
function fillRosterDefaults_() {
  var rows = readTable_('Roster_Config');
  var notes = [];
  rows.forEach(function (r) {
    var patch = {};
    if (!r.Role) patch.Role = /^COACH-/.test(r.Athlete_ID) ? 'Coach' : 'Athlete';
    if (!r.Active) patch.Active = 'yes';
    if (!r.Access_Code) patch.Access_Code = newAccessCode_();
    if (Object.keys(patch).length) updateRow_('Roster_Config', r._row, patch);
  });
  var hasCoach = readTable_('Roster_Config').some(function (r) { return r.Role === 'Coach'; });
  if (!hasCoach) {
    var coachIds = readTable_('Coach_Feedback_Log').map(function (r) { return r.Coach_ID; }).filter(String);
    appendRows_('Roster_Config', [{
      Athlete_ID: coachIds[0] || 'COACH-01', First_Name: 'Head', Last_Name: 'Coach',
      Squad_Group: 'Senior Performance', Sport_Discipline: 'Swimming',
      Athlete_Email: Session.getEffectiveUser().getEmail(),
      Role: 'Coach', Active: 'yes', Access_Code: newAccessCode_()
    }]);
    notes.push('Added a coach row (' + (coachIds[0] || 'COACH-01') + '). Change the name and email in Roster_Config.');
  }
  return notes.join('\n');
}

function fillFeedbackDefaults_() {
  readTable_('Coach_Feedback_Log').forEach(function (r) {
    var patch = {};
    if (!r.Review_Status) patch.Review_Status = 'Confirmed';
    if (!r.Week_Start_Date && r.Timestamp) patch.Week_Start_Date = weekStartOf_(r.Timestamp);
    if (Object.keys(patch).length) updateRow_('Coach_Feedback_Log', r._row, patch);
  });
  return '';
}

function fillThreadDefaults_() {
  var rows = readTable_('Athlete_Coach_Threads');
  var n = 0;
  rows.forEach(function (r) {
    if (r.Message_ID) n = Math.max(n, parseInt(r.Message_ID.replace(/\D/g, ''), 10) || 0);
  });
  rows.forEach(function (r) {
    if (!r.Message_ID) updateRow_('Athlete_Coach_Threads', r._row, { Message_ID: 'MSG-' + String(++n).padStart(4, '0') });
  });
  return '';
}

function newAccessCode_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function ensureAudioFolder_() {
  var id = prop_('AUDIO_FOLDER_ID', '');
  if (id) { try { DriveApp.getFolderById(id); return id; } catch (e) {} }
  var folder = DriveApp.createFolder('mProve audio clips');
  PropertiesService.getScriptProperties().setProperty('AUDIO_FOLDER_ID', folder.getId());
  return folder.getId();
}

/** Lists each person's personal app link so the coach can share them one by one. */
function showAppLinks() {
  requireSheetUi_();
  fillRosterDefaults_();
  var url = ScriptApp.getService().getUrl();
  var ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('Deploy the web app first (Deploy › New deployment › Web app), then run this again.');
    return;
  }
  var rows = readTable_('Roster_Config').filter(function (r) { return r.Active !== 'no'; });
  var html = '<style>body{font:13px system-ui;margin:12px}td{padding:4px 8px;vertical-align:top}input{width:100%;font-family:monospace}</style>' +
    '<p>Each link (or 16-character code) signs that person in. Share it only with them.</p><table>' +
    '<tr><th align="left">Person</th><th align="left">Access Code</th><th align="left">Direct Link</th></tr>' +
    rows.map(function (r) {
      var link = url + '?k=' + r.Access_Code;
      return '<tr><td><b>' + esc_(r.First_Name + ' ' + r.Last_Name) + '</b><br>' + esc_(r.Role) +
        '</td><td><input readonly onclick="this.select()" value="' + esc_(r.Access_Code) + '">' +
        '</td><td><input readonly onclick="this.select()" value="' + esc_(link) + '"></td></tr>';
    }).join('') + '</table>';
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(680).setHeight(420), 'mProve app links');
}

function esc_(s) {
  return String(s || '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function installTriggers() {
  requireSheetUi_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['scheduledWeeklyDrafts', 'cleanupOldAudio'].indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('scheduledWeeklyDrafts').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
  ScriptApp.newTrigger('cleanupOldAudio').timeBased().everyDays(1).atHour(3).create();
  SpreadsheetApp.getUi().alert('Schedules installed: drafts every Sunday at 18:00, audio cleanup nightly.');
}

function cleanupOldAudio(e) {
  if (!e || !e.triggerUid) throw new Error('Runs on its schedule only.');
  var cutoff = new Date(Date.now() - AUDIO_RETENTION_DAYS * 86400000);
  var files = DriveApp.getFolderById(ensureAudioFolder_()).getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getDateCreated() < cutoff) f.setTrashed(true);
  }
}
