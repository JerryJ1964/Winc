// Offline browser regression: node tests/oceanLists.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

test('ocean reference lists show dated anomalies and honest model metadata', async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        request.respond({ status: 200, contentType: 'text/html', body: html });
      } else request.abort();
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#gulfstream-list li');
    const data = await page.evaluate(() => ({
      order: [...document.querySelectorAll('#panel-now > details')].map((el) => el.id),
      events: [...document.querySelectorAll('#elnino-list li')].map((el) => el.textContent),
      gulf: [...document.querySelectorAll('#gulfstream-list li')].map((el) => el.textContent),
      temperatures: GULF_STREAM.map((node) => node[2].toFixed(1))
    }));
    // The accordion order is part of the regression guard: the volcano and fire panels
    // were added between the Gulf Stream and seismic panels.
    assert.deepEqual(data.order, ['storm-names', 'elnino-names', 'gulfstream-names', 'volcano-names', 'fire-names', 'seismic-names']);
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
