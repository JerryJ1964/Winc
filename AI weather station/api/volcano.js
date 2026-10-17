// build:volcanoes-20260923-1 — same-origin proxy for the NASA EONET volcano feed.
// The browser never talks to NASA directly: this Vercel serverless function
// fetches the keyless EONET "open volcano events" list (the eruptions and unrest
// the Smithsonian Global Volcanism Program is still tracking) and returns a
// small, normalized list — volcano name, area, summit coordinates and the date
// of the most recent report — which the globe draws as a cone erupting lava.
// Falls back gracefully to an empty list so the rest of the page keeps working
// when EONET is unreachable.
//
// EONET docs: https://eonet.gsfc.nasa.gov/docs/v3

const EONET_FEED = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes&status=open';
const MAX_EVENTS = 200;

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

// EONET calls every event "<Volcano name> Volcano, <area>", e.g.
// "Kilauea Volcano, Hawaii" or "Nevados del Chillan Volcano, Chile". Some
// countries arrive with a non-breaking space, and a few titles carry no area.
function splitVolcanoTitle(rawTitle) {
  const title = String(rawTitle == null ? '' : rawTitle)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) return { name: '', country: null };
  const match = title.match(/^(.*?)\s+volcano\b\s*(?:[,·—–-]\s*(.+))?$/i);
  if (!match) return { name: title, country: null };
  return {
    name: (match[1] || title).trim(),
    country: match[2] ? match[2].trim() : null
  };
}

// EONET geometry entries look like
//   { type: 'Point', coordinates: [-155.287, 19.421], date: '2024-12-23T00:00:00Z' }
// Coordinates are [longitude, latitude] — note the order, like GeoJSON.
// A few events only carry an ash-plume ring, so walk nested arrays for the
// first usable [lng, lat] pair in that case.
function firstCoordinatePair(coords, depth = 0) {
  if (!Array.isArray(coords) || depth > 4) return null;
  const lng = toNumber(coords[0]);
  const lat = toNumber(coords[1]);
  if (lng != null && lat != null && !Array.isArray(coords[0]) && !Array.isArray(coords[1])) {
    return { lng, lat };
  }
  for (const entry of coords) {
    const pair = firstCoordinatePair(entry, depth + 1);
    if (pair) return pair;
  }
  return null;
}

// The most recent geometry entry with usable coordinates: EONET appends one
// entry per report, so the last one is the freshest activity.
function latestGeometryPoint(geometry) {
  const entries = Array.isArray(geometry) ? geometry : [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry) continue;
    const pair = firstCoordinatePair(entry.coordinates);
    if (!pair) continue;
    if (pair.lat < -90 || pair.lat > 90 || pair.lng < -180 || pair.lng > 180) continue;
    return { lat: pair.lat, lng: pair.lng, date: entry.date || null };
  }
  return null;
}

// The Smithsonian GVP volcano number, when EONET points at a GVP page:
// https://volcano.si.edu/volcano.cfm?vn=357070  ->  '357070'
function smithsonianVolcanoNumber(sources) {
  for (const source of Array.isArray(sources) ? sources : []) {
    const match = String(source && source.url ? source.url : '').match(/volcano\.cfm\?vn=(\d+)/i);
    if (match) return match[1];
  }
  return null;
}

function sourceUrlFor(sources, vnum) {
  for (const source of Array.isArray(sources) ? sources : []) {
    const url = source && typeof source.url === 'string' ? source.url : null;
    if (url && /volcano\.si\.edu/i.test(url)) return url;
  }
  if (vnum) return 'https://volcano.si.edu/volcano.cfm?vn=' + vnum;
  return 'https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes';
}

// Turn the EONET FeatureCollection into the flat shape the globe draws.
function normalizeVolcanoes(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const volcanoes = [];

  for (const event of events) {
    const point = latestGeometryPoint(event?.geometry);
    if (!point) continue;                                  // no usable summit position

    const { name, country } = splitVolcanoTitle(event?.title);
    if (!name) continue;

    const sources = Array.isArray(event?.sources) ? event.sources : [];
    const vnum = smithsonianVolcanoNumber(sources);
    const activityDate = toIso(point.date);

    volcanoes.push({
      id: event && event.id ? event.id : null,
      name,
      country,
      title: String(event && event.title ? event.title : name).replace(/\u00a0/g, ' ').trim(),
      lat: point.lat,
      lng: point.lng,
      activityDate,
      epochMs: activityDate ? Date.parse(activityDate) : null,
      vnum,
      sourceUrl: sourceUrlFor(sources, vnum),
      // Which agencies reported this event (EONET merges several feeds).
      sources: sources.map((s) => s && s.id).filter(Boolean)
    });
  }

  // Freshest activity first — the panel lists them in that order and the globe
  // erupts the newest ones hardest.
  volcanoes.sort((a, b) => (b.epochMs || 0) - (a.epochMs || 0));
  return volcanoes.slice(0, MAX_EVENTS);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const response = await fetch(EONET_FEED, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AI-Weather-Station/1.1 (+https://github.com/JerryJ1964/Winc)'
      },
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(10000) : undefined
    });
    if (!response.ok) throw new Error(`EONET HTTP ${response.status}`);
    const data = await response.json();

    const events = normalizeVolcanoes(data);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // EONET republishes daily
    res.statusCode = 200;
    res.end(JSON.stringify({
      source: EONET_FEED,
      feedTitle: data?.title || 'NASA EONET volcano events',
      updated: new Date().toISOString(),
      count: events.length,
      events
    }));
  } catch (error) {
    console.error('EONET volcano proxy failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'EONET unreachable', count: 0, events: [] }));
  }
};

// Internal helpers (for tests / debugging): the feed normalizer.
module.exports._internal = {
  normalizeVolcanoes,
  splitVolcanoTitle,
  latestGeometryPoint,
  smithsonianVolcanoNumber,
  EONET_FEED,
  MAX_EVENTS
};
