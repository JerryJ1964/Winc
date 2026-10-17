// Unit + integration tests for the weather-alert push logic.
// Run: npm test   (uses Node's built-in test runner)
const test = require('node:test');
const assert = require('node:assert');

const weather = require('../api/weather.js');
const push = require('../api/push.js');

const beaufort = weather.windSpeedToBeaufort;

test('Beaufort conversion has correct boundaries', () => {
  assert.strictEqual(beaufort(1), 0);
  assert.strictEqual(beaufort(10), 2);   // Bf 2 range = 6–11 km/h
  assert.strictEqual(beaufort(19), 3);   // Bf 3 range = 12–19 km/h
  assert.strictEqual(beaufort(20), 4);   // Bf 4 starts at 20
  assert.strictEqual(beaufort(28), 4);   // still Bf 4 (boundary[4]=28)
  assert.strictEqual(beaufort(29), 5);   // above Bf 4 → Bf 5
  assert.strictEqual(beaufort(50), 7);   // 50 > 49 → Bf 7
  assert.strictEqual(beaufort(150), 12); // ultra storm
});

test('wind triggers only ABOVE Beaufort 4 (> 28 km/h)', () => {
  const none = weather.buildAlerts([
    { weatherCode: 0, precipMm: 0, precipProb: 0, windKmh: 28 }
  ]);
  assert.strictEqual(none.summary.trigger, false, '28 km/h = Beaufort 4, must NOT trigger');
  assert.strictEqual(none.summary.strongWindAbove4, false);

  const gusty = weather.buildAlerts([
    { weatherCode: 0, precipMm: 0, precipProb: 0, windKmh: 29 },
    { weatherCode: 64, precipMm: 0, precipProb: 0, windKmh: 21 }
  ]);
  assert.strictEqual(gusty.summary.trigger, true, '29 km/h > 28 km/h, must trigger');
  assert.strictEqual(gusty.summary.strongWindAbove4, true);
  assert.strictEqual(gusty.summary.maxWindKmh, 29);
  assert.ok(gusty.alerts.some((a) => a.type === 'strongWind'));
});

test('rain / hail / snow detection flags', () => {
  const rain = weather.buildAlerts([{ weatherCode: 61, precipMm: 0.8, precipProb: 95, windKmh: 10 }]);
  assert.strictEqual(rain.summary.hasRain, true);
  assert.ok(rain.alerts.some((a) => a.type === 'rain'));

  const hail = weather.buildAlerts([{ weatherCode: 99, precipMm: 1.2, precipProb: 90, windKmh: 12 }]);
  assert.strictEqual(hail.summary.hasHail, true);
  assert.ok(hail.alerts.some((a) => a.type === 'hail'));

  const snow = weather.buildAlerts([{ weatherCode: 85, precipMm: 0.5, precipProb: 80, windKmh: 8 }]);
  assert.strictEqual(snow.summary.hasSnow, true);
  assert.ok(snow.alerts.some((a) => a.type === 'snow'));
});

test('empty timeline produces no alerts', () => {
  const res = weather.buildAlerts([]);
  assert.deepStrictEqual(res.alerts, []);
  assert.strictEqual(res.summary.trigger, false);
});

test('push notification message is human readable', () => {
  const msg = push._internal.buildMessage(
    [{ type: 'rain', label: 'Rain', emoji: '🌧️' }, { type: 'strongWind', label: 'Wind > Bf 4', emoji: '💨', maxWindKmh: 41 }],
    'Vlaardingen, Netherlands',
    { latitude: 51.91, longitude: 4.36 }
  );
  assert.match(msg.title, /🌧️ 💨 Weather alert · Vlaardingen, Netherlands/);
  assert.match(msg.body, /Rain \+ Wind > Bf 4 expected here in the next 3 hours \(peak 41 km\/h\)\./);
});

test('checkAlertsForCoords hits Open-Meteo (live, best-effort)', async (t) => {
  // Amsterdam coordinates: lat 52.37, lng 4.89 — a place that regularly gets
  // rain. If the network is offline the test is skipped instead of failing.
  let result;
  try {
    result = await weather.checkAlertsForCoords(52.3676, 4.9041);
  } catch (e) {
    t.skip('live API unavailable: ' + e.message);
    return;
  }
  assert.ok(result && typeof result.summary.trigger === 'boolean');
  assert.ok(Array.isArray(result.alerts));
});

test('clear sky at night shows the moon 🌙 — the sun cannot shine after dark', () => {
  const map = weather._internal.mapWeatherCodeToCondition;
  // Day (or an unknown time of day) keeps the classic sun icons.
  assert.deepStrictEqual(map(0), { condition: 'Clear', icon: '☀️' });
  assert.deepStrictEqual(map(0, true), { condition: 'Clear', icon: '☀️' });
  assert.deepStrictEqual(map(1, true), { condition: 'Mainly Clear', icon: '🌤️' });
  // Night: no clouds → stars visible → moon icon ("Clear Night").
  assert.deepStrictEqual(map(0, false), { condition: 'Clear Night', icon: '🌙' });
  assert.deepStrictEqual(map(1, false), { condition: 'Mainly Clear', icon: '🌙' });
  // Every other condition keeps its icon at night.
  assert.deepStrictEqual(map(61, false), { condition: 'Rain', icon: '🌧️' });
  assert.deepStrictEqual(map(3, false), { condition: 'Cloudy', icon: '☁️' });
  assert.deepStrictEqual(map(71, false), { condition: 'Snow', icon: '❄️' });
});

test('nowcast: clear night slots show 🌙 and the "Sun" badge stays dark', () => {
  const hours = ['2026-09-14T22:00', '2026-09-14T22:15', '2026-09-14T22:30'];
  const night = weather._internal.buildNowcast({
    minutely_15: {
      time: hours,
      weather_code: [0, 1, 61],
      temperature_2m: [12, 12, 11],
      apparent_temperature: [11, 11, 10],
      precipitation: [0, 0, 0.4],
      precipitation_probability: [0, 0, 70],
      wind_speed_10m: [5, 5, 8],
      wind_direction_10m: [180, 180, 190],
      uv_index: [0, 0, 0],
      cloud_cover: [0, 5, 90],
      is_day: [0, 0, 0]
    }
  });
  assert.deepStrictEqual(
    night.timeline.map((s) => `${s.condition} ${s.icon}`),
    ['Clear Night 🌙', 'Mainly Clear 🌙', 'Rain 🌧️'],
    'clear/mainly-clear slots at night must show the moon'
  );
  assert.strictEqual(night.timeline.every((s) => s.isDay === false), true);
  assert.strictEqual(night.summary.hasSun, false, 'the sun does not shine at night');

  // The very same clear slots in daylight keep ☀️/🌤️ and light the Sun badge.
  const day = weather._internal.buildNowcast({
    minutely_15: {
      time: hours,
      weather_code: [0, 1, 61],
      temperature_2m: [18, 18, 17],
      apparent_temperature: [17, 17, 16],
      precipitation: [0, 0, 0.4],
      precipitation_probability: [0, 0, 70],
      wind_speed_10m: [5, 5, 8],
      wind_direction_10m: [180, 180, 190],
      uv_index: [3, 3, 2],
      cloud_cover: [0, 5, 90],
      is_day: [1, 1, 1]
    }
  });
  assert.deepStrictEqual(
    day.timeline.map((s) => s.icon),
    ['☀️', '🌤️', '🌧️']
  );
  assert.strictEqual(day.summary.hasSun, true);

  // Slots without any is_day flag (older payloads) keep the old behaviour.
  const unknown = weather._internal.buildNowcast({
    minutely_15: {
      time: hours,
      weather_code: [0, 0, 0],
      temperature_2m: [18, 18, 18],
      precipitation: [0, 0, 0],
      precipitation_probability: [0, 0, 0],
      wind_speed_10m: [5, 5, 5]
    }
  });
  assert.strictEqual(unknown.summary.hasSun, true);
});

// ===== 📅 14-day forecast (buildForecast14) =============================
test('14-day forecast: labels, rounding, wind direction, Beaufort, rain chance', () => {
  const build = weather._internal.buildForecast14;
  const dates = ['2026-09-15', '2026-09-16', '2026-09-17'];
  const daily = {
    time: dates,
    weathercode: [61, 71, 0],
    temperature_2m_max: [23.4, 2.9, 19],
    temperature_2m_min: [17.6, -1.2, 8],
    apparent_temperature_max: [22, 0, 18],
    apparent_temperature_min: [16, -4, 6],
    wind_speed_10m_max: [16.6, 34, 7],
    wind_direction_10m_dominant: [225, 10, 359],
    relative_humidity_2m_max: [90, 80, 60],
    relative_humidity_2m_min: [60, 55, 40],
    precipitation_probability_max: [41, 85, null],
    precipitation_sum: [0.44, 12.34, 0]
  };

  const days = build({ daily });
  assert.strictEqual(days.length, 3, 'short payloads return only the days present');
  assert.deepStrictEqual(days.map((d) => d.day), ['Today', 'Tomorrow', 'Thu'], 'labels: Today / Tomorrow / weekday');

  const [d0, d1, d2] = days;
  // Max / min temperature: rounded to whole degrees.
  assert.strictEqual(d0.high, 23);
  assert.strictEqual(d0.low, 18);
  // Wind: rounded km/h + dominant direction as a compass point + Beaufort.
  assert.strictEqual(d0.windSpeed, 17);
  assert.strictEqual(d0.windDirection, 'SW');
  assert.strictEqual(d0.windDirDeg, 225);
  assert.strictEqual(d0.beaufort, 3);
  // Chance of rain as an integer % + precipitation in mm (1 decimal).
  assert.strictEqual(d0.rainProb, 41);
  assert.strictEqual(d0.precipMm, 0.4);
  // Feels-like range and averaged humidity are carried for the stat cards.
  assert.strictEqual(d0.feelsHigh, 22);
  assert.strictEqual(d0.feelsLow, 16);
  assert.strictEqual(d0.humidity, 75);
  // 359° wraps to the last compass point, not 360.
  assert.strictEqual(d2.windDirection, 'N');
  // A missing rain-probability value degrades to null (the tab shows "—").
  assert.strictEqual(d2.rainProb, null);
  assert.strictEqual(d2.precipMm, 0);

  // Snow honesty: a snowy code (71) on a day whose HIGH is above 2 °C is
  // reported as rain so the icon matches the temperature.
  assert.strictEqual(d1.condition, 'Rain');
  assert.strictEqual(d1.icon, '🌧️');
});

test('14-day forecast: at most 14 days are returned from a longer payload', () => {
  const dates = Array.from({ length: 20 }, (_, i) => `2026-09-${String(1 + i).padStart(2, '0')}`);
  const daily = { time: dates, weathercode: dates.map(() => 2) };
  const days = weather._internal.buildForecast14({ daily });
  assert.strictEqual(days.length, 14, 'never more than 14 days');
  assert.strictEqual(days[0].day, 'Today');
  assert.strictEqual(days[13].day, 'Mon', 'day 14 is labelled by its weekday');
});

test('14-day forecast: empty payload yields an empty array', () => {
  assert.deepStrictEqual(weather._internal.buildForecast14({}), []);
  assert.deepStrictEqual(weather._internal.buildForecast14({ daily: {} }), []);
});

// ===== ⏱️ 14-day 30-minute drill-down (buildForecast14DaySlots) ============
test('14-day 30-min slots: 48 slots, interpolation, sun honesty, wind mean', () => {
  const internal = weather._internal;
  const hourly = { time: [], temperature_2m: [], weather_code: [], precipitation: [], precipitation_probability: [], cloud_cover: [], wind_speed_10m: [], wind_direction_10m: [], is_day: [], snowfall: [] };
  for (let h = 0; h < 24; h++) {
    hourly.time.push(`2026-09-20T${String(h).padStart(2, '0')}:00`);
    hourly.temperature_2m.push(10 + h * 0.5);
    hourly.weather_code.push(h < 12 ? 0 : 61);
    hourly.precipitation.push(h < 12 ? 0 : 0.4);
    hourly.precipitation_probability.push(h < 12 ? 5 : 80);
    hourly.cloud_cover.push(h < 12 ? 10 : 90);
    hourly.wind_speed_10m.push(10 + h);
    hourly.wind_direction_10m.push(180);
    hourly.is_day.push(h >= 7 && h <= 19 ? 1 : 0);
    hourly.snowfall.push(0);
  }
  hourly.time.push('2026-09-21T00:00');
  hourly.temperature_2m.push(22); hourly.weather_code.push(61); hourly.precipitation.push(0.4);
  hourly.precipitation_probability.push(80); hourly.cloud_cover.push(90);
  hourly.wind_speed_10m.push(34); hourly.wind_direction_10m.push(180); hourly.is_day.push(0); hourly.snowfall.push(0);

  const slots = internal.buildForecast14DaySlots('2026-09-20', hourly);
  assert.strictEqual(slots.length, 48, '24 hours x :00/:30');
  assert.strictEqual(slots[0].time, '00:00');
  assert.strictEqual(slots[47].time, '23:30');
  assert.strictEqual(slots[16].sunProb, 90, 'daytime sun chance = 100 - cloud');
  assert.strictEqual(slots[0].sunProb, 0, 'night never promises sunshine');
  assert.strictEqual(slots[30].rainProb, 80);
  assert.strictEqual(typeof slots[30].beaufort, 'number');
  assert.strictEqual(internal.FORECAST14_SLOTS_PER_DAY, 48);
  assert.strictEqual(Math.round(internal.meanWindDir(350, 10)), 0, 'circular wind mean wraps');
  assert.deepStrictEqual(internal.buildForecast14DaySlots('2026-09-20', { time: ['2026-09-20T00:00'] }), []);
});
