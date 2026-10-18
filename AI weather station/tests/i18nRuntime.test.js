// Runtime status lines are painted from JS, so the DOM walk cannot reach them.
// This checks the two things that actually matter for those lines:
//   1. EN -> NL translates them (fragments, not just whole strings)
//   2. NL -> EN puts the ENGLISH back (the round trip that a naive
//      translate-on-write implementation silently breaks)
const path = require('path');
const fs = require('fs');
const assert = require('node:assert');
const { test } = require('node:test');

let pp;
async function loadPuppeteer() {
  if (!pp) {
    // Dynamic import, like globeBorders: the installed puppeteer is ESM-only,
    // so a bare require() would throw — and awaiting it HERE (not in a floating
    // IIFE) guarantees pp is set before launch() is called.
    try { pp = require('puppeteer'); } catch (e) { pp = (await import('puppeteer')).default; }
  }
  return pp;
}

const URL = process.env.APP_URL || 'http://localhost:3000/';

test('runtime status lines translate to Dutch and back to English', async () => {
  const browser = await (await loadPuppeteer()).launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 900 });
    // Offline by default, like every other browser test: serve index.html from
    // disk instead of requiring `npm start` to be running. APP_URL still wins
    // so the same test can point at a live server when you want it to.
    if (!process.env.APP_URL) {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace('<link rel="stylesheet" href="style.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8') + '</style>').replace('<script src="app.js" defer></script>', () => '<script>' + fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') + '</script>');
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
          request.respond({ status: 200, contentType: 'text/html', body: html });
        } else {
          request.abort(); // Deterministic offline run; no live weather required.
        }
      });
    }
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('typeof setGlobeStatus === "function" && typeof translateFragments === "function"',
      { timeout: 30000 });

    // A composed line: no single dictionary key matches the whole string.
    const composed = '📍 Zoomed to ' + 'Amsterdam' + ' — live ' + 'Rain';
    // A whole-sentence line, exactly as enableAlerts() would paint it.
    const sentence = 'Notifications blocked. Allow them in your browser settings to get alert pushes.';
    const note = '⚠️ Location permission denied — enable it in your browser settings. ' +
      'The last displayed location has not been changed.';

    const read = (lang) => page.evaluate((l) => {
      applyLanguage('en');
      applyLanguage(l);
      setGlobeStatus('📍 Zoomed to Amsterdam — live Rain', false);
      setAlertsStatus('Notifications blocked. Allow them in your browser settings to get alert pushes.');
      setLocationNote('⚠️ Location permission denied — enable it in your browser settings. ' +
        'The last displayed location has not been changed.');
      return {
        lang: document.documentElement.lang,
        globe: document.getElementById('globe-status').textContent,
        alerts: document.querySelector('.alerts-status') ?
          document.querySelector('.alerts-status').textContent :
          (document.getElementById('alerts-status') || {}).textContent,
        note: document.getElementById('location-note').textContent
      };
    }, lang);

    const nl = await read('nl');
    assert.equal(nl.lang, 'nl');
    assert.match(nl.globe, /Ingezoomd op Amsterdam/, 'composed globe line should be Dutch');
    assert.match(nl.globe, /Regen/, 'the condition fragment should be Dutch too');
    assert.doesNotMatch(nl.globe, /Zoomed to/, 'no English fragment may survive');

    assert.match(nl.alerts, /Meldingen zijn geblokkeerd/, 'alert line should be Dutch');
    assert.doesNotMatch(nl.alerts, /Notifications blocked/, 'no English in the alert line');

    assert.match(nl.note, /Locatietoestemming geweigerd/, 'note should be Dutch');
    assert.doesNotMatch(nl.note, /last displayed location/, 'no English in the note');

    // The round trip: English must come back exactly.
    const back = await read('en');
    assert.equal(back.lang, 'en');
    assert.equal(back.globe, composed);
    assert.equal(back.alerts, sentence);
    assert.equal(back.note, note);

    // Toggling repeatedly must not accumulate drift.
    await page.evaluate(() => { for (let i = 0; i < 6; i++) { applyLanguage('nl'); applyLanguage('en'); } });
    const after = await page.evaluate(() => {
      setGlobeStatus('📍 Zoomed to Amsterdam — live Rain', false);
      return document.getElementById('globe-status').textContent;
    });
    assert.equal(after, composed, 'six round trips must not drift');

    assert.deepEqual(errors, [], 'no page errors');
  } finally {
    await browser.close();
  }
});