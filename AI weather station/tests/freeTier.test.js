// Free-tier guard: the app must be impossible to bill.
//
//   • every external host it talks to has to be listed here with the reason it
//     cannot produce an invoice (keyless or a free plan without a card)
//   • no secret may be hardcoded in a deployed file
//   • the Vercel project must stay inside Hobby limits (daily-only crons, few
//     functions, short durations) — Hobby has no overage billing at all
//   • every serverless route the browser calls must exist, be wired in
//     server-local.js AND be listed in scripts/sync-dist.js, because a missing
//     function is the classic way a deploy silently starts 404-ing
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const FREE_HOSTS = {
  'localhost': 'local dev server',
  'api.open-meteo.com': 'Open-Meteo free tier — keyless, no account, non-commercial use',
  'air-quality-api.open-meteo.com': 'Open-Meteo Air Quality (CAMS) free tier — keyless, no account, no card',
  'geocoding-api.open-meteo.com': 'Open-Meteo geocoding — keyless, free',
  'open-meteo.com': 'Open-Meteo docs/attribution link',
  'api.weatherapi.com': 'WeatherAPI.com free plan — key from env, no card, over-quota errors then we fall back to Open-Meteo',
  'www.weatherapi.com': 'WeatherAPI.com free-plan sign-up link',
  'earthquake.usgs.gov': 'USGS earthquake feeds — public domain',
  'eonet.gsfc.nasa.gov': 'NASA EONET — public',
  'gibs.earthdata.nasa.gov': 'NASA GIBS imagery tiles — public',
  'www.nhc.noaa.gov': 'NOAA NHC — public',
  'services.swpc.noaa.gov': 'NOAA SWPC Ovation aurora — public, keyless',
  'www.tsunami.gov': 'NOAA tsunami warning centres — public',
  'www.cpc.ncep.noaa.gov': 'NOAA CPC — public',
  'oceanservice.noaa.gov': 'NOAA Ocean Service — reference link',
  'volcano.si.edu': 'Smithsonian Global Volcanism Program — public',
  'api.avalanche.org': 'Avalanche.org public map layer — keyless',
  'avalanche.org': 'Avalanche.org link',
  'nominatim.openstreetmap.org': 'OSM Nominatim — free with the required rate limit',
  'api.bigdatacloud.net': 'BigDataCloud reverse geocoding — free client tier, keyless',
  'ipapi.co': 'IP geolocation — free tier',
  'ipwho.is': 'IP geolocation — free tier',
  'unpkg.com': 'unpkg CDN — free',
  'cdn.jsdelivr.net': 'jsDelivr CDN — free',
  'tiles.openfreemap.org': 'OpenFreeMap vector tiles — free, no key',
  'openfreemap.org': 'OpenFreeMap project link',
  'www.naturalearthdata.com': 'Natural Earth — public domain',
  'en.wikipedia.org': 'Wikipedia geosearch — free API',
  'github.com': 'source link only',
    'celestia.space': 'Celestia project link — credit for the star-catalogue sources, no data fetched',
  'www.npmjs.com': 'npm package reference link (documentation only)'
};

// Production files only — scratch probes/tests are not deployed.
function productionFiles() {
  const files = ['index.html', 'app.js', 'style.css', 'main.js', 'sw.js', 'manifest.json', 'server-local.js', 'vercel.json']
    .filter(exists)
    .map((rel) => path.join(root, rel));
  for (const dir of [path.join(root, 'api'), path.join(root, 'scripts')]) {
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith('.js')) files.push(path.join(dir, entry));
    }
  }
  return files;
}

function relativeHosts(text) {
  const hosts = new Set();
  for (const match of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(match[1].toLowerCase());
  return hosts;
}

test('every external host in a deployed file is a documented free, keyless provider', () => {
  const offenders = [];
  for (const file of productionFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const host of relativeHosts(text)) {
      if (!FREE_HOSTS[host]) offenders.push(path.relative(root, file) + ' -> ' + host);
    }
  }
  assert.deepEqual(offenders, [],
    'unlisted host(s) found — remove them or document why they can never bill:\n' + offenders.join('\n'));
});

test('no API key or secret is hardcoded in an app file', () => {
  const secretPatterns = [
    [/sk-[A-Za-z0-9]{20,}/, 'Stripe-style secret key'],
    [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
    [/AIza[0-9A-Za-z_\-]{35}/, 'Google API key'],
    [/ghp_[A-Za-z0-9]{36}/, 'GitHub token'],
    [/\b[0-9a-f]{32}\b/, 'bare 32-hex key (the shape of a WeatherAPI key)']
  ];
  const offenders = [];
  for (const file of productionFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [pattern, what] of secretPatterns) {
      if (pattern.test(text)) offenders.push(path.relative(root, file) + ' -> ' + what);
    }
  }
  assert.deepEqual(offenders, [], 'secrets must come from the environment, never from a file:\n' + offenders.join('\n'));

  // The only keyed provider reads its key from process.env and nowhere else.
  assert.match(read('api/weather.js'), /process\.env\.WEATHERAPI_KEY/, 'WeatherAPI key comes from the environment');
});

test('the Vercel project stays inside Hobby limits (no overage billing possible)', () => {
  const config = JSON.parse(read('vercel.json'));
  const functions = Object.entries(config.functions || {});
  assert.ok(functions.length <= 12, 'Hobby allows only a limited number of functions');
  for (const [file, settings] of functions) {
    assert.ok(exists(file), `configured function exists: ${file}`);
    assert.ok(settings.maxDuration <= 60, `${file} maxDuration stays within the Hobby ceiling`);
  }

  const crons = config.crons || [];
  assert.ok(crons.length <= 2, 'Hobby projects may only hold a couple of cron jobs');
  for (const cron of crons) {
    const [minute, hour, day, month, weekday] = String(cron.schedule).split(/\s+/);
    assert.match(minute, /^\d+$/, 'cron minute is a fixed value');
    assert.match(hour, /^\d+$/, 'cron hour is a fixed value — Hobby only runs daily jobs');
    assert.equal(day, '*');
    assert.equal(month, '*');
    assert.equal(weekday, '*');
  }
});

test('.env is never part of a deploy', () => {
  const sync = read('scripts/sync-dist.js');
  assert.ok(!/\.env/.test(sync), 'the sync script copies no dotenv file into dist/');
  assert.ok(!exists('dist/.env'), 'dist/ carries no dotenv file');
});

test('every /api route the browser calls exists and is wired everywhere', () => {
  // The browser code lives in app.js since the split; index.html keeps markup only.
  const html = read('index.html') + '\n' + read('app.js');
  const routes = new Set();
  for (const match of html.matchAll(/['"`]\/api\/([a-z-]+)/gi)) routes.add(match[1]);
  assert.ok(routes.size >= 6, 'the app really does call a handful of routes');

  const sync = read('scripts/sync-dist.js');
  const server = read('server-local.js');
  const config = JSON.parse(read('vercel.json'));
  for (const route of routes) {
    const file = 'api/' + route + '.js';
    assert.ok(exists(file), file + ' exists for /api/' + route);
    assert.ok(sync.includes(file), file + ' is listed in scripts/sync-dist.js');
    assert.ok(server.includes('/api/' + route), file + ' is routed in server-local.js');
    assert.ok(config.functions[file], file + ' is configured in vercel.json');
  }
});

test('the free-tier rules are written down for the next change', () => {
  assert.ok(exists('FREE_TIER.md'), 'FREE_TIER.md documents the free-only rules');
  const doc = read('FREE_TIER.md');
  assert.match(doc, /Hobby/, 'the doc explains the Hobby-only rule');
  assert.match(doc, /no credit card|never be charged|no payment method/i, 'the doc explains why nothing can be billed');
});
