// Deterministic browser checks: node tests/locationRefresh.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Update searches the typed city; the GPS button requests fresh device coordinates', async () => {
  // Dynamic import, like globeBorders: the installed puppeteer is ESM-only, so a
  // bare require() would break `npm test` whenever npm resolves an older Node.
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace('<link rel="stylesheet" href="style.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8') + '</style>').replace('<script src="app.js" defer></script>', () => '<script>' + fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') + '</script>');
    await page.evaluateOnNewDocument(() => {
      // Pin the UI language: initLanguage() falls back to navigator.language, so
      // on a Dutch-locale machine (and in CI images with different defaults) the
      // page boots in Dutch and the English assertions below would fail for a
      // reason that has nothing to do with location handling.
      try { localStorage.setItem('aiwx-lang', 'en'); } catch (e) { /* ignore */ }
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
    // The startup GPS run resolves asynchronously (permission denied in the
    // stub above) — wait until it has fully settled before stubbing, or the
    // late failure note would clobber the assertions below.
    await page.waitForFunction('typeof manualBtn !== "undefined" && !manualBtn.disabled');
    await page.evaluate(() => {
      window.weatherQueries = [];
      window.positionOptions = [];
      window.ipCalls = 0;
      window.originalFetchWeather = fetchWeather;
      window.originalUpdateLocation = updateLocation;
      // Stub BOTH layers: updateLocation (reads the input) and fetchWeather
      // (records the query). The Update-button path goes through
      // updateLocation, the GPS path calls applyGpsPosition → updateLocation —
      // stubbing only fetchWeather leaves updateLocation calling the real
      // fetch, which the request-interception aborts in this test.
      updateLocation = async (showLoading) => {
        activeLocation = locationInput.value.trim();
        await fetchWeather(activeLocation, true, true);
      };
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
    });
    // The Update button searches the TYPED city — no GPS involved.
    // (The mocked fetchWeather resolves instantly, so the button may already
    // be re-enabled by the time we assert — check the query, not the spinner.)
    await page.click('#manual-update');
    await page.waitForFunction(`window.weatherQueries.includes('London')`);
    await page.waitForFunction('!manualBtn.disabled');
    assert.equal(await page.evaluate(() => positionOptions.length), 0, 'Update never triggers GPS');
    assert.equal(await page.evaluate(() => weatherQueries.includes('London')), true, 'Update searches the typed city');
    assert.equal(await page.evaluate(() => activeLocation), 'London');
    // The GPS button (useMyLocation) requests fresh device coordinates.
    await page.evaluate(() => { window.weatherQueries = []; });
    for (const latitude of [52.12345, 53.23456]) {
      // Fire-and-forget: awaiting the returned promise would block until the
      // app's geolocation safety timers expire (~7.5 s per attempt), because
      // the mock never calls back until resolvePosition runs below — by then
      // useMyLocation would have already exhausted both attempts and failed.
      await page.evaluate(() => { useMyLocation(true); });
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
    // Fire-and-forget again — see the loop above for why awaiting would hang.
    await page.evaluate(() => { useMyLocation(true); });
    await page.evaluate(() => rejectPosition({ code: 1 }));
    await page.waitForFunction('!manualBtn.disabled');
    assert.match(await page.$eval('#location-note', (el) => el.textContent), /permission denied/);
    assert.equal(await page.evaluate(() => activeLocation), lastLocation);
    await page.evaluate(() => { useMyLocation(true); });
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
