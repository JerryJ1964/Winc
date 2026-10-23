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

test('Universe: North Pole and South Pole views exist to check the Moon', () => {
  assert.match(html, /data-universe="north"/, 'North Pole view button exists');
  assert.match(html, /data-universe="south"/, 'South Pole view button exists');
  assert.match(html, /function universePoleProject\(/, 'universePoleProject() projects a polar view');
  assert.match(html, /function drawUniversePole\(/, 'drawUniversePole() paints the polar views');
});

test('Universe pole views: captions describe the tidally locked Moon', () => {
  assert.match(html, /tidal lock/, 'pole view names the tidal lock');
  assert.ok(!/never rotat/i.test(html), 'no pole caption repeats the "the Moon never rotates" myth');
});

test('Universe pole views: the tidally locked Moon rotates correctly from each pole', () => {
  // drawUniversePole must exist and paint both polar views.
  assert.match(html, /function drawUniversePole\(/, 'drawUniversePole() paints the polar views');
  // Tidal lock: the Moon's face (mare) always aims at Earth, so the rotation is
  // the screen angle from the Moon to Earth's centre — it is computed, not fixed.
  assert.match(html, /Math\.atan2\(cy - mY, cx - mX\)/, 'pole Moon rotation aims at Earth (tidal lock)');
  // The Moon's orbit is projected through orbitPoint(), which reverses the
  // apparent node tilt between the North and South Pole views, so the orbit line
  // is NOT the same from the two poles.
  assert.match(html, /const orbitPoint\s*=\s*\(a\)/, 'orbitPoint() projects the Moon onto its orbit');
  assert.match(html, /const nodeN\s*=\s*1\.0/, 'nodeN sets the North Pole node angle');
assert.match(html, /const nodeS\s*=\s*nodeN \+ 0\.9/, 'nodeS sets the South Pole node angle');
assert.match(html, /const node\s*=\s*north \? nodeN : nodeS/, 'node angle differs between poles');
  assert.match(html, /north \? -ry : ry/, 'South Pole mirrors the Moon position on the orbit');
  assert.match(html, /function universePoleProject\(/, 'universePoleProject() projects each polar view');
});

test('Universe rotation: Milky Way is a rigid density-wave turn on a logarithmic spiral, Sun locked to its arm; Local Group spins in place; Moon orbits Earth', () => {
  assert.match(html, /const rot = spin \* 0\.05/, 'Milky Way has one rigid disc turn');
  assert.match(html, /function mwArmAngle\(rad, arm\)/, 'arms follow a logarithmic spiral (constant pitch angle)');
  assert.match(html, /Math\.tan\(MW_PITCH\)/, 'the log spiral uses the Milky Way pitch angle');
  assert.match(html, /const MW_PITCH = 20 \* Math\.PI \/ 180/, 'pitch ~20°: each arm sweeps under one turn bar-to-rim — a spiral, not concentric rings');
  assert.match(html, /const MW_R0 = 0\.18/, 'arms ignite at the bar ends');
  assert.match(html, /return arm \* \(2 \* Math\.PI \/ MW_ARMS\) - Math\.log\(r \/ MW_R0\) \/ Math\.tan\(MW_PITCH\)/, 'Milky Way arm winding runs AGAINST the turn: arms trail, never screw in');
  assert.ok(!html.includes('spin * shear'), 'the old unbounded spin*shear drift is gone');
  assert.match(html, /const sunAng = mwArmAngle\(sunRad, 1\) \+ 0\.12 \+ rot;/, 'the Sun sits ON the arm equation and rides the turn exactly — no drift');
  assert.ok(!html.includes('rot * 0.8'), 'the old 0.8× Sun drift is gone');
  assert.match(html, /const ang = spin \* 0\.06 \+ arm \* Math\.PI - Math\.log\(Math\.max\(gR0, rr \/ R\) \/ gR0\) \/ Math\.tan\(gPitch\)/, 'each Local Group galaxy spins around its own centre with trailing arms');
  assert.match(html, /const ax = gX\(-0\.42\), ay = gY\(-0\.28\), ar = gR\(0\.30\)/, 'Andromeda layout position + radius are zoom-aware');
  assert.match(html, /drawUniverseGalaxyAt\(ctx, ax, ay, ar, 3\.7, 0\.9, 0\.5\)/, 'Andromeda winds ~0.9 turns — sub-turn sweep, never a bullseye');
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
  // 🌙 No view may show a frozen or tumbling lunar face: every disc call passes
  // the tidal-lock angle — the mare (near side) aimed at Earth, one turn per orbit.
  assert.match(html, /if \(moonBehind\) drawUniverseMoonDisc\(ctx, mX, mY, mr, moonRot\)/, 'Earth back-side Moon passes its spin');
  assert.match(html, /if \(!moonBehind\) drawUniverseMoonDisc\(ctx, mX, mY, mr, moonRot\)/, 'Earth front-side Moon passes its spin');
  assert.match(html, /if \(!mFront\) drawUniverseMoonDisc\(ctx, mPX, mPY, mPR, mRot\)/, 'System back-side Moon passes its spin');
  assert.match(html, /drawUniverseMoonDisc\(ctx, moonInfo\.mPX, moonInfo\.mPY, moonInfo\.mPR, moonInfo\.rot\)/, 'System front-side Moon passes its spin');
  // 🌙 TIDAL LOCK is the law: each view orients the face along the Moon→Earth
  // line (the mare always faces Earth), and the old 2× pole-to-pole tumble is gone.
  assert.match(html, /const moonRot = Math\.atan2\(cy - mY, cx - mX\)/, 'Earth view: face angle = true direction to Earth (tidal lock)');
  assert.match(html, /const mRot = Math\.atan2\(py - mPY, px - mPX\)/, 'System view: face angle = true direction to Earth (tidal lock)');
  assert.ok(!html.includes('moonAng * 2'), 'the old Earth-view 2× spin (tumble) is gone');
  assert.ok(!html.includes('mAng * 2'), 'the old System-view 2× spin (tumble) is gone');
});

test('Universe: Moon surface features visibly rotate (mare + craters move with rot)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const start = src.indexOf('function drawUniverseMoonDisc(');
  assert.ok(start > -1, 'disc helper exists');
  const braceAt = src.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = braceAt; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  assert.ok(end > -1, 'function body extracted');
  const draw = new Function('return ' + src.slice(start, end))();
  const record = (rot) => {
    const calls = [];
    const ctx = new Proxy({}, {
      get(t, p) {
        if (typeof p === 'symbol') return undefined;
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => ({ addColorStop() {} });
        return (...a) => calls.push(p + '(' + a.map((n) => (typeof n === 'number' ? n.toFixed(4) : JSON.stringify(n))).join(',') + ')');
      },
      set() { return true; },
    });
    draw(ctx, 50, 50, 20, rot);
    return calls;
  };
  const still = record(0);
  const spun = record(1.3);
  assert.ok(still.length > 4, 'the disc draws several surface features');
  assert.equal(still.length, spun.length, 'rotation moves features, it does not add or remove them');
  assert.notDeepEqual(still, spun, 'rot=1.3 draws a different lunar face than rot=0');
});

test('Universe: the Moon is TIDALLY LOCKED — it turns exactly once per orbit, mare always facing Earth', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // Pull the REAL lines out of app.js and evaluate them, so this test checks
  // the shipped maths (not a hand-copied copy of it).
  const line = (re, what) => {
    const m = src.match(re);
    assert.ok(m, 'source line found: ' + what);
    return m[0].trim();
  };
  const earthL = {
    ang: line(/const moonAng = -0\.9 \+ moonSpin \* \(2 \* Math\.PI \/ 6\);/, 'Earth orbit angle'),
    moonR: line(/const moonR = R \* 1\.9;/, 'Earth orbit radius'),
    tilt: line(/const moonTilt = -0\.35;/, 'Earth orbit tilt'),
    minor: line(/const moonMinor = 0\.42;/, 'Earth orbit flattening'),
    rot: line(/const moonRot = Math\.atan2\(cy - mY, cx - mX\);/, 'Earth face angle')
  };
  const sysL = {
    ang: line(/const mAng = -0\.9 \+ mSpin \* \(2 \* Math\.PI \/ 2\.2\);/, 'System orbit angle'),
    mR: line(/const mR = pr \+ 14;/, 'System orbit radius'),
    mPY: line(/const mPY = py \+ Math\.sin\(mAng\) \* mR \* 0\.55;/, 'System orbit y'),
    rot: line(/const mRot = Math\.atan2\(py - mPY, px - mPX\);/, 'System face angle')
  };

  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // The face angle is an atan2 (wrapped to [-PI,PI]) — unwrap it to count the
  // turns the face really makes.
  const turns = (list) => {
    let total = 0;
    for (let i = 1; i < list.length; i++) total += norm(list[i] - list[i - 1]);
    return total;
  };

  // ---- Earth view: one orbit every 6 s ----
  {
    const cx = 400, cy = 300, R = 150;
    const body = [
      earthL.ang.replace('moonSpin', 'T'), earthL.moonR, earthL.tilt, earthL.minor,
      'const cosTilt = Math.cos(moonTilt), sinTilt = Math.sin(moonTilt);',
      'const mOX = Math.cos(moonAng) * moonR;',
      'const mOY = Math.sin(moonAng) * moonR * moonMinor;',
      'const mX = cx + mOX * cosTilt - mOY * sinTilt;',
      'const mY = cy + mOX * sinTilt + mOY * cosTilt;',
      earthL.rot
    ].join('\n');
    const earthAt = (T) => new Function('T', 'cx', 'cy', 'R', body + '\nreturn { moonRot, mX, mY, moonAng };')(T, cx, cy, R);

    // 1) The face must point at Earth at EVERY instant.
    let worst = 0;
    const face = [];
    for (let i = 0; i <= 600; i++) {
      const s = earthAt((6 * i) / 600);
      const toEarth = Math.atan2(cy - s.mY, cx - s.mX);
      worst = Math.max(worst, Math.abs(norm(s.moonRot - toEarth)));
      face.push(s.moonRot);
    }
    assert.ok(worst < 1e-9, 'Earth view: the mare always faces Earth (max deviation ' + worst + ' rad)');

    // 2) Over one full orbit the face must turn exactly ONCE.
    const t0 = earthAt(0), t1 = earthAt(6);
    assert.ok(Math.abs((t1.moonAng - t0.moonAng) - 2 * Math.PI) < 1e-9, 'Earth view: the orbit is a full turn in 6 s');
    assert.ok(Math.abs(turns(face) - 2 * Math.PI) < 1e-6, 'Earth view: the face turns exactly once per orbit (' + turns(face) + ' rad)');
  }

  // ---- Solar System view: one orbit every 2.2 s ----
  {
    const px = 500, py = 400, pr = 10;
    const body = [
      sysL.ang.replace('mSpin', 'T'), sysL.mR,
      'const mPX = px + Math.cos(mAng) * mR;',
      sysL.mPY, sysL.rot
    ].join('\n');
    const sysAt = (T) => new Function('T', 'px', 'py', 'pr', body + '\nreturn { mRot, mPX, mPY, mAng };')(T, px, py, pr);

    let worst = 0;
    const face = [];
    for (let i = 0; i <= 600; i++) {
      const s = sysAt((2.2 * i) / 600);
      const toEarth = Math.atan2(py - s.mPY, px - s.mPX);
      worst = Math.max(worst, Math.abs(norm(s.mRot - toEarth)));
      face.push(s.mRot);
    }
    assert.ok(worst < 1e-9, 'System view: the mare always faces Earth (max deviation ' + worst + ' rad)');

    const t0 = sysAt(0), t1 = sysAt(2.2);
    assert.ok(Math.abs((t1.mAng - t0.mAng) - 2 * Math.PI) < 1e-9, 'System view: the orbit is a full turn in 2.2 s');
    assert.ok(Math.abs(turns(face) - 2 * Math.PI) < 1e-6, 'System view: the face turns exactly once per orbit (' + turns(face) + ' rad)');
  }

  // 3) The old 2× pole-to-pole tumble must be gone for good.
  assert.ok(!src.includes('moonAng * 2'), 'the old Earth-view 2× spin (tumble) is gone');
  assert.ok(!src.includes('mAng * 2'), 'the old System-view 2× spin (tumble) is gone');
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

test('Local Group view: galaxy names anchored to each tilted rim; zoom magnifies in place', () => {
  assert.match(html, /const z = Math\.max\(0\.5, Math\.min\(3, zoom \|\| 1\)\)/, 'deep-view zoom is a real camera (0.5×–3×)');
  assert.match(html, /const gX = \(fx\) => cx \+ fx \* s \* z;/, 'layout positions magnify with the zoom');
  assert.match(html, /const gY = \(fy\) => cy \+ fy \* s \* z;/, 'layout heights magnify with the zoom');
  assert.match(html, /const gR = \(k\) => Math\.max\(8, s \* k \* z\)/, 'galaxy radii follow the zoom');
  assert.match(html, /const nameAt = \(text, x, y, r, tilt, fill\) => \{/, 'labels use the rim-anchor helper');
  assert.match(html, /y \+ r \* tilt \+ Math\.max\(10, r \* 0\.22\)/, 'a name sits just below the galaxy\'s tilted visual rim');
  assert.match(html, /const lx = Math\.max\(half \+ 4, Math\.min\(w - half - 4, x\)\)/, 'labels are clamped inside the canvas');
  assert.match(html, /\/\/ Pass 2 — …then every name on top, each glued to its own rim\./, 'names paint after the discs, never painted over');
  assert.ok(!html.includes('cy - s * 0.28 + s * 0.34'), 'the old floating Andromeda label offset is gone');
  assert.ok(!html.includes('const s = Math.min(w, hh) * 0.5 * zoom'), 'scale no longer swallows the zoom');
  assert.ok(!html.includes('Math.min(1.4, zoom || 1)'), 'the weak 1.4× zoom clamp is gone');
});

