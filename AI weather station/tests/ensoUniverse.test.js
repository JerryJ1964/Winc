// Regression: 🌊 adjustable ENSO dial + live ONI + 🌌 Celestia-credited stars.
//   1. ENSO dial (-3..+3 slider, presets, Live ONI button) scales the El Niño /
//      La Niña SST lookups; live ONI comes from /api/weather?action=enso (no new
//      Vercel function — Hobby stays at 12).
//   2. Universe draws UNIVERSE_BRIGHT_STARS (Yale BSC / Hipparcos positions, the
//      same public catalogues Celestia uses) with a Celestia credit.
// Run: node tests/ensoUniverse.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = ['index.html', 'app.js', 'style.css'].map((fn) => fs.readFileSync(path.join(__dirname, '..', fn), 'utf8')).join('\n');
const weatherApi = require('../api/weather.js');
const weatherInternal = weatherApi._internal || {};

test('ENSO dial: slider, presets, live button, readout', () => {
  assert.match(html, /id="enso-dial"[^>]*min="-3"[^>]*max="3"/, 'slider spans -3..+3 °C');
  assert.match(html, /id="enso-val"/, 'dial readout exists');
  assert.match(html, /data-enso="-1\.5"/, 'La Niña preset exists');
  assert.match(html, /data-enso="1\.5"/, 'El Niño preset exists');
  assert.match(html, /id="enso-live-btn"/, 'Live ONI button exists');
  assert.match(html, /id="enso-live"/, 'live ONI readout exists');
  assert.match(html, /function setEnsoDial\(/, 'setEnsoDial() wires the dial');
  assert.match(html, /function ensoWarmGain\(\)/, 'warm gain scales El Niño');
  assert.match(html, /function ensoColdGain\(\)/, 'cold gain scales La Niña');
  assert.match(html, /\/api\/weather\?action=enso/, 'dial seeds from the live ONI route');
});

test('ENSO dial scales the SST lookups (neutral fades both out)', () => {
  assert.match(html, /sstGridValue\(elNinoGrid[^)]*\)\s*\*\s*ensoWarmGain\(\)/, 'El Niño lookup is dial-scaled');
  assert.match(html, /sstGridValue\(laNinaGrid[^)]*\)\s*\*\s*ensoColdGain\(\)/, 'La Niña lookup is dial-scaled');
});

test('ENSO API: ONI parse + phase + 24 h cache, no new function', () => {
  assert.equal(typeof weatherInternal.parseOniText, 'function', 'parseOniText exists');
  const rows = weatherInternal.parseOniText(' SEAS  YR   TOTAL   ANOM\n  JFM 2024  28.30   1.53\n  FMA 2024  28.40   1.18\n');
  assert.equal(rows.length, 2, 'two ONI rows parse');
  assert.equal(rows[1].anomaly, 1.18, 'anomaly parses');
  assert.equal(weatherInternal.ensoPhaseFor(1.2).phase, 'elnino', '+1.2 is El Niño');
  assert.equal(weatherInternal.ensoPhaseFor(-1.2).phase, 'lanina', '-1.2 is La Niña');
  assert.equal(weatherInternal.ensoPhaseFor(0.1).phase, 'neutral', '+0.1 is neutral');
  assert.equal(weatherInternal.ENSO_TTL_MS, 24 * 60 * 60 * 1000, 'server cache is 24 h');
  assert.match(weatherInternal.ENSO_FEED, /cpc\.ncep\.noaa\.gov/, 'feed is NOAA CPC (already allowlisted)');
});

test('Universe: real bright-star sky with Celestia credit (on-device, free)', () => {
  assert.match(html, /UNIVERSE_BRIGHT_STARS/, 'bright-star catalog is embedded');
  assert.match(html, /\['Sirius', 6\.752, -16\.72, -1\.46\]/, 'Sirius has its real RA/Dec/mag');
  assert.match(html, /\['Polaris', 2\.530, 89\.264, 1\.98\]/, 'Polaris is catalogued');
  assert.match(html, /function universeRealStars\(/, 'universeRealStars() paints the catalog');
  assert.match(html, /Yale Bright Star Catalog/, 'Yale BSC is credited');
  assert.match(html, /Hipparcos/, 'Hipparcos is credited');
  assert.match(html, /Celestia/, 'Celestia is credited');
});

test('Universe rotation: Milky Way rigid turn + bounded sway, Sun locked to its arm; Local Group spins in place; Moon orbits Earth', () => {
  assert.match(html, /const rot = spin \* 0\.05/, 'Milky Way has one rigid disc turn');
  assert.match(html, /const sway = st\.bar/, 'stars use a bounded sway (no accumulating shear)');
  assert.match(html, /Math\.sin\(spin \* 0\.35/, 'sway is a sine wobble that cannot wind up');
  assert.ok(!html.includes('spin * shear'), 'the old unbounded spin*shear drift is gone');
  assert.match(html, /const sunAng = 2\.35 \+ rot;/, 'the Sun rides the arm turn exactly — no drift');
  assert.ok(!html.includes('rot * 0.8'), 'the old 0.8× Sun drift is gone');
  assert.match(html, /const ang = spin \* 0\.06 \+ arm \* Math\.PI/, 'each Local Group galaxy spins around its own centre');
  assert.match(html, /const spin = universeMotionOK \? universeT : 0/, 'rotation freezes under prefers-reduced-motion');
  assert.match(html, /const moonAng = -0\.9 \+ moonSpin \* \(2 \* Math\.PI \/ 6\)/, 'Earth view shows the Moon orbiting Earth');
  assert.match(html, /🌙 Moon/, 'Moon is labelled in the Earth view');
  assert.match(html, /const mAng = -0\.9 \+ mSpin \* \(2 \* Math\.PI \/ 2\.2\)/, 'Solar System view shows the Moon orbiting Earth');
});

test('Universe: Moon orbits pass BEHIND Earth and IN FRONT (depth-correct draw order)', () => {
  assert.match(html, /function drawUniverseMoonDisc\(/, 'shared shaded Moon disc helper exists');
  // Earth view: far-side test + far half of the ring painted before the globe…
  assert.match(html, /const moonBehind = mY < cy/, 'Moon behind Earth = above the centre line');
  const farRing = html.indexOf('mStar + Math.PI, mStar + 2 * Math.PI');
  const behindDraw = html.indexOf('if (moonBehind) drawUniverseMoonDisc');
  const earthFill = html.indexOf("ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fillStyle = og; ctx.fill()");
  assert.ok(farRing > -1 && behindDraw > -1 && earthFill > -1, 'far-half ring and behind-Moon draw sites exist');
  assert.ok(farRing < earthFill && behindDraw < earthFill, 'far ring half + behind Moon are drawn BEFORE Earth (hidden by it)');
  // …and the near half + Moon drawn after the globe (crossing in front).
  const frontRing = html.indexOf('mStar, mStar + Math.PI');
  const frontDraw = html.indexOf('if (!moonBehind) drawUniverseMoonDisc');
  assert.ok(frontRing > earthFill && frontDraw > earthFill, 'near ring half + front Moon are drawn AFTER Earth (on top)');
  // Label suppressed while the Moon is hidden behind the globe.
  assert.match(html, /const moonVisible = !moonBehind \|\| Math\.hypot/, 'Moon label only when actually visible');
  // Solar System view: same depth split around Earth's disc.
  assert.match(html, /const mFront = mPY >= py/, 'System Moon near-side test (below Earth centre)');
  const sysBehind = html.indexOf('if (!mFront) drawUniverseMoonDisc');
  const planetFill = html.indexOf('ctx.arc(px, py, pr, 0, 2 * Math.PI); ctx.fill()');
  assert.ok(sysBehind > -1 && sysBehind < planetFill, 'System back-side Moon drawn BEFORE Earth globe');
  assert.ok(html.indexOf('ctx.ellipse(px, py, moonInfo.mR') > planetFill, 'System near lunar arc drawn AFTER Earth globe');
  assert.match(html, /hidden: !mFront && Math\.hypot/, 'System Moon hides only when eclipsed by Earth\'s disc');
});

test('Universe: Solar System uses real Keplerian orbits (Sun at focus) and always labels every planet', () => {
  assert.match(html, /function solveKepler\(M, e\)/, 'Kepler equation solved for the eccentric anomaly');
  assert.match(html, /function orbitOffset\(pl, E, rr\)/, 'perifocal → screen projection exists');
  assert.match(html, /e: 0\.2056, i: 7\.005/, 'Mercury carries its real eccentricity + inclination');
  assert.match(html, /node: 48\.331/, 'real longitude of the ascending node is used');
  assert.match(html, /peri: 77\.456/, 'real longitude of perihelion is used');
  assert.match(html, /Math\.pow\(30\.11, 0\.42\)/, 'axis scale normalised to Neptune so all eight rings fit the canvas');
  assert.match(html, /const ro = orbitOffset\(pl, \(s \/ 72\) \* 2 \* Math\.PI, rr\)/, 'orbit rings are sampled ellipses (Sun at the focus)');
  assert.match(html, /solveKepler\(Mw, pl\.e\)/, 'planet positions come from Kepler\'s equation (2nd law)');
  assert.ok(!html.includes('pl.inc'), 'the fake inclination wobble is gone');
  assert.ok(!html.includes('zoom >= 1.4'), 'planet names are no longer zoom-gated');
  assert.match(html, /universeLabel\(ctx, pl\.name, px, py \+ pr \+ 9/, 'every planet name is drawn unconditionally');
});
