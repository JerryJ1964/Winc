// Regression: local-weather radar paints organic blobs (not square blocks)
// and the red timeline needle stays centred over the selected forecast block.
// Run: node tests/localRadarBlobs.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('radar grid builds rounded organic blobs, not sharp rectangles', () => {
  // 28-vertex rounded blob ring (superellipse + wobble) replaces the old
  // 4-corner rectangle polygon.
  assert.match(html, /blobRing\(cell\.lon, cell\.lat/);
  assert.match(html, /const N = 28, ring = \[\]/);
  assert.match(html, /Math\.pow\(Math\.abs\(Math\.cos\(a\)\), 0\.72\)/);
  assert.match(html, /ring\.push\(ring\[0\]\.slice\(\)\)/);
  assert.match(html, /soft overlapping/);
  assert.doesNotMatch(html, /const hx = dLon \* 0\.95/,
    'old sharp-rectangle half-extents are gone');
  // Soft fill paint lets blobs melt into a continuous sheet.
  assert.match(html, /'fill-antialias': true/);
});

test('red timeline needle tracks the selected forecast block', () => {
  // Needle centres over the .sel forecast segment (DOM-measured), falling
  // back to the frame-time percentage — never hardcoded to 50%.
  assert.match(html, /querySelector\('i\.sel\[data-idx\]'\)/);
  assert.match(html, /needlePct = \(\(r\.left \+ r\.width \/ 2\) - b\.left\) \/ b\.width \* 100/);
  assert.match(html, /localMapNeedlePct\(\)/);
  assert.match(html, /needlePct\.toFixed\(2\)/);
  assert.match(html, /% - 1px/);
  assert.doesNotMatch(html, /localMapTlNow\.style\.left = 'calc\(50% - 1px\)'/,
    'hardcoded centred needle is gone');
});
