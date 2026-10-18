// Unit tests for the 🪨 mudslide / landslide globe layer:
//   • NASA EONET observed reports (landslides category, sparse but official)
//   • the modelled rain-triggered slope scan (keyless Open-Meteo)
const test = require('node:test');
const assert = require('node:assert/strict');
const landslide = require('../api/landslide.js');
const {
  normalizeObservedEvents, normalizeRiskPoints, buildRiskUrl, riskLevelFor,
  meanOfLastHours, landslideKind, LANDSLIDE_SLOPES, MIN_RISK_SCORE, MAX_RISK_POINTS
} = landslide._internal;

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

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function eonetFeed() {
  return {
    title: 'EONET Events',
    events: [
      {
        id: 'EONET_LS_1', title: 'Tajikistan: Floods and Mudslides', description: 'mudflow hit villages',
        link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_LS_1',
        sources: [{ id: 'ReliefWeb', url: 'https://example.test/mudslide' }],
        geometry: [
          { type: 'Point', coordinates: [69.1, 38.5], date: isoDaysAgo(40) },
          { type: 'Polygon', coordinates: [[[69.0, 38.4], [69.4, 38.4], [69.4, 38.8], [69.0, 38.8], [69.0, 38.4]]], date: isoDaysAgo(2) }
        ]
      },
      {
        id: 'EONET_LS_2', title: 'Nepal Landslide', closed: isoDaysAgo(10),
        geometry: [{ type: 'Point', coordinates: [85.3, 27.8], date: isoDaysAgo(12) }]
      },
      { id: 'EONET_LS_3', title: 'Ancient landslide', geometry: [{ type: 'Point', coordinates: [10, 10], date: '2015-05-12T00:00:00Z' }] },
      { id: 'broken', title: 'No geometry', geometry: null },
      { id: 'bad', title: 'Bad coordinates', geometry: [{ type: 'Point', coordinates: [999, 999] }] }
    ]
  };
}

// A synthetic Open-Meteo answer, indexed to LANDSLIDE_SLOPES: heavy rain on the
// first slope, a soaking-wet but rainless second, bone-dry everywhere else.
function openMeteoFeed() {
  return LANDSLIDE_SLOPES.map((slope, index) => ({
    latitude: slope[1],
    longitude: slope[2],
    elevation: 900 + index,
    daily: {
      time: ['d-3', 'd-2', 'd-1', 'd'],
      precipitation_sum: index === 0 ? [10, 40, 90, 70] : [0, 0, 0, 0],
      rain_sum: [0, 0, 0, 0]
    },
    hourly: {
      time: [],
      soil_moisture_0_to_7cm: index === 1
        ? Array.from({ length: 96 }, () => 0.45)
        : Array.from({ length: 96 }, () => 0.05)
    }
  }));
}

test('EONET landslide events become sorted, recent globe markers', () => {
  const events = normalizeObservedEvents(eonetFeed());
  assert.equal(events.length, 2, 'only events inside the recency window survive');
  assert.equal(events[0].id, 'EONET_LS_1');
  // Freshest geometry wins, and a polygon becomes its usable centre.
  assert.ok(Math.abs(events[0].lat - 38.6) < 1e-6, 'polygon centre latitude');
  assert.ok(Math.abs(events[0].lng - 69.2) < 1e-6, 'polygon centre longitude');
  assert.equal(events[0].kind, 'observed');
  assert.equal(events[0].hazard, 'mudslide', 'mudflow wording is kept');
  assert.equal(events[0].status, 'open');
  assert.equal(events[0].sourceUrl, 'https://example.test/mudslide');
  assert.equal(events[1].hazard, 'landslide');
  assert.equal(events[1].status, 'closed');
  assert.deepEqual(normalizeObservedEvents(null), []);
});

test('landslideKind keeps the reporting agency’s own wording', () => {
  assert.equal(landslideKind('Tajikistan: Floods and Mudslides'), 'mudslide');
  assert.equal(landslideKind('Debris flow in British Columbia'), 'mudslide');
  assert.equal(landslideKind('Nepal Landslide'), 'landslide');
});

test('the slope scan URL batches every slope and asks for rain + soil water', () => {
  const url = buildRiskUrl(LANDSLIDE_SLOPES);
  assert.ok(url.startsWith('https://api.open-meteo.com/v1/forecast?'));
  assert.ok(url.includes('daily=precipitation_sum,rain_sum'));
  assert.ok(url.includes('hourly=soil_moisture_0_to_7cm'));
  assert.ok(url.includes('past_days=3'));
  const lat = decodeURIComponent(url.match(/latitude=([^&]+)/)[1]).split(',');
  assert.equal(lat.length, LANDSLIDE_SLOPES.length, 'one latitude per slope');
});

test('the modelled scan scores heavy rain high, soaking soil mid and dry ground nothing', () => {
  const points = normalizeRiskPoints(openMeteoFeed());
  const byName = Object.fromEntries(points.map((p) => [p.name, p]));

  const soaked = byName[LANDSLIDE_SLOPES[0][0]];   // 200 mm in 72 h, 70 mm today
  assert.ok(soaked, 'the rained-on slope is reported');
  assert.equal(soaked.rain72Mm, 200);
  assert.equal(soaked.rain24Mm, 70);
  // 55 points for the 72-hour total + 15.6 for the 24-hour burst, no soil bonus.
  assert.equal(soaked.score, 71);
  assert.equal(soaked.levelLabel, 'high');
  assert.equal(soaked.kind, 'modelled');

  const wetSoil = byName[LANDSLIDE_SLOPES[1][0]];  // no rain, but saturated topsoil
  assert.ok(wetSoil, 'saturated ground alone still counts as loading');
  assert.equal(wetSoil.score, 20);
  assert.equal(wetSoil.levelLabel, 'moderate');

  assert.equal(points.length, 2, 'every dry, drained slope is left out');
  assert.ok(points.every((p) => p.score >= MIN_RISK_SCORE));
  assert.ok(points.length <= MAX_RISK_POINTS);
  assert.equal(normalizeRiskPoints(null).length, 0);
  assert.equal(normalizeRiskPoints([{ daily: null }]).length, 0);
});

test('risk levels and the 24-hour soil average behave', () => {
  assert.equal(riskLevelFor(0).level, 0);
  assert.equal(riskLevelFor(20).label, 'moderate');
  assert.equal(riskLevelFor(40).label, 'considerable');
  assert.equal(riskLevelFor(60).label, 'high');
  assert.equal(meanOfLastHours([0.1, 0.2, 0.3, 0.4], 2), 0.35);
  assert.equal(meanOfLastHours([], 24), null);
  assert.equal(meanOfLastHours([null, undefined, 0.5], 24), 0.5);
});

test('GET /api/landslide returns reports plus modelled slopes, from both providers', async () => {
  const res = fakeRes();
  await withStubbedFetch(async (url) => {
    if (String(url).includes('eonet')) return { ok: true, json: async () => eonetFeed() };
    return { ok: true, json: async () => openMeteoFeed() };
  }, () => landslide({ method: 'GET', url: '/api/landslide' }, res));

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.observedCount, 2);
  assert.equal(body.modelledCount, 2);
  assert.equal(body.count, 4);
  assert.deepEqual(body.sources, { observed: 'ok', modelled: 'ok' });
  assert.equal(body.risk[0].score, 71);
  assert.equal(res.headers['cache-control'], 'public, max-age=600, stale-while-revalidate=1800');
});

test('one dead provider never hides the other, and POST is rejected', async () => {
  const eonetDown = fakeRes();
  await withStubbedFetch(async (url) => {
    if (String(url).includes('eonet')) throw new Error('network down');
    return { ok: true, json: async () => openMeteoFeed() };
  }, () => landslide({ method: 'GET', url: '/api/landslide' }, eonetDown));
  const bodyDown = JSON.parse(eonetDown.body);
  assert.equal(bodyDown.sources.observed, 'unavailable');
  assert.equal(bodyDown.sources.modelled, 'ok');
  assert.deepEqual(bodyDown.events, []);
  assert.equal(bodyDown.modelledCount, 2, 'the modelled half survives');

  const bothDown = fakeRes();
  await withStubbedFetch(async () => { throw new Error('offline'); },
    () => landslide({ method: 'GET', url: '/api/landslide' }, bothDown));
  assert.equal(bothDown.statusCode, 200);
  assert.deepEqual(JSON.parse(bothDown.body).risk, []);

  const wrongMethod = fakeRes();
  await landslide({ method: 'POST', url: '/api/landslide' }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
});
