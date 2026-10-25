// Runs the backend against the mocks: node test/run.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ctx = vm.createContext({ console });
const load = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
load(path.join(__dirname, 'mocks.js')); load(path.join(__dirname, 'fixture.js'));
const src = path.join(__dirname, '..', 'src');
fs.readdirSync(src).filter(f => f.endsWith('.gs')).forEach(f => load(path.join(src, f)));
const g = ctx; let n = 0;
const deq = (a, b) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

g.__sheets.push(new g.__Sheet('mProve Master Database V2', JSON.parse(JSON.stringify(g.__stackedFixture))));

ok('setup splits the stacked sheet into five tabs', () => {
  const msg = g.setupWorkbook();
  const names = g.__sheets.map(s => s.name);
  ['Roster_Config', 'Coach_Feedback_Log', 'Weekly_Digests', 'Athlete_Coach_Threads', 'Athlete_Self_Journal', 'Archive_V2'].forEach(t => assert(names.includes(t), t));
  assert.strictEqual(g.readTable_('Coach_Feedback_Log').length, 4);
  assert.strictEqual(g.readTable_('Athlete_Coach_Threads').length, 2);
  assert.match(msg, /Archive_V2/);
});
ok('roster gets roles, access codes and a coach row', () => {
  const r = g.readTable_('Roster_Config');
  assert.strictEqual(r.length, 4);
  const coach = r.find(x => x.Role === 'Coach');
  assert.strictEqual(coach.Athlete_ID, 'COACH-01');
  assert(r.every(x => x.Access_Code.length === 16 && x.Active === 'yes'));
});
ok('journal metrics are split into one number per row', () => {
  const j = g.readTable_('Athlete_Self_Journal');
  assert.strictEqual(j.length, 4);
  const jr309 = j.filter(x => x.Jrn_ID === 'JRN-309');
  deq(jr309.map(x => [x.Metric_Type, x.Metric_Value, x.Metric_Unit]),
    [['Time (Avg)', '28.4', 's'], ['Breaths Inside Flags', '0', 'count']]);
  deq(j.filter(x => x.Jrn_ID === 'JRN-301').map(x => x.Metric_Value), ['6', '14']);
});
ok('existing notes are Confirmed, threads get message IDs', () => {
  assert(g.readTable_('Coach_Feedback_Log').every(r => r.Review_Status === 'Confirmed'));
  deq(g.readTable_('Athlete_Coach_Threads').map(r => r.Message_ID), ['MSG-0001', 'MSG-0002']);
});
ok('running setup twice does not duplicate rows', () => {
  g.setupWorkbook();
  assert.strictEqual(g.readTable_('Coach_Feedback_Log').length, 4);
  assert.strictEqual(g.readTable_('Roster_Config').length, 4);
});

const roster = g.readTable_('Roster_Config');
const code = id => roster.find(r => r.Athlete_ID === id).Access_Code;
const COACH = code('COACH-01'), CHRIS = code('ATH-001'), DREW = code('ATH-002');
g.__noUi = true;

ok('menu functions refuse to run from the web app', () => {
  assert.throws(() => g.setupWorkbook(), /getUi/);
  assert.throws(() => g.cleanupOldAudio(), /schedule/);
});
ok('sign-in rejects bad codes and athletes calling coach functions', () => {
  assert.throws(() => g.api_bootstrap('nope'), /missing or incomplete/);
  assert.throws(() => g.api_bootstrap('0000000000000000'), /not valid/);
  assert.throws(() => g.coach_overview(CHRIS), /Only coaches/);
  const b = g.api_bootstrap(COACH);
  assert.strictEqual(b.roster.length, 3);
  assert.strictEqual(g.api_bootstrap(CHRIS).roster.length, 1);
});
ok('a clip naming three athletes becomes three rows; an unsure name waits for review', () => {
  g.__nextGemini = { transcript: 'Chris had strong turns; Dru dropped his elbow on the turn; Alex had great momentum',
    observations: [
      { athlete_id: 'ATH-001', heard_as: 'Chris', match_confidence: 0.97, event_stroke: 'Freestyle', focus_area: 'Turns & Breakout', observation_type: 'Strength', cleaned_note: 'Strong turns.', raw_segment: 'Chris had strong turns' },
      { athlete_id: 'ATH-002', heard_as: 'Dru', match_confidence: 0.7, event_stroke: 'Freestyle', focus_area: 'Turns & Breakout', observation_type: 'Correction', cleaned_note: 'Dropped elbow on the turn.', raw_segment: 'Dru dropped his elbow on the turn' },
      { athlete_id: 'ATH-999', heard_as: 'Sam', match_confidence: 0.9, event_stroke: '', focus_area: '', observation_type: 'Strength', cleaned_note: 'Great momentum.', raw_segment: 'Sam had great momentum' }
    ] };
  const res = g.coach_uploadNote(COACH, { audio: 'AAAA', mime: 'audio/wav', session: 'Senior · Sat PM', recordedAt: new Date(2026, 9, 24, 17, 30).getTime(), clipId: 'CLIP-T1' });
  assert.strictEqual(res.length, 3);
  deq(res.map(r => r.obsId), ['OBS-117', 'OBS-118', 'OBS-119']);
  deq(res.map(r => r.status), ['Auto', 'Needs_Review', 'Needs_Review']);
  const rows = g.readTable_('Coach_Feedback_Log').slice(-3);
  assert(rows.every(r => r.Week_Start_Date === '2026-10-19' && r.Clip_ID === 'CLIP-T1' && r.Coach_ID === 'COACH-01'));
  assert.strictEqual(rows[2].Athlete_ID, ''); // unknown ID from the model is not trusted
  const prompt = g.__gemini[0].contents[0].parts[0].text;
  assert.match(prompt, /ATH-002 \| Drew Currah \| heard as: Drew, Dru, Andrew/);
});
ok('a retried upload of the same clip is not saved twice', () => {
  g.coach_uploadNote(COACH, { audio: 'AAAA', clipId: 'CLIP-T1' });
  assert.strictEqual(g.readTable_('Coach_Feedback_Log').length, 7);
});
ok('a Gemini failure still saves a flagged row', () => {
  const saved = g.UrlFetchApp.fetch;
  g.UrlFetchApp.fetch = () => ({ getResponseCode: () => 500, getContentText: () => 'quota' });
  const res = g.coach_uploadNote(COACH, { audio: 'AAAA', clipId: 'CLIP-T2', recordedAt: new Date(2026, 9, 24, 17, 40).getTime() });
  g.UrlFetchApp.fetch = saved;
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].status, 'Needs_Review');
  assert.match(res[0].note, /Could not process/);
});
ok('review: confirm a note with the right athlete, delete the failed one', () => {
  g.coach_confirmObs(COACH, 'OBS-118', 'ATH-002', 'Dropped right elbow on the turn.');
  g.coach_confirmObs(COACH, 'OBS-119', 'ATH-003');
  g.coach_deleteObs(COACH, 'OBS-120');
  const log = g.readTable_('Coach_Feedback_Log');
  const o118 = log.find(r => r.Obs_ID === 'OBS-118');
  assert.strictEqual(o118.Review_Status, 'Confirmed'); assert.strictEqual(o118.Cleaned_Note, 'Dropped right elbow on the turn.');
  assert.strictEqual(log.find(r => r.Obs_ID === 'OBS-119').Athlete_Name, 'Alex Chen');
  assert.strictEqual(log.find(r => r.Obs_ID === 'OBS-120').Review_Status, 'Deleted');
});
ok('athlete asks about a note; coach inbox shows it unread; coach replies', () => {
  g.athlete_post(DREW, 'OBS-116', 'Is it the catch or the recovery where my elbow drops?');
  assert.throws(() => g.athlete_post(DREW, 'OBS-101', 'not mine'), /not found/);
  let o = g.coach_overview(COACH);
  assert.strictEqual(o.unread, 1);
  const t = o.threads[0];
  assert.strictEqual(t.id, 'THR-043'); assert.strictEqual(t.athlete, 'Drew Currah'); assert(t.open);
  assert.match(t.refText, /Dropped right elbow/);
  g.coach_reply(COACH, 'THR-043', 'The catch. Think fingertips down before you pull.');
  o = g.coach_overview(COACH);
  assert.strictEqual(o.unread, 0);
  const msgs = g.readTable_('Athlete_Coach_Threads').filter(r => r.Thread_ID === 'THR-043');
  deq(msgs.map(m => [m.Sender_Role, m.Resolution_Status]), [['Athlete', 'Replied_in_App'], ['Coach', 'Resolved']]);
});
ok('coverage counts this week only', () => {
  const o = g.coach_overview(COACH);
  assert.strictEqual(o.coverage.length, 3);
});
ok('journal entry with two metrics saves as two rows with one ID', () => {
  const id = g.athlete_saveJournal(CHRIS, { date: '2026-10-24', sessionType: 'Swim', rpe: '7', feel: '8', eventSet: 'Sprint 50s Fly',
    metrics: [{ type: '50m Pace', value: '28.1', unit: 's', target: '28.5' }, { type: 'Breaths Inside Flags', value: '0', unit: 'count', target: '' }],
    reflection: 'Felt sharp.', visibility: 'Coach_Shared', sleep: '9', focus: '4' });
  assert.strictEqual(id, 'JRN-310');
  const rows = g.readTable_('Athlete_Self_Journal').filter(r => r.Jrn_ID === 'JRN-310');
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].Sleep_Quality, ''); // 9 is outside 1–5
  assert.strictEqual(rows[0].Mental_Focus, '4');
  g.athlete_saveJournal(CHRIS, { date: '2026-10-24', rpe: '5', visibility: 'Private', reflection: 'private thought' });
  const j = g.athlete_journal(CHRIS);
  assert(j.rows.every(r => r.id));
  assert.strictEqual(g.athlete_journal(DREW).rows.length, 0);
});
ok('weekly drafts: enough data gets a draft, too little is skipped, private journal is left out', () => {
  g.__gemini.length = 0;
  g.__nextGemini = { subject: 'Weekly mProve Check-In: Chris — Fly finishes', wins: 'Six kicks off every wall.', focus: 'Eyes down into the wall.', coach_note: 'Reply here!' };
  const r = g.coach_generate(COACH, '2026-10-19');
  deq([r.drafted, r.skipped, r.unchanged], [2, 1, 0]); // Chris, Drew drafted; Alex has one note
  const prompt = g.__gemini.find(b => /ATHLETE: Chris Rus/.test(b.contents[0].parts[0].text)).contents[0].parts[0].text;
  assert.match(prompt, /OBS-101/); assert.match(prompt, /THR-042/); assert.match(prompt, /JRN-310/);
  assert.doesNotMatch(prompt, /private thought/);
  const d = g.readTable_('Weekly_Digests');
  assert.strictEqual(d.length, 3);
  const chris = d.find(x => x.Digest_ID === 'DIG-20261019-001');
  assert.strictEqual(chris.Coach_Approval_Status, 'Pending Review');
  assert.match(chris.AI_Draft_Summary, /^Subject: Weekly mProve Check-In: Chris/);
  assert.strictEqual(d.find(x => x.Athlete_ID === 'ATH-003').Coach_Approval_Status, 'Skipped');
});
ok('nothing is emailed before approval; approve & send emails athlete with parent on CC', () => {
  assert.strictEqual(g.__mail.length, 0);
  assert.strictEqual(g.athlete_home(CHRIS).digests.length, 0);
  g.coach_saveDigest(COACH, 'DIG-20261019-001', 'Subject: Weekly mProve Check-In: Chris — Fly finishes\n\nHi Chris,\n\nWins & Highlights: edited by coach.');
  const sent = g.coach_approveAndSendAll(COACH, '2026-10-19', ['DIG-20261019-001']);
  assert.strictEqual(sent, 1);
  const m = g.__mail[0];
  assert.strictEqual(m.to, 'chris@example.com'); assert.strictEqual(m.cc, 'parent.rus@example.com');
  assert.strictEqual(m.subject, 'Weekly mProve Check-In: Chris — Fly finishes');
  assert.match(m.body, /edited by coach/); assert.match(m.body, /\?k=/);
  assert.match(m.htmlBody, /<b>Wins &amp; Highlights:<\/b>/);
  const row = g.readTable_('Weekly_Digests').find(x => x.Digest_ID === 'DIG-20261019-001');
  assert.strictEqual(row.Coach_Approval_Status, 'Sent'); assert(row.Sent_Timestamp);
  assert.strictEqual(g.readTable_('Weekly_Digests').find(x => x.Athlete_ID === 'ATH-002').Coach_Approval_Status, 'Pending Review');
});
ok('regenerating leaves sent check-ins alone', () => {
  const r = g.coach_generate(COACH, '2026-10-19');
  assert.strictEqual(r.unchanged, 1);
  assert.match(g.readTable_('Weekly_Digests').find(x => x.Digest_ID === 'DIG-20261019-001').Final_Text, /edited by coach/);
});
ok('athletes see only their own sent check-ins, notes and threads', () => {
  const h = g.athlete_home(CHRIS);
  assert.strictEqual(h.digests.length, 1);
  deq(h.notes.map(n => n.id).sort(), ['OBS-101', 'OBS-108', 'OBS-115', 'OBS-117']); // OBS-117 is Auto but went out in the sent check-in
  assert.strictEqual(h.threads.length, 1);
  const dh = g.athlete_home(DREW);
  assert.strictEqual(dh.digests.length, 0);
  deq(dh.notes.map(n => n.id).sort(), ['OBS-116', 'OBS-118']);
  assert(dh.threads.every(t => t.athleteId === 'ATH-002'));
});
ok('athlete can reply in a thread about their check-in, not in someone else\'s', () => {
  g.athlete_post(CHRIS, 'DIG-20261019-001', 'Thanks! Video Monday?');
  assert.throws(() => g.athlete_post(DREW, 'DIG-20261019-001', 'x'), /not found/);
  assert.throws(() => g.athlete_post(DREW, 'OBS-116', 'x', 'THR-042'), /Conversation not found/);
});
ok('helpers: week start, metric parsing, email split', () => {
  assert.strictEqual(g.weekStartOf_('2026-10-25'), '2026-10-19'); // Sunday
  assert.strictEqual(g.weekStartOf_('2026-10-26'), '2026-10-26'); // Monday
  deq(JSON.parse(JSON.stringify(g.parseMetric_('14 Strokes per 25m'))), { value: '14', unit: 'count', label: 'Strokes per 25m' });
  assert.strictEqual(g.parseMetric_('fast'), null);
  assert.strictEqual(g.digestEmail_('no subject line', '').subject, 'Weekly mProve Check-In');
});
console.log('\n' + n + ' checks passed');
