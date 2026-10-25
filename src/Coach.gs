/**
 * Coach screens: On deck (capture), Review, Inbox.
 */

function coach_uploadNote(code, p) {
  var coach = coach_(code);
  if (!p || !p.audio) throw new Error('No audio received.');
  var clipId = String(p.clipId || ('CLIP-' + Date.now()));

  var already = readTable_('Coach_Feedback_Log').filter(function (r) { return r.Clip_ID === clipId; });
  if (already.length) return noteSummary_(already); // a retried upload

  var athletes = activeAthletes_();
  var mime = p.mime || 'audio/wav';
  var recorded = p.recordedAt ? new Date(Number(p.recordedAt)) : new Date();
  var timestamp = fmtDateTime_(recorded);

  var audioLink = '';
  try { audioLink = saveClip_(p.audio, mime, clipId, timestamp); } catch (e) { Logger.log('Audio not saved: ' + e); }

  var parsed;
  try {
    parsed = parseVoiceNote_(p.audio, mime, athletes, vocab_(athletes));
  } catch (e) {
    parsed = { transcript: '', observations: [], error: String(e.message || e) };
  }
  var rows = notesToRows_(parsed, athletes, {
    coachId: coach.Athlete_ID, timestamp: timestamp, clipId: clipId,
    audioLink: audioLink, session: p.session || ''
  });

  withLock_(function () {
    var existing = readTable_('Coach_Feedback_Log');
    rows.forEach(function (r) {
      r.Obs_ID = nextId_(existing, 'Obs_ID', 'OBS', 3);
      existing.push(r);
    });
    appendRows_('Coach_Feedback_Log', rows);
  });
  return noteSummary_(rows);
}

/** Turns Gemini's parse into log rows. Pure, so it can be tested. */
function notesToRows_(parsed, athletes, ctx) {
  var byId = {};
  athletes.forEach(function (a) { byId[a.Athlete_ID] = a; });
  var obs = (parsed.observations || []).slice();
  if (!obs.length) {
    obs = [{
      athlete_id: '', heard_as: '', match_confidence: 0, event_stroke: '', focus_area: '', observation_type: '',
      cleaned_note: parsed.error ? 'Could not process this clip (' + parsed.error.slice(0, 120) + '). Play it and type the note.'
        : 'No athlete recognised in this clip.',
      raw_segment: parsed.transcript || ''
    }];
  }
  return obs.map(function (o) {
    var a = byId[o.athlete_id];
    var conf = a ? Math.max(0, Math.min(1, Number(o.match_confidence) || 0)) : 0;
    return {
      Obs_ID: '',
      Timestamp: ctx.timestamp,
      Coach_ID: ctx.coachId,
      Athlete_ID: a ? a.Athlete_ID : '',
      Athlete_Name: a ? (a.First_Name + ' ' + a.Last_Name) : (o.heard_as ? '? ' + o.heard_as : ''),
      Event_Stroke: o.event_stroke || '',
      Focus_Area: o.focus_area || '',
      Observation_Type: o.observation_type || '',
      Cleaned_Note: o.cleaned_note || '',
      Raw_Transcript: o.raw_segment || parsed.transcript || '',
      Week_Start_Date: weekStartOf_(ctx.timestamp),
      Clip_ID: ctx.clipId,
      Audio_Link: ctx.audioLink,
      Match_Confidence: conf.toFixed(2),
      Review_Status: a && conf >= MIN_MATCH_CONFIDENCE ? 'Auto' : 'Needs_Review',
      Session_Tag: ctx.session
    };
  });
}

function noteSummary_(rows) {
  return rows.map(function (r) {
    return { obsId: r.Obs_ID, athlete: r.Athlete_Name, note: r.Cleaned_Note, status: r.Review_Status, conf: r.Match_Confidence };
  });
}

function saveClip_(base64, mime, clipId, timestamp) {
  var ext = (mime.split('/')[1] || 'bin').split(';')[0];
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, timestamp.replace(/[: ]/g, '-') + '_' + clipId + '.' + ext);
  return DriveApp.getFolderById(ensureAudioFolder_()).createFile(blob).getUrl();
}

/** Vocabulary for the parser: the sport's defaults plus values already used in the log. */
function vocab_(athletes) {
  var sport = (athletes[0] && athletes[0].Sport_Discipline) || 'Swimming';
  var base = VOCAB[sport] || VOCAB.Swimming;
  var log = readTable_('Coach_Feedback_Log');
  var v = {};
  ['Event_Stroke', 'Focus_Area', 'Observation_Type'].forEach(function (k) {
    v[k] = uniq_(base[k].concat(log.map(function (r) { return r[k]; })));
  });
  return v;
}

/** Everything the coach's Review and Inbox screens and coverage strip need. */
function coach_overview(code) {
  coach_(code);
  var week = weekStartOf_(fmtDate_(new Date()));
  var athletes = activeAthletes_();
  var log = readTable_('Coach_Feedback_Log');
  var threads = readTable_('Athlete_Coach_Threads');

  var coverage = athletes.map(function (a) {
    var n = log.filter(function (r) {
      return r.Athlete_ID === a.Athlete_ID && r.Week_Start_Date === week && r.Review_Status !== 'Deleted';
    }).length;
    return { id: a.Athlete_ID, name: a.First_Name + ' ' + a.Last_Name, first: a.First_Name, notes: n };
  });

  var since = addDays_(fmtDate_(new Date()), -3);
  var review = log.filter(function (r) {
    return r.Review_Status === 'Needs_Review' || (r.Review_Status === 'Auto' && r.Timestamp.slice(0, 10) >= since);
  }).map(obsOut_).sort(function (a, b) {
    return (a.status === 'Needs_Review' ? 0 : 1) - (b.status === 'Needs_Review' ? 0 : 1) || (a.time < b.time ? 1 : -1);
  });

  return {
    week: week,
    coverage: coverage,
    review: review,
    threads: groupThreads_(threads, log, readTable_('Weekly_Digests')),
    unread: threads.filter(function (t) { return t.Sender_Role === 'Athlete' && t.Resolution_Status === 'Unread'; }).length
  };
}

function obsOut_(r) {
  return {
    id: r.Obs_ID, time: r.Timestamp, athleteId: r.Athlete_ID, athlete: r.Athlete_Name,
    event: r.Event_Stroke, focus: r.Focus_Area, type: r.Observation_Type, note: r.Cleaned_Note,
    raw: r.Raw_Transcript, conf: r.Match_Confidence, status: r.Review_Status, audio: r.Audio_Link,
    clip: r.Clip_ID, session: r.Session_Tag, week: r.Week_Start_Date
  };
}

/** Threads newest first, each with its messages and the note or check-in it is about. */
function groupThreads_(threads, log, digests) {
  var by = {};
  threads.forEach(function (t) { (by[t.Thread_ID] = by[t.Thread_ID] || []).push(t); });
  var obsById = {};
  log.forEach(function (r) { obsById[r.Obs_ID] = r; });
  var digById = {};
  (digests || []).forEach(function (d) { digById[d.Digest_ID] = d; });
  return Object.keys(by).map(function (id) {
    var msgs = by[id].sort(function (a, b) { return a.Timestamp < b.Timestamp ? -1 : 1; });
    var ref = msgs[0].Ref_ID;
    var refText = obsById[ref] ? obsById[ref].Cleaned_Note : (digById[ref] ? 'Weekly check-in, week of ' + digById[ref].Week_Start_Date : '');
    var open = msgs.some(function (m) { return m.Sender_Role === 'Athlete' && m.Resolution_Status === 'Unread'; });
    return {
      id: id, ref: ref, refText: refText, athleteId: msgs[0].Athlete_ID, athlete: msgs[0].Athlete_Name,
      open: open, last: msgs[msgs.length - 1].Timestamp,
      status: msgs[msgs.length - 1].Resolution_Status,
      messages: msgs.map(function (m) {
        return { id: m.Message_ID, time: m.Timestamp, from: m.Sender_Role, text: m.Message_Text, status: m.Resolution_Status };
      })
    };
  }).sort(function (a, b) { return (b.open - a.open) || (a.last < b.last ? 1 : -1); });
}

function coach_confirmObs(code, obsId, athleteId, note) {
  coach_(code);
  var a = activeAthletes_().filter(function (x) { return x.Athlete_ID === athleteId; })[0];
  if (!a) throw new Error('Pick an athlete before confirming.');
  var row = findBy_('Coach_Feedback_Log', 'Obs_ID', obsId);
  var patch = { Athlete_ID: a.Athlete_ID, Athlete_Name: a.First_Name + ' ' + a.Last_Name, Review_Status: 'Confirmed' };
  if (note !== undefined && note !== null && String(note).trim()) patch.Cleaned_Note = String(note).trim();
  updateRow_('Coach_Feedback_Log', row._row, patch);
  return true;
}

/** Marks a note Deleted rather than removing it, so the log stays a full record. */
function coach_deleteObs(code, obsId) {
  coach_(code);
  updateRow_('Coach_Feedback_Log', findBy_('Coach_Feedback_Log', 'Obs_ID', obsId)._row, { Review_Status: 'Deleted' });
  return true;
}

function coach_reply(code, threadId, text) {
  var coach = coach_(code);
  text = String(text || '').trim();
  if (!text) throw new Error('Write a reply first.');
  withLock_(function () {
    var all = readTable_('Athlete_Coach_Threads');
    var msgs = all.filter(function (t) { return t.Thread_ID === threadId; });
    if (!msgs.length) throw new Error('Thread ' + threadId + ' not found.');
    msgs.forEach(function (m) {
      if (m.Sender_Role === 'Athlete' && m.Resolution_Status === 'Unread') {
        updateRow_('Athlete_Coach_Threads', m._row, { Resolution_Status: 'Replied_in_App' });
      }
    });
    appendRows_('Athlete_Coach_Threads', [{
      Thread_ID: threadId, Ref_ID: msgs[0].Ref_ID, Timestamp: fmtDateTime_(new Date()),
      Athlete_ID: msgs[0].Athlete_ID, Athlete_Name: msgs[0].Athlete_Name, Sender_Role: 'Coach',
      Message_Text: text, Question_Category: msgs[0].Question_Category, Resolution_Status: 'Resolved',
      Message_ID: nextId_(all, 'Message_ID', 'MSG', 4)
    }]);
  });
  return true;
}

function coach_markAtPractice(code, threadId) {
  coach_(code);
  readTable_('Athlete_Coach_Threads').forEach(function (m) {
    if (m.Thread_ID === threadId && m.Sender_Role === 'Athlete' && m.Resolution_Status === 'Unread') {
      updateRow_('Athlete_Coach_Threads', m._row, { Resolution_Status: 'Addressed_at_Practice' });
    }
  });
  return true;
}

function findBy_(tab, col, value) {
  var r = readTable_(tab).filter(function (x) { return x[col] === value; })[0];
  if (!r) throw new Error(value + ' not found in ' + tab + '.');
  return r;
}
