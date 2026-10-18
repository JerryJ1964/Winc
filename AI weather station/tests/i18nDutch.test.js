// Static half of the 🇬🇧⇄🇳🇱 Dutch-toggle regression: the button exists, is
// reachable, and the dictionary covers every globe chip so nothing is left
// half-translated. Run: node tests/i18nDutch.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = ['index.html', 'app.js', 'style.css'].map((fn) => fs.readFileSync(path.join(__dirname, '..', fn), 'utf8')).join('\n');
const dictBlock = html.slice(html.indexOf('const I18N_DICT'), html.indexOf('function i18nWalk'));

test('static: the language toggle is a real, labelled, wired button', () => {
  assert.match(html, /<button type="button" class="lang-toggle" id="lang-toggle"/,
    'a type=button #lang-toggle exists (a plain button, so it never submits)');
  assert.match(html, /aria-pressed="(true|false)"/,
    'it declares an on/off state for assistive tech');
  assert.match(html, /\.lang-toggle\s*\{/,
    'it carries styling so it is visible, not a bare control');

  // The engine the button depends on must all exist.
  assert.match(html, /function applyLanguage\s*\(/, 'applyLanguage() is defined');
  assert.match(html, /function i18nWalk\s*\(/, 'i18nWalk() is defined');
  assert.match(html, /function initLanguage\s*\(/, 'initLanguage() is defined');
  assert.match(html, /const I18N_DICT\s*=\s*\{/, 'the dictionary is defined');
  assert.match(html, /function t\s*\(/, 'the runtime helper t() is defined');
  assert.match(html, /initLanguage\(\);/,
    'initLanguage() is actually called during startup');
});

test('static: the dictionary covers every globe-legend chip label', () => {
  // A chip the dictionary misses would keep showing English while the rest of
  // the page is Dutch — the exact half-translated look to avoid.
  const keys = [...html.matchAll(/data-globe-layer="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 11, 'the legend still holds its chips');

  const missing = [];
  keys.forEach((key) => {
    const re = new RegExp('data-globe-layer="' + key + '"[\\s\\S]{0,500}?>([\\s\\S]*?)</button>');
    const m = html.match(re);
    if (!m) return;

    // Mirror what the DOM walker really sees: separate text nodes. A chip like
    // "🪨 Mudslides" is <span aria-hidden>🪨</span> Mudslides, so the badge and
    // the word are DIFFERENT nodes — concatenating them here would test a string
    // the app never actually compares against the dictionary.
    const inner = m[1].replace(/<[^>]*>[^<]*<\/[^>]*>/g, '');   // drop icon spans whole
    const nodes = inner.split(/<[^>]*>/).map((t) => t.replace(/\s+/g, ' ').trim())
      .filter((t) => t && /[A-Za-z]{2}/.test(t));

    nodes.forEach((label) => {
      if (!dictBlock.includes("'" + label + "':")) missing.push(key + ' -> "' + label + '"');
    });
  });
  assert.deepEqual(missing, [],
    'every globe chip label has a Dutch entry (missing: ' + missing.join(', ') + ')');
});

// The hero card / status pill / every forecast row show a condition string.
// If WEATHER_CODE_INFO ever gains a code whose condition has no Dutch entry,
// that one word stays English in Dutch mode. Keep the two in lock-step.
test('static: every weather condition has a Dutch translation', () => {
  const infoStart = html.indexOf('const WEATHER_CODE_INFO');
  assert.ok(infoStart > -1, 'WEATHER_CODE_INFO exists');
  const info = html.slice(infoStart, html.indexOf('};', infoStart));
  const conditions = [...new Set([...info.matchAll(/condition:\s*'([^']+)'/g)].map((m) => m[1]))];
  assert.ok(conditions.length >= 15, `found the condition list (${conditions.length})`);

  const missing = conditions.filter((c) => !dictBlock.includes("'" + c + "':"));
  assert.deepEqual(missing, [],
    'every weather condition is translated (missing: ' + missing.join(', ') + ')');
});

test('static: the dictionary covers the stat labels and icon-reference rows', () => {
  // These are the strings a Dutch reader meets first; a miss here is what makes
  // a translated page look half-finished.
  ['Wind speed', 'Wind direction', 'Humidity', 'Feels like', 'Beaufort',
    'Clear / Sunny', 'Tornado / Sandstorm', 'Other / Unknown']
    .forEach((label) => {
      assert.ok(dictBlock.includes("'" + label + "':"),
        `"${label}" has a Dutch entry`);
    });
});

// The page re-renders whole blocks from ENGLISH templates on every 30s refresh.
// Without the re-walk below, Dutch silently evaporates one refresh after the
// user presses the button — a bug a purely static test cannot see.
test('static: the language is re-applied after the weather panel re-renders', () => {
  const fetchStart = html.indexOf('async function fetchWeather');
  assert.ok(fetchStart > -1, 'fetchWeather() exists');
  const body = html.slice(fetchStart, html.indexOf('\n        async function ', fetchStart + 10));
  assert.match(body, /applyLanguage\(currentLanguage\)/,
    'fetchWeather() re-applies the active language after rebuilding the markup');
});

test('static: the legacy dual-language hints are hidden while Dutch is active', () => {
  assert.match(html, /html\[data-lang="nl"\][^}]*\.subtitle-dutch/,
    'the old "English + small Dutch underneath" hints are hidden in Dutch mode');
  assert.match(html, /setAttribute\('data-lang',\s*currentLanguage\)/,
    'applyLanguage() drives that CSS via data-lang on <html>');
});

test('static: the dictionary has no duplicate or empty keys', () => {
  const keys = [...dictBlock.matchAll(/^\s*'([^']+)':\s*'/gm)].map((m) => m[1]);
  const dupes = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  assert.deepEqual(dupes, [], 'no key is defined twice (a dupe would silently win)');

  const empty = [...dictBlock.matchAll(/^\s*'([^']+)':\s*''\s*,?/gm)].map((m) => m[1]);
  assert.deepEqual(empty, [], 'no entry translates to a blank string');
});