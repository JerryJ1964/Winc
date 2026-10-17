// Unit tests for the 🌋 volcano globe layer:
//   • api/volcano.js — NASA EONET "open volcano events" → erupting-lava markers
// Run: npm test   (uses Node's built-in test runner)
const test = require('node:test');
const assert = require('node:assert');

const volcano = require('../api/volcano.js');

const {
  normalizeVolcanoes,
  splitVolcanoTitle,
  latestGeometryPoint,
  smithsonianVolcanoNumber
} = volcano._internal;

// ---------- helpers ----------

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    end(data) { this.body = data; }
  };
}

// Swap in a stubbed fetch so the handler tests never touch the network.
async function withStubbedFetch(stub, run) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

function fakeFeed() {
  return {
    title: 'EONET Events',
    events: [
      {
        id: 'EONET_12367',
        title: 'Kilauea Volcano, Hawaii',
        sources: [
          { id: 'EO', url: 'https://earthobservatory.nasa.gov/images/123' },
          { id: 'SIVolcano', url: 'https://volcano.si.edu/volcano.cfm?vn=332010' }
        ],
        geometry: [
          { date: '2026-01-02T00:00:00Z', type: 'Point', coordinates: [-155.28, 19.42] },
          { date: '2026-08-30T00:00:00Z', type: 'Point', coordinates: [-155.287, 19.421] } // freshest wins
        ]
      },
      {
        id: 'EONET_13342',
        // The area arrives with a non-breaking space in the real EONET feed.
        title: 'Popocatepetl Volcano,\u00a0Mexico',
        sources: [{ id: 'SIVolcano' }, { id: 'GDACS', url: 'https://gdacs.org/x' }],
        geometry: [{ date: '2025-04-10T00:00:00Z', type: 'Point', coordinates: [-98.622, 19.023] }]
      },
      {
        // No "Volcano" suffix and no area — the name must survive untouched.
        id: 'EONET_0001',
        title: 'Etna',
        sources: [],
        geometry: [{ date: '2026-02-01T00:00:00Z', type: 'Point', coordinates: [15.0, 37.7] }]
      },
      // Malformed: no geometry — must be skipped, not crash.
      { id: 'broken', title: 'Nowhere Volcano', geometry: null },
      // Off-planet coordinates must be dropped.
      { id: 'bad', title: 'Bad Volcano', geometry: [{ type: 'Point', coordinates: [999, 999] }] }
    ]
  };
}

// ---------- 🌋 volcanoes (NASA EONET → Smithsonian GVP) ----------

test('EONET events are normalized to globe markers (lat/lng order + freshest first)', () => {
  const events = normalizeVolcanoes(fakeFeed());
  assert.strictEqual(events.length, 3, 'the malformed and off-planet events must be dropped');

  // EONET ships [longitude, latitude] — the globe needs the opposite order.
  assert.strictEqual(events[0].name, 'Kilauea');
  assert.strictEqual(events[0].lat, 19.421);
  assert.strictEqual(events[0].lng, -155.287);
  assert.strictEqual(events[0].country, 'Hawaii');
  assert.strictEqual(events[0].activityDate, '2026-08-30T00:00:00.000Z', 'the latest report wins');
  assert.ok(Number.isFinite(events[0].epochMs));
  assert.strictEqual(events[0].vnum, '332010');
  assert.strictEqual(events[0].sourceUrl, 'https://volcano.si.edu/volcano.cfm?vn=332010');
  assert.deepStrictEqual(events[0].sources, ['EO', 'SIVolcano']);

  // Newest activity first: Aug 2026 → Feb 2026 → Apr 2025.
  assert.deepStrictEqual(events.map((v) => v.name), ['Kilauea', 'Etna', 'Popocatepetl']);
  // The non-breaking space in the area is cleaned up.
  assert.strictEqual(events[2].country, 'Mexico');
  // No Smithsonian link in the feed → the GVP event list is used instead.
  assert.match(events[1].sourceUrl, /^https:\/\/volcano\.si\.edu\/|^https:\/\/eonet\.gsfc\.nasa\.gov\//);

  assert.deepStrictEqual(normalizeVolcanoes(null), [], 'a broken payload must not throw');
  assert.deepStrictEqual(normalizeVolcanoes({}), []);
});

test('volcano titles split into name + area', () => {
  assert.deepStrictEqual(splitVolcanoTitle('Kilauea Volcano, Hawaii'), { name: 'Kilauea', country: 'Hawaii' });
  assert.deepStrictEqual(splitVolcanoTitle('Nevados del Chillan Volcano, Chile'), { name: 'Nevados del Chillan', country: 'Chile' });
  assert.deepStrictEqual(splitVolcanoTitle('Popocatepetl Volcano,\u00a0Mexico'), { name: 'Popocatepetl', country: 'Mexico' });
  assert.deepStrictEqual(splitVolcanoTitle('Ivao Group Volcano, Russia'), { name: 'Ivao Group', country: 'Russia' });
  assert.deepStrictEqual(splitVolcanoTitle('Etna'), { name: 'Etna', country: null });
  assert.deepStrictEqual(splitVolcanoTitle('  '), { name: '', country: null });
  assert.deepStrictEqual(splitVolcanoTitle(null), { name: '', country: null });
});

test('the freshest usable geometry wins and polygons are tolerated', () => {
  assert.deepStrictEqual(
    latestGeometryPoint([
      { date: '2020-01-01T00:00:00Z', type: 'Point', coordinates: [1, 2] },
      { date: '2026-01-01T00:00:00Z', type: 'Point', coordinates: ['not a number', 2] }, // unusable
      { date: '2025-01-01T00:00:00Z', type: 'Point', coordinates: [3, 4] }
    ]),
    { lat: 4, lng: 3, date: '2025-01-01T00:00:00Z' }
  );
  // Some events only carry an ash-plume ring: take its first coordinate pair.
  assert.deepStrictEqual(
    latestGeometryPoint([{ type: 'Polygon', coordinates: [[[15.2, 37.7], [15.3, 37.8]]] }]),
    { lat: 37.7, lng: 15.2, date: null }
  );
  assert.strictEqual(latestGeometryPoint([]), null);
  assert.strictEqual(latestGeometryPoint(null), null);
  assert.strictEqual(latestGeometryPoint([{ type: 'Point', coordinates: [999, 999] }]), null);
  assert.strictEqual(smithsonianVolcanoNumber([{ id: 'SIVolcano', url: 'https://volcano.si.edu/volcano.cfm?vn=357070' }]), '357070');
  assert.strictEqual(smithsonianVolcanoNumber([{ id: 'SIVolcano' }]), null);
  assert.strictEqual(smithsonianVolcanoNumber(null), null);
});

test('GET /api/volcano returns the normalized payload', async () => {
  const res = fakeRes();
  await withStubbedFetch(
    async () => ({ ok: true, json: async () => fakeFeed(), text: async () => '' }),
    () => volcano({ method: 'GET', url: '/api/volcano' }, res)
  );
  const body = JSON.parse(res.body);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(body.count, 3);
  assert.strictEqual(body.feedTitle, 'EONET Events');
  assert.strictEqual(body.events[0].name, 'Kilauea');
  assert.strictEqual(res.headers['cache-control'], 'public, max-age=300');
});

test('volcano proxy degrades to an empty list when EONET is down', async () => {
  const res = fakeRes();
  await withStubbedFetch(
    async () => { throw new Error('network down'); },
    () => volcano({ method: 'GET', url: '/api/volcano' }, res)
  );
  assert.strictEqual(res.statusCode, 502);
  assert.deepStrictEqual(JSON.parse(res.body).events, []);
});

test('volcano proxy treats a non-OK EONET response as unreachable', async () => {
  const res = fakeRes();
  await withStubbedFetch(
    async () => ({ ok: false, status: 503, json: async () => ({}) }),
    () => volcano({ method: 'GET', url: '/api/volcano' }, res)
  );
  assert.strictEqual(res.statusCode, 502);
});

test('volcano proxy rejects non-GET requests', async () => {
  const res = fakeRes();
  await volcano({ method: 'POST', url: '/api/volcano' }, res);
  assert.strictEqual(res.statusCode, 405);
});
