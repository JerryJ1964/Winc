// Regression: EVERY button beneath the globe can be switched on AND off.
//   • static structure checks (fast, no browser): real <button> chips, a
//     globeLayerOn switch per chip (and vice versa), click wiring, off-state
//     styling, and a layer guard inside every painter
//   • offline Puppeteer pass: clicks each chip and asserts the switch flips,
//     aria-pressed flips, the tooltip updates, and the layer's markers vanish
//     from the hit-test list while off — then all of it comes back on again
// Run: node tests/globeChips.test.js   (uses Node's built-in test runner)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace('<link rel="stylesheet" href="style.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8') + '</style>').replace('<script src="app.js" defer></script>', () => '<script>' + fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') + '</script>');

// globeLayerOn key → the hit-test type its markers are pushed with
// (quakes draw as 'quake'; elnino/gulf are tints with no click targets).
const LAYER_HIT_TYPE = {
  sun: 'sun',
  clouds: 'clouds',
  rain: 'rain',
  thunder: 'thunder',
  snow: 'snow',
  hurricane: 'hurricane',
  quakes: 'quake',
  volcano: 'volcano',
  fires: 'fires',
  landslide: 'landslide',
  avalanche: 'avalanche',
  tsunami: 'tsunami'
};

// ---------- static structure ----------

function legendChipTags() {
  return [...html.matchAll(/<button\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes('globe-legend-chip'));
}

function chipKeys() {
  return legendChipTags()
    .map((tag) => (tag.match(/data-globe-layer="([^"]+)"/) || [])[1])
    .filter(Boolean);
}

function stateKeys() {
  const block = html.match(/const globeLayerOn = \{([\s\S]*?)\};/);
  assert.ok(block, 'globeLayerOn switch table exists');
  return [...block[1].matchAll(/(\w+)\s*:\s*(?:true|false)/g)].map((m) => m[1]);
}

test('static: every legend button under the globe is wired as an on/off switch', () => {
  const tags = legendChipTags();
  assert.ok(tags.length >= 11, 'the legend row under the globe holds its chips');

  // The chips sit beneath the canvas, i.e. exactly where the task puts them.
  assert.ok(
    html.indexOf('id="globe-canvas"') < html.indexOf('id="globe-legend"'),
    'the legend (and its buttons) render after the globe canvas'
  );

  for (const tag of tags) {
    assert.match(tag, /type="button"/, 'chips are real buttons, not spans');
    assert.match(tag, /data-globe-layer="[^"]+"/, 'every chip names its layer');
    assert.match(tag, /data-layer-title="[^"]+"/, 'every chip keeps its base tooltip');
    assert.match(tag, /aria-pressed="(true|false)"/, 'every chip carries a pressed state');
  }

  // One chip ↔ one switch: neither side may drift alone.
  assert.deepEqual(
    [...chipKeys()].sort(),
    [...stateKeys()].sort(),
    'globeLayerOn has exactly one switch per chip under the globe'
  );

  // Click wiring: one delegated listener flips the switch via setGlobeLayer.
  assert.match(html, /querySelectorAll\('\[data-globe-layer\]'\)/,
    'the chips are looked up for wiring');
  assert.match(html, /chip\.addEventListener\('click', \(\) => setGlobeLayer\(/,
    'each chip click flips its own layer');
  assert.match(html, /function setGlobeLayer\(key, on\)/,
    'setGlobeLayer exists');
  assert.match(html, /chip\.setAttribute\('aria-pressed', on \? 'true' : 'false'\)/,
    'setGlobeLayer keeps the pressed state in sync');

  // Off-state must be visible, not just logical.
  assert.match(html, /\.globe-legend-chip\[aria-pressed="false"\]/,
    'CSS dims a switched-off chip');

  // "You are here" effects ride the same switches (fog → clouds chip, …).
  const youBlock = html.match(/const YOU_EFFECT_LAYER = \{([\s\S]*?)\};/);
  assert.ok(youBlock, 'YOU_EFFECT_LAYER map exists');
  const youTargets = [...youBlock[1].matchAll(/:\s*'(\w+)'/g)].map((m) => m[1]);
  const keys = new Set(stateKeys());
  for (const target of youTargets) {
    assert.ok(keys.has(target), `YOU_EFFECT_LAYER maps onto a real switch (${target})`);
  }

  // Every painter must honour its switch — otherwise a chip would flip
  // visually while its markers kept drawing.
  const guards = [
    ['weather markers', 'globeLayerOn[m.type] === false'],
    ['hurricanes', 'globeLayerOn.hurricane === false'],
    ['earthquakes', 'globeLayerOn.quakes === false'],
    ['volcanoes', 'globeLayerOn.volcano === false'],
    ['forest fires', 'globeLayerOn.fires === false'],
    ['mudslides & landslides', 'globeLayerOn.landslide === false'],
    ['snow avalanches', 'globeLayerOn.avalanche === false'],
    ['saharan dust', 'globeLayerOn.dust === false'],
    ['sandstorms', 'globeLayerOn.sandstorm === false'],
    ['tsunamis', 'globeLayerOn.tsunami === false'],
    ['sea tints', 'globeLayerOn.elnino !== false'],
    ['gulf tint', 'globeLayerOn.gulf !== false'],
    ['la niña tint', 'globeLayerOn.lanina !== false'],
    ['ocean labels', 'globeLayerOn[label.layer] === false'],
    ['you-effects', 'globeLayerOn[YOU_EFFECT_LAYER[kind]] !== false']
  ];
  for (const [what, snippet] of guards) {
    assert.ok(html.includes(snippet), `${what} painter checks its switch`);
  }

  // The sea-surface hint only makes sense while a tint is showing (three tints:
  // El Niño, Gulf Stream, La Niña — the hint hides only when ALL are off).
  assert.match(html, /seaHint\.hidden = globeLayerOn\.elnino === false && globeLayerOn\.gulf === false && globeLayerOn\.lanina === false/,
    'the sea hint hides only when ALL tints are off');
});

// ---------- offline browser behaviour ----------

// Regression: a globe painter that is CALLED but never DEFINED is a ReferenceError
// at run time, not a syntax error, so check-inline-js stayed green while the whole
// globe render died on every frame. Catch it statically by proving that every
// `draw*(` painter invoked from drawGlobe() actually has a definition.
test('every globe painter called from drawGlobe() is actually defined', () => {
  // Brace-match the real function body: a lazy /[\s\S]*?\n {8}\}/ stops at the
  // first nested helper that happens to close at the same indent (the sunrise
  // temperature ramp does), silently cutting off every painter call below it.
  const start = html.indexOf('function drawGlobe()');
  assert.ok(start >= 0, 'drawGlobe() body found');
  const open = html.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = open; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  assert.ok(end > open, 'drawGlobe() body closes');
  const body = html.slice(start, end + 1);

  // Collect the painter calls made inside drawGlobe(), ignoring method calls
  // (ctx.fill, globePoint, …) by only keeping names that start with `draw`.
  const called = new Set([...body.matchAll(/\b(draw[A-Za-z0-9_$]*)\s*\(/g)].map((m) => m[1]));
  assert.ok(called.size >= 5, 'drawGlobe() delegates to several painters');

  const missing = [...called].filter((name) =>
    !new RegExp('function\\s+' + name + '\\s*\\(').test(html));
  assert.deepEqual(missing, [],
    'every painter called from drawGlobe() has a definition (an undefined one ' +
    'throws a ReferenceError that silently kills every later layer)');

  // And the reverse sanity check: the wind-driven sandstorm painter must exist,
  // carry its layer guard, and use both halves of the dust+wind evidence.
  assert.match(html, /function drawSandstorms\(ctx, cx, cy, R, size\)/);
  assert.match(html, /globeLayerOn\.sandstorm === false/);
  assert.match(html, /\(p\.sandstormLevel \|\| 0\) > 0/,
    'a swirl is drawn only where the API says dust AND wind make a sandstorm');
});

test('the fire chip flame is lit only when active fire data is present', () => {
  assert.match(html, /class="globe-legend-chip" data-globe-layer="fires"[^>]*><span class="fire-icon"/,
    'forest fires use a real flame icon inside the on/off chip');
  assert.match(html, /chip\.classList\.toggle\('has-active-fires', count > 0\)/,
    'the chip gets a lit state from the active-fire count');
  assert.match(html, /\.globe-legend-chip\.has-active-fires \.fire-icon\s*\{[\s\S]*?drop-shadow/,
    'the active flame has a visible glow');
});

test('clicking any button beneath the globe switches its layer off and back on', async () => {
  // Dynamic import, like globeBorders: the installed puppeteer is ESM-only, so a
  // bare require() would break `npm test` whenever npm resolves an older Node.
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        request.respond({ status: 200, contentType: 'text/html', body: html });
      } else {
        request.abort(); // Deterministic offline run; no live weather required.
      }
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('typeof setGlobeLayer === "function" && typeof drawGlobe === "function"');

    const result = await page.evaluate(() => {
      const out = { chips: [], baseline: [], labels: {}, hint: {}, final: {} };

      // Deterministic camera: globeRotY = 0 puts lng 0 dead centre, so every
      // fixture below (and the static weather markers near it) is visible.
      globeRotY = 0;
      globeTiltX = 0;
      globeZoom = 1;
      viewDx = 0;
      viewDy = 0;

      // Seed one live fixture per feed on the visible hemisphere — offline the
      // real feeds are unreachable, but the painters must still run.
      liveHurricanes = [{ lat: 8, lng: 20, name: 'Chip Test Storm', windKmh: 120, knots: 65, category: { num: 1 } }];
      liveEarthquakes = [{ lat: -6, lng: 12, mag: 5.2, place: 'Chip Test Sea', url: '' }];
      liveVolcanoes = [{ lat: 2, lng: 28, name: 'Chip Test', country: 'Iceland', epochMs: Date.now() - 5 * 86400000 }];
      liveFires = [{ lat: -3, lng: 24, name: 'Chip Test Fire', epochMs: Date.now() - 3600000, acres: 120 }];
      liveLandslides = [{ lat: 12, lng: 30, name: 'Chip Test Slide', hazard: 'mudslide', epochMs: Date.now() - 3600000 }];
      landslideRisk = [{ lat: 15, lng: 33, name: 'Chip Test Slope', score: 64, level: 2 }];
      liveAvalanches = [{ lat: 10, lng: 16, name: 'Chip Test Zone', dangerLevel: 3, warning: null }];
      avalancheRisk = [{ lat: -9, lng: 19, name: 'Chip Test Massif', score: 58, level: 2 }];
      liveTsunamiMessages = [{
        lat: 4, lng: 34, category: 'Warning', threat: true, magnitude: 7.1,
        waveHeights: { maxM: 1.2, maxSource: 'observed', maxSite: 'Chip Test' }
      }];

      const hitTypes = () => [...new Set(lastWeatherHits.map((h) => h.type))];
      const chips = [...document.querySelectorAll('[data-globe-layer]')];
      const seaHint = document.querySelector('.sea-hint');

      drawGlobe();
      out.baseline = hitTypes();

      for (const chip of chips) {
        const key = chip.getAttribute('data-globe-layer');
        const row = {
          key,
          title0: chip.title,
          pressed0: chip.getAttribute('aria-pressed'),
          hits0: hitTypes(),
          on1: null, pressed1: null, title1: '', hits1: [],   // switched OFF
          on2: null, pressed2: null, title2: '', hits2: []     // switched ON again
        };

        chip.click();
        row.on1 = globeLayerOn[key];
        row.pressed1 = chip.getAttribute('aria-pressed');
        row.title1 = chip.title;
        drawGlobe();
        row.hits1 = hitTypes();

        chip.click(); // second click must switch it straight back on
        row.on2 = globeLayerOn[key];
        row.pressed2 = chip.getAttribute('aria-pressed');
        row.title2 = chip.title;
        drawGlobe();
        row.hits2 = hitTypes();

        out.chips.push(row);
      }


      // 🏷️ Sea-tint labels: rotate so each label faces the viewer, then flip.
      const origFill = globeCtx.fillText;
      const drawn = [];
      globeCtx.fillText = function (t, x, y) {
        drawn.push(t);
        return origFill.apply(this, arguments);
      };
      try {
        const probe = (rotation, text) => {
          globeRotY = rotation;
          viewDx = 0;
          viewDy = 0;
          drawn.length = 0;
          drawGlobe();
          return drawn.includes(text);
        };
        out.labels.elNinoOn = probe(135, 'El Niño');
        setGlobeLayer('elnino', false);
        out.labels.elNinoOff = probe(135, 'El Niño');
        setGlobeLayer('elnino', true);
        out.labels.gulfOn = probe(70, 'Gulf Stream');
        setGlobeLayer('gulf', false);
        out.labels.gulfOff = probe(70, 'Gulf Stream');
        setGlobeLayer('gulf', true);
      } finally {
        globeCtx.fillText = origFill;
      }

      // 🌊 The sea-surface hint follows the three tint switches.
      setGlobeLayer('elnino', false);
      setGlobeLayer('gulf', false);
      setGlobeLayer('lanina', false);
      out.hint.bothOff = !!seaHint.hidden;
      setGlobeLayer('gulf', true);
      out.hint.oneOn = !seaHint.hidden;
      setGlobeLayer('elnino', true);
      setGlobeLayer('lanina', true);

      // Leave the page exactly as it started: every chip switched on.
      globeRotY = 0;
      liveHurricanes = [];
      liveEarthquakes = [];
      liveVolcanoes = [];
      liveFires = [];
      liveLandslides = [];
      landslideRisk = [];
      liveAvalanches = [];
      avalancheRisk = [];
      liveTsunamiMessages = [];
      drawGlobe();
      out.final.pressed = [...document.querySelectorAll('[data-globe-layer]')]
        .map((c) => c.getAttribute('aria-pressed'));
      out.final.on = Object.fromEntries(
        [...document.querySelectorAll('[data-globe-layer]')].map((c) => {
          const k = c.getAttribute('data-globe-layer');
          return [k, globeLayerOn[k]];
        })
      );
      return out;
    });


    // Baseline: every layer's markers are drawn and clickable to begin with.
    for (const hitType of Object.values(LAYER_HIT_TYPE)) {
      assert.ok(result.baseline.includes(hitType), `baseline draws ${hitType} markers`);
    }

    assert.equal(result.chips.length, chipKeys().length,
      'every chip under the globe took part in the toggle run');

    for (const row of result.chips) {
      const what = `chip "${row.key}"`;
      assert.equal(row.pressed0, 'true', `${what} starts pressed`);
      // First click switches it off — flag, pressed state and tooltip all agree.
      assert.equal(row.on1, false, `${what} switches OFF on click`);
      assert.equal(row.pressed1, 'false', `${what} aria-pressed becomes false`);
      assert.match(row.title1, /switched off/, `${what} tooltip says it is off`);
      // While off its markers are not even hit-tested — no invisible click targets.
      const hitType = LAYER_HIT_TYPE[row.key];
      if (hitType) {
        assert.ok(row.hits0.includes(hitType), `${what} draws ${hitType} markers while on`);
        assert.ok(!row.hits1.includes(hitType), `${what} stops drawing ${hitType} markers while off`);
      }
      // Second click switches it fully back on.
      assert.equal(row.on2, true, `${what} switches ON again on the second click`);
      assert.equal(row.pressed2, 'true', `${what} aria-pressed returns to true`);
      assert.equal(row.title2, row.title0, `${what} tooltip is restored`);
      if (hitType) {
        assert.ok(row.hits2.includes(hitType), `${what} draws ${hitType} markers again`);
      }
    }

    // Sea-tint labels and the hint follow their chips too.
    assert.equal(result.labels.elNinoOn, true, 'El Niño label shows while its chip is on');
    assert.equal(result.labels.elNinoOff, false, 'El Niño label hides while its chip is off');
    assert.equal(result.labels.gulfOn, true, 'Gulf Stream label shows while its chip is on');
    assert.equal(result.labels.gulfOff, false, 'Gulf Stream label hides while its chip is off');
    assert.equal(result.hint.bothOff, true, 'sea hint hides when both tints are off');
    assert.equal(result.hint.oneOn, true, 'sea hint returns when one tint is on');

    // The run left every button beneath the globe switched on.
    assert.ok(result.final.pressed.every((p) => p === 'true'), 'all chips end pressed');
    assert.ok(Object.values(result.final.on).every(Boolean), 'all layers end switched on');
  } finally {
    await browser.close();
  }
});

