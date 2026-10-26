# mProve — handoff for coding agents

Read this first. It covers everything decided so far, what's built, what's been verified, and what's still open. Setup steps for a human are in `README.md`.

## What mProve is

mProve is a coaching app, swimming first but built so other sports can be added. The full spec is `docs/mProve_V3_spec.md`. It has three modules:

1. **Coach → Athlete.** The coach records 3–8 second voice notes on deck. Gemini transcribes each note and splits it per athlete, and each piece becomes a row in a Google Sheet. Once a week, AI drafts a 140–180 word check-in per athlete (Wins & Highlights / Focus for Next Week / Coach's Note). The coach reviews, edits and approves. **Nothing is ever sent without the coach's approval.**
2. **Athlete → Coach.** Athletes reply to a specific note or to a check-in. The coach sees these in an inbox.
3. **Athlete → Self.** A journal for RPE, feel, metrics against targets and a written reflection. Each entry is either Private or Coach_Shared, and only shared entries go to the AI.

The owner is Horatiu (GitHub `hrushrus`). The pilot is one coach and 8–12 athletes. Most athletes are minors, so be conservative with their data.

## Decisions already made

- **Design (Phase 1):** https://claude.ai/artifact/GAfuGdXnN2ZwPAsLF5NJEA. The source is `docs/design.html` (a page fragment, so open it in a browser as-is). It has 7 screens: coach On deck / Review / Inbox / Weekly, and athlete Check-ins / Journal / Progress. It also covers the flows, the data model and the risks.
- **Stack: "A+"** (chosen by Horatiu on 2026-10-25). This is the spec's Option A Google backend (Sheets as the database, Apps Script, Gemini API, Gmail), with one HtmlService web app in front of it that serves both the coach and athlete screens. It was preferred over Option A alone (Forms/Shortcuts) and over Option B (React Native + separate backend). Option B is for after the Phase 2 pilot.
- **The Google Sheet is the source of truth.** The coach must always be able to open and edit the rows directly. Columns are found by header name, and the app's added columns are appended after the existing ones so the user's headers never move.
- **Sign-in uses a personal link per person**: `…/exec?k=<Access_Code>`, with the code stored in `Roster_Config.Access_Code`. This is because with a consumer Gmail account, Apps Script can't identify who is visiting a web app deployed as "Execute as me". The web app is deployed as Execute as: Me and Access: Anyone. Every server function checks the code and returns only that person's rows. Athletes never get access to the Sheet itself.

## The database

The sheet is *mProve Master Database V2*, id `13mKskuiQt7ecyckl8ESJmPx3zpzPsqSzHjn9J4nAJ4s`.

**Current layout as of 2026-10-26, and Horatiu has not yet run setup:** all five tables are **stacked in one sheet**. Column A holds the tab name on every data row. Each block has a header row whose column A shows `#ERROR!`, and blank rows separate the blocks. `test/fixture.js` is an exact copy of this layout with the emails replaced. The sample data is ATH-001 Chris Rus, ATH-002 Drew Currah, ATH-003 Alex Chen, observations OBS-101/108/115/116, digest DIG-20261019-001 (Pending Review), thread THR-042 (2 messages), and journal entries JRN-301 and JRN-309.

The sheet has three problems, and `mProve › Set up workbook` (`src/Setup.gs`) fixes all of them:

1. **Stacked tables.** The app can't append rows safely in the middle of the sheet. Setup copies each block into its own tab with headers in row 1 and renames the original to `Archive_V2`. It's idempotent: tabs that already have rows are skipped.
2. **No roster row for `COACH-01`**, even though the notes reference it. Setup adds a Coach row using the owner's email, and the coach should then edit the name and email. Coaches live in `Roster_Config` with `Role = Coach`. There is no sixth tab.
3. **Journal `Metric_Value` holds several values as text**, e.g. "28.4s Avg / 0 Breaths Inside Flags", which can't be charted. Setup splits these into one numeric row per metric sharing the same `Jrn_ID`, and adds `Metric_Unit` and `Target_Goal`.

The full column lists are in `src/Config.gs` (`TABS`). Columns the app adds: Roster `Role, Active, Access_Code`; Coach_Feedback_Log `Clip_ID, Audio_Link, Match_Confidence, Review_Status (Auto/Needs_Review/Confirmed/Deleted), Session_Tag`; Weekly_Digests `Final_Text`, plus the status `Skipped`; Threads `Message_ID`; Journal `Metric_Unit, Target_Goal, Sleep_Quality, Mental_Focus`. Every cell is plain text (`@` format), and dates are `yyyy-MM-dd` or `yyyy-MM-dd HH:mm` in America/Toronto. Weeks start on Monday.

## Code map

| File | Role |
| --- | --- |
| `src/Config.gs` | Columns, dropdown values, swim vocabulary, thresholds (85% name match, 2 notes per digest, 30-day audio retention), default model `gemini-2.5-flash` |
| `src/Sheets.gs` | Row read/write by header, `nextId_`, `withLock_` (LockService), date helpers |
| `src/Setup.gs` | `onOpen` menu, the stacked-sheet migration, app links dialog, triggers (Sunday 18:00 drafts, nightly audio cleanup) |
| `src/Gemini.gs` | REST `generateContent` with a JSON `responseSchema`. Contains the note-parsing prompt (roster + aliases + vocabulary) and the spec's §4.3 digest prompt |
| `src/WebApp.gs` | `doGet` (serves `Index.html`), `doPost` (Shortcut upload), `person_`/`coach_` access checks |
| `src/Coach.gs` | `coach_uploadNote` (idempotent per `Clip_ID`, saves a flagged row if Gemini fails), overview/coverage, review, inbox replies |
| `src/Weekly.gs` | Draft generation (never touches Approved/Sent), approve, `coach_approveAndSendAll`, MailApp email (athlete as To, parent as CC) |
| `src/Athlete.gs` | Athlete home (only Sent digests, plus notes that are Confirmed or were included in a sent digest), posting, journal |
| `src/Index.html` | The whole client: vanilla JS, `google.script.run`, IndexedDB offline queue, in-browser 16 kHz WAV recording, file-upload fallback, SVG progress chart |

Conventions: Apps Script V8, written in ES5 style (`var`, function expressions). Functions ending in `_` are private. The menu functions call `requireSheetUi_()` so they can't be run through `google.script.run`. Triggered functions check `e.triggerUid`.

## What's verified and what isn't

- **Verified locally:** `node test/run.js` runs 20 checks against in-memory mocks of SpreadsheetApp, Drive, Mail and UrlFetch, using the real stacked layout. They cover the migration, sign-in and role checks, splitting a clip with several athletes, retries, Gemini failures, review, threads, journal, drafting and skipping, the rule that nothing is emailed before approval, sending, and athletes seeing only their own data. `NODE_PATH=$(npm root -g) node test/preview.js` renders every screen in Chromium at 390px in light and dark mode, and checks for console errors and horizontal overflow (screenshots go to `test/out/`).
- **Simulated only, never run for real:** the Gemini API calls (both prompts), MailApp sending, DriveApp audio storage, HtmlService templating (`<?= accessCode ?>` is expected to output a JS string literal), and the real Apps Script deployment.
- **Unknown, to test on a real phone:**
  - Whether `getUserMedia` works inside the Apps Script iframe. If it doesn't, the app falls back to "Upload a voice memo".
  - Whether Gemini accepts iPhone `.m4a` uploads from the experimental iOS Shortcut path (`doPost`). The in-app recorder sends WAV.
  - Whether the `gemini-2.5-flash` model id is still served. If not, override it with the `GEMINI_MODEL` script property.

## Open steps

1. Horatiu runs the README setup: paste the code into Apps Script, add `GEMINI_API_KEY`, run Set up workbook, fix the coach row, deploy, share the links, install the schedules. Then fix whatever the first real run turns up (Gemini response shape, templating, permissions).
2. Phase 2 pool test (spec §6): mic clarity against noise, phonetic name matching, how many notes a coach records per 90-minute session, and the microphone question above.
3. Phase 3: turn on the athlete screens for the pilot. They're built already but were meant to stay off during the Phase 2 deck tests (there's no feature flag yet).
4. Not built: push notifications, a journal reminder 30 minutes after practice (the design mentions it), Gemini categorising athletes' questions (the category is copied from the note's Focus_Area for now), support for other sports' vocabularies beyond `VOCAB.Swimming`, and expiring or rotating access codes.
5. Privacy to-do before a wider rollout: parental consent for recording minors' names, and confirming that 30 days is the right audio retention period. A personal Gmail account can send to about 100 email recipients a day. A Workspace account or Option B is needed at club scale.
