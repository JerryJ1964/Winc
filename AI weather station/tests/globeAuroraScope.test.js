// Static structure regressions for the aurora/globe scope fix, the GPS intent
// guard and the forecast-player re-arm. Run: node tests/globeAuroraScope.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = ['index.html', 'app.js', 'style.css'].map((fn) => fs.readFileSync(path.join(__dirname, '..', fn), 'utf8')).join('\n');

test('aurora code lives at top level, never inside the per-frame painters', () => {
  // Declared exactly once — the old splice left state inside drawGlobe() where
  // it was re-created (empty) on every frame.
  assert.equal((html.match(/let auroraCells = \[\];/g) || []).length, 1);
  assert.equal((html.match(/async function fetchAurora\(\)/g) || []).length, 1);
  assert.equal((html.match(/function initAurora\(\)/g) || []).length, 1);

  const drawGlobeAt = html.indexOf('function drawGlobe()');
  assert.ok(drawGlobeAt > 0, 'drawGlobe exists');
  // State, helpers and the one-shot bootstrap all precede the painter…
  assert.ok(html.indexOf('function auroraGlowAt') < drawGlobeAt, 'auroraGlowAt is top level');
  const bootstrapAt = html.indexOf('} else { initAurora(); }');
  assert.ok(bootstrapAt !== -1, 'startup bootstrap exists');
  assert.ok(bootstrapAt < drawGlobeAt, 'bootstrap runs once at top level, not per frame');

  // …and nothing aurora-related remains inside the hurricane drawing loop.
  // (It used to sit in `for (const s of liveHurricanes)`, so every frame and
  // every storm re-ran initAurora() → fetchAurora() → drawGlobe(): a feedback
  // loop that fired hundreds of requests and froze the whole page.)
  const hurricaneStart = html.indexOf('function drawLiveHurricanes');
  const hurricaneEnd = html.indexOf('function drawLiveEarthquakes');
  assert.ok(hurricaneStart > 0 && hurricaneEnd > hurricaneStart, 'hurricane section found');
  const hurricaneSeg = html.slice(hurricaneStart, hurricaneEnd);
  assert.ok(!hurricaneSeg.includes('initAurora'), 'no aurora bootstrap in the hurricane loop');
  assert.ok(!hurricaneSeg.includes('fetchAurora'), 'no aurora fetch in the hurricane loop');
  assert.ok(!hurricaneSeg.includes('AURORA_REFRESH_MS'), 'no aurora timer in the hurricane loop');
});

test('aurora curtains paint every pixel after the shading pass via the prebuilt grid', () => {
  const ocean = html.indexOf('if (isOcean && seaTintOn) {');
  // Curtains are ADDED after the sunlight + limb shading pass, so they are pure
  // emission floating above the shaded surface — never tinted over the ground.
  const veil = html.indexOf('AURORA CURTAINS (additive emission above the surface');
  const shade = html.indexOf('// sunlight + limb shading');
  assert.ok(ocean > 0 && veil > ocean, 'veil is after the SST block');
  assert.ok(veil > shade, 'veil paints AFTER the shading pass (additive emission)');

  // The old code looped every aurora cell per pixel (~460 ms per globe frame
  // once the fetch actually worked). The painter must read the grid instead.
  const glowStart = html.indexOf('function auroraGlowAt');
  const glowEnd = html.indexOf('function ', glowStart + 10);
  const glowBody = html.slice(glowStart, glowEnd);
  assert.match(glowBody, /if \(!auroraGrid\) auroraGrid = buildAuroraGrid\(\);/,
    'glow samples the prebuilt grid');
  assert.ok(!glowBody.includes('for (let i = 0; i < auroraCells.length'),
    'no raw cell loop in the per-pixel path');
  // New data re-stamps the grid once.
  assert.match(html, /auroraCells = data\.cells;\s*\n\s*auroraGrid = null;/,
    'grid invalidated when fresh cells arrive');
});

test('GPS fixes are guarded by userIntentId, not by the background request id', () => {
  assert.match(html, /const gpsIntent = userIntentId;/);
  assert.match(html, /if \(gpsIntent !== userIntentId\) return;/);
  assert.doesNotMatch(html, /if \(gpsIntent !== weatherRequestId\) return;/,
    'weatherRequestId is bumped by every auto-refresh and must never cancel GPS');
  // Every explicit user choice bumps the intent…
  assert.match(html, /async function updateLocation\([\s\S]{0,600}\+\+userIntentId;/);
  assert.match(html, /addEventListener\('input', \(\) => \{[\s\S]{0,400}\+\+userIntentId;/);
});

test('a location change re-arms the one-shot forecast autoplay latch', () => {
  assert.match(html, /let localMapAutoPlayed = false;/);
  assert.match(html, /if \(placeChanged\) \{[\s\S]{0,500}localMapAutoPlayed = false;/,
    'a new place plays its own preview; same-place refreshes keep the latch');
});
