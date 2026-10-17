// Unit tests for the 🔥 wildfire globe layer (NASA EONET).
const test = require('node:test');
const assert = require('node:assert/strict');
const fires = require('../api/fires.js');
const { normalizeFires, latestGeometryPoint } = fires._internal;

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

function fakeFeed() {
  return {
    title: 'EONET Events',
    events: [
      {
        id: 'EONET_FIRE_1', title: 'Wildfire Test Creek', description: '10 miles north',
        link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_FIRE_1',
        sources: [{ id: 'IRWIN', url: 'https://example.test/fire' }],
        geometry: [
          { date: '2026-09-23T00:00:00Z', type: 'Point', coordinates: [-120.1, 38.2] },
          { date: '2026-09-24T12:00:00Z', magnitudeValue: 640, magnitudeUnit: 'acres', type: 'Point', coordinates: [-120, 38] }
        ]
      },
      {
        id: 'EONET_FIRE_2', title: 'Prescribed Fire Test RX',
        sources: [{ id: 'IRWIN', url: 'https://example.test/rx' }],
        geometry: [{ date: '2026-09-22T00:00:00Z', magnitudeValue: 50, magnitudeUnit: 'acres', type: 'Polygon', coordinates: [[[10, 20], [12, 20], [12, 22], [10, 22], [10, 20]]] }]
      },
      { id: 'broken', title: 'No geometry wildfire', geometry: null },
      { id: 'bad', title: 'Bad wildfire', geometry: [{ type: 'Point', coordinates: [999, 999] }] }
    ]
  };
}

test('EONET wildfire events become sorted globe-ready fire markers', () => {
  const events = normalizeFires(fakeFeed());
  assert.equal(events.length, 2);
  assert.equal(events[0].id, 'EONET_FIRE_1');
  assert.equal(events[0].lat, 38);
  assert.equal(events[0].lng, -120);
  assert.equal(events[0].acres, 640);
  assert.equal(events[0].observedAt, '2026-09-24T12:00:00.000Z');
  assert.equal(events[0].prescribed, false);
  assert.equal(events[0].sourceUrl, 'https://example.test/fire');
  assert.equal(events[1].prescribed, true);
  assert.deepEqual(normalizeFires(null), []);
});

test('the freshest wildfire geometry wins and polygon centres are usable', () => {
  assert.deepEqual(latestGeometryPoint([
    { date: '2026-01-01T00:00:00Z', coordinates: [1, 2] },
    { date: '2026-02-01T00:00:00Z', coordinates: [3, 4] }
  ]), { lat: 4, lng: 3, date: '2026-02-01T00:00:00Z', magnitudeValue: null, magnitudeUnit: null });
  assert.deepEqual(latestGeometryPoint([{ coordinates: [[[10, 20], [12, 20], [12, 22], [10, 22]]] }]), {
    lat: 21, lng: 11, date: null, magnitudeValue: null, magnitudeUnit: null
  });
  assert.equal(latestGeometryPoint([{ coordinates: [999, 999] }]), null);
  assert.equal(latestGeometryPoint(null), null);
});

test('GET /api/fires returns the normalized payload', async () => {
  const res = fakeRes();
  await withStubbedFetch(async () => ({ ok: true, json: async () => fakeFeed() }),
    () => fires({ method: 'GET', url: '/api/fires' }, res));
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.count, 2);
  assert.equal(body.feedTitle, 'EONET Events');
  assert.equal(body.events[0].name, 'Wildfire Test Creek');
  assert.equal(res.headers['cache-control'], 'public, max-age=300');
});

test('the wildfire proxy degrades safely and rejects non-GET requests', async () => {
  const down = fakeRes();
  await withStubbedFetch(async () => { throw new Error('network down'); },
    () => fires({ method: 'GET', url: '/api/fires' }, down));
  assert.equal(down.statusCode, 502);
  assert.deepEqual(JSON.parse(down.body).events, []);

  const wrongMethod = fakeRes();
  await fires({ method: 'POST', url: '/api/fires' }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
});
