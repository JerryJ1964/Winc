// Browser regression checks for globe ocean labels. Run: node tests/oceanLabels.test.js
// Set OCEAN_LABELS_URL to verify a deployed site instead of the local HTML.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

test('ocean names render at their coordinates, rotate, and hide on the far side', async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const url = process.env.OCEAN_LABELS_URL || 'http://localhost:3000/';
    if (!process.env.OCEAN_LABELS_URL) {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
          request.respond({ status: 200, contentType: 'text/html', body: html });
        } else {
          request.abort(); // Deterministic offline run; no live weather required.
        }
      });
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('typeof drawOceanLabels === "function"');
    for (const viewport of [
      { width: 1280, height: 900, deviceScaleFactor: 1 },
      { width: 390, height: 844, deviceScaleFactor: 2 }
    ]) {
      await page.setViewport(viewport);
      const result = await page.evaluate(() => {
        const originalFillText = globeCtx.fillText;
        const calls = [];
        globeCtx.fillText = function (text, x, y) {
          if (text === 'El Niño' || text === 'Gulf Stream') calls.push({ text, x, y });
          return originalFillText.apply(this, arguments);
        };
        const render = (rotation, tilt, zoom) => {
          globeRotY = rotation;
          globeTiltX = tilt;
          globeZoom = zoom;
          viewDx = 0;
          viewDy = 0;
          calls.length = 0;
          drawGlobe();
          return calls.map((call) => ({ ...call }));
        };
        try {
          const pacific = render(135, 0, 1);
          const expectedPacific = globePoint(0, -135);
          const rotated = render(115, 0, 1);
          const atlantic = render(70, 38, 1);
          const expectedAtlantic = globePoint(38, -70);
          const farSide = render(-90, 0, 1);
          const zoomed = render(70, 38, 2);
          return { pacific, expectedPacific, rotated, atlantic, expectedAtlantic, farSide, zoomed };
        } finally {
          globeCtx.fillText = originalFillText;
        }
      });
      const elNino = result.pacific.find((call) => call.text === 'El Niño');
      const gulf = result.atlantic.find((call) => call.text === 'Gulf Stream');
      assert.ok(elNino, 'El Niño is drawn over the Pacific');
      assert.ok(gulf, 'Gulf Stream is drawn over the Atlantic');
      assert.equal(elNino.x, result.expectedPacific.x);
      assert.equal(elNino.y, result.expectedPacific.y);
      assert.equal(gulf.x, result.expectedAtlantic.x);
      assert.equal(gulf.y, result.expectedAtlantic.y);
      assert.notEqual(result.rotated.find((call) => call.text === 'El Niño').x, elNino.x);
      assert.deepEqual(result.farSide, [], 'both names are hidden behind the globe');
      assert.ok(result.zoomed.some((call) => call.text === 'Gulf Stream'));
      console.log(`Ocean labels verified at ${viewport.width}px, DPR ${viewport.deviceScaleFactor}`);
    }
  } finally {
    await browser.close();
  }
});
