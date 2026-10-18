// =====================================================================
//  api/push.js  —  Web Push + weather alert notifications (Vercel fn)
// ---------------------------------------------------------------------
//  Register/unregister a user's PushSubscription, and (optionally, via a
//  scheduled cron call) evaluate the 3-hour forecast at each user's own
//  coordinates and send a Web Push whenever rain, hail, snow or wind
//  above Beaufort 4 (> 28 km/h) is expected — for every user, wherever
//  they are on Earth.
//
//  Endpoints (mounted at /api/push):
//    POST /api/push   JSON: { action } where action is one of:
//      "register"    { subscription, lat, lng, label }   — store a user + push sub
//      "unregister"  { endpoint }                        — remove a subscription
//      "refresh"     { endpoint, lat, lng, label }       — update a user's coords
//      "test"        {}                                   — send a test push to everyone
//      "list"        {}                                   — count of active subs
//      "notify"      {}                                   — check weather + send pushes
//    GET /api/push?action=notify   — same as notify (used by Vercel Cron, GET only)
//
//  Storage:
//    In-memory by default (per function instance — fine for development and
//    single-instance demos). If Vercel KV (Redis) env vars are present
//    (KV_REST_API_URL / KV_REST_API_TOKEN) the subscription list is mirrored
//    there so pushes survive cold starts. Use those in production.
// =====================================================================

const webpush = require('web-push');
const weather = require('./weather');
// ── Upstream discipline (the 504 fix) ──────────────────────────────────
// The cron-driven "notify" run touches every subscription in turn, so one
// stalled provider or push endpoint used to be enough to drag the function
// past its maxDuration — Vercel then answered 504 and the whole run's state
// was lost. Every upstream call now carries its own ceiling, the per-user
// checks run concurrently in a small pool, and the run stops at a deadline so
// it always answers with whatever it managed to send.
const KV_TIMEOUT_MS = Number(process.env.KV_TIMEOUT_MS || 5000);
const PUSH_SEND_TIMEOUT_MS = Number(process.env.PUSH_SEND_TIMEOUT_MS || 8000);
const NOTIFY_BUDGET_MS = Number(process.env.PUSH_NOTIFY_BUDGET_MS || 45000);
const NOTIFY_CONCURRENCY = Number(process.env.PUSH_NOTIFY_CONCURRENCY || 4);

function timeoutSignal(ms) {
  return typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(ms) : undefined;
}

// Resolve-or-die wrapper: a hanging upstream or push endpoint must never decide
// how long this function runs.
function withBudget(promise, ms, label) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: exceeded ${ms} ms budget`)), ms);
    if (timer && typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

// web-push talks to the browser vendor's endpoint over plain https (no fetch,
// so no AbortSignal) — the only way to keep a dead endpoint from stalling the
// run is to race it against a deadline.
function sendPushNotification(subscription, payload, options) {
  return withBudget(webpush.sendNotification(subscription, payload, options), PUSH_SEND_TIMEOUT_MS, 'web-push send');
}

// Small worker pool: N subscriptions in flight instead of one at a time, so a
// growing subscriber list cannot stretch the daily cron run past its deadline.
async function runBounded(items, limit, worker) {
  let index = 0;
  const width = Math.max(1, Math.min(limit, items.length));
  const runners = Array.from({ length: width }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current]);
    }
  });
  await Promise.all(runners);
}



// ----- VAPID keys ----------------------------------------------------
// In production set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
// as environment variables on Vercel. The keys below are development
// fallbacks generated for this project (see scripts/generate-vapid.js).
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BHmpAo67PDENnPcvWNTb_vArQc8eXv7ia80Qlv9K_VosLwaTNydVLuhZLZS9q-QzQHhigN3JI3K0sYzDfcXK7P0';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'oy6SFWvS-yugT7vjIZAeybkGBSQw6NswDodvGJtSsAs';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:weather-alerts@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ----- Subscription store --------------------------------------------
// in-memory Map + optional Vercel KV (Redis) mirror.
const MEMORY_SUBS = new Map(); // endpoint -> registration record

function kvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(pathAndQuery, options) {
  if (!kvEnabled()) return undefined;
  const url = `${process.env.KV_REST_API_URL}${pathAndQuery}`;
  const response = await fetch(url, {
    signal: timeoutSignal(KV_TIMEOUT_MS),
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      ...(options?.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`KV HTTP ${response.status}`);
  return response.json();
}

const KV_KEY = 'weather_pwa_subscriptions_v1';

async function loadSubscriptions() {
  if (!kvEnabled()) return;
  try {
    const json = await kvCommand(`/get/${KV_KEY}`);
    const parsed = json?.result ? JSON.parse(json.result) : [];
    if (Array.isArray(parsed)) {
      MEMORY_SUBS.clear();
      parsed.forEach((rec) => rec && rec.endpoint && MEMORY_SUBS.set(rec.endpoint, rec));
    }
  } catch (error) {
    console.warn('KV load failed (using in-memory store).', error.message);
  }
}

async function saveSubscriptions() {
  if (!kvEnabled()) return;
  try {
    const list = Array.from(MEMORY_SUBS.values());
    await kvCommand(`/set/${KV_KEY}`, {
      method: 'POST',
      body: JSON.stringify(JSON.stringify(list)),
    });
  } catch (error) {
    console.warn('KV save failed (in-memory store still active).', error.message);
  }
}

function addSubscription(record) {
  const previous = MEMORY_SUBS.get(record.endpoint);
  MEMORY_SUBS.set(record.endpoint, { ...(previous || {}), ...record });
  void saveSubscriptions();
}

function removeSubscription(endpoint) {
  MEMORY_SUBS.delete(endpoint);
  void saveSubscriptions();
}

// ----- Alert message building -----------------------------------------
function buildMessage(alerts, label, coords) {
  const emojis = alerts.map((a) => a.emoji).join(' ');
  const names = alerts.map((a) => a.label).join(' + ');
  const windNote = alerts.some((a) => a.type === 'strongWind')
    ? ` (peak ${alerts.find((a) => a.type === 'strongWind').maxWindKmh} km/h)`
    : '';
  const place = label || `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`;
  return {
    title: `${emojis} Weather alert · ${place}`,
    body: `${names} expected here in the next 3 hours${windNote}.`,
  };
}
// Check the forecast at one user's coordinates and send a push when the
// alert flags have newly turned on (or are still on after the cooldown).
async function checkAndNotify(record) {
  const { endpoint, lat, lng, label } = record;
  if (!(typeof lat === 'number' && typeof lng === 'number')) return false;

  const result = await weather.checkAlertsForCoords(lat, lng);
  const summary = result.summary || { trigger: false };
  const signature = (result.alerts || []).map((a) => a.type).sort().join(',');

  const now = Date.now();
  const cooldownMs = 30 * 60 * 1000; // at most one push per 30 min per signature
  const lastSig = record.lastSignature;
  const lastAt = record.lastSentAt || 0;

  const isNew = !lastSig || lastSig !== signature;
  const cooledDown = !summary.trigger || now - lastAt >= cooldownMs;

  if (!summary.trigger) {
    // weather calmed down — store the (empty) signature so the next change retriggers
    record.lastSignature = signature;
    record.lastSentAt = 0;
    return false;
  }
  if (!isNew && !cooledDown) return false;

  const message = buildMessage(result.alerts, label, { latitude: lat, longitude: lng });
  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: '/', alerts: result.alerts, location: label },
    tag: `weather-${signature}-${Math.floor(now / (30 * 60 * 1000))}`,
  });

  try {
    await withBudget(
      webpush.sendNotification(
        { endpoint, keys: { p256dh: record.p256dh, auth: record.auth } },
        payload,
        { TTL: 60 * 60 }
      ),
      PUSH_SEND_TIMEOUT_MS,
      `push send for ${label || endpoint.slice(0, 24)}`
    );
    record.lastSignature = signature;
    record.lastSentAt = now;
    return true;
  } catch (error) {
    // Subscription no longer valid (410 Gone / 404 Not Found) -> drop it.
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      console.warn('Removing stale subscription', endpoint.slice(0, 40), error.statusCode);
      removeSubscription(endpoint);
    } else {
      console.warn('Push failed for', label, error.message);
    }
    return false;
  }
}

// ----- HTTP handler ----------------------------------------------------
async function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const query = Object.fromEntries(url.searchParams);

  let body = {};
  if (req.method === 'POST') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch {
      body = {};
    }
  }
  const action = req.method === 'GET' ? query.action : (body.action || query.action);

  const respond = (statusCode, data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  };

  try {
    await loadSubscriptions();

    if (action === 'info') {
      // Expose the VAPID public key so the front-end can subscribe for pushes.
      return respond(200, { ok: true, publicKey: VAPID_PUBLIC_KEY });
    }

    if (action === 'register' || action === 'refresh') {
      const sub = body.subscription;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        return respond(400, { error: 'Valid subscription object is required.' });
      }
      addSubscription({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        lat: typeof body.lat === 'number' ? body.lat : undefined,
        lng: typeof body.lng === 'number' ? body.lng : undefined,
        label: typeof body.label === 'string' ? body.label.slice(0, 120) : '',
      });
      return respond(200, { ok: true, active: MEMORY_SUBS.size });
    }

    if (action === 'unregister') {
      if (typeof body.endpoint === 'string') removeSubscription(body.endpoint);
      return respond(200, { ok: true, active: MEMORY_SUBS.size });
    }

    if (action === 'list') {
      return respond(200, {
        ok: true,
        active: MEMORY_SUBS.size,
        subs: Array.from(MEMORY_SUBS.values()).map((r) => ({
          label: r.label || '',
          lat: r.lat ?? null,
          lng: r.lng ?? null,
          lastSignature: r.lastSignature || null,
        })),
      });
    }

    if (action === 'test') {
      const target = body.endpoint ? MEMORY_SUBS.get(body.endpoint) : undefined;
      const records = target ? [target] : Array.from(MEMORY_SUBS.values());
      let sent = 0;
      const testDeadline = Date.now() + NOTIFY_BUDGET_MS;
      await runBounded(records, NOTIFY_CONCURRENCY, async (record) => {
        if (Date.now() > testDeadline) return;
        try {
          await sendPushNotification(
            { endpoint: record.endpoint, keys: { p256dh: record.p256dh, auth: record.auth } },
            JSON.stringify({
              title: '✅ AI Weather Station',
              body: 'Your weather alerts are active. You will be notified of rain, hail, snow and wind above Beaufort 4 in your area.',
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              data: { url: '/' },
            }),
            { TTL: 60 * 60 }
          );
          sent += 1;
        } catch (error) {
          if (error?.statusCode === 404 || error?.statusCode === 410) removeSubscription(record.endpoint);
        }
      });
      return respond(200, { ok: true, sent, active: MEMORY_SUBS.size });
    }

    if (action === 'notify') {
      const secret = process.env.PUSH_NOTIFY_SECRET;
      if (secret && query.secret !== secret) {
        return respond(403, { error: 'Invalid or missing notify secret.' });
      }
      let checked = 0;
      let pushed = 0;
      let skipped = 0;
      if (MEMORY_SUBS.size > 0) {
        // Deadline instead of an unbounded sequential loop: subscribers that
        // were not reached in time are simply picked up by the next cron run,
        // but this function always answers — and always saves the state it did
        // collect — well before maxDuration turns the request into a 504.
        const deadlineAt = Date.now() + NOTIFY_BUDGET_MS;
        await runBounded(Array.from(MEMORY_SUBS.values()), NOTIFY_CONCURRENCY, async (record) => {
          if (Date.now() > deadlineAt) {
            skipped += 1;
            return;
          }
          checked += 1;
          try {
            if (await checkAndNotify(record)) pushed += 1;
          } catch (error) {
            console.warn('checkAndNotify failed for', record.label, error.message);
          }
        });
        await saveSubscriptions();
      }
      return respond(200, {
        ok: true,
        checked,
        pushed,
        skipped,
        partial: skipped > 0,
        active: MEMORY_SUBS.size,
      });
    }

    return respond(400, {
      error: 'Unknown action. Use register, refresh, unregister, list, test or notify.',
      actions: ['register', 'refresh', 'unregister', 'list', 'test', 'notify'],
    });
  } catch (error) {
    console.error('api/push failed:', error);
    return respond(500, { error: 'Push service error.' });
  }
}

module.exports = handler;
module.exports.handler = handler;
module.exports._internal = { loadSubscriptions, checkAndNotify, addSubscription, MEMORY_SUBS, buildMessage };