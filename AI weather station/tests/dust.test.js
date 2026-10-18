// Unit tests for the 🏜️ Saharan-dust globe layer: the modelled dust load over
// the Sahara / Sahel / Atlantic outflow from the keyless Open-Meteo air quality
// (CAMS) API.
const test = require('node:test');
const assert = require('node:assert/strict');
const dust = require('../api/dust.js');
const {
  normalizeDustPoints, buildDustUrl, buildWindUrl, attachWindToPoints,
  buildWindGridUrl, normalizeWindGrid, beaufortFor,
  dustLevelFor, sandstormLevelFor,
  DUST_CELLS, WIND_GRID, WIND_GRID_LATS, WIND_GRID_LONGS,
  AIR_QUALITY_FEED, WEATHER_FEED, MIN_DUST, MAX_DUST_POINTS,
  SANDSTORM_MIN_DUST, SANDSTORM_MIN_WIND
} = dust._internal;

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    end(data) { this.body = data; }
  };
}

async function withStubbedFetch(stub, run) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { return await run(); }
  finally { globalThis.fetch = original; }
}

// Synthetic Open-Meteo answer indexed to DUST_CELLS:
//   cell 0 → 3271 µg/m³ (a severe Bodélé-style outbreak)
//   cell 1 → 148 µg/m³  (thick)
//   cell 2 → 1290 µg/m³ but a clean ground value of 4: only the column is dusty
//   cell 3 → 12 µg/m³   (clean air, must not be drawn)
//   cell 4 → no current block at all (must be skipped, never crash)
function dustFeed() {
  return DUST_CELLS.map((cell, index) => {
    const values = index === 0 ? { dust: 3271, aod: 1.14, pm10: 1580, pm2_5: 210 }
      : index === 1 ? { dust: 148, aod: 0.32, pm10: 61.4, pm2_5: 18.2 }
        : index === 2 ? { dust: 4, aod: 0.62, pm10: 9.1, pm2_5: 3.4 }
          : index === 3 ? { dust: 12, aod: 0.11, pm10: 14.0, pm2_5: 5.0 }
            : { dust: 0, aod: 0.05, pm10: 8.0, pm2_5: 4.0 };
    if (index === 4) return { latitude: cell[1], longitude: cell[2], elevation: 300, current: null };
    return {
      latitude: cell[1], longitude: cell[2], elevation: 300,
      current_units: { dust: 'μg/m³', pm10: 'μg/m³', pm2_5: 'μg/m³', aerosol_optical_depth: '' },
      current: {
        time: '2026-10-03T12:00', interval: 3600,
        dust: values.dust, pm10: values.pm10, pm2_5: values.pm2_5,
        aerosol_optical_depth: values.aod
      }
    };
  });
}

// Synthetic Open-Meteo FORECAST answer, indexed to the same DUST_CELLS:
//   cell 0 → 42.2 km/h from 48°, gusting 67 (a real blow)
//   cell 1 → 16.8 km/h              (dusty, but too calm to lift any of it)
//   cell 2 → 55.0 km/h              (the gale over near-clean ground)
//   cell 3 → 51.0 km/h              (gale over thin haze)
// The rest are calm. The key contrast is cell 1 vs cell 0: both carry plenty of
// dust, and only the windy one may be called a sandstorm.
function windFeed() {
  const speeds = { 0: 42.2, 1: 16.8, 2: 55.0, 3: 51.0 };
  return DUST_CELLS.map((cell, index) => {
    const speed = speeds[index] != null ? speeds[index] : 8;
    return {
      latitude: cell[1], longitude: cell[2], elevation: 300,
      current_units: { wind_speed_10m: 'km/h', wind_direction_10m: '°', wind_gusts_10m: 'km/h' },
      current: {
        time: '2026-10-04T09:30', interval: 900,
        wind_speed_10m: speed, wind_direction_10m: 48, wind_gusts_10m: speed + 25
      }
    };
  });
}

// Route the stub by URL so the dust feed and the wind feed can be stubbed (or
// broken) independently, exactly as the handler requests them.
function bothFeeds({ dust: dustPayload, wind: windPayload } = {}) {
  return async (url) => {
    if (String(url).includes('air-quality-api')) {
      if (dustPayload === 'offline') throw new Error('offline');
      return { ok: true, json: async () => dustPayload || dustFeed() };
    }
    if (String(url).includes('api.open-meteo.com')) {
      if (windPayload === 'offline') throw new Error('offline');
      return { ok: true, json: async () => windPayload || windFeed() };
    }
    throw new Error('unexpected feed: ' + url);
  };
}

test('the dust scan asks the keyless air-quality model one question per cell', () => {
  const url = buildDustUrl(DUST_CELLS);
  assert.ok(url.startsWith(AIR_QUALITY_FEED + '?'));
  assert.ok(url.includes('air-quality-api.open-meteo.com'));
  assert.ok(url.includes('current=dust'));
  assert.ok(url.includes('pm10'));
  assert.ok(url.includes('aerosol_optical_depth'));
  const lat = decodeURIComponent(url.match(/latitude=([^&]+)/)[1]).split(',');
  const lng = decodeURIComponent(url.match(/longitude=([^&]+)/)[1]).split(',');
  assert.equal(lat.length, DUST_CELLS.length, 'one latitude per dust cell');
  assert.equal(lng.length, DUST_CELLS.length, 'one longitude per dust cell');
});

test('the dust bands follow the modelled µg/m³ load', () => {
  assert.equal(dustLevelFor(10).level, 0);
  assert.equal(dustLevelFor(MIN_DUST).label, 'hazy');
  assert.equal(dustLevelFor(119).level, 1);
  assert.equal(dustLevelFor(120).label, 'thick');
  assert.equal(dustLevelFor(399).level, 2);
  assert.equal(dustLevelFor(400).label, 'severe');
  assert.equal(dustLevelFor(3271).level, 3);
});

test('only dusty cells reach the globe, heaviest first', () => {
  const points = normalizeDustPoints(dustFeed());
  const byName = Object.fromEntries(points.map((p) => [p.name, p]));

  const severe = byName[DUST_CELLS[0][0]];
  assert.ok(severe, 'a severe outbreak is reported');
  assert.equal(severe.dustUgm3, 3271);
  assert.equal(severe.level, 3);
  assert.equal(severe.levelLabel, 'severe');
  assert.equal(severe.score, 100);
  assert.equal(severe.pm10Ugm3, 1580);
  assert.equal(severe.aerosolOpticalDepth, 1.14);
  assert.equal(severe.kind, 'modelled');
  assert.equal(severe.observedAt, '2026-10-03T12:00:00Z');

  assert.equal(byName[DUST_CELLS[1][0]].levelLabel, 'thick');

  // A low ground value under a provably thick column still counts (the plume
  // travels aloft), but it is drawn as the faintest band.
  const aloft = byName[DUST_CELLS[2][0]];
  assert.ok(aloft, 'a thick aerosol column is still drawn');
  assert.equal(aloft.level, 1);
  assert.equal(aloft.levelLabel, 'hazy (thick column)');

  assert.equal(byName[DUST_CELLS[3][0]], undefined, 'clean air is never drawn');
  assert.equal(points.length, 3);
  assert.equal(points[0].name, DUST_CELLS[0][0], 'heaviest first');
  assert.ok(points.every((p) => p.dustUgm3 >= MIN_DUST || p.level >= 1));
  assert.ok(points.length <= MAX_DUST_POINTS);
});

test('heaviest first survives the saturated score band', () => {
  // Every cell here sits far above the point where `score` saturates (430 µg/m³),
  // so a score-only sort would leave them in plain cell order — which is exactly
  // how the live CAMS feed returns them (Bodélé 753 above Ténéré 1194).
  const loads = [3271, 753, 1194, 1021, 512, 468];
  const feed = DUST_CELLS.map((cell, index) => {
    const dust = loads[index];
    if (dust == null) return { latitude: cell[1], longitude: cell[2], current: null };
    return {
      latitude: cell[1], longitude: cell[2], elevation: 300,
      current: {
        time: '2026-10-03T12:00', dust,
        pm10: Math.round(dust / 1.6), pm2_5: Math.round(dust / 12),
        aerosol_optical_depth: 0.4
      }
    };
  });

  const points = normalizeDustPoints(feed);
  assert.equal(points.length, loads.length);
  assert.deepEqual(points.map((p) => p.dustUgm3), [3271, 1194, 1021, 753, 512, 468]);
  assert.ok(points.every((p) => p.score === 100), 'these all saturate the score, so score alone cannot rank them');
  assert.ok(points.every((p, i) => i === 0 || points[i - 1].dustUgm3 >= p.dustUgm3), 'strictly heaviest first');
  assert.equal(points[0].name, DUST_CELLS[0][0], 'the peak row is the real peak');
});

test('nonsense payloads are simply empty, never invented data', () => {
  assert.equal(normalizeDustPoints(null).length, 0);
  assert.equal(normalizeDustPoints([{ current: null }]).length, 0);
  assert.equal(normalizeDustPoints([{ current: {} }]).length, 0);
  assert.equal(normalizeDustPoints([{ current: { dust: 'abc' } }]).length, 0);
});

test('GET /api/dust returns the modelled dust cells with a CDN cache header', async () => {
  const res = fakeRes();
  await withStubbedFetch(bothFeeds(), () => dust({ method: 'GET', url: '/api/dust' }, res));

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.scannedCount, DUST_CELLS.length);
  assert.equal(body.thresholdUgm3, MIN_DUST);
  assert.equal(body.count, 3);
  assert.deepEqual(body.sources, { airQuality: 'ok', wind: 'ok', windGrid: 'ok' });
  assert.match(body.feedTitle, /Saharan dust/);
  assert.equal(body.points.length, 3);
  assert.equal(res.headers['cache-control'], 'public, max-age=600, stale-while-revalidate=1800');
});

test('a dead air-quality model draws nothing and POST is rejected', async () => {
  const down = fakeRes();
  await withStubbedFetch(bothFeeds({ dust: 'offline' }),
    () => dust({ method: 'GET', url: '/api/dust' }, down));
  const bodyDown = JSON.parse(down.body);
  assert.equal(down.statusCode, 200);
  assert.equal(bodyDown.sources.airQuality, 'unavailable');
  assert.deepEqual(bodyDown.points, []);
  assert.equal(bodyDown.count, 0);

  const wrongMethod = fakeRes();
  await dust({ method: 'POST', url: '/api/dust' }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
});
// ---- wind, and the dust + wind combination that makes a sandstorm ----

test('wind comes from the keyless forecast API, one question per dust cell', () => {
  const url = buildWindUrl(DUST_CELLS);
  assert.ok(url.startsWith(WEATHER_FEED + '?'), 'wind is fetched from the forecast feed');
  assert.ok(url.includes('wind_speed_10m'));
  assert.ok(url.includes('wind_direction_10m'));
  assert.ok(url.includes('wind_gusts_10m'));
  // The air-quality model has no wind at all, so it must never be asked for it.
  assert.ok(!buildDustUrl(DUST_CELLS).includes('wind'));
  const lat = decodeURIComponent(url.match(/latitude=([^&]+)/)[1]).split(',');
  const lng = decodeURIComponent(url.match(/longitude=([^&]+)/)[1]).split(',');
  assert.equal(lat.length, DUST_CELLS.length, 'one latitude per dust cell');
  assert.equal(lng.length, DUST_CELLS.length, 'one longitude per dust cell');
});

test('a sandstorm needs BOTH loose dust and wind — neither half is enough', () => {
  assert.equal(sandstormLevelFor(3000, 5).level, 0, 'dust in calm air is settled haze');
  assert.equal(sandstormLevelFor(4, 90).level, 0, 'a gale over bare ground is just a gale');
  assert.equal(sandstormLevelFor(12, 90).level, 0, 'a gale over thin haze lifts nothing');
  assert.equal(sandstormLevelFor(3000, null).level, 0, 'missing evidence is never a sandstorm');
  assert.equal(sandstormLevelFor(null, 90).level, 0);

  assert.equal(sandstormLevelFor(SANDSTORM_MIN_DUST, SANDSTORM_MIN_WIND).level, 1);
  assert.equal(sandstormLevelFor(3000, SANDSTORM_MIN_WIND).label, 'blowing dust');
  assert.equal(sandstormLevelFor(SANDSTORM_MIN_DUST, 60).label, 'dust storm');
  assert.equal(sandstormLevelFor(400, 55).level, 3);
  assert.equal(sandstormLevelFor(400, 55).label, 'severe dust storm');
});

test('wind is matched to its own cell, not to the point order', () => {
  // Cells 0 and 1 both carry dust, but only cell 0 is windy. Zipping the wind by
  // array position instead of by cell id would report the gale on both.
  const points = normalizeDustPoints(dustFeed());
  attachWindToPoints(points, windFeed());
  const byName = Object.fromEntries(points.map((p) => [p.name, p]));

  const windy = byName[DUST_CELLS[0][0]];
  assert.equal(windy.windKmh, 42.2);
  assert.equal(windy.windGustKmh, 67.2);
  assert.equal(windy.windDirectionDeg, 48);
  assert.equal(windy.sandstormLevel, 1, 'thick dust in a real blow = blowing dust');

  const calm = byName[DUST_CELLS[1][0]];
  assert.equal(calm.windKmh, 16.8, 'the calm cell keeps its own wind, not the gale');
  assert.equal(calm.sandstormLevel, 0, 'thick dust in calm air is not a sandstorm');
  assert.equal(calm.sandstormLabel, 'none');
});

test('a missing wind feed downgrades the layer instead of inventing a gale', () => {
  const points = normalizeDustPoints(dustFeed());
  attachWindToPoints(points, null);
  assert.equal(points.length, 3, 'the dust itself survives');
  assert.ok(points.every((p) => p.windKmh === null && p.windDirectionDeg === null));
  assert.ok(points.every((p) => p.sandstormLevel === 0), 'no wind evidence, no sandstorm');
});

test('GET /api/dust reports sandstorms, and a dead wind feed keeps the dust', async () => {
  const stormy = fakeRes();
  await withStubbedFetch(bothFeeds(), () => dust({ method: 'GET', url: '/api/dust' }, stormy));
  const body = JSON.parse(stormy.body);
  assert.equal(body.sandstormCount, 1, 'only the thick-dust-and-windy cell qualifies');
  assert.equal(body.sandstormMinWindKmh, SANDSTORM_MIN_WIND);
  assert.equal(body.sources.wind, 'ok');

  const noWind = fakeRes();
  await withStubbedFetch(bothFeeds({ wind: 'offline' }),
    () => dust({ method: 'GET', url: '/api/dust' }, noWind));
  const bodyNoWind = JSON.parse(noWind.body);
  assert.equal(noWind.statusCode, 200, 'a dead wind feed is not an error');
  assert.equal(bodyNoWind.sources.wind, 'unavailable');
  assert.equal(bodyNoWind.count, 3, 'the dust layer still works');
  assert.equal(bodyNoWind.sandstormCount, 0, 'but nothing is called a sandstorm');
  assert.ok(bodyNoWind.points.every((p) => p.windKmh === null));
});

// The URL is built with encodeURIComponent, so the grid's commas arrive as %2C.
// Decode before counting or every batched request looks like a single point.
function gridPointCount(url) {
  const latitudes = decodeURIComponent(String(url).split('latitude=')[1].split('&')[0]);
  return latitudes.split(',').filter(Boolean).length;
}

test('a clean sky skips only the DUST-BELT wind request, never the global grid', async () => {
  // The wind over the Sahara is only worth asking for when there is dust to lift,
  // so a clean sky must still not spend that request. The global wind grid is a
  // different matter: it is the globe's own layer, so it is always fetched —
  // exactly one request, never one per dust cell.
  const asked = [];
  await withStubbedFetch(async (url) => {
    if (String(url).includes('air-quality-api')) {
      const clean = DUST_CELLS.map((c) => ({
        latitude: c[1], longitude: c[2],
        current: { time: '2026-10-04T09:00', dust: 0, aerosol_optical_depth: 0.02 }
      }));
      return { ok: true, json: async () => clean };
    }
    asked.push(String(url));
    return { ok: true, json: async () => windFeed() };
  }, () => dust({ method: 'GET', url: '/api/dust' }, fakeRes()));

  assert.equal(asked.length, 1,
    'a clean sky costs the global wind grid and nothing else');
  assert.equal(gridPointCount(asked[0]), WIND_GRID.length,
    'and it is a single batched grid request');
});

test('a dead wind model still returns dust and an empty wind grid', async () => {
  // Dust and wind are fetched independently, so neither outage may take the
  // other down with it.
  const res = fakeRes();
  await withStubbedFetch(bothFeeds({ wind: 'offline' }),
    () => dust({ method: 'GET', url: '/api/dust' }, res));
  const body = JSON.parse(res.body);

  assert.equal(res.statusCode, 200);
  assert.equal(body.sources.wind, 'unavailable');
  assert.equal(body.sources.windGrid, 'unavailable');
  assert.equal(body.count, 3, 'the dust layer survives a dead wind model');
  assert.deepEqual(body.wind.points, [], 'no wind means no invented barbs');
  assert.equal(body.wind.available, 'unavailable');
});

// ---- the global wind grid that powers the globe's own 💨 Wind layer ----

test('the wind grid is a coarse global lattice, fetched in one batched request', () => {
  assert.equal(WIND_GRID.length, WIND_GRID_LATS.length * WIND_GRID_LONGS.length);
  assert.equal(WIND_GRID.length, 40, '5 latitudes x 8 longitudes');
  assert.ok(WIND_GRID.every((c) => c[0] >= -60 && c[0] <= 60 && c[1] >= -180 && c[1] <= 180));

  const url = buildWindGridUrl();
  assert.ok(url.startsWith(WEATHER_FEED + '?'), 'the grid uses the same keyless host');
  assert.equal(gridPointCount(url), WIND_GRID.length,
    'one request covers the whole grid');
  assert.ok(url.includes('wind_speed_10m') && url.includes('wind_gusts_10m'));
});

test('wind barbs keep their own grid square, never a neighbour\'s', () => {
  // A shift-by-one here would put every barb on the wrong square of the planet,
  // which is invisible on a globe and impossible to notice by eye.
  const payload = WIND_GRID.map((cell, i) => ({
    latitude: cell[0], longitude: cell[1],
    current: {
      time: '2026-10-10T06:00',
      wind_speed_10m: 10 + i, wind_direction_10m: (i * 9) % 360, wind_gusts_10m: 20 + i
    }
  }));
  const barbs = normalizeWindGrid(payload);
  assert.equal(barbs.length, WIND_GRID.length);
  barbs.forEach((b) => {
    assert.ok(WIND_GRID.some((c) => c[0] === b.lat && c[1] === b.lng),
      'barb sits on the grid square it was asked about: ' + b.lat + '/' + b.lng);
  });
  assert.ok(barbs.every((b, i) => i === 0 || barbs[i - 1].speedKmh >= b.speedKmh),
    'windiest first, so a capped globe keeps the strongest barbs');
});

test('a wind grid with holes yields fewer barbs, never shifted ones', () => {
  assert.deepEqual(normalizeWindGrid([{ current: {} }, null, undefined]), [],
    'no speed means no evidence means no barb');
  assert.deepEqual(normalizeWindGrid(null), []);
  // A lone object is read as station 0 — the same defensive convention the dust
  // normaliser already uses — so it yields that square's barb and nothing more.
  const lone = normalizeWindGrid({ current: { wind_speed_10m: 30 } });
  assert.equal(lone.length, 1);
  assert.equal(lone[0].lat, WIND_GRID[0][0]);
  assert.equal(lone[0].lng, WIND_GRID[0][1]);
});

test('Beaufort force follows the standard km/h boundaries', () => {
  assert.equal(beaufortFor(0), 0);
  assert.equal(beaufortFor(5), 1);
  assert.equal(beaufortFor(11), 2);
  assert.equal(beaufortFor(19), 3);
  assert.equal(beaufortFor(28), 4);
  assert.equal(beaufortFor(38), 5);
  assert.equal(beaufortFor(49), 6);
  assert.equal(beaufortFor(61), 7);
  assert.equal(beaufortFor(74), 8);
  assert.equal(beaufortFor(88), 9);
  assert.equal(beaufortFor(102), 10);
  assert.equal(beaufortFor(117), 11);
  assert.equal(beaufortFor(200), 12, 'hurricane force is capped at 12');
  assert.equal(beaufortFor(null), 0, 'no wind is no force');
});

