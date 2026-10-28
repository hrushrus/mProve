#!/usr/bin/env node
/**
 * Automates linking & pushing src/ to the "mProve Master Database V2" Google Sheet
 * (13mKskuiQt7ecyckl8ESJmPx3zpzPsqSzHjn9J4nAJ4s) via @google/clasp.
 *
 * Usage:
 *   npm run clasp:setup                  # creates a new bound script on the Sheet and pushes src/
 *   npm run clasp:setup -- <SCRIPT_ID>   # links an existing bound script ID and pushes src/
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SHEET_ID = '13mKskuiQt7ecyckl8ESJmPx3zpzPsqSzHjn9J4nAJ4s';
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const CLASP_JSON = path.join(ROOT, '.clasp.json');
const MANIFEST_PATH = path.join(SRC_DIR, 'appsscript.json');
const CLASPRC = path.join(os.homedir(), '.clasprc.json');
const CLASP_BIN = path.join(ROOT, 'node_modules', '.bin', 'clasp');

function runClasp(args, opts = {}) {
  return execFileSync(CLASP_BIN, args, {
    cwd: ROOT,
    stdio: opts.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: Object.assign({}, process.env, {
      PATH: '/opt/homebrew/bin:/usr/local/bin:' + (process.env.PATH || '')
    })
  });
}

function main() {
  if (!fs.existsSync(CLASP_BIN)) {
    console.error('Error: @google/clasp is not installed. Run `npm install` first.');
    process.exit(1);
  }

  // 1. Check login
  if (!fs.existsSync(CLASPRC)) {
    console.log('1. Logging into Google via clasp (your browser will open)...');
    console.log('   Note: Make sure the Google Apps Script API is enabled at:');
    console.log('   https://script.google.com/home/usersettings\n');
    runClasp(['login']);
  }

  // 2. Create or link .clasp.json
  const argScriptId = process.argv[2];
  if (argScriptId) {
    const cfg = {
      scriptId: argScriptId.trim(),
      rootDir: 'src',
      parentId: [SHEET_ID]
    };
    fs.writeFileSync(CLASP_JSON, JSON.stringify(cfg, null, 2) + '\n');
    console.log('Linked existing Apps Script project:', argScriptId.trim());
  } else if (!fs.existsSync(CLASP_JSON)) {
    console.log('Creating container-bound Apps Script project on Sheet ' + SHEET_ID + '...');
    const savedManifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const srcClaspJson = path.join(SRC_DIR, '.clasp.json');
    if (fs.existsSync(srcClaspJson)) fs.unlinkSync(srcClaspJson);
    try {
      runClasp([
        'create',
        '--title', 'mProve',
        '--parentId', SHEET_ID,
        '--rootDir', 'src'
      ]);
      if (fs.existsSync(srcClaspJson)) {
        const created = JSON.parse(fs.readFileSync(srcClaspJson, 'utf8'));
        created.rootDir = 'src';
        fs.writeFileSync(CLASP_JSON, JSON.stringify(created, null, 2) + '\n');
        fs.unlinkSync(srcClaspJson);
      }
    } catch (err) {
      fs.writeFileSync(MANIFEST_PATH, savedManifest);
      console.error('\nCould not create the Apps Script project automatically.');
      console.error('Common fixes:');
      console.error('  1. Enable the Google Apps Script API at https://script.google.com/home/usersettings');
      console.error('  2. Or open the Sheet -> Extensions -> Apps Script -> Project Settings, copy the Script ID, and run:');
      console.error('     npm run clasp:setup -- <YOUR_SCRIPT_ID>');
      process.exit(1);
    } finally {
      // Restore our custom appsscript.json (clasp create overwrites it with defaults)
      fs.writeFileSync(MANIFEST_PATH, savedManifest);
      // Remove any blank Code.js created by clasp create
      const strayCode = path.join(SRC_DIR, 'Code.js');
      if (fs.existsSync(strayCode)) fs.unlinkSync(strayCode);
    }
  } else {
    console.log('Found existing .clasp.json');
  }

  // 3. Push all files from src/
  console.log('\nPushing src/ files to Google Apps Script...');
  runClasp(['push', '--force']);

  console.log('\nDone! All 10 files in src/ are now in your Google Sheet.');
  console.log('Next steps:');
  console.log('  1. Run `npm run open` -> Project Settings (gear icon) -> Script Properties -> add GEMINI_API_KEY');
  console.log('  2. Run `npm run sheet` (or reload the Sheet) -> click mProve > Set up workbook');
}

main();
