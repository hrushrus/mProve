# mProve — Phase 1 prototype

The A+ build from the design: your Google Sheet is the database, Google Apps Script is the backend, Gemini parses voice notes and drafts the weekly check-ins, and one web app serves both the coach screens (On deck, Review, Inbox, Weekly) and the athlete screens (Check-ins, Journal, Progress).

Design page: https://claude.ai/artifact/GAfuGdXnN2ZwPAsLF5NJEA

## What's in `src/`

| File | What it does |
| --- | --- |
| `Config.gs` | Tab columns, dropdown values, swim vocabulary, thresholds |
| `Sheets.gs` | Reading and writing rows by header name, IDs, dates |
| `Setup.gs` | The **mProve** menu, splitting your stacked sheet into five tabs, app links, schedules |
| `Gemini.gs` | Voice-note parsing and the weekly check-in prompt (the spec's section 4.3 prompt) |
| `WebApp.gs` | Serves the app, the upload endpoint for an iOS Shortcut, sign-in by personal link |
| `Coach.gs` | Upload and parse notes, Review, Inbox, coverage |
| `Weekly.gs` | Drafting, approval, and sending check-ins by email |
| `Athlete.gs` | Check-ins, replies, journal, progress data |
| `Index.html` | The app itself |
| `appsscript.json` | Time zone (Toronto), permissions, web app settings |

## Setup (about 20 minutes)

1. **Back up the sheet.** In *mProve Master Database V2*, use File › Make a copy. Setup keeps your original data in a tab named `Archive_V2`, but a copy is cheap insurance.
2. **Add the code.** In the sheet, open Extensions › Apps Script.
   - Delete the empty `Code.gs`.
   - Create a script file for each `.gs` file above (name it without `.gs`) and paste its contents. Create an HTML file named `Index` and paste `Index.html`.
   - In Project Settings (gear icon), tick **Show "appsscript.json" manifest file**, then replace its contents with `appsscript.json`.
3. **Add the Gemini key.** Get a key at https://aistudio.google.com/apikey. In Project Settings › Script properties, add `GEMINI_API_KEY` with the key. The default model is `gemini-2.5-flash`. To use a different one, add `GEMINI_MODEL`.
4. **Split the sheet.** Reload the spreadsheet. A **mProve** menu appears. Choose mProve › Set up workbook and approve the permissions. Setup will:
   - create the five tabs with your existing column names plus the added ones, and copy every row into them
   - rename the original sheet to `Archive_V2`
   - split journal values like "28.4s Avg / 0 Breaths Inside Flags" into one number per row
   - add a coach row (`COACH-01`) to `Roster_Config` with your email, and give everyone a private access code
   - create a Drive folder called *mProve audio clips*
5. **Fix the coach row.** In `Roster_Config`, change the `COACH-01` row's name and email to the real coach's.
6. **Deploy the web app.** In Apps Script, choose Deploy › New deployment › Web app. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. "Anyone" lets athletes without a Google account open it. Each person's private link is what signs them in.
7. **Share the links.** In the sheet, choose mProve › Show app links. Send each person only their own link. On a phone, open the link and use Share › Add to Home Screen so it opens like an app.
8. **Turn on the schedules.** Choose mProve › Install schedules. Drafts are then written every Sunday at 18:00, and audio clips older than 30 days are deleted nightly.

## How it behaves

- **On deck.** Hold the big button to talk, or tap once to start and once to stop. Clips are saved on the phone first and upload when there's signal, so a dropped connection loses nothing. One clip can name several athletes, and each gets its own row in `Coach_Feedback_Log`.
- **Review.** A note whose name match is below 85% is marked `Needs_Review` and left out of check-ins until the coach picks the athlete. Deleting a note marks it `Deleted` instead of removing the row.
- **Weekly.** An athlete gets a draft if they have at least 2 notes, or 1 note plus a shared journal entry. Otherwise they're marked `Skipped`. Nothing is emailed until the coach approves it. **Approve & Send All** asks for a second tap before sending. Regenerating never touches check-ins that are already approved or sent.
- **Athletes** only see their own sent check-ins, their own notes (once confirmed or sent), their own conversations, and their own journal. Private journal entries never reach the coach or Gemini.

## Things to check in the Phase 2 pool test

- **Microphone inside the app.** Apps Script shows the app inside a Google frame. If a phone's browser won't allow the microphone there, the button shows a message and **Session & options › Upload a voice memo** opens the phone's own recorder instead. Check this on the coach's actual phone first.
- **Email limits.** A personal Gmail account can send to about 100 recipients a day from Apps Script. A 12-athlete pilot with parents on CC is about 24.
- **Name matching.** Add any misheard names to `Phonetic_Aliases`. They go straight into the prompt.

## Optional: iOS Shortcut or Apple Watch capture (experimental)

The deployment URL also accepts uploads directly. Build a Shortcut with these actions: **Record Audio** → **Base64 Encode** → **Get Contents of URL**. Set the method to POST and use this JSON body:

```json
{ "k": "<coach access code>", "audio": "<Base64 Encoded>", "mime": "audio/mp4",
  "session": "Senior Performance · PM", "clipId": "<Current Date, formatted as a number>" }
```

Assign the Shortcut to the Watch or iPhone Action Button. Gemini's support for iPhone `.m4a` audio hasn't been tested yet. If clips come back flagged "Could not process", use the in-app recorder, which sends WAV.

## Tests

`test/run.js` runs the backend against an in-memory copy of your sheet's current layout and checks 20 behaviours: setup, splitting into tabs, parsing, review, threads, journal, drafts, sending, and privacy. `test/preview.js` renders every screen in Chromium in light and dark mode.

```
node test/run.js
NODE_PATH=$(npm root -g) node test/preview.js   # needs Playwright; screenshots go to test/out/
```
