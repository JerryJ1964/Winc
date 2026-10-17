// build:tsunamis-20260916-1 — same-origin proxy for the NOAA tsunami warning
// centres. Tsunami messages are published as CAP XML (plus long-form bulletins)
// by both U.S. centres and neither allows cross-origin browser calls, so this
// Vercel serverless function fetches them and returns a small, normalized list:
//
//   • NTWC  — National Tsunami Warning Center, Palmer, Alaska
//   • PTWC  — Pacific Tsunami Warning Center, Honolulu, Hawaii
//
// Per message it extracts the alert category (Warning / Advisory / Watch /
// Information), the preliminary earthquake magnitude, the epicentre, the
// affected region, the issue/expiry times and — for threat categories — the
// WAVE HEIGHTS from the bulletin's forecast and observed tables (converted to
// metres). Falls back gracefully to an empty list so the rest of the page keeps
// working when NOAA is unreachable.

const CAP_FEEDS = [
  {
    url: 'https://www.tsunami.gov/events/xml/PAAQCAP.xml',
    center: 'NTWC',
    centerLabel: 'National Tsunami Warning Center (Palmer, AK)'
  },
  {
    url: 'https://www.tsunami.gov/events/xml/PHEBCAP.xml',
    center: 'PTWC',
    centerLabel: 'Pacific Tsunami Warning Center (Honolulu, HI)'
  }
];

const THREAT_CATEGORIES = ['Warning', 'Advisory', 'Watch'];
// A message older than this is dropped entirely: the CAP files keep serving the
// last message of each centre even when it is days old.
const MAX_MESSAGE_AGE_HOURS = 24 * 7;
const USER_AGENT = 'AI-Weather-Station/1.1 (+https://github.com/JerryJ1964/Winc)';

// ---------- tiny XML helpers (no dependencies) ----------

function decodeEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// Flatten an XML/HTML fragment to plain text (CAP fields carry small <b>/<br>
// markup in the tsunami documents).
function cleanText(value) {
  if (value == null) return null;
  return decodeEntities(String(value).replace(/<\/?[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function tagText(xml, tag) {
  if (!xml) return null;
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return match ? cleanText(match[1]) : null;
}

function parseParameters(xml) {
  const params = {};
  const re = /<parameter\b[^>]*>([\s\S]*?)<\/parameter>/gi;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const name = tagText(match[1], 'valueName');
    const value = tagText(match[1], 'value');
    if (name) params[name] = value;
  }
  return params;
}

// "69.551,-144.491 0.000" -> { lat: 69.551, lng: -144.491 }
function parseLatLon(value) {
  if (!value) return null;
  const match = String(value).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
// CAP <event> is "Tsunami Warning" / "Tsunami Advisory" / "Tsunami Watch" /
// "Tsunami Information".
function categoryFromEvent(event) {
  const text = String(event || '').toLowerCase();
  if (text.includes('warning')) return 'Warning';
  if (text.includes('advisory')) return 'Advisory';
  if (text.includes('watch')) return 'Watch';
  if (text.includes('information') || text.includes('statement')) return 'Information';
  return 'Information';
}

function isThreatCategory(category) {
  return THREAT_CATEGORIES.includes(category);
}

// Pull the alert out of a CAP document and flatten it. Both centres publish
// exactly one <info> block in these files.
function parseCapMessage(xml, meta, now) {
  if (!xml) return null;
  const info = /<info\b[^>]*>([\s\S]*?)<\/info>/i.exec(xml);
  const body = info ? info[1] : xml;
  const params = parseParameters(body);

  const event = tagText(body, 'event') || 'Tsunami message';
  const category = categoryFromEvent(event);
  const threat = isThreatCategory(category);

  const latLon = parseLatLon(params.EventLatLon) || parseLatLon(tagText(body, 'circle'));
  const depthRaw = params.EventDepth || null;
  const expires = toIso(tagText(body, 'expires'));
  // <sent> sits on the alert element itself, not inside <info>.
  const issued = toIso(tagText(xml, 'sent') || tagText(body, 'sent'));
  const web = tagText(body, 'web');

  const expiresMs = expires ? Date.parse(expires) : null;
  const issuedMs = issued ? Date.parse(issued) : null;

  return {
    id: tagText(xml, 'identifier') || `${meta.center}-${params.EventLocationName || 'event'}`,
    center: meta.center,
    centerLabel: meta.centerLabel,
    source: tagText(xml, 'source') || meta.center,
    category,
    event,
    threat,
    // "In force" means a threat category that has not expired yet.
    active: threat && expiresMs != null && expiresMs > now,
    lat: latLon ? latLon.lat : null,
    lng: latLon ? latLon.lng : null,
    magnitude: toNumber(params.EventPreliminaryMagnitude),
    magnitudeType: params.EventPreliminaryMagnitudeType || null,
    depthKm: depthRaw ? toNumber(String(depthRaw).replace(/[^\d.]/g, '')) : null,
    region: params.EventLocationName || tagText(body, 'areaDesc') || null,
    headline: tagText(body, 'headline'),
    instruction: tagText(body, 'instruction'),
    severity: tagText(body, 'severity'),
    urgency: tagText(body, 'urgency'),
    certainty: tagText(body, 'certainty'),
    originTime: toIso(params.EventOriginTime),
    issued,
    expires,
    issuedMs,
    expiresMs,
    bulletinUrl: web ? String(web).replace(/^http:\/\//i, 'https://') : null,
    waveHeights: null
  };
}
// ---------- wave heights (from the official bulletin tables) ----------

// One row looks like
//   "Crescent City    2350  PDT Jul 29  30 hrs    2.6- 4.8 ft   "
//   " Adak  Alaska                                            0.9ft"
//   "Tofino           2330  PDT Jul 29           less than 1ft "
const HEIGHT_TOKEN = String.raw`(?:less than\s+)?([\d.]+)(?:\s*[-–—]\s*([\d.]+))?\s*(ft|feet|foot|m|meters|meter|metres|metre)\b\.?`;
const ROW_HEIGHT_RE = new RegExp(HEIGHT_TOKEN + String.raw`\s*$`, 'i');

const NEXT_SECTION_RES = [
  /\n\s*OBSERVATIONS OF TSUNAMI ACTIVITY/i,
  /\n\s*PRELIMINARY EARTHQUAKE PARAMETERS/i,
  /\n\s*TSUNAMI WARNING\b/i,
  /\n\s*RECOMMENDED ACTIONS/i,
  /\n\s*POTENTIAL IMPACTS/i,
  /\n\s*IMPACTS\b/i,
  /\n\s*NOTE\b/i,
  /\$\$/,
  /\bNNNN\b/
];

// Bulletin heights are mixed units: NTWC publishes feet, PTWC often metres.
function toMetres(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const lower = String(unit).toLowerCase();
  const metres = (lower.startsWith('ft') || lower.startsWith('feet') || lower.startsWith('foot'))
    ? n * 0.3048
    : n;
  return Math.round(metres * 100) / 100;
}

// Slice one "HEADER / ---- / body" block out of a bulletin.
function sliceSection(text, startRe) {
  const start = startRe.exec(text);
  if (!start) return '';
  let rest = text.slice(start.index + start[0].length);
  const firstNewline = rest.indexOf('\n');
  if (firstNewline !== -1) rest = rest.slice(firstNewline + 1);
  let end = rest.length;
  for (const re of NEXT_SECTION_RES) {
    const match = re.exec(rest);
    if (match && match.index < end) end = match.index;
  }
  return rest.slice(0, end);
}

function parseHeightRows(section) {
  const rows = [];
  if (!section) return rows;
  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[*\-–—]/.test(trimmed)) continue;        // bullets (" * Alaska") and rulers
    const match = ROW_HEIGHT_RE.exec(line);
    if (!match) continue;

    const before = line.slice(0, match.index).trim();
    if (!before) continue;
    const parts = before.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) continue;

    const site = parts[0];
    // Sites are listed as "NAME" or "NAME  Region" — keep the region as well and
    // drop the clock-time / duration columns that follow it.
    const region = parts.length > 1 && !/\d/.test(parts[1]) ? parts[1] : null;
    const timeParts = parts.slice(1);
    let time = timeParts.find((p) => /\d/.test(p)) || null;
    // "2205" + "PDT Jul 29" are split by the bulletin's column padding.
    const timeIndex = time ? timeParts.indexOf(time) : -1;
    if (time && /^\d{3,4}$/.test(time) && timeParts[timeIndex + 1] && /^[A-Z]{2,4}(?:\s+[A-Z]{3})?\s+\d{1,2}$/i.test(timeParts[timeIndex + 1])) {
      time += ' ' + timeParts[timeIndex + 1];
    }
    const minM = toMetres(match[1], match[3]);
    const maxM = match[2] != null ? toMetres(match[2], match[3]) : minM;
    if (maxM == null) continue;

    rows.push({
      site: region ? `${site} (${region})` : site,
      time,
      heightText: match[0].replace(/\s+/g, ' ').trim(),
      minM,
      maxM
    });
  }
  return rows;
}

// Returns null when the bulletin reports no heights at all — which is the case
// for every Tsunami Information statement.
function parseWaveHeights(bulletin) {
  if (!bulletin) return null;
  const text = String(bulletin).replace(/\r/g, '');
  const forecast = parseHeightRows(sliceSection(text, /FORECASTS? OF TSUNAMI ACTIVITY[^\n]*/i));
  const observed = parseHeightRows(sliceSection(text, /OBSERVATIONS OF TSUNAMI ACTIVITY[^\n]*/i));
  if (!forecast.length && !observed.length) return null;

  const forecastMaxM = forecast.reduce((max, row) => Math.max(max, row.maxM), 0) || null;
  const observedMaxM = observed.reduce((max, row) => Math.max(max, row.maxM), 0) || null;

  // The headline number for the globe: what the water actually did if anything
  // has been measured yet, otherwise what was forecast.
  let top = null;
  let source = null;
  for (const row of observed) if (!top || row.maxM > top.maxM) { top = row; source = 'observed'; }
  if (!top) for (const row of forecast) if (!top || row.maxM > top.maxM) { top = row; source = 'forecast'; }

  return {
    unit: 'm',
    forecastMaxM,
    observedMaxM,
    maxM: top ? top.maxM : null,
    maxSite: top ? top.site : null,
    maxSource: source,                 // 'observed' | 'forecast'
    maxHeightText: top ? top.heightText : null,
    forecast: forecast.slice(0, 40),
    observed: observed.slice(0, 40)
  };
}

// ---------- fetching ----------

async function fetchText(url, timeoutMs) {
  const response = await fetch(url, {
    headers: { Accept: 'text/plain, application/xml, text/xml, */*', 'User-Agent': USER_AGENT },
    signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

async function loadMessage(feed, options, now) {
  const message = parseCapMessage(await fetchText(feed.url, 10000), feed, now);
  if (!message) return null;

  // Age guard: a centre keeps serving its last message even when it is old.
  const ageHours = message.issuedMs != null ? (now - message.issuedMs) / 3600000 : null;
  if (ageHours != null && ageHours > MAX_MESSAGE_AGE_HOURS) return null;

  // Only threat messages carry forecast / observed wave-height tables.
  if (options.includeHeights && message.threat && message.bulletinUrl) {
    try {
      message.waveHeights = parseWaveHeights(await fetchText(message.bulletinUrl, 8000));
    } catch (error) {
      console.warn(`Tsunami bulletin unavailable (${message.bulletinUrl}):`, error.message);
      message.waveHeights = null;
    }
  }
  return message;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const params = new URL(req.url || '/', 'http://localhost').searchParams;
  const includeHeights = params.get('heights') !== '0';
  const activeOnly = params.get('active') === '1';
  const now = Date.now();

  const results = await Promise.all(CAP_FEEDS.map(async (feed) => {
    try {
      return await loadMessage(feed, { includeHeights }, now);
    } catch (error) {
      console.warn(`Tsunami CAP feed unavailable (${feed.center}):`, error.message);
      return null;
    }
  }));

  const messages = results.filter(Boolean)
    .filter((message) => !activeOnly || message.active)
    // Warnings first, then advisory/watch, then information statements.
    .sort((a, b) => (isThreatCategory(b.category) ? 1 : 0) - (isThreatCategory(a.category) ? 1 : 0) ||
      (b.issuedMs || 0) - (a.issuedMs || 0));

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!results.some(Boolean)) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'NOAA tsunami feeds unreachable', count: 0, activeCount: 0, messages: [] }));
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=60'); // messages are re-issued hourly during an event
  res.statusCode = 200;
  res.end(JSON.stringify({
    source: CAP_FEEDS.map((feed) => feed.url),
    updated: new Date().toISOString(),
    activeCount: messages.filter((message) => message.active).length,
    count: messages.length,
    messages
  }));
};

// Internal helpers (for tests / debugging): CAP + wave-height parsing.
module.exports._internal = {
  parseCapMessage,
  parseWaveHeights,
  parseHeightRows,
  sliceSection,
  categoryFromEvent,
  isThreatCategory,
  parseLatLon,
  toMetres,
  CAP_FEEDS
};