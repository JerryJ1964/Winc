const DEFAULT_LOCATION = 'Vlaardingen, Netherlands';
// build:nowcast-20260827-1
// build:alerts-20260829-1 — rain / hail / snow / wind-above-Beaufort-4 alert flags for push notifications
const DEFAULT_LATITUDE = 51.9192;
const DEFAULT_LONGITUDE = 4.3599;

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

function mapWeatherCodeToCondition(code) {
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
    96: { condition: 'Thunderstorm', icon: '⛈️' },
    99: { condition: 'Thunderstorm', icon: '⛈️' }
  };
  return mapping[code] ?? { condition: 'Unknown', icon: '🌡️' };
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
    const wmo = mapWapiCodeToWmo(hour.condition?.code ?? 1000);
    const slotTemp = Math.round(lerp(hour.temp_c ?? 0, next?.hour.temp_c ?? 0));
    const mapped = honestSnowCondition(wmo, slotTemp) || mapWeatherCodeToCondition(wmo);
    // WeatherAPI only provides hourly steps, but the UI (sky strip, red
    // arrival streak) expects smooth 15-minute values — linearly interpolate
    // between this hour and the next instead of repeating flat quarters.
    const next = byMinutes.get(entry.minutes + 60);
    const f = next ? (at - entry.minutes) / 60 : 0;
    const lerp = (a, b) =>
      next && typeof a === 'number' && typeof b === 'number' ? a + (b - a) * f : a;
    const cloudCover = Math.round(lerp(hour.cloud ?? 0, next?.hour.cloud ?? 0));
    const isDay = (hour.is_day ?? 1) === 1;
    const time = formatWapiTimeMinutes(at);
    timeline.push({
      time,
      label: time.slice(11, 16),
      condition: mapped.condition,
      icon: mapped.icon,
      weatherCode: wmo,
      cloudCover,
      temperature: slotTemp,
      feelsLike: Math.round(lerp(hour.feelslike_c ?? hour.temp_c ?? 0, next?.hour.feelslike_c ?? next?.hour.temp_c ?? 0)),
      precipMm: Math.round((lerp(hour.precip_mm ?? 0, next?.hour.precip_mm ?? 0) / 4) * 10) / 10,
      precipProb: Math.round(Math.max(
        lerp(hour.chance_of_rain ?? 0, next?.hour.chance_of_rain ?? 0),
        lerp(hour.chance_of_snow ?? 0, next?.hour.chance_of_snow ?? 0)
      )),
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

  return dates.slice(0, 3).map((date, index) => {
    // A snowy code on a day whose HIGH is too warm for snow reads as rain
    // (honestSnowCondition) — the icon then matches the forecast temperature.
    const mapped = honestSnowCondition(codes[index] ?? 0, highs[index]) || mapWeatherCodeToCondition(codes[index] ?? 0);
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
      weatherCode: codes[index] ?? 0,
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
  if (hailFound) alerts.push({ type: 'hail', label: 'Hail', emoji: '🌨️' });
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
  const response = await fetch(url);
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
    const mapped = honestSnowCondition(code, slotTemp) || mapWeatherCodeToCondition(code);
    const precipMmRaw = m15.precipitation?.[i] ?? 0;
    // SUN % (shown with the sun icon in the 15-minute slots): how much the sun
    // is actually shining. Clear sky (sun fully visible) -> 100%, clouds block
    // the sun -> lower %, night -> 0%. Cloud cover is the direct measure of
    // "is the sun visible"; the raw WHO UV index is kept for the tooltip.
    const uvIndex = Math.round((m15.uv_index?.[i] ?? 0) * 10) / 10;
    const isDay = (m15.is_day?.[i] ?? 0) === 1;
    const cloudCover = m15.cloud_cover?.[i];
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
      weatherCode: code,
      cloudCover: Math.round(cloudCover ?? 0),
      temperature: slotTemp,
      feelsLike: Math.round(m15.apparent_temperature?.[i] ?? m15.temperature_2m?.[i] ?? 0),
      precipMm: Math.round(precipMmRaw * 10) / 10,
      precipProb: Math.round(m15.precipitation_probability?.[i] ?? 0),
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
      hasSun: timeline.some((slot) => slot.weatherCode === 0 || slot.weatherCode === 1),
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
    '&current=temperature_2m,apparent_temperature,weather_code,precipitation,snowfall,cloud_cover,wind_speed_10m,wind_direction_10m' +
    '&minutely_15=temperature_2m,apparent_temperature,weather_code,precipitation,precipitation_probability,cloud_cover,snowfall,wind_speed_10m,wind_direction_10m' +
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
  let mapped = mapWeatherCodeToCondition(weatherCode);
  let type = classifyLocalCell(weatherCode, precipitation, snowfall, cloudCover);
  // Snow honesty: snow cannot fall well above freezing — a snowy code or
  // snowfall amount at warm temperatures is a model quirk, so the cell reads
  // as rain (icon AND map-blob type agree with the temperature, matching the
  // SNOW_TOO_WARM_C guard in index.html's localMapFrameCell).
  if (temp > SNOW_TOO_WARM_C && (SNOW_CODES.has(weatherCode) || snowfall > 0)) {
    mapped = { condition: 'Rain', icon: '🌧️' };
    type = classifyLocalCell(63, precipitation, 0, cloudCover);
  }

  // Compact 15-minute forecast series (0…180 min) so the front end can show
  // every cell of the radar moving forward in time. Stored as parallel arrays
  // (not objects) to keep the JSON payload small for 25 cells × 13 slots.
  const slotCount = Math.min(LOCAL_MAP_SLOTS, Array.isArray(m15.time) ? m15.time.length : 0);
  const series = { times: [], codes: [], precip: [], prob: [], cloud: [], snow: [], temps: [], feels: [], wind: [], windDir: [] };
  for (let i = 0; i < slotCount; i += 1) {
    series.times.push(m15.time[i] || '');
    series.codes.push(m15.weather_code?.[i] ?? 0);
    series.precip.push(Math.round((m15.precipitation?.[i] ?? 0) * 10) / 10);
    series.prob.push(Math.round(m15.precipitation_probability?.[i] ?? 0));
    series.cloud.push(Math.round(m15.cloud_cover?.[i] ?? 0));
    series.snow.push(Math.round((m15.snowfall?.[i] ?? 0) * 10) / 10);
    series.temps.push(Math.round(m15.temperature_2m?.[i] ?? 0));
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
    weatherCode,
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
  // data or grid) and the nearby city/village names (Wikipedia geosearch).
  // Both are cached server-side, so refreshing the page costs nothing extra.
  const [localMap, nearbyPlaces] = await Promise.all([
    buildLocalMap(geocoded.latitude, geocoded.longitude).catch(() => ({ cells: [] })),
    getNearbyPlaces(geocoded.latitude, geocoded.longitude).catch(() => [])
  ]);

  // Provider routing: WeatherAPI.com first when WEATHERAPI_KEY is set, with
  // an automatic, silent fallback to the keyless Open-Meteo provider.
  if (isWeatherApiEnabled()) {
    try {
      const wapi = await fetchWeatherApiWeather(geocoded);
      return { ...wapi, localMap, nearbyPlaces };
    } catch (error) {
      console.warn('WeatherAPI.com fetch failed, falling back to Open-Meteo.', error);
    }
  }

  return fetchOpenMeteoWeather(geocoded, localMap, nearbyPlaces);
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
  const mapped = honestSnowCondition(currentWmo, temperature) || mapWeatherCodeToCondition(currentWmo);

  // 3-day forecast (Today / Tomorrow / Day After).
  const forecast = forecastDays.slice(0, 3).map((day, index) => {
    const dayWmo = mapWapiCodeToWmo(day.day?.condition?.code ?? 1000);
    const dayMapped = honestSnowCondition(dayWmo, day.day?.maxtemp_c) || mapWeatherCodeToCondition(dayWmo);
    // The day summary has no dominant wind direction, so borrow it from the
    // midday hour (or the first hour of that day).
    const hours = Array.isArray(day.hour) ? day.hour : [];
    const midday = hours.find((h) => String(h.time || '').endsWith('12:00')) || hours[0] || {};
    const windSpeedDay = Math.round(day.day?.maxwind_kph ?? 0);
    return {
      day: formatDayLabel(day.date, index),
      condition: dayMapped.condition,
      icon: dayMapped.icon,
      weatherCode: dayWmo,
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
      hasSun: timeline.some((slot) => slot.weatherCode === 0 || slot.weatherCode === 1),
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
    weatherCode: currentWmo,
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
async function fetchOpenMeteoWeather(geocoded, localMap, nearbyPlaces) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${geocoded.latitude}&longitude=${geocoded.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&minutely_15=temperature_2m,apparent_temperature,weather_code,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,uv_index,uv_index_clear_sky,cloud_cover,is_day&forecast_minutely_15=${NOWCAST_SLOTS}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_max,relative_humidity_2m_min&timezone=auto`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const current = data.current ?? {};
  const temperature = Math.round(current.temperature_2m ?? 0);
  const mapped = honestSnowCondition(current.weather_code ?? 0, temperature) || mapWeatherCodeToCondition(current.weather_code ?? 0);
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
    weatherCode: current.weather_code ?? 0,
    provider: 'open-meteo',
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    location: geocoded.name,
    forecast: buildForecast(data),
    prediction: buildPrediction(mapped.condition, temperature, humidity),
    nowcast: buildNowcast(data),
    localMap,
    nearbyPlaces
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

  try {
    const weatherData = await fetchWeatherData(location);
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
      nowcast: {
        timeline: [],
        alerts: [],
        summary: { hasRain: false, hasHail: false, hasSnow: false, hasSun: false, strongWind: false, strongWindAbove4: false, totalPrecipMm: 0, maxWindKmh: 0, maxBeaufort: 0, trigger: false },
        note: 'Live minute-by-minute forecast is temporarily unavailable.'
      },
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
module.exports._internal = { buildWapiTimeline, mapWapiCodeToWmo, classifyLocalCell };
