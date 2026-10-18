// Regression checks for the globe's country-border layer (the 🗺️ Borders chip).
// Static checks on index.html / sw.js / sync-dist.js plus one offline browser pass
// that serves the HTML and the TopoJSON from the repo. Run:
//   node tests/globeBorders.test.js      (also part of `npm test`)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<link rel="stylesheet" href="style.css">', () => '<style>' + fs.readFileSync(path.join(root, 'style.css'), 'utf8') + '</style>').replace('<script src="app.js" defer></script>', () => '<script>' + fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '</script>');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const syncDist = fs.readFileSync(path.join(root, 'scripts', 'sync-dist.js'), 'utf8');
const COARSE = path.join(root, 'data', 'countries-110m.json');
const DETAILED = path.join(root, 'data', 'countries-50m.json');
const coarse = JSON.parse(fs.readFileSync(COARSE, 'utf8'));
const detailed = JSON.parse(fs.readFileSync(DETAILED, 'utf8'));

test('static: the Borders chip, its switch and its painter are all wired', () => {
  const chip = html.match(/<button[^>]*data-globe-layer="borders"[^>]*>/);
  assert.ok(chip, 'a legend button switches the borders layer');
  assert.match(chip[0], /data-layer-title="[^"]+"/, 'the chip carries a layer title');
  assert.match(chip[0], /aria-pressed="true"/, 'the outlines start switched on');
  assert.match(chip[0], /type="button"/, 'the chip is a button, not a submit');

  assert.match(html, /borders:\s*true,/, 'globeLayerOn carries the borders key');
  assert.match(html, /drawGlobeBorders\(ctx, cx, cy, R, size, cosC, sinC, cosT, sinT\)/,
    'drawGlobe() paints the outlines between the graticule and the weather markers');
  assert.ok(html.includes('globeLayerOn.borders === false'),
    'the painter checks its switch, so the chip really hides the lines');
  assert.ok(html.includes('loadGlobeBorders();'), 'the coarse outlines are fetched at start-up');
  assert.ok(html.includes('updateGlobeBorders(globeZoom);'),
    'the per-frame update (retry + deep-zoom upgrade) runs from drawGlobe()');

  // The data must ship with the app: no third-party CDN to fail or to leak users to.
  assert.match(html, /const GLOBE_BORDERS_BASE_URL = 'data\/countries-110m\.json'/,
    'the coarse outlines are served from this site');
  assert.match(html, /const GLOBE_BORDERS_DETAIL_URL = 'data\/countries-50m\.json'/,
    'the detailed outlines are served from this site');
  assert.ok(!/https?:\/\/[^'"]*world-atlas/.test(html), 'no CDN is fetched for the borders');
});

test('static: the outlines are precached, copied into dist and valid TopoJSON', () => {
  assert.ok(sw.includes("'/data/countries-110m.json'"),
    'the service worker precaches the coarse outlines so borders work offline');
  assert.ok(syncDist.includes('data/countries-110m.json'), 'sync-dist copies the coarse file');
  assert.ok(syncDist.includes('data/countries-50m.json'), 'sync-dist copies the detailed file');

  for (const [file, topo] of [['110m', coarse], ['50m', detailed]]) {
    assert.ok(topo.objects && topo.objects.countries, `${file}: countries object present`);
    assert.ok(topo.objects.countries.geometries.length > 150, `${file}: country geometries present`);
    assert.ok(topo.arcs.length > 500, `${file}: arcs present`);
    assert.ok(topo.transform && topo.transform.scale, `${file}: quantized transform present`);
  }
});

// ---------- offline browser behaviour ----------

test('coastlines and land borders stroke with the switch on and vanish with it off', async () => {
  // Dynamic import, like localMapControls: the installed puppeteer is ESM-only, so
  // a bare require() would break `npm test` on older Node.
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        request.respond({ status: 200, contentType: 'text/html', body: html });
      } else if (url.includes('/data/countries-')) {
        // Deterministic offline run: the outlines come from the repo, live feeds don't.
        const file = url.includes('-50m') ? DETAILED : COARSE;
        request.respond({ status: 200, contentType: 'application/json', body: fs.readFileSync(file, 'utf8') });
      } else {
        request.abort();
      }
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('typeof drawGlobeBorders === "function"');
    await page.waitForFunction('!!globeBorders', { timeout: 30000 });

    const out = await page.evaluate((coarseArcs) => {
      // Deterministic camera: lng 0 dead centre, whole planet, no spin.
      globeAutoRotate = false;
      globeRotAnimating = false;
      globeRotY = 0;
      globeTiltX = 0;
      globeZoom = 1;
      viewDx = 0;
      viewDy = 0;

      const ctx = globeCtx;
      const size = globeCanvas.width;
      const R = size * 0.40 * Math.max(0.8, globeZoom);
      const c = globeRotY * Math.PI / 180;
      const t = globeTiltX * Math.PI / 180;
      // Exactly the arguments drawGlobe() hands the painter, rebuilt so this
      // measurement isolates the outlines from every other overlay on the canvas.
      const args = [ctx, size / 2 + viewDx, size / 2 + viewDy, R, size,
        Math.cos(c), Math.sin(c), Math.cos(t), Math.sin(t)];

      const measure = () => {
        const orig = { moveTo: ctx.moveTo, lineTo: ctx.lineTo, stroke: ctx.stroke };
        const count = { moveTo: 0, lineTo: 0, stroke: 0 };
        ctx.moveTo = function () { count.moveTo += 1; return orig.moveTo.apply(ctx, arguments); };
        ctx.lineTo = function () { count.lineTo += 1; return orig.lineTo.apply(ctx, arguments); };
        ctx.stroke = function () { count.stroke += 1; return orig.stroke.apply(ctx, arguments); };
        try { drawGlobeBorders.apply(null, args); } finally {
          ctx.moveTo = orig.moveTo;
          ctx.lineTo = orig.lineTo;
          ctx.stroke = orig.stroke;
        }
        return count;
      };

      // Every decoded vertex must sit on the unit sphere: the TopoJSON deltas are
      // cumulative, so a decoding slip would put a whole country out of place.
      let offSphere = 0;
      let badLat = 0;
      for (const set of [globeBorders.coast, globeBorders.land]) {
        for (let i = 0; i < set.xyz.length; i += 3) {
          const r = Math.hypot(set.xyz[i], set.xyz[i + 1], set.xyz[i + 2]);
          if (Math.abs(r - 1) > 0.001) offSphere += 1;
          const lat = Math.asin(Math.max(-1, Math.min(1, set.xyz[i + 1]))) * 180 / Math.PI;
          if (Math.abs(lat) > 90.001) badLat += 1;
        }
      }

      // Arc culling: an arc whose centre is behind the globe (and whose chord is
      // too short to reach the horizon) is dropped before it is ever projected.
      const cull = {
        hidden: globeBorderArcVisible([0, 0, -1, 0.1], 0, 0, 0, 1),
        shown: globeBorderArcVisible([0, 0, 1, 0.1], 0, 0, 0, 1)
      };

      const on = measure();
      setGlobeLayer('borders', false);
      const off = measure();
      const chipOffState = globeLayerOn.borders;
      setGlobeLayer('borders', true);

      return {
        sets: {
          coastArcs: globeBorders.coast.count, landArcs: globeBorders.land.count,
          coastVerts: globeBorders.coast.vertices, landVerts: globeBorders.land.vertices
        },
        totalArcs: globeBorders.coast.count + globeBorders.land.count,
        on, off, offSphere, badLat, cull, chipOffState
      };
    }, coarse.arcs.length);

    // Both kinds of line are drawn: coastlines and shared land borders, together
    // covering every arc of the file (claimed by one ring = a shore, by two or
    // more = a border).
    assert.equal(out.totalArcs, coarse.arcs.length, 'every arc lands in exactly one set');
    assert.ok(out.sets.coastArcs > 200, 'coastline arcs were detected');
    assert.ok(out.sets.landArcs > 300, 'land-border arcs were detected');
    assert.ok(out.on.lineTo > 2000, 'the painter strokes a full planet of outlines');
    assert.ok(out.on.stroke <= 6, 'the strokes stay bucketed by depth band');
    assert.deepEqual(out.off, { moveTo: 0, lineTo: 0, stroke: 0 },
      'switching the layer off strokes nothing');
    assert.equal(out.chipOffState, false, 'the chip actually turns the switch off');
    assert.equal(out.offSphere, 0, 'every decoded vertex sits on the unit sphere');
    assert.equal(out.badLat, 0, 'no decoded latitude escapes the poles');
    assert.equal(out.cull.hidden, false, 'a far-side arc is culled whole');
    assert.equal(out.cull.shown, true, 'a camera-facing arc is kept');
  } finally {
    await browser.close();
  }
});

