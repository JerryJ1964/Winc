// build:mudslide-avalanche-globe-20260930-1 — 🏔️ snow-avalanche globe layer,
// built on free, keyless feeds only (no API key, no credit card, nothing that
// can ever be billed).
//
// This same-origin proxy returns two kinds of snow-avalanche information:
//   1. OFFICIAL forecast zones — the keyless avalanche.org map layer published
//      by the US avalanche centres (Avalanche.org / American Avalanche
//      Association): every zone's current danger rating (1–5, "no rating" when
//      a centre is off-season) and any avalanche warning in force. Coordinates
//      are the centre of the zone's largest polygon.
//   2. MODELLED conditions — a snow-load scan of the world's mountain ranges
//      through the keyless Open-Meteo model: new snow in the last 24 h / 72 h,
//      the strongest gust, the warmest day temperature and the modelled snow
//      depth. This is a documented snow-load/thaw proxy, NOT an official
//      warning, and the browser labels it as modelled everywhere it is shown.
//
// avalanche.org API: https://api.avalanche.org/v2/public/products/map-layer
// Open-Meteo docs: https://open-meteo.com/en/docs
const AVALANCHE_ORG_FEED = 'https://api.avalanche.org/v2/public/products/map-layer';
const OPEN_METEO_FEED = 'https://api.open-meteo.com/v1/forecast';
const MAX_ZONES = 300;
const MAX_RISK_POINTS = 160;
const MIN_RISK_SCORE = 15;   // below this nothing is worth drawing

// Mountain ranges sampled by the keyless Open-Meteo model. A hand-picked list
// (not a grid) so every marker sits on real avalanche terrain with a name the
// panel can print. [name, lat, lng]
const AVALANCHE_MASSIFS = [
  ['Mont Blanc · Alps (France)', 45.83, 6.86],
  ['Zermatt · Alps (Switzerland)', 46.02, 7.75],
  ['Davos · Alps (Switzerland)', 46.8, 9.84],
  ['Innsbruck · Alps (Austria)', 47.25, 11.4],
  ['St. Anton · Alps (Austria)', 47.13, 10.27],
  ['Cortina d’Ampezzo · Dolomites', 46.54, 12.13],
  ['Garmisch · Alps (Germany)', 47.49, 11.1],
  ['Julian Alps (Slovenia)', 46.4, 13.8],
  ['Gavarnie · Pyrenees (France)', 42.75, 0.0],
  ['Grandvalira · Pyrenees (Andorra)', 42.55, 1.55],
  ['Sierra Nevada (Spain)', 37.05, -3.3],
  ['Picos de Europa (Spain)', 43.15, -4.85],
  ['Jotunheimen (Norway)', 61.65, 8.55],
  ['Lyngen Alps (Norway)', 69.6, 20.2],
  ['Romsdalen (Norway)', 62.45, 7.9],
  ['Kebnekaise (Sweden)', 67.9, 18.55],
  ['Khibiny (Russia)', 67.6, 33.7],
  ['Svalbard (Norway)', 78.2, 15.6],
  ['Cairngorms (Scotland)', 57.05, -3.7],
  ['Ben Nevis (Scotland)', 56.8, -5.0],
  ['High Tatra (Slovakia)', 49.2, 20.05],
  ['Făgăraș (Romania)', 45.55, 24.6],
  ['Retezat (Romania)', 45.35, 22.85],
  ['Rila (Bulgaria)', 42.15, 23.55],
  ['Durmitor (Montenegro)', 43.1, 19.05],
  ['Rhodope (Bulgaria)', 41.75, 24.3],
  ['Kaçkar (Türkiye)', 40.85, 41.25],
  ['Erciyes (Türkiye)', 38.55, 35.45],
  ['Alborz · Dizin (Iran)', 36.05, 51.4],
  ['Zagros (Iran)', 33.05, 49.8],
  ['Elbrus (Russia)', 43.35, 42.45],
  ['Kazbegi (Georgia)', 42.7, 44.5],
  ['Aragats (Armenia)', 40.5, 44.2],
  ['Tien Shan · Almaty (Kazakhstan)', 43.1, 77.15],
  ['Tien Shan · Karakol (Kyrgyzstan)', 42.45, 78.35],
  ['Pamir (Tajikistan)', 37.5, 71.55],
  ['Hindu Kush · Kabul (Afghanistan)', 34.9, 68.9],
  ['Karakoram (Pakistan)', 35.85, 74.3],
  ['Annapurna (Nepal)', 28.55, 84.05],
  ['Khumbu · Everest (Nepal)', 27.85, 86.75],
  ['Manali (India)', 32.35, 77.2],
  ['Jigme Dorji (Bhutan)', 27.5, 89.6],
  ['Nyenchen Tanglha (Tibet)', 30.35, 90.6],
  ['Belukha · Altai (Russia)', 49.8, 86.6],
  ['Sayan Mountains (Russia)', 52.2, 93.2],
  ['Altai Tavan Bogd (Mongolia)', 48.3, 89.6],
  ['Kamchatka (Russia)', 53.25, 158.85],
  ['Hakuba · Japan Alps', 36.7, 137.8],
  ['Zao (Japan)', 38.15, 140.4],
  ['Furano (Japan)', 43.35, 142.35],
  ['Niseko (Japan)', 42.85, 140.7],
  ['Taebaek (South Korea)', 37.15, 128.95],
  ['Changbai (China)', 42.0, 128.05],
  ['Aoraki · Southern Alps (NZ)', -43.6, 170.15],
  ['The Remarkables (NZ)', -45.05, 168.8],
  ['Portillo · Andes (Chile)', -32.85, -70.1],
  ['Bariloche · Patagonia', -41.15, -71.45],
  ['Cordillera Blanca (Peru)', -9.53, -77.53],
  ['Huayna Potosí (Bolivia)', -16.3, -68.15],
  ['Chimborazo (Ecuador)', -1.47, -78.82],
  ['Nevado del Ruiz (Colombia)', 4.89, -75.32],
  ['Chugach · Alaska (USA)', 61.0, -149.1],
  ['Brooks Range (USA)', 68.15, -149.5],
  ['Cascades · Mt Baker (USA)', 48.78, -121.81],
  ['Cascades · Mt Hood (USA)', 45.35, -121.7],
  ['Sierra Nevada · Mammoth (USA)', 37.63, -119.03],
  ['Rockies · Colorado (USA)', 39.48, -106.07],
  ['Rockies · Wyoming (USA)', 43.35, -110.85],
  ['Rockies · Montana (USA)', 45.3, -111.4],
  ['Wasatch (USA)', 40.6, -111.6],
  ['San Juan (USA)', 37.85, -107.7],
  ['Sangre de Cristo (USA)', 36.1, -105.45],
  ['White Mountains (USA)', 44.27, -71.3],
  ['Adirondacks (USA)', 44.15, -73.9],
  ['Selkirk (Canada)', 51.0, -117.5],
  ['Coast Mountains (Canada)', 50.1, -122.9],
  ['Rockies · Banff (Canada)', 51.18, -115.57],
  ['Sierra Madre (Mexico)', 28.2, -106.9],
  ['Iztaccíhuatl (Mexico)', 19.15, -98.65],
  ['Atlas · Oukaïmeden (Morocco)', 31.2, -7.85],
  ['Djurdjura (Algeria)', 36.45, 4.15],
  ['Mount Lebanon', 34.05, 35.9],
  ['Ras Dashen (Ethiopia)', 13.24, 38.37],
  ['Mount Kenya', -0.15, 37.3],
  ['Kilimanjaro (Tanzania)', -3.07, 37.35],
  ['Rwenzori (Uganda)', 0.38, 29.87],
  ['Trollaskagi (Iceland)', 65.9, -19.0],
  ['Nuuk fjord (Greenland)', 64.2, -51.6]
];

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toIso(value) {
  if (value == null) return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanText(value) {
  const text = String(value == null ? '' : value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

function collectRings(value, depth, rings) {
  if (!Array.isArray(value) || depth > 8) return;
  if (Array.isArray(value[0]) && Array.isArray(value[0][0])) {
    for (const ring of value) collectRings(ring, depth + 1, rings);
    return;
  }
  const ring = [];
  for (const point of value) {
    const lng = toNumber(point && point[0]);
    const lat = toNumber(point && point[1]);
    if (lng != null && lat != null) ring.push({ lng, lat });
  }
  if (ring.length) rings.push(ring);
}

// The centre of the LARGEST ring of the zone outline — a forecast zone can
// cover several disconnected polygons, and the biggest one is the best single
// place to drop the marker.
function largestRingCentre(geometry) {
  const rings = [];
  collectRings(geometry && geometry.coordinates, 0, rings);
  let best = null;
  let bestArea = -1;
  for (const ring of rings) {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const point of ring) {
      if (point.lng < minLng) minLng = point.lng;
      if (point.lng > maxLng) maxLng = point.lng;
      if (point.lat < minLat) minLat = point.lat;
      if (point.lat > maxLat) maxLat = point.lat;
    }
    const area = (maxLng - minLng) * (maxLat - minLat);
    if (area > bestArea) {
      bestArea = area;
      best = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
    }
  }
  if (!best || best.lat < -90 || best.lat > 90 || best.lng < -180 || best.lng > 180) return null;
  return best;
}

// avalanche.org nests any warning in force under properties.warning.product.
// The product's exact key set is not documented, so the known candidates are
// read defensively and the raw flag is always kept.
function normalizeWarning(warning) {
  const product = warning && typeof warning === 'object' ? warning.product : null;
  if (!product) return null;
  const pick = (...keys) => {
    for (const key of keys) {
      const value = product[key];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return null;
  };
  const url = pick('link', 'url', 'permalink', 'website');
  return {
    id: pick('id'),
    danger: pick('danger', 'dangerLevel', 'danger_level', 'level'),
    startsAt: toIso(pick('starts_at', 'startsAt', 'start')),
    endsAt: toIso(pick('ends_at', 'endsAt', 'end')),
    link: url && /^https:\/\//i.test(url) ? url : null
  };
}

function normalizeZones(payload) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const zones = [];
  for (const feature of features) {
    const properties = feature?.properties || {};
    const centre = largestRingCentre(feature?.geometry);
    if (!centre) continue;
    const level = toNumber(properties.danger_level);
    const dangerLevel = level == null ? -1 : level;
    zones.push({
      id: feature?.id ?? null,
      kind: 'official',
      name: cleanText(properties.name) || cleanText(properties.center) || 'Avalanche forecast zone',
      centre: cleanText(properties.center),
      centreId: cleanText(properties.center_id),
      state: cleanText(properties.state),
      dangerLevel,
      danger: cleanText(properties.danger),
      rated: dangerLevel >= 1,               // -1 = the centre publishes no rating
      offSeason: properties.off_season === true,
      travelAdvice: cleanText(properties.travel_advice),
      startsAt: toIso(properties.start_date),
      endsAt: toIso(properties.end_date),
      link: cleanText(properties.link),
      lat: centre.lat,
      lng: centre.lng,
      warning: normalizeWarning(properties.warning)
    });
  }
  // Warnings in force first, then the highest danger, then alphabetically.
  zones.sort((a, b) => {
    if (!!b.warning !== !!a.warning) return b.warning ? 1 : -1;
    if (b.dangerLevel !== a.dangerLevel) return b.dangerLevel - a.dangerLevel;
    return a.name.localeCompare(b.name);
  });
  return zones.slice(0, MAX_ZONES);
}

// ===== modelled snow-load risk on the world's mountain ranges =====
// One batched Open-Meteo request covers every massif in AVALANCHE_MASSIFS. The
// score is a documented snow-load / thaw proxy:
//
//   • new snow 72 h   0 → 45 points   (starts loading slopes at 10 cm, caps at 60 cm)
//   • strongest gust  0 → 30 points   (wind loading, starts at 40 km/h, caps at 100 km/h)
//   • deep snowpack   0 → 10 points   (0.25 m or more of modelled snow depth)
//   • thaw / wet snow 0 → 15 points   (warmest day above 0 °C with snow on the ground)
//
// Ranges with no snow on the ground are left out entirely, so the layer follows
// the real snow line around the planet instead of drawing mountains in summer.
function buildMassifUrl(massifs) {
  const latitudes = massifs.map((entry) => entry[1]).join(',');
  const longitudes = massifs.map((entry) => entry[2]).join(',');
  return OPEN_METEO_FEED + '?latitude=' + encodeURIComponent(latitudes) +
    '&longitude=' + encodeURIComponent(longitudes) +
    '&daily=snowfall_sum,wind_gusts_10m_max,temperature_2m_max,snow_depth_max,precipitation_sum' +
    '&past_days=3&forecast_days=1&timezone=UTC';
}

function avalancheLevelFor(score) {
  if (score >= 60) return { level: 3, label: 'high' };
  if (score >= 40) return { level: 2, label: 'considerable' };
  if (score >= 20) return { level: 1, label: 'moderate' };
  return { level: 0, label: 'low' };
}

function normalizeMassifRisk(payload) {
  const stations = Array.isArray(payload) ? payload : (payload ? [payload] : []);
  const points = [];
  for (let i = 0; i < stations.length; i += 1) {
    const massif = AVALANCHE_MASSIFS[i];
    const station = stations[i];
    if (!massif || !station || !station.daily) continue;
    const daily = station.daily;

    const snow = daily.snowfall_sum || [];
    const snow24 = toNumber(snow[3]);
    const snowBefore = toNumber(snow[2]);
    const snowOldest = toNumber(snow[1]);
    if (snow24 == null || snowBefore == null || snowOldest == null) continue;
    const newSnow72 = snow24 + snowBefore + snowOldest;

    const gust = toNumber((daily.wind_gusts_10m_max || [])[3]);
    const maxTemp = toNumber((daily.temperature_2m_max || [])[3]);
    const depthRaw = toNumber((daily.snow_depth_max || [])[3]);
    const depth = depthRaw == null ? 0 : depthRaw;

    // No snowpack and no new snow: no slab can release, so nothing to draw.
    if (depth < 0.05 && newSnow72 < 15) continue;

    let score = 0;
    score += 45 * clamp01((newSnow72 - 10) / 50);
    score += 30 * clamp01(((gust == null ? 0 : gust) - 40) / 60);
    if (depth >= 0.25) score += 10;
    if (depth >= 0.15 && maxTemp != null) score += 15 * clamp01((maxTemp - 0) / 6);
    score = Math.round(clamp01(score / 100) * 100);
    if (score < MIN_RISK_SCORE) continue;

    const { level, label } = avalancheLevelFor(score);
    points.push({
      id: 'massif:' + i,
      kind: 'modelled',
      name: massif[0],
      lat: toNumber(station.latitude) ?? massif[1],
      lng: toNumber(station.longitude) ?? massif[2],
      elevationM: toNumber(station.elevation),
      score,
      level,
      levelLabel: label,
      newSnow24Cm: Math.round(snow24 * 10) / 10,
      newSnow72Cm: Math.round(newSnow72 * 10) / 10,
      windGustKmh: gust == null ? null : Math.round(gust * 10) / 10,
      maxTempC: maxTemp == null ? null : Math.round(maxTemp * 10) / 10,
      snowDepthM: depthRaw == null ? null : Math.round(depthRaw * 100) / 100,
      sourceUrl: 'https://open-meteo.com/'
    });
  }
  points.sort((a, b) => b.score - a.score);
  return points.slice(0, MAX_RISK_POINTS);
}

async function fetchJson(url, timeoutMs) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AI-Weather-Station/1.1 (+https://github.com/JerryJ1964/Winc)'
    },
    signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed', count: 0, zones: [], risk: [] }));
    return;
  }

  // Independent halves: if avalanche.org is down the modelled snow-load scan
  // still works, and vice versa. Nothing is invented to fill a gap.
  const [zonesResult, riskResult] = await Promise.allSettled([
    fetchJson(AVALANCHE_ORG_FEED, 12000),
    fetchJson(buildMassifUrl(AVALANCHE_MASSIFS), 12000)
  ]);

  const zones = zonesResult.status === 'fulfilled' ? normalizeZones(zonesResult.value) : [];
  const risk = riskResult.status === 'fulfilled' ? normalizeMassifRisk(riskResult.value) : [];
  if (zonesResult.status === 'rejected') console.error('avalanche.org proxy failed:', zonesResult.reason);
  if (riskResult.status === 'rejected') console.error('Open-Meteo massif scan failed:', riskResult.reason);

  const rated = zones.filter((zone) => zone.rated).length;
  const warnings = zones.filter((zone) => zone.warning).length;

  const body = {
    source: AVALANCHE_ORG_FEED,
    modelSource: OPEN_METEO_FEED,
    feedTitle: 'Avalanche.org forecast zones (US centres) + modelled global snow-load risk',
    updated: new Date().toISOString(),
    count: zones.length + risk.length,
    zoneCount: zones.length,
    ratedZoneCount: rated,
    warningCount: warnings,
    modelledCount: risk.length,
    sources: {
      official: zonesResult.status === 'fulfilled' ? 'ok' : 'unavailable',
      modelled: riskResult.status === 'fulfilled' ? 'ok' : 'unavailable'
    },
    zones,
    risk
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // The avalanche centres publish a new forecast a few times a day; a 10-minute
  // CDN copy keeps free-tier function invocations low and never shows stale snow.
  res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800');
  res.statusCode = 200;
  res.end(JSON.stringify(body));
};

// Internal helpers (for tests / debugging).
module.exports._internal = {
  normalizeZones,
  normalizeMassifRisk,
  normalizeWarning,
  largestRingCentre,
  buildMassifUrl,
  avalancheLevelFor,
  AVALANCHE_MASSIFS,
  AVALANCHE_ORG_FEED,
  OPEN_METEO_FEED,
  MIN_RISK_SCORE,
  MAX_ZONES,
  MAX_RISK_POINTS
};



