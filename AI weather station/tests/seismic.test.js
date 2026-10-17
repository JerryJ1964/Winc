// Unit tests for the two seismic globe layers:
//   • api/earthquake.js — USGS "past day" feed → magnitude-scaled globe markers
//   • api/tsunami.js    — NOAA tsunami-centre CAP messages + bulletin wave heights
// Run: npm test   (uses Node's built-in test runner)
const test = require('node:test');
const assert = require('node:assert');

const earthquake = require('../api/earthquake.js');
const tsunami = require('../api/tsunami.js');

const { normalizeEarthquakes, parseMinMagnitude } = earthquake._internal;
const {
  parseCapMessage,
  parseWaveHeights,
  categoryFromEvent,
  isThreatCategory,
  parseLatLon,
  toMetres,
  CAP_FEEDS
} = tsunami._internal;

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
    metadata: { title: 'USGS Magnitude 2.5+ Earthquakes, Past Day' },
    features: [
      {
        id: 'us7000aaaa',
        properties: { mag: 5.1, magType: 'mb', place: '172 km ESE of Saipan', time: 1789547820012, tsunami: 1, url: 'https://example.test/us7000aaaa', sig: 400 },
        geometry: { type: 'Point', coordinates: [147.1141, 14.3886, 10] }   // [lng, lat, depth]
      },
      {
        id: 'ak0000bbbb',
        properties: { mag: 3.2, magType: 'ml', place: '30 km N of Anchorage', time: 1789540000000, tsunami: 0 },
        geometry: { type: 'Point', coordinates: [-149.9, 61.4, 42.5] }
      },
      {
        id: 'tiny',
        properties: { mag: 1.1, place: 'below the threshold', time: 1789540000000 },
        geometry: { type: 'Point', coordinates: [4.3, 51.9, 5] }
      },
      // Malformed: no usable geometry — must be skipped, not crash.
      { id: 'broken', properties: { mag: 6.0, place: 'no geometry' }, geometry: null }
    ]
  };
}

// ---------- 🌍 earthquakes (USGS) ----------

test('USGS feed is normalized to globe markers (lat/lng order + magnitude sort)', () => {
  const events = normalizeEarthquakes(fakeFeed(), 2.5);
  assert.strictEqual(events.length, 2, 'the M1.1 quake is below the threshold and must be dropped');
  assert.strictEqual(events[0].mag, 5.1, 'strongest event first');
  // GeoJSON ships [longitude, latitude, depth] — the globe needs the opposite.
  assert.strictEqual(events[0].lat, 14.3886);
  assert.strictEqual(events[0].lng, 147.1141);
  assert.strictEqual(events[0].depthKm, 10);
  assert.strictEqual(events[0].tsunami, true, 'USGS tsunami-flagged events are marked');
  assert.strictEqual(events[1].tsunami, false);
  assert.match(events[0].time, /^\d{4}-\d{2}-\d{2}T/);
  assert.strictEqual(events[0].id, 'us7000aaaa');
});

test('earthquake magnitude filter is honoured and clamped', () => {
  const strong = normalizeEarthquakes(fakeFeed(), 5);
  assert.strictEqual(strong.length, 1);
  assert.strictEqual(strong[0].mag, 5.1);
  assert.deepStrictEqual(normalizeEarthquakes(null, 2.5), [], 'a broken payload must not throw');

  assert.strictEqual(parseMinMagnitude(null), earthquake._internal.DEFAULT_MIN_MAGNITUDE);
  assert.strictEqual(parseMinMagnitude('4.5'), 4.5);
  assert.strictEqual(parseMinMagnitude('nonsense'), earthquake._internal.DEFAULT_MIN_MAGNITUDE);
  assert.strictEqual(parseMinMagnitude('99'), 9, 'clamped to a sane magnitude');
});

test('GET /api/earthquake returns the normalized payload', async () => {
  const res = fakeRes();
  await withStubbedFetch(
    async () => ({ ok: true, json: async () => fakeFeed(), text: async () => '' }),
    () => earthquake({ method: 'GET', url: '/api/earthquake?minMag=4' }, res)
  );
  const body = JSON.parse(res.body);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(body.count, 1);
  assert.strictEqual(body.minMagnitude, 4);
  assert.strictEqual(body.events[0].place, '172 km ESE of Saipan');
  assert.strictEqual(res.headers['cache-control'], 'public, max-age=60');
});

test('earthquake proxy degrades to an empty list when USGS is down', async () => {
  const res = fakeRes();
  await withStubbedFetch(
    async () => { throw new Error('network down'); },
    () => earthquake({ method: 'GET', url: '/api/earthquake' }, res)
  );
  assert.strictEqual(res.statusCode, 502);
  assert.deepStrictEqual(JSON.parse(res.body).events, []);
});

test('earthquake proxy rejects non-GET requests', async () => {
  const res = fakeRes();
  await earthquake({ method: 'POST', url: '/api/earthquake' }, res);
  assert.strictEqual(res.statusCode, 405);
});
// ---------- 🌊 tsunamis (NOAA warning centres) ----------

// Structurally identical to a real https://www.tsunami.gov/events/xml/PAAQCAP.xml
// alert (a Tsunami Warning this time), with the signature block trimmed off.
const CAP_WARNING = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>PAAQ-2-t06p1k</identifier>
  <sender>ntwc@noaa.gov</sender>
  <sent>__SENT__</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <source>NTWC</source>
  <scope>Public</scope>
  <code>IPAWSv1.0</code>
  <incidents>t06p1k</incidents>
  <info>
    <category>Geo</category>
    <event>Tsunami Warning</event>
    <responseType>Evacuate</responseType>
    <urgency>Immediate</urgency>
    <severity>Severe</severity>
    <certainty>Likely</certainty>
    <expires>__EXPIRES__</expires>
    <senderName>NWS National Tsunami Warning Center Palmer AK</senderName>
    <headline>Tsunami Warning in Effect for the Aleutian Islands</headline>
    <description>Tsunami Warning - Event details: Preliminary magnitude 8.7 (Mww) earthquake / Lat: 52.2, Lon: 160.0</description>
    <instruction>Evacuate inland or to higher ground.</instruction>
    <web>http://www.tsunami.gov/events/PAAQ/2025/07/29/t06p1k/2/WEAK51/WEAK51.txt</web>
    <parameter>
      <valueName>EventLocationName</valueName>
      <value>315 miles SW of Bering I., Komandorski</value>
    </parameter>
    <parameter>
      <valueName>EventPreliminaryMagnitude</valueName>
      <value>8.7</value>
    </parameter>
    <parameter>
      <valueName>EventPreliminaryMagnitudeType</valueName>
      <value>Mww</value>
    </parameter>
    <parameter>
      <valueName>EventDepth</valueName>
      <value>46 miles</value>
    </parameter>
    <parameter>
      <valueName>EventLatLon</valueName>
      <value>52.2,160.0 0.000</value>
    </parameter>
    <area>
      <areaDesc>ALEUTIAN ISLANDS</areaDesc>
      <circle>52.2,160.0 0.0</circle>
    </area>
  </info>
</alert>`;

// The proxy drops messages older than a week (each centre keeps serving its last
// message forever), so the handler tests need a fresh alert.
function capWarning(options = {}) {
  const sent = options.sent || new Date(Date.now() - 3600000).toISOString();
  const expires = options.expires || new Date(Date.now() + 3600000).toISOString();
  return CAP_WARNING.replace('__SENT__', sent).replace('__EXPIRES__', expires);
}

// The real bulletin tables (NTWC publishes feet, PTWC metres).
const BULLETIN_TABLES = `WEAK51 PAAQ 300225

FORECASTS OF TSUNAMI ACTIVITY
-----------------------------
                 FORECAST         FORECAST  FORECAST
                 START            TSUNAMI   MAX TSUNAMI
SITE             OF TSUNAMI       DURATION  HEIGHT
----             ----------       --------  -------------

 * California
Crescent City    2350  PDT Jul 29  30 hrs    2.6- 4.8 ft   
Monterey         0015  PDT Jul 30           less than 1ft 
Seaside          2355  PDT Jul 29                          

OBSERVATIONS OF TSUNAMI ACTIVITY - UPDATED
------------------------------------------
                                  TIME               OBSERVED MAX
 SITE                         OF MEASUREMENT         TSUNAMI HEIGHT
 ---------------------------- ----------------       --------------
 Amchitka  Alaska                                        0.8ft
 Kushiro  Japan                                          1.1ft
 Nikolskoe  Russia            1714  PDT Jul 29           0.2ft

PRELIMINARY EARTHQUAKE PARAMETERS
---------------------------------
 * Magnitude      8.8
`;

test('CAP message is flattened into a globe-ready tsunami message', () => {
  const xml = capWarning({ sent: '2025-07-30T00:25:00-00:00', expires: '2099-07-30T01:25:00-00:00' });
  const msg = parseCapMessage(xml, CAP_FEEDS[0], Date.parse('2025-07-30T02:00:00Z'));
  assert.strictEqual(msg.center, 'NTWC');
  assert.strictEqual(msg.category, 'Warning');
  assert.strictEqual(msg.threat, true);
  assert.strictEqual(msg.active, true, 'a Warning that has not expired is in force');
  assert.strictEqual(msg.magnitude, 8.7);
  assert.strictEqual(msg.magnitudeType, 'Mww');
  assert.strictEqual(msg.lat, 52.2);
  assert.strictEqual(msg.lng, 160.0);
  assert.strictEqual(msg.depthKm, 46);
  assert.strictEqual(msg.region, '315 miles SW of Bering I., Komandorski');
  assert.strictEqual(msg.issued, '2025-07-30T00:25:00.000Z');
  // Bulletin links are published over plain http — upgraded so the proxy can fetch them.
  assert.match(msg.bulletinUrl, /^https:\/\/www\.tsunami\.gov\//);

  // The very same document in the year 2100 is a warning that is no longer in force.
  const expired = parseCapMessage(xml, CAP_FEEDS[0], Date.parse('2100-01-01T00:00:00Z'));
  assert.strictEqual(expired.active, false);
  assert.strictEqual(expired.threat, true, 'the category is still a warning');
});


test('wave heights are parsed from the bulletin tables and converted to metres', () => {
  const heights = parseWaveHeights(BULLETIN_TABLES);
  assert.ok(heights, 'the tables must yield heights');
  assert.strictEqual(heights.unit, 'm');
  // 2.6-4.8 ft forecast → 0.79-1.46 m
  const crescent = heights.forecast.find((row) => row.site === 'Crescent City');
  assert.strictEqual(crescent.minM, 0.79);
  assert.strictEqual(crescent.maxM, 1.46);
  assert.strictEqual(crescent.time, '2350 PDT Jul 29');
  // "less than 1ft" is still a real forecast height.
  const monterey = heights.forecast.find((row) => row.site === 'Monterey');
  assert.strictEqual(monterey.maxM, 0.3);
  // Bullet lines and rows without a height must not become entries.
  assert.strictEqual(heights.forecast.some((row) => row.site === 'California'), false);
  assert.strictEqual(heights.forecast.some((row) => row.site === 'Seaside'), false);
  // Observed rows carry no clock time and keep the region: 1.1 ft → 0.34 m.
  const kushiro = heights.observed.find((row) => row.site === 'Kushiro (Japan)');
  assert.strictEqual(kushiro.maxM, 0.34);
  assert.strictEqual(heights.observedMaxM, 0.34);
  assert.strictEqual(heights.forecastMaxM, 1.46);
  // The headline number prefers what was actually measured over the forecast.
  assert.strictEqual(heights.maxM, 0.34);
  assert.strictEqual(heights.maxSite, 'Kushiro (Japan)');
  assert.strictEqual(heights.maxSource, 'observed');
});

test('an Information statement reports no wave heights at all', () => {
  const info = `WEAK53 PAAQ 101258

OBSERVATIONS OF TSUNAMI ACTIVITY
--------------------------------
 * No tsunami observations are available to report.

RECOMMENDED ACTIONS - UPDATED
-----------------------------
If you are in a tsunami warning area;
`;
  assert.strictEqual(parseWaveHeights(info), null);
  assert.strictEqual(parseWaveHeights(''), null);
  assert.strictEqual(parseWaveHeights(null), null);
  assert.strictEqual(toMetres('1.1', 'ft'), 0.34);
  assert.strictEqual(toMetres('2', 'M'), 2);
  assert.strictEqual(toMetres('nope', 'ft'), null);
});

test('GET /api/tsunami merges both centres and keeps going when one feed fails', async () => {
  const res = fakeRes();
  const bulletin = async () => ({ ok: true, text: async () => BULLETIN_TABLES });
  await withStubbedFetch(async (url) => {
    if (String(url).includes('PAAQCAP')) return { ok: true, text: async () => capWarning() };
    if (String(url).endsWith('.txt')) return bulletin();
    throw new Error('PTWC unreachable');                       // PTWC feed is down
  }, () => tsunami({ method: 'GET', url: '/api/tsunami' }, res));

  const body = JSON.parse(res.body);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(body.count, 1, 'the reachable centre still returns its message');
  assert.strictEqual(body.activeCount, 1);
  assert.strictEqual(body.messages[0].category, 'Warning');
  // A Tsunami Warning carries the bulletin wave heights.
  assert.strictEqual(body.messages[0].waveHeights.maxM, 0.34);
  assert.strictEqual(body.messages[0].waveHeights.maxSite, 'Kushiro (Japan)');
});

test('tsunami proxy reports a 502 only when every centre is unreachable', async () => {
  const res = fakeRes();
  await withStubbedFetch(async () => { throw new Error('NOAA down'); },
    () => tsunami({ method: 'GET', url: '/api/tsunami' }, res));
  assert.strictEqual(res.statusCode, 502);
  assert.deepStrictEqual(JSON.parse(res.body).messages, []);
});

test('tsunami proxy can return only the messages that are in force', async () => {
  const res = fakeRes();
  await withStubbedFetch(async () => ({ ok: true, text: async () => capWarning() }),
    () => tsunami({ method: 'GET', url: '/api/tsunami?active=1&heights=0' }, res));
  const body = JSON.parse(res.body);
  // Both centres answer with the same fixture alert here.
  assert.strictEqual(body.count, 2);
  assert.strictEqual(body.activeCount, 2);
  assert.strictEqual(body.messages.every((m) => m.active), true);
  // heights=0 skips the (extra) bulletin fetch.
  assert.strictEqual(body.messages.every((m) => m.waveHeights === null), true);
});

test('tsunami proxy rejects non-GET requests', async () => {
  const res = fakeRes();
  await tsunami({ method: 'POST', url: '/api/tsunami' }, res);
  assert.strictEqual(res.statusCode, 405);
});
test('tsunami alert categories map from the CAP <event> name', () => {
  assert.strictEqual(categoryFromEvent('Tsunami Warning'), 'Warning');
  assert.strictEqual(categoryFromEvent('TSUNAMI ADVISORY'), 'Advisory');
  assert.strictEqual(categoryFromEvent('Tsunami Watch'), 'Watch');
  assert.strictEqual(categoryFromEvent('Tsunami Information'), 'Information');
  assert.strictEqual(categoryFromEvent(undefined), 'Information');
  assert.strictEqual(isThreatCategory('Watch'), true);
  assert.strictEqual(isThreatCategory('Information'), false);
  assert.deepStrictEqual(parseLatLon('-60.481,-47.185 0.000'), { lat: -60.481, lng: -47.185 });
  assert.strictEqual(parseLatLon('not a position'), null);
});