// Tap-a-spot regression: tapping the "seen from above" map must fetch
// weather for the tapped coordinates, keep the 📍 pin, and survive a late
// in-flight GPS fix. Run: node tests/localMapTap.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('map tap fetches tapped-spot weather and keeps the pin', async () => {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace('<link rel="stylesheet" href="style.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8') + '</style>').replace('<script src="app.js" defer></script>', () => '<script>' + fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') + '</script>');
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('aiwx-lang', 'en'); } catch (e) { /* ignore */ }
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest()) request.respond({ status: 200, contentType: 'text/html', body: html });
      else request.abort();
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('typeof handleLocalMapTap === "function" && typeof updateLocation === "function"');

    const result = await page.evaluate(async () => {
      const out = { requests: [], pinBefore: null, pinAfter: null, inputAfter: null, activeAfter: null };
      // Stub the heavy backends: fake map libs + weather fetch.
      window.maplibregl = { Marker: class { constructor() {} setLngLat() { return this; } addTo() { return this; } remove() {} } };
      localMapGL = { project: () => ({ x: 0, y: 0 }) };
      const realFetch = window.fetch;
      window.fetch = async (url) => {
        out.requests.push(String(url));
        return { ok: true, json: async () => ({ location: 'Tap Town', forecast: [], condition: 'Clear', latitude: 51.9, longitude: 4.1 }) };
      };
      refreshPushCoordinates = () => {};
      // Simulate a GPS run in flight: bump the shared request id, then tap.
      ++weatherRequestId;
      await handleLocalMapTap({ lngLat: { lat: 51.90001, lng: 4.10001 } });
      out.pinAfter = !!localMapGLPin;
      out.inputAfter = locationInput.value;
      out.activeAfter = activeLocation;
      window.fetch = realFetch;
      return out;
    });

    assert.ok(result.requests.some((u) => u.includes('/weather?location=')), 'a coordinate weather request fired');
    const coordReq = result.requests.find((u) => u.includes('/weather?location='));
    assert.match(coordReq, /51\.90001/, 'the request carries the tapped coordinates');
    assert.equal(result.pinAfter, true, 'the 📍 pin survives the tap fetch');
    assert.equal(result.activeAfter, '51.90001, 4.10001', 'activeLocation follows the tap');
  } finally {
    await browser.close();
  }
});
