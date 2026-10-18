// build:storms-20260901-1 — same-origin proxy for NOAA NHC active tropical storm names.
// The browser never talks to NHC directly (CORS + HTTPS constraints); this Vercel
// serverless function fetches https://www.nhc.noaa.gov/CurrentStorms.json and returns
// a small, normalized list of currently active named storms. Falls back gracefully to
// an empty list so the static 2026 reference lists still render.

const NHC_URL = 'https://www.nhc.noaa.gov/CurrentStorms.json';

// NHC is a government feed and the slowest of the lot: it gets a hard ceiling
// so a stalled call answers 502 (empty storm list, page still renders) long
// before the function can run past its maxDuration and surface a 504.
const NHC_TIMEOUT_MS = Number(process.env.NHC_TIMEOUT_MS || 8000);

function timeoutSignal(ms) {
  return typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(ms) : undefined;
}

// NHC reports coordinates both as strings ("30.8N" / "95.0W") and, when
// available, as plain numbers (latitudeNumeric / longitudeNumeric). The globe
// needs real numbers, so prefer the numeric fields and fall back to parsing
// the hemisphere string.
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function signedCoordinate(value, numericValue, negativeHemisphere) {
  const num = toNumber(numericValue);
  if (num != null) return num;
  const str = String(value == null ? '' : value).trim();
  const match = str.match(/^([-+]?\d+(?:\.\d+)?)\s*([NSEW]?)$/i);
  if (!match) return null;
  let n = Math.abs(Number(match[1]));
  const dir = (match[2] || '').toUpperCase();
  if ((dir === 'S' && negativeHemisphere === 'S') || (dir === 'W' && negativeHemisphere === 'W')) n = -n;
  else if (!dir && str.charCodeAt(0) === 45) n = -n; // bare "-30.8"
  return n;
}

function normalizeStorms(payload) {
  const list = Array.isArray(payload?.activeStorms) ? payload.activeStorms : [];
  return list
    .filter((s) => s && typeof s.name === 'string' && s.name)
    .map((s) => ({
      id: s.id || null,
      name: s.name,
      classification: s.classification || null,
      intensityKnots: Number.isFinite(Number(s.intensity)) ? Number(s.intensity) : null,
      pressure: Number.isFinite(Number(s.pressure)) ? Number(s.pressure) : null,
      latitude: s.latitude || null,
      longitude: s.longitude || null,
      lat: signedCoordinate(s.latitude, s.latitudeNumeric, 'S'),
      lng: signedCoordinate(s.longitude, s.longitudeNumeric, 'W'),
      lastUpdate: s.lastUpdate || null
    }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const response = await fetch(NHC_URL, {
      signal: timeoutSignal(NHC_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AI-Weather-Station/1.1 (+https://github.com/JerryJ1964/Winc)'
      }
    });
    if (!response.ok) throw new Error(`NHC HTTP ${response.status}`);
    const data = await response.json();
    const activeStorms = normalizeStorms(data);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 min client cache — page re-polls every 20 s
    res.statusCode = 200;
    res.end(JSON.stringify({
      source: NHC_URL,
      updated: new Date().toISOString(),
      activeStorms
    }));
  } catch (error) {
    console.error('NHC proxy failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'NHC unreachable', activeStorms: [] }));
  }
};
