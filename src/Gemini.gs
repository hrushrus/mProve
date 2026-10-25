/**
 * Gemini calls: voice note parsing and weekly check-in drafting.
 * Set GEMINI_API_KEY (and optionally GEMINI_MODEL) in Project Settings › Script properties.
 */

function gemini_(parts, schema) {
  var key = prop_('GEMINI_API_KEY', '');
  if (!key) throw new Error('GEMINI_API_KEY is not set in Script properties.');
  var model = prop_('GEMINI_MODEL', DEFAULT_GEMINI_MODEL);
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';
  var body = {
    contents: [{ role: 'user', parts: parts }],
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json', responseSchema: schema }
  };
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code !== 200) throw new Error('Gemini returned ' + code + ': ' + text.slice(0, 300));
  var data = JSON.parse(text);
  var out = data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
  if (!out) throw new Error('Gemini returned no content.');
  return JSON.parse(out);
}

var NOTE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    observations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          athlete_id: { type: 'STRING', description: 'Roster ID, or empty string if no athlete matches' },
          heard_as: { type: 'STRING' },
          match_confidence: { type: 'NUMBER', description: '0 to 1' },
          event_stroke: { type: 'STRING' },
          focus_area: { type: 'STRING' },
          observation_type: { type: 'STRING' },
          cleaned_note: { type: 'STRING' },
          raw_segment: { type: 'STRING' }
        },
        required: ['athlete_id', 'heard_as', 'match_confidence', 'event_stroke', 'focus_area',
          'observation_type', 'cleaned_note', 'raw_segment']
      }
    }
  },
  required: ['transcript', 'observations']
};

/** Builds the parsing prompt from the roster and vocabulary. Pure, so it can be tested. */
function notePrompt_(roster, vocab) {
  var lines = roster.map(function (r) {
    return r.Athlete_ID + ' | ' + r.First_Name + ' ' + r.Last_Name +
      ' | heard as: ' + (r.Phonetic_Aliases || r.First_Name) +
      ' | events: ' + (r.Primary_Events_Positions || '-');
  });
  return [
    'You transcribe and structure a swim coach\'s voice note recorded on a noisy pool deck.',
    'The note may mention several athletes; return one observation per athlete mentioned, in order.',
    'Match each spoken name to the roster below using names and "heard as" aliases.',
    'Give match_confidence near 1 only when the name clearly matches one athlete. If no athlete fits, use an empty athlete_id and confidence 0.',
    'Choose event_stroke, focus_area and observation_type from the lists when one fits; otherwise write a short label.',
    'cleaned_note: one or two plain sentences in the coach\'s meaning, fixing filler words, using metres as "m".',
    'raw_segment: the words from the transcript that belong to this athlete.',
    '',
    'ROSTER',
    lines.join('\n'),
    '',
    'EVENT_STROKE: ' + vocab.Event_Stroke.join('; '),
    'FOCUS_AREA: ' + vocab.Focus_Area.join('; '),
    'OBSERVATION_TYPE: ' + vocab.Observation_Type.join('; ')
  ].join('\n');
}

function parseVoiceNote_(base64Audio, mimeType, roster, vocab) {
  return gemini_([
    { text: notePrompt_(roster, vocab) },
    { inline_data: { mime_type: mimeType, data: base64Audio } }
  ], NOTE_SCHEMA);
}

var DIGEST_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subject: { type: 'STRING' },
    wins: { type: 'STRING' },
    focus: { type: 'STRING' },
    coach_note: { type: 'STRING' }
  },
  required: ['subject', 'wins', 'focus', 'coach_note']
};

/** The spec's synthesis prompt (section 4.3). */
var DIGEST_SYSTEM = [
  'You are an expert sports coach assistant for the mProve platform. Given an athlete\'s raw practice observations from the coach (Module 1), any mid-week Q&A threads between the athlete and coach (Module 2), and the athlete\'s coach-shared self-journal metrics and reflections (Module 3), write a concise, encouraging, and technically specific weekly check-in (140-180 words).',
  'Structure the summary into three clear parts:',
  '1. Wins & Highlights This Week (connecting coach observations with the athlete\'s logged metrics/reflections)',
  '2. Technical Focus for Next Week (1-2 specific, actionable cues building on mid-week Q&A and practice trends)',
  '3. Coach\'s Note (brief motivating closing inviting the athlete to reply or log next week\'s target in their journal)',
  'Avoid generic filler; ground every sentence in the specific techniques, metrics, and drills logged in the spreadsheet.',
  'Write to the athlete by first name. The subject line starts "Weekly mProve Check-In: <first name> — ".'
].join('\n');

function digestPrompt_(athlete, obs, threads, journal) {
  var o = obs.map(function (r) {
    return '- ' + r.Obs_ID + ' ' + r.Timestamp + ' | ' + r.Event_Stroke + ' | ' + r.Focus_Area + ' | ' +
      r.Observation_Type + ' | ' + r.Cleaned_Note;
  });
  var t = threads.map(function (r) {
    return '- ' + r.Thread_ID + ' (about ' + r.Ref_ID + ') ' + r.Timestamp + ' ' + r.Sender_Role + ': ' + r.Message_Text;
  });
  var j = journal.map(function (r) {
    return '- ' + r.Jrn_ID + ' ' + r.Date + ' | ' + r.Session_Type + ' | ' + r.Event_Set + ' | RPE ' + r.RPE_1_to_10 +
      ' / Feel ' + r.Feel_1_to_10 + ' | ' + r.Metric_Type + ': ' + r.Metric_Value + (r.Metric_Unit && r.Metric_Unit !== 'count' ? r.Metric_Unit : '') +
      (r.Target_Goal ? ' (target ' + r.Target_Goal + ')' : '') + ' | "' + r.Personal_Reflection + '"';
  });
  return DIGEST_SYSTEM + '\n\nATHLETE: ' + athlete.First_Name + ' ' + athlete.Last_Name +
    ' (' + (athlete.Primary_Events_Positions || '') + ')' +
    '\n\nCOACH OBSERVATIONS\n' + (o.join('\n') || '(none)') +
    '\n\nQ&A THREADS\n' + (t.join('\n') || '(none)') +
    '\n\nJOURNAL (coach-shared)\n' + (j.join('\n') || '(none)');
}

function draftDigest_(athlete, obs, threads, journal) {
  return gemini_([{ text: digestPrompt_(athlete, obs, threads, journal) }], DIGEST_SCHEMA);
}

/** Plain-text check-in as stored in AI_Draft_Summary / Final_Text. */
function digestText_(d, firstName) {
  return 'Subject: ' + d.subject + '\n\nHi ' + firstName + ',\n\n' +
    'Wins & Highlights: ' + d.wins + '\n\n' +
    'Focus for Next Week: ' + d.focus + '\n\n' + d.coach_note;
}
