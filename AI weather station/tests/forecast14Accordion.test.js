// Verifies the 14-day accordion: click a day → it expands FULLY (48 half-hour
// slots in a full-width grid); click the next day → the previous one closes.
//
// Run:  node tests/forecast14Accordion.test.js
// Spawns the local dev server (like tests/oceanLabels.test.js needs a browser)
// and drives the real page through Puppeteer, so 14 real day cards render.
const { spawn } = require('child_process');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.F14_PORT || 3198);
// When a local server is already running (WEATHER_TEST_ALREADY_RUNNING=1) this
// test does not spawn or kill one — handy for interactive debugging.
const EXTERNAL_SERVER = process.env.WEATHER_TEST_ALREADY_RUNNING === '1';

const results = [];
const LOG_FILE = path.join(ROOT, '_f14_probe.log');
function note(message) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${message}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch { /* ignore */ }
  console.log(line.trimEnd());
}

// Never let a step hang: the page has a 30 s auto-refresh and Puppeteer's
// real-mouse click can block on scroll/geometry, so every step is both
// DOM-driven and time-boxed. A watchdog ends the run no matter what.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms: ${label}`)), ms))
  ]);
}

async function clickSelector(page, selector, label) {
  await withTimeout(
    page.$eval(selector, (el) => { el.scrollIntoView({ block: 'center' }); el.click(); }),
    15000,
    label
  );
  await new Promise((r) => setTimeout(r, 350));
}

function check(name, ok, extra) {
  results.push({ name, ok });
  const line = `${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` :: ${extra}` : ''}\n`;
  console.log(line.trimEnd());
  if (process.env.F14_LOG !== '0') {
    try { fs.appendFileSync(path.join(ROOT, '_f14_probe.log'), line); } catch { /* ignore */ }
  }
}

(async () => {
  const watchdog = setTimeout(() => {
    console.error('WATCHDOG: probe exceeded 150s — aborting');
    process.exit(3);
  }, 150000);
  if (watchdog.unref) watchdog.unref();
  note(`start | external server: ${EXTERNAL_SERVER} | port ${PORT}`);
  const srv = EXTERNAL_SERVER
    ? null
    : spawn(process.execPath, ['server-local.js'], {
        cwd: ROOT, stdio: 'ignore', env: { ...process.env, PORT: String(PORT) }
      });
  if (!EXTERNAL_SERVER) {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try { if ((await fetch(`http://localhost:${PORT}/index.html`)).ok) break; } catch { /* wait */ }
    }
  }

  note('server reachable');
  // Dynamic import, like globeBorders: the installed puppeteer is ESM-only, so a
  // bare require() would break whenever an older Node resolves this script.
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true, args: ['--window-size=1200,2400'] });
  note('browser launched');
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1400 });
  // Headless Chrome DENIES the Geolocation API by default, and the app treats
  // PERMISSION_DENIED as fatal for startup (useMyLocation() returns before the
  // first /weather request) — so `latestWeatherData` would never be set and
  // the wait below would time out. Grant the permission and pin a fix instead.
  const origin = `http://localhost:${PORT}`;
  await browser.defaultBrowserContext().overridePermissions(origin, ['geolocation']);
  await page.setGeolocation({ latitude: 52.37, longitude: 4.89 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  // index.html references app.js/style.css — they are served by the dev server
  // (see request.continue() below), so the raw markup is exactly right here.
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const seen = new Set();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (seen.size < 25 && !seen.has(url.split('?')[0])) seen.add(url.split('?')[0]);
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      request.respond({ status: 200, contentType: 'text/html', body: html });
      return;
    }
    request.continue(); // API + assets go through the local dev server as usual.
  });
  setTimeout(() => note('requests seen: ' + [...seen].join(' | ')), 12000);

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  note('page loaded');
  await page.waitForFunction(() => typeof latestWeatherData !== 'undefined' && latestWeatherData && latestWeatherData.location, { timeout: 90000 });
  note('weather data available');
  await clickSelector(page, '#tab-forecast14', 'open 14-day tab');
  await page.waitForFunction(() => document.querySelectorAll('.f14-day').length > 0, { timeout: 30000 });
  note('14-day rows in the DOM');

  const rowCount = await page.$$eval('.f14-day', (els) => els.length);
  check('14 day rows rendered', rowCount === 14, `rows=${rowCount}`);

  const collapsedHeight = await page.$eval('.f14-day[data-day-index="3"]', (el) => el.getBoundingClientRect().height);

  // --- 1) open day 3 -----------------------------------------------------
  await clickSelector(page, '.f14-day[data-day-index="3"] .f14-day-main', 'click day 3');
  const open3 = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.f14-day')];
    const expanded = rows.filter((r) => r.classList.contains('expanded'));
    const row = document.querySelector('.f14-day[data-day-index="3"]');
    const strip = row.querySelector('.f14-slots');
    return {
      expandedCount: expanded.length,
      expandedIndexes: expanded.map((r) => Number(r.dataset.dayIndex)),
      slots: strip ? strip.querySelectorAll('.f14-slot').length : 0,
      stripDisplay: strip ? getComputedStyle(strip).display : null,
      belowRow: strip ? strip.getBoundingClientRect().top >= row.querySelector('.f14-day-main').getBoundingClientRect().bottom - 2 : false,
      height: Math.round(row.getBoundingClientRect().height),
      aria: row.querySelector('.f14-day-main').getAttribute('aria-expanded'),
      hint: row.querySelector('.f14-expand-hint') ? row.querySelector('.f14-expand-hint').textContent : null
    };
  });
  console.log('  open day 3 ->', JSON.stringify(open3));
  check('clicking a day expands exactly one row', open3.expandedCount === 1 && open3.expandedIndexes[0] === 3);
  check('expanded row shows all 48 half-hour slots', open3.slots === 48, `slots=${open3.slots}`);
  check('slots are a full-width grid (not a sliding strip)', open3.stripDisplay === 'grid');
  check('slots render below the summary row', open3.belowRow === true);
  check('expanded row grows taller than collapsed', open3.height > collapsedHeight + 40, `${Math.round(collapsedHeight)}px -> ${open3.height}px`);
  check('aria-expanded is true on the open row', open3.aria === 'true');
  check('hint flips to "hide"', String(open3.hint).includes('hide'), String(open3.hint));
  // --- 2) open day 4 -> day 3 must auto-close ---------------------------
  await clickSelector(page, '.f14-day[data-day-index="4"] .f14-day-main', 'click day 4');
  const open4 = await page.evaluate(() => {
    const expanded = [...document.querySelectorAll('.f14-day.expanded')];
    const row3 = document.querySelector('.f14-day[data-day-index="3"]');
    const row4 = document.querySelector('.f14-day[data-day-index="4"]');
    return {
      expandedCount: expanded.length,
      expandedIndexes: expanded.map((r) => Number(r.dataset.dayIndex)),
      row3HasSlots: !!row3.querySelector('.f14-slots'),
      row3Expanded: row3.classList.contains('expanded'),
      row4Slots: row4.querySelectorAll('.f14-slot').length,
      row4Selected: row4.classList.contains('selected'),
      row3Height: Math.round(row3.getBoundingClientRect().height)
    };
  });
  console.log('  then day 4 ->', JSON.stringify(open4));
  check('previous day closes automatically (single-open)', open4.expandedCount === 1 && open4.expandedIndexes[0] === 4);
  check('closed day no longer renders its slots', open4.row3HasSlots === false && open4.row3Expanded === false);
  check('next day rendered its own 48 slots', open4.row4Slots === 48, `slots=${open4.row4Slots}`);
  check('collapsed row shrinks back to one-line height', open4.row3Height <= collapsedHeight + 6, `${open4.row3Height}px vs ${Math.round(collapsedHeight)}px`);

  // --- 3) tapping the open day again collapses it ----------------------
  await clickSelector(page, '.f14-day[data-day-index="4"] .f14-day-main', 're-click day 4');
  const closed = await page.evaluate(() => {
    const row4 = document.querySelector('.f14-day[data-day-index="4"]');
    return {
      expandedCount: document.querySelectorAll('.f14-day.expanded').length,
      row4HasSlots: !!row4.querySelector('.f14-slots'),
      row4Selected: row4.classList.contains('selected'),
      row4Aria: row4.querySelector('.f14-day-main').getAttribute('aria-expanded')
    };
  });
  console.log('  tap open day again ->', JSON.stringify(closed));
  check('tapping the open day collapses it', closed.expandedCount === 0 && closed.row4HasSlots === false);
  check('collapsed day stays selected for the stat cards', closed.row4Selected === true && closed.row4Aria === 'false');

  // --- 4) the summary row is still one clickable button -----------------
  const btnOk = await page.$eval('.f14-day[data-day-index="0"]', (row) => {
    const b = row.querySelector('button.f14-day-main');
    return {
      isButton: !!b,
      childSpans: b ? b.querySelectorAll(':scope > span').length : 0,
      displayCollapsed: b ? getComputedStyle(b).display : null
    };
  });
  console.log('  row structure ->', JSON.stringify(btnOk));
  check('day row exposes a single button summary', btnOk.isButton && btnOk.childSpans === 6, JSON.stringify(btnOk));
  check('collapsed row uses the original 6-column grid', btnOk.displayCollapsed === 'contents');

  // --- 5) rapid alternation never leaves two rows open -------------------
  await clickSelector(page, '.f14-day[data-day-index="2"] .f14-day-main', 'click day 2');
  await clickSelector(page, '.f14-day[data-day-index="7"] .f14-day-main', 'click day 7');
  const rapid = await page.evaluate(() => ({
    expanded: [...document.querySelectorAll('.f14-day.expanded')].map((r) => Number(r.dataset.dayIndex)),
    strips: document.querySelectorAll('.f14-slots').length
  }));
  console.log('  rapid open 2 then 7 ->', JSON.stringify(rapid));
  check('only one row is ever open', rapid.expanded.length === 1 && rapid.strips === 1, JSON.stringify(rapid));

  await page.$eval('.f14-day[data-day-index="7"]', (el) => el.scrollIntoView({ block: 'center' }));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: ROOT + '/_f14_expanded.png' });

  console.log('\npage JS errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
  check('no page JS errors while expanding/collapsing', errors.length === 0, errors.join(' | '));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  if (srv) srv.kill();
  clearTimeout(watchdog);
  if (failed) process.exitCode = 1;
})().catch((e) => {
  note('PROBE FAILED: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
