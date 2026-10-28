/* The stacked layout of "mProve Master Database V2" as read on 2026-10-25 (emails replaced). */
(function (g) {
  g.__stackedFixture = [
    ['TAB_NAME', 'ID_OR_KEY', 'COL_3', 'COL_4', 'COL_5', 'COL_6', 'COL_7', 'COL_8', 'COL_9', 'COL_10', 'COL_11', 'COL_12', ''],
    ['#ERROR!', 'Athlete_ID', 'First_Name', 'Last_Name', 'Phonetic_Aliases', 'Squad_Group', 'Sport_Discipline', 'Primary_Events_Positions', 'Athlete_Email', 'Parent_Email', '', '', ''],
    ['Roster_Config', 'ATH-001', 'Chris', 'Rus', 'Chris, Christopher, Kris', 'National Development', 'Swimming', '100 Fly, 200 Fly, 200 Free', 'chris@example.com', 'parent.rus@example.com', '', '', ''],
    ['Roster_Config', 'ATH-002', 'Drew', 'Currah', 'Drew, Dru, Andrew', 'National Development', 'Swimming', '100 Free, 200 IM, 100 Back', 'drew.currah@example.com', 'parent.currah@example.com', '', '', ''],
    ['Roster_Config', 'ATH-003', 'Sophie', 'Rus', 'Sophie, Soph', 'National Development', 'Swimming', '100 Breast, 200 Breast, 200 IM', 'sophie.rus@example.com', 'parent.rus@example.com', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['#ERROR!', 'Obs_ID', 'Timestamp', 'Coach_ID', 'Athlete_ID', 'Athlete_Name', 'Event_Stroke', 'Focus_Area', 'Observation_Type', 'Cleaned_Note', 'Raw_Transcript', 'Week_Start_Date', ''],
    ['Coach_Feedback_Log', 'OBS-101', '2026-10-20 17:14', 'COACH-01', 'ATH-001', 'Chris Rus', 'Butterfly', 'Underwaters & Finish', 'Strength + Correction', 'Hit 6 dolphin kicks off every wall; lifted head breathing into final 10m.', 'Chris 100 fly hit six kicks off every wall but lifted head breathing into the last ten meters.', '2026-10-19', ''],
    ['Coach_Feedback_Log', 'OBS-108', '2026-10-22 17:42', 'COACH-01', 'ATH-001', 'Chris Rus', 'Freestyle', 'Turns & Breakout', 'Positive Progress', 'Much tighter streamline on threshold 200s; first stroke initiation was crisp.', 'Chris threshold 200s much tighter streamline off the turn first stroke was super crisp.', '2026-10-19', ''],
    ['Coach_Feedback_Log', 'OBS-115', '2026-10-23 18:05', 'COACH-01', 'ATH-001', 'Chris Rus', 'Butterfly', 'Breath Timing', 'Correction Applied', "Kept chin neutral into the finish on sprint 50s—fixed Tuesday's head lift.", "Chris sprint 50s fly kept chin down into the wall fixed Tuesday's head lift.", '2026-10-19', ''],
    ['Coach_Feedback_Log', 'OBS-116', '2026-10-23 18:07', 'COACH-01', 'ATH-002', 'Drew Currah', 'Freestyle', 'Catch & Early Vertical Forearm', 'Correction', 'Dropped right elbow slightly on the 3rd 50 of the threshold set; strong kick tempo.', 'Drew dropped his right elbow on the third 50 of the threshold set but kick tempo was strong.', '2026-10-19', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['#ERROR!', 'Digest_ID', 'Week_Start_Date', 'Athlete_ID', 'Athlete_Name', 'Recipient_Emails', 'Linked_Obs_IDs', 'Linked_Thread_IDs', 'Linked_Journal_IDs', 'AI_Draft_Summary', 'Coach_Approval_Status', 'Sent_Timestamp', ''],
    ['Weekly_Digests', 'DIG-20261019-001', '2026-10-19', 'ATH-001', 'Chris Rus', 'chris@example.com, parent.rus@example.com', 'OBS-101, OBS-108, OBS-115', 'THR-042', 'JRN-301, JRN-309', "Hi Chris, Great progress this week on your 100/50 Fly finishes and 200 Free breakouts! You consistently hit 6 dolphin kicks off the walls on Tuesday and applied the flags breathing cue on Friday's sprint 50s (28.4s avg). Next week: carry that no-breath finish inside the flags into the back half of your 100 Fly.", 'Pending Review', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['#ERROR!', 'Thread_ID', 'Ref_ID', 'Timestamp', 'Athlete_ID', 'Athlete_Name', 'Sender_Role', 'Message_Text', 'Question_Category', 'Resolution_Status', '', '', ''],
    ['Athlete_Coach_Threads', 'THR-042', 'OBS-101', '2026-10-21 19:30', 'ATH-001', 'Chris Rus', 'Athlete', 'On the last 10m of the 100 Fly, should I focus on tucking my chin earlier or completely skipping the breath on the last two strokes?', 'Breath Timing / Finish', 'Replied_in_App', '', '', ''],
    ['Athlete_Coach_Threads', 'THR-042', 'OBS-101', '2026-10-22 15:45', 'ATH-001', 'Chris Rus', 'Coach', "Take one last low breath right at the flags (5m), then lock your eyes straight down for the final 2-3 strokes into the pads. Let's test it on Friday's sprint 50s!", 'Breath Timing / Finish', 'Resolved', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['#ERROR!', 'Jrn_ID', 'Date', 'Athlete_ID', 'Athlete_Name', 'Session_Type', 'RPE_1_to_10', 'Feel_1_to_10', 'Event_Set', 'Metric_Type', 'Metric_Value', 'Personal_Reflection', 'Visibility'],
    ['Athlete_Self_Journal', 'JRN-301', '2026-10-20', 'ATH-001', 'Chris Rus', 'PM Pool Practice', '8', '7', '8x100 Fly Main Set', 'UW Kicks / Stroke Count', '6 UW Kicks / 14 Strokes per 25m', 'Legs felt heavy on the 4th 25 of each 100; started breathing every stroke at the end.', 'Coach_Shared'],
    ['Athlete_Self_Journal', 'JRN-309', '2026-10-23', 'ATH-001', 'Chris Rus', 'PM Pool Practice', '9', '9', 'Sprint 50s Fly', 'Split Time & Breaths', '28.4s Avg / 0 Breaths Inside Flags', 'Breathing at the flags and keeping eyes down for the last 2 strokes felt much faster into the wall.', 'Coach_Shared']
  ];
})(typeof globalThis !== 'undefined' ? globalThis : window);
