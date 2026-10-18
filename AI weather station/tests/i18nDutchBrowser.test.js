// Browser half of the 🇬🇧⇄🇳🇱 regression: press the REAL button and assert the
// visible page changes, then press it again and assert the original English
// returns exactly (a naive in-place swap would drift or lose an emoji).
// Run: node tests/i18nDutchBrowser.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

const PORT = 3000;
const URL = process.env.APP_URL || `http://localhost:${PORT}/`;

// Lazy async loader: this file stays plain CommonJS (no top-level await, which
// would make Node 24 refuse to guess between CJS and ESM). The try/catch mirrors
// globeBorders.test.js, which already needs this because an ancestor
// node_modules can shadow the system Node with an older, ESM-only Puppeteer.
let _pp = null;
async function getPuppeteer() {
  if (!_pp) {
    try {
      _pp = require('puppeteer');
    } catch (e) {
      _pp = (await import('puppeteer')).default;
    }
  }
  return _pp;
}

async function open(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  // Offline by default, like every other browser test: serve index.html from
  // disk instead of requiring `npm start`. APP_URL still wins so the same test
  // can point at a live server when you want it to.
  if (!process.env.APP_URL) {
    const fs = require('node:fs');
    const path = require('node:path');
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
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof applyLanguage === 'function' && typeof i18nWalk === 'function');
  return page;
}

function launch() {
  return getPuppeteer().then((pp) => pp.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }));
}

function snapshot() {
  return {
    heading: document.querySelector('h1').textContent.trim(),
    tab: document.querySelector('#tab-now').textContent.trim(),
    chipClouds: document.querySelector('[data-globe-layer="clouds"]').textContent.trim(),
    chipWind: document.querySelector('[data-globe-layer="wind"]').textContent.trim(),
    chipRain: document.querySelector('[data-globe-layer="rain"]').textContent.trim(),
    placeholder: document.getElementById('location-input').getAttribute('placeholder'),
    updateBtn: document.getElementById('manual-update').textContent.trim(),
    forecastTab: document.querySelector('#tab-forecast14').textContent.trim()
  };
}

test('browser: the toggle translates the page, and toggling back restores it exactly', async () => {
  const browser = await launch();
  try {
    const page = await open(browser);

    // Force English so the result never depends on the browser's locale.
    await page.evaluate(() => applyLanguage('en'));
    const before = await page.evaluate(snapshot);

    assert.equal(before.heading, 'AI Weather Station', 'starts in English');
    assert.equal(before.chipClouds, '☁️ Clouds', 'the Clouds chip starts in English');

    // --- press the real button, not the function ---
    await page.click('#lang-toggle');
    await page.waitForFunction(() => document.documentElement.lang === 'nl', { timeout: 10000 });

    const dutch = await page.evaluate(snapshot);
    const ui = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      pressed: document.getElementById('lang-toggle').getAttribute('aria-pressed'),
      buttonLabel: document.getElementById('lang-toggle').textContent.trim()
    }));

    assert.equal(dutch.heading, 'AI Weerstation', 'the heading is Dutch');
    assert.equal(dutch.tab, '☀️ Nu', 'the Now tab is Dutch and KEEPS its emoji');
    assert.equal(dutch.chipClouds, '☁️ Wolken', 'the Clouds chip is Dutch and KEEPS its emoji');
    assert.equal(dutch.chipWind, '💨 Wind', 'the Wind chip is Dutch');
    assert.equal(dutch.chipRain, '🌧️ Regen', 'the Rain chip is Dutch');
    assert.equal(dutch.placeholder, 'Voer een plaats of stad in', 'the placeholder is Dutch');
    assert.equal(dutch.updateBtn, 'Locatie bijwerken', 'the update button is Dutch');
    assert.equal(dutch.forecastTab, '📅 14-daagse verwachting', 'the 14-day tab is Dutch');
    assert.equal(ui.lang, 'nl', '<html lang> flipped to nl for screen readers');
    assert.equal(ui.pressed, 'true', 'aria-pressed reports the Dutch state');
    assert.match(ui.buttonLabel, /EN/, 'the toggle now offers English');

    // A real translation touches many nodes — two would be a broken feature.
    const dutchCount = await page.evaluate(() => {
      let n = 0;
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach((node) => {
        const s = node.nodeValue.trim();
        if (!s || !/[A-Za-z]{4}/.test(s)) return;
        const tag = node.parentElement && node.parentElement.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return;
        if (/[àéèëïöü]/.test(s) || /\b(Weerstation|Voer|Wolken|Regen|Sneeuw|Weer|Zon|Dagelijkse)\b/.test(s)) n += 1;
      });
      return n;
    });
    assert.ok(dutchCount >= 10,
      `a meaningful share of the page is Dutch (found ${dutchCount} Dutch nodes)`);

    // --- press again: the EXACT original English must come back ---
    await page.click('#lang-toggle');
    await page.waitForFunction(() => document.documentElement.lang === 'en', { timeout: 10000 });

    const after = await page.evaluate(snapshot);
    assert.deepEqual(after, before,
      'toggling back restores every string byte-for-byte — no drift, no lost emoji');
  } finally {
    await browser.close();
  }
});

test('browser: t() falls back to English and never yields blank or undefined', async () => {
  const browser = await launch();
  try {
    const page = await open(browser);
    const res = await page.evaluate(() => {
      applyLanguage('nl');
      return {
        unknown: t('A phrase nobody translated 🎈'),
        empty: t(''),
        missing: t(undefined),
        bad: Object.entries(I18N_DICT).filter(([, v]) => !v || !String(v).trim()).map((b) => b[0])
      };
    });

    assert.equal(res.unknown, 'A phrase nobody translated 🎈',
      'an unknown phrase falls back to the English original, never blank');
    assert.equal(res.empty, '', 'empty input stays empty instead of becoming "undefined"');
    assert.equal(res.missing, undefined, 'undefined input is passed through safely');
    assert.deepEqual(res.bad, [], 'no dictionary entry translates to a blank string');
  } finally {
    await browser.close();
  }
});
// The 30-second auto-refresh rewrites whole blocks of markup from the ENGLISH
// template. Without the applyLanguage() re-walk at the end of fetchWeather,
// Dutch would silently evaporate ~30s after the user pressed the button.
test('browser: Dutch survives a re-render of the weather panel', async () => {
  const browser = await launch();
  try {
    const page = await open(browser);
    const res = await page.evaluate(() => {
      // Build a stand-in for the stats grid. The real one only exists once the
      // weather fetch resolves, and this test must not depend on the network.
      const grid = document.createElement('div');
      grid.className = 'stats-grid';
      grid.innerHTML = '<div class="stat-card"><span class="stat-label label-dual">'
        + 'Humidity<br><small>Luchtvochtigheid</small></span>'
        + '<span class="stat-value">60%</span></div>';
      document.body.appendChild(grid);

      applyLanguage('en');
      const inEnglish = grid.querySelector('.label-dual').firstChild.nodeValue.trim();
      applyLanguage('nl');
      const afterToggle = grid.querySelector('.label-dual').firstChild.nodeValue.trim();

      // Now the 30s-refresh scenario: the block is rewritten from the ENGLISH
      // template, and only the app's own re-walk can put Dutch back.
      grid.innerHTML = '<div class="stat-card"><span class="stat-label label-dual">'
        + 'Humidity<br><small>Luchtvochtigheid</small></span>'
        + '<span class="stat-value">61%</span></div>';
      const afterRerender = grid.querySelector('.label-dual').firstChild.nodeValue.trim();
      applyLanguage(currentLanguage);           // the call under test
      const afterRepair = grid.querySelector('.label-dual').firstChild.nodeValue.trim();
      grid.remove();

      return {
        inEnglish, afterToggle, afterRerender, afterRepair,
        expected: I18N_DICT['Humidity'],
        lang: document.documentElement.lang,
        dataLang: document.documentElement.getAttribute('data-lang')
      };
    });

    // Compare against the dictionary rather than a hardcoded word, so the test
    // cannot drift from the translation it is checking.
    assert.equal(res.inEnglish, 'Humidity');
    assert.ok(res.expected && res.expected !== 'Humidity',
      '"Humidity" really has a distinct Dutch translation');
    assert.equal(res.afterToggle, res.expected,
      'the freshly inserted English markup is translated on toggle');
    assert.equal(res.afterRerender, 'Humidity',
      'the simulated refresh really did reset the label to English');
    assert.equal(res.afterRepair, res.expected,
      'applyLanguage(currentLanguage) repairs freshly rendered markup, so Dutch '
      + 'survives the 30-second auto-refresh instead of silently reverting');
    assert.equal(res.lang, 'nl');
    assert.equal(res.dataLang, 'nl',
      'data-lang is set so the CSS can hide the legacy dual-language hints');
  } finally {
    await browser.close();
  }
});

// Regression: the page already had "English + small Dutch underneath" hints.
// Once the main line is Dutch those print the sentence twice.
test('browser: Dutch mode does not duplicate the legacy bilingual hints', async () => {
  const browser = await launch();
  try {
    const page = await open(browser);
    const vis = (sel) => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return 'missing';
      return getComputedStyle(el).display;
    }, sel);

    await page.evaluate(() => applyLanguage('en'));
    assert.notEqual(await vis('.subtitle-dutch'), 'none',
      'in English the pre-existing Dutch hint is still shown');

    await page.evaluate(() => applyLanguage('nl'));
    assert.equal(await vis('.subtitle-dutch'), 'none',
      'in Dutch the hint is hidden so the subtitle is not repeated');

    await page.evaluate(() => applyLanguage('en'));
    assert.notEqual(await vis('.subtitle-dutch'), 'none',
      'switching back to English restores the hint (toggle is reversible)');
  } finally {
    await browser.close();
  }
});