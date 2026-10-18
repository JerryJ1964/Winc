// Regression: 🌌 true-colour aurora oval on the globe (NOAA SWPC Ovation).
//   • /api/aurora normalises the Ovation grid honestly, caps payload, caches 30 min
//   • the globe has a 🌌 Aurora chip + switch, a true-colour painter, live fetch
// Run: node tests/aurora.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = ['index.html', 'app.js', 'style.css'].map((fn) => fs.readFileSync(path.join(__dirname, '..', fn), 'utf8')).join('\n');
const auroraApi = require('../api/aurora.js');
const auroraInternal = auroraApi._internal || {};

test('aurora API: honest Ovation normalisation + 30-minute cache', () => {
  assert.equal(typeof auroraInternal.normalizeAurora, 'function', 'normalizeAurora exists');
  assert.equal(typeof auroraInternal.kpLevelFor, 'function', 'kpLevelFor exists');
  assert.equal(auroraInternal.AURORA_TTL_MS, 30 * 60 * 1000, 'server cache is 30 minutes');
  assert.match(auroraInternal.AURORA_FEED, /services\.swpc\.noaa\.gov/, 'NOAA SWPC feed');
  assert.match(auroraInternal.AURORA_FEED, /ovation_aurora_latest/, 'Ovation latest grid');

  // [lng, lat, power] triples -> lit cells, heaviest first, junk dropped.
  const cells = auroraInternal.normalizeAurora({
    coordinates: [[0, 70, 40], [10, 68, 5], [20, 0, 99], [30, 71, 0], ['x', 70, 10], [40, 200, 10]]
  });
  assert.ok(cells.length >= 2, 'lit oval cells survive');
  assert.ok(cells.every((c) => c.intensity > 0), 'dark cells are dropped');
  assert.ok(cells[0].intensity >= cells[cells.length - 1].intensity, 'heaviest first');
  assert.deepEqual(auroraInternal.normalizeAurora({}), [], 'empty payload is empty');
  assert.deepEqual(auroraInternal.normalizeAurora({ coordinates: [[0, 70, 0]] }), [], 'dark oval is empty');

  assert.equal(auroraInternal.kpLevelFor(null).level, 'unknown');
  assert.equal(auroraInternal.kpLevelFor(5).label, 'Quiet');
  assert.equal(auroraInternal.kpLevelFor(15).label, 'Active');
  assert.equal(auroraInternal.kpLevelFor(40).label, 'Geomagnetic storm');
  assert.equal(auroraInternal.kpLevelFor(80).label, 'Severe storm');
});

test('globe: aurora chip, switch, true-colour painter, live fetch', () => {
  assert.match(html, /data-globe-layer="aurora"/, 'a 🌌 Aurora chip sits under the globe');
  assert.match(html, /aurora:\s*true/, 'globeLayerOn carries the aurora switch');
  assert.match(html, /function auroraTrueColor\(/, 'true-colour ramp is defined');
  assert.match(html, /557\.7nm|557\.7/, 'green oxygen lower border is documented');
  assert.match(html, /function auroraGlowAt\(/, 'oval sampler is defined');
  assert.match(html, /function fetchAurora\(/, 'live fetch pulls /api/aurora');
  assert.match(html, /\/api\/aurora/, 'the globe fetches /api/aurora');
  assert.match(html, /AURORA_REFRESH_MS\s*=\s*30\s*\*\s*60\s*\*\s*1000/, 'aurora refreshes every 30 minutes');
  assert.match(html, /'🌌 Aurora': '🌌 Poollicht'/, 'the chip is Dutch-translated');
});

test('globe: aurora is a volumetric shell march, not a flat ground tint', () => {
  // Real curtains stand ~90–700 km above the oval (tops at ~1.11 R, inside
  // the ~1.45 R atmosphere halo behind the globe so they tower past the limb
  // without detaching into space), so the painter ray-marches each
  // view ray through the shell: altitude parallax, red tops and light
  // leaning over the limb — a flat ground decal can do none of these.
  assert.match(html, /const AURORA_ALT_FLOOR_KM = 90/);
  assert.match(html, /const AURORA_ALT_TOP_KM = 700/);
  assert.match(html, /function marchAuroraShell\(/, 'the shell marcher exists');
  assert.match(html, /function auroraRaySeesOval\(/, 'cheap per-ray pre-gate exists');
  // The marcher is top level (outside the per-frame painter) and samples the
  // prebuilt oval grid at every altitude step of the ray.
  const drawGlobeAt = html.indexOf('function drawGlobe()');
  assert.ok(html.indexOf('function marchAuroraShell') < drawGlobeAt, 'marchAuroraShell is top level');
  const marchBody = html.slice(html.indexOf('function marchAuroraShell'),
    html.indexOf('// ===== 🌌 Live aurora oval fetch'));
  assert.match(marchBody, /auroraGlowAt\(globeAsinDeg\(gy\), globeAtan2Deg\(gx, gz\)\);/,
    'each altitude sample reads the oval grid');
  assert.match(marchBody, /auroraTrueColor\(\(alt - 100\) \/ 450\)/,
    'colour walks the true spectrum by ALTITUDE');
  // The old flat per-pixel tint is gone…
  assert.doesNotMatch(html, /const glowBase = auroraGlowAt\(latDeg, lngDeg\);/,
    'no surface-only glow sampling left in the pixel loop');
  // …and curtain tops peek past the planet edge instead of staying transparent.
  assert.match(html, /above the limb: the tops of far-side curtains peek past/);
  assert.match(html, /out\[oi \+ 3\] = Math\.min\(255, auroraMarchA \* 320\);/);
  // March outputs are 0..~1 linear light but the pixel buffer is 0..255:
  // both painters must scale by 255, otherwise Uint8ClampedArray rounds
  // every channel to 0 = black patches (off-disc) / invisible (on-disc).
  assert.match(html, /out\[oi\] = auroraMarchR \* 255;/, 'off-limb write is scaled to 0..255');
  assert.match(html, /out\[idx\] \+= auroraMarchR \* 255;/, 'on-disc add is scaled to 0..255');
  // Colours must stay saturated: overlapping ray samples sum toward white,
  // so the marcher caps peak emission (0.7) to keep green/violet/red hues.
  assert.match(html, /if \(mPeak > 0\.7\)/, 'marcher caps emission to preserve hue');
  assert.match(html, /\[0\.00, 16, 255, 110\]/, 'green 557.7 nm floor is saturated');
  assert.match(html, /\[1\.00, 255, 45, 85\]/, 'red 630.0 nm top is saturated');
});

test('globe: atmosphere halo survives putImageData and sits behind the disc', () => {
  // Regression: the halo used to be painted BEFORE putImageData (which
  // REPLACES every pixel, erasing it) and the canvas had border-radius: 50%
  // (clipping the halo + off-limb aurora tops). Both are fixed:
  //   • the glow paints AFTER putImageData with destination-over → behind
  //     the disc, never over surface/borders/markers/aurora;
  //   • the canvas has no circular clip (the .globe-stage stays circular).
  assert.match(html, /putImageData\(img, 0, 0\);[\s\S]{0,1200}globalCompositeOperation = 'destination-over'/,
    'halo paints after putImageData with destination-over');
  assert.match(html, /createRadialGradient\(cx, cy, R \* 0\.99, cx, cy, R \* 1\.45\)/,
    'halo hugs the limb and fades to ~1.45 R');
  assert.doesNotMatch(html, /\.globe-stage canvas \{[^}]*border-radius:\s*50%/,
    'canvas is not circularly clipped');
});

test('aurora route is wired everywhere (local + Vercel + dist)', () => {
  const root = path.join(__dirname, '..');
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(require('node:fs').existsSync(path.join(root, 'api', 'aurora.js')), 'api/aurora.js exists');
  assert.match(read('server-local.js'), /\/api\/aurora/, 'local server routes /api/aurora');
  assert.ok(JSON.parse(read('vercel.json')).functions['api/aurora.js'], 'vercel.json configures api/aurora.js');
  assert.match(read('scripts/sync-dist.js'), /api\/aurora\.js/, 'sync-dist copies api/aurora.js');
});
