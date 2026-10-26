# **mProve: Comprehensive Multi-Sport Coaching Platform**

## **1\. Summary**

In competitive sports coaching, one of the most persistent gaps identified by athletes, parents, and coaches is the lack of regular, individualized technical feedback and progress tracking between competitions. While coaches observe hundreds of micro-adjustments during daily practices and training sessions—ranging from physical technique and movement mechanics to tactical execution—the fast-paced realities of the field, court, or pool deck make written documentation nearly impossible during a workout.  
This proposal outlines a multi-faceted **Multi-Sport Coaching Application** centered around three core engagement pillars: **Coach-to-Athlete Feedback**, **Athlete-to-Coach Communication**, and **Athlete-to-Self Journaling**. For example, in competitive swimming (as well as other high-noise or fast-paced sports), coaches capture voice notes hands-free during training to generate structured observations. At the end of each week, an AI agent aggregates these observations into concise summaries for coach review and distribution. In turn, athletes actively participate through direct feedback replies and maintain personal training logs to track qualitative reflection alongside quantitative metrics.

## **2\. Problem Statement & Motivation**

Across various sporting disciplines, coaching staff face three interconnected communication challenges on the field, court, or deck:

> * **Hands-Free Dynamic Environments:** Coaches are simultaneously managing drills, tracking intervals, observing dozens of athletes, and shouting verbal corrections. Weather, motion, equipment, and time pressure prevent coaches from typing notes into a phone, tablet, or clipboard.  
> * **Retention of Verbal Feedback:** Verbal cues given during high-intensity sets or drills while an athlete is fatigued are frequently forgotten by the next session. Athletes lack a structured written record of their technical focus areas from week to week.  
> * **Administrative Overload for Coaches:** Writing personalized weekly emails for a squad or team of 25+ athletes manually takes hours of administrative time outside training hours. As a result, individualized written feedback rarely happens more than once or twice a season.

**Evidence from Club Member Surveys (The Parent & Athlete Pain Point):** Multi-year Region of Waterloo Swim Club (ROW) member surveys consistently highlight individualized progress communication as one of the sharpest pain points for families and a direct driver of athlete retention. In quantitative survey ratings on a 1-to-4 scale, the statement *"I receive clear and effective communications from the coach(es) on the progress of my child"* scored an average of just **2.43 overall** (2.53 for 10 & Under, 2.49 for ages 11–13, and 2.43 for 14 & Over), while roughly 20% of parents across all age groups felt coach-to-athlete communication was unclear and 25% of families in the 11–13 age bracket reported not receiving timely responses from coaches. Verbatim parent comments repeatedly underscored this frustration—noting *"we as parents have not received any communication on the progress of our son,"* *"I get no communication from the coach about my child's progress, ability or general thoughts,"* *"A formal swimmer progress report process would be extremely helpful,"* and even warning that a lack of individual technical corrections and feedback led families to consider switching clubs. Bridging this gap without burning out coaches requires a system that captures feedback effortlessly in the moment and enables structured two-way follow-up.

## **3\. Proposed Platform Modules & End-to-End Workflows**

The platform integrates three operational modules designed to create a closed-loop feedback and progress-tracking system across sports, using competitive swimming as a primary illustrative case study.

### **3.1 Coach-to-Athlete Feedback Module**

The Coach-to-Athlete Feedback module replaces manual note-taking with a four-stage automated pipeline designed for demanding athletic training environments:

| Stage | Component | How It Works in Practice | Target Latency / Effort   |
| :---- | :---- | :---- | :---- |
| **Stage 1: Live Voice Capture (Pool/Field)** | Wearable Mic / Mobile App / Watch Trigger | The coach taps a single button (or uses a clip-on Bluetooth mic with push-to-talk) and speaks a 3–8 second note: *"Chris, 100 Fly main set, great hip drive off wall three, needs to keep head down on last 15 meters."* | 3–8 seconds per note; eyes never leave the action |
| **Stage 2: Speech-to-Text & Parsing** | Audio Transcription \+ Entity Extraction | Audio is transcribed using a noise-resilient ASR model (e.g., Gemini Audio / Whisper) seeded with team rosters and sport-specific terminology (e.g., swim: breakout, catch, streamline; soccer: overlap, high press; track: cadence, drive phase). | Automatic background processing (under 5 seconds) |
| **Stage 3: Structured Spreadsheet Logging** | Google Sheets API Integration | Each parsed voice note appends a structured row to the team's master Google Sheet: Timestamp, Coach, Athlete Name, Squad/Group, Sport/Event, Technical Category, Sentiment/Tag, and Raw Transcript. | Zero manual data entry; real-time audit trail in Google Sheets |
| **Stage 4: Weekly AI Synthesis & Delivery** | LLM Summarization Agent \+ Coach Review Dashboard | Once a week, an AI agent groups all rows by athlete, synthesizes recurring themes into a supportive, actionable summary, and queues drafts for the coach to review, tweak if needed, and send. | 5–10 minutes per week for the coach to review and send for the entire group |

 

### **3.2 Athlete-to-Coach Module (Interactive Communication)**

To convert passive feedback into two-way engagement, athletes can directly interact with received weekly summaries and practice observations:

> * **Targeted Replies & Clarifications:** Athletes can respond directly to specific technical cues or weekly summaries within the app to ask questions or seek clarification on specific adjustments. For example, in competitive swimming, an athlete might reply to a note on butterfly head position asking whether to adjust their breathing timing or chin tuck.  
> * **Coach Inbox & Threading:** Athlete replies are routed to a consolidated coach dashboard (and logged in the backend sheet), organizing questions by athlete or squad so coaches can quickly respond during office hours or address the question live during pre-practice briefings.

### **3.3 Athlete-to-Self Module (Journaling & Performance Tracking)**

Empowering athlete self-reflection and personal accountability through structured individual logging:

> * **Personal Athletic Journaling:** A private or coach-shared space where athletes log subjective feel, Rating of Perceived Exertion (RPE), energy levels, sleep/recovery quality, and mental focus following training sessions.  
> * **Quantitative Metrics & Split Tracking:** Allows athletes to record objective performance metrics over time. For example, in competitive swimming, athletes record stroke counts per lap, split times, and test-set benchmarks, enabling longitudinal trend analysis alongside qualitative coach feedback.

## **4\. Detailed System Architecture**

### **4.1 Audio Capture & Athlete Input Layer (Acoustics & Ergonomics)**

Sports venues (indoor pools, outdoor fields, gymnasiums) present challenging acoustic environments characterized by reverberation, crowd or water noise, whistles, and ambient equipment sound. To ensure reliable capture across all three modules:

> * **Coach Hardware Options:** Support for water-resistant directional lapel/clip-on Bluetooth microphones (e.g., DJI Mic / Rode Wireless / bone-conduction headset mic with noise cancellation) paired to a phone in a waterproof pouch, or direct capture via an Apple Watch / mobile screen with a giant full-screen "Hold or Tap to Record" button.  
> * **Offline-First Queueing:** Venues often have spotty Wi-Fi or cellular reception. The mobile client caches short audio snippets and athlete journal entries locally on the device and automatically syncs them to the cloud processing endpoint as soon as connectivity is restored.  
> * **Multi-Athlete Utterance Splitting:** If a coach records a single voice memo mentioning multiple athletes in sequence (e.g., *"Chris had strong turns; Drew dropped his elbow on the turn; Alex had great momentum"*), the parser automatically splits the single audio clip into separate spreadsheet rows for each athlete.  
> * **Frictionless Athlete Mobile & Tablet UI:** Athletes can log post-practice journal entries and reply to coach digests via quick slider ratings (1–10 RPE/Feel), voice-to-text reflection notes, and structured metric inputs (time, stroke count, target hit/miss).

### **4.2 Unified Spreadsheet Data Schema (Five-Tab Google Sheets Backend)**

Using Google Sheets as the central data store keeps the entire closed-loop platform transparent, editable, and immediately accessible to coaches and athletes without requiring complex database administration. To support all three modules (**Coach-to-Athlete**, **Athlete-to-Coach**, and **Athlete-to-Self**), the master workbook is structured into five linked relational tabs:

> 1. **Tab 1 — \`Roster\_Config\` (Core Identity & Routing):** Stores \`Athlete\_ID\`, \`First\_Name\`, \`Last\_Name\`, \`Phonetic\_Aliases\` (to prevent speech-to-text misspellings of uncommon names), \`Squad\_Group\`, \`Sport\_Discipline\`, \`Primary\_Events\_Positions\`, \`Athlete\_Email\`, and \`Parent\_Email\`.  
> 2. **Tab 2 — \`Coach\_Feedback\_Log\` (Module 3.1 — Coach-to-Athlete Raw Observations):** The live append-only table populated by the coach's voice notes during practice (\`Observation\_ID\`, \`Timestamp\`, \`Coach\_ID\`, \`Athlete\_ID\`, \`Event\_Stroke\`, \`Focus\_Area\`, \`Observation\_Type\`, \`Cleaned\_Note\`, \`Raw\_Transcript\`).  
> 3. **Tab 3 — \`Weekly\_Digests\` (Module 3.1 — AI Synthesis & Delivery Queue):** Stores the weekly AI-synthesized reports (\`Digest\_ID\`, \`Week\_Start\_Date\`, \`Athlete\_ID\`, \`Linked\_Observation\_IDs\`, \`Linked\_Journal\_IDs\`, \`AI\_Draft\_Summary\`, \`Coach\_Approval\_Status\` \[\`Pending Review\`, \`Approved\`, \`Sent\`\], and \`Sent\_Timestamp\`).  
> 4. **Tab 4 — \`Athlete\_Coach\_Threads\` (Module 3.2 — Athlete-to-Coach Interactive Q\&A):** Captures two-way replies tied to specific weekly digests or observations (\`Thread\_ID\`, \`Parent\_Digest\_or\_Obs\_ID\`, \`Timestamp\`, \`Athlete\_ID\`, \`Sender\_Role\` \[\`Athlete\` or \`Coach\`\], \`Message\_Text\`, \`Question\_Category\`, and \`Resolution\_Status\` \[\`Unread\`, \`Replied\_in\_App\`, \`Addressed\_at\_Practice\`\]).  
> 5. **Tab 5 — \`Athlete\_Self\_Journal\` (Module 3.3 — Athlete-to-Self Reflections & Quantitative Metrics):** Stores the athlete's post-session reflections and objective performance numbers (\`Journal\_ID\`, \`Date\`, \`Athlete\_ID\`, \`Session\_Type\`, \`RPE\_1\_to\_10\`, \`Feel\_Energy\_Score\`, \`Event\_Drill\`, \`Quantitative\_Metric\_Type\` \[e.g., \`50m Pace\`, \`Stroke Count\`, \`Underwaters\`\], \`Metric\_Value\`, \`Target\_Goal\`, \`Personal\_Reflection\`, and \`Visibility\` \[\`Coach\_Shared\` vs. \`Private\`\]).

**4.2.1 Sample Schema: \`Coach\_Feedback\_Log\` (Module 3.1 — Coach-to-Athlete)**

| Obs\_ID | Timestamp | Athlete | Stroke / Event | Focus Area | Observation Type | Cleaned Note   |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| OBS-101 | 2026-10-20 17:14 | Chris R. | Butterfly | Underwaters & Finish | Strength \+ Correction | Hit 6 dolphin kicks off every wall; lifted head breathing into final 10m. |
| OBS-108 | 2026-10-22 17:42 | Chris R. | Freestyle | Turns & Breakout | Positive Progress | Much tighter streamline on threshold 200s; first stroke initiation was crisp. |
| OBS-115 | 2026-10-23 18:05 | Chris R. | Butterfly | Breath Timing | Correction Applied | Kept chin neutral into the finish on sprint 50s—fixed Tuesday's head lift. |
| OBS-116 | 2026-10-23 18:07 | Drew C. | Freestyle | Catch & Early Vertical Forearm | Correction | Dropped right elbow slightly on the 3rd 50 of the threshold set; strong kick tempo. |

**4.2.2 Sample Schema: \`Athlete\_Coach\_Threads\` (Module 3.2 — Athlete-to-Coach Interactive Replies)**

| Thread\_ID | Ref\_ID | Timestamp | Athlete | Sender | Message / Clarification | Status   |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| THR-042 | OBS-101 | 2026-10-21 19:30 | Chris R. | Athlete | "On the last 10m of the 100 Fly, should I focus on tucking my chin earlier or completely skipping the breath on the last two strokes?" | Replied\_in\_App |
| THR-042 | OBS-101 | 2026-10-22 15:45 | Chris R. | Coach | "Take one last low breath right at the flags (5m), then lock your eyes straight down for the final 2–3 strokes into the pads. Let's test it on Friday's sprint 50s\!" | Resolved |

**4.2.3 Sample Schema: \`Athlete\_Self\_Journal\` (Module 3.3 — Athlete-to-Self Journaling & Metrics)**

| Jrn\_ID | Date | Athlete | RPE / Feel | Event / Set | Metric Logged | Athlete Personal Reflection | Visibility   |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| JRN-301 | 2026-10-20 | Chris R. | RPE 8 / Feel 7 | 8x100 Fly Main Set | 6 UW Kicks / 14 Strokes per 25m | "Legs felt heavy on the 4th 25 of each 100; started breathing every stroke at the end." | Coach\_Shared |
| JRN-309 | 2026-10-23 | Chris R. | RPE 9 / Feel 9 | Sprint 50s Fly | 28.4s Avg / 0 Breaths Inside Flags | "Breathing at the flags and keeping eyes down for the last 2 strokes felt much faster into the wall." | Coach\_Shared |

 

### **4.3 The Weekly Multi-Source AI Synthesis Agent**

Every weekend (or on a schedule triggered by the coach), the AI synthesis pipeline reads all rows for the past 7 days across **all three modules** (\`Coach\_Feedback\_Log\`, \`Athlete\_Coach\_Threads\`, and \`Coach\_Shared\` rows in \`Athlete\_Self\_Journal\`), groups them by \`Athlete\_ID\`, and produces a holistic weekly check-in. By combining coach voice notes with the athlete's own journaled metrics and mid-week questions, the agent highlights alignment between what the athlete felt and what the coach observed.  
**Example AI Agent Prompt Logic & Output Structure:**

SYSTEM PROMPT:  
You are an expert sports coach assistant for the mProve platform. Given an athlete's raw practice observations from the coach (Module 1), any mid-week Q\&A threads between the athlete and coach (Module 2), and the athlete's coach-shared self-journal metrics and reflections (Module 3), write a concise, encouraging, and technically specific weekly check-in (140-180 words).  
Structure the summary into three clear parts:  
1\. Wins & Highlights This Week (connecting coach observations with the athlete's logged metrics/reflections)  
2\. Technical Focus for Next Week (1-2 specific, actionable cues building on mid-week Q\&A and practice trends)  
3\. Coach's Note (brief motivating closing inviting the athlete to reply or log next week's target in their journal)  
Avoid generic filler; ground every sentence in the specific techniques, metrics, and drills logged in the spreadsheet.

GENERATED OUTPUT EXAMPLE (SWIMMING CASE STUDY \- CHRIS):  
Subject: Weekly mProve Check-In: Chris — Great Progress on Fly Finishes & Free Breakouts\!

Hi Chris,  
Here is a recap of your training week across our deck notes and your training journal:  
• Wins & Highlights: Your underwater discipline was a major strength—you consistently hit 6 dolphin kicks off every wall on Tuesday's 8x100 Fly set, and your tighter streamline on Thursday's threshold 200 Free set led to much cleaner breakouts. Best of all, after you asked in the app about your breathing timing into the finish, you applied the "last breath at the flags" cue on Friday's sprint 50s—holding 28.4s with zero breaths inside 5m and noting in your journal how much faster your wall touch felt.  
• Focus for Next Week: Let's carry that eyes-down, no-breath finish from your sprint 50s into the 3rd and 4th 25s of your 100 Fly sets when your legs start feeling heavy.  
Reply right in this thread if you want to review video on Monday, and set your stroke-count target in your journal for Tuesday's main set\!

### **4.4 Coach-in-the-Loop Approval & Coverage Guardrails**

To ensure high coaching quality and equitable attention across the squad:

> * **Coverage Heatmap & Unanswered Question Badges:** A simple indicator on the coach's mobile app shows which athletes in the squad have fewer than 2 voice notes logged for the current week, alongside a badge for any unread \`Athlete\_Coach\_Threads\` questions, prompting the coach to follow up on deck.  
> * **Human-in-the-Loop Review:** No AI summary is ever sent automatically without coach sign-off. The coach opens a clean review view (or the \`Weekly\_Digests\` sheet), scans the generated blurbs, makes any quick 5-second edits, and clicks **"Approve & Send All"**.

## **5\. Proposed MVP Tech Stack & Implementation Options**

This project can be built iteratively, starting with a lightweight prototype that can be tested in live training within days before building a dedicated mobile client.

| Layer | Option A: Rapid Prototype (Weekend Build) | Option B: Custom App Build (Production / Club Scale)   |
| :---- | :---- | :---- |
| **Coach Audio Capture Frontend** | iOS Shortcut / Apple Watch Action Button or lightweight Progressive Web App (PWA) uploading voice memos to a Google Drive folder. | Custom React Native / Flutter or MIT App Inventor mobile app with offline audio caching, Bluetooth mic trigger, and live roster coverage badges. |
| **Athlete Q\&A & Self-Journaling UI** | Mobile-friendly Google Forms / Glide / AppSheet interface writing directly to \`Athlete\_Coach\_Threads\` and \`Athlete\_Self\_Journal\` tabs. | Dedicated Athlete Mobile Portal with interactive digest threads, split/stroke-count calculators, and longitudinal progress charts. |
| **Transcription & Entity Extraction** | Gemini API (multimodal audio input) or OpenAI Whisper API returning structured JSON (\`athlete\`, \`event\`, \`focus\`, \`note\`). | Python Cloud Function / FastAPI backend calling Gemini API with custom team roster context for high-accuracy name matching. |
| **Database / Storage** | 5-Tab Google Sheet (\`Roster\_Config\`, \`Coach\_Feedback\_Log\`, \`Weekly\_Digests\`, \`Athlete\_Coach\_Threads\`, \`Athlete\_Self\_Journal\`). | Google Sheets (for coach visibility) synced with Firebase / Supabase or BigQuery for longitudinal season-long analytics. |
| **Weekly Synthesis & Delivery** | Google Apps Script menu button inside the Sheet (\`Generate Weekly Summaries\` & \`Send Approved Emails via Gmail\`). | Dedicated Coach Web Dashboard with one-click email/push notification delivery, thread inbox, and athlete journal insights. |

 

## **6\. Phased Implementation Roadmap**

> 1. **Phase 1: 5-Tab Spreadsheet \+ Voice Capture Prototype (Weeks 1–2):** Set up the 5-tab Google Sheet workbook (\`Roster\_Config\`, \`Coach\_Feedback\_Log\`, \`Weekly\_Digests\`, \`Athlete\_Coach\_Threads\`, \`Athlete\_Self\_Journal\`). Build the voice-upload endpoint that uses the Gemini API to extract the athlete's name and technical observation into \`Coach\_Feedback\_Log\`, and run an Apps Script to draft the weekly summaries.  
> 2. **Phase 2: Venue Acoustic & UX Testing (Weeks 3–4):** Test with 1 coach and a pilot group of 8–12 athletes during live practice sessions (e.g., swim deck or field). Evaluate microphone clarity against ambient noise, test phonetic name matching, and measure how many voice notes a coach naturally records during a 90-minute session.  
> 3. **Phase 3: Athlete-to-Coach Q\&A & Athlete-to-Self Journaling Rollout (Weeks 5–6):** Enable the athlete-facing mobile view so pilot athletes can reply to weekly summaries (\`Athlete\_Coach\_Threads\`) and log their post-practice RPE, feel, stroke counts, and test-set splits (\`Athlete\_Self\_Journal\`), feeding both streams into the weekly AI synthesis agent.