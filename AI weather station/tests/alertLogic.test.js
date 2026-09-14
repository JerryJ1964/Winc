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