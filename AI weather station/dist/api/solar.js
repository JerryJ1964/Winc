// build:solar-tab-20261005-1 — ☀️ Solar tab data (radiation + UV + sunshine).
// Free, keyless Open-Meteo forecast call, cached server-side 15 minutes per
// ~5 km area. Same handler works on Vercel (/api/solar) and locally
// (server-local.js). Falls back to forecast14-independent behaviour: a dead
// upstream returns HTTP 200 with an honest unavailable payload, never a 504.
const SOLAR_FEED = 'https://api.open-meteo.com/v1/forecast';
const SOLAR_TTL_MS = 15 * 60 * 1000;
const SOLAR_MAX = 64;
const cache = new Map();

function num(v, decimals) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const f = Math.pow(10, decimals || 0);
  return Math.round(v * f) / f;
}

function uvLevelFor(uvIndex) {
  if (uvIndex == null) return { level: 'unknown', label: 'Unknown', advice: 'UV data is temporarily unavailable.' };
  if (uvIndex < 1) return { level: 'low', label: 'Low', advice: 'No protection needed.' };
  if (uvIndex < 3) return { level: 'low', label: 'Low', advice: 'No protection needed for most people.' };
  if (uvIndex < 6) return { level: 'moderate', label: 'Moderate', advice: 'Seek shade around midday; wear sunglasses.' };
  if (uvIndex < 8) return { level: 'high', label: 'High', advice: 'Seek shade, wear sunscreen SPF 30+, a hat and sunglasses.' };
  if (uvIndex < 11) return { level: 'very-high', label: 'Very high', advice: 'Avoid midday sun — sunscreen SPF 30+, hat, sunglasses and shade.' };
  return { level: 'extreme', label: 'Extreme', advice: 'Stay indoors around midday — unprotected skin burns in minutes.' };
}

function buildUrl(lat, lon) {
  return `${SOLAR_FEED}?latitude=${lat}&longitude=${lon}` +
    `&current=shortwave_radiation,direct_radiation,diffuse_radiation,uv_index,uv_index_clear_sky,is_day` +
    `&hourly=shortwave_radiation,uv_index,is_day,temperature_2m` +
    `&daily=sunrise,sunset,sunshine_duration,daylight_duration&timezone=auto&forecast_days=2`;
}

function pickHourly(hourly, count) {
  if (!hourly || !Array.isArray(hourly.time)) return [];
  const nowMs = Date.now();
  let start = 0;
  for (let i = 0; i < hourly.time.length; i += 1) {
    const t = Date.parse(hourly.time[i]);
    if (Number.isFinite(t) && t <= nowMs) start = i;
    else if (Number.isFinite(t)) break;
  }
  const out = [];
  for (let i = start; i < hourly.time.length && out.length < (count || 12); i += 1) {
    out.push({
      time: hourly.time[i] || '',
      shortwaveWm2: num(hourly.shortwave_radiation?.[i], 0),
      uvIndex: num(hourly.uv_index?.[i], 1),
      tempC: num(hourly.temperature_2m?.[i], 1),
      isDay: (hourly.is_day?.[i] ?? 1) === 1
    });
  }
  return out;
}

async function fetchJson(url, ms) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), ms || 12000) : null;
  try {
    const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  const url = new URL(req.url || '/', 'http://localhost');
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Provide ?lat= and ?lon= coordinates.', available: false }));
    return;
  }
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.t < SOLAR_TTL_MS) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=900');
    res.end(JSON.stringify({ ...hit.data, cached: true }));
    return;
  }
  try {
    const payload = await fetchJson(buildUrl(lat, lon), 12000);
    const current = payload?.current ?? {};
    const daily = payload?.daily ?? {};
    const uvIndex = num(current.uv_index, 1);
    const uv = uvLevelFor(uvIndex);
    const body = {
      source: SOLAR_FEED,
      feedTitle: 'Open-Meteo forecast — modelled solar + UV',
      updated: new Date().toISOString(),
      available: true,
      latitude: num(lat, 2),
      longitude: num(lon, 2),
      shortwaveWm2: num(current.shortwave_radiation, 0),
      directWm2: num(current.direct_radiation, 0),
      diffuseWm2: num(current.diffuse_radiation, 0),
      uvIndex,
      uvClearSky: num(current.uv_index_clear_sky, 1),
      uvLevel: uv.level,
      uvLabel: uv.label,
      uvAdvice: uv.advice,
      sunshineSeconds: num(daily.sunshine_duration?.[0], 0),
      daylightSeconds: num(daily.daylight_duration?.[0], 0),
      sunrise: daily.sunrise?.[0] || null,
      sunset: daily.sunset?.[0] || null,
      hourly: pickHourly(payload?.hourly, 12),
      isDay: (current.is_day ?? 1) === 1,
      cached: false
    };
    cache.set(key, { t: now, data: body });
    if (cache.size > SOLAR_MAX) cache.delete(cache.keys().next().value);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=900');
    res.end(JSON.stringify(body));
  } catch (error) {
    console.error('Solar feed failed:', error);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      source: SOLAR_FEED,
      updated: new Date().toISOString(),
      available: false,
      latitude: num(lat, 2),
      longitude: num(lon, 2),
      shortwaveWm2: null,
      directWm2: null,
      diffuseWm2: null,
      uvIndex: null,
      uvClearSky: null,
      uvLevel: 'unknown',
      uvLabel: 'Unknown',
      uvAdvice: 'Solar data is temporarily unavailable.',
      sunshineSeconds: null,
      daylightSeconds: null,
      sunrise: null,
      sunset: null,
      hourly: [],
      isDay: null,
      cached: false
    }));
  }
};

module.exports._internal = { uvLevelFor, buildUrl, pickHourly, SOLAR_TTL_MS };
