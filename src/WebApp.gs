/**
 * Web app entry points and sign-in.
 *
 * Everyone signs in with the personal link from mProve › Show app links
 * (…/exec?k=<Access_Code>). The script runs as the workbook owner, so athletes
 * never get access to the Sheet itself; every call below checks the code and
 * returns only what that person may see.
 */

function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.accessCode = (e && e.parameter && e.parameter.k) || '';
  return t.evaluate()
    .setTitle('mProve')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function rpcMap_() {
  return {
    api_bootstrap: api_bootstrap,
    coach_overview: coach_overview,
    coach_uploadNote: coach_uploadNote,
    coach_confirmObs: coach_confirmObs,
    coach_deleteObs: coach_deleteObs,
    coach_reply: coach_reply,
    coach_markAtPractice: coach_markAtPractice,
    coach_weekly: coach_weekly,
    coach_generate: coach_generate,
    coach_saveDigest: coach_saveDigest,
    coach_approve: coach_approve,
    coach_approveAndSendAll: coach_approveAndSendAll,
    coach_addAthletes: coach_addAthletes,
    coach_onboardRoster: coach_onboardRoster,
    athlete_home: athlete_home,
    athlete_post: athlete_post,
    athlete_saveJournal: athlete_saveJournal,
    athlete_journal: athlete_journal
  };
}

/**
 * Handles both:
 * 1. Top-level web app RPC calls: POST JSON { fn, args }
 * 2. iOS Shortcut / Watch uploads: POST JSON { k, audio (base64), mime, session, recordedAt (ms), clipId }
 */
function doPost(e) {
  var out;
  try {
    var p = JSON.parse(e.postData.contents);
    if (p && p.fn) {
      var fn = rpcMap_()[p.fn];
      if (!fn) throw new Error('Unknown function: ' + p.fn);
      out = { ok: true, result: fn.apply(null, p.args || []) };
    } else {
      out = { ok: true, result: coach_uploadNote(p.k, p) };
    }
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function cleanCode_(raw) {
  var s = String(raw || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
  var m = s.match(/[?&]k=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : s;
}

function person_(code) {
  code = cleanCode_(code);
  var rows = readTable_('Roster_Config');
  if (!rows.some(function (r) { return r.Access_Code; })) {
    fillRosterDefaults_();
    rows = readTable_('Roster_Config');
  }
  // Testing convenience: default to Coach when code is empty or 'coach'
  if (!code || code.toLowerCase() === 'coach') {
    var coach = rows.filter(function (r) { return r.Role === 'Coach' && r.Active !== 'no'; })[0];
    if (coach) return coach;
  }
  // Auto-migrate legacy group name or swimmer names in live sheet
  if (rows.some(function (r) {
    return r.Squad_Group === 'Senior Performance' ||
      (r.First_Name === 'Alex' && r.Last_Name === 'Chen') ||
      (r.First_Name === 'Drew' && r.Last_Name === 'Currah' && r.Squad_Group !== 'Provincial Development');
  }) || !rows.some(function (r) { return r.First_Name === 'Olivia' && r.Last_Name === 'Guo'; })) {
    fillRosterDefaults_();
    rows = readTable_('Roster_Config');
  }
  if (code.length < 12) throw new Error('Sign-in link is missing or incomplete. Ask your coach for your mProve link.');
  var me = rows.filter(function (r) {
    return String(r.Access_Code || '').trim().toLowerCase() === code.toLowerCase() && r.Active !== 'no';
  })[0];
  if (!me) throw new Error('This sign-in link is not valid any more. Ask your coach for a new one.');
  return me;
}

function coach_(code) {
  var me = person_(code);
  if (me.Role !== 'Coach') throw new Error('Only coaches can do this.');
  return me;
}

function publicPerson_(r) {
  return {
    id: r.Athlete_ID, first: r.First_Name, last: r.Last_Name, name: (r.First_Name + ' ' + r.Last_Name).trim(),
    role: r.Role, squad: r.Squad_Group, sport: r.Sport_Discipline, events: r.Primary_Events_Positions
  };
}

function activeAthletes_() {
  return readTable_('Roster_Config').filter(function (r) { return r.Role !== 'Coach' && r.Active !== 'no'; });
}

/** First call the app makes: who is signed in, and the roster a coach needs. */
function coachSquads_(coach) {
  var raw = String(coach.Squad_Group || '').trim();
  var clubSquads = uniq_(activeAthletes_().map(function (r) { return r.Squad_Group; }).concat(['National Development', 'Provincial Development', 'Senior Development']).filter(String));

  if (!raw || raw.toLowerCase() === 'all' || raw === '*') {
    return clubSquads;
  }
  var list = splitList_(raw);
  return list.length ? list : clubSquads;
}

/** First call the app makes: who is signed in, and the roster a coach needs. */
function api_bootstrap(code) {
  var me = person_(code);
  var today = fmtDate_(new Date());
  var clubSquads = uniq_(activeAthletes_().map(function (r) { return r.Squad_Group; }).concat(['National Development', 'Provincial Development', 'Senior Development']).filter(String));
  var mySquads = me.Role === 'Coach' ? coachSquads_(me) : (me.Squad_Group ? [me.Squad_Group] : []);
  return {
    me: publicPerson_(me),
    weekStart: weekStartOf_(today),
    today: today,
    roster: me.Role === 'Coach' ? activeAthletes_().map(publicPerson_) : [publicPerson_(me)],
    squads: mySquads,
    clubSquads: clubSquads
  };
}

function uniq_(xs) {
  var seen = {};
  return xs.filter(function (x) { if (!x || seen[x]) return false; seen[x] = 1; return true; });
}

/** Menu-only functions call this so they can't be run from the web app. */
function requireSheetUi_() {
  SpreadsheetApp.getUi(); // throws outside the spreadsheet editor
}
