// Validates the 🌡️ temperature@2m bar-graph addition to index.html:
//  1. every inline <script> still compiles (syntax guard)
//  2. all new HTML / CSS / wiring markers exist
//  3. jsdom functional test: 25 bars in lattice order, icons, hot/cold marks,
//     frame-synced redraw (Now → +15 min), feels-like in tooltip, caching.
//  4. temperature-honest markers: 🔥 only ≥ 30 °C, ❄️ only ≤ 0 °C (▲/▼ for
//     milder extremes) and snowy codes at > 2 °C shown as 🌧️ Rain.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '.');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let bad = 0;
const fail = (m) => { bad += 1; console.log('FAIL ' + m); };
const pass = (m) => console.log('ok   ' + m);

// ----- 1. compile check of every inline script block -----
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
console.log('inline script blocks: ' + blocks.length);
blocks.forEach((src, i) => {
  try { new Function(src); pass('script#' + i + ' compiles (' + src.length + ' chars)'); }
  catch (e) { fail('script#' + i + ' syntax: ' + e.message); }
});

// ----- 2. marker checks -----
const markers = [
  ['HTML panel', 'id="localmap-tempgraph"'],
  ['HTML bars', 'id="localmap-tempgraph-bars"'],
  ['HTML title', 'id="localmap-tempgraph-title"'],
  ['CSS panel', '.localmap-tempgraph {'],
  ['CSS col', '.lm-temp-col {'],
  ['CSS bar', '.lm-temp-bar {'],
  ['JS section', '// ===== 🌡️ Air-temperature bar graph @ 2 m'],
  ['JS color fn', 'function localMapTempBarColor('],
  ['JS rebuild', 'function rebuildLocalMapTempGraph('],
  ['JS refresh fn', 'function refreshLocalMapTempGraph('],
  ['wired into icon-grid refresh', 'rebuildLocalMapIconFlow(cells);\n            refreshLocalMapTempGraph();'],
  ['wired into setLocalMapFrame', 'refreshLocalMapTempGraph();'],
  ['build marker', 'build:tempgraph-2m-20260913-1'],
  ['build marker (temp-honest icons)', 'build:tempgraph-icons-20260914-1'],
  ['marker heat threshold', 'const TEMP_HOT_MARK_C = 30;'],
  ['marker freezing threshold', 'const TEMP_SNOW_MARK_C = 0;'],
  ['snow-honest icon helper', 'function localMapTempIconForTemp('],
  ['frame-cell snow guard', 'localMapIsSnowy(code, snowfall)']
];
for (const [label, m] of markers) (html.includes(m) ? pass : fail)(label);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
(sw.includes('ai-weather-station-v15') ? pass : fail)('sw cache bumped to v15');

// ----- 3. functional test (jsdom) -----
// Slice the new section out of index.html so we exercise the REAL code.
const start = html.indexOf('// ===== 🌡️ Air-temperature bar graph @ 2 m');
const end = html.indexOf('// ===== 🌩️ Weather effects', start);
if (start < 0 || end < 0) { fail('cannot locate temp-graph section'); process.exit(1); }
const section = html.slice(start, end);

const dom = new JSDOM('<div class="localmap-tempgraph"><span id="localmap-tempgraph-title"></span><div id="localmap-tempgraph-bars"></div></div>');
const doc = dom.window.document;

// Stub of the real localMapFrameCell (same series-pick semantics).
const stubFrameCell = (cell, idx) => {
  const s = cell && cell.series;
  if (!idx || !s || !Array.isArray(s.codes) || !s.codes.length) return cell;
  const i = Math.min(idx, s.codes.length - 1);
  return {
    lat: cell.lat, lon: cell.lon,
    condition: cell.condition, icon: cell.icon,
    temp: s.temps && s.temps[i] != null ? s.temps[i] : cell.temp,
    feels: s.feels && s.feels[i] != null ? s.feels[i] : cell.feels,
    wind_speed: s.wind && s.wind[i] != null ? s.wind[i] : cell.wind_speed,
    wind_direction: cell.wind_direction, precipitation: cell.precipitation
  };
};
const stubFrameLabel = (idx) => (idx ? '+' + idx * 15 + ' min' : 'Now');

// 25 cells: 5×5 lattice, temps 4…24 °C; frame-1 series is +3 °C warmer.
const cells = [];
for (let row = 0; row < 5; row += 1) {
  for (let col = 0; col < 5; col += 1) {
    const t = 4 + row * 3.2 + col * 1.6;
    cells.push({
      lat: 52 - row * 0.05, lon: 4 + col * 0.08,
      condition: 'Clear', icon: row === 0 && col === 0 ? '☀️' : '🌤️',
      temp: Math.round(t), feels: Math.round(t - 1.2),
      wind_speed: 10 + col, wind_direction: 240, precipitation: 0, weatherCode: 1,
      series: { codes: [1, 1], temps: [Math.round(t), Math.round(t + 3)], feels: [Math.round(t - 1.2), Math.round(t + 2)], wind: [10 + col, 12 + col] }
    });
  }
}

const factory = new Function(
  'document', 'latestLocalMapData', 'localMapFrame', 'localMapFrameCell', 'localMapFrameLabel',
  section + '\nreturn { rebuildLocalMapTempGraph, refreshLocalMapTempGraph, localMapTempBarColor };'
);
const api = factory(doc, null, 0, stubFrameCell, stubFrameLabel);

const titleEl = doc.getElementById('localmap-tempgraph-title');
const barsEl = doc.getElementById('localmap-tempgraph-bars');

// empty guard
api.rebuildLocalMapTempGraph([]);
(titleEl.textContent.includes('no cell data') && !barsEl.children.length ? pass : fail)('empty guard');

// render 25 cells @ frame 0
api.rebuildLocalMapTempGraph(cells);
const cols = [...barsEl.querySelectorAll('.lm-temp-col')];
(cols.length === 25 ? pass : fail)('25 bars rendered (got ' + cols.length + ')');
const icons = [...cols].map((c) => c.querySelector('.lm-temp-icon').textContent);
(icons.every((i) => i && i.length >= 2) ? pass : fail)('every bar has an icon');
([...cols].every((c) => c.querySelector('.lm-temp-bar')) ? pass : fail)('every bar has a fill');
([...cols].every((c, i) => c.querySelector('.lm-temp-val').textContent.includes(String(Math.round(4 + Math.floor(i / 5) * 3.2 + (i % 5) * 1.6)) + '°')) ? pass : fail)('values shown in lattice order');
(cols.filter((c) => c.classList.contains('hot')).length === 1 ? pass : fail)('exactly one hot col');
(cols.filter((c) => c.classList.contains('cold')).length === 1 ? pass : fail)('exactly one cold col');
(cols[24].classList.contains('hot') ? pass : fail)('hottest is last lattice cell');
(cols[0].classList.contains('cold') ? pass : fail)('coldest is first lattice cell');
(cols[24].querySelector('.lm-temp-val').textContent.includes('▲') ? pass : fail)('mild 24 °C warmest marked ▲, not 🔥: ' + cols[24].querySelector('.lm-temp-val').textContent);
(cols[0].querySelector('.lm-temp-val').textContent.includes('▼') ? pass : fail)('mild 4 °C coldest marked ▼, not ❄️: ' + cols[0].querySelector('.lm-temp-val').textContent);
(cols.every((c) => !c.querySelector('.lm-temp-val').textContent.includes('🔥') && !c.querySelector('.lm-temp-val').textContent.includes('❄️')) ? pass : fail)('mild grid (4…24 °C) shows NO 🔥/❄️ badges');
(cols[0].title.includes('▼ coldest cell') ? pass : fail)('coldest tooltip notes ▼ coldest cell: ' + cols[0].title);
(cols[24].title.includes('▲ warmest cell') ? pass : fail)('hottest tooltip notes ▲ warmest cell');
(titleEl.textContent.includes('@ 2 m · Now') && titleEl.textContent.includes('avg') ? pass : fail)('title: ' + titleEl.textContent);
const tip = cols[24].title;
(tip.includes('@ 2 m') && tip.includes('@ 1.50 m') && tip.includes('km/h') ? pass : fail)('tooltip compares 2 m vs 1.50 m: ' + tip);
const hots = [...cols].map((c) => parseFloat(c.querySelector('.lm-temp-bar').style.height));
(hots.every((h) => h >= 0 && h <= 100) ? pass : fail)('bar heights in 0–100%');
(hots[24] > hots[0] ? pass : fail)('hotter cell has taller bar');
(cols[0].querySelector('.lm-temp-bar').style.background.includes('rgb(79, 163, 227)') ? pass : fail)('cold bar colour (4 °C → blue)');
(cols[24].querySelector('.lm-temp-bar').style.background.includes('rgb(255, 214, 107)') ? pass : fail)('warm bar colour (24 °C → amber)');

// frame sync: same cells @ frame 1 → temps +3, label +15 min
const apiF1 = factory(doc, null, 1, stubFrameCell, stubFrameLabel);
apiF1.rebuildLocalMapTempGraph(cells);
const titleEl2 = doc.getElementById('localmap-tempgraph-title');
const cols2 = [...barsEl.querySelectorAll('.lm-temp-col')];
(titleEl2.textContent.includes('+15 min') ? pass : fail)('frame label in title: ' + titleEl2.textContent);
(cols2[0].querySelector('.lm-temp-val').textContent.includes(String(Math.round(4) + 3) + '°') ? pass : fail)('frame-1 temps use series (+3)');

// temperature-honest extreme badges: 🔥 only in real heat, ❄️ only when freezing
const mkCells = (lo, step) => Array.from({ length: 5 }, (_, i) => ({
  lat: 52 - i * 0.1, lon: 4 + i * 0.1, temp: lo + i * step, feels: lo + i * step - 1,
  wind_speed: 5, wind_direction: 180, precipitation: 0, weatherCode: 1,
  condition: 'Clear', icon: '☀️'
}));
api.rebuildLocalMapTempGraph(mkCells(22, 3));   // 22…34 °C — real heat
const colsHot = [...barsEl.querySelectorAll('.lm-temp-col')];
(colsHot[4].querySelector('.lm-temp-val').textContent.includes('🔥') ? pass : fail)('🔥 badge in real heat (34 °C): ' + colsHot[4].querySelector('.lm-temp-val').textContent);
(colsHot.slice(0, 4).every((c) => !c.querySelector('.lm-temp-val').textContent.includes('🔥')) ? pass : fail)('only the hottest cell wears 🔥');
api.rebuildLocalMapTempGraph(mkCells(-8, 3));   // -8…4 °C — freezing
const colsCold = [...barsEl.querySelectorAll('.lm-temp-col')];
(colsCold[0].querySelector('.lm-temp-val').textContent.includes('❄️') ? pass : fail)('❄️ badge when freezing (-8 °C): ' + colsCold[0].querySelector('.lm-temp-val').textContent);
(colsCold.slice(1).every((c) => !c.querySelector('.lm-temp-val').textContent.includes('❄️')) ? pass : fail)('above-zero cells wear no ❄️');
api.rebuildLocalMapTempGraph(mkCells(15, 1));   // 15…19 °C — mild, like the reported bug
const colsMild = [...barsEl.querySelectorAll('.lm-temp-col')];
(colsMild[0].querySelector('.lm-temp-val').textContent.includes('▼') ? pass : fail)('mild 15 °C coldest marked ▼, NOT ❄️: ' + colsMild[0].querySelector('.lm-temp-val').textContent);
(colsMild[4].querySelector('.lm-temp-val').textContent.includes('▲') ? pass : fail)('mild 19 °C warmest marked ▲, NOT 🔥');
(colsMild.every((c) => !c.querySelector('.lm-temp-val').textContent.includes('❄️') && !c.querySelector('.lm-temp-val').textContent.includes('🔥')) ? pass : fail)('mild grid (15…19 °C) shows NO snow/fire emojis');

// snow honesty: ❄️ at 17 °C is impossible — it reads as 🌧️ Rain
api.rebuildLocalMapTempGraph([{ lat: 52, lon: 4, temp: 17, feels: 16, wind_speed: 5, wind_direction: 180, precipitation: 0, weatherCode: 73, condition: 'Snow', icon: '❄️' }]);
const warmSnowCol = barsEl.querySelector('.lm-temp-col');
(warmSnowCol.querySelector('.lm-temp-icon').textContent === '🌧️' ? pass : fail)('snow icon at 17 °C becomes 🌧️');
(warmSnowCol.title.includes('🌧️ Rain') ? pass : fail)('snow condition at 17 °C becomes Rain: ' + warmSnowCol.title);
(warmSnowCol.querySelector('.lm-temp-val').textContent.includes('❄️') || warmSnowCol.querySelector('.lm-temp-val').textContent.includes('▼') ? fail : pass)('single-cell grid wears no extreme badge: ' + warmSnowCol.querySelector('.lm-temp-val').textContent);
api.rebuildLocalMapTempGraph([
  { lat: 52, lon: 4, temp: -1, feels: -3, wind_speed: 5, wind_direction: 180, precipitation: 0, weatherCode: 73, condition: 'Snow', icon: '❄️' },
  { lat: 51.9, lon: 4.1, temp: 5, feels: 3, wind_speed: 5, wind_direction: 180, precipitation: 0, weatherCode: 1, condition: 'Clear', icon: '☀️' }
]);
const colsSnowPair = [...barsEl.querySelectorAll('.lm-temp-col')];
(colsSnowPair[0].querySelector('.lm-temp-icon').textContent === '❄️' ? pass : fail)('snow icon kept at -1 °C (snow is real there)');
(colsSnowPair[0].querySelector('.lm-temp-val').textContent.includes('❄️') ? pass : fail)('freezing coldest cell wears ❄️: ' + colsSnowPair[0].querySelector('.lm-temp-val').textContent);

// refresh() caching: same cells + same frame → cheap return (no rebuild crash)
const api2 = factory(doc, { localMap: { cells } }, 0, stubFrameCell, stubFrameLabel);
api2.refreshLocalMapTempGraph();
const after1 = barsEl.children.length;
api2.refreshLocalMapTempGraph();
(barsEl.children.length === after1 ? pass : fail)('refresh() caches identical state');

console.log(bad ? '\n' + bad + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
process.exit(bad ? 1 : 0);
