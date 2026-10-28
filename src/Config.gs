/**
 * mProve Phase 1 — configuration.
 *
 * Column lists keep the order of "mProve Master Database V2"; columns the app
 * adds are appended at the end of each tab so existing headers never move.
 */

var TABS = {
  Roster_Config: [
    'Athlete_ID', 'First_Name', 'Last_Name', 'Phonetic_Aliases', 'Squad_Group',
    'Sport_Discipline', 'Primary_Events_Positions', 'Athlete_Email', 'Parent_Email',
    // added
    'Role', 'Active', 'Access_Code'
  ],
  Coach_Feedback_Log: [
    'Obs_ID', 'Timestamp', 'Coach_ID', 'Athlete_ID', 'Athlete_Name', 'Event_Stroke',
    'Focus_Area', 'Observation_Type', 'Cleaned_Note', 'Raw_Transcript', 'Week_Start_Date',
    // added
    'Clip_ID', 'Audio_Link', 'Match_Confidence', 'Review_Status', 'Session_Tag'
  ],
  Weekly_Digests: [
    'Digest_ID', 'Week_Start_Date', 'Athlete_ID', 'Athlete_Name', 'Recipient_Emails',
    'Linked_Obs_IDs', 'Linked_Thread_IDs', 'Linked_Journal_IDs', 'AI_Draft_Summary',
    'Coach_Approval_Status', 'Sent_Timestamp',
    // added
    'Final_Text'
  ],
  Athlete_Coach_Threads: [
    'Thread_ID', 'Ref_ID', 'Timestamp', 'Athlete_ID', 'Athlete_Name', 'Sender_Role',
    'Message_Text', 'Question_Category', 'Resolution_Status',
    // added
    'Message_ID'
  ],
  Athlete_Self_Journal: [
    'Jrn_ID', 'Date', 'Athlete_ID', 'Athlete_Name', 'Session_Type', 'RPE_1_to_10',
    'Feel_1_to_10', 'Event_Set', 'Metric_Type', 'Metric_Value', 'Personal_Reflection',
    'Visibility',
    // added
    'Metric_Unit', 'Target_Goal', 'Sleep_Quality', 'Mental_Focus'
  ]
};

/** Dropdown values written on setup. */
var CHOICES = {
  Roster_Config: {
    Role: ['Athlete', 'Coach'],
    Active: ['yes', 'no'],
    Squad_Group: ['National Development', 'Provincial Development', 'Senior Development']
  },
  Coach_Feedback_Log: { Review_Status: ['Auto', 'Needs_Review', 'Confirmed', 'Deleted'] },
  Weekly_Digests: { Coach_Approval_Status: ['Pending Review', 'Approved', 'Sent', 'Skipped'] },
  Athlete_Coach_Threads: {
    Sender_Role: ['Athlete', 'Coach'],
    Resolution_Status: ['Unread', 'Replied_in_App', 'Addressed_at_Practice', 'Resolved']
  },
  Athlete_Self_Journal: { Visibility: ['Coach_Shared', 'Private'] }
};

/** Starting vocabulary per sport; values already in the log are added to these. */
var VOCAB = {
  Swimming: {
    Event_Stroke: ['Butterfly', 'Backstroke', 'Breaststroke', 'Freestyle', 'IM', 'Kick', 'Starts'],
    Focus_Area: ['Underwaters & Finish', 'Turns & Breakout', 'Breath Timing',
      'Catch & Early Vertical Forearm', 'Streamline', 'Kick Tempo', 'Body Position',
      'Pacing', 'Starts & Reaction', 'Stroke Rate'],
    Observation_Type: ['Strength', 'Correction', 'Strength + Correction',
      'Positive Progress', 'Correction Applied']
  }
};

var MIN_MATCH_CONFIDENCE = 0.85;  // below this a note waits for coach review
var MIN_NOTES_FOR_DIGEST = 2;     // with no shared journal entries either, the week is skipped
var AUDIO_RETENTION_DAYS = 30;
var DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function prop_(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v === null || v === '' ? fallback : v;
}
