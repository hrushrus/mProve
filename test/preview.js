// Renders the app in Chromium against the mocked backend and saves screenshots: node test/preview.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const gs = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.gs')).map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const boot = `
${fs.readFileSync(path.join(__dirname, 'mocks.js'), 'utf8')}
${fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8')}
${gs}
__sheets.push(new __Sheet('mProve Master Database V2', JSON.parse(JSON.stringify(__stackedFixture))));
setupWorkbook(); __noUi = true;
__nextGemini = function (body) {
  return /ATHLETE:/.test(body.contents[0].parts[0].text)
    ? { subject: 'Weekly mProve Check-In: Drew — Catch and kick', wins: 'Strong kick tempo on the threshold set.', focus: 'Fingertips down before you pull on every 3rd 50.', coach_note: 'Reply here with questions.' }
    : { transcript: 'Dru dropped his elbow', observations: [{ athlete_id: 'ATH-002', heard_as: 'Dru', match_confidence: 0.7, event_stroke: 'Freestyle', focus_area: 'Catch & Early Vertical Forearm', observation_type: 'Correction', cleaned_note: 'Dropped elbow on the catch.', raw_segment: 'Dru dropped his elbow' }] };
};
coach_uploadNote(readTable_('Roster_Config').find(r => r.Role === 'Coach').Access_Code, { audio: 'AAAA', clipId: 'C1' });
athlete_post(readTable_('Roster_Config').find(r => r.Athlete_ID === 'ATH-002').Access_Code, 'OBS-116', 'Is it the catch or the recovery?');
var __codes = {}; readTable_('Roster_Config').forEach(function (r) { __codes[r.Athlete_ID] = r.Access_Code; });
window.google = { script: { get run() {
  var ok, fail;
  var h = { withSuccessHandler: function (f) { ok = f; return p; }, withFailureHandler: function (f) { fail = f; return p; } };
  var p = new Proxy(h, { get: function (t, k) { if (k in t) return t[k]; return function () { var a = arguments;
    setTimeout(function () { try { var r = JSON.parse(JSON.stringify(window[k].apply(null, a) ?? null)); ok && ok(r); } catch (e) { console.error(e); fail && fail(e); } }, 30); }; } });
  return p;
} } };`;
let html = fs.readFileSync(path.join(root, 'src', 'Index.html'), 'utf8');
html = html.replace('<script>\nvar SERVER_CODE', () => '<script>' + boot + '</script>\n<script>\nvar SERVER_CODE')
  .replace('<?= accessCode ?>', () => 'window.__codes[window.__who]');
const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [who, views] of [['COACH-01', ['deck', 'review', 'inbox', 'weekly']], ['ATH-001', ['checkins', 'journal', 'progress']]]) {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
      page.on('console', m => { if (m.type() === 'error') errors.push(who + ': ' + m.text()); });
      page.on('pageerror', e => errors.push(who + ': ' + e.message));
      await page.addInitScript(w => { window.__who = w; }, who);
      await page.route('https://fonts.googleapis.com/**', r => r.abort());
      await page.setContent(html.replace('window.__codes[window.__who]', () => 'window.__codes[' + JSON.stringify(who) + ']'), { waitUntil: 'load' });
      await page.waitForTimeout(400);
      if (!(await page.$("[data-go]"))) { console.log(errors.join("\n")); console.log(await page.evaluate(() => document.body.innerText.slice(0, 400))); process.exit(1); }
      for (const v of views) {
        await page.click(`[data-go="${v}"]`);
        await page.waitForTimeout(400);
        if (v === 'weekly' && scheme === 'light') { await page.click('#gen'); await page.waitForTimeout(500); }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (overflow) errors.push(`${who} ${v} ${scheme}: horizontal overflow`);
        await page.screenshot({ path: path.join(out, `${v}-${scheme}.png`), fullPage: true });
      }
      await page.close();
    }
  }
  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors, no overflow');
})();
