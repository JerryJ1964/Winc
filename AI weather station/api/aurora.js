// build:aurora-globe-20261007-1 — 🌌 true-colour aurora oval on the globe.
// Free, keyless NOAA SWPC Ovation forecast, cached server-side 30 minutes.
// Same handler works on Vercel (/api/aurora) and locally (server-local.js).
// A dead upstream returns HTTP 200 with an honest unavailable payload, never a 504.
const AURORA_FEED = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
const AURORA_TTL_MS = 30 * 60 * 1000;

let cache = { t: 0, data: null };

function num(v, decimals) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const f = Math.pow(10, decimals || 0);
  return Math.round(v * f) / f;
}

// Ovation payload: { "Observation Time", "Forecast Time",
// "Data Format": "[Longitude, Latitude, Aurora]", coordinates: [[lng,lat,v],...] }
// v is 0..~100 (modelled auroral power proxy). Keep only lit cells.
function normalizeAurora(payload) {
  const coords = payload && Array.isArray(payload.coordinates) ? payload.coordinates : [];
  const cells = [];
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 3) continue;
    const lng = Number(c[0]);
    const lat = Number(c[1]);
    const v = Number(c[2]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(v)) continue;
    if (v <= 0) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    cells.push({ lat: num(lat, 0), lng: num(lng, 0), intensity: num(Math.min(100, v), 0) });
  }
  // Heaviest first so the brightest band paints on top; cap for payload size.
  cells.sort((a, b) => b.intensity - a.intensity);
  return cells.slice(0, 4000);
}

function kpLevelFor(maxIntensity) {
  if (maxIntensity == null) return { level: 'unknown', label: 'Unknown' };
  if (maxIntensity < 10) return { level: 'quiet', label: 'Quiet' };
  if (maxIntensity < 25) return { level: 'active', label: 'Active' };
  if (maxIntensity < 50) return { level: 'storm', label: 'Geomagnetic storm' };
  return { level: 'severe', label: 'Severe storm' };
}

async function fetchJson(url, ms) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), ms || 15000) : null;
  try {
    const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed', available: false }));
    return;
  }
  const now = Date.now();
  if (cache.data && now - cache.t < AURORA_TTL_MS) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=900');
    res.end(JSON.stringify({ ...cache.data, cached: true }));
    return;
  }
  try {
    const payload = await fetchJson(AURORA_FEED, 15000);
    const cells = normalizeAurora(payload);
    const maxI = cells.length ? cells[0].intensity : null;
    const kp = kpLevelFor(maxI);
    const body = {
      source: AURORA_FEED,
      feedTitle: 'NOAA SWPC Ovation — modelled aurora oval',
      observationTime: payload['Observation Time'] || null,
      forecastTime: payload['Forecast Time'] || null,
      updated: new Date().toISOString(),
      available: true,
      kpLevel: kp.level,
      kpLabel: kp.label,
      maxIntensity: maxI,
      cells,
      cached: false
    };
    cache = { t: now, data: body };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=900');
    res.end(JSON.stringify(body));
  } catch (error) {
    console.error('Aurora feed failed:', error);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      source: AURORA_FEED,
      updated: new Date().toISOString(),
      available: false,
      kpLevel: 'unknown',
      kpLabel: 'Unknown',
      maxIntensity: null,
      cells: [],
      cached: false
    }));
  }
};

module.exports._internal = { normalizeAurora, kpLevelFor, AURORA_FEED, AURORA_TTL_MS };
