#!/usr/bin/env node
/**
 * Local top-level server for mProve (http://localhost:3000) and static build
 * generator for GitHub Pages (index.html).
 *
 * Serving Index.html at the top level (outside Google Apps Script's nested
 * sandbox iframe) unlocks native browser getUserMedia() microphone recording
 * while calling the live Apps Script backend via fetch(doPost).
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'src', 'Index.html');
const OUT_HTML = path.join(ROOT, 'index.html');
const PORT = Number(process.env.PORT || 3000);

function buildStaticHtml() {
  const raw = fs.readFileSync(SRC_HTML, 'utf8');
  return raw.replace('<?= accessCode ?>', "''");
}

// Always keep root index.html synced for GitHub Pages
fs.writeFileSync(OUT_HTML, buildStaticHtml());

if (process.argv.includes('--build-only')) {
  console.log('Built static index.html from src/Index.html');
  process.exit(0);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(buildStaticHtml());
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('mProve top-level app (with live microphone access) running at:');
  console.log('  http://localhost:' + PORT);
});
