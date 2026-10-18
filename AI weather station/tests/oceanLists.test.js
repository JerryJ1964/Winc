// Offline browser regression: node tests/oceanLists.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('ocean reference lists show dated anomalies and honest model metadata', async () => {
  // Dynamic import, like globeBorders: the installed puppeteer is ESM-only, so a
  // bare require() would break `npm test` whenever npm resolves an older Node.
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace('<link rel="stylesheet" href="style.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8') + '</style>').replace('<script src="app.js" defer></script>', () => '<script>' + fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') + '</script>');
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        request.respond({ status: 200, contentType: 'text/html', body: html });
      } else request.abort();
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#gulfstream-list li');
    // Pin the language to English before asserting on the text. initLanguage()
    // auto-selects Dutch when the browser locale is nl (this machine's is), and
    // the fetchWeather re-walk now correctly translates these rendered lists —
    // so without this the assertions would depend on whoever runs the suite.
    await page.waitForFunction(() => typeof applyLanguage === 'function');
    await page.evaluate(() => applyLanguage('en'));
    const data = await page.evaluate(() => ({
      order: [...document.querySelectorAll('#panel-now > details')].map((el) => el.id),
      events: [...document.querySelectorAll('#elnino-list li')].map((el) => el.textContent),
      gulf: [...document.querySelectorAll('#gulfstream-list li')].map((el) => el.textContent),
      temperatures: GULF_STREAM.map((node) => node[2].toFixed(1))
    }));
    // The accordion order is part of the regression guard: the volcano and fire panels
    // were added between the Gulf Stream and seismic panels, and the mudslide,
    // avalanche and dust panels were added after fire — dust last of the hazard
    // panels because it is the most recent feed.
    assert.deepEqual(data.order, ['storm-names', 'elnino-names', 'gulfstream-names',
      'volcano-names', 'fire-names', 'mudslide-names', 'avalanche-names',
      'dust-names', 'seismic-names']);
    assert.equal(data.events.length, 9);
    assert.match(data.events[0], /2023–2024.*Very strong.*\+2\.0 °C/);
    assert.match(data.events[1], /2015–2016.*\+2\.6 °C/);
    assert.equal(data.gulf.length, 12);
    data.gulf.forEach((row, index) => {
      assert.ok(row.includes(data.temperatures[index] + ' °C'));
      assert.match(row, /Year: not available \(undated model\)/);
      assert.match(row, /Flow intensity: no local measurement/);
      assert.ok(!row.includes('undefined'));
    });
    for (const width of [1280, 390, 320]) {
      await page.setViewport({ width, height: 900 });
      for (const id of ['elnino-names', 'gulfstream-names']) {
        await page.click('#' + id + ' > summary');
        assert.equal(await page.$eval('#' + id, (el) => el.open), true);
        const fits = await page.$eval('#' + id, (el) => {
          const box = el.getBoundingClientRect();
          return [...el.querySelectorAll('.ocean-row')].every((row) => {
            const rect = row.getBoundingClientRect();
            return rect.left >= box.left && rect.right <= box.right + 1 && row.scrollWidth <= row.clientWidth + 1;
          });
        });
        assert.ok(fits, id + ' rows fit at ' + width + 'px');
        await page.click('#' + id + ' > summary');
        assert.equal(await page.$eval('#' + id, (el) => el.open), false);
      }
    }
  } finally {
    await browser.close();
  }
});
