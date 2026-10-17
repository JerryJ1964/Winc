// build:wildfires-20260924-1 — same-origin proxy for NASA's active wildfire feed.
// The browser never talks to EONET directly. This Vercel function normalizes the
// keyless open "wildfires" events into small globe markers (coordinates, report
// time, acreage when supplied and a safe source link). Polygon perimeters are
// reduced to a representative centre point so every incident remains clickable.
const EONET_FEED = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=500';
const MAX_EVENTS = 250;

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toIso(value) {
  if (value == null) return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function collectCoordinatePairs(value, depth, pairs) {
  if (!Array.isArray(value) || depth > 8) return;
  const lng = toNumber(value[0]);
  const lat = toNumber(value[1]);
  if (lng != null && lat != null && !Array.isArray(value[0]) && !Array.isArray(value[1])) {
    pairs.push({ lng, lat });
    return;
  }
  for (const child of value) collectCoordinatePairs(child, depth + 1, pairs);
}

// EONET appends dated geometry observations. Prefer the freshest observation;
// use the exact point for Point geometry and the centre of a polygon's bounds
// for a perimeter, rather than accidentally marking its first corner.
function latestGeometryPoint(geometry) {
  const entries = Array.isArray(geometry) ? geometry : [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry) continue;
    const pairs = [];
    collectCoordinatePairs(entry.coordinates, 0, pairs);
    if (!pairs.length) continue;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const pair of pairs) {
      if (pair.lng < minLng) minLng = pair.lng;
      if (pair.lng > maxLng) maxLng = pair.lng;
      if (pair.lat < minLat) minLat = pair.lat;
      if (pair.lat > maxLat) maxLat = pair.lat;
    }
    const lng = (minLng + maxLng) / 2;
    const lat = (minLat + maxLat) / 2;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    return {
      lat,
      lng,
      date: entry.date || null,
      magnitudeValue: toNumber(entry.magnitudeValue),
      magnitudeUnit: typeof entry.magnitudeUnit === 'string' ? entry.magnitudeUnit : null
    };
  }
  return null;
}

function sourceUrlFor(event) {
  const source = Array.isArray(event?.sources) ? event.sources.find((item) => /^https:\/\//i.test(item?.url || '')) : null;
  if (source) return source.url;
  if (event && typeof event.link === 'string' && /^https:\/\//i.test(event.link)) return event.link;
  return 'https://eonet.gsfc.nasa.gov/categories/wildfires';
}

function normalizeFires(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const fires = [];
  for (const event of events) {
    const point = latestGeometryPoint(event?.geometry);
    if (!point) continue;
    const name = String(event?.title || '').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const observedAt = toIso(point.date);
    const magnitudeValue = point.magnitudeValue;
    const magnitudeUnit = point.magnitudeUnit;
    const isAcres = typeof magnitudeUnit === 'string' && /acre/i.test(magnitudeUnit);
    fires.push({
      id: event?.id || null,
      name,
      description: typeof event?.description === 'string' ? event.description.trim() || null : null,
      lat: point.lat,
      lng: point.lng,
      observedAt,
      epochMs: observedAt ? Date.parse(observedAt) : null,
      magnitudeValue,
      magnitudeUnit,
      acres: isAcres ? magnitudeValue : null,
      prescribed: /^prescribed\b/i.test(name),
      sourceUrl: sourceUrlFor(event),
      sources: Array.isArray(event?.sources) ? event.sources.map((source) => source?.id).filter(Boolean) : []
    });
  }
  fires.sort((a, b) => (b.epochMs || 0) - (a.epochMs || 0));
  return fires.slice(0, MAX_EVENTS);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed', count: 0, events: [] }));
    return;
  }
  try {
    const response = await fetch(EONET_FEED, {
      headers: { Accept: 'application/json', 'User-Agent': 'AI-Weather-Station/1.1 (+https://github.com/JerryJ1964/Winc)' },
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(10000) : undefined
    });
    if (!response.ok) throw new Error(`EONET HTTP ${response.status}`);
    const data = await response.json();
    const events = normalizeFires(data);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.statusCode = 200;
    res.end(JSON.stringify({ source: EONET_FEED, feedTitle: data?.title || 'NASA EONET wildfire events', updated: new Date().toISOString(), count: events.length, events }));
  } catch (error) {
    console.error('EONET wildfire proxy failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'EONET wildfire feed unreachable', count: 0, events: [] }));
  }
};

module.exports._internal = { normalizeFires, latestGeometryPoint, collectCoordinatePairs, EONET_FEED, MAX_EVENTS };
