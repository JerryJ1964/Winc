// build:saharan-dust-globe-20261004-3 — 🏜️ Saharan dust globe layer, built on a
// free, keyless feed only (no API key, no account, no credit card, nothing that
// can ever be billed).
//
// build:global-wind-layer-20261010-1 — 💨 the wind is now its OWN global globe
// layer, not just a number attached to dust. A coarse 5x8 grid (5 latitudes x
// 8 longitudes = 40 squares) is fetched as ONE extra batched request to the
// same keyless forecast host, shipped inside the existing /api/dust response so
// the browser makes no additional request and Vercel gets no additional
// function (the Hobby plan already carries 10). Each barb carries speed, gust,
// the direction it blows FROM and its Beaufort force. The grid is fetched
// independently of the dust scan, so a dead dust feed cannot blank the wind.
//
// Same-origin proxy over the keyless Open-Meteo AIR-QUALITY API (the CAMS global
// dust model). The browser never talks to Open-Meteo directly.
//
// WIND is a SECOND, separate batched request against the keyless Open-Meteo
// FORECAST API. The air-quality model genuinely does not carry wind: asked for
// `wind_speed_10m` it answers `null` and reports the unit as "undefined". Dust on
// its own is only half the story — a dust load goes nowhere without the wind to
// carry it, so the sandstorm band needs both numbers. Both feeds cover the same
// DUST_CELLS in one batched request each, and a dead wind feed downgrades the
// layer (no wind text, no swirls) instead of taking the dust down with it.
//
// One batched request covers every cell in DUST_CELLS: the Sahara itself (the
// source region, where the Bodélé Depression and the Ténéré pump dust into the
// air), the Sahel to its south, and the Atlantic lanes the Saharan Air Layer
// normally travels along on its way to the Caribbean and the Amazon. Each cell
// carries the modelled mineral-dust concentration (µg/m³), its PM10 / PM2.5
// companion values and the aerosol optical depth. Cells below MIN_DUST are
// dropped, so the layer stays silent on a clean day instead of painting a
// permanent tan smear over Africa.
//
// The dust load is a MODELLED quantity (a CAMS estimate, not a measurement) and
// the browser labels it as modelled everywhere it is shown.
//
// Docs: https://open-meteo.com/en/docs/air-quality-api
const AIR_QUALITY_FEED = 'https://air-quality-api.open-meteo.com/v1/air-quality';
// The keyless wind source. Separate host from the dust feed because the CAMS
// air-quality model does not publish wind at all (see the note at the top).
const WEATHER_FEED = 'https://api.open-meteo.com/v1/forecast';
const MAX_DUST_POINTS = 120;
const MIN_DUST = 30;   // µg/m³ of mineral dust — below this the air is not visibly dusty

// Dust alone is airborne powder; a SANDSTORM needs loose dust AND wind strong
// enough to lift it. These are the two halves of the 🌪️ sandstorm band, and both
// must be met before a cell is called a sandstorm. The km/h figures follow the
// usual dust-storm reporting practice: ~28 km/h (Beaufort 5, fresh breeze) starts
// lifting grains, ~40 km/h (Beaufort 6, strong breeze) drives a real wall of
// sand, and gusts above ~55 km/h are what actually break visibility.
const SANDSTORM_MIN_DUST = 120;  // µg/m³ — the "thick" band, plenty to lift
const SANDSTORM_MIN_WIND = 40;   // km/h  — Beaufort 6, strong breeze

// ---- 💨 the wind itself, as its own globe layer -----------------------------
// The dust belt is a strip across north-west Africa, so it cannot show the wind
// over the rest of the planet. This coarse global grid lets the globe draw wind
// anywhere: one extra batched request to the SAME keyless forecast host already
// used above (no new provider, no new key, no extra Vercel function).
//
// Deliberately coarse — 5 latitudes x 8 longitudes. A dense grid would say more
// than a 10-minute-old single model run can honestly support, and every extra
// point is free-tier weight for no real gain.
const WIND_GRID_LATS = [60, 30, 0, -30, -60];
const WIND_GRID_LONGS = [-180, -135, -90, -45, 0, 45, 90, 135];
const WIND_GRID = [];
for (const lat of WIND_GRID_LATS) {
  for (const lng of WIND_GRID_LONGS) WIND_GRID.push([lat, lng]);
}
const MAX_WIND_POINTS = 80;

// Beaufort force from a km/h speed. Used to colour the barbs so a glance at the
// globe reads calm → gale, and to label each barb the way a forecast would.
function beaufortFor(kmh) {
  if (!Number.isFinite(kmh)) return 0;
  const limits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  let f = 0;
  while (f < limits.length && kmh > limits[f]) f += 1;
  return f;
}

// Cells sampled by the keyless Open-Meteo air-quality model. [name, lat, lng]
// The list is deliberately the real Sahara / Sahel dust belt plus the two
// Atlantic outflow lanes: a global grid would scatter "haze" over clean oceans.
const DUST_CELLS = [
  ['Sahara · Chad (Faya-Largeau)', 17.9, 19.1],
  ['Sahara · Niger (Bilma)', 18.7, 12.9],
  ['Bodélé Depression · Chad', 16.9, 19.0],
  ['Ténéré · Niger (Agadez)', 16.9, 7.9],
  ['Sahara · Algeria (Adrar)', 27.9, -0.3],
  ['Sahara · Algeria (Tamanrasset)', 22.8, 5.5],
  ['Sahara · Algeria (Béchar)', 31.6, -2.2],
  ['Sahara · Libya (Sabha)', 27.0, 14.4],
  ['Sahara · Libya (Kufra)', 24.2, 23.3],
  ['Sahara · Egypt (Kharga)', 25.4, 30.6],
  ['Sahara · Sudan (Dongola)', 19.2, 30.5],
  ['Sahara · Tunisia (Kébili)', 33.7, 8.9],
  ['Sahara · Morocco (Zagora)', 30.3, -5.8],
  ['Western Sahara (Laâyoune)', 27.1, -13.2],
  ['Mauritania (Adrar plateau)', 20.5, -10.3],
  ['Azawad · Mali (Timbuktu)', 16.8, -3.0],
  ['Sahel · Mauritania (Nouakchott)', 18.1, -15.9],
  ['Sahel · Senegal (Podor)', 16.6, -14.9],
  ['Sahel · Senegal (Dakar)', 14.7, -17.4],
  ['Sahel · Mali (Kayes)', 14.4, -11.4],
  ['Sahel · Burkina Faso (Ouahigouya)', 13.6, -2.4],
  ['Sahel · Niger (Niamey)', 13.5, 2.1],
  ['Sahel · Chad (N’Djaména)', 12.1, 15.0],
  ['Sahel · Sudan (El Fasher)', 13.6, 25.3],
  ['Sahel · Sudan (Khartoum)', 15.5, 32.5],
  ['Horn of Africa (Danakil)', 13.5, 40.5],
  ['Cape Verde (Sal) — dust outflow', 16.7, -22.9],
  ['Atlantic · Canary Islands outflow', 28.1, -15.4],
  ['Atlantic · tropical outflow 15N 30W', 15.0, -30.0],
  ['Atlantic · Amazon outflow 10N 40W', 10.0, -40.0]
];

function toNumber(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round1(value) {
  return value == null ? null : Math.round(value * 10) / 10;
}

function toIso(text) {
  if (!text) return null;
  // Open-Meteo answers "2026-10-03T12:00" in the requested timezone (UTC here).
  const iso = String(text).length <= 16 ? String(text) + ':00Z' : String(text);
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

// One batched request for every cell: current dust, PM10 / PM2.5 and the aerosol
// optical depth. `current` keeps the payload (and the free-tier weight) tiny.
function buildDustUrl(cells) {
  const latitudes = cells.map((entry) => entry[1]).join(',');
  const longitudes = cells.map((entry) => entry[2]).join(',');
  return AIR_QUALITY_FEED + '?latitude=' + encodeURIComponent(latitudes) +
    '&longitude=' + encodeURIComponent(longitudes) +
    '&current=dust,pm10,pm2_5,aerosol_optical_depth&timezone=UTC';
}

// One batched wind request over the same cells as the dust scan. `current` keeps
// it to a single value per variable and keeps the free-tier weight tiny.
function buildWindUrl(cells) {
  const latitudes = cells.map((entry) => entry[1]).join(',');
  const longitudes = cells.map((entry) => entry[2]).join(',');
  return WEATHER_FEED + '?latitude=' + encodeURIComponent(latitudes) +
    '&longitude=' + encodeURIComponent(longitudes) +
    '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=UTC';
}

// Bulk dust is measured in µg/m³, and the CAMS model reaches four figures over
// the Bodélé. The bands below are the conventional visibility / air-quality
// reading of those numbers, not an official warning level.
function dustLevelFor(dust) {
  if (dust >= 400) return { level: 3, label: 'severe' };
  if (dust >= 120) return { level: 2, label: 'thick' };
  if (dust >= MIN_DUST) return { level: 1, label: 'hazy' };
  return { level: 0, label: 'clear' };
}

// A sandstorm is the COMBINATION of loose dust and wind strong enough to lift it.
// Either half alone is not a sandstorm: dust with calm air is a settled haze, and
// a gale over bare rock is just a gale. Both numbers are modelled, so this is a
// modelled verdict, never an official dust-storm warning.
// `wind` may be null when the wind feed is down — then no cell can be called a
// sandstorm, because the wind half of the evidence simply is not there.
function sandstormLevelFor(dust, windKmh) {
  if (!Number.isFinite(dust) || !Number.isFinite(windKmh)) return { level: 0, label: 'none' };
  if (dust < SANDSTORM_MIN_DUST || windKmh < SANDSTORM_MIN_WIND) {
    return { level: 0, label: 'none' };
  }
  // Both halves cleared — the heavier half of each decides how bad it gets.
  if (dust >= 400 && windKmh >= 55) return { level: 3, label: 'severe dust storm' };
  if (dust >= SANDSTORM_MIN_DUST && windKmh >= 50) return { level: 2, label: 'dust storm' };
  return { level: 1, label: 'blowing dust' };
}

// Attach wind to the dust points. The two feeds are indexed by the same
// DUST_CELLS, so entry i of the wind payload belongs to cell i. A short, missing
// or malformed wind payload leaves every point's wind fields null — the dust layer
// then simply renders without wind instead of inventing a breeze.
function attachWindToPoints(points, windPayload) {
  const stations = Array.isArray(windPayload) ? windPayload : (windPayload ? [windPayload] : []);
  for (let i = 0; i < points.length; i += 1) {
    // points[i] came from cell i, but cells are dropped when the air is clean, so
    // find the wind entry by the point's own cell id rather than by array index.
    const cellIndex = Number(String(points[i].id || '').split(':')[1]);
    const station = stations[cellIndex];
    const current = (station && station.current) || {};
    const speed = toNumber(current.wind_speed_10m);
    const gusts = toNumber(current.wind_gusts_10m);
    points[i].windKmh = speed;
    points[i].windGustKmh = gusts;
    points[i].windDirectionDeg = toNumber(current.wind_direction_10m);
    points[i].windTime = toIso(current.time);
    const { level, label } = sandstormLevelFor(points[i].dustUgm3, speed);
    points[i].sandstormLevel = level;
    points[i].sandstormLabel = label;
  }
  return points;
}

function normalizeDustPoints(payload) {
  const stations = Array.isArray(payload) ? payload : (payload ? [payload] : []);
  const points = [];
  for (let i = 0; i < stations.length; i += 1) {
    const cell = DUST_CELLS[i];
    const station = stations[i];
    if (!cell || !station) continue;

    const current = station.current || {};
    const dust = toNumber(current.dust);
    if (dust == null) continue;

    const observedAt = toIso(current.time);
    const aod = toNumber(current.aerosol_optical_depth);
    // The Saharan Air Layer often travels ALOFT: over the Atlantic the ground
    // value can be low while the dusty column is unmistakable, so a cell whose
    // optical depth proves a thick column still counts (drawn as a faint haze).
    const thickColumn = aod != null && aod >= 0.55;
    if (dust < MIN_DUST && !thickColumn) continue;

    const { level: rawLevel, label: rawLabel } = dustLevelFor(dust);
    const level = rawLevel === 0 ? 1 : rawLevel;          // thick column, low ground value
    const label = rawLevel === 0 ? 'hazy (thick column)' : rawLabel;

    points.push({
      id: 'dust:' + i,
      kind: 'modelled',
      name: cell[0],
      lat: toNumber(station.latitude) ?? cell[1],
      lng: toNumber(station.longitude) ?? cell[2],
      elevationM: toNumber(station.elevation),
      dustUgm3: round1(dust),
      pm10Ugm3: round1(toNumber(current.pm10)),
      pm2_5Ugm3: round1(toNumber(current.pm2_5)),
      aerosolOpticalDepth: aod == null ? null : Math.round(aod * 100) / 100,
      observedAt,
      epochMs: observedAt ? Date.parse(observedAt) : null,
      // 0–100, for sorting and for the strength of the painted haze.
      score: Math.round(clamp01((dust - MIN_DUST) / 400) * 100),
      level,
      levelLabel: label,
      sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api'
    });
  }
  // Heaviest first — ranked by the modelled load itself. `score` saturates at
  // 100 once dust passes ~430 µg/m³, so a score-only sort would leave a 3271
  // µg/m³ Bodélé outbreak sitting below a 753 µg/m³ cell (the live CAMS feed
  // really does return them in that order). Optical depth breaks any remaining
  // tie, because an aloft column with a low ground value is still thicker air.
  points.sort((a, b) =>
    (b.dustUgm3 - a.dustUgm3) ||
    ((b.aerosolOpticalDepth ?? 0) - (a.aerosolOpticalDepth ?? 0)) ||
    String(a.name).localeCompare(String(b.name)));
  return points.slice(0, MAX_DUST_POINTS);
}

// One batched wind request over the coarse global grid. Same host and the same
// three `current` variables as the dust-belt wind, so the two calls are
// interchangeable and the globe gets wind even when the dust feed is down.
function buildWindGridUrl() {
  const latitudes = WIND_GRID.map((cell) => cell[0]).join(',');
  const longitudes = WIND_GRID.map((cell) => cell[1]).join(',');
  return WEATHER_FEED + '?latitude=' + encodeURIComponent(latitudes) +
    '&longitude=' + encodeURIComponent(longitudes) +
    '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=UTC';
}

// Turn the grid payload into globe-ready barbs. Indexed against WIND_GRID itself
// rather than the dust points, so a short or malformed payload simply yields
// fewer barbs instead of shifting every barb onto the wrong grid square.
function normalizeWindGrid(payload) {
  const stations = Array.isArray(payload) ? payload : (payload ? [payload] : []);
  const points = [];
  for (let i = 0; i < stations.length; i += 1) {
    const cell = WIND_GRID[i];
    const station = stations[i];
    if (!cell || !station) continue;
    const current = station.current || {};
    const speed = toNumber(current.wind_speed_10m);
    if (!Number.isFinite(speed)) continue;   // no evidence at this square → no barb
    points.push({
      id: 'wind:' + i,
      lat: toNumber(station.latitude) ?? cell[0],
      lng: toNumber(station.longitude) ?? cell[1],
      speedKmh: Math.round(speed * 10) / 10,
      gustKmh: toNumber(current.wind_gusts_10m),
      directionDeg: toNumber(current.wind_direction_10m),
      beaufort: beaufortFor(speed),
      observedAt: toIso(current.time),
      sourceUrl: 'https://open-meteo.com/en/docs'
    });
    if (points.length >= MAX_WIND_POINTS) break;
  }
  // Windiest first, so if the globe ever caps the layer the calmest squares drop.
  points.sort((a, b) => b.speedKmh - a.speedKmh);
  return points;
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
    res.end(JSON.stringify({ error: 'Method not allowed', count: 0, points: [] }));
    return;
  }

  let points = [];
  let available = 'ok';
  let windAvailable = 'ok';
  try {
    points = normalizeDustPoints(await fetchJson(buildDustUrl(DUST_CELLS), 12000));
  } catch (error) {
    available = 'unavailable';
    console.error('Open-Meteo air-quality dust scan failed:', error);
  }

  // Wind is fetched separately and only bolted onto dust we actually have. If the
  // wind model is unreachable the dust layer stays fully usable — it just reports
  // no wind and therefore no sandstorms, rather than drawing a phantom gale.
  if (points.length) {
    try {
      attachWindToPoints(points, await fetchJson(buildWindUrl(DUST_CELLS), 12000));
    } catch (error) {
      windAvailable = 'unavailable';
      attachWindToPoints(points, null);
      console.error('Open-Meteo wind scan failed:', error);
    }
  } else {
    windAvailable = 'skipped';
  }

  // 💨 The global wind grid is fetched INDEPENDENTLY of the dust scan. Coupling
  // it to `points.length` (as the dust-belt wind above is) would mean one dead
  // dust feed silently blanks the whole wind layer; here a failure only costs
  // the barbs, never the dust and never the sandstorms.
  let windPoints = [];
  let windGridAvailable = 'ok';
  try {
    windPoints = normalizeWindGrid(await fetchJson(buildWindGridUrl(), 12000));
  } catch (error) {
    windGridAvailable = 'unavailable';
    console.error('Open-Meteo global wind grid failed:', error);
  }

  const sandstormCount = points.filter((p) => p.sandstormLevel > 0).length;

  const body = {
    source: AIR_QUALITY_FEED,
    feedTitle: 'Open-Meteo air quality — modelled Saharan dust load',
    updated: new Date().toISOString(),
    count: points.length,
    sandstormCount,
    scannedCount: DUST_CELLS.length,
    thresholdUgm3: MIN_DUST,
    sandstormMinWindKmh: SANDSTORM_MIN_WIND,
    sources: { airQuality: available, wind: windAvailable, windGrid: windGridAvailable },
    points,
    // The global wind field, so the globe can draw 💨 Wind on its own layer
    // instead of only reporting wind where there happens to be dust.
    wind: {
      count: windPoints.length,
      scannedCount: WIND_GRID.length,
      minBeaufort: 3,
      available: windGridAvailable,
      points: windPoints
    }
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // The CAMS dust model refreshes every few hours; a 10-minute CDN copy keeps
  // the free-tier function invocations low without showing stale dust.
  res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800');
  res.statusCode = 200;
  res.end(JSON.stringify(body));
};

// Internal helpers (for tests / debugging).
module.exports._internal = {
  normalizeDustPoints,
  buildDustUrl,
  buildWindUrl,
  attachWindToPoints,
  buildWindGridUrl,
  normalizeWindGrid,
  beaufortFor,
  dustLevelFor,
  sandstormLevelFor,
  DUST_CELLS,
  WIND_GRID,
  WIND_GRID_LATS,
  WIND_GRID_LONGS,
  MAX_WIND_POINTS,
  AIR_QUALITY_FEED,
  WEATHER_FEED,
  MIN_DUST,
  MAX_DUST_POINTS,
  SANDSTORM_MIN_DUST,
  SANDSTORM_MIN_WIND
};

