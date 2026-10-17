// Extracts EVERY inline <script> block from index.html and runs a JS syntax
// check on each. The app used to have only the small MapLibre loader checked,
// while the main multi-thousand-line app block was never validated — a typo
// there would only surface at runtime in the browser.
// Usage: node scripts/check-inline-js.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
if (blocks.length === 0) {
  console.error('No inline <script> found');
  process.exit(1);
}

let failed = 0;
blocks.forEach((m, i) => {
  const tmp = path.join(__dirname, `_inline_check_${i + 1}.js`);
  fs.writeFileSync(tmp, m[1]);
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log(`INLINE JS #${i + 1}: syntax OK (${m[1].split('\n').length} lines)`);
  } catch (e) {
    failed += 1;
    console.error(`INLINE JS #${i + 1}: SYNTAX ERROR\n` + String(e.stdout || '') + String(e.stderr || ''));
  } finally {
    fs.unlinkSync(tmp);
  }
});

if (failed) {
  console.error(`${failed} of ${blocks.length} inline script block(s) failed`);
  process.exit(1);
}
console.log(`INLINE JS: all ${blocks.length} block(s) OK`);
