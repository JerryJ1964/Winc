/* Verification for the trace-drizzle distinction (build:localmap-drizzle-20260909-1).
   Loads the backend classifier from api/weather.js in a sandbox, extracts the
   front-end classifier + cell colours from index.html, and asserts:
     • drizzle codes 51–57 / trace mm classify as 'drizzle' (backend + frontend)
     • rain codes / >= 0.3 mm still classify as 'rain'
     • snow / hail / fog / clouds / clear are unchanged
     • the drizzle blob is pale + faint (alpha < 0.5, heavy = 0), rain unchanged
     • the inline page script still compiles (vm.Script syntax check)
   Run: node _verify_drizzle.js                                                       */
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
const classify = sandbox.classifyLocalCell;
check('backend classifyLocalCell reachable via sandbox', typeof classify === 'function');

const cases = [
  ['drizzle code 53 + trace mm', [53, 0.1, 0, 80], 'drizzle'],
  ['drizzle code 55, zero mm', [55, 0, 0, 60], 'drizzle'],
  ['trace mm 0.1, clear code', [0, 0.1, 0, 20], 'drizzle'],
  ['trace mm 0.29 (just under)', [0, 0.29, 0, 0], 'drizzle'],
  ['0.3 mm (at threshold)', [0, 0.3, 0, 0], 'rain'],
  ['rain code 63 + trace mm', [63, 0.1, 0, 90], 'rain'],
  ['shower code 80 + 0.5 mm', [80, 0.5, 0, 90], 'rain'],
  ['snow code 71', [71, 0.1, 0.4, 90], 'snow'],
  ['snowfall > 0, clear code', [0, 0, 0.5, 10], 'snow'],
  ['hail code 96', [96, 1, 0, 90], 'hail'],
  ['fog code 45', [45, 0, 0, 80], 'fog'],
  ['clouds 60% cover', [2, 0, 0, 60], 'clouds'],
  ['clear sky', [0, 0, 0, 30], 'clear']
];
for (const [name, args, want] of cases) {
  const got = classify(...args);
  check(`backend ${name} → ${want}`, got === want, `got ${got}`);
}
check('backend exports classifyLocalCell for tests',
  /_internal = \{ buildWapiTimeline, mapWapiCodeToWmo, classifyLocalCell \}/.test(apiSrc));

// ---------- frontend: index.html ----------
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
check('build comment present', html.includes('build:localmap-drizzle-20260909-1'));
check('frontend threshold constant present', html.includes('const LOCALMAP_RAIN_MIN_MM = 0.3'));

// Extract localMapClassify + localMapCellColor from the inline script and run them.
function extractFn(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) return null;
  let depth = 0, inStr = null, esc = false, open = false;
  for (let i = src.indexOf('{', start); i < src.length; i += 1) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); if (nl === -1) break; i = nl; continue; }
    if (ch === '{') { depth += 1; open = true; }
    else if (ch === '}') {
      depth -= 1;
      if (open && depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}
const feSrc = extractFn(html, 'localMapClassify');
const snowSrc = extractFn(html, 'localMapIsSnowy');
const colorSrc = extractFn(html, 'localMapCellColor');
check('frontend localMapClassify extracted', !!feSrc);
check('frontend localMapIsSnowy extracted (snow-honest helper)', !!snowSrc);
check('frontend localMapCellColor extracted', !!colorSrc);
// The function references the page-scope constant; extract its real value from
// the page and inject it into the sandbox as a global before compiling.
const thrMatch = html.match(/const LOCALMAP_RAIN_MIN_MM = ([0-9.]+);/);
check('frontend threshold value extracted', !!thrMatch);
const feBox = { console, Math };
feBox.LOCALMAP_RAIN_MIN_MM = thrMatch ? Number(thrMatch[1]) : 0.3;
vm.createContext(feBox);
vm.runInContext(`${snowSrc || ''}\n${feSrc}\n${colorSrc}`, feBox, { filename: 'index.html [extracted functions]' });
const feClassify = feBox.localMapClassify;
const feColor = feBox.localMapCellColor;
check('frontend localMapClassify callable', typeof feClassify === 'function');
check('frontend localMapCellColor callable', typeof feColor === 'function');
for (const [name, args, want] of cases) {
  const got = feClassify(...args);
  check(`frontend ${name} → ${want}`, got === want, `got ${got}`);
}
const driz = feColor({ type: 'drizzle', precipitation: 0.1, cloudCover: 80 });
check('drizzle blob is faint (alpha < 0.5)', typeof driz.a === 'number' && driz.a < 0.5, `a=${driz.a}`);
check('drizzle has no heavy styling', driz.heavy === 0);
check('drizzle still paints a cloud deck', driz.cloud === true);
check('drizzle dot is 🌦️', driz.dot === '🌦️');
const drizMax = feColor({ type: 'drizzle', precipitation: 0.29, cloudCover: 80 });
check('drizzle alpha stays below rain minimum (0.65)', drizMax.a < 0.65, `a=${drizMax.a}`);
const rain = feColor({ type: 'rain', precipitation: 1, cloudCover: 90 });
check('rain blob unchanged (alpha >= 0.65)', rain.a >= 0.65, `a=${rain.a}`);
check('rain dot unchanged (💧)', rain.dot === '💧');
check('rain layer toggle guards drizzle',
  /\(cell\.type === 'rain' \|\| cell\.type === 'drizzle'\) && !localMapLayers\.rain/.test(html));
check('drizzle skips rim + streaks', html.includes("if (cell.type !== 'drizzle')"));
check('accent icon covers drizzle', /fCell\.type === 'rain' \|\| fCell\.type === 'drizzle'/.test(html));

// ---------- inline script still compiles ----------
const scripts = [];
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html)) !== null) scripts.push(m[1]);
check('inline script blocks found', scripts.length > 0, `found ${scripts.length}`);
let compiled = 0, compileErr = '';
for (let i = 0; i < scripts.length; i += 1) {
  try { new vm.Script(scripts[i], { filename: `index.html <script>#${i}` }); compiled += 1; }
  catch (err) { compileErr = err.message; }
}
check('all inline scripts compile', compiled === scripts.length, `${compiled}/${scripts.length} — ${compileErr}`);

console.log(failures === 0 ? '\nALL CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);

