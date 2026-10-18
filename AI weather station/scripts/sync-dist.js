// Syncs the live site files from the project root into dist/ — dist is the Vercel
// project's Root Directory, so only dist/ is deployed. Always run this (or `npm run
// deploy`) before deploying, otherwise edits to the root index.html etc. never go live.
// Usage: node scripts/sync-dist.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// Files that make up the deployed site (Vercel rootDirectory = dist).
const files = ['index.html', 'app.js', 'style.css', 'main.js', 'sw.js', 'manifest.json', 'vercel.json', 'data/countries-110m.json', 'data/countries-50m.json', 'api/push.js', 'api/weather.js', 'api/nhc.js', 'api/earthquake.js', 'api/tsunami.js', 'api/volcano.js', 'api/fires.js', 'api/landslide.js', 'api/avalanche.js', 'api/dust.js', 'api/solar.js', 'api/aurora.js', 'icons/icon-192.png', 'icons/icon-512.png'];

for (const f of files) {
  const src = path.join(root, f);
  const dst = path.join(dist, f);
  const data = fs.readFileSync(src);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, data);
  console.log('synced dist/' + f + ' (' + data.length + ' bytes)');
}

// Safety: verify every synced file is byte-identical to its source.
const crypto = require('crypto');
const sha = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
let ok = true;
for (const f of files) {
  const same = sha(path.join(root, f)) === sha(path.join(dist, f));
  if (!same) ok = false;
  console.log((same ? '  MATCH   ' : '  MISMATCH ') + f);
}
if (!ok) {
  console.error('Sync verification failed — not all files match!');
  process.exit(1);
}
console.log('Done. Run: vercel --prod --yes   (or: npm run deploy)');