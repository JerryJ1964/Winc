/* Verification for the temperature-honest weather icons (build:tempgraph-icons-20260914-1).
   Loads the backend from api/weather.js in a sandbox and slices the front-end
   helpers out of index.html, then asserts:
     • honestSnowCondition: snowy codes at > 2 °C → Rain (🌧️); at ≤ 2 °C → null
       (snow is real); non-snowy codes → null
     • fetchLocalCell live cell: snow code/snowfall at 17 °C → Rain + 'rain' blob
       type; at -2 °C → Snow + 'snow' blob type (classifyLocalCell untouched)
     • front-end localMapFrameCell (+15 min…+3 h frames): snow code at 17 °C →
       🌧️ Rain + 'rain' type; at -1 °C → ❄️ Snow + 'snow' type
     • front-end localMapTempIconForTemp: same rule for the 🌡️ bar graph
   Run: node _verify_snowhonest.js                                              */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let failures = 0;
function check(name, ok, extra) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok || extra == null ? '' : ` — ${extra}`}`);
  if (!ok) failures += 1;
}

// ---------- backend: api/weather.js ----------
const apiSrc = fs.readFileSync(path.join(__dirname, 'api', 'weather.js'), 'utf8');
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  AbortSignal, URL, URLSearchParams, performance,
  fetch: async () => { throw new Error('network disabled in test'); },
  module: { exports: {} }
};
vm.createContext(sandbox);
vm.runInContext(apiSrc, sandbox, { filename: 'api/weather.js' });

const honest = sandbox.honestSnowCondition;
check('backend honestSnowCondition reachable via sandbox', typeof honest === 'function');

check('snow code 73 @ 17 °C → Rain/🌧️',
  JSON.stringify(honest(73, 17)) === JSON.stringify({ condition: 'Rain', icon: '🌧️' }),
  JSON.stringify(honest(73, 17)));
check('snow shower code 85 @ 30 °C → Rain/🌧️',
  !!honest(85, 30) && honest(85, 30).condition === 'Rain');
check('snow code 73 @ 2 °C (wet snow) → null (keep snow)',
  honest(73, 2) === null);
check('snow code 73 @ -8 °C → null (keep snow)',
  honest(73, -8) === null);
check('non-snowy code 61 @ 30 °C → null (rain stays rain)',
  honest(61, 30) === null);
check('missing temperature → null (no opinion)',
  honest(73, null) === null && honest(73, undefined) === null);
check('backend classifyLocalCell still snowy for snow codes (unchanged)',
  sandbox.classifyLocalCell(73, 0, 0, 10) === 'snow');

// fetchLocalCell live cell: snow at 17 °C vs snow at -2 °C.
const m15 = (code, temp) => ({ time: ['2026-09-14T12:00'], weather_code: [code], temperature_2m: [temp], apparent_temperature: [temp - 1], precipitation: [0], precipitation_probability: [0], cloud_cover: [90], snowfall: [0.4], wind_speed_10m: [10], wind_direction_10m: [180] });
sandbox.fetch = async () => ({ ok: true, json: async () => ({ current: { temperature_2m: 17, apparent_temperature: 16, weather_code: 73, precipitation: 0, snowfall: 0.4, cloud_cover: 90, wind_speed_10m: 10, wind_direction_10m: 180 }, minutely_15: m15(73, 17) }) });

(async () => {
  const warmCell = await sandbox.fetchLocalCell(52.0, 4.0);
  check('backend live cell: snow code + snowfall @ 17 °C → condition Rain', warmCell.condition === 'Rain', warmCell.condition);
  check('backend live cell: …icon 🌧️', warmCell.icon === '🌧️', warmCell.icon);
  check('backend live cell: …map-blob type rain (not snow)', warmCell.type === 'rain', warmCell.type);
  check('backend live cell: temperature preserved (17)', warmCell.temp === 17, String(warmCell.temp));

  sandbox.fetch = async () => ({ ok: true, json: async () => ({ current: { temperature_2m: -2, apparent_temperature: -5, weather_code: 73, precipitation: 0, snowfall: 0.4, cloud_cover: 90, wind_speed_10m: 10, wind_direction_10m: 180 }, minutely_15: m15(73, -2) }) });
  const coldCell = await sandbox.fetchLocalCell(52.0, 4.0);
  check('backend live cell: snow @ -2 °C keeps condition Snow', coldCell.condition === 'Snow', coldCell.condition);
  check('backend live cell: …icon ❄️', coldCell.icon === '❄️', coldCell.icon);
  check('backend live cell: …map-blob type snow', coldCell.type === 'snow', coldCell.type);

  // ---------- frontend: index.html ----------
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  // Slice A: SNOW_TOO_WARM_C + localMapTempIconForTemp (🌡️ bar-graph helpers).
  const aStart = html.indexOf('// Snow honesty: snow cannot fall');
  const aEnd = html.indexOf('function refreshLocalMapTempGraph(');
  // Slice B: localMapClassify + localMapIsSnowy + LOCALMAP_CODE_INFO + localMapFrameCell.
  const bStart = html.indexOf('const LOCALMAP_RAIN_MIN_MM = 0.3;');
  const bEnd = html.indexOf('// ===== 🗺️ Real-map background behind the weather field');
  check('frontend slices found', aStart > 0 && aEnd > aStart && bStart > 0 && bEnd > bStart);
  if (aStart > 0 && aEnd > aStart && bStart > 0 && bEnd > bStart) {
    const feSrc = html.slice(aStart, aEnd) + '\n' + html.slice(bStart, bEnd) +
      '\nreturn { localMapFrameCell, localMapTempIconForTemp, localMapClassify };';
    const fe = new Function(feSrc)();

    const feWarm = fe.localMapTempIconForTemp('❄️', 'Snow', 17);
    check('frontend localMapTempIconForTemp: ❄️/Snow @ 17 °C → 🌧️ Rain', feWarm.icon === '🌧️' && feWarm.label === 'Rain', JSON.stringify(feWarm));
    const feWet = fe.localMapTempIconForTemp('❄️', 'Snow', 2);
    check('frontend localMapTempIconForTemp: wet snow @ 2 °C keeps ❄️', feWet.icon === '❄️' && feWet.label === 'Snow');
    const feSun = fe.localMapTempIconForTemp('☀️', 'Clear', 30);
    check('frontend localMapTempIconForTemp: non-snow untouched', feSun.icon === '☀️' && feSun.label === 'Clear');

    const cell = (code, temp) => ({
      lat: 52, lon: 4, weatherCode: code, temp, feels: temp - 1,
      precipitation: 0, snowfall: 0.4, cloudCover: 90, wind_speed: 10, wind_direction: 180,
      series: { codes: [code], temps: [temp], precip: [0], snow: [0.4], cloud: [90], wind: [10], windDir: [180] }
    });
    const warmFrame = fe.localMapFrameCell(cell(73, 17), 1);
    check('frontend frame cell: snow code @ 17 °C → 🌧️ Rain', warmFrame.icon === '🌧️' && warmFrame.condition === 'Rain', warmFrame.icon + ' ' + warmFrame.condition);
    check('frontend frame cell: …map-blob type rain', warmFrame.type === 'rain', warmFrame.type);
    check('frontend frame cell: …temp preserved (17)', warmFrame.temp === 17, String(warmFrame.temp));
    check('frontend frame cell: …weatherCode preserved (73)', warmFrame.weatherCode === 73, String(warmFrame.weatherCode));
    const coldFrame = fe.localMapFrameCell(cell(73, -1), 1);
    check('frontend frame cell: snow code @ -1 °C keeps ❄️ Snow', coldFrame.icon === '❄️' && coldFrame.condition === 'Snow');
    check('frontend frame cell: …map-blob type snow', coldFrame.type === 'snow', coldFrame.type);
    const warmShower = fe.localMapFrameCell(cell(85, 20), 1);
    check('frontend frame cell: snow showers @ 20 °C → 🌧️ Rain', warmShower.icon === '🌧️' && warmShower.type === 'rain');
    check('frontend classify unchanged: snow code cold → snow blob', fe.localMapClassify(73, 0, 0, 10) === 'snow');
  }

  console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})().catch((err) => { console.log('FAIL: ' + err.message); process.exit(1); });

