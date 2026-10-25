/**
 * Weekly check-ins: draft with Gemini, coach edits and approves, then send.
 * Nothing is emailed unless its row is Approved by the coach.
 */

/** What goes into one athlete's check-in for a week. Pure, so it can be tested. */
function weekSources_(athleteId, weekStart, log, threads, journal) {
  var obs = log.filter(function (r) {
    return r.Athlete_ID === athleteId && r.Week_Start_Date === weekStart &&
      (r.Review_Status === 'Auto' || r.Review_Status === 'Confirmed' || !r.Review_Status);
  });
  var threadIds = uniq_(threads.filter(function (t) {
    return t.Athlete_ID === athleteId && inWeek_(t.Timestamp, weekStart);
  }).map(function (t) { return t.Thread_ID; }));
  var thr = threads.filter(function (t) { return threadIds.indexOf(t.Thread_ID) !== -1; });
  var jrn = journal.filter(function (j) {
    return j.Athlete_ID === athleteId && j.Visibility === 'Coach_Shared' && inWeek_(j.Date, weekStart);
  });
  return {
    obs: obs, threads: thr, journal: jrn, threadIds: threadIds,
    enough: obs.length >= MIN_NOTES_FOR_DIGEST || (obs.length > 0 && jrn.length > 0)
  };
}

function digestId_(weekStart, athleteId) {
  return 'DIG-' + weekStart.replace(/-/g, '') + '-' + String(athleteId).replace(/^\D+-?/, '');
}

/** Creates or refreshes drafts for every active athlete. Sent check-ins are never touched. */
function generateWeek_(weekStart, onlyAthleteId) {
  var log = readTable_('Coach_Feedback_Log');
  var threads = readTable_('Athlete_Coach_Threads');
  var journal = readTable_('Athlete_Self_Journal');
  var existing = readTable_('Weekly_Digests');
  var made = 0, skipped = 0, kept = 0, errors = [];

  activeAthletes_().forEach(function (a) {
    if (onlyAthleteId && a.Athlete_ID !== onlyAthleteId) return;
    var id = digestId_(weekStart, a.Athlete_ID);
    var prev = existing.filter(function (d) { return d.Digest_ID === id; })[0];
    if (prev && (prev.Coach_Approval_Status === 'Sent' || prev.Coach_Approval_Status === 'Approved')) { kept++; return; }

    var src = weekSources_(a.Athlete_ID, weekStart, log, threads, journal);
    var row = {
      Digest_ID: id, Week_Start_Date: weekStart, Athlete_ID: a.Athlete_ID,
      Athlete_Name: a.First_Name + ' ' + a.Last_Name,
      Recipient_Emails: [a.Athlete_Email, a.Parent_Email].filter(String).join(', '),
      Linked_Obs_IDs: src.obs.map(function (r) { return r.Obs_ID; }).join(', '),
      Linked_Thread_IDs: src.threadIds.join(', '),
      Linked_Journal_IDs: uniq_(src.journal.map(function (r) { return r.Jrn_ID; })).join(', '),
      AI_Draft_Summary: '', Coach_Approval_Status: 'Skipped', Sent_Timestamp: '', Final_Text: ''
    };
    if (src.enough) {
      try {
        row.AI_Draft_Summary = digestText_(draftDigest_(a, src.obs, src.threads, src.journal), a.First_Name);
        row.Coach_Approval_Status = 'Pending Review';
        made++;
      } catch (e) {
        errors.push(a.First_Name + ': ' + e.message);
        return;
      }
    } else {
      skipped++;
    }
    withLock_(function () {
      if (prev) updateRow_('Weekly_Digests', prev._row, row);
      else appendRows_('Weekly_Digests', [row]);
    });
  });
  return { drafted: made, skipped: skipped, unchanged: kept, errors: errors };
}

function scheduledWeeklyDrafts(e) {
  if (!e || !e.triggerUid) throw new Error('Runs on its schedule only.');
  generateWeek_(weekStartOf_(fmtDate_(new Date())));
}

function menuGenerateThisWeek() {
  requireSheetUi_();
  var r = generateWeek_(weekStartOf_(fmtDate_(new Date())));
  SpreadsheetApp.getUi().alert('Drafted ' + r.drafted + ', skipped ' + r.skipped + ' (not enough data), left ' +
    r.unchanged + ' approved/sent alone.' + (r.errors.length ? '\n\nErrors:\n' + r.errors.join('\n') : ''));
}

function menuSendApproved() {
  requireSheetUi_();
  var n = sendApproved_(null);
  SpreadsheetApp.getUi().alert(n + ' check-in(s) sent.');
}

/* ---------- coach Weekly screen ---------- */

function coach_weekly(code, weekStart) {
  coach_(code);
  var rows = readTable_('Weekly_Digests').filter(function (d) { return d.Week_Start_Date === weekStart; });
  var log = readTable_('Coach_Feedback_Log');
  var athletes = activeAthletes_();
  var have = rows.map(function (d) { return d.Athlete_ID; });
  var list = rows.map(digestOut_);
  athletes.forEach(function (a) {
    if (have.indexOf(a.Athlete_ID) === -1) {
      list.push({ id: '', athleteId: a.Athlete_ID, athlete: a.First_Name + ' ' + a.Last_Name, status: 'Not generated', text: '',
        notes: log.filter(function (r) { return r.Athlete_ID === a.Athlete_ID && r.Week_Start_Date === weekStart && r.Review_Status !== 'Deleted'; }).length });
    }
  });
  return { week: weekStart, digests: list };
}

function digestOut_(d) {
  return {
    id: d.Digest_ID, week: d.Week_Start_Date, athleteId: d.Athlete_ID, athlete: d.Athlete_Name,
    to: d.Recipient_Emails, obs: splitList_(d.Linked_Obs_IDs), threads: splitList_(d.Linked_Thread_IDs),
    journal: splitList_(d.Linked_Journal_IDs), draft: d.AI_Draft_Summary, text: d.Final_Text || d.AI_Draft_Summary,
    edited: !!d.Final_Text && d.Final_Text !== d.AI_Draft_Summary,
    status: d.Coach_Approval_Status, sent: d.Sent_Timestamp,
    words: (d.Final_Text || d.AI_Draft_Summary).split(/\s+/).filter(String).length
  };
}

function coach_generate(code, weekStart, athleteId) {
  coach_(code);
  return generateWeek_(weekStart, athleteId || null);
}

function coach_saveDigest(code, digestId, text) {
  coach_(code);
  var d = findBy_('Weekly_Digests', 'Digest_ID', digestId);
  if (d.Coach_Approval_Status === 'Sent') throw new Error('This check-in was already sent.');
  updateRow_('Weekly_Digests', d._row, { Final_Text: String(text || '').trim() });
  return true;
}

function coach_approve(code, digestId, text) {
  coach_(code);
  var d = findBy_('Weekly_Digests', 'Digest_ID', digestId);
  if (d.Coach_Approval_Status === 'Sent') return true;
  if (d.Coach_Approval_Status === 'Skipped') throw new Error('There is no draft to approve for this athlete.');
  var patch = { Coach_Approval_Status: 'Approved' };
  if (text) patch.Final_Text = String(text).trim();
  updateRow_('Weekly_Digests', d._row, patch);
  return true;
}

/** Approves the listed drafts (the ones on the coach's screen) and sends every approved check-in for the week. */
function coach_approveAndSendAll(code, weekStart, digestIds) {
  coach_(code);
  (digestIds || []).forEach(function (id) {
    var d = findBy_('Weekly_Digests', 'Digest_ID', id);
    if (d.Coach_Approval_Status === 'Pending Review') updateRow_('Weekly_Digests', d._row, { Coach_Approval_Status: 'Approved' });
  });
  return sendApproved_(weekStart);
}

function sendApproved_(weekStart) {
  var url = ScriptApp.getService().getUrl();
  var roster = readTable_('Roster_Config');
  var sent = 0;
  readTable_('Weekly_Digests').forEach(function (d) {
    if (d.Coach_Approval_Status !== 'Approved') return;
    if (weekStart && d.Week_Start_Date !== weekStart) return;
    var to = splitList_(d.Recipient_Emails);
    if (!to.length) return;
    var a = roster.filter(function (r) { return r.Athlete_ID === d.Athlete_ID; })[0] || {};
    var mail = digestEmail_(d.Final_Text || d.AI_Draft_Summary, url && a.Access_Code ? url + '?k=' + a.Access_Code : '');
    MailApp.sendEmail({ to: to[0], cc: to.slice(1).join(','), subject: mail.subject, body: mail.body, htmlBody: mail.html, name: 'mProve' });
    updateRow_('Weekly_Digests', d._row, { Coach_Approval_Status: 'Sent', Sent_Timestamp: fmtDateTime_(new Date()) });
    sent++;
  });
  return sent;
}

/** Splits the stored text into subject and body and builds the HTML email. Pure. */
function digestEmail_(text, appLink) {
  var lines = String(text).split('\n');
  var subject = 'Weekly mProve Check-In';
  if (/^Subject:/i.test(lines[0])) { subject = lines.shift().replace(/^Subject:\s*/i, ''); }
  var body = lines.join('\n').replace(/^\s+/, '');
  if (appLink) body += '\n\nReply to your coach or log next week\'s target in the app: ' + appLink;
  var html = body.split(/\n{2,}/).map(function (p) {
    var safe = esc_(p).replace(/\n/g, '<br>')
      .replace(/^(Wins &amp; Highlights:|Focus for Next Week:)/, '<b>$1</b>');
    if (appLink) safe = safe.replace(esc_(appLink), '<a href="' + esc_(appLink) + '">open mProve</a>');
    return '<p style="margin:0 0 14px">' + safe + '</p>';
  }).join('');
  return { subject: subject, body: body, html: '<div style="font:15px/1.5 Arial,sans-serif;max-width:600px">' + html + '</div>' };
}
