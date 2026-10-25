/* In-memory stand-ins for the Apps Script services the backend uses. Works in Node and the browser. */
(function (g) {
  function Sheet(name, values) { this.name = name; this.v = values || []; this.maxRows = 1000; }
  Sheet.prototype = {
    getName: function () { return this.name; }, setName: function (n) { this.name = n; },
    getLastRow: function () { for (var r = this.v.length; r > 0; r--) if (this.v[r - 1].some(function (x) { return x !== ''; })) return r; return 0; },
    getLastColumn: function () { var m = 0; this.v.forEach(function (row) { for (var c = row.length; c > 0; c--) if (row[c - 1] !== '') { m = Math.max(m, c); break; } }); return m; },
    getMaxRows: function () { return this.maxRows; },
    getRange: function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); },
    getDataRange: function () { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); },
    setFrozenRows: function () {}, setTabColor: function () {}
  };
  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype = {
    getDisplayValues: function () {
      var out = [];
      for (var i = 0; i < this.nr; i++) { var row = []; for (var j = 0; j < this.nc; j++) { var rr = this.sh.v[this.r - 1 + i]; row.push(rr && rr[this.c - 1 + j] !== undefined ? String(rr[this.c - 1 + j]) : ''); } out.push(row); }
      return out;
    },
    setValues: function (vals) {
      for (var i = 0; i < vals.length; i++) { var ri = this.r - 1 + i; while (this.sh.v.length <= ri) this.sh.v.push([]);
        for (var j = 0; j < vals[i].length; j++) { var row = this.sh.v[ri]; while (row.length < this.c - 1 + j) row.push(''); row[this.c - 1 + j] = String(vals[i][j]); } }
      return this;
    },
    setValue: function (v) { return this.setValues([[v]]); },
    setNumberFormat: function () { return this; }, setFontWeight: function () { return this; }, setDataValidation: function () { return this; }
  };
  var sheets = [];
  var ss = {
    getSheetByName: function (n) { return sheets.filter(function (s) { return s.name === n; })[0] || null; },
    getSheets: function () { return sheets.slice(); },
    insertSheet: function (n) { var s = new Sheet(n, []); sheets.push(s); return s; }
  };
  g.__sheets = sheets; g.__Sheet = Sheet;
  g.__mail = []; g.__gemini = []; g.__props = { GEMINI_API_KEY: 'test-key' };
  g.SpreadsheetApp = {
    getActiveSpreadsheet: function () { return ss; },
    getUi: function () { if (g.__noUi) throw new Error('Cannot call SpreadsheetApp.getUi() from this context.'); return { alert: function () {}, ButtonSet: { OK: 1 }, showModalDialog: function () {} }; },
    newDataValidation: function () { var b = { requireValueInList: function () { return b; }, setAllowInvalid: function () { return b; }, build: function () { return {}; } }; return b; }
  };
  g.PropertiesService = { getScriptProperties: function () { return { getProperty: function (k) { return k in g.__props ? g.__props[k] : null; }, setProperty: function (k, v) { g.__props[k] = v; } }; } };
  g.Session = { getScriptTimeZone: function () { return 'America/Toronto'; }, getEffectiveUser: function () { return { getEmail: function () { return 'owner@example.com'; } }; } };
  function pad(n) { return String(n).padStart(2, '0'); }
  g.Utilities = {
    formatDate: function (d, tz, f) {
      var s = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      return f === 'yyyy-MM-dd' ? s : s + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    getUuid: function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function () { return (Math.random() * 16 | 0).toString(16); }); },
    base64Decode: function () { return []; }, newBlob: function () { return {}; }
  };
  g.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  g.Logger = { log: function () {} };
  g.DriveApp = {
    createFolder: function () { return { getId: function () { return 'FOLDER1'; } }; },
    getFolderById: function () { return { createFile: function () { return { getUrl: function () { return 'https://drive.google.com/file/d/CLIP/view'; } }; }, getFiles: function () { return { hasNext: function () { return false; } }; } }; }
  };
  g.ScriptApp = { getService: function () { return { getUrl: function () { return 'https://script.google.com/macros/s/TEST/exec'; } }; } };
  g.MailApp = { sendEmail: function (o) { g.__mail.push(o); } };
  // Gemini stub: g.__nextGemini is the JSON object the model "returns".
  g.UrlFetchApp = {
    fetch: function (url, opts) {
      var body = JSON.parse(opts.payload); g.__gemini.push(body);
      var reply = typeof g.__nextGemini === 'function' ? g.__nextGemini(body) : g.__nextGemini;
      return { getResponseCode: function () { return 200; },
        getContentText: function () { return JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }); } };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
