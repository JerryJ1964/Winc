// Deterministic browser checks: node tests/locationRefresh.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

test('Update location always requests fresh device coordinates and handles failures', async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
        getCurrentPosition(success, failure) { failure({ code: 1 }); }
      } });
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest()) request.respond({ status: 200, contentType: 'text/html', body: html });
      else request.abort();
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('typeof useMyLocation === "function" && !locatingDevice');
    await page.evaluate(() => {
      window.weatherQueries = [];
      window.positionOptions = [];
      window.ipCalls = 0;
      window.originalFetchWeather = fetchWeather;
      fetchWeather = async (query) => { window.weatherQueries.push(query); };
      refreshPushCoordinates = () => {};
      ipBasedLocation = async () => { window.ipCalls++; return null; };
      getConnectionInfo = () => ({ effectiveType: '4g', saveData: false });
      navigator.geolocation.getCurrentPosition = (success, failure, opts) => {
        window.positionOptions.push(opts);
        window.resolvePosition = success;
        window.rejectPosition = failure;
      };
      gpsCoords = { latitude: 10, longitude: 20, timestamp: Date.now() };
      locationInput.value = 'London';
      activeLocation = 'London';
      locationInput.dispatchEvent(new Event('input'));
    });
    for (const latitude of [52.12345, 53.23456]) {
      await page.click('#manual-update');
      assert.equal(await page.$eval('#manual-update', (el) => el.disabled), true);
      // Wait beyond the city-search debounce: it must have been cancelled.
      await new Promise((resolve) => setTimeout(resolve, 850));
      assert.equal(await page.evaluate(() => weatherQueries.includes('London')), false);
      await page.evaluate((lat) => resolvePosition({ coords: { latitude: lat, longitude: 4.56789, accuracy: 12 } }), latitude);
      await page.waitForFunction('!manualBtn.disabled');
      const state = await page.evaluate(() => ({ query: activeLocation, lat: globeMarkerLat, opts: positionOptions.at(-1), inputDisabled: locationInput.disabled }));
      assert.equal(state.query, latitude.toFixed(5) + ', 4.56789');
      assert.equal(state.lat, latitude);
      assert.equal(state.opts.maximumAge, 0);
      assert.equal(state.inputDisabled, false);
    }
    assert.equal(await page.evaluate(() => positionOptions.length), 2, 'even a fresh cached fix is ignored');
    const lastLocation = await page.evaluate(() => activeLocation);
    await page.click('#manual-update');
    await page.evaluate(() => rejectPosition({ code: 1 }));
    await page.waitForFunction('!manualBtn.disabled');
    assert.match(await page.$eval('#location-note', (el) => el.textContent), /permission denied/);
    assert.equal(await page.evaluate(() => activeLocation), lastLocation);
    await page.click('#manual-update');
    await page.evaluate(() => rejectPosition({ code: 3 }));
    await page.waitForFunction('positionOptions.length === 5');
    assert.equal(await page.evaluate(() => positionOptions.at(-1).maximumAge), 0);
    await page.evaluate(() => rejectPosition({ code: 2 }));
    await page.waitForFunction('!manualBtn.disabled');
    assert.match(await page.$eval('#location-note', (el) => el.textContent), /Could not get your current location/);
    assert.equal(await page.evaluate(() => ipCalls), 0, 'clicks never silently fall back to IP');
    assert.equal(await page.evaluate(() => activeLocation), lastLocation);

    // Exercise the real weather response path: stale responses cannot replace GPS,
    // and reverse-geocoded display names must not replace coordinate queries.
    const result = await page.evaluate(async () => {
      const query = activeLocation;
      let release;
      window.fetch = () => new Promise((resolve) => { release = resolve; });
      const oldRequest = originalFetchWeather('Old city');
      ++weatherRequestId;
      release({ ok: true, json: async () => ({ location: 'Old city' }) });
      await oldRequest;
      const afterStale = activeLocation;
      window.fetch = async () => ({ ok: true, json: async () => ({ location: 'Current town', forecast: [], condition: 'Clear', latitude: 53.23456, longitude: 4.56789 }) });
      await originalFetchWeather(query);
      return { afterStale, query: activeLocation, display: locationInput.value };
    });
    assert.equal(result.afterStale, lastLocation);
    assert.equal(result.query, lastLocation);
    assert.equal(result.display, 'Current town');
  } finally {
    await browser.close();
  }
});
