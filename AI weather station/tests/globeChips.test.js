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
const puppeteer = require('puppeteer');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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
    ['tsunamis', 'globeLayerOn.tsunami === false'],
    ['sea tints', 'globeLayerOn.elnino !== false'],
    ['gulf tint', 'globeLayerOn.gulf !== false'],
    ['ocean labels', 'globeLayerOn[label.layer] === false'],
    ['you-effects', 'globeLayerOn[YOU_EFFECT_LAYER[kind]] !== false']
  ];
  for (const [what, snippet] of guards) {
    assert.ok(html.includes(snippet), `${what} painter checks its switch`);
  }

  // The sea-surface hint only makes sense while a tint is showing.
  assert.match(html, /seaHint\.hidden = globeLayerOn\.elnino === false && globeLayerOn\.gulf === false/,
    'the sea hint hides only when BOTH tints are off');
});

// ---------- offline browser behaviour ----------

test('the fire chip flame is lit only when active fire data is present', () => {
  assert.match(html, /class="globe-legend-chip" data-globe-layer="fires"[^>]*><span class="fire-icon"/,
    'forest fires use a real flame icon inside the on/off chip');
  assert.match(html, /chip\.classList\.toggle\('has-active-fires', count > 0\)/,
    'the chip gets a lit state from the active-fire count');
  assert.match(html, /\.globe-legend-chip\.has-active-fires \.fire-icon\s*\{[\s\S]*?drop-shadow/,
    'the active flame has a visible glow');
});

test('clicking any button beneath the globe switches its layer off and back on', async () => {
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

      // 🌊 The sea-surface hint follows the two tint switches.
      setGlobeLayer('elnino', false);
      setGlobeLayer('gulf', false);
      out.hint.bothOff = !!seaHint.hidden;
      setGlobeLayer('gulf', true);
      out.hint.oneOn = !seaHint.hidden;
      setGlobeLayer('elnino', true);

      // Leave the page exactly as it started: every chip switched on.
      globeRotY = 0;
      liveHurricanes = [];
      liveEarthquakes = [];
      liveVolcanoes = [];
      liveFires = [];
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

