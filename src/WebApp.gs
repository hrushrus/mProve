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

/**
 * Upload endpoint for an iOS Shortcut or Watch action:
 * POST JSON { k, audio (base64), mime, session, recordedAt (ms), clipId }.
 */
function doPost(e) {
  var out;
  try {
    var p = JSON.parse(e.postData.contents);
    out = { ok: true, result: coach_uploadNote(p.k, p) };
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function person_(code) {
  code = String(code || '').trim();
  if (code.length < 12) throw new Error('Sign-in link is missing or incomplete. Ask your coach for your mProve link.');
  var me = readTable_('Roster_Config').filter(function (r) {
    return r.Access_Code === code && r.Active !== 'no';
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
function api_bootstrap(code) {
  var me = person_(code);
  var today = fmtDate_(new Date());
  return {
    me: publicPerson_(me),
    weekStart: weekStartOf_(today),
    today: today,
    roster: me.Role === 'Coach' ? activeAthletes_().map(publicPerson_) : [publicPerson_(me)],
    squads: me.Role === 'Coach' ? uniq_(activeAthletes_().map(function (r) { return r.Squad_Group; })) : []
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
