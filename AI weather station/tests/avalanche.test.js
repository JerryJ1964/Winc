// Unit tests for the 🏔️ snow-avalanche globe layer:
//   • official Avalanche.org forecast zones (danger rating + warnings in force)
//   • the modelled global snow-load scan (keyless Open-Meteo)
const test = require('node:test');
const assert = require('node:assert/strict');
const avalanche = require('../api/avalanche.js');
const {
  normalizeZones, normalizeMassifRisk, normalizeWarning, largestRingCentre,
  buildMassifUrl, avalancheLevelFor, AVALANCHE_MASSIFS, MIN_RISK_SCORE
} = avalanche._internal;

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

function mapLayerFeed() {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 1744,
        properties: {
          name: 'Abajos', center: 'Utah Avalanche Center', center_id: 'UAC', state: 'UT',
          danger: 'high', danger_level: 4, off_season: false,
          travel_advice: 'Avoid steep slopes.',
          link: 'https://utahavalanchecenter.org/forecast/abajos',
          start_date: '2026-01-02T14:00:00', end_date: '2026-01-03T14:00:00',
          warning: {
            product: {
              id: 'W1', danger: 'high',
              starts_at: '2026-01-02T06:00:00Z', ends_at: '2026-01-03T06:00:00Z',
              link: 'https://avalanche.org/warning'
            }
          }
        },
        geometry: { type: 'Polygon', coordinates: [[[-110, 37], [-109, 37], [-109, 38], [-110, 38], [-110, 37]]] }
      },
      {
        type: 'Feature',
        id: 3017,
        properties: {
          name: 'Adirondack Park', center: 'New York State Avalanche Center', state: 'NY',
          danger: 'no rating', danger_level: -1, off_season: true, link: 'https://dec.ny.gov/x'
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[[-74.5, 44], [-73.5, 44], [-73.5, 44.5], [-74.5, 44.5], [-74.5, 44]]],
            [[[-74.0, 43.8], [-73.8, 43.8], [-73.8, 43.9], [-74.0, 43.9], [-74.0, 43.8]]]
          ]
        }
      },
      { type: 'Feature', id: 'nogeo', properties: { name: 'No geometry', danger_level: 2 }, geometry: null }
    ]
  };
}

// Synthetic Open-Meteo answer indexed to AVALANCHE_MASSIFS:
//   massif 0 → a deep pack buried by 85 cm of new snow and hammered by 110 km/h gusts
//   massif 1 → bare ground, nothing to slide
//   massif 2 → a modest 18 cm load, milder wind and a small thaw
function massifFeed() {
  return AVALANCHE_MASSIFS.map((massif, index) => {
    const snow = index === 0 ? [0, 20, 40, 25] : index === 2 ? [0, 5, 8, 5] : [0, 0, 0, 0];
    const gust = index === 0 ? 110 : index === 2 ? 60 : 12;
    const tmax = index === 0 ? -2 : index === 2 ? 4 : 9;
    const depth = index === 0 ? 1.2 : index === 2 ? 0.3 : 0;
    return {
      latitude: massif[1], longitude: massif[2], elevation: 2400 + index,
      daily: {
        time: ['d-3', 'd-2', 'd-1', 'd'],
        snowfall_sum: snow,
        wind_gusts_10m_max: [gust, gust, gust, gust],
        temperature_2m_max: [tmax, tmax, tmax, tmax],
        snow_depth_max: [depth, depth, depth, depth],
        precipitation_sum: [0, 0, 0, 0]
      }
    };
  });
}

test('official zones keep their danger rating, warning and zone centre', () => {
  const zones = normalizeZones(mapLayerFeed());
  assert.equal(zones.length, 2, 'a zone without geometry is dropped');

  const warned = zones[0];
  assert.equal(warned.name, 'Abajos', 'warned zones lead the list');
  assert.equal(warned.dangerLevel, 4);
  assert.equal(warned.rated, true);
  assert.equal(warned.state, 'UT');
  assert.equal(warned.centreId, 'UAC');
  assert.equal(warned.offSeason, false);
  assert.equal(warned.link, 'https://utahavalanchecenter.org/forecast/abajos');
  assert.equal(warned.warning.danger, 'high');
  assert.equal(warned.warning.link, 'https://avalanche.org/warning');
  assert.equal(warned.warning.endsAt, '2026-01-03T06:00:00.000Z');
  assert.ok(Math.abs(warned.lat - 37.5) < 1e-6, 'polygon centre latitude');
  assert.ok(Math.abs(warned.lng - -109.5) < 1e-6, 'polygon centre longitude');

  const offSeason = zones[1];
  assert.equal(offSeason.rated, false, '"no rating" is not a danger level');
  assert.equal(offSeason.dangerLevel, -1);
  assert.equal(offSeason.offSeason, true);
  assert.equal(offSeason.warning, null);
  // The biggest polygon of a MultiPolygon wins: its centre, not the average.
  assert.ok(Math.abs(offSeason.lat - 44.25) < 1e-6);
  assert.ok(Math.abs(offSeason.lng - -74.0) < 1e-6);

  assert.deepEqual(normalizeZones(null), []);
});

test('warnings and ring geometry are read defensively', () => {
  assert.equal(normalizeWarning(null), null);
  assert.equal(normalizeWarning({ product: null }), null);
  const warning = normalizeWarning({ product: { dangerLevel: 3, url: 'http://insecure.test' } });
  assert.equal(warning.danger, '3');
  assert.equal(warning.link, null, 'only https links are kept');
  assert.equal(warning.startsAt, null);
  assert.equal(largestRingCentre({ coordinates: [] }), null);
  assert.equal(largestRingCentre(null), null);
  assert.equal(largestRingCentre({ coordinates: [[[999, 999], [999, 999]]] }), null);
});

test('the massif scan URL batches every massif and asks for snow, wind and depth', () => {
  const url = buildMassifUrl(AVALANCHE_MASSIFS);
  assert.ok(url.startsWith('https://api.open-meteo.com/v1/forecast?'));
  assert.ok(url.includes('snowfall_sum'));
  assert.ok(url.includes('wind_gusts_10m_max'));
  assert.ok(url.includes('snow_depth_max'));
  const lat = decodeURIComponent(url.match(/latitude=([^&]+)/)[1]).split(',');
  assert.equal(lat.length, AVALANCHE_MASSIFS.length, 'one latitude per massif');
});

test('the modelled scan follows the snow line and the snow load', () => {
  const points = normalizeMassifRisk(massifFeed());
  const byName = Object.fromEntries(points.map((p) => [p.name, p]));

  const buried = byName[AVALANCHE_MASSIFS[0][0]];
  assert.ok(buried, 'a loaded range is reported');
  assert.equal(buried.newSnow72Cm, 85);
  assert.equal(buried.newSnow24Cm, 25);
  assert.equal(buried.windGustKmh, 110);
  assert.equal(buried.snowDepthM, 1.2);
  assert.equal(buried.score, 85, '45 new-snow + 30 wind + 10 deep pack, no thaw bonus');
  assert.equal(buried.levelLabel, 'high');
  assert.equal(buried.kind, 'modelled');

  const mild = byName[AVALANCHE_MASSIFS[2][0]];
  assert.ok(mild, 'a modest load with a thaw still counts');
  assert.equal(mild.score, 37);
  assert.equal(mild.levelLabel, 'moderate');

  assert.equal(byName[AVALANCHE_MASSIFS[1][0]], undefined, 'bare ground stays off the globe');
  assert.ok(points.every((p) => p.score >= MIN_RISK_SCORE));
  assert.equal(normalizeMassifRisk(null).length, 0);
  assert.equal(normalizeMassifRisk([{ daily: null }]).length, 0);
  assert.equal(avalancheLevelFor(0).label, 'low');
  assert.equal(avalancheLevelFor(60).level, 3);
});

test('GET /api/avalanche returns official zones plus modelled ranges', async () => {
  const res = fakeRes();
  await withStubbedFetch(async (url) => {
    if (String(url).includes('avalanche.org')) return { ok: true, json: async () => mapLayerFeed() };
    return { ok: true, json: async () => massifFeed() };
  }, () => avalanche({ method: 'GET', url: '/api/avalanche' }, res));

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.zoneCount, 2);
  assert.equal(body.ratedZoneCount, 1);
  assert.equal(body.warningCount, 1);
  assert.equal(body.modelledCount, 2);
  assert.equal(body.count, 4);
  assert.deepEqual(body.sources, { official: 'ok', modelled: 'ok' });
  assert.match(body.feedTitle, /Avalanche\.org/);
  assert.equal(res.headers['cache-control'], 'public, max-age=600, stale-while-revalidate=1800');
});

test('a dead avalanche.org still leaves the modelled ranges, and POST is rejected', async () => {
  const officialDown = fakeRes();
  await withStubbedFetch(async (url) => {
    if (String(url).includes('avalanche.org')) throw new Error('network down');
    return { ok: true, json: async () => massifFeed() };
  }, () => avalanche({ method: 'GET', url: '/api/avalanche' }, officialDown));
  const bodyDown = JSON.parse(officialDown.body);
  assert.equal(bodyDown.sources.official, 'unavailable');
  assert.equal(bodyDown.sources.modelled, 'ok');
  assert.deepEqual(bodyDown.zones, []);
  assert.equal(bodyDown.modelledCount, 2);

  const bothDown = fakeRes();
  await withStubbedFetch(async () => { throw new Error('offline'); },
    () => avalanche({ method: 'GET', url: '/api/avalanche' }, bothDown));
  assert.equal(bothDown.statusCode, 200);
  assert.equal(JSON.parse(bothDown.body).zoneCount, 0);

  const wrongMethod = fakeRes();
  await avalanche({ method: 'POST', url: '/api/avalanche' }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
});
