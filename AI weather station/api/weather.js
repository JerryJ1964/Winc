// build:enso-dial-20261014-1 — 🌊 adjustable ENSO dial (-3..+3 °C) + live NOAA ONI
// (cached via /api/weather?action=enso — no new Vercel function, Hobby stays at
// 12) + Celestia-credited bright-star sky (public-domain Yale BSC / Hipparcos
// positions + JPL orbital elements + Messier/NGC facts, drawn on-device).
const DEFAULT_LOCATION = 'Vlaardingen, Netherlands';
// build:nowcast-20260827-1
// build:alerts-20260829-1 — rain / hail / snow / wind-above-Beaufort-4 alert flags for push notifications
// build:clear-night-20260914-1 — 🌙 a cloudless NIGHT sky gets its own icon: when the sun is down (is_day = 0), WMO code 0 (Clear) becomes "Clear Night" 🌙 and code 1 (Mainly Clear) swaps ☀️/🌤️ for 🌙 — applied everywhere the weather code is mapped: current conditions (WeatherAPI + Open-Meteo), the 15-minute nowcast slots (which now carry isDay), the 5×5 local-map cells and their forecast frames, and the AI prediction ("Clear starry night…"). The response also exposes isDay so the front end can swap ☀️ → 🌙 in its own icon map, and the "Sun" nowcast badge + the slot "☀️ n%" line only appear while the sun is actually up. Also fixes a latent crash in buildWapiTimeline (next/lerp referenced before their const declarations — a temporal-dead-zone ReferenceError that killed every WeatherAPI nowcast build and silently forced the Open-Meteo fallback).
// build:forecast14-20260915-1 — 📅 14-day forecast for any location on Earth: the response now carries `forecast14`, an array of 14 daily entries (date, Today/Tomorrow/weekday label, weather condition + WMO code, max & min temperature, wind speed + dominant direction in km/h and compass points with Beaufort force, and the chance of rain as a % plus the expected precipitation in mm). WeatherAPI.com's free plan only serves 3 days, so the 14-day daily data always comes from a separate, keyless Open-Meteo daily call that is cached server-side for 10 minutes per ~5 km area — the 30-second front-end auto-refresh costs nothing extra. The existing 3-day `forecast` array (and every other field) is unchanged.
// build:holiday-week-20260918-1 — 🌤️ Honest day cards: the 3-day `forecast` Today/Tomorrow cards and the 14-day `forecast14` days only keep a rain icon on real rain (≥ 1 mm in the day or a ≥ 60 % peak chance); a dry "Patchy rain nearby" day (e.g. 0.51 mm / 45 %) reads ⛅/☁️/☀️ from its own daytime cloud cover instead of 🌧️ while the sun shines.
const DEFAULT_LATITUDE = 51.9192;
const DEFAULT_LONGITUDE = 4.3599;
// ── Upstream discipline (the 504 fix) ──────────────────────────────────
// Every outbound call carries an AbortSignal ceiling, and the request as a
// whole carries one overall budget. A provider that stops answering therefore
// costs us an honest fallback payload (HTTP 200) — never a Vercel
// "504 Gateway Timeout" from the function running past its maxDuration.
// Both knobs are env-tunable so the timeout path can be exercised locally.
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 8000);
const REQUEST_BUDGET_MS = Number(process.env.REQUEST_BUDGET_MS || 12000);

// AbortSignal.timeout() exists in every Node ≥ 17.3 (Vercel runs 24.x); the
// guard keeps this file loadable in older toolchains and in unit tests that
// stub the globals.
function timeoutSignal(ms) {
  return typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(ms) : undefined;
}

// Resolve-or-die wrapper: a hanging upstream must never decide how long a
// request takes. Rejects after `ms` so the caller's fallback path runs.
function withBudget(promise, ms, label) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: exceeded ${ms} ms budget`)), ms);
    if (timer && typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

const COORDINATE_PATTERN = /^\s*([-+]?\d+(?:\.\d+)?)\s*[,;]\s*([-+]?\d+(?:\.\d+)?)\s*$/;

function parseCoordinates(input) {
  if (!input) return null;
  const match = String(input).match(COORDINATE_PATTERN);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

// Some providers (e.g. BigDataCloud) prepend an administrative label to the
// place name — "Gemeente Vlaardingen", "Municipality of X", "Comune di Roma".
// Strip it so we show the real place name the user is in.
const MUNICIPALITY_PREFIX =
  /^\s*(?:gemeente|municipality|comune|municipio|commune|kommune|ville|stad|city)\s+(?:de|of|di|della|le|la|du|van|den)?\s+/i;

function cleanPlaceName(raw) {
  if (!raw) return '';
  return String(raw).replace(MUNICIPALITY_PREFIX, '').trim();
}

async function reverseGeocode(latitude, longitude, fallbackLabel) {
  // BigDataCloud is used first (fast, keyless). Its free endpoint is heavily
  // rate-limited and is sometimes blocked from serverless (Vercel) IPs, so a
  // failing call falls through to Nominatim (OpenStreetMap), also keyless,
  // which returns clean town names. Only if both fail do we show coordinates.
  const providers = [
    async () => {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!response.ok) throw new Error(`BigDataCloud HTTP ${response.status}`);
      const data = await response.json();
      // 'locality' is the clean town name; 'city' can carry a "Gemeente …"
      // prefix, so prefer locality and clean up whichever one we end up with.
      const name = cleanPlaceName(data.locality || data.city || data.principalSubdivision);
      const country = typeof data.countryName === 'string' ? data.countryName.split(' (')[0] : '';
      if (!name) throw new Error('BigDataCloud returned no place name');
      return country ? `${name}, ${country}` : name;
    },
    async () => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=14&accept-language=en`,
        {
          headers: { 'User-Agent': 'AIWeatherStationPWA/1.1 (weather PWA)' },
          signal: AbortSignal.timeout(8000)
        }
      );
      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
      const data = await response.json();
      const addr = data.address || {};
      const name = cleanPlaceName(
        addr.town || addr.city || addr.village || addr.municipality || addr.suburb || data.name
      );
      const country = addr.country || '';
      if (!name) throw new Error('Nominatim returned no place name');
      return country ? `${name}, ${country}` : name;
    }
  ];

  for (const provider of providers) {
    try {
      const label = await provider();
      if (label) return label;
    } catch (error) {
      console.warn('Reverse geocoding failed on a provider.', error);
    }
  }

  return fallbackLabel || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function mapWeatherCodeToCondition(code, isDay) {
  const mapping = {
    0: { condition: 'Clear', icon: '☀️' },
    1: { condition: 'Mainly Clear', icon: '🌤️' },
    2: { condition: 'Partly Cloudy', icon: '⛅' },
    3: { condition: 'Cloudy', icon: '☁️' },
    45: { condition: 'Fog', icon: '🌫️' },
    48: { condition: 'Rime Fog', icon: '🌫️' },
    51: { condition: 'Light Drizzle', icon: '🌦️' },
    53: { condition: 'Drizzle', icon: '🌦️' },
    55: { condition: 'Heavy Drizzle', icon: '🌧️' },
    61: { condition: 'Rain', icon: '🌧️' },
    63: { condition: 'Rain', icon: '🌧️' },
    65: { condition: 'Heavy Rain', icon: '🌧️' },
    71: { condition: 'Snow', icon: '❄️' },
    73: { condition: 'Snow', icon: '❄️' },
    75: { condition: 'Heavy Snow', icon: '❄️' },
    77: { condition: 'Snow', icon: '❄️' },
    56: { condition: 'Freezing Drizzle', icon: '🌨️' },
    57: { condition: 'Freezing Drizzle', icon: '🌨️' },
    66: { condition: 'Freezing Rain', icon: '🌨️' },
    67: { condition: 'Freezing Rain', icon: '🌨️' },
    80: { condition: 'Rain Showers', icon: '🌦️' },
    81: { condition: 'Rain Showers', icon: '🌧️' },
    82: { condition: 'Heavy Rain Showers', icon: '🌧️' },
    85: { condition: 'Snow Showers', icon: '❄️' },
    86: { condition: 'Heavy Snow Showers', icon: '❄️' },
    95: { condition: 'Thunderstorm', icon: '⛈️' },
    96: { condition: 'Thunderstorm with Hail', icon: '🧊' },
    99: { condition: 'Thunderstorm with Heavy Hail', icon: '🧊' }
  };
  // 🌙 Night: the sun cannot shine after dark — a cloudless sky shows the moon
  // and the stars instead of the sun. An explicit isDay === false means
  // "night"; omitting the flag (daily summaries, fallbacks without day/night
  // info) keeps the classic sun icons. Rain, snow, fog … keep their icons at
  // night — only the clear families change, because ☀️ and 🌤️ both draw a sun.
  //
  // 🧊 Hail (96/99) deliberately wears the ice icon, not ⛈️: a hail-bearing
  // thunderstorm is the one thing that must stand out, and 🧊 is the icon the
  // 🛰️ map, its layer toggle and its legend already use. The condition text
  // keeps the thunder, so nothing is lost. The front end mirrors this table
  // 1:1 in WEATHER_CODE_INFO (index.html).
  if (isDay === false) {
    if (code === 0) return { condition: 'Clear Night', icon: '🌙' };
    if (code === 1) return { condition: 'Mainly Clear', icon: '🌙' };
  }
  return mapping[code] ?? { condition: 'Unknown', icon: '🌡️' };
}
// ===== ☀️ Solar data (Open-Meteo keyless, shared by both providers) =========
// One call covers solar intensity (shortwave radiation), UV index and
// sunshine duration. Cached server-side for 15 minutes per ~5 km area so the
// new ☀️ Solar tab can refresh every 15 minutes without extra upstream cost.
const SOLAR_CACHE_TTL_MS = 15 * 60 * 1000;
const SOLAR_CACHE_MAX = 64;
const solarCache = new Map();

function uvLevelFor(uvIndex) {
  const v = typeof uvIndex === 'number' && Number.isFinite(uvIndex) ? uvIndex : null;
  if (v == null) return { level: 'unknown', label: 'Unknown', advice: 'UV data is temporarily unavailable.' };
  if (v < 1) return { level: 'low', label: 'Low', advice: 'No protection needed.' };
  if (v < 3) return { level: 'low', label: 'Low', advice: 'No protection needed for most people.' };
  if (v < 6) return { level: 'moderate', label: 'Moderate', advice: 'Seek shade around midday; wear sunglasses.' };
  if (v < 8) return { level: 'high', label: 'High', advice: 'Seek shade, wear sunscreen SPF 30+, a hat and sunglasses.' };
  if (v < 11) return { level: 'very-high', label: 'Very high', advice: 'Avoid midday sun — sunscreen SPF 30+, hat, sunglasses and shade.' };
  return { level: 'extreme', label: 'Extreme', advice: 'Stay indoors around midday — unprotected skin burns in minutes.' };
}

function buildSolarResponse(latitude, longitude, payload) {
  const current = payload?.current ?? {};
  const daily = payload?.daily ?? {};
  const hourly = payload?.hourly ?? null;
  const shortwave = typeof current.shortwave_radiation === 'number' ? Math.round(current.shortwave_radiation) : null;
  const direct = typeof current.direct_radiation === 'number' ? Math.round(current.direct_radiation) : null;
  const diffuse = typeof current.diffuse_radiation === 'number' ? Math.round(current.diffuse_radiation) : null;
  const uvIndex = typeof current.uv_index === 'number' ? Math.round(current.uv_index * 10) / 10 : null;
  const uvClear = typeof current.uv_index_clear_sky === 'number' ? Math.round(current.uv_index_clear_sky * 10) / 10 : null;
  const sunshineSeconds = typeof daily.sunshine_duration?.[0] === 'number' ? Math.round(daily.sunshine_duration[0]) : null;
  const daylightSeconds = typeof daily.daylight_duration?.[0] === 'number' ? Math.round(daily.daylight_duration[0]) : null;
  const uv = uvLevelFor(uvIndex);
  return {
    source: 'open-meteo',
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
    updated: new Date().toISOString(),
    shortwaveWm2: shortwave,
    directWm2: direct,
    diffuseWm2: diffuse,
    uvIndex,
    uvClearSky: uvClear,
    uvLevel: uv.level,
    uvLabel: uv.label,
    uvAdvice: uv.advice,
    sunshineSeconds,
    daylightSeconds,
    sunrise: daily.sunrise?.[0] || null,
    sunset: daily.sunset?.[0] || null,
    hourly: pickSolarHourly(hourly, Date.now(), 12),
    isDay: (current.is_day ?? 1) === 1,
  };
}

function pickSolarHourly(hourly, nowMs, count) {
  if (!hourly || !Array.isArray(hourly.time)) return [];
  let start = 0;
  for (let i = 0; i < hourly.time.length; i += 1) {
    const t = Date.parse(hourly.time[i]);
    if (Number.isFinite(t) && t <= nowMs) start = i;
    else if (Number.isFinite(t)) break;
  }
  const out = [];
  for (let i = start; i < hourly.time.length && out.length < (count || 12); i += 1) {
    const sw = hourly.shortwave_radiation?.[i];
    const uv = hourly.uv_index?.[i];
    const t = hourly.temperature_2m?.[i];
    out.push({
      time: hourly.time[i] || '',
      shortwaveWm2: typeof sw === 'number' && Number.isFinite(sw) ? Math.round(sw) : null,
      uvIndex: typeof uv === 'number' && Number.isFinite(uv) ? Math.round(uv * 10) / 10 : null,
      tempC: typeof t === 'number' && Number.isFinite(t) ? Math.round(t * 10) / 10 : null,
      isDay: (hourly.is_day?.[i] ?? 1) === 1
    });
  }
  return out;
}

async function fetchSolarData(latitude, longitude) {
  const key = `${Number(latitude).toFixed(2)},${Number(longitude).toFixed(2)}`;
  const now = Date.now();
  const cached = solarCache.get(key);
  if (cached && now - cached.t < SOLAR_CACHE_TTL_MS) return { ...cached.data, cached: true };
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=shortwave_radiation,direct_radiation,diffuse_radiation,uv_index,uv_index_clear_sky,is_day` +
    `&hourly=shortwave_radiation,uv_index,is_day,temperature_2m` +
    `&daily=sunrise,sunset,sunshine_duration,daylight_duration&timezone=auto&forecast_days=2`;
  const response = await fetch(url, { signal: timeoutSignal(UPSTREAM_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Solar HTTP ${response.status}`);
  const payload = await response.json();
  const data = buildSolarResponse(latitude, longitude, payload);
  solarCache.set(key, { t: now, data });
  if (solarCache.size > SOLAR_CACHE_MAX) solarCache.delete(solarCache.keys().next().value);
  return { ...data, cached: false };
}
// ===== 🌊 ENSO / ONI (NOAA CPC, public domain, keyless) ====================
// Live Oceanic Niño Index served through THIS route (?action=enso) so the
// Hobby project stays at 12 functions. Cached 24 h — ONI updates monthly.
// Falls back to an honest unavailable payload, never a 504.
const ENSO_FEED = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt';
const ENSO_TTL_MS = 24 * 60 * 60 * 1000;
let ensoCache = { t: 0, data: null };
function parseOniText(text) {
  const rows = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z]{3})\s+(\d{4})\s+([-\d.]+)\s+([-\d.]+)/);
    if (!m) continue;
    rows.push({ season: m[1] + ' ' + m[2], year: Number(m[2]), total: Number(m[3]), anomaly: Number(m[4]) });
  }
  return rows.filter((r) => Number.isFinite(r.anomaly));
}
function ensoPhaseFor(anomaly) {
  if (anomaly == null || !Number.isFinite(anomaly)) return { phase: 'unknown', label: 'Unknown' };
  if (anomaly >= 0.5) return { phase: 'elnino', label: 'El Niño' };
  if (anomaly <= -0.5) return { phase: 'lanina', label: 'La Niña' };
  return { phase: 'neutral', label: 'Neutral' };
}
async function fetchEnsoData() {
  const now = Date.now();
  if (ensoCache.data && now - ensoCache.t < ENSO_TTL_MS) return { ...ensoCache.data, cached: true };
  const response = await fetch(ENSO_FEED, { signal: timeoutSignal(UPSTREAM_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`ENSO HTTP ${response.status}`);
  const rows = parseOniText(await response.text());
  if (!rows.length) throw new Error('ENSO feed parsed to zero rows');
  const latest = rows[rows.length - 1];
  const phase = ensoPhaseFor(latest.anomaly);
  const body = {
    source: ENSO_FEED,
    feedTitle: 'NOAA CPC Oceanic Niño Index (ERSST)',
    updated: new Date().toISOString(),
    available: true,
    season: latest.season,
    year: latest.year,
    oni: Math.round(latest.anomaly * 100) / 100,
    phase: phase.phase,
    phaseLabel: phase.label,
    cached: false
  };
  ensoCache = { t: now, data: body };
  return body;
}
// ===== 🌦️ WeatherAPI.com provider (optional, keyed) ====================
// Set WEATHERAPI_KEY (free plan: 100,000 calls/month, 3-day forecast, no
// credit card — key from your dashboard at weatherapi.com) to make
// WeatherAPI.com the PRIMARY weather source. The response shape is identical
// to the built-in Open-Meteo provider, so the frontend, push alerts and
// tests need no changes. If the key is missing or a call fails (quota, bad
// key, network), the app silently falls back to Open-Meteo — it never goes
// down. The keyless helpers (BigDataCloud/Nominatim geocoding, the 5×5
// Open-Meteo local radar map and Wikipedia place names) are used in both
// modes, because WeatherAPI.com's free plan has no 15-minute data or grid.

// WeatherAPI.com condition codes (1000–1282) translated into the WMO codes
// the rest of this file understands (mapWeatherCodeToCondition, SNOW_CODES,
// HAIL_CODES, alert thresholds). Sleet maps into the snow-alert family and
// ice pellets (WeatherAPI's closest match to hail) into the hail-alert
// family, because the app's alert taxonomy is rain / hail / snow.
const WAPI_TO_WMO = {
  1000: 0, 1003: 2, 1006: 3, 1009: 3,
  1012: 45, 1015: 45, 1018: 45, 1021: 45, 1024: 45, 1027: 45,
  1030: 45, 1033: 45, 1036: 45, 1039: 45, 1042: 45, 1045: 45, 1048: 45,
  1135: 45, 1147: 48,
  1063: 61, 1180: 61, 1183: 61,
  1150: 51, 1153: 53, 1168: 56, 1171: 57,
  1186: 63, 1189: 63, 1192: 65, 1195: 65, 1198: 66, 1201: 67,
  1240: 80, 1243: 81, 1246: 82,
  1066: 71, 1114: 71, 1210: 71, 1213: 73, 1216: 73, 1219: 75,
  1222: 75, 1225: 75, 1117: 75,
  1204: 85, 1207: 85, 1249: 85, 1252: 85, 1255: 85, 1258: 86, 1279: 86, 1282: 86,
  1237: 96, 1261: 96, 1264: 96,
  1087: 95, 1273: 95, 1276: 95
};

function mapWapiCodeToWmo(code) {
  return WAPI_TO_WMO[code] ?? 3; // unknown → Cloudy
}

function isWeatherApiEnabled() {
  return String(process.env.WEATHERAPI_KEY || '').trim().length > 0;
}

// WeatherAPI times look like "2026-09-05 14:00" (location-local, space
// separated). Parse them into absolute minutes: every subtraction compares
// values parsed the same way, so the machine's timezone cancels out.
// Formatting goes back through the same parse, so the round-trip is exact.
function parseWapiTimeMinutes(value) {
  const parsed = Date.parse(String(value || '').trim().replace(' ', 'T'));
  return Number.isFinite(parsed) ? Math.round(parsed / 60000) : null;
}

function formatWapiTimeMinutes(absMinutes) {
  const date = new Date(absMinutes * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

// Build the 15-minute nowcast timeline (NOWCAST_SLOTS × 15 min = 3 hours)
// from WeatherAPI's hourly steps: every hour is split into four quarter-hour
// slots whose values are LINEARLY INTERPOLATED between the two surrounding
// hours, so the timeline stays smooth and minute-by-minute (the sky strip and
// the red arrival streak don't snap to hour boundaries) and buildAlerts()
// sees the same window as with Open-Meteo's minutely_15.
// forecastDays = data.forecast.forecastday, localNow = location.localtime.
function buildWapiTimeline(forecastDays, localNow) {
  const hourly = [];
  for (const day of (Array.isArray(forecastDays) ? forecastDays : []).slice(0, 2)) {
    for (const hour of (day.hour ?? [])) hourly.push(hour);
  }
  if (!hourly.length) return [];

  const slots = hourly
    .map((hour) => ({ hour, minutes: parseWapiTimeMinutes(hour.time) }))
    .filter((entry) => entry.minutes != null);
  if (!slots.length) return [];
  const byMinutes = new Map(slots.map((s) => [s.minutes, s]));

  let anchor = parseWapiTimeMinutes(localNow);
  if (anchor == null) anchor = slots[0].minutes;
  const start = Math.floor(anchor / NOWCAST_SLOT_MINUTES) * NOWCAST_SLOT_MINUTES;

  const timeline = [];
  for (let i = 0; i < NOWCAST_SLOTS; i += 1) {
    const at = start + i * NOWCAST_SLOT_MINUTES;
    // The hour bucket that contains this 15-minute slot.
    const entry = slots.find((s) => at >= s.minutes && at < s.minutes + 60);
    if (!entry) break;
    const hour = entry.hour;
    // WeatherAPI only provides hourly steps, but the UI (sky strip, red
    // arrival streak) expects smooth 15-minute values — linearly interpolate
    // between this hour and the next instead of repeating flat quarters.
    // next/lerp are computed FIRST: the previous order referenced them above
    // their const declarations, a temporal-dead-zone ReferenceError that
    // crashed every WeatherAPI nowcast build and silently forced the
    // Open-Meteo fallback.
    const next = byMinutes.get(entry.minutes + 60);
    const f = next ? (at - entry.minutes) / 60 : 0;
    const lerp = (a, b) =>
      next && typeof a === 'number' && typeof b === 'number' ? a + (b - a) * f : a;
    const wmo = mapWapiCodeToWmo(hour.condition?.code ?? 1000);
    const slotTemp = Math.round(lerp(hour.temp_c ?? 0, next?.hour.temp_c ?? 0));
    const isDay = (hour.is_day ?? 1) === 1;
    const cloudCover = Math.round(lerp(hour.cloud ?? 0, next?.hour.cloud ?? 0));
    // Amount and chance FIRST, because the icon must agree with them: this
    // quarter-hour's millimetres come from the hourly mm/h (÷ 4), rounded to the
    // same 0.1 mm step shown in the UI, so the  value and the icon agree.
    const precipMm = Math.round((lerp(hour.precip_mm ?? 0, next?.hour.precip_mm ?? 0) / 4) * 10) / 10;
    let precipProb = Math.round(Math.max(
      lerp(hour.chance_of_rain ?? 0, next?.hour.chance_of_rain ?? 0),
      lerp(hour.chance_of_snow ?? 0, next?.hour.chance_of_snow ?? 0)
    ));
    // 🌙 As in buildNowcast: a dry, near-cloudless slot that turns into
    // "Clear Night" gets an honest 0 % overnight chance instead of a leftover
    // daytime "rain nearby" percentage.
    if (isDay === false && precipProb >= SLOT_RAIN_PROB_MIN && precipMm < SLOT_RAIN_MIN_MM
      && cloudCover < SLOT_PARTLY_COVER) {
      precipProb = 0;
    }
    // 🌙 Clear sky at night shows the moon — the sun cannot shine after dark.
    // 🌤️ And no slot claims rain when nothing is expected to land: WeatherAPI's
    // "Patchy rain nearby" hours (0.01–0.03 mm, 17 % chance) read as the sky
    // that is really overhead instead of 🌧️ on every quarter-hour.
    const mapped = honestSlotWeather(wmo, slotTemp, isDay, precipMm, precipProb, cloudCover);
    const time = formatWapiTimeMinutes(at);
    timeline.push({
      time,
      label: time.slice(11, 16),
      condition: mapped.condition,
      icon: mapped.icon,
      weatherCode: mapped.weatherCode ?? wmo,
      cloudCover,
      isDay,
      temperature: slotTemp,
      feelsLike: Math.round(lerp(hour.feelslike_c ?? hour.temp_c ?? 0, next?.hour.feelslike_c ?? next?.hour.temp_c ?? 0)),
      precipMm,
      precipProb,
      windKmh: Math.round(lerp(hour.wind_kph ?? 0, next?.hour.wind_kph ?? 0)),
      uvIndex: typeof hour.uv === 'number' ? Math.round(hour.uv * 10) / 10 : null,
      uvPct: !isDay ? 0 : Math.max(0, 100 - cloudCover)
    });
  }
  return timeline;
}


function formatDayLabel(dateString, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function degreesToCardinal(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(((degrees % 360) / 22.5)) % 16];
}

function windSpeedToBeaufort(speedKmh) {
  const boundaries = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  for (let i = 0; i < boundaries.length; i += 1) {
    if (speedKmh <= boundaries[i]) return i;
  }
  return 12;
}

function buildForecast(data) {
  const dates = data.daily?.time ?? [];
  const codes = data.daily?.weathercode ?? [];
  const highs = data.daily?.temperature_2m_max ?? [];
  const lows = data.daily?.temperature_2m_min ?? [];
  const feelsHighs = data.daily?.apparent_temperature_max ?? [];
  const feelsLows = data.daily?.apparent_temperature_min ?? [];
  const windMax = data.daily?.wind_speed_10m_max ?? [];
  const windDir = data.daily?.wind_direction_10m_dominant ?? [];
  const humidityMax = data.daily?.relative_humidity_2m_max ?? [];
  const humidityMin = data.daily?.relative_humidity_2m_min ?? [];
  // Day-scale honesty needs the same two numbers the 15-minute rule uses: the
  // whole day's millimetres and its peak chance. Open-Meteo's daily block does
  // not reliably carry them on this call (precipitation fields may be absent),
  // so they are optional — without them honestDayWeather keeps the provider's
  // own icon instead of guessing.
  const precipSum = data.daily?.precipitation_sum ?? [];
  const precipProb = data.daily?.precipitation_probability_max ?? [];
  const cloudMean = data.daily?.cloud_cover_mean ?? data.daily?.cloudcover_mean ?? [];

  return dates.slice(0, 3).map((date, index) => {
    const mapped = honestDayWeather(
      codes[index] ?? 0, highs[index], precipSum[index], precipProb[index], cloudMean[index]
    );
    const maxHum = humidityMax[index];
    const minHum = humidityMin[index];
    const humidity = maxHum != null && minHum != null
      ? Math.round((maxHum + minHum) / 2)
      : Math.round(maxHum ?? minHum ?? 0);
    const windSpeed = Math.round(windMax[index] ?? 0);
    const windDirection = degreesToCardinal(windDir[index] ?? 0);

    return {
      day: formatDayLabel(date, index),
      condition: mapped.condition,
      icon: mapped.icon,
      weatherCode: mapped.weatherCode ?? (codes[index] ?? 0),
      high: highs[index] !== undefined ? Math.round(highs[index]) : null,
      low: lows[index] !== undefined ? Math.round(lows[index]) : null,
      feelsHigh: feelsHighs[index] !== undefined ? Math.round(feelsHighs[index]) : null,
      feelsLow: feelsLows[index] !== undefined ? Math.round(feelsLows[index]) : null,
      humidity,
      windSpeed,
      windDirection,
      beaufort: windSpeedToBeaufort(windSpeed)
    };
  });
}

// ===== 📅 14-day forecast (daily-only, works for any location on Earth) =====
// WeatherAPI.com's free plan caps the forecast at 3 days, so the 14-day tab
// always takes its daily data from keyless Open-Meteo — one daily-only call,
// cached per ~5 km area for 10 minutes so the 30-second auto-refresh costs
// nothing extra. Each entry carries everything the tab needs to show: the
// weather type (condition + WMO code for the icon), max & min temperature,
// wind speed + dominant direction (cardinal + degrees for the arrow) and the
// probability of rain as a % with the expected precipitation in mm.
// build:forecast14-30min-20260919-1 — ⏱️ 30-minute intervals inside the 📅 14-day tab:
// every day now carries `hours`, 48 half-hour slots (00:00, 00:30 … 23:30) with
// temperature, weather condition + WMO code (icon), wind speed + direction +
// Beaufort force, chance of rain % and chance of sunshine % (100 − cloud cover
// while the sun is up, 0 at night), plus precipitation mm. Open-Meteo only
// serves true hourly steps, so the :30 slots are linearly interpolated between
// the two neighbouring hours (wind direction via circular vector averaging;
// the weather code is picked, not averaged — the wetter neighbour wins).
const FORECAST14_DAYS = 14;
const FORECAST14_SLOT_MINUTES = 30;
const FORECAST14_SLOTS_PER_DAY = 48;
const FORECAST14_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const forecast14Cache = new Map();              // "lat,lon" (≈0.05°) → { at, data }
const FORECAST14_CACHE_MAX = 200;

function meanWindDir(a, b) {
  if (a == null) return b == null ? 0 : b;
  if (b == null) return a;
  const rad = (deg) => (deg * Math.PI) / 180;
  const x = Math.cos(rad(a)) + Math.cos(rad(b));
  const y = Math.sin(rad(a)) + Math.sin(rad(b));
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return a;
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Linear interpolation between two hourly values (`null` = unknown: a missing
// side falls back to the known side so one gap never blanks a :30 slot).
function lerpHalfHour(a, b) {
  if (a == null) return b == null ? null : b;
  if (b == null) return a;
  return (a + b) / 2;
}

// Picks the representative weather code for an interpolated :30 slot: codes
// are categorical, so they are picked — never averaged (averaging would invent
// weather that is not there). The slot showing heavier weather (hail/snow over
// rain over drizzle over fog over cloud over clear) wins so brief showers
// survive the interpolation instead of being averaged away.
function pickHalfHourCode(a, b) {
  const codeA = a.code ?? 0;
  const codeB = b.code ?? 0;
  if (codeA === codeB) return codeA;
  const rank = (slot) => {
    if (HAIL_CODES.has(slot.code)) return 60 + (slot.prob ?? 0) / 100 + (slot.mm ?? 0);
    if (SNOW_CODES.has(slot.code) || (slot.snow ?? 0) > 0) return 50 + (slot.prob ?? 0) / 100 + (slot.mm ?? 0);
    if ((slot.mm ?? 0) >= SLOT_RAIN_MIN_MM || (slot.prob ?? 0) >= SLOT_RAIN_PROB_MIN) return 40 + (slot.prob ?? 0) / 100 + (slot.mm ?? 0);
    if ((slot.code ?? 0) >= 51 && (slot.code ?? 0) <= 82) return 30 + (slot.prob ?? 0) / 100;
    if ((slot.code ?? 0) === 45 || (slot.code ?? 0) === 48) return 20;
    return 10 - (slot.cloud ?? 0) / 200;
  };
  return rank(a) >= rank(b) ? codeA : codeB;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Builds the 48 half-hour slots for one calendar day from the location's FULL
// hourly series. Picks the 24 hourly anchors whose local date matches `date`
// (Open-Meteo `hourly.time` is `YYYY-MM-DDTHH:MM` in the requested timezone,
// so a plain prefix compare is exact), then emits :00 straight from the hour
// and :30 interpolated between that hour and the next (the 23:30 slot leans
// on the first hour of the following day when the series reaches that far,
// else it reuses 23:00 — the day always ends with 48 slots). Chance of
// sunshine is 100 − cloud cover while the sun is up and 0 at night, so a
// starry 02:00 can never promise sunshine.
function buildForecast14DaySlots(date, hourly) {
  if (!hourly || !Array.isArray(hourly.time)) return [];
  const idx = [];
  for (let i = 0; i < hourly.time.length; i++) {
    if (typeof hourly.time[i] === 'string' && hourly.time[i].startsWith(date)) idx.push(i);
  }
  // The hourly series may start mid-day (day 1) or end mid-day (day 15 cut at
  // 16 days × 24 h): only build slots when the full 24 anchors are present,
  // otherwise the :30 interpolation would lean on the wrong day.
  if (idx.length < 24) return [];
  const read = (i) => ({
    code: hourly.weather_code?.[i] ?? 0,
    temp: hourly.temperature_2m?.[i] ?? null,
    mm: hourly.precipitation?.[i] ?? 0,
    prob: hourly.precipitation_probability?.[i] ?? 0,
    cloud: hourly.cloud_cover?.[i] ?? 0,
    wind: hourly.wind_speed_10m?.[i] ?? 0,
    dir: hourly.wind_direction_10m?.[i] ?? null,
    day: hourly.is_day?.[i] ?? 1,
    snow: hourly.snowfall?.[i] ?? 0,
  });
  // Anchor AFTER the last hour of this day (first hour of the next day) for
  // the 23:30 interpolation; falls back to 23:00 itself at the series edge.
  const afterIdx = idx[23] + 1 < hourly.time.length ? idx[23] + 1 : idx[23];
  const after = read(afterIdx);
  const slots = [];
  for (let h = 0; h < 24; h++) {
    const cur = read(idx[h]);
    const next = h < 23 ? read(idx[h + 1]) : after;
    const pair = [
      { h, m: 0, a: cur, b: cur, half: false },
      { h, m: 30, a: cur, b: next, half: true },
    ];
    for (const p of pair) {
      const code = p.half ? pickHalfHourCode(p.a, p.b) : p.a.code;
      const tempRaw = p.half ? lerpHalfHour(p.a.temp, p.b.temp) : p.a.temp;
      const temp = tempRaw == null ? null : Math.round(tempRaw);
      const mm = Math.round((p.half ? lerpHalfHour(p.a.mm, p.b.mm) ?? 0 : p.a.mm) * 100) / 100;
      const rainProbRaw = p.half ? lerpHalfHour(p.a.prob, p.b.prob) : p.a.prob;
      const rainProb = rainProbRaw == null ? null : Math.round(rainProbRaw);
      const cloudRaw = p.half ? lerpHalfHour(p.a.cloud, p.b.cloud) : p.a.cloud;
      const cloud = cloudRaw == null ? 0 : Math.round(cloudRaw);
      const windRaw = p.half ? lerpHalfHour(p.a.wind, p.b.wind) : p.a.wind;
      const windSpeed = Math.round(windRaw ?? 0);
      const dirRaw = p.half ? meanWindDir(p.a.dir, p.b.dir) : (p.a.dir ?? 0);
      const windDeg = Math.round(((dirRaw % 360) + 360) % 360);
      const isDay = (p.half ? (p.b.day ?? p.a.day) : p.a.day) === 0 ? false : true;
      const snowRaw = p.half ? lerpHalfHour(p.a.snow, p.b.snow) : p.a.snow;
      const snow = Math.round((snowRaw ?? 0) * 100) / 100;
      const honest = honestSlotWeather(code, temp ?? 0, isDay ? 1 : 0, mm, rainProb ?? 0, cloud, snow);
      const sunProb = isDay ? Math.max(0, Math.min(100, 100 - cloud)) : 0;
      slots.push({
        time: `${pad2(p.h)}:${pad2(p.m)}`,
        temperature: temp,
        condition: honest.condition,
        icon: honest.icon,
        weatherCode: honest.weatherCode,
        windSpeed,
        windDirection: degreesToCardinal(windDeg),
        windDirDeg: windDeg,
        beaufort: windSpeedToBeaufort(windSpeed),
        rainProb,
        sunProb,
        precipMm: mm,
        cloudCover: cloud,
        isDay,
      });
    }
  }
  return slots;
}

function buildForecast14(data) {
  const dates = data.daily?.time ?? [];
  const codes = data.daily?.weathercode ?? [];
  const highs = data.daily?.temperature_2m_max ?? [];
  const lows = data.daily?.temperature_2m_min ?? [];
  const feelsHighs = data.daily?.apparent_temperature_max ?? [];
  const feelsLows = data.daily?.apparent_temperature_min ?? [];
  const windMax = data.daily?.wind_speed_10m_max ?? [];
  const windDir = data.daily?.wind_direction_10m_dominant ?? [];
  const humidityMax = data.daily?.relative_humidity_2m_max ?? [];
  const humidityMin = data.daily?.relative_humidity_2m_min ?? [];
  const rainProb = data.daily?.precipitation_probability_max ?? [];
  const precipSum = data.daily?.precipitation_sum ?? [];
  // Mean cloud cover decides the honest fallback sky when a rain code meets a
  // dry day. Open-Meteo changed the field name over time (cloudcover_mean →
  // cloud_cover_mean), so accept both; without it the provider icon is kept.
  const cloudMean = data.daily?.cloud_cover_mean ?? data.daily?.cloudcover_mean ?? [];

  return dates.slice(0, FORECAST14_DAYS).map((date, index) => {
    const mapped = honestDayWeather(
      codes[index] ?? 0, highs[index], precipSum[index], rainProb[index], cloudMean[index]
    );
    const maxHum = humidityMax[index];
    const minHum = humidityMin[index];
    const humidity = maxHum != null && minHum != null
      ? Math.round((maxHum + minHum) / 2)
      : Math.round(maxHum ?? minHum ?? 0);
    const windSpeed = Math.round(windMax[index] ?? 0);
    const windDeg = typeof windDir[index] === 'number' && Number.isFinite(windDir[index])
      ? Math.round(windDir[index]) % 360
      : null;
    const prob = rainProb[index];
    const mm = precipSum[index];

    return {
      date,
      day: formatDayLabel(date, index),
      condition: mapped.condition,
      icon: mapped.icon,
      weatherCode: mapped.weatherCode ?? (codes[index] ?? 0),
      high: highs[index] !== undefined && highs[index] !== null ? Math.round(highs[index]) : null,
      low: lows[index] !== undefined && lows[index] !== null ? Math.round(lows[index]) : null,
      feelsHigh: feelsHighs[index] !== undefined && feelsHighs[index] !== null ? Math.round(feelsHighs[index]) : null,
      feelsLow: feelsLows[index] !== undefined && feelsLows[index] !== null ? Math.round(feelsLows[index]) : null,
      humidity,
      windSpeed,
      windDirection: degreesToCardinal(windDir[index] ?? 0),
      windDirDeg: windDeg,
      beaufort: windSpeedToBeaufort(windSpeed),
      // 💧 Chance of rain (0–100 %, highest probability of the day) and the
      // total precipitation expected, in mm (1 decimal).
      rainProb: prob != null ? Math.round(prob) : null,
      precipMm: mm != null ? Math.round(mm * 10) / 10 : null,
      // ⏱️ 48 half-hour slots for this day (00:00 … 23:30) with temperature,
      // icon, wind (speed + direction + Beaufort) and rain/sunshine chances.
      // Empty when the hourly series has no full 24 anchors for this date
      // (never blocks the daily row — the row renders regardless).
      hours: buildForecast14DaySlots(date, data.hourly)
    };
  });
}

// Daily + hourly Open-Meteo call for the 14-day tab. Cheap (daily summaries +
// one hourly series for the ⏱️ 30-minute drill-down) and cached — refreshing
// the page every 30 seconds hits the cache, not Open-Meteo. Retried once
// after a short pause, because the same request fans out 25 concurrent 5×5
// local-map cell calls that can trip a transient Open-Meteo rate limit.
// Throws on failure; callers degrade gracefully.
async function fetchDailyForecast14(latitude, longitude) {
  // Cache key rounds to ~0.05° (≈ 5 km) — more than precise enough for a
  // 14-day daily summary, and nearby users share cache entries.
  const latKey = Math.round(latitude * 20) / 20;
  const lonKey = Math.round(longitude * 20) / 20;
  const cacheKey = `${latKey},${lonKey}`;
  const cached = forecast14Cache.get(cacheKey);
  if (cached && Date.now() - cached.at < FORECAST14_CACHE_TTL_MS) return cached.data;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,' +
    'precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,' +
    'relative_humidity_2m_max,relative_humidity_2m_min,cloud_cover_mean' +
    '&hourly=temperature_2m,weather_code,precipitation,precipitation_probability,cloud_cover,' +
    'wind_speed_10m,wind_direction_10m,is_day,snowfall' +
    `&forecast_days=16&timezone=auto`;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let data;
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Open-Meteo 14-day daily HTTP ${response.status}`);
      data = await response.json();
      break;
    } catch (error) {
      if (attempt >= 1) throw error;
      await sleep(800); // brief backoff, then one retry
    }
  }
  const forecast14 = buildForecast14(data);
  forecast14Cache.set(cacheKey, { at: Date.now(), data: forecast14 });
  if (forecast14Cache.size > FORECAST14_CACHE_MAX) {
    const firstKey = forecast14Cache.keys().next().value;
    forecast14Cache.delete(firstKey);
  }
  return forecast14;
}

const NOWCAST_SLOT_MINUTES = 15;   // Open-Meteo minutely_15 resolution
const NOWCAST_SLOTS = 12;          // 12 × 15 min = 3 hours ahead
const STRONG_WIND_KMH = 50;        // ≈ Beaufort 7 — treat >= this as "strong wind" (existing badge)
const STRONG_WIND_ABOVE_BEAUFORT = 4; // user requested alerts for wind *above* Beaufort 4
// Beaufort force 5 starts above 28 km/h (force 4 = 20–28 km/h). We trigger the
// notification whenever the fastest wind in the next 3 hours exceeds that.
const STRONG_WIND_ALERT_KMH = 29;  // ≥ 29 km/h  =>  wind force above Beaufort 4 (Bf 5 starts at 29)  
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]); // freezing snow/sleet fall types
const HAIL_CODES = new Set([96, 99]);                 // hail-bearing thunderstorms

// Snow honesty: snow cannot fall when the air is well above freezing. A snowy
// WMO code at warmer temperatures is a model quirk — those conditions are
// reported as rain so every icon matches its temperature. Wet snow at 0…2 °C
// (SNOW_TOO_WARM_C) is real and keeps its snow icon. Used for the current
// weather, the 3-day forecast, the nowcast slots and the 🛰️ local-map cells;
// the front end applies the same rule (SNOW_TOO_WARM_C in index.html).
const SNOW_TOO_WARM_C = 2;
function honestSnowCondition(code, tempC) {
  if (typeof tempC !== 'number' || tempC <= SNOW_TOO_WARM_C) return null;
  if (!SNOW_CODES.has(code)) return null;
  return { condition: 'Rain', icon: '🌧️' };
}

// ===== 🌤️ Honest daily sky: a day card may only claim precipitation when the
// day as a whole really expects it — at least DAY_RAIN_MIN_MM mm of rain in
// the day, or a DAY_RAIN_PROB_MIN % peak chance. WeatherAPI's daily "Patchy
// rain nearby" (code 1063) is the offender: the provider stamps the *day
// summary* with the worst hourly label, so today can read 🌧️ Rain even while
// the sun shines and every 15-minute slot is dry. When the code and the amount
// disagree, the amount wins and the day reads as the sky overhead — derived
// from the day's own hours (average cloud cover) — exactly like the 15-minute
// honestSlotWeather below, only with day-scale thresholds.
//
// ⚠️ Callers must pass real numbers: a day can only be cleared when its
// precipitation total AND peak chance are both known; if either is missing
// (undefined — Open-Meteo daily blocks do not always carry precipitation
// fields), the provider's own icon is kept instead of guessing from cloud
// cover alone (cloud_cover_mean is a flaky, sometimes-absent field).
const DAY_RAIN_MIN_MM = 1;    // mm per day — less than this never lands
const DAY_RAIN_PROB_MIN = 60; // % — the peak chance that already lights the 💧 badge
// Daily cloud bands (mean daytime cloud cover): like the slot bands, only
// coarser — a whole day hides the sun longer than one passing shower.
const DAY_CLOUDY_COVER = 68;  // % mean cloud → overcast day
const DAY_PARTLY_COVER = 32;  // % mean cloud → sun with clouds
function honestDayWeather(code, tempHighC, precipMmDay, precipProbMax, cloudCoverDay) {
  // Snow honesty first (unchanged): wet snow at 0…2 °C keeps ❄️, a snowy code
  // in warm air is a model quirk and reads as rain.
  const snowFix = honestSnowCondition(code, tempHighC);
  const mapped = snowFix || mapWeatherCodeToCondition(code);
  const result = { condition: mapped.condition, icon: mapped.icon, weatherCode: snowFix ? 61 : code };
  // Bail out early when the evidence is incomplete: without BOTH the day's
  // total millimetres and its peak chance, a wet code cannot be disproven —
  // and without cloud cover there is no honest fallback sky either.
  const hasAmount = typeof precipMmDay === 'number' && Number.isFinite(precipMmDay);
  const hasChance = typeof precipProbMax === 'number' && Number.isFinite(precipProbMax);
  const cover = typeof cloudCoverDay === 'number' && Number.isFinite(cloudCoverDay) ? cloudCoverDay : null;
  if (cover == null || !hasAmount || !hasChance) return result;
  const expected = precipMmDay >= DAY_RAIN_MIN_MM || precipProbMax >= DAY_RAIN_PROB_MIN;
  const claimsWet = WET_CODES.has(code);
  // Real rain expected but the code says "clear sky": the amount wins — the
  // same mirror rule as honestSlotWeather.
  if (expected && !claimsWet) return { condition: 'Showers', icon: '🌦️', weatherCode: 51 };
  // Rain code, dry day: read the sky overhead from the day's own cloud cover.
  // Cold-air snow is untouched (same exception as the 15-minute rule).
  const coldSnow = SNOW_CODES.has(code) && !snowFix;
  if (claimsWet && !expected && !coldSnow) {
    if (cover >= DAY_CLOUDY_COVER) return { condition: 'Cloudy', icon: '☁️', weatherCode: 3 };
    if (cover >= DAY_PARTLY_COVER) return { condition: 'Partly Cloudy', icon: '⛅', weatherCode: 2 };
    return { condition: 'Clear', icon: '☀️', weatherCode: 0 };
  }
  return result;
}

// ===== 🌤️ Honest short-range sky: the icon must match what is falling =====
// An icon may only claim precipitation when precipitation is really expected:
// an amount from 0.1 mm per 15-minute slot up, or a ≥ 60 % chance — the same
// rule the 💧 rain badge, the alert engine and the front-end sky strip
// (LOCALMAP_PRECIP_PROB_PCT in index.html) already use. WeatherAPI's "Patchy
// rain nearby" (code 1063) is the classic offender: the rain is in the
// neighbourhood, the hour reports 0.01–0.03 mm and a 17 % chance, yet it used
// to map to WMO 61 and paint 🌧️ on every 15-minute slot while the sun was
// shining through the clouds. When the code and the amount disagree, the
// amount wins and the sky that is really overhead (cloud cover) decides the
// icon — exactly like the 🛰️ top-down map, which already refuses to paint rain
// below its trace threshold.
const SLOT_RAIN_MIN_MM = 0.1;      // mm per 15 min — less than this never lands
const SLOT_RAIN_PROB_MIN = 60;     // % — the chance that already lights the 💧 badge
const SLOT_CLOUDY_COVER = 80;      // % cloud cover → overcast
const SLOT_PARTLY_COVER = 40;      // % cloud cover → sun with clouds (same split as the 🛰️ map)
// WMO codes whose icon claims precipitation is falling right now.
const WET_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);

// Returns { condition, icon, weatherCode } for one short-range slot (15-minute
// nowcast step, local-map cell or "now"), with icon and code always agreeing —
// the front end prefers the code over the text when it re-derives an icon.
// precipMm is the amount in the 0.1 mm step the UI shows, so "0.1 mm" on screen
// and a rain icon always come together. snowfall is the slot's snowfall in cm —
// it counts as precipitation too, so snow that is really falling is never hidden.
function honestSlotWeather(code, tempC, isDay, precipMm, precipProb, cloudCover, snowfall) {
  // Snow honesty first (unchanged): wet snow at 0…2 °C keeps ❄️, a snowy code
  // in warm air is a model quirk and reads as rain.
  const snowFix = honestSnowCondition(code, tempC);
  const mapped = snowFix || mapWeatherCodeToCondition(code, isDay);
  const result = { condition: mapped.condition, icon: mapped.icon, weatherCode: snowFix ? 61 : code };
  const expected = (typeof precipMm === 'number' && precipMm >= SLOT_RAIN_MIN_MM)
    || (typeof snowfall === 'number' && snowfall > 0)
    || (typeof precipProb === 'number' && precipProb >= SLOT_RAIN_PROB_MIN);
  const claimsWet = WET_CODES.has(code);

  // Precipitation is expected but the code says "clear sky": the amount wins —
  // a sunny slot in the middle of a shower would be just as wrong.
  if (expected && !claimsWet) return { condition: 'Showers', icon: '🌦️', weatherCode: 51 };

  // The code claims rain / snow but nothing is expected to land: show the sky
  // that is really overhead instead of rain while the sun shines through.
  // Exception — real snow in freezing air: providers routinely report 0 mm for
  // snowfall (WeatherAPI hourly precip_mm), and snow at −3 °C is no quibble, so
  // a snowy code in cold air keeps ❄️. Warm-air "snow" was already turned into
  // rain above, and that one is still judged by its amount.
  const coldSnow = SNOW_CODES.has(code) && !snowFix;
  if (claimsWet && !expected && !coldSnow) {
    const cover = typeof cloudCover === 'number' && Number.isFinite(cloudCover) ? cloudCover : null;
    if (cover == null) return result; // no cloud data → keep the provider's own icon
    if (cover >= SLOT_CLOUDY_COVER) return { condition: 'Cloudy', icon: '☁️', weatherCode: 3 };
    if (cover >= SLOT_PARTLY_COVER) return { condition: 'Partly Cloudy', icon: '⛅', weatherCode: 2 };
    return isDay === false
      ? { condition: 'Clear Night', icon: '🌙', weatherCode: 0 }
      : { condition: 'Clear', icon: '☀️', weatherCode: 0 };
  }

  return result;
}

// Build a machine-readable list of active weather alerts for the next 3 hours.
// `timeline` is the array of 15-minute slots from buildNowcast().
function buildAlerts(timeline) {
  const alerts = [];
  const rainFound = timeline.some((slot) => slot.precipMm > 0 || slot.precipProb >= 60);
  const hailFound = timeline.some((slot) => HAIL_CODES.has(slot.weatherCode));
  const snowFound = timeline.some((slot) => SNOW_CODES.has(slot.weatherCode));
  const maxWindKmh = timeline.reduce((max, slot) => Math.max(max, slot.windKmh || 0), 0);
  const maxBeaufort = windSpeedToBeaufort(maxWindKmh);
  const windFound = maxWindKmh >= STRONG_WIND_ALERT_KMH; // > 28 km/h ⇒ above Beaufort 4

  if (rainFound) alerts.push({ type: 'rain', label: 'Rain', emoji: '🌧️' });
  // 🧊 Same hail icon as the front end's nowcast badge, the 🛰️ map, its legend
  // chip and the icon reference table — hail is never 🌨️ (that is freezing rain).
  if (hailFound) alerts.push({ type: 'hail', label: 'Hail', emoji: '🧊' });
  if (snowFound) alerts.push({ type: 'snow', label: 'Snow', emoji: '❄️' });
  if (windFound) alerts.push({
    type: 'strongWind',
    label: `Wind > Bf ${STRONG_WIND_ABOVE_BEAUFORT}`,
    emoji: '💨',
    maxWindKmh,
    maxBeaufort
  });

  return {
    alerts,
    summary: {
      hasRain: rainFound,
      hasHail: hailFound,
      hasSnow: snowFound,
      strongWind: windFound,            // above Beaufort 4 (> 28 km/h)
      strongWindAbove4: windFound,      // explicit alias matching the request wording
      maxWindKmh,
      maxBeaufort,
      trigger: rainFound || hailFound || snowFound || windFound
    }
  };
}

// Short-range alert check for a coordinate pair (used by the push-notification
// service for every subscribed user, wherever they are on Earth). Uses
// WeatherAPI.com when WEATHERAPI_KEY is set; otherwise (or on any error) it
// falls back to the keyless Open-Meteo minutely_15 forecast.
async function checkAlertsForCoords(latitude, longitude) {
  if (isWeatherApiEnabled()) {
    try {
      const apiKey = String(process.env.WEATHERAPI_KEY).trim();
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(apiKey)}&q=${latitude},${longitude}&days=2&aqi=no&alerts=no`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!response.ok) throw new Error(`WeatherAPI HTTP ${response.status}`);
      const data = await response.json();
      const timeline = buildWapiTimeline(data.forecast?.forecastday, data.location?.localtime);
      if (timeline.length) return buildAlerts(timeline);
    } catch (error) {
      console.warn('WeatherAPI alert check failed, falling back to Open-Meteo.', error);
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&minutely_15=weather_code,precipitation,precipitation_probability,wind_speed_10m&forecast_minutely_15=${NOWCAST_SLOTS}&timezone=auto`;
  const response = await fetch(url, { signal: timeoutSignal(UPSTREAM_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const data = await response.json();
  const m15 = data.minutely_15;

  if (!m15 || !Array.isArray(m15.time)) {
    return { alerts: [], summary: { hasRain: false, hasHail: false, hasSnow: false, strongWind: false, strongWindAbove4: false, maxWindKmh: 0, maxBeaufort: 0, trigger: false } };
  }

  const timeline = m15.time.slice(0, NOWCAST_SLOTS).map((time, i) => ({
    weatherCode: m15.weather_code?.[i] ?? 0,
    precipMm: Math.round((m15.precipitation?.[i] ?? 0) * 10) / 10,
    precipProb: Math.round(m15.precipitation_probability?.[i] ?? 0),
    windKmh: Math.round(m15.wind_speed_10m?.[i] ?? 0)
  }));

  return buildAlerts(timeline);
}

// Build a short-range "next 3 hours" minute-by-minute nowcast from the
// minutely_15 forecast, plus a human summary (rain / hail / sun / strong wind)
// and the total expected precipitation in millimetres.
function buildNowcast(data) {
  const m15 = data.minutely_15;
  const empty = {
    timeline: [],
    summary: {
      hasRain: false,
      hasHail: false,
      hasSnow: false,
      hasSun: false,
      strongWind: false,
      strongWindAbove4: false,
      totalPrecipMm: 0,
      maxWindKmh: 0,
      maxBeaufort: 0,
      trigger: false
    },
    alerts: [],
    note: 'Precipitation nowcast is temporarily unavailable.'
  };
  if (!m15 || !Array.isArray(m15.time)) return empty;

  const slices = m15.time.slice(0, NOWCAST_SLOTS);
  const timeline = slices.map((time, i) => {
    const code = m15.weather_code?.[i] ?? 0;
    const slotTemp = Math.round(m15.temperature_2m?.[i] ?? 0);
    // is_day: 1 = day, 0 = night. Missing data counts as DAY (same default as
    // every other is_day read in this file) — a wrong moon in daylight would
    // be worse than a sun in unknown conditions.
    const isDay = (m15.is_day?.[i] ?? 1) === 1;
    // 🌙 Clear sky at night shows the moon — the sun cannot shine after dark.
    // 🌤️ And an icon only claims rain / snow when something is really expected
    // to land (honestSlotWeather): "rain nearby" with 0.03 mm and a 17 % chance
    // must not paint 🌧️ on all twelve 15-minute slots. The amount used is the
    // one shown to the user (0.1 mm steps), so the 💧 value and the icon always
    // tell the same story.
    const precipMm = Math.round((m15.precipitation?.[i] ?? 0) * 10) / 10;
    let precipProb = Math.round(m15.precipitation_probability?.[i] ?? 0);
    const cloudCover = m15.cloud_cover?.[i];
    // 🌙 the honest sky can now flip a slot to "Clear Night" (weatherCode 0),
    // so give the front end a matching overnight chance: a dry, ≤ 40 %-cloud
    // slot stays dry in the evening but gets an honest 0 % chance after dark.
    if (isDay === false && precipProb >= SLOT_RAIN_PROB_MIN && precipMm < SLOT_RAIN_MIN_MM) {
      if (typeof cloudCover === 'number' && cloudCover < SLOT_PARTLY_COVER) precipProb = 0;
    }
    const mapped = honestSlotWeather(code, slotTemp, isDay, precipMm, precipProb, cloudCover, m15.snowfall?.[i]);
    // SUN % (shown with the sun icon in the 15-minute slots): how much the sun
    // is actually shining. Clear sky (sun fully visible) -> 100%, clouds block
    // the sun -> lower %, night -> 0%. Cloud cover is the direct measure of
    // "is the sun visible"; the raw WHO UV index is kept for the tooltip.
    const uvIndex = Math.round((m15.uv_index?.[i] ?? 0) * 10) / 10;
    const uvClearSky = m15.uv_index_clear_sky?.[i] ?? 0;
    let uvPct;
    if (!isDay) {
      uvPct = 0; // night: no sun at all
    } else if (typeof cloudCover === 'number') {
      uvPct = Math.max(0, 100 - Math.round(cloudCover));
    } else if (uvClearSky > 0) {
      uvPct = Math.min(100, Math.round((uvIndex / uvClearSky) * 100)); // fallback if cloud data missing
    } else {
      uvPct = Math.min(100, Math.round((uvIndex / 11) * 100)); // last resort: WHO max scale
    }
    return {
      time,
      label: String(time).slice(11, 16), // "HH:MM"
      condition: mapped.condition,
      icon: mapped.icon,
      weatherCode: mapped.weatherCode ?? code,
      cloudCover: Math.round(cloudCover ?? 0),
      isDay,
      temperature: slotTemp,
      feelsLike: Math.round(m15.apparent_temperature?.[i] ?? m15.temperature_2m?.[i] ?? 0),
      precipMm,
      precipProb,
      windKmh: Math.round(m15.wind_speed_10m?.[i] ?? 0),
      uvIndex,
      uvPct,
    };
  });

  const totalPrecipMm = Math.round(
    timeline.reduce((sum, slot) => sum + (slot.precipMm || 0), 0) * 10
  ) / 10;
  const maxWindKmh = timeline.reduce((max, slot) => Math.max(max, slot.windKmh || 0), 0);
  const alertInfo = buildAlerts(timeline);

  return {
    timeline,
    alerts: alertInfo.alerts,
    summary: {
      hasRain: alertInfo.summary.hasRain,
      hasHail: alertInfo.summary.hasHail,
      hasSnow: alertInfo.summary.hasSnow,
      // ☀️ Sun badge: only when a clear slot is actually in daylight — the sun
      // does not shine at night, so a starry clear sky must not light it up.
      hasSun: timeline.some((slot) => (slot.weatherCode === 0 || slot.weatherCode === 1) && slot.isDay !== false),
      strongWind: maxWindKmh >= STRONG_WIND_KMH,
      strongWindAbove4: alertInfo.summary.strongWindAbove4,
      totalPrecipMm,
      maxWindKmh,
      maxBeaufort: alertInfo.summary.maxBeaufort,
      trigger: alertInfo.summary.trigger
    },
    note: timeline.length ? '' : 'Precipitation forecast is unavailable for the next 3 hours.'
  };
}

// ===== 🛰️ Local top-down weather map ("viewed from above") =====
// A bird's-eye radar screen for the area around the user's location: a 5×5 grid
// of Open-Meteo forecast points around the current coordinates. Every cell
// carries a current-weather snapshot so the front end can paint clouds, rain,
// snow and hail showers across the local map.
const LOCAL_MAP_GRID = 5;           // 5×5 grid = 25 points around the location
const LOCAL_MAP_STEP_DEG = 0.25;    // spacing between grid points (≈ ±0.5° ≈ 40–55 km)
const LOCAL_MAP_CACHE_TTL_MS = 10 * 60 * 1000;
const LOCAL_MAP_SLOTS = 13;         // 13 × 15 min = 0…180 min ahead (Now → +3h)
// Trace-drizzle threshold: amounts below this are the model wetting the air,
// not rain you would feel. They get their own faint drizzle cell type so the
// map can tell a sun shower apart from a downpour. Keep in sync with
// LOCALMAP_RAIN_MIN_MM in index.html (localMapClassify).
const LOCAL_MAP_RAIN_MIN_MM = 0.3;

// Cached by rounded coordinates: the top-down view changes slowly, and this keeps
// the 25 sub-requests off Open-Meteo on every 30-second page refresh while the
// serverless instance stays warm.
const localMapCache = new Map();

function classifyLocalCell(code, precipitation, snowfall, cloudCover) {
  if (HAIL_CODES.has(code)) return 'hail';
  if (SNOW_CODES.has(code) || snowfall > 0) return 'snow';
  if (precipitation >= LOCAL_MAP_RAIN_MIN_MM) return 'rain';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  // Drizzle codes (51–57) or any trace amount above zero → a faint drizzle haze.
  if ((code >= 51 && code <= 57) || precipitation > 0) return 'drizzle';
  if (code === 45 || code === 48) return 'fog';
  if (cloudCover >= 40) return 'clouds';
  return 'clear';
}

async function fetchLocalCell(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,apparent_temperature,weather_code,precipitation,snowfall,cloud_cover,wind_speed_10m,wind_direction_10m,is_day' +
    '&minutely_15=temperature_2m,apparent_temperature,weather_code,precipitation,precipitation_probability,cloud_cover,snowfall,wind_speed_10m,wind_direction_10m,is_day' +
    `&forecast_minutely_15=${LOCAL_MAP_SLOTS}&timezone=auto`;
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Local cell HTTP ${response.status}`);
  const data = await response.json();
  const current = data.current ?? {};
  const m15 = data.minutely_15 || {};
  const weatherCode = current.weather_code ?? 0;
  const precipitation = Math.round((current.precipitation ?? 0) * 10) / 10;
  const snowfall = Math.round((current.snowfall ?? 0) * 10) / 10;
  const cloudCover = Math.round(current.cloud_cover ?? 0);
  const windSpeed = Math.round(current.wind_speed_10m ?? 0);
  const windDirection = Math.round(current.wind_direction_10m ?? 0);
  const temp = Math.round(current.temperature_2m ?? 0);
  let mapped = honestSlotWeather(weatherCode, temp, (current.is_day ?? 1) === 1, precipitation, null, cloudCover, snowfall);
  // 🌙 Clear sky at night shows the moon on the top-down map as well — the sun
  // cannot shine after dark (classifyLocalCell still returns the same 'clear'
  // type, so nothing is painted, only the icon changes).
  // 🌤️ The blob type is derived from the HONEST code (honestSlotWeather), so
  // the painted blob always matches the icon: a "rain nearby" cell with a
  // trace amount gets the faint drizzle haze the amount deserves instead of a
  // vivid rain blob over a sunlit landscape, while snow that is really falling
  // (snowfall > 0) keeps its rain/snow blob — honestSlotWeather already folds
  // warm-air snow (SNOW_TOO_WARM_C) into code 61 rain.
  // Snow honesty: only a HONEST snow code paints snow, so warm-air snow (code
  // 73 at 17 °C, folded into rain by honestSlotWeather) cannot leave a white
  // snow blob under a rain icon (matching the front-end localMapFrameCell).
  const typeSnow = SNOW_CODES.has(mapped.weatherCode) ? snowfall : 0;
  let type = classifyLocalCell(mapped.weatherCode, precipitation, typeSnow, cloudCover);

  // Compact 15-minute forecast series (0…180 min) so the front end can show
  // every cell of the radar moving forward in time. Stored as parallel arrays
  // (not objects) to keep the JSON payload small for 25 cells × 13 slots.
  const slotCount = Math.min(LOCAL_MAP_SLOTS, Array.isArray(m15.time) ? m15.time.length : 0);
  const series = { times: [], codes: [], day: [], precip: [], prob: [], cloud: [], snow: [], temps: [], feels: [], wind: [], windDir: [] };
  for (let i = 0; i < slotCount; i += 1) {
    const slotCode = m15.weather_code?.[i] ?? 0;
    const slotTemp = Math.round(m15.temperature_2m?.[i] ?? 0);
    const slotIsDay = (m15.is_day?.[i] ?? 1) === 1;
    const slotPrecip = Math.round((m15.precipitation?.[i] ?? 0) * 10) / 10;
    const slotProb = Math.round(m15.precipitation_probability?.[i] ?? 0);
    const slotCloud = Math.round(m15.cloud_cover?.[i] ?? 0);
    // 🌤️ The stored code is the HONEST code (honestSlotWeather), so the future
    // frames of this cell — which the front end turns into icons and blob types
    // straight from these codes — cannot show rain over a sunlit cell either.
    series.times.push(m15.time[i] || '');
    series.codes.push(honestSlotWeather(slotCode, slotTemp, slotIsDay, slotPrecip, slotProb, slotCloud, m15.snowfall?.[i]).weatherCode);
    series.day.push(m15.is_day?.[i] ?? 1);
    series.precip.push(slotPrecip);
    series.prob.push(slotProb);
    series.cloud.push(slotCloud);
    series.snow.push(Math.round((m15.snowfall?.[i] ?? 0) * 10) / 10);
    series.temps.push(slotTemp);
    series.feels.push(Math.round(m15.apparent_temperature?.[i] ?? m15.temperature_2m?.[i] ?? 0));
    series.wind.push(Math.round(m15.wind_speed_10m?.[i] ?? 0));
    series.windDir.push(Math.round(m15.wind_direction_10m?.[i] ?? 0));
  }

  return {
    lat: Math.round(latitude * 100) / 100,
    lon: Math.round(longitude * 100) / 100,
    type,
    condition: mapped.condition,
    icon: mapped.icon,
    weatherCode: mapped.weatherCode ?? weatherCode,
    temp,
    feels: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
    precipitation,
    snowfall,
    cloudCover,
    wind_speed: windSpeed,
    wind_direction: windDirection,
    beaufort: windSpeedToBeaufort(windSpeed),
    series
  };
}

async function buildLocalMap(latitude, longitude) {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const now = Date.now();
  // Keep the cache bounded: drop expired entries, then evict the oldest keys.
  if (localMapCache.size >= 24) {
    for (const [k, v] of localMapCache) {
      if (now - v.t >= LOCAL_MAP_CACHE_TTL_MS) localMapCache.delete(k);
    }
    while (localMapCache.size >= 24) {
      localMapCache.delete(localMapCache.keys().next().value);
    }
  }
  const cached = localMapCache.get(key);
  if (cached && now - cached.t < LOCAL_MAP_CACHE_TTL_MS) {
    return { cells: cached.cells, cached: true };
  }

  const half = Math.floor(LOCAL_MAP_GRID / 2);
  const requests = [];
  for (let dy = -half; dy <= half; dy += 1) {
    for (let dx = -half; dx <= half; dx += 1) {
      requests.push(
        fetchLocalCell(latitude + dy * LOCAL_MAP_STEP_DEG, longitude + dx * LOCAL_MAP_STEP_DEG).catch(() => null)
      );
    }
  }
  const results = await Promise.all(requests);
  const cells = results.filter(Boolean);
  if (!cells.length) {
    return { cells: [], note: 'Top-down weather map is temporarily unavailable.' };
  }

  localMapCache.set(key, { t: now, cells });
  return { cells };
}

// ===== 🏙️ Nearby places (city / village / hamlet names for the map) =====
// Wikipedia's geosearch API is fast, free and keyless — it returns every geo-
// coded Wikipedia article near a point. We fan out a ring of nine overlapping
// 10 km circles around the location (that's the API's max radius, so we query
// the centre plus the four compass points and the four corners), drop the
// non-settlement articles (stations, windmills, canals …), and hand the rest
// to the front end so it can draw crisp real place names (Vlaardingen,
// Schiedam, Maassluis …) on the bird's-eye radar. Place names barely change,
// so the result is cached for 12 hours.
const NEARBY_PLACES_MAX = 16;                    // most labels a phone screen can show legibly
const NEARBY_PLACES_RADIUS_KM = 10000;           // Wikipedia geosearch max radius, in metres
const NEARBY_PLACES_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const nearbyPlacesCache = new Map();

function approxKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * 111.2;
  const dLon = (lon2 - lon1) * 111.2 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

// Wikipedia titles that are clearly not settlements (stations, monuments,
// squares, streets, businesses …). The regex is deliberately simple — a false
// negative just drops one label, never a crash.
const PLACE_TITLE_NOISE =
  /(rail|metro|tram|station|railway|airport|\bport\b|harbour|harbor|bridge|canal|rver|stream|creek|molen|windmill|kerk|church|chapel|cathedral|basilica|monastery|convent|mosque|synagogue|temple|museum|theatre|theater|archive|library|school|college|university|campus|prison|hospital|clinic|stadium|arena|\bpark\b|garden|zoo\b|wood\b|heath\b|marsh|island|peninsula|mountain|\bhills?\b|forest|district|neighbourhood|neighborhood|square|\bplein\b|plein|\bpark\b|park|polder|haven|weg\b|tower|building|town hall|city hall|mansion|villa|palace|castle|fort\b|wall\b|memorial|monument|statue|battle|war\b|bombing|bombardment|accident|disaster|attack|incident|cemetery|tunnel|weir|\bdam\b|viaduct|elevator|\bcrane\b|\bbar\b|restaurant|cafe|factory|power station|\bplant\b|marina|yacht|\bship\b|aircraft|atlas|\bparking\b|\bstreet\b|\broad\b|singel|baan|toren|festival|trade|cleanup|\bfood\b|\blabs?\b|foundation|company|\bcentre\b|\bcenter\b|institute|hotel\b|\binn\b|\bstore\b|\bshop\b|bistro|grill|offices?|apartments?|sports?|basketball|football|hockey|soccer|rugby|cricket|golf|tennis|racing|marathon|\bclub\b|\bteam\b)/i;

async function fetchNearbyPlaces(latitude, longitude) {
  // The API caps the search radius at 10 km, so we query nine overlapping
  // circles (~15 km apart) whose union covers the whole local-map area.
  const dLat = NEARBY_PLACES_RADIUS_KM / 111200;
  const dLon = NEARBY_PLACES_RADIUS_KM / (111200 * Math.cos(latitude * Math.PI / 180));
  const corners = 0.72;   // diagonal offset ≈ 10.8 km, keeps the circles overlapping
  const offsets = [
    [0, 0],
    [dLat, 0], [-dLat, 0], [0, dLon], [0, -dLon],
    [dLat * corners, dLon * corners], [dLat * corners, -dLon * corners],
    [-dLat * corners, dLon * corners], [-dLat * corners, -dLon * corners]
  ];

  const results = await Promise.all(offsets.map(async ([dlat, dlon]) => {
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2' +
      `&list=geosearch&gscoord=${(latitude + dlat).toFixed(4)}%7C${(longitude + dlon).toFixed(4)}` +
      `&gsradius=${NEARBY_PLACES_RADIUS_KM}&gslimit=50`;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'AIWeatherStationPWA/1.1 (weather PWA)' },
        signal: AbortSignal.timeout(6000)
      });
      if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
      const json = await response.json();
      return (json.query && json.query.geosearch) || [];
    } catch (error) {
      // One flaky ring shouldn't kill the whole place list — keep the rest.
      return [];
    }
  }));

  const byPageId = new Map();
  for (const list of results) {
    for (const g of list) {
      if (!g.pageid || !g.title || g.lat == null || g.lon == null) continue;
      if (byPageId.has(g.pageid)) continue;

      // Peel disambiguators like "Barendrecht (village)" → "Barendrecht".
      const stripped = String(g.title)
        .replace(/\s*\([^)]*\)\s*$/g, '')
        .replace(/,\s+.+$/g, '')
        .trim();
      if (stripped.length < 2 || stripped.length > 40) continue;
      if (PLACE_TITLE_NOISE.test(stripped)) continue;

      byPageId.set(g.pageid, {
        name: stripped,
        lat: g.lat,
        lon: g.lon,
        kind: 'village',
        population: 0,
        distance: approxKm(latitude, longitude, g.lat, g.lon)
      });
    }
  }

  const filtered = [...byPageId.values()].sort((a, b) => a.distance - b.distance);

  // Greedy spread: pick the nearest places but keep them ≥ ~1.5 km apart so a
  // dense city core doesn't swallow all labels and the villages around it still
  // get a spot on the map.
  const chosen = [];
  for (const p of filtered) {
    if (chosen.length >= NEARBY_PLACES_MAX) break;
    if (chosen.some((c) => approxKm(c.lat, c.lon, p.lat, p.lon) < 1.5)) continue;
    chosen.push(p);
  }

  return chosen.map(({ name, lat, lon, kind, population }) => ({ name, lat, lon, kind, population }));
}

async function getNearbyPlaces(latitude, longitude) {
  // Keyed on 0.1° so people in the same region, a few km apart, share one
  // cached place list instead of re-querying Wikipedia for near-identical areas.
  const key = `${Math.round(latitude * 10)},${Math.round(longitude * 10)}`;
  const now = Date.now();

  const cached = nearbyPlacesCache.get(key);
  if (cached && now - cached.t < (cached.ttl || NEARBY_PLACES_CACHE_TTL_MS)) return cached.places;

  const places = await fetchNearbyPlaces(latitude, longitude);
  // Empty results are only briefly cached (so a transient Wikipedia hiccup
  // doesn't blank the labels for 12 hours, but we also don't retry every call).
  const ttl = places.length > 0 ? NEARBY_PLACES_CACHE_TTL_MS : 60 * 1000;
  nearbyPlacesCache.set(key, { t: Date.now(), places, ttl });
  if (nearbyPlacesCache.size > 32) {
    nearbyPlacesCache.delete(nearbyPlacesCache.keys().next().value); // drop the oldest key
  }
  return places;
}

function buildPrediction(condition, temperature, humidity) {
  const normalized = String(condition || 'Unknown').toLowerCase();
  if (normalized.includes('rain') || normalized.includes('drizzle')) {
    return `Rain is likely later today. Expect ${temperature < 12 ? 'cool and wet' : 'mild showers'} conditions.`;
  }
  if (normalized.includes('snow')) {
    return `Snow is expected to continue, with ${humidity > 80 ? 'heavier cloud cover' : 'a few clear breaks'} through the day.`;
  }
  if (normalized.includes('cloud') || normalized.includes('mist') || normalized.includes('fog')) {
    return 'Cloudy skies are expected, with lingering haze and comfortable temperatures.';
  }
  if (normalized.includes('clear night')) {
    return 'Clear starry night — the moon and stars are out with no clouds in the way.';
  }
  if (normalized.includes('clear') || normalized.includes('sun')) {
    return 'Bright and mostly clear weather is expected today.';
  }
  return `Conditions look mixed with ${temperature >= 20 ? 'warm' : 'cool'} air and ${humidity}% humidity.`;
}

// Thrown when a typed location name cannot be found by ANY geocoder. The
// request handler turns this into a clear HTTP 404 message instead of silently
// serving the default location (which used to leave the globe and the
// "seen from above" map stuck at the previous area with no explanation).
class GeocodeError extends Error {}

// Rank Open-Meteo geocoding candidates: prefer real populated places, bigger
// towns and the closest word match to what the user typed. This stops obscure
// foreign namesakes from winning (e.g. "Den Haag, South Africa" over the
// Dutch The Hague that the user almost certainly means).
function pickBestOpenMeteoResult(candidates, query) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const queryWords = String(query).toLowerCase().split(/[\s,]+/).filter((w) => w.length > 1);
  let best = null;
  let bestScore = -1;
  for (const candidate of candidates) {
    if (candidate.latitude == null || candidate.longitude == null) continue;
    let score = 0;
    if (String(candidate.feature_code || '').startsWith('P')) score += 50;   // populated place
    if (candidate.population) score += Math.min(40, Math.log10(candidate.population) * 6);
    const name = String(candidate.name || '').toLowerCase();
    for (const word of queryWords) {
      if (name === word) score += 30;
      else if (name.startsWith(word)) score += 12;
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

// "The Hague, South Holland, Netherlands" → "The Hague, Netherlands"
function shortenNominatimName(displayName) {
  const parts = String(displayName || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  return `${parts[0]}, ${parts[parts.length - 1]}`;
}

// Rank Nominatim (OpenStreetMap) results: prefer place-type matches (city /
// town / village / hamlet), the closest word match, and higher importance.
function pickBestNominatimResult(results, query) {
  if (!Array.isArray(results) || !results.length) return null;
  const queryWords = String(query).toLowerCase().split(/[\s,]+/).filter((w) => w.length > 1);
  let best = null;
  let bestScore = -1;
  for (const result of results) {
    let score = 0;
    const kind = `${result.category || ''}/${result.type || ''}`;
    if (/place|city|town|village|hamlet|suburb|municipal|island|borough/i.test(kind)) score += 40;
    const name = String(result.name || '').toLowerCase();
    for (const word of queryWords) {
      if (name === word) score += 30;
      else if (name.startsWith(word)) score += 12;
    }
    if (result.importance) score += Math.min(20, result.importance * 20);
    if (score > bestScore) {
      bestScore = score;
      best = result;
    }
  }
  return best;
}

// Geocode cache: avoid wasting Nominatim requests on the same location every
// 30-second auto-refresh. Nominatim rate-limits at 1 req/s and returns 429
// ("Too many requests") when exceeded — without a cache, a busy app would
// hammer the API and get itself blocked, causing landmarks like "Eiffel
// Tower" to fail (the 429 XML error page can't be parsed as JSON, so the
// code falls through to Open-Meteo, which doesn't know landmarks).
const geocodeCache = new Map();
const GEOCODE_CACHE_MAX = 200;

async function geocodeLocation(location) {
  if (!location || !location.trim()) {
    return { latitude: DEFAULT_LATITUDE, longitude: DEFAULT_LONGITUDE, name: DEFAULT_LOCATION };
  }

  const cacheKey = location.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const coords = parseCoordinates(location);
  if (coords) {
    const name = await reverseGeocode(coords.latitude, coords.longitude, location.trim());
    const result = { latitude: coords.latitude, longitude: coords.longitude, name };
    geocodeCache.set(cacheKey, result);
    if (geocodeCache.size > GEOCODE_CACHE_MAX) {
      const firstKey = geocodeCache.keys().next().value;
      geocodeCache.delete(firstKey);
    }
    return result;
  }

  // 1) Nominatim (OpenStreetMap) first — the most complete gazetteer. It knows
  //    small villages, hamlets AND alternate names ("Den Haag" → The Hague,
  //    Netherlands), while the Open-Meteo gazetteer only knows one namesake
  //    per search (which sent "Den Haag" to South Africa). One geocode per
  //    location change is comfortably inside Nominatim's usage policy
  //    (max 1 req/s; the app auto-refreshes at most every 30 s).
  try {
    const encoded = encodeURIComponent(location.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=jsonv2&limit=3&accept-language=en`,
      {
        headers: { 'User-Agent': 'AIWeatherStationPWA/1.2 (personal weather PWA)' },
        signal: AbortSignal.timeout(8000)
      }
    );
    // Only parse JSON on a clean 200. Nominatim returns 403 (blocked) and
    // 429 (rate-limited) with an HTML/XML body that can't be parsed as JSON
    // — trying to do so throws and falls through to Open-Meteo, which
    // doesn't know landmarks. Treat any non-200 as "try the next geocoder".
    if (response.status === 200) {
      const results = await response.json();
      const best = pickBestNominatimResult(results, location);
      if (best) {
        const result = {
          latitude: Number(best.lat),
          longitude: Number(best.lon),
          name: shortenNominatimName(best.display_name)
        };
        geocodeCache.set(cacheKey, result);
        if (geocodeCache.size > GEOCODE_CACHE_MAX) {
          const firstKey = geocodeCache.keys().next().value;
          geocodeCache.delete(firstKey);
        }
        return result;
      }
    } else {
      console.warn(`Nominatim returned HTTP ${response.status} for "${location}".`);
    }
  } catch (error) {
    console.warn('Nominatim geocoding failed.', error);
  }

  // 2) Open-Meteo geocoding fallback (fast, keyless, no rate limits) — ask for
  //    up to 10 candidates and pick the best instead of trusting result #0.
  try {
    const encoded = encodeURIComponent(location.trim());
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=10&language=en&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (response.ok) {
      const data = await response.json();
      const best = pickBestOpenMeteoResult(data.results, location);
      if (best) {
        const result = {
          latitude: best.latitude,
          longitude: best.longitude,
          name: `${best.name}${best.country ? `, ${best.country}` : ''}`
        };
        geocodeCache.set(cacheKey, result);
        if (geocodeCache.size > GEOCODE_CACHE_MAX) {
          const firstKey = geocodeCache.keys().next().value;
          geocodeCache.delete(firstKey);
        }
        return result;
      }
    }
  } catch (error) {
    console.warn('Open-Meteo geocoding failed.', error);
  }

  // 3) Truly unknown place — report it clearly instead of silently showing the
  //    default location (that left the globe + map motionless with no feedback).
  throw new GeocodeError(
    `Location not found: “${location.trim()}” — check the spelling or use “lat, lon” coordinates.`
  );
}

async function fetchWeatherData(location) {
  const geocoded = await geocodeLocation(location);

  // Shared side-data for both providers: the 5×5 top-down local map (built
  // from Open-Meteo minutely_15 — WeatherAPI's free plan has no 15-minute
  // data or grid), the nearby city/village names (Wikipedia geosearch),
  // the 📅 14-day daily forecast (also Open-Meteo — WeatherAPI's free plan
  // caps at 3 days) and the ☀️ solar block (radiation + UV + sunshine).
  // All four are cached server-side, so refreshing the page costs nothing extra.
  const [localMap, nearbyPlaces, dailyForecast14, solar] = await Promise.all([
    buildLocalMap(geocoded.latitude, geocoded.longitude).catch(() => ({ cells: [] })),
    getNearbyPlaces(geocoded.latitude, geocoded.longitude).catch(() => []),
    fetchDailyForecast14(geocoded.latitude, geocoded.longitude).catch(() => []),
    fetchSolarData(geocoded.latitude, geocoded.longitude).catch(() => null)
  ]);

  // Provider routing: WeatherAPI.com first when WEATHERAPI_KEY is set, with
  // an automatic, silent fallback to the keyless Open-Meteo provider.
  if (isWeatherApiEnabled()) {
    try {
      const wapi = await fetchWeatherApiWeather(geocoded);
      return { ...wapi, localMap, nearbyPlaces, forecast14: dailyForecast14, solar: solar || undefined };
    } catch (error) {
      console.warn('WeatherAPI.com fetch failed, falling back to Open-Meteo.', error);
    }
  }

  return fetchOpenMeteoWeather(geocoded, localMap, nearbyPlaces, dailyForecast14, solar);
}

// ===== Provider 1: WeatherAPI.com (keyed) ==============================
// Calls forecast.json for the geocoded coordinates and normalises everything
// into the exact response shape the Open-Meteo provider returns.
async function fetchWeatherApiWeather(geocoded) {
  const apiKey = String(process.env.WEATHERAPI_KEY || '').trim();
  const query = `${geocoded.latitude},${geocoded.longitude}`;
  const url =
    `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(apiKey)}` +
    `&q=${encodeURIComponent(query)}&days=3&aqi=no&alerts=no`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`WeatherAPI HTTP ${response.status}`);
  const data = await response.json();

  const current = data.current ?? {};
  const location = data.location ?? {};
  const forecastDays = data.forecast?.forecastday ?? [];

  // Current conditions — same field semantics as the Open-Meteo path.
  const temperature = Math.round(current.temp_c ?? 0);
  const humidity = Math.round(current.humidity ?? 0);
  const windSpeed = Math.round(current.wind_kph ?? 0);
  const windDirection = current.wind_dir || degreesToCardinal(current.wind_degree ?? 0);
  const feelsLike = Math.round(current.feelslike_c ?? temperature);
  const currentWmo = mapWapiCodeToWmo(current.condition?.code ?? 1000);
  const isDayNow = (current.is_day ?? 1) === 1;
  // Clear sky at night shows the moon (the sun cannot shine after dark) and the
  // hero icon obeys the same honesty rule as the 15-minute slots
  // (honestSlotWeather): WeatherAPI's "Patchy rain nearby" reports 0.03 mm and
  // a 17 % chance, so the sky that is really overhead wins over the rain code.
  // WeatherAPI has no snowfall variable: chance_of_snow carries the snow
  // expectation, so the honest rule uses the larger of the two chances.
  const mapped = honestSlotWeather(
    currentWmo, temperature, isDayNow,
    Math.round((current.precip_mm ?? 0) * 10) / 10,
    Math.max(current.chance_of_rain ?? 0, current.chance_of_snow ?? 0),
    current.cloud ?? 0
  );

  // 3-day forecast (Today / Tomorrow / Day After). The day summary code is the
  // provider's worst-hour label, so it gets the same honesty rule as the
  // 15-minute slots, only with day-scale thresholds: WeatherAPI's daily
  // "Patchy rain nearby" stamps today 🌧️ Rain on 0.51 mm / 45 % while the sun
  // shines. A day only keeps a rain icon on real rain (≥ 1 mm in the day or a
  // ≥ 60 % peak chance); a dry "rain" day reads as the sky overhead, averaged
  // from the day's own daytime hours.
  const forecast = forecastDays.slice(0, 3).map((day, index) => {
    const dayWmo = mapWapiCodeToWmo(day.day?.condition?.code ?? 1000);
    // The day summary has no dominant wind direction, so borrow it from the
    // midday hour (or the first hour of that day).
    const hours = Array.isArray(day.hour) ? day.hour : [];
    const midday = hours.find((h) => String(h.time || '').endsWith('12:00')) || hours[0] || {};
    // Only the daytime hours decide the fallback sky: a dry day with sunshine
    // between cloudy mornings and evenings is still a sun-with-clouds day.
    const dayHours = hours.filter((h) => h.is_day === 1);
    const dayCloud = dayHours.length
      ? dayHours.reduce((sum, h) => sum + (h.cloud ?? 0), 0) / dayHours.length
      : hours.length
        ? hours.reduce((sum, h) => sum + (h.cloud ?? 0), 0) / hours.length
        : null;
    const dayPeakChance = hours.length
      ? Math.max(...hours.map((h) => Math.max(h.chance_of_rain ?? 0, h.chance_of_snow ?? 0)))
      : (day.day?.daily_chance_of_rain ?? 0);
    const dayMapped = honestDayWeather(
      dayWmo, day.day?.maxtemp_c, day.day?.totalprecip_mm, dayPeakChance, dayCloud
    );
    const windSpeedDay = Math.round(day.day?.maxwind_kph ?? 0);
    return {
      day: formatDayLabel(day.date, index),
      condition: dayMapped.condition,
      icon: dayMapped.icon,
      weatherCode: dayMapped.weatherCode ?? dayWmo,
      high: day.day?.maxtemp_c != null ? Math.round(day.day.maxtemp_c) : null,
      low: day.day?.mintemp_c != null ? Math.round(day.day.mintemp_c) : null,
      humidity: Math.round(day.day?.avghumidity ?? 0),
      windSpeed: windSpeedDay,
      windDirection: midday.wind_dir || degreesToCardinal(midday.wind_degree ?? 0),
      beaufort: windSpeedToBeaufort(windSpeedDay),
      feelsHigh: midday.feelslike_c != null ? Math.round(midday.feelslike_c) : null,
      feelsLow: midday.feelslike_c != null ? Math.round(midday.feelslike_c) : null
    };
  });

  // "Next 3 hours" nowcast, rebuilt from WeatherAPI's hourly steps.
  const timeline = buildWapiTimeline(forecastDays, location.localtime);
  const alertInfo = buildAlerts(timeline);
  const totalPrecipMm = Math.round(
    timeline.reduce((sum, slot) => sum + (slot.precipMm || 0), 0) * 10
  ) / 10;
  const maxWindKmh = timeline.reduce((max, slot) => Math.max(max, slot.windKmh || 0), 0);
  const nowcast = {
    timeline,
    alerts: alertInfo.alerts,
    summary: {
      hasRain: alertInfo.summary.hasRain,
      hasHail: alertInfo.summary.hasHail,
      hasSnow: alertInfo.summary.hasSnow,
      // ☀️ Sun badge: only when a clear slot is actually in daylight — the sun
      // does not shine at night, so a starry clear sky must not light it up.
      hasSun: timeline.some((slot) => (slot.weatherCode === 0 || slot.weatherCode === 1) && slot.isDay !== false),
      strongWind: maxWindKmh >= STRONG_WIND_KMH,
      strongWindAbove4: alertInfo.summary.strongWindAbove4,
      totalPrecipMm,
      maxWindKmh,
      maxBeaufort: alertInfo.summary.maxBeaufort,
      trigger: alertInfo.summary.trigger
    },
    note: timeline.length ? '' : 'Precipitation forecast is unavailable for the next 3 hours.'
  };

  // Prefer the geocoder's rich "Town, Country" label; WeatherAPI's own
  // location fields are the fallback for text searches.
  const coordsLabel = `${geocoded.latitude}, ${geocoded.longitude}`;
  const wapiLabel = [location.name, location.country].filter(Boolean).join(', ');
  const locationLabel = geocoded.name && geocoded.name !== coordsLabel
    ? geocoded.name
    : (wapiLabel || geocoded.name || coordsLabel);

  return {
    temperature,
    humidity,
    feelsLike,
    windSpeed,
    windDirection,
    beaufort: windSpeedToBeaufort(windSpeed),
    condition: mapped.condition,
    icon: mapped.icon,
    weatherCode: mapped.weatherCode ?? currentWmo,
    isDay: isDayNow,
    provider: 'weatherapi',
    latitude: location.lat ?? geocoded.latitude,
    longitude: location.lon ?? geocoded.longitude,
    location: locationLabel,
    forecast,
    prediction: buildPrediction(mapped.condition, temperature, humidity),
    nowcast
  };
}

// ===== Provider 2: Open-Meteo (keyless fallback) =======================
async function fetchOpenMeteoWeather(geocoded, localMap, nearbyPlaces, dailyForecast14, solar) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${geocoded.latitude}&longitude=${geocoded.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day,precipitation,precipitation_probability,cloud_cover,snowfall&minutely_15=temperature_2m,apparent_temperature,weather_code,precipitation,precipitation_probability,snowfall,wind_speed_10m,wind_direction_10m,uv_index,uv_index_clear_sky,cloud_cover,is_day&forecast_minutely_15=${NOWCAST_SLOTS}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_max,relative_humidity_2m_min,precipitation_sum,precipitation_probability_max,cloud_cover_mean&timezone=auto`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const current = data.current ?? {};
  const temperature = Math.round(current.temperature_2m ?? 0);
  const isDayNow = (current.is_day ?? 1) === 1;
  // Clear sky at night shows the moon (the sun cannot shine after dark) and the
  // hero icon obeys the same honesty rule as the 15-minute slots
  // (honestSlotWeather): a rain code with no amount and no real chance reads as
  // the sky that is really overhead, never as rain over a sunlit cell.
  const mapped = honestSlotWeather(
    current.weather_code ?? 0, temperature, isDayNow,
    Math.round((current.precipitation ?? 0) * 10) / 10, current.precipitation_probability, current.cloud_cover ?? 0,
    current.snowfall
  );
  const humidity = Math.round(current.relative_humidity_2m ?? 0);
  const windSpeed = Math.round(current.wind_speed_10m ?? 0);
  const windDirection = degreesToCardinal(current.wind_direction_10m ?? 0);

  return {
    temperature,
    feelsLike: Math.round(current.apparent_temperature ?? temperature),
    humidity,
    windSpeed,
    windDirection,
    beaufort: windSpeedToBeaufort(windSpeed),
    condition: mapped.condition,
    icon: mapped.icon,
    weatherCode: mapped.weatherCode ?? (current.weather_code ?? 0),
    isDay: isDayNow,
    provider: 'open-meteo',
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    location: geocoded.name,
    forecast: buildForecast(data),
    forecast14: dailyForecast14 ?? [],
    prediction: buildPrediction(mapped.condition, temperature, humidity),
    nowcast: buildNowcast(data),
    localMap,
    nearbyPlaces,
    solar: solar || undefined
  };
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const query = Object.fromEntries(url.searchParams);

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let location;
  if (req.method === 'GET') {
    location = typeof query.location === 'string' ? query.location : undefined;
  } else {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    location = typeof body?.location === 'string' ? body.location : undefined;
  }

  // 🌊 Live ENSO dial value — same route, no new Vercel function.
  if (req.method === 'GET' && String(query.action || '').toLowerCase() === 'enso') {
    try {
      const enso = await withBudget(fetchEnsoData(), UPSTREAM_TIMEOUT_MS, 'enso fetch');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
      res.statusCode = 200;
      res.end(JSON.stringify(enso));
    } catch (error) {
      console.error('ENSO fetch failed:', error);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.statusCode = 200;
      res.end(JSON.stringify({
        source: ENSO_FEED, updated: new Date().toISOString(), available: false,
        season: null, year: null, oni: null, phase: 'unknown', phaseLabel: 'Unknown', cached: false
      }));
    }
    return;
  }

  try {
    // Hard overall budget: if the geocoder, the provider or any side-data call
    // stalls, we answer below with the honest fallback payload instead of
    // running past maxDuration and letting Vercel hand the user a 504.
    const weatherData = await withBudget(fetchWeatherData(location), REQUEST_BUDGET_MS, 'weather fetch');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify(weatherData));
  } catch (error) {
    // The typed location could not be found by any geocoder. Say so clearly
    // (HTTP 404) instead of silently returning the default location — the
    // front end turns this into a visible note under the search box.
    if (error instanceof GeocodeError) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.statusCode = 404;
      res.end(JSON.stringify({ error: error.message }));
      return;
    }
    console.error('Weather fetch failed:', error);
    const mapped = mapWeatherCodeToCondition(3);
    const fallbackLocation = location?.trim() || DEFAULT_LOCATION;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify({
      temperature: 18,
      humidity: 62,
      feelsLike: 15,
      windSpeed: 13,
      windDirection: 'NE',
      beaufort: 4,
      condition: mapped.condition,
      icon: mapped.icon,
      weatherCode: 3,
      provider: 'fallback',
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      location: fallbackLocation,
      prediction: buildPrediction(mapped.condition, 18, 62),
      forecast: [
        { day: 'Today', condition: 'Cloudy', icon: '☁️', weatherCode: 3, high: 19, low: 13, humidity: 62, windSpeed: 13, windDirection: 'NE', beaufort: 4 },
        { day: 'Tomorrow', condition: 'Rain', icon: '🌧️', weatherCode: 61, high: 17, low: 12, humidity: 78, windSpeed: 18, windDirection: 'SW', beaufort: 5 },
        { day: 'Day After', condition: 'Partly Cloudy', icon: '⛅', weatherCode: 2, high: 18, low: 11, humidity: 55, windSpeed: 9, windDirection: 'NW', beaufort: 3 }
      ],
      // NOTE: front-end getWeatherIcon() recomputes SVG icons from condition+weatherCode,
      // so server-side emoji icons here are only a fallback for clients that don't recompute.
      nowcast: {
        timeline: [],
        alerts: [],
        summary: { hasRain: false, hasHail: false, hasSnow: false, hasSun: false, strongWind: false, strongWindAbove4: false, totalPrecipMm: 0, maxWindKmh: 0, maxBeaufort: 0, trigger: false },
        note: 'Live minute-by-minute forecast is temporarily unavailable.'
      },
      forecast14: [],
      localMap: { cells: [] },
      nearbyPlaces: []
    }));
  }
};

// Also expose helpers so the push-notification endpoint (api/push.js) can reuse
// the exact same alert thresholds without duplicating logic.
module.exports.handler = module.exports;
module.exports.buildAlerts = buildAlerts;
module.exports.checkAlertsForCoords = checkAlertsForCoords;
module.exports.windSpeedToBeaufort = windSpeedToBeaufort;
// Internal helpers (for tests / debugging): WeatherAPI.com provider pieces.
module.exports._internal = { buildWapiTimeline, mapWapiCodeToWmo, classifyLocalCell, mapWeatherCodeToCondition, buildNowcast, buildForecast14, buildForecast, buildForecast14DaySlots, meanWindDir, lerpHalfHour, pickHalfHourCode, fetchDailyForecast14, honestSlotWeather, honestDayWeather, pickSolarHourly, SLOT_RAIN_MIN_MM, SLOT_RAIN_PROB_MIN, DAY_RAIN_MIN_MM, DAY_RAIN_PROB_MIN, FORECAST14_SLOTS_PER_DAY, parseOniText, ensoPhaseFor, fetchEnsoData, ENSO_FEED, ENSO_TTL_MS };
