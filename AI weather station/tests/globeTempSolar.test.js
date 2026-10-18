// Regression: globe-temp NL/GB fix + ☀️ Solar tab (radiation + UV + sunshine).
//   1. The globe readout is data-i18n-skip so the dictionary walk never caches
//      or restores the live temperature ("18°" must survive EN<->NL toggles);
//      the condition is translated explicitly via t() and repaintGlobeWeather()
//      repaints it after a toggle.
//   2. The ☀️ Solar tab exists (button + panel + 15-min refresh wiring) and the
//      /api/solar endpoint normalises radiation/UV/sunshine honestly.
// Run: node tests/globeTempSolar.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = ['index.html', 'app.js', 'style.css'].map((fn) => fs.readFileSync(path.join(__dirname, '..', fn), 'utf8')).join('\n');
const solarApi = require('../api/solar.js');
const solarInternal = solarApi._internal || {};

test('globe readout survives the NL/GB toggle (live temp is never translated)', () => {
  assert.match(html, /id="globe-weather-display"[^>]*data-i18n-skip/,
    'the globe readout opts out of the dictionary walk');
  assert.match(html, /closest\('\[data-i18n-skip\][^']*'/,
    'i18nWalk skips live-value subtrees');
  assert.match(html, /repaintGlobeWeather/,
    'a repaint helper restores the readout after a language switch');
  assert.match(html, /latestGlobeWeather\s*=\s*\{\s*temp,\s*condition/,
    'the live temp + condition are remembered for repainting');
});

test('solar tab: button, panel, 15-minute refresh wiring', () => {
  assert.match(html, /id="tab-solar"[^>]*aria-controls="panel-solar"/,
    'a ☀️ Solar tab button controls its panel');
  assert.match(html, /id="panel-solar"[^>]*aria-labelledby="tab-solar"/,
    'the Solar panel exists');
  assert.match(html, /id="solar-grid"/, 'the Solar grid exists');
  assert.match(html, /SOLAR_REFRESH_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/,
    'Solar refreshes every 15 minutes');
  assert.match(html, /\/api\/solar\?lat=/,
    'the tab fetches /api/solar with coordinates');
  assert.match(html, /function renderSolar\(data\)/,
    'renderSolar() paints the tab');
  assert.match(html, /function fetchSolar\(/,
    'fetchSolar() refreshes the tab');
  assert.match(html, /shortwaveWm2|directWm2|diffuseWm2|uvIndex|sunshineSeconds/,
    'radiation + UV + sunshine fields are rendered');
});

test('solar tab is fully Dutch-translated', () => {
  for (const label of ['☀️ Solar', 'Solar intensity', 'Radiation', 'UV index',
    'Sunshine', 'Direct', 'Diffuse', 'Clear-sky UV', 'Sunshine duration',
    'Daylight duration', 'Night', 'Refreshing every 15 minutes',
    'Modelled solar + UV (Open-Meteo)', 'Loading solar data…',
    'Solar data is temporarily unavailable.']) {
    assert.ok(html.includes("'" + label + "':"),
      `"${label}" has a Dutch dictionary entry`);
  }
});

test('solar API: honest UV levels + 15-minute cache', () => {
  assert.equal(typeof solarInternal.uvLevelFor, 'function', 'uvLevelFor exists');
  assert.equal(solarInternal.uvLevelFor(null).level, 'unknown');
  assert.equal(solarInternal.uvLevelFor(0.5).label, 'Low');
  assert.equal(solarInternal.uvLevelFor(4).label, 'Moderate');
  assert.equal(solarInternal.uvLevelFor(7).label, 'High');
  assert.equal(solarInternal.uvLevelFor(9).label, 'Very high');
  assert.equal(solarInternal.uvLevelFor(12).label, 'Extreme');
  assert.equal(solarInternal.SOLAR_TTL_MS, 15 * 60 * 1000, 'server cache is 15 minutes');
  const url = solarInternal.buildUrl(51.92, 4.36);
  assert.match(url, /shortwave_radiation/, 'radiation is requested');
  assert.match(url, /uv_index/, 'UV is requested');
  assert.match(url, /sunshine_duration/, 'sunshine is requested');
  assert.match(url, /temperature_2m/, 'temperature is requested for the strip');
});

test('12-hour solar strip: every slot carries the temperature', () => {
  // Frontend: the strip reads tempC per hour, renders a rounded ° line, styled.
  assert.match(html, /solar \+ UV \+ temperature forecast strip/,
    'the render path documents the temperature line');
  assert.match(html, /const tc = \(typeof h\.tempC === 'number'/,
    'each slot reads tempC from the payload');
  assert.match(html, /'<div class="ss-temp">'/,
    'the slot markup contains a temperature line');
  assert.match(html, /\.solar-slot \.ss-temp \{/,
    'CSS styles the temperature line (incl. night variant)');
  assert.match(html, /solarFmt\(tc == null \? null : Math\.round\(tc\), '°'\)/,
    'tile temperature is rounded with a ° suffix (— when missing)');
  assert.match(html, /· ' \+ solarFmt\(tc, '°'\)/,
    'the hover tooltip keeps the one-decimal temperature');
  // Backends: both payloads feeding the UI carry tempC per hour.
  const iso = (offH) => new Date(Date.now() + offH * 3600e3).toISOString().slice(0, 16);
  const hourly = { time: [iso(1), iso(2)], shortwave_radiation: [500, 520],
    uv_index: [4.2, 4.5], temperature_2m: [18.6, 19.1] };
  const picked = solarInternal.pickHourly(hourly, 2);
  assert.ok(picked.length >= 1, 'pickHourly returns the upcoming hours');
  assert.ok(picked.every((h) => typeof h.tempC === 'number'),
    'api/solar hours carry tempC');
  const weatherApi = require('../api/weather.js');
  const wPick = (weatherApi._internal || {}).pickSolarHourly;
  assert.equal(typeof wPick, 'function', 'pickSolarHourly is exported for tests');
  const wp = wPick(hourly, Date.now(), 2);
  assert.ok(wp.length >= 1 && wp.every((h) => typeof h.tempC === 'number'),
    'api/weather solar hours carry tempC');
});

test('sunrise/sunset arc: the sun dot moves in sync with the clock', () => {
  // Markup: the arc owns an addressable dot (it was a static CSS-only span).
  assert.match(html, /<span class="solar-sun-dot" id="solar-sun-dot"><\/span>/,
    'the arc dot has an id so JS can position it');
  // CSS: smooth 0.8 s glide between updates + reduced-motion opt-out.
  assert.match(html, /\.solar-sun-arc \.solar-sun-dot \{\s*position: absolute; left: 50%; top: -4px;/,
    'dot starts centred (JS overrides per frame)');
  assert.match(html, /transition: left 0\.8s linear, top 0\.8s linear, opacity 0\.4s ease;/,
    'dot glides to its new position');
  assert.match(html, /\.solar-sun-dot \.solar-sun-dot \{ transition: none; \}|prefers-reduced-motion[\s\S]{0,200}solar-sun-dot \{ transition: none;/,
    'reduced motion disables the glide');
  assert.match(html, /\.solar-sun-arc \.solar-sun-dot\.is-night \{ opacity: 0\.45; \}/,
    'dot dims outside daylight');
  // JS: geometry from sunrise→now→sunset on the half-ellipse, not a fixed 50%.
  assert.match(html, /function updateSunArc\(\)/, 'updateSunArc() exists');
  assert.match(html, /const p = Math\.min\(1, Math\.max\(0, \(now - sr\) \/ \(ss - sr\)\)\);/,
    'day progress is clamped 0..1 between sunrise and sunset');
  assert.match(html, /dot\.style\.left = \(50 \+ 50 \* Math\.cos\(phi\)\) \+ '%';/,
    'horizontal position follows cos φ (sunrise left → sunset right)');
  assert.match(html, /dot\.style\.top = \(h - h \* Math\.sin\(phi\) - 4\) \+ 'px';/,
    'vertical position follows sin φ (noon at the apex)');
  assert.match(html, /dot\.classList\.toggle\('is-night', now < sr \|\| now > ss\);/,
    'night state clamps + dims the dot outside daylight');
  // Wiring: recompute on every render and on a 30 s clock tick.
  assert.match(html, /if \(sunRow\) sunRow\.hidden = !\(solar\.sunrise \|\| solar\.sunset\);\s*updateSunArc\(\);/,
    'renderSolar() repositions the dot after painting sunrise/sunset');
  assert.match(html, /sunArcTimer = setInterval\(updateSunArc, 30 \* 1000\);/,
    'a 30 s timer keeps the dot in sync with the clock');
  assert.match(html, /if \(sunArcTimer\) clearInterval\(sunArcTimer\);/,
    'the timer is reset on init (no duplicate intervals)');
});
