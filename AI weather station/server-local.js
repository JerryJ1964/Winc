// Local development server for the AI Weather Station.
// Serves the static PWA files and exposes the same API endpoints that
// Vercel provides in production (including the new /api/push endpoint).
// Usage: node server-local.js   (then open http://localhost:3000)
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env (KEY=VALUE lines) into process.env — WITHOUT overriding variables
// that are already set (shell / Vercel take precedence). Plain Node does not
// read .env by itself, which is why a key placed in .env used to be silently
// ignored when running `node server-local.js` / `npm start`.
(function loadDotEnv() {
  try {
    const lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env is optional — everything has safe defaults without it.
  }
})();

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

const weatherHandler = require('./api/weather.js');
const pushHandler = require('./api/push.js');
const nhcHandler = require('./api/nhc.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function contentType(filePath) {
  return MIME[path.extname(filePath)?.toLowerCase()] || 'application/octet-stream';
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// Shims the handler signature ({ req, res } with res.setHeader/statusCode/end).
function makeApiRes(res) {
  return {
    headers: {},
    statusCode: 200,
    setHeader(k, v) { this.headers[k] = v; },
    end(data) {
      if (res.writableEnded) return;
      res.writeHead(this.statusCode, this.headers);
      res.end(data);
    }
  };
}

function makeApiReq(req, body) {
  return { url: req.url, method: req.method, body };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);

    // /weather is rewritten to /api/weather (mirrors vercel.json)
    if (pathname === '/weather' || pathname === '/weather/manual-update') {
      pathname = '/api/weather';
    }

    if (pathname === '/api/weather') {
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      await weatherHandler(makeApiReq(req, body), makeApiRes(res));
      return;
    }

    if (pathname === '/api/push') {
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      await pushHandler(makeApiReq(req, body), makeApiRes(res));
      return;
    }

    if (pathname === '/api/nhc') {
      await nhcHandler(makeApiReq(req), makeApiRes(res));
      return;
    }

    // Static files (project root mirrors the Vercel output directory)
    if (pathname === '/' || pathname === '/index.html') {
      pathname = '/index.html';
    }
    const filePath = path.join(ROOT, pathname);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Server error', err);
    if (!res.writableEnded) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`AI Weather Station running at http://localhost:${PORT}`);
});