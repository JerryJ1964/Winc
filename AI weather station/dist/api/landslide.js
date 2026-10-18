// build:mudslide-avalanche-globe-20260930-1 — 🪨 mudslide and 🏔️ snow-avalanche
// globe layers, built on free, keyless feeds only (no API key, no credit card,
// nothing that can ever be billed).
//
// This same-origin proxy returns two kinds of mudslide information:
//   1. OBSERVED events — the keyless NASA EONET `landslides` feed, which lists
//      landslide / mudslide / mudflow disasters EONET has logged (it is
//      authoritative but sparse: several months can pass without a new entry,
//      and the panel says so instead of inventing anything).
//   2. MODELLED conditions — a rainfall/soil-moisture scan of landslide-prone
//      slopes worldwide through the keyless Open-Meteo model (rain in the last
//      24 h / 72 h plus the soil moisture of the top soil layer). This is a
//      documented rainfall-threshold proxy, NOT an official warning, and the
//      browser labels it as modelled everywhere it is shown.
//
// EONET docs: https://eonet.gsfc.nasa.gov/docs/v3 · Open-Meteo docs: https://open-meteo.com/en/docs
const EONET_LANDSLIDE_FEED = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=landslides&status=all&days=180&limit=250';
const OPEN_METEO_FEED = 'https://api.open-meteo.com/v1/forecast';
const OBSERVED_WINDOW_DAYS = 180;   // only keep reports this recent on the globe
const MAX_OBSERVED = 120;
const MAX_RISK_POINTS = 120;
const MIN_RISK_SCORE = 15;          // below this a slope is not worth drawing
const SOIL_LAYER = 'soil_moisture_0_to_7cm';

// Landslide-prone slopes sampled every 10 minutes by the keyless Open-Meteo
// model. Deliberately a hand-picked list of known mass-movement regions (steep
// terrain in a wet climate) rather than a global grid: a grid would put
// "risk" markers in the middle of deserts and oceans. [name, lat, lng]
const LANDSLIDE_SLOPES = [
  ['Himalaya · Nepal (Kathmandu hills)', 27.75, 85.35],
  ['Himalaya · India (Uttarakhand)', 30.35, 78.35],
  ['Himalaya · India (Himachal, Manali)', 32.35, 77.2],
  ['Karakoram · Pakistan (Gilgit)', 35.85, 74.3],
  ['Hindu Kush · Afghanistan (Panjshir)', 35.3, 69.6],
  ['Pamir · Tajikistan (Rushon)', 37.95, 71.55],
  ['Tien Shan · Kyrgyzstan (Jalal-Abad)', 41.35, 72.95],
  ['Caucasus · Georgia (Svaneti)', 43.05, 42.7],
  ['Zagros · Iran (Lorestan)', 33.4, 48.35],
  ['Alborz · Iran (Mazandaran)', 36.3, 52.2],
  ['Anatolia · Türkiye (Trabzon)', 40.9, 39.9],
  ['Sichuan · China (Wenchuan)', 31.3, 103.5],
  ['Yunnan · China (Nujiang gorge)', 26.1, 98.85],
  ['Three Gorges · China (Badong)', 31.05, 110.35],
  ['Taiwan (central mountains)', 23.7, 120.95],
  ['Japan (Kii Peninsula)', 33.85, 135.75],
  ['Japan (Hokkaido, Hidaka)', 42.85, 142.6],
  ['Korea (Gangwon hills)', 37.75, 128.35],
  ['Philippines (Luzon, Cordillera)', 16.9, 120.8],
  ['Philippines (Mindanao, Bukidnon)', 8.1, 125.0],
  ['Indonesia (Java, Garut)', -7.2, 107.9],
  ['Indonesia (Sulawesi, Palu)', -0.9, 119.9],
  ['Indonesia (Sumatra, Bukittinggi)', -0.3, 100.35],
  ['Vietnam (Lao Cai highlands)', 22.35, 103.85],
  ['Myanmar (Chin Hills)', 21.9, 93.6],
  ['Thailand (Chiang Mai hills)', 18.8, 98.9],
  ['Malaysia (Cameron Highlands)', 4.5, 101.5],
  ['Western Ghats · India (Idukki)', 9.85, 77.1],
  ['Western Ghats · India (Raigad)', 18.4, 73.45],
  ['Sri Lanka (Kandy highlands)', 7.25, 80.65],
  ['Ethiopia (Abay gorge)', 11.6, 37.4],
  ['Uganda (Mt Elgon slopes)', 1.1, 34.55],
  ['Kenya (Rift Valley, Kericho)', -0.35, 35.25],
  ['Rwanda (Virunga foothills)', -1.5, 29.65],
  ['Malawi (Shire highlands)', -15.8, 35.1],
  ['Mozambique (Zambezia)', -17.5, 36.9],
  ['South Africa (Drakensberg)', -29.0, 29.35],
  ['Madagascar (eastern escarpment)', -18.9, 48.6],
  ['Cameroon (Bamenda highlands)', 6.0, 10.35],
  ['Sierra Leone (Freetown peninsula)', 8.45, -13.25],
  ['Nigeria (Obudu plateau)', 6.6, 9.1],
  ['Tanzania (Kilimanjaro south slopes)', -3.25, 37.35],
  ['Mexico (Sierra Madre, Oaxaca)', 17.05, -96.7],
  ['Guatemala (Cuchumatanes)', 15.4, -91.35],
  ['Honduras (Sula valley slopes)', 15.25, -88.0],
  ['Costa Rica (Talamanca)', 9.55, -83.65],
  ['Haiti (Massif de la Hotte)', 18.4, -74.05],
  ['Puerto Rico (Cordillera Central)', 18.2, -66.55],
  ['Colombia (Eje Cafetero)', 5.07, -75.5],
  ['Colombia (Cauca, Popayán)', 2.45, -76.6],
  ['Ecuador (Baños, Andes)', -1.4, -78.4],
  ['Peru (Cordillera Blanca)', -9.28, -77.65],
  ['Peru (Sacred Valley, Cusco)', -13.3, -72.1],
  ['Bolivia (Yungas, Coroico)', -16.2, -67.75],
  ['Chile (Valparaíso coastal range)', -33.05, -71.35],
  ['Brazil (Serra do Mar, Angra)', -22.95, -44.3],
  ['Argentina (Quebrada de Humahuaca)', -24.2, -65.3],
  ['USA · California (Big Sur)', 36.25, -121.75],
  ['USA · Oregon (Cascades, Mt Hood)', 45.35, -121.7],
  ['USA · Washington (Cascades, Naches)', 46.75, -121.1],
  ['USA · Appalachians (West Virginia)', 38.0, -80.85],
  ['Canada (Fraser Valley, BC)', 49.4, -121.45],
  ['New Zealand (West Coast, Fox Glacier)', -43.5, 170.1],
  ['Papua New Guinea (Highlands)', -5.9, 144.2],
  ['Solomon Islands (Guadalcanal)', -9.55, 160.05],
  ['Fiji (Viti Levu interior)', -17.8, 178.0],
  ['Italy (Aosta Valley, Alps)', 45.72, 7.3],
  ['Italy (Ligurian Apennines)', 44.4, 8.95],
  ['Switzerland (Valais, Zermatt)', 46.02, 7.75],
  ['Austria (Tirol, Innsbruck)', 47.25, 11.4],
  ['France (Alpes-de-Haute-Provence)', 44.38, 6.65],
  ['Spain (Aragonese Pyrenees)', 42.65, -0.35],
  ['Norway (Geiranger fjord)', 62.1, 7.2],
  ['Iceland (eastern fjords)', 65.25, -14.4],
  ['Scotland (Fort William)', 56.8, -5.1],
  ['Azores (São Miguel)', 37.8, -25.5],
  ['Réunion (Piton des Neiges)', -21.1, 55.45],
  ['Hawaii (Kauai, Waialeale)', 22.05, -159.5]
];

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

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
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

// EONET appends dated geometry observations. Prefer the freshest usable one and
// fall back to the centre of a polygon's bounds for an area report.
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
    const lat = (minLat + maxLat) / 2;
    const lng = (minLng + maxLng) / 2;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    return { lat, lng, date: entry.date || null };
  }
  return null;
}

function sourceUrlFor(event) {
  const source = Array.isArray(event?.sources)
    ? event.sources.find((item) => /^https:\/\//i.test(item?.url || ''))
    : null;
  if (source) return source.url;
  if (event && typeof event.link === 'string' && /^https:\/\//i.test(event.link)) return event.link;
  return 'https://eonet.gsfc.nasa.gov/categories/landslides';
}

function cleanText(value) {
  const text = String(value == null ? '' : value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

// EONET's landslide category mixes landslides, mudslides, mudflows and debris
// flows; the title tells us which word the reporting agency used, so the panel
// can keep that wording instead of flattening every event into "landslide".
function landslideKind(title) {
  return /mudslide|mud flow|mudflow|debris flow|lahar/i.test(title) ? 'mudslide' : 'landslide';
}

function normalizeObservedEvents(payload, nowMs = Date.now()) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const cutoff = nowMs - OBSERVED_WINDOW_DAYS * 86400000;
  const observed = [];
  for (const event of events) {
    const point = latestGeometryPoint(event?.geometry);
    if (!point) continue;
    const name = cleanText(event?.title);
    if (!name) continue;
    const observedAt = toIso(point.date);
    const epochMs = observedAt ? Date.parse(observedAt) : null;
    if (epochMs != null && epochMs < cutoff) continue; // stale report, not "active"
    observed.push({
      id: event?.id || null,
      kind: 'observed',
      hazard: landslideKind(name),
      name,
      description: cleanText(event?.description),
      lat: point.lat,
      lng: point.lng,
      observedAt,
      epochMs,
      closedAt: toIso(event?.closed),
      status: event?.closed ? 'closed' : 'open',
      sourceUrl: sourceUrlFor(event),
      sources: Array.isArray(event?.sources) ? event.sources.map((s) => s && s.id).filter(Boolean) : []
    });
  }
  observed.sort((a, b) => (b.epochMs || 0) - (a.epochMs || 0));
  return observed.slice(0, MAX_OBSERVED);
}

// ===== modelled rain-triggered risk on known landslide slopes =====
// One batched Open-Meteo request covers every slope in LANDSLIDE_SLOPES: daily
// rain totals for the last three days plus the hourly moisture of the top soil
// layer. The resulting score is a documented rainfall-threshold proxy:
//
//   • 72 h rain   0 → 55 points   (starts damaging slopes at 40 mm, caps at 200 mm)
//   • 24 h burst  0 → 25 points   (starts at 20 mm, caps at 100 mm)
//   • soil water  0 → 20 points   (saturated topsoil 0.22 → 0.40 m³/m³)
//
// A slope only appears when rain actually fell on it (or its soil is already
// saturated), so the layer stays silent in dry weather and never invents events.
function buildRiskUrl(slopes) {
  const latitudes = slopes.map((entry) => entry[1]).join(',');
  const longitudes = slopes.map((entry) => entry[2]).join(',');
  return OPEN_METEO_FEED + '?latitude=' + encodeURIComponent(latitudes) +
    '&longitude=' + encodeURIComponent(longitudes) +
    '&daily=precipitation_sum,rain_sum' +
    '&hourly=' + SOIL_LAYER +
    '&past_days=3&forecast_days=1&timezone=UTC';
}

function riskLevelFor(score) {
  if (score >= 60) return { level: 3, label: 'high' };
  if (score >= 40) return { level: 2, label: 'considerable' };
  if (score >= 20) return { level: 1, label: 'moderate' };
  return { level: 0, label: 'low' };
}

function meanOfLastHours(values, hours) {
  const series = Array.isArray(values) ? values.filter((v) => toNumber(v) != null) : [];
  if (!series.length) return null;
  const window = series.slice(-Math.min(hours, series.length));
  const sum = window.reduce((acc, v) => acc + toNumber(v), 0);
  return sum / window.length;
}

function normalizeRiskPoints(payload) {
  const stations = Array.isArray(payload) ? payload : (payload ? [payload] : []);
  const points = [];
  for (let i = 0; i < stations.length; i += 1) {
    const slope = LANDSLIDE_SLOPES[i];
    const station = stations[i];
    if (!slope || !station || !station.daily) continue;

    const daily = station.daily.precipitation_sum || [];
    const today = toNumber(daily[3]);
    const yesterday = toNumber(daily[2]);
    const before = toNumber(daily[1]);
    if (today == null || yesterday == null || before == null) continue;

    const rain24 = today;
    const rain72 = today + yesterday + before;
    const soil = meanOfLastHours(station.hourly && station.hourly[SOIL_LAYER], 24);

    const rainTerm = 55 * clamp01((rain72 - 40) / 160);
    const burstTerm = 25 * clamp01((rain24 - 20) / 80);
    const soilTerm = 20 * clamp01(((soil == null ? 0 : soil) - 0.22) / 0.18);
    let score = rainTerm + burstTerm + soilTerm;
    if (rain24 < 5 && rain72 < 20 && (soil == null || soil < 0.30)) score = 0; // nothing to trigger it
    score = Math.round(clamp01(score / 100) * 100);

    if (score < MIN_RISK_SCORE) continue;
    const { level, label } = riskLevelFor(score);
    points.push({
      id: 'slope:' + i,
      kind: 'modelled',
      name: slope[0],
      lat: toNumber(station.latitude) ?? slope[1],
      lng: toNumber(station.longitude) ?? slope[2],
      elevationM: toNumber(station.elevation),
      score,
      level,
      levelLabel: label,
      rain24Mm: Math.round(rain24 * 10) / 10,
      rain72Mm: Math.round(rain72 * 10) / 10,
      soilMoisture: soil == null ? null : Math.round(soil * 1000) / 1000,
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
    res.end(JSON.stringify({ error: 'Method not allowed', count: 0, events: [], risk: [] }));
    return;
  }

  // The two halves fail independently: a dead EONET must not hide the modelled
  // slope scan, and a dead weather model must not hide the official reports.
  const [observedResult, riskResult] = await Promise.allSettled([
    fetchJson(EONET_LANDSLIDE_FEED, 10000),
    fetchJson(buildRiskUrl(LANDSLIDE_SLOPES), 12000)
  ]);

  const events = observedResult.status === 'fulfilled' ? normalizeObservedEvents(observedResult.value) : [];
  const risk = riskResult.status === 'fulfilled' ? normalizeRiskPoints(riskResult.value) : [];
  if (observedResult.status === 'rejected') console.error('EONET landslide proxy failed:', observedResult.reason);
  if (riskResult.status === 'rejected') console.error('Open-Meteo slope scan failed:', riskResult.reason);

  const body = {
    source: EONET_LANDSLIDE_FEED,
    modelSource: OPEN_METEO_FEED,
    feedTitle: 'NASA EONET landslide events + modelled rain-triggered slope risk',
    updated: new Date().toISOString(),
    count: events.length + risk.length,
    observedCount: events.length,
    modelledCount: risk.length,
    sources: {
      observed: observedResult.status === 'fulfilled' ? 'ok' : 'unavailable',
      modelled: riskResult.status === 'fulfilled' ? 'ok' : 'unavailable'
    },
    events,
    risk
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Both providers refresh roughly every 15 minutes; a 10-minute CDN copy keeps
  // the free-tier function invocations low without showing stale events.
  res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800');
  res.statusCode = 200;
  res.end(JSON.stringify(body));
};

// Internal helpers (for tests / debugging).
module.exports._internal = {
  normalizeObservedEvents,
  normalizeRiskPoints,
  latestGeometryPoint,
  buildRiskUrl,
  riskLevelFor,
  meanOfLastHours,
  landslideKind,
  LANDSLIDE_SLOPES,
  EONET_LANDSLIDE_FEED,
  OPEN_METEO_FEED,
  MIN_RISK_SCORE,
  MAX_OBSERVED,
  MAX_RISK_POINTS
};
