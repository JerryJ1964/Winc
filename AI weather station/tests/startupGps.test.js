// Startup GPS race regression: the background first paint (and the 30-second
// auto-refresh) must never cancel the device fix — weatherRequestId changes on
// every fetch, so the fix is guarded by userIntentId instead.
// Run: node tests/startupGps.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('startup GPS fix survives the background first paint', async () => {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace('<link rel="stylesheet" href="style.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8') + '</style>').replace('<script src="app.js" defer></script>', () => '<script>' + fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') + '</script>');
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('aiwx-lang', 'en'); } catch (e) { /* ignore */ }
      // Fast low-power fix, exactly like a phone that already knows where it is.
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
        getCurrentPosition(success) {
          setTimeout(() => success({
            coords: { latitude: 51.12345, longitude: 4.56789, accuracy: 12 },
            timestamp: Date.now()
          }), 40);
        }
      } });
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest()) {
        request.respond({ status: 200, contentType: 'text/html', body: html }).catch(() => {});
        return;
      }
      const url = request.url();
      if (url.includes('/weather')) {
        // The background first paint answers SLOWLY (slow network), the GPS
        // coordinate query fast — so the late default-city response lands AFTER
        // the device fix and must not overwrite it.
        const isDevice = url.includes('51.12345');
        const body = JSON.stringify(isDevice
          ? { location: 'Device Town', forecast: [], condition: 'Clear', latitude: 51.12345, longitude: 4.56789 }
          : { location: 'Stub City', forecast: [], condition: 'Clear', latitude: 52.0, longitude: 4.0 });
        setTimeout(() => {
          request.respond({ status: 200, contentType: 'application/json', body }).catch(() => {});
        }, isDevice ? 20 : 400);
        return;
      }
      request.abort();
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    // The device position becomes THE location (on the old code this never
    // happened: the startup fetch bumped weatherRequestId and the GPS guard
    // dropped every fix, leaving the default city on screen forever).
    await page.waitForFunction(
      "typeof activeLocation === 'string' && activeLocation.indexOf('51.12345') === 0",
      { timeout: 15000 }
    );
    const during = await page.evaluate(() => ({
      activeLocation, markerLat: globeMarkerLat, markerLng: globeMarkerLng
    }));
    assert.equal(during.markerLat, 51.12345, 'globe marker follows the device fix');
    assert.equal(during.markerLng, 4.56789);

    // Wait past the slow background response — it must be dropped, not applied.
    await new Promise((r) => setTimeout(r, 700));
    const after = await page.evaluate(() => ({
      activeLocation, markerLat: globeMarkerLat,
      resolved: latestWeatherData && latestWeatherData.location
    }));
    assert.equal(after.activeLocation, '51.12345, 4.56789',
      'the late background first paint must not clobber the GPS fix');
    assert.equal(after.markerLat, 51.12345);
    assert.equal(after.resolved, 'Device Town', 'the GPS response is the one on screen');
  } finally {
    await browser.close();
  }
});
