// Browser regression for the "Local weather · seen from above" controls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// 📐 The CSS size of the square: min(--lm-frac, max(--lm-cap, 90svh)) with the
// globe's own media-query steps mirrored in index.html — --lm-cap 540px base,
// 720px from 900px wide, 840px from 1280px, and --lm-cap 480px / --lm-frac 70%
// on short landscape screens — so the map is at least as big as the globe.
// (In headless Chrome 90svh === 90% of window.innerHeight.)
function expectedMapSquare(panelWidth, viewWidth, viewHeight) {
  const landscape = viewHeight <= 620 && viewWidth > viewHeight;
  const cap = landscape ? 480 : (viewWidth >= 1280 ? 840 : viewWidth >= 900 ? 720 : 540);
  const frac = landscape ? 0.7 : 1;
  return Math.round(Math.min(panelWidth * frac, Math.max(cap, viewHeight * 0.9)));
}

test('local-map controls are complete, accessible and not duplicated', () => {
  for (const id of ['localmap-layers', 'localmap-play', 'localmap-frame', 'localmap-zoom-in', 'localmap-zoom-out', 'localmap-zoom-reset']) {
    assert.ok(html.includes(`id="${id}"`), `${id} exists`);
  }
  assert.equal((html.match(/id="localmap-play"/g) || []).length, 1);
  assert.equal((html.match(/function applyLocalMapZoom\(/g) || []).length, 1);
  assert.equal((html.match(/function resetLocalMapZoom\(/g) || []).length, 1);
  assert.match(html, /btn\.setAttribute\('aria-pressed', on \? 'true' : 'false'\)/);
  assert.match(html, /localMapPlayBtn\.setAttribute\('aria-pressed', 'true'\)/);
  // ▶ The ⏩ 3-hour forecast starts itself once per page load — latched so a
  // 30-second weather refresh can never restart a pause the user chose.
  assert.match(html, /let localMapAutoPlayed = false;/);
  assert.match(html, /function maybeStartLocalMapAutoplay\(\) \{/);
  assert.match(html, /if \(!latestLocalMapFrameTimes \|\| latestLocalMapFrameTimes\.length < 2\) return;/);
  assert.match(html, /maybeStartLocalMapAutoplay\(\);\s*refreshLocalMapIconGrid\(\);/);
  // 📐 Option C — ONE continuous fluid width for the whole app. The .container is
  // min(100%, clamp(560px, 92vw, 1080px)) with clamp() padding (no more 620/820/940px
  // steps), and the 🛰️ card lives INSIDE it, so the form and the map are always the
  // same width. The bleed hack is gone; fitLocalMapLayout() only re-measures the canvas.
  assert.match(html, /\.container \{[\s\S]*?width: min\(100%, clamp\(560px, 92vw, 1080px\)\);/);
  assert.match(html, /\.container \{[\s\S]*?padding: clamp\(14px, 2\.4vw, 30px\);/);
  assert.doesNotMatch(html, /\.container \{ width: min\(100%, 620px\);/,
    'the old fixed 620px card width is replaced by the fluid clamp()');
  assert.doesNotMatch(html, /\.container \{ width: min\(100%, 820px\); padding: 30px; \}/,
    'the old 900px-step override is gone — the card scales continuously now');
  assert.doesNotMatch(html, /\.container \{ width: min\(100%, 940px\); \}/,
    'the old 1280px-step override is gone — the card scales continuously now');
  assert.doesNotMatch(html, /--lm-bleed-x/,
    'the full-bleed negative-margin hack is gone: the map sits inside the card');
  assert.match(html, /\.localmap-panel \{[\s\S]*?margin-left: 0;[\s\S]*?margin-right: 0;/);
  assert.match(html, /function fitLocalMapLayout\(\) \{/);
  assert.doesNotMatch(html, /function fitLocalMapLayout\(\) \{[\s\S]*?document\.documentElement\.clientWidth/,
    'fitLocalMapLayout no longer measures a bleed into the viewport');
  assert.match(html, /window\.addEventListener\('resize', fitLocalMapLayout\);/);
  // 📐 The bird's-eye map is the same big SQUARE as the 🌍 globe (aspect-ratio 1)
  // and follows the globe's own size steps: --lm-cap/--lm-frac mirror every
  // .globe-stage media query (540 → 720 → 840px, min(70%, 480px) landscape) and
  // max(--lm-cap, 90svh) (90vh fallback) keeps it at least as big as the globe.
  assert.match(html, /--lm-frac: 100%;/);
  assert.match(html, /--lm-cap: 540px;/);
  assert.match(html, /--lm-map-size: min\(var\(--lm-frac\), max\(var\(--lm-cap\), 90vh\)\);/);
  assert.match(html, /--lm-map-size: min\(var\(--lm-frac\), max\(var\(--lm-cap\), 90svh\)\);/);
  assert.match(html, /\.localmap-stage \{ --lm-cap: 720px; \}/);
  assert.match(html, /\.localmap-stage \{ --lm-cap: 840px; \}/);
  assert.match(html, /\.localmap-stage \{ --lm-cap: 480px; --lm-frac: 70%; \}/);
  assert.match(html, /\.localmap-stage \{[\s\S]*?box-sizing: border-box;/);
  assert.match(html, /\.localmap-stage \{[\s\S]*?width: var\(--lm-map-size\);[\s\S]*?aspect-ratio: 1;/);
  assert.match(html, /\.localmap-stage \{[\s\S]*?margin: 10px auto 6px;/);
  assert.match(html, /#localmap-map \{[\s\S]*?height: 100%;/);
  assert.equal((html.match(/clamp\(340px, 62vmin, 500px\)/g) || []).length, 1,
    'the old strip height survives only as the no-aspect-ratio fallback');
  assert.match(html, /@supports not \(aspect-ratio: 1\) \{[\s\S]*?\.localmap-stage \{ width: 100%; height: clamp\(340px, 62vmin, 500px\); \}/);
  assert.match(html, /if \(localMapGL && typeof localMapGL\.resize === 'function'\) localMapGL\.resize\(\);/);
  assert.match(html, /if \(showNow\) fitLocalMapLayout\(\);/);
  assert.match(html, /const homeChanged = nextHomeKey !== localMapGLState\.homeKey/);
  assert.match(html, /function localMapGLSyncAllVisibility\(\)/);
  assert.match(html, /el\.dataset\.layer = layer/);
  assert.match(html, /const layer = localMapIconLayer\(cell\)/);
  assert.match(html, /function localMapGLSyncAllVisibility\(\) \{[\s\S]*?localMapGLSyncIconVisibility\(\);[\s\S]*?localMapGLApplyVis\(\);[\s\S]*?\}/);
  assert.match(html, /syncLocalMapLayerBtns\(\);\s*localMapGLSyncAllVisibility\(\);/);
  assert.match(html, /marker\.el\.style\.display = !layer \|\| !!localMapLayers\[layer\] \? 'block' : 'none'/);
});

test('layer, forecast and zoom controls change real application state', async () => {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => localStorage.clear());
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        request.respond({ status: 200, contentType: 'text/html', body: html });
      } else request.abort();
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('typeof applyLocalMapZoom === "function" && typeof setLocalMapFrame === "function"');

    // A deterministic MapLibre-shaped double keeps this test offline.
    const result = await page.evaluate(async () => {
      const calls = { ease: [], fit: 0 };
      const layerVisibility = {};
      localMapGL = {
        _zoom: 8,
        getZoom() { return this._zoom; },
        getMinZoom() { return 4; },
        getMaxZoom() { return 16; },
        getLayer(id) {
          if (id === 'lmc-fill-rain' || id === 'lmc-grid-lines') return {};
          if (id === 'lmc-wind' || id === 'lmc-wind-labels') return {};
          return {};
        },
        setLayoutProperty(id, property, value) { if (property === 'visibility') layerVisibility[id] = value; },
        setStyle() {},
        easeTo(options) { calls.ease.push(options.zoom); this._zoom = options.zoom; localMapGLSyncZoomLabel(); },
        fitBounds() { calls.fit += 1; }
      };
      localMapGLReady = true;
      localMapGLHome = { zoom: 8, bounds: { fake: true } };
      setLocalMapZoomControlsEnabled(true);

      // Model all weather icon marker types, including the reported ☁️ case.
      const markerTypes = { clear: '☀️', clouds: '☁️', fog: '🌫️', rain: '🌧️', drizzle: '🌦️', snow: '❄️', hail: '🧊' };
      localMapGLIconMarkers = Object.entries(markerTypes).map(([type, icon]) => {
        const layer = localMapIconLayer({ type });
        const el = document.createElement('div');
        el.dataset.layer = layer;
        el.textContent = icon;
        localMapGLEl.appendChild(el);
        return { type, layer, el };
      });
      for (const layer of ['clouds', 'fog', 'rain', 'snow', 'hail', 'wind']) {
        const button = localMapLayerBtns[layer];
        if (!button || button.tagName !== 'BUTTON') throw new Error(`missing ${layer} control`);
        if (localMapLayers[layer] !== true) button.click();
        if (localMapLayers[layer] !== true) throw new Error(`could not enable ${layer}`);
      }
      localMapGLApplyVis();
      const allVisible = [...localMapGLIconMarkers].every((m) => m.el.style.display !== 'none');

      const clouds = localMapLayerBtns.clouds;
      const clouds0 = localMapLayers.clouds;
      clouds.click();
      const clouds1 = localMapLayers.clouds;
      const cloudsPressed = clouds.getAttribute('aria-pressed');
      const cloudMarkerHidden = localMapGLIconMarkers.find((m) => m.type === 'clouds').el.style.display === 'none';
      clouds.click();
      const cloudMarkerRestored = localMapGLIconMarkers.find((m) => m.type === 'clouds').el.style.display !== 'none';

      const markerVisibility = {};
      const layerVisibilityOff = {};
      let rainMarkerHidden = false;
      for (const layer of ['fog', 'rain', 'snow', 'hail']) {
        const before = localMapLayers[layer];
        const button = localMapLayerBtns[layer];
        button.click();
        markerVisibility[layer] = localMapGLIconMarkers.find((m) => m.el.dataset.layer === layer)?.el.style.display;
        layerVisibilityOff[layer] = layerVisibility[`lmc-fill-${layer}`];
        if (localMapLayers[layer] === before) {
          throw new Error(`${layer} state did not change: ${JSON.stringify({ before, now: localMapLayers[layer], button: button.outerHTML })}`);
        }
        if (layer === 'rain') {
          rainMarkerHidden = localMapGLIconMarkers.find((m) => m.type === 'drizzle').el.style.display === 'none';
        }
        button.click();
        markerVisibility[layer] += '/' + localMapGLIconMarkers.find((m) => m.el.dataset.layer === layer)?.el.style.display;
        layerVisibilityOff[layer] += '/' + layerVisibility[`lmc-fill-${layer}`];
      }
      const wind = localMapLayerBtns.wind;
      const wind0 = localMapLayers.wind;
      wind.click();
      const windLayerHidden = layerVisibility['lmc-wind'] === 'none';
      wind.click();
      const windLayerRestored = layerVisibility['lmc-wind'] === 'visible';

      const play = document.getElementById('localmap-play');
      const beforePlayState = { playing: localMapPlayBtn.classList.contains('playing'), frame: localMapFrame };
      play.click();
      const playingState = { playing: localMapPlayBtn.classList.contains('playing'), pressed: play.getAttribute('aria-pressed') };
      await new Promise((resolve) => setTimeout(resolve, 600));
      const frameAdvanced = localMapFrame;
      play.click();
      const pausedState = { playing: localMapPlayBtn.classList.contains('playing'), pressed: play.getAttribute('aria-pressed') };

      const slider = document.getElementById('localmap-frame');
      slider.value = '4';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      const sliderFrame = localMapFrame;
      document.getElementById('localmap-zoom-in').click();
      const zoomIn = localMapGL.getZoom();
      document.getElementById('localmap-zoom-out').click();
      const zoomOut = localMapGL.getZoom();
      document.getElementById('localmap-zoom-reset').click();
      const resetCalls = calls.fit;
      // ▶ Autoplay: the preview starts itself the moment the first forecast series
      // is on screen — and stays latched, so a later refresh cannot restart it.
      stopLocalMapPlayback();
      localMapFrame = 0;
      latestLocalMapFrameTimes = null;
      maybeStartLocalMapAutoplay();
      const autoIdle = localMapPlayBtn.classList.contains('playing');
      latestLocalMapFrameTimes = [Date.now(), Date.now() + 900000];
      maybeStartLocalMapAutoplay();
      const autoPlaying = localMapPlayBtn.classList.contains('playing');
      maybeStartLocalMapAutoplay();
      const autoLatched = localMapPlayBtn.classList.contains('playing');
      stopLocalMapPlayback();
      latestLocalMapFrameTimes = null;
      const stoppedAfterAutoplay = localMapPlayBtn.getAttribute('aria-pressed');

      setLocalMapZoomControlsEnabled(false);
      const disabled = [...document.querySelectorAll('.localmap-zoom-btn')].every((button) => button.disabled);

      // 📐 Geometry: the map follows the globe's size steps (see expectedMapSquare).
      const sizeStage = document.querySelector('.localmap-stage');
      const sizePanel = document.getElementById('localmap-panel');
      const sizeMap = document.getElementById('localmap-map');
      const stageBox = sizeStage.getBoundingClientRect();
      const mapBox = sizeMap.getBoundingClientRect();
      const mapSize = {
        stageW: Math.round(stageBox.width),
        stageH: Math.round(stageBox.height),
        mapW: Math.round(mapBox.width),
        mapH: Math.round(mapBox.height),
        viewW: window.innerWidth,
        viewH: window.innerHeight,
        panelW: sizePanel.clientWidth
      };

      return {
        clouds0, clouds1, cloudsPressed, cloudsRestored: localMapLayers.clouds,
        allVisible, cloudMarkerHidden, cloudMarkerRestored, rainMarkerHidden, markerVisibility, layerVisibilityOff,
        windLayerHidden, windLayerRestored,
        beforePlayState, playingState, frameAdvanced, pausedState, sliderFrame,
        autoIdle, autoPlaying, autoLatched, stoppedAfterAutoplay, mapSize,
        zoomIn, zoomOut, resetCalls, disabled, easeCalls: calls.ease.length
      };
    });

    assert.equal(result.clouds0, true);
    assert.equal(result.clouds1, false);
    assert.equal(result.cloudsPressed, 'false');
    assert.equal(result.cloudsRestored, true);
    assert.equal(result.allVisible, true);
    assert.equal(result.cloudMarkerHidden, true, 'turning Clouds off also hides the cloud icon');
    assert.equal(result.cloudMarkerRestored, true, 'turning Clouds on restores the cloud icon');
    assert.deepEqual(result.markerVisibility, {
      fog: 'none/block', rain: 'none/block', snow: 'none/block', hail: 'none/block'
    });
    assert.equal(result.rainMarkerHidden, true, 'turning Rain off also hides drizzle icons');
    assert.deepEqual(result.layerVisibilityOff, {
      fog: 'none/visible', rain: 'none/visible', snow: 'none/visible', hail: 'none/visible'
    });
    assert.equal(result.windLayerHidden, true, 'turning Wind off hides the wind arrows');
    assert.equal(result.windLayerRestored, true, 'turning Wind on restores the wind arrows');
    assert.deepEqual(result.beforePlayState, { playing: false, frame: 0 },
      'with no forecast data loaded the player sits idle at "now"');
    assert.deepEqual(result.playingState, { playing: true, pressed: 'true' });
    assert.ok(result.frameAdvanced > 0, 'play advances the forecast frame');
    assert.deepEqual(result.pausedState, { playing: false, pressed: 'false' });
    assert.equal(result.autoIdle, false, 'no forecast series yet → nothing plays by itself');
    assert.equal(result.autoPlaying, true, 'the 3-hour forecast starts playing by itself');
    assert.equal(result.autoLatched, true, 'autoplay fires only once per page load');
    assert.equal(result.stoppedAfterAutoplay, 'false', 'pause after autoplay stops the loop');
    const ms = result.mapSize;
    ms.expected = expectedMapSquare(ms.panelW, ms.viewW, ms.viewH);
    assert.ok(Math.abs(ms.stageW - ms.stageH) <= 1, `the map is a square — got ${ms.stageW}×${ms.stageH}`);
    assert.ok(Math.abs(ms.stageW - ms.expected) <= 2,
      `the square follows the globe's size steps — got ${ms.stageW}, expected ${ms.expected}`);
    assert.ok(ms.stageW <= ms.viewW,
      `the square never overflows the screen horizontally — got ${ms.stageW} vs ${ms.viewW}`);
    assert.ok(Math.abs(ms.mapW - ms.stageW) <= 2 && Math.abs(ms.mapH - ms.stageH) <= 2,
      `the map fills the whole square — stage ${ms.stageW}×${ms.stageH}, map ${ms.mapW}×${ms.mapH}`);
    assert.equal(result.sliderFrame, 4);
    assert.ok(result.zoomIn > 8, 'zoom-in increases MapLibre zoom');
    assert.ok(result.zoomOut < result.zoomIn, 'zoom-out decreases MapLibre zoom');
    assert.equal(result.resetCalls, 1, 'reset fits the saved area');
    assert.equal(result.disabled, true, 'controls disable if the map engine fails');
    assert.equal(result.easeCalls, 2);
  } finally {
    await browser.close();
  }
});

// 📐 "Screen adjustable for every screen" (Option C): the whole app is ONE fluid
// width — the form, the 🌍 globe and the 🛰️ map card are all exactly as wide as
// .container, which scales continuously (clamp(560px, 92vw, 1080px)) instead of
// jumping between 620/820/940px. The bird's-eye map stays a square at least as big
// as the globe, and nothing ever adds a sideways scrollbar (like the globe, a short
// screen may let the square run past the fold; the page scrolls vertically as usual).
test('the card, form and bird\'s-eye map share one fluid width on every screen', async () => {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => localStorage.clear());
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        request.respond({ status: 200, contentType: 'text/html', body: html });
      } else request.abort();
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('typeof fitLocalMapLayout === "function"');

    const screens = [
      ['tiny phone', 320, 640],
      ['phone portrait', 390, 844],
      ['phone landscape', 844, 390],
      ['tablet', 768, 1024],
      ['laptop', 1280, 800],
      ['desktop', 1920, 1080],
      ['wide desktop', 2560, 1440]
    ];

    const widthsSeen = new Set();
    for (const [name, width, height] of screens) {
      await page.setViewport({ width, height });
      await new Promise((resolve) => setTimeout(resolve, 80));
      const box = await page.evaluate(() => {
        const stage = document.querySelector('.localmap-stage');
        const panel = document.getElementById('localmap-panel');
        const container = document.querySelector('.container');
        const form = document.querySelector('.location-row');
        const globe = document.querySelector('.globe-stage');
        const rect = stage.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const formRect = form.getBoundingClientRect();
        const de = document.documentElement;
        const cs = getComputedStyle(container);
        return {
          stageW: Math.round(rect.width),
          stageH: Math.round(rect.height),
          left: Math.round(rect.left),
          panelW: Math.round(panelRect.width),
          panelLeft: Math.round(panelRect.left),
          formW: Math.round(formRect.width),
          formLeft: Math.round(formRect.left),
          containerW: Math.round(containerRect.width),
          containerPadLeft: parseFloat(cs.paddingLeft) || 0,
          globeW: Math.round(globe.getBoundingClientRect().width),
          sideways: de.scrollWidth > de.clientWidth + 1,
          viewW: window.innerWidth,
          viewH: window.innerHeight
        };
      });
      widthsSeen.add(box.containerW);
      const where = `${name} (${width}×${height})`;
      const expected = expectedMapSquare(box.panelW, box.viewW, box.viewH);

      // 📐 One fluid width: the form and the map card are pixel-identical in width
      // and left edge, both exactly the container's content box.
      assert.equal(box.panelW, box.formW, `${where}: the map card and the form are the same width`);
      assert.equal(box.panelLeft, box.formLeft, `${where}: the map card and the form start at the same left edge`);
      assert.equal(box.panelW, Math.round(box.containerW - 2 * box.containerPadLeft - 2),
        `${where}: the map card fills the card's content box (${box.panelW} in ${box.containerW})`);
      assert.ok(box.containerW <= box.viewW,
        `${where}: the card never overflows the screen — ${box.containerW} vs ${box.viewW}`);
      assert.ok(box.panelLeft >= box.containerPadLeft - 1,
        `${where}: the map never bleeds outside the card — left ${box.panelLeft}`);

      // 📐 The square itself is unchanged: a square, at least as big as the globe.
      assert.ok(Math.abs(box.stageW - box.stageH) <= 1,
        `${where}: the map is a square — got ${box.stageW}×${box.stageH}`);
      assert.ok(Math.abs(box.stageW - expected) <= 2,
        `${where}: follows the globe's size steps — got ${box.stageW}, expected ${expected}`);
      assert.ok(box.stageW + 1 >= box.globeW,
        `${where}: at least as big as the 🌍 globe — map ${box.stageW}, globe ${box.globeW}`);
      assert.ok(box.stageW <= box.panelW + 1,
        `${where}: the map fits inside its card — got ${box.stageW} vs ${box.panelW}`);
      assert.equal(box.sideways, false, `${where}: no sideways scrollbar`);

      // The square is centred inside the card, so its left edge sits at the panel's
      // left plus half the leftover space.
      const gap = Math.round((box.panelW - box.stageW) / 2);
      assert.ok(Math.abs(box.left - (box.panelLeft + gap)) <= 2,
        `${where}: centred inside the card — left ${box.left}, expected ${box.panelLeft + gap}`);
    }

    // The card really does auto-adjust: it takes a different width on small vs
    // large screens instead of sitting on one of the old fixed steps.
    assert.ok(widthsSeen.size >= 4,
      `the card width changes with the screen, not in fixed steps — saw ${[...widthsSeen].join(', ')}`);
    assert.ok(Math.max(...widthsSeen) > Math.min(...widthsSeen) + 200,
      `the card really grows on a bigger screen — ${Math.min(...widthsSeen)}…${Math.max(...widthsSeen)}`);
  } finally {
    await browser.close();
  }
});

