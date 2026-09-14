// Extracts the inline <script> block from index.html and runs a JS syntax check.
// Usage: node scripts/check-inline-js.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('No inline <script> found');
  process.exit(1);
}

const tmp = path.join(__dirname, '_inline_check.js');
fs.writeFileSync(tmp, match[1]);

try {
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  console.log('INLINE JS: syntax OK (' + match[1].split('\n').length + ' lines)');
} catch (e) {
  console.error('INLINE JS: SYNTAX ERROR\n' + String(e.stdout || '') + String(e.stderr || ''));
  process.exit(1);
} finally {
  fs.unlinkSync(tmp);
}