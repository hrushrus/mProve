/**
 * Athlete screens: Check-ins (with replies), Journal, Progress.
 * Every function returns only the signed-in athlete's own rows.
 */

function athlete_home(code) {
  var me = person_(code);
  var digests = readTable_('Weekly_Digests').filter(function (d) {
    return d.Athlete_ID === me.Athlete_ID && d.Coach_Approval_Status === 'Sent';
  });
  // Notes are visible once the coach confirmed them or sent them in a check-in.
  var sentObs = {};
  digests.forEach(function (d) { splitList_(d.Linked_Obs_IDs).forEach(function (id) { sentObs[id] = 1; }); });
  var log = readTable_('Coach_Feedback_Log');
  var notes = log.filter(function (r) {
    return r.Athlete_ID === me.Athlete_ID && (r.Review_Status === 'Confirmed' || sentObs[r.Obs_ID]);
  }).map(function (r) {
    return { id: r.Obs_ID, time: r.Timestamp, week: r.Week_Start_Date, event: r.Event_Stroke, focus: r.Focus_Area, type: r.Observation_Type, note: r.Cleaned_Note };
  }).sort(function (a, b) { return a.time < b.time ? 1 : -1; });

  var threads = readTable_('Athlete_Coach_Threads').filter(function (t) { return t.Athlete_ID === me.Athlete_ID; });
  return {
    digests: digests.map(function (d) {
      var o = digestOut_(d);
      return { id: o.id, week: o.week, text: o.text, sent: o.sent, obs: o.obs };
    }).sort(function (a, b) { return a.week < b.week ? 1 : -1; }),
    notes: notes,
    threads: groupThreads_(threads, log.filter(function (r) { return r.Athlete_ID === me.Athlete_ID; }), digests)
  };
}

/** A question or reply from the athlete about a note (OBS-) or a check-in (DIG-). */
function athlete_post(code, refId, text, threadId) {
  var me = person_(code);
  text = String(text || '').trim();
  if (!text) throw new Error('Write a message first.');
  var ref = null, category = '';
  if (/^OBS-/.test(refId)) {
    ref = readTable_('Coach_Feedback_Log').filter(function (r) { return r.Obs_ID === refId && r.Athlete_ID === me.Athlete_ID; })[0];
    if (ref) category = ref.Focus_Area;
  } else if (/^DIG-/.test(refId)) {
    ref = readTable_('Weekly_Digests').filter(function (d) { return d.Digest_ID === refId && d.Athlete_ID === me.Athlete_ID; })[0];
    category = 'Weekly check-in';
  }
  if (!ref) throw new Error('That note or check-in was not found.');

  withLock_(function () {
    var all = readTable_('Athlete_Coach_Threads');
    var tid = threadId;
    if (tid) {
      var own = all.some(function (t) { return t.Thread_ID === tid && t.Athlete_ID === me.Athlete_ID; });
      if (!own) throw new Error('Conversation not found.');
    } else {
      tid = nextId_(all, 'Thread_ID', 'THR', 3);
    }
    appendRows_('Athlete_Coach_Threads', [{
      Thread_ID: tid, Ref_ID: refId, Timestamp: fmtDateTime_(new Date()), Athlete_ID: me.Athlete_ID,
      Athlete_Name: me.First_Name + ' ' + me.Last_Name, Sender_Role: me.Role === 'Coach' ? 'Coach' : 'Athlete',
      Message_Text: text, Question_Category: category, Resolution_Status: 'Unread',
      Message_ID: nextId_(all, 'Message_ID', 'MSG', 4)
    }]);
  });
  return true;
}

/**
 * entry = { date, sessionType, rpe, feel, eventSet, reflection, visibility,
 *           sleep, focus, metrics: [{ type, value, unit, target }] }
 * One row per metric, all sharing the entry's Jrn_ID.
 */
function athlete_saveJournal(code, entry) {
  var me = person_(code);
  var rows = journalRows_(me, entry || {});
  withLock_(function () {
    var all = readTable_('Athlete_Self_Journal');
    var id = nextId_(all, 'Jrn_ID', 'JRN', 3);
    rows.forEach(function (r) { r.Jrn_ID = id; });
    appendRows_('Athlete_Self_Journal', rows);
  });
  return rows[0].Jrn_ID;
}

/** Validates an entry and turns it into sheet rows. Pure, so it can be tested. */
function journalRows_(me, e) {
  var date = /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : fmtDate_(new Date());
  var score = function (v, max) {
    var n = parseInt(v, 10);
    return n >= 1 && n <= max ? String(n) : '';
  };
  var base = {
    Jrn_ID: '', Date: date, Athlete_ID: me.Athlete_ID, Athlete_Name: me.First_Name + ' ' + me.Last_Name,
    Session_Type: String(e.sessionType || 'Swim').slice(0, 60),
    RPE_1_to_10: score(e.rpe, 10), Feel_1_to_10: score(e.feel, 10),
    Event_Set: String(e.eventSet || '').slice(0, 120),
    Personal_Reflection: String(e.reflection || '').slice(0, 2000),
    Visibility: e.visibility === 'Private' ? 'Private' : 'Coach_Shared',
    Sleep_Quality: score(e.sleep, 5), Mental_Focus: score(e.focus, 5),
    Metric_Type: '', Metric_Value: '', Metric_Unit: '', Target_Goal: ''
  };
  var metrics = (e.metrics || []).filter(function (m) { return m && m.type && m.value !== '' && !isNaN(parseFloat(m.value)); });
  if (!metrics.length) return [base];
  return metrics.map(function (m) {
    var r = {};
    Object.keys(base).forEach(function (k) { r[k] = base[k]; });
    r.Metric_Type = String(m.type).slice(0, 60);
    r.Metric_Value = String(parseFloat(m.value));
    r.Metric_Unit = String(m.unit || '').slice(0, 20);
    r.Target_Goal = m.target === '' || m.target === undefined || isNaN(parseFloat(m.target)) ? '' : String(parseFloat(m.target));
    return r;
  });
}

/** Journal entries for the Journal list and Progress charts. */
function athlete_journal(code) {
  var me = person_(code);
  var rows = readTable_('Athlete_Self_Journal').filter(function (j) { return j.Athlete_ID === me.Athlete_ID; });
  var log = readTable_('Coach_Feedback_Log').filter(function (r) {
    return r.Athlete_ID === me.Athlete_ID && r.Review_Status === 'Confirmed';
  });
  return {
    rows: rows.map(function (j) {
      return {
        id: j.Jrn_ID, date: j.Date, session: j.Session_Type, rpe: j.RPE_1_to_10, feel: j.Feel_1_to_10,
        set: j.Event_Set, type: j.Metric_Type, value: j.Metric_Value, unit: j.Metric_Unit, target: j.Target_Goal,
        reflection: j.Personal_Reflection, visibility: j.Visibility
      };
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }),
    coachNotes: log.map(function (r) { return { id: r.Obs_ID, time: r.Timestamp, event: r.Event_Stroke, focus: r.Focus_Area, note: r.Cleaned_Note }; })
  };
}
