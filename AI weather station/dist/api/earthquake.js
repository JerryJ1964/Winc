// build:earthquakes-20260916-1 — same-origin proxy for the USGS earthquake feed.
// The browser never talks to USGS directly (the raw feed is a 140 kB+ GeoJSON
// document); this Vercel serverless function fetches the keyless USGS
// "Magnitude 2.5+, past day" summary and returns a small, normalized list of
// events — magnitude, magnitude type, place, epicentre, depth, age and the USGS
// "could generate a tsunami" flag — which the globe plots as magnitude-scaled
// circles. Falls back gracefully to an empty list so the rest of the page keeps
// working when USGS is unreachable.

const USGS_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const DEFAULT_MIN_MAGNITUDE = 2.5;
const MAX_EVENTS = 200;

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toIso(value) {
  const ms = toNumber(value);
  if (ms == null) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Turn a USGS GeoJSON FeatureCollection into the flat shape the globe draws.
// Geometry coordinates are [longitude, latitude, depthKm] — note the order.
function normalizeEarthquakes(payload, minMagnitude = DEFAULT_MIN_MAGNITUDE) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const events = [];

  for (const feature of features) {
    const props = feature?.properties || {};
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const lng = toNumber(coords[0]);
    const lat = toNumber(coords[1]);
    const mag = toNumber(props.mag);
    if (lat == null || lng == null || mag == null) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    if (mag < minMagnitude) continue;

    events.push({
      id: feature.id || props.code || null,
      mag,
      magType: props.magType || null,
      place: props.place || props.title || 'unknown location',
      lat,
      lng,
      depthKm: toNumber(coords[2]),
      time: toIso(props.time),
      epochMs: toNumber(props.time),
      // USGS sets tsunami = 1 for events in the ocean that are being screened
      // for tsunamigenic potential — the globe flags these with a dashed ring.
      tsunami: props.tsunami === 1 || props.tsunami === true,
      alert: props.alert || null,
      mmi: toNumber(props.mmi),
      felt: toNumber(props.felt),
      sig: toNumber(props.sig),
      url: props.url || null,
      title: props.title || null
    });
  }

  // Strongest first — the panel ranks by magnitude and the globe draws big
  // circles before small ones so the eye lands on the important events.
  events.sort((a, b) => b.mag - a.mag || (b.epochMs || 0) - (a.epochMs || 0));
  return events.slice(0, MAX_EVENTS);
}

function parseMinMagnitude(raw) {
  const value = toNumber(Array.isArray(raw) ? raw[0] : raw);
  if (value == null) return DEFAULT_MIN_MAGNITUDE;
  return Math.min(9, Math.max(-1, value));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const response = await fetch(USGS_FEED, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AI-Weather-Station/1.1 (+https://github.com/JerryJ1964/Winc)'
      },
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(10000) : undefined
    });
    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`);
    const data = await response.json();

    const minMagnitude = parseMinMagnitude(
      new URL(req.url || '/', 'http://localhost').searchParams.get('minMag')
    );
    const events = normalizeEarthquakes(data, minMagnitude);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60'); // USGS republishes every minute
    res.statusCode = 200;
    res.end(JSON.stringify({
      source: USGS_FEED,
      feedTitle: data?.metadata?.title || 'USGS earthquakes',
      updated: new Date().toISOString(),
      minMagnitude,
      count: events.length,
      events
    }));
  } catch (error) {
    console.error('USGS earthquake proxy failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'USGS unreachable', count: 0, events: [] }));
  }
};

// Internal helpers (for tests / debugging): the feed normalizer.
module.exports._internal = { normalizeEarthquakes, parseMinMagnitude, USGS_FEED, DEFAULT_MIN_MAGNITUDE };
