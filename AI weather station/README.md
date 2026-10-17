# AI Weather Station — PWA with push alert notifications

A live weather station (deployed on Vercel) that shows current conditions, a
3‑day forecast, and a minute-by-minute "next 3 hours" nowcast — for **any
location on Earth**.

New in this build:

- 🔭 **A globe you can actually zoom into** — the planet now opens to **50×** instead of
  10× (wheel, + / − buttons and tap-to-fly all obey the new ceiling) and stays **razor
  sharp** the whole way. The Blue Marble image behind the globe holds 4096×2048 pixels =
  11.4 texels per degree, which runs out around 2×. Past that the app fetches the *same*
  imagery in the *same* projection from **NASA GIBS** (EPSG:4326
  `BlueMarble_ShadedRelief_Bathymetry`, 500 m, CORS-enabled) and composites a patch over
  the base texture: level 4 (18° tiles) → 28.4 texels/°, level 5 → 56.9, level 6 → 113.8
  and level 7 (2.25° tiles) → **227.6 texels/°** — the deepest that layer serves (level 8
  answers HTTP 400). The level is chosen from the pixels the eye really gets, the patch is
  fetched only once the camera has settled, decoded tiles are cached (40) and a failed
  fetch backs off for 60 s, so offline the base texture simply keeps painting. Measured in
  headless Chrome: 25 ms per frame at 50× with a live level-7 patch.
- 🔥 **Active forest fires on the globe** — NASA EONET's open wildfire incidents are
  normalized by the new `/api/fires` serverless endpoint and drawn as clickable,
  animated flames at their latest reported positions (newest 100 on the globe;
  up to 250 retained in the feed). The **Forest fires** chip is
  a real on/off control, and its flame becomes a glowing orange when one or more
  active incidents are loaded. The expandable fire panel includes location notes,
  acreage when EONET supplies it, report age and a source link.
- 🛰️ **Reliable local-weather controls** — the “Local weather · seen from above”
  layer switches, forecast slider/play button and + / − / reset controls now all
  drive the active MapLibre map directly. Weather icons now honour their matching
  layer switches, ordinary 30-second weather refreshes no longer throw away the selected
  zoom, controls expose their pressed/disabled state to keyboard and assistive-technology
  users, and the ⏩ 3-hour forecast preview starts by itself the moment the first forecast
  series is on screen — a one-off per page load, so a 30-second weather refresh can never
  restart it after you paused it, and ▶ / ⏸ stays in control.

- 🌦️ **Honest drizzle on the bird's-eye radar** — trace precipitation (WMO drizzle
  codes 51–57, or 0 < mm < 0.3) now gets its own **faint drizzle class**: a small
  pale-blue haze blob with no white shower rim and no animated rain streaks,
  instead of the full vivid rain blob. So the sun can shine while the map shows
  drizzle without it looking like a downpour; real rain (≥ 0.3 mm or codes
  61+/80+) is unchanged and the 🌧️ RainViewer radar layer is untouched. The
  backend `classifyLocalCell` returns the same `drizzle` type (plus `fog`, now
  matching the front end), so the live "now" frame and the +15 min…+3 h frames
  agree. Verified by `_verify_drizzle.js`.
- ⏩ **3-hour prediction radar (with ▶ play button)** — the bird's-eye screen is
  now a **forecast movie**: every grid cell carries a 13 × 15-minute series
  (condition, precipitation, snow, clouds, temperature) from Open-Meteo, and a
  scrubber under the radar lets you slide from **now → +3 hours** in 15-minute
  steps. Press ▶ and the clouds drift and dissolve in front of you; a
  "⏩ +45 min · 15:15" badge shows exactly which moment you're looking at, the
  hover tooltip reads the *future* cell, and clicking a segment of the
  next-3-hours sky strip jumps the radar straight to that moment.
- 🗺️ **OpenTopoMap terrain basemap** — the bird's-eye radar now sits on **real
  topographic tiles** (OpenTopoMap: elevation shading, contours, forests and
  water — a proper *view from above*), projected through the *same* lat/lon →
  pixel mapping as the grid, so clouds stay pinned to the terrain (a 🗺️
  **Terrain** button switches back to dark street tiles, which are also the
  automatic fallback when OpenTopoMap is unreachable; offline it falls back to
  the procedural radar background).
- ☁️ **Real clouds + layer toggles** — a new button row above the radar lets you
  show/hide **🗺️ Terrain, ☁️ Clouds, 🌧️ Rain, 🌨️ Snow, 🧊 Hail and 💨 Wind**.
  The Clouds layer draws **real satellite infrared cloud imagery** from the
  RainViewer API (keyless) whenever it has a current pass, plus the forecast
  cloud deck from Open-Meteo — land/ocean stay transparent, only the cold cloud
  tops show through.
- 💨 **Wind layer** — every grid cell now carries wind speed + direction (current
  **and** the full 3-hour 15-minute series). The radar draws **wind arrows**
  pointing where the wind blows, coloured by **Beaufort force** (pale blue →
  cyan → amber → orange → red), with a soft glow and an exact **km/h label** on
  "windy" cells (Beaufort 5+, ≥ 29 km/h — the same threshold the push alerts
  use). The hover tooltip shows the wind for any cell, on past and future frames.
- 🌧️ **Live rain radar overlay** — the bird's-eye screen also shows **real,
  measured precipitation** from RainViewer's free, keyless radar tiles, drawn
  as a layer *between* the basemap and the forecast cloud deck so the actual
  rain shows through under the forecast blobs. On the "Now" frame it displays
  the latest radar measurement; on future frames it uses RainViewer's nowcast
  tiles when available. Tiles are semi-transparent (no-rain areas are clear),
  re-fetched every 5 minutes, and need **no API key** at all
  (https://www.rainviewer.com/api.html).
- 🏷️ **City & village names on the radar** — the bird's-eye screen now shows
  real place labels (e.g. Vlaardingen, Schiedam, Maassluis) at their true geo
  position, with a dot + readable pill that never overlaps a neighbour, and the
  weather field is painted **sharper** (tighter gradient fall-off + bright rims
  around showers) so the map reads clearly instead of looking like one blurry
  wash. Place names come from Wikipedia geosearch and are cached server-side
  per ~10 km area, so they cost nothing on refresh.
- 🛰️ **Local weather — seen from above** — a radar-style screen **just below the
  **Update location** button** showing your area viewed from above (bird's-eye):
  a 5×5 grid of live forecast points paints the sky around your location with
  clearly distinct types — a **grey-white cloud deck** (with organic, jittered
  edges instead of a dot grid), **blue rain cores**, **icy-white snow** and
  **purple hail** — each one scaled by intensity with animated falling
  particles. Together with the **min & max temperature** for the next 3 hours
  and the **forecast time window** (e.g. `now 18:15 → 21:00`). Hover / tap a
  cell to read its condition, temperature, rain and cloud cover. Under the
  radar screen sits the **next-3-hours forecast strip**: one coloured segment
  per 15-minute slot (clear → clouds → rain/snow/hail) with a caption that
  tells the whole 3-hour story (e.g. `🌧️ Rain first at 19:45 · in 40 min ·
  ☁️ 60% → 90% by 22:00`), plus the original **red arrival streak** — a red
  **"now"** needle grows to a blinking red dot at the exact moment
  precipitation reaches you. Powered by the `localMap` + `nowcast` fields in
  `/api/weather` (25 lightweight Open-Meteo `current` snapshots, cached 10
  minutes server-side).
- 🌍 **Temperatures on the globe + weather icons** — every weather marker on the
  rotating globe now carries its own **temperature badge (°C)** next to the
  weather icon; the **“You are here”** marker shows your **live** temperature
  from Open-Meteo.
- 🌀 **Live hurricanes #1–10** — active NOAA NHC storms are shown as a numbered
  leaderboard (strongest first) with **name, Saffir‑Simpson category
  (1–5) and wind speed** (km/h + knots), and **each storm is marked directly
  on the globe** at its real position with its **name + wind speed** (click it
  to zoom in). The list refreshes **every 20 seconds**, so wind-updates reach
  you much faster than the old one-shot fetch.
- 🔄 **The globe never stops spinning** — auto-rotation continues in the
  correct (west→east) direction **the whole way while zooming in, until the
  2.2× magnification is reached** (and while holding at 2.2×) — on first
  load, after a fly-to, or after drag-release while zoomed in. It only stops
  above 2.2×.
- 🔕 **One button for alerts on/off** — tapping **🔔 Enable weather alerts**
  again (while alerts are on) now **turns notifications off** and unsubscribes
  the device from push, instead of only sending a test notification.
- 🔔 **Weather alert push notifications** — every user gets a notification when
  **rain, hail, snow, or wind **above Beaufort 4** (> 28 km/h) is expected at
  *their own location*, wherever they are on Earth.
- 📲 **Download / Install app button** — the site is now a fully installable
  PWA (web app manifest + service worker + app icons). Tap **📲 Install app**
  to install it on your phone's home screen (iOS: tap **Share → Add to Home
  Screen**). There is **no APK file** — it installs straight from the browser,
  so **Google Play Protect has nothing to download to scan or block** (see the
  in-app install note for Android/Chrome steps).
- 🌀 **Storm names** — a reference panel with the official **2026 WMO
  hurricane name lists** (Atlantic + East Pacific), plus **live active-storm
  names, classification and wind speed** from the NOAA National Hurricane
  Center (fetched via `/api/nhc`). Active storms are highlighted in the lists.
- 📱 **Responsive layout** — the display auto-adjusts between phones
  (safe-area aware, portrait + small screens) and large screens (wider
  container ≥ 900 px), including a short-height landscape mode.
- ⚠️ In-page **alert banner** that lights up whenever the 3‑hour nowcast sees
  rain, hail, snow, or wind > Beaufort 4, plus a **Snow** badge in the nowcast.

---

## Weather data providers

- **WeatherAPI.com (optional primary)** — set `WEATHERAPI_KEY` (free plan:
  100,000 calls/month, 3-day forecast, no credit card; key from the dashboard
  at weatherapi.com). `api/weather.js` translates its condition codes into the
  WMO codes used by the alert logic and rebuilds the 3-hour nowcast from its
  hourly steps (each hour split into four 15-minute slots), so the frontend,
  alerts and push notifications work exactly as before.
- **Open-Meteo (built-in fallback)** — keyless, 10,000 calls/day. Used
  automatically when `WEATHERAPI_KEY` is unset or a WeatherAPI call fails.
- **Keyless helpers used in both modes**: BigDataCloud + Nominatim (reverse
  geocoding), the Open-Meteo 5×5 minutely-15 local radar (`localMap`),
  Wikipedia geosearch (nearby place names), and RainViewer's free radar tiles
  (live precipitation overlay on the bird's-eye screen).

> WeatherAPI.com's free plan asks for a link back — the page footer shows
> "Powered by WeatherAPI.com".

## How the alerts work

1. The page refreshes the forecast every 30 seconds. `api/weather.js` computes an
   `alerts` list + `summary` flags (`hasRain`, `hasHail`, `hasSnow`,
   `strongWindAbove4`, `trigger`) from the 12 × 15‑minute nowcast slots.
2. **While the app is open** (any plan): the page shows the alert banner and,
   if you enabled alerts, fires a native notification instantly — no server
   round-trip needed. The **same 🔔 button** that turned alerts on will turn
   them **off** again (it unsubscribes the device from push).
3. **While the app is closed**: a scheduled Vercel Cron calls
   `/api/push?action=notify`, which evaluates the forecast at every subscribed
   user's saved coordinates and sends a Web Push via `web-push` (VAPID).

> Note: the free (Hobby) Vercel plan limits Cron to **one run per day**, so
> push messages for closed apps are a daily catch-up. Open the app to get
> near-real-time alerts. Upgrade to Pro (or attach the Hobby‑friendly hourly
> schedule) for more frequent server-side checks.

## Thresholds (single source of truth in `api/weather.js`)

- **Rain**: any 15‑min slot with precipitation > 0 mm **or** precip. probability ≥ 60 %
- **Hail**: WMO weather codes 96 / 99 (hail-bearing thunderstorms)
- **Snow**: WMO weather codes 71, 73, 75, 77, 85, 86 (snow/sleet/snow-showers)
- **Wind above Beaufort 4**: any slot with wind speed **≥ 29 km/h** (Beaufort 4
  tops out at 28 km/h; Beaufort 5 starts at 29 km/h)

## Run locally

```bash
npm install        # installs web-push (used by /api/push)
npm start          # or: node server-local.js  → http://localhost:3000
npm test           # runs the alert-logic unit tests
```

## Deploy to Vercel

```bash
vercel --prod --yes
```

### Environment variables (recommended for production push)

| Variable            | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `WEATHERAPI_KEY`    | Optional — WeatherAPI.com key (free: 100k calls/month). When set it becomes the primary weather provider; Open-Meteo remains the automatic fallback |
| `VAPID_PUBLIC_KEY`  | Web Push VAPID public key (generate: `node scripts/generate-vapid.js`) |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key                                         |
| `VAPID_SUBJECT`     | e.g. `mailto:you@example.com` (required by push services)          |
| `PUSH_NOTIFY_SECRET`| Optional secret for the `/api/push?action=notify` cron call        |
| `KV_REST_API_URL`   | Optional — persist subscriptions across cold starts (Vercel KV)    |
| `KV_REST_API_TOKEN` | Optional — Vercel KV token (used with the URL above)               |

If `VAPID_*` are unset, development fallback keys are used (fine for testing).

## Files added / changed

- `api/push.js` — new serverless endpoint: register / refresh / unregister /
  list / test / notify + VAPID Web Push sending
- `api/weather.js` — added snow detection, "above Beaufort 4" wind alerts, an
  `alerts` array + `summary.trigger`, `checkAlertsForCoords()` for the push
  service, the 🛰️ `localMap` 5×5 top-down grid (`buildLocalMap`) behind the
  "seen from above" screen, and wind data on every grid cell: current
  `wind_speed` / `wind_direction` / `beaufort` + the parallel `series.wind` /
  `series.windDir` arrays for all 13 forecast frames
- `api/fires.js` — new serverless endpoint: same-origin NASA EONET wildfire proxy
  returning normalized active fire locations, report times, acreage and source links
- `api/nhc.js` — new serverless endpoint: same-origin proxy for NOAA NHC
  `CurrentStorms.json` returning normalized active storm names (name, classification,
  intensity, coords, last update) — no CORS hack needed by the browser
- `sw.js` — service worker: push display, notification click, offline cache
- `manifest.json` + `icons/` — installable PWA (icons generated by
  `scripts/make-icons.js`, no image dependencies)
- `index.html` — install button, alerts button + status, alert banner, Snow
  badge, PWA meta tags, push-subscription flow, client-side alert evaluation,
  storm-names panel (2026 WMO lists + live active storms via `/api/nhc`),
  Google Play Protect‑safe install note, responsive phone/screen layout,
  OpenTopoMap terrain basemap + 🗺️ Terrain / ☁️ Clouds / 🌧️ Rain / 🌨️ Snow /
  🧊 Hail / 💨 Wind layer toggles, real satellite cloud veil, and the wind-arrow
  radar layer (Beaufort-coloured, km/h labels on windy cells)
- `server-local.js` — local dev server mirroring the Vercel endpoints
- `scripts/` — VAPID key generator, PNG icon generator, inline-JS syntax check
- `tests/` — `alertLogic.test.js` (unit + live API tests) and `smoke-local.js`
- `vercel.json` — added the alert-check Cron and cache headers
- `package.json` — added the `web-push` dependency + dev scripts
