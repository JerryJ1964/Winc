
        const weatherInfo = document.getElementById('weather-info');
        const updated = document.getElementById('updated');
        const manualBtn = document.getElementById('manual-update');
        const locationInput = document.getElementById('location-input');
        const locationNoteEl = document.getElementById('location-note');
        const installBtn = document.getElementById('install-btn');
        const alertsBtn = document.getElementById('alerts-btn');
        const alertsStatusEl = document.getElementById('alerts-status');
        const alertBannerEl = document.getElementById('alert-banner');
        const iosHintEl = document.getElementById('ios-hint');
        const installNoteEl = document.getElementById('install-note');
        const localMapCanvas = document.getElementById('localmap-canvas');
        const localMapLoading = document.getElementById('localmap-loading');
        const localMapLocation = document.getElementById('localmap-location');
        const localMapTime = document.getElementById('localmap-time');
        const localMapTemps = document.getElementById('localmap-temps');
        const localMapCellInfo = document.getElementById('localmap-cellinfo');
        const localMapTl = document.getElementById('localmap-timeline');
        const localMapTlBar = document.getElementById('localmap-tl-bar');
        const localMapTlTicks = document.getElementById('localmap-tl-ticks');
        const localMapTlStreak = document.getElementById('localmap-tl-streak');
        const localMapTlNow = document.getElementById('localmap-tl-now');
        const localMapTlArrival = document.getElementById('localmap-tl-arrival');
        const localMapTlScale = document.getElementById('localmap-tl-scale');
        const localMapTlCaption = document.getElementById('localmap-tl-caption');
        const localMapTlSummary = document.getElementById('localmap-tl-summary');
        const localMapTlPrecip = document.getElementById('localmap-tl-precip');
        const localMapTlForecast = document.getElementById('localmap-tl-forecast');
        const localMapPlayBtn = document.getElementById('localmap-play');
        const localMapFrameSlider = document.getElementById('localmap-frame');
        const localMapFrameTimeEl = document.getElementById('localmap-frame-time');
        const localMapZoomInBtn = document.getElementById('localmap-zoom-in');
        const localMapZoomOutBtn = document.getElementById('localmap-zoom-out');
        const localMapZoomResetBtn = document.getElementById('localmap-zoom-reset');
        let localMapHoverCells = [];    // projected cell positions for the hover tooltip
        let activeLocation = '';
        let latestWeatherData = null;
        let selectedDayIndex = 0;
        let lastFetchedLocation = null;

        // ===== 🌍 Earth globe ("You are here") =====
        const globeCanvas = document.getElementById('globe-canvas');
        const globeCtx = globeCanvas ? globeCanvas.getContext('2d', { alpha: true }) : null;
        const globeNameEl = document.getElementById('globe-name');
        const globeStatusEl = document.getElementById('globe-status');
        const gpsBtnEl = document.getElementById('gps-btn');
        const globeWeatherIconEl = document.getElementById('globe-weather-icon');
        const globeWeatherTempEl = document.getElementById('globe-weather-temp');
        const globeWeatherCondEl = document.getElementById('globe-weather-cond');
        const globeWeatherEffectsEl = document.getElementById('globe-weather-effects');

        let earthTexCanvas = null;
        let earthTexData = null;
        const EARTH_TEX_W = 1024;
        const EARTH_TEX_H = 512;
        let globeMarkerLat = 51.9192;
        let globeMarkerLng = 4.3599;
        let youWeather = null;        // live weather marker (clouds / rain / sun) for the typed location
        let focusGlobeOnFetch = true; // auto-zoom the globe to a newly chosen location (true on first load)
        let globeRotY = 20;        // degrees — texture offset (which longitude faces you)
        let globeTiltX = 0;        // degrees — up/down tilt
        let globeRotYTarget = 20;  // animated fly-to target for smooth rotation
        let globeTiltXTarget = 0;  // animated fly-to target for tilt
        let globeRotAnimating = false; // true while the globe eases toward a fly-to target
        let globeDragging = false;
        let globeAutoRotate = true;
        let lastGlobeDraw = 0;
        let lastDragPoint = null;
        let gpsCoords = null;

        // ===== 🌩️ Weather effects at the "you" location (rain, fog, thunder, lightning) =====
        let youEffects = { rain: true, fog: true, thunder: true, lightning: true, snow: true, hurricane: true };
        let lightningBolt = null;   // stable lightning bolt while it fades
        let lastLightningTime = 0;

        // ===== 🌦️ Weather map: where clouds, thunder, rain and sun actually happen =====
        // Representative air temperatures (°C) let the globe show degrees next to
        // the weather icons — the "You" marker uses the live Open-Meteo reading.
        const WEATHER_MARKERS = [
            // Thunder / lightning hotspots
            { type: 'thunder', lat: 11.4, lng: -70.8, label: 'Lake Maracaibo', temp: 27 },   // max lightning on Earth
            { type: 'thunder', lat: 27.1, lng: -82.0, label: 'Florida', temp: 28 },
            { type: 'thunder', lat: 13.0, lng: 23.0, label: 'Congo Basin', temp: 25 },
            { type: 'thunder', lat: 0.0, lng: -14.0, label: 'Lake Victoria', temp: 22 },
            { type: 'thunder', lat: -4.0, lng: -63.0, label: 'Amazon', temp: 27 },
            { type: 'thunder', lat: 23.2, lng: 90.4, label: 'Bengal', temp: 29 },
            { type: 'thunder', lat: 4.0, lng: -72.0, label: 'Colombia', temp: 24 },
            { type: 'thunder', lat: 5.0, lng: 101.0, label: 'Indonesia', temp: 27 },
            { type: 'thunder', lat: -12.0, lng: -59.0, label: 'Argentina', temp: 23 },
            // Rain: persistently wet regions
            { type: 'rain', lat: 55.0, lng: -4.0, label: 'Scotland', temp: 9 },
            { type: 'rain', lat: 47.6, lng: -122.0, label: 'Seattle', temp: 11 },
            { type: 'rain', lat: 62.0, lng: 7.0, label: 'Norway coast', temp: 8 },
            { type: 'rain', lat: -0.6, lng: -63.0, label: 'Amazon basin', temp: 26 },
            { type: 'rain', lat: 2.0, lng: 101.0, label: 'Indonesia', temp: 27 },
            { type: 'rain', lat: 10.2, lng: 78.0, label: 'India monsoon', temp: 27 },
            { type: 'rain', lat: -40.0, lng: 174.0, label: 'New Zealand West', temp: 12 },
            { type: 'rain', lat: 5.0, lng: -79.0, label: 'Colombia coast', temp: 26 },
            { type: 'rain', lat: 49.0, lng: -126.0, label: 'BC Coast', temp: 10 },
            // Clouds / overcast
            { type: 'clouds', lat: 49.0, lng: -123.0, label: 'Pacific NW', temp: 11 },
            { type: 'clouds', lat: 51.0, lng: -2.0, label: 'Wales', temp: 10 },
            { type: 'clouds', lat: 64.0, lng: -9.0, label: 'Iceland', temp: 6 },
            { type: 'clouds', lat: -40.0, lng: 174.0, label: 'New Zealand', temp: 12 },
            { type: 'clouds', lat: 60.0, lng: 12.0, label: 'Sweden', temp: 5 },
            { type: 'clouds', lat: 38.0, lng: -84.0, label: 'Ohio', temp: 12 },
            { type: 'clouds', lat: 55.0, lng: -2.0, label: 'North Sea', temp: 9 },
            // Sun / clear skies
            { type: 'sun', lat: 23.0, lng: 10.0, label: 'Sahara', temp: 34 },
            { type: 'sun', lat: 25.0, lng: 46.0, label: 'Arabian Desert', temp: 33 },
            { type: 'sun', lat: -25.0, lng: 134.0, label: 'Australian Outback', temp: 30 },
            { type: 'sun', lat: 34.0, lng: -118.0, label: 'California', temp: 22 },
            { type: 'sun', lat: 37.0, lng: -5.0, label: 'Andalusia', temp: 24 },
            { type: 'sun', lat: 37.0, lng: 23.0, label: 'Aegean', temp: 25 },
            { type: 'sun', lat: 28.0, lng: -80.0, label: 'Florida Keys', temp: 27 },
            { type: 'sun', lat: -31.0, lng: 115.0, label: 'Perth', temp: 20 },
            // Snow: places that regularly see heavy snowfall
            { type: 'snow', lat: 46.5, lng: 10.0, label: 'Alps', temp: -2 },
            { type: 'snow', lat: 64.5, lng: 15.5, label: 'Scandinavia', temp: -5 },
            { type: 'snow', lat: 61.0, lng: 105.0, label: 'Siberia', temp: -12 },
            { type: 'snow', lat: 53.0, lng: -117.0, label: 'Canadian Rockies', temp: -8 },
            { type: 'snow', lat: 43.5, lng: 142.5, label: 'Hokkaido', temp: -4 },
            { type: 'snow', lat: 72.0, lng: -40.0, label: 'Greenland', temp: -15 },
            { type: 'snow', lat: -82.0, lng: 30.0, label: 'Antarctica', temp: -25 },
            // Hurricane / tropical cyclone basins & storm tracks
            { type: 'hurricane', lat: 17.5, lng: -68.5, label: 'Lesser Antilles', temp: 28 },
            { type: 'hurricane', lat: 26.0, lng: -90.0, label: 'Gulf of Mexico', temp: 29 },
            { type: 'hurricane', lat: 25.0, lng: -55.0, label: 'Atlantic storm track', temp: 27 },
            { type: 'hurricane', lat: 14.0, lng: 88.0, label: 'Bay of Bengal', temp: 29 },
            { type: 'hurricane', lat: 16.0, lng: 130.0, label: 'West Pacific typhoons', temp: 29 },
            { type: 'hurricane', lat: 16.0, lng: -105.0, label: 'East Pacific', temp: 27 },
            { type: 'hurricane', lat: -17.0, lng: 124.0, label: 'NW Australia cyclones', temp: 28 },
        ];
        const WEATHER_EMOJI = { thunder: '⛈️', rain: '🌧️', clouds: '☁️', sun: '☀️', snow: '❄️', hurricane: '🌀' };
        const WEATHER_COLOR = {
            thunder: 'rgba(196, 168, 84, 0.85)',  // lightning amber
            rain: 'rgba(88, 156, 255, 0.85)',     // rain blue
            clouds: 'rgba(214, 222, 238, 0.85)',  // cloud white-grey
            sun: 'rgba(255, 199, 62, 0.85)',      // sun yellow
            snow: 'rgba(170, 220, 255, 0.85)',    // snow ice-blue
            hurricane: 'rgba(190, 150, 255, 0.9)' // hurricane storm-purple
        };

        // Zoom / camera state
        const GLOBE_AUTOROTATE_MAX_ZOOM = 2.2; // globe keeps spinning until this zoom is reached (and while holding exactly at 2.2×)
        let globeZoom = 1;          // 1× = whole planet, >1 = zoomed in
        let globeZoomTarget = 1;
        let viewDx = 0, viewDy = 0; // screen-centre offset (keeps a marker centred when zooming)
        let focusedWeather = null;  // current weather marker the camera is centred on
        let lastWeatherHits = [];   // markers projected this frame (device px), for click hit-testing
        let liveHurricanes = [];    // active NOAA NHC storms plotted on the globe (name + wind speed)

        function getStatsForDay(data, dayIndex) {
            if (dayIndex === 0) {
                return {
                    humidity: data.humidity,
                    windSpeed: data.windSpeed,
                    windDirection: data.windDirection,
                    beaufort: data.beaufort,
                    statusLabel: 'Live now'
                };
            }

            const day = data.forecast?.[dayIndex];
            if (!day) {
                return {
                    humidity: data.humidity,
                    windSpeed: data.windSpeed,
                    windDirection: data.windDirection,
                    beaufort: data.beaufort,
                    statusLabel: 'Live now'
                };
            }

            return {
                humidity: day.humidity,
                windSpeed: day.windSpeed,
                windDirection: day.windDirection,
                beaufort: day.beaufort,
                statusLabel: `Forecast · ${day.day}`
            };
        }

        function updateStatsDisplay(dayIndex) {
            if (!latestWeatherData) return;

            const stats = getStatsForDay(latestWeatherData, dayIndex);
            const humidityEl = document.getElementById('stat-humidity');
            const windSpeedEl = document.getElementById('stat-wind-speed');
            const windDirectionEl = document.getElementById('stat-wind-direction');
            const beaufortEl = document.getElementById('stat-beaufort');
            const statusPill = document.getElementById('status-pill');

            if (humidityEl) humidityEl.textContent = `${stats.humidity ?? '—'}%`;
            if (windSpeedEl) windSpeedEl.textContent = `${stats.windSpeed ?? '—'} km/h`;
            if (windDirectionEl) windDirectionEl.textContent = stats.windDirection ?? '—';
            if (beaufortEl) beaufortEl.textContent = stats.beaufort ?? '—';
            if (statusPill) statusPill.textContent = stats.statusLabel;

            document.querySelectorAll('.forecast-day').forEach((el) => {
                el.classList.toggle('selected', Number(el.dataset.dayIndex) === dayIndex);
            });
        }

        function selectForecastDay(dayIndex) {
            if (!latestWeatherData?.forecast?.[dayIndex] && dayIndex !== 0) return;
            selectedDayIndex = dayIndex;
            updateStatsDisplay(dayIndex);
        }

        function attachForecastHandlers() {
            document.querySelectorAll('.forecast-day').forEach((el) => {
                el.addEventListener('click', () => {
                    selectForecastDay(Number(el.dataset.dayIndex));
                });
            });
        }

        function getWeatherIcon(condition, weatherCode) {
            const codeIcons = {
                0: '☀️',
                1: '🌤️',
                2: '⛅',
                3: '☁️',
                45: '🌫️',
                48: '🌫️',
                51: '🌦️',
                53: '🌦️',
                55: '🌧️',
                56: '🌨️',
                57: '🌨️',
                61: '🌧️',
                63: '🌧️',
                65: '🌧️',
                66: '🌨️',
                67: '🌨️',
                71: '❄️',
                73: '❄️',
                75: '❄️',
                77: '❄️',
                80: '🌦️',
                81: '🌧️',
                82: '🌧️',
                85: '❄️',
                86: '❄️',
                95: '⛈️',
                96: '⛈️',
                99: '⛈️'
            };
            if (typeof weatherCode === 'number' && codeIcons[weatherCode]) {
                return codeIcons[weatherCode];
            }

            const normalized = (condition || '').toLowerCase();
            if (normalized.includes('clear') || normalized.includes('sunny')) return '☀️';
            if (normalized.includes('mainly clear')) return '🌤️';
            if (normalized.includes('partly')) return '⛅';
            if (normalized.includes('cloud') || normalized.includes('overcast')) return '☁️';
            if (normalized.includes('drizzle') || normalized.includes('showers')) return '🌦️';
            if (normalized.includes('rain')) return '🌧️';
            if (normalized.includes('thunder')) return '⛈️';
            if (normalized.includes('snow') || normalized.includes('sleet') || normalized.includes('hail')) return '❄️';
            if (normalized.includes('fog') || normalized.includes('mist')) return '🌫️';
            if (normalized.includes('wind') || normalized.includes('smoke')) return '💨';
            if (normalized.includes('tornado') || normalized.includes('sandstorm')) return '🌪️';
            if (normalized.includes('hurricane')) return '🌀';
            return '🌡️';
        }

        function conditionToMarkerType(condition) {
            const normalized = (condition || '').toLowerCase();
            if (normalized.includes('thunder')) return 'thunder';
            if (normalized.includes('rain') || normalized.includes('drizzle') || normalized.includes('shower')
                || normalized.includes('sleet') || normalized.includes('hail')) return 'rain';
            if (normalized.includes('cloud') || normalized.includes('overcast')
                || normalized.includes('fog') || normalized.includes('mist')) return 'clouds';
            return 'sun';
        }

        function getVisibleConditionGroup(condition) {
            const normalized = (condition || '').toLowerCase();
            if (normalized.includes('clear') || normalized.includes('sunny')) return ['Clear'];
            if (normalized.includes('cloudy') || normalized.includes('overcast')) return ['Cloudy'];
            if (normalized.includes('drizzle') || normalized.includes('showers')) return ['Showers'];
            if (normalized.includes('rain')) return ['Rain'];
            if (normalized.includes('thunder')) return ['Thunderstorm'];
            if (normalized.includes('snow')) return ['Snow'];
            if (normalized.includes('fog') || normalized.includes('mist')) return ['Fog'];
            if (normalized.includes('wind') || normalized.includes('smoke')) return ['Windy'];
            if (normalized.includes('hail') || normalized.includes('sleet')) return ['Hail'];
            if (normalized.includes('tornado') || normalized.includes('sandstorm') || normalized.includes('hurricane')) return ['Tornado'];
            return ['Other'];
        }

        function showOnlyCurrentWeatherIcon(condition) {
            const rows = document.querySelectorAll('#icon-list-table tr');
            const visibleGroup = getVisibleConditionGroup(condition);
            rows.forEach(row => {
                row.style.display = visibleGroup.includes(row.dataset.condition) ? '' : 'none';
            });
        }

        function renderForecast(forecast) {
            if (!Array.isArray(forecast) || forecast.length === 0) {
                return '<div class="forecast"><strong>Forecast:</strong> Forecast data unavailable.</div>';
            }

            const items = forecast.map((day, index) => {
                const high = day.high !== null ? `${day.high}°` : '—';
                const low = day.low !== null ? `${day.low}°` : '—';
                const dayIcon = getWeatherIcon(day.condition, day.weatherCode) || day.icon || '🌡️';
                const selectedClass = index === selectedDayIndex ? ' selected' : '';
                return `
                    <button type="button" class="forecast-day${selectedClass}" data-day-index="${index}" aria-pressed="${index === selectedDayIndex}">
                        <div class="forecast-day-name">${day.day}</div>
                        <div class="forecast-day-icon" aria-label="${day.condition}">${dayIcon}</div>
                        <div class="forecast-day-condition">${day.condition}</div>
                        <div class="forecast-day-temps">H: ${high} / L: ${low}</div>
                    </button>
                `;
            }).join('');

            return `
                <div class="forecast-3day">
                    <div class="forecast-title">3-Day Forecast</div>
                    <div class="forecast-days">${items}</div>
                    <div class="forecast-hint">Tap a day to view humidity and wind details</div>
                </div>
            `;
        }

        // ===== ⏱️ Minute-by-minute nowcast (next 3 hours) =====
        function renderBadge(active, activeClass, emoji, label) {
            return `<span class="nowcast-badge ${active ? activeClass : 'off'}">${emoji} ${label}</span>`;
        }

        function renderNowcast(nowcast) {
            if (!nowcast || !nowcast.summary || !Array.isArray(nowcast.timeline)) {
                return '';
            }
            const s = nowcast.summary;
            const timeline = nowcast.timeline;

            const precipText = `${s.totalPrecipMm ?? 0} <span style="font-size:0.72rem;font-weight:600;">mm</span>`;

            const cells = timeline.map((slot) => {
                let extra = '';
                if (slot.precipMm > 0 || slot.precipProb >= 60) extra += ' slot-rain';
                if (slot.weatherCode === 96 || slot.weatherCode === 99) extra += ' slot-hail';
                if ((slot.windKmh || 0) >= 50) extra += ' slot-wind';
                const precip = slot.precipMm > 0
                    ? `<span>💧 ${slot.precipMm}mm</span>`
                    : (slot.precipProb ? `${slot.precipProb}%` : '—');
                const uv = typeof slot.uvPct === 'number' ? `☀️ ${slot.uvPct}%` : '';
                const condShort = String(slot.condition || '').replace('Showers', 'Shwr').replace('Slight ', '').replace('Heavy ', '');
                return `
                    <div class="nowcast-slot${extra}" title="${slot.condition} · ${slot.precipMm || 0}mm · ${slot.precipProb}% · ${slot.windKmh || 0} km/h${typeof slot.uvIndex === 'number' ? ` · UV ${slot.uvIndex} · sun ${slot.uvPct}%` : ''}">
                        <div class="slot-time">${slot.label}</div>
                        <div class="slot-icon">${slot.icon}</div>
                        <div class="slot-cond">${condShort}</div>
                        <div class="slot-temp">${slot.temperature}°</div>
                        <div class="slot-prec">${precip}</div>
                        ${uv ? `<div class="slot-uv">${uv}</div>` : ''}
                    </div>`;
            }).join('');

            const windText = typeof s.maxWindKmh === 'number' ? s.maxWindKmh : 0;
            return `
                <div class="nowcast">
                    <div class="nowcast-alert">
                        <div class="nowcast-alert-title">📍 Next 3 hours · your location</div>
                        <div class="nowcast-badges">
                            ${renderBadge(s.hasRain, 'active-rain', '🌧️', 'Rain')}
                            ${renderBadge(s.hasHail, 'active-hail', '🌨️', 'Hail')}
                            ${renderBadge(s.hasSnow, 'active-snow', '❄️', 'Snow')}
                            ${renderBadge(s.hasSun, 'active-sun', '☀️', 'Sun')}
                            ${renderBadge(s.strongWind, 'active-wind', '💨', 'Strong wind')}
                        </div>
                        <div class="nowcast-precip">
                            <div class="mm">${precipText}</div>
                            <div class="lbl">precip · 3h</div>
                        </div>
                    </div>
                    <div class="nowcast-scroll">${cells.length ? cells : '<div style="padding:6px 4px;color:#5c7390;font-size:0.85rem;">Forecast loading…</div>'}</div>
                    <div class="nowcast-foot">15-min steps · peak wind <strong>${windText} km/h</strong>${nowcast.note ? ` · ${nowcast.note}` : ''}</div>
                </div>
            `;
        }

        // ===== 🛰️ Local weather screen — viewed from above (bird's-eye map) =====
        // Colour + painting style for one top-down weather cell. Returns RGB,
        // alpha plus a lighter core tint so we can layer soft radial blobs into
        // one continuous radar field: a grey-white CLOUD DECK underneath, with
        // blue RAIN / icy SNOW / purple HAIL cores clearly distinct on top.
        // Colors are VIVID and HIGH-CONTRAST so they pop against the basemap.
        function localMapCellColor(cell) {
            if (!cell) return { cloud: false, r: 22, g: 62, b: 118, a: 0, r2: 22, g2: 62, b2: 118, dot: null, heavy: 0 };
            const cc = Math.min(100, cell.cloudCover || 0);
            switch (cell.type) {
                case 'hail': {
                    const h = Math.min(1, (cell.precipitation || 0) / 4);
                    return { cloud: true, r: 180, g: 60, b: 255, a: 0.7 + 0.3 * h, r2: 230, g2: 150, b2: 255, dot: '🌨️', heavy: h };
                }
                case 'snow': {
                    const h = Math.min(1, (cell.precipitation || cell.snowfall || 0) / 2);
                    return { cloud: true, r: 200, g: 230, b: 255, a: 0.75 + 0.25 * h, r2: 255, g2: 255, b2: 255, dot: '❄️', heavy: h };
                }
                case 'rain': {
                    const p = Math.min(1, (cell.precipitation || 0) / 4);   // light → heavy blue
                    return {
                        cloud: true,
                        r: Math.round(30 + 80 * p), g: Math.round(120 + 80 * p), b: 255,
                        a: 0.65 + 0.35 * p,
                        r2: Math.round(100 + 100 * p), g2: Math.round(180 + 50 * p), b2: 255,
                        dot: '💧', heavy: p
                    };
                }
                case 'drizzle': {
                    // Trace drizzle: a small, pale-blue haze — clearly lighter
                    // than the vivid rain blob, so just drizzling under a sunny
                    // sky never reads as a downpour. heavy stays 0: the paint
                    // loop keeps the radius small and skips the white shower
                    // rim and the animated rain streaks.
                    const p = Math.min(1, (cell.precipitation || 0) / 0.3);
                    return {
                        cloud: true,
                        r: 130, g: 170, b: 235,
                        a: 0.3 + 0.15 * p,
                        r2: 175, g2: 205, b2: 250,
                        dot: '🌦️', heavy: 0
                    };
                }
                case 'fog': {
                    // Low-lying haze: wide, flat, low-contrast — quite different
                    // from the puffy cloud deck. Fades softly into the landscape beneath.
                    const a = Math.max(0.22, Math.min(0.5, 0.26 + cc / 100 * 0.22));
                    return { cloud: true,r:196,g:203,b:214,a,r2:212,g2:218,b2:226,dot:'🌫️',heavy:0 };
                }
                case 'clouds': {
                    const a = Math.max(0.25, Math.min(0.7, 0.3 + cc / 100 * 0.4));
                    return { cloud: true, r: 180, g: 195, b: 215, a, r2: 220, g2: 230, b2: 245, dot: '☁️', heavy: 0 };
                }
                default: // clear sky → nothing to paint
                    return { cloud: false, r: 22, g: 62, b: 118, a: 0, r2: 22, g2: 62, b2: 118, dot: null, heavy: 0 };
            }
        }

        function drawLocalMapGrid(ctx, cx, cy, kmPerPx) {
            // Range rings — the look of a real straight-down radar: every ring
            // is a TRUE distance from "you are here" (5 / 10 / 15 … km), which
            // is only possible because the map now shares one scale on both
            // axes instead of stretching lat/lon to fit the window.
            if (kmPerPx > 0) {
                const maxRingPx = Math.min(cx, cy) - 12;
                ctx.font = '600 8.5px system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                for (const km of [5, 10, 15, 20, 25, 30, 40, 50]) {
                    const r = km / kmPerPx;
                    if (r > maxRingPx) break;
                    ctx.strokeStyle = 'rgba(140, 200, 255, 0.14)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(140, 200, 255, 0.5)';
                    ctx.fillText(`${km} km`, cx + r + 3, cy - 6);
                }
            }
            
            // Center cross-hair — subtle
            ctx.strokeStyle = 'rgba(140, 200, 255, 0.18)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
            ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Center dot — "you are here" location pin
            ctx.fillStyle = 'rgba(255, 80, 80, 0.95)';
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // ===== ⏩ 3-hour prediction: every radar cell carries a 13 × 15-minute
        // forecast series (0…180 min). localMapFrame selects the frame being
        // shown: 0 = live "now", 1…12 = +15 min … +3 hours ahead.
        const LOCALMAP_FRAME_MAX = 12;
        let localMapFrame = 0;
        let latestLocalMapFrameTimes = null;   // epoch ms per frame (clock times)
        let localMapPlayTimer = 0;
        let localMapRedrawPending = false;
        let localMapAutoPlayed = false;   // ▶ auto-starts once the first forecast data has rendered

        // ===== 🗺️ Radar layer toggles: which overlays the top-down screen shows.
        // 'topo' = OpenTopoMap terrain basemap (great view from above, shows the
        // elevation), 'osm' = street map. Preferences are remembered locally.
        const LOCALMAP_LAYER_DEFAULTS = { topo: true, clouds: true, fog: true, rain: true, snow: true, hail: true, wind: true };
        let localMapLayers = { ...LOCALMAP_LAYER_DEFAULTS };
        try {
            const savedLayers = JSON.parse(localStorage.getItem('localmap-layers') || 'null');
            if (savedLayers && typeof savedLayers === 'object') localMapLayers = { ...LOCALMAP_LAYER_DEFAULTS, ...savedLayers };
            // Bright & colourful is the default: the map is easy to read, streets
            // and parks stay crisp, and the weather cells sit beautifully on top.
            // The dark night-radar style stays one tap away (🌙 Dark).
            localMapLayers.topo = true;
            try { localStorage.setItem('localmap-layers', JSON.stringify(localMapLayers)); } catch (err2) { /* private mode */ }
            try { localStorage.setItem('localmap-vector-migrated', '2'); } catch (err3) { /* private mode */ }
        } catch (err) { /* fresh defaults on first visit */ }
        let localMapBasemap = localMapLayers.topo ? 'topo' : 'osm';   // 'topo' (colourful vector) or 'osm' (dark vector)

        // Same classification the backend uses (api/weather.js classifyLocalCell)
        // so a future frame reads exactly like the live view does. Trace amounts
        // (drizzle codes 51–57, or 0 < mm < 0.3) get their own faint drizzle
        // class so a sun shower never paints like a downpour.
        const LOCALMAP_RAIN_MIN_MM = 0.3;
        function localMapClassify(code, precipitation, snowfall, cloudCover) {
            if (code === 96 || code === 99) return 'hail';
            if ((code >= 71 && code <= 77) || code === 85 || code === 86 || snowfall > 0) return 'snow';
            if (precipitation >= LOCALMAP_RAIN_MIN_MM) return 'rain';
            if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
            if ((code >= 51 && code <= 57) || precipitation > 0) return 'drizzle';
            if (code === 45 || code === 48) return 'fog';
            if (cloudCover >= 40) return 'clouds';
            return 'clear';
        }

        // Icon map: the weather condition → emoji painted on the map cells.
        // The user-facing icon set — clouds determine the icon shown:
        //   ☀️ Sunny · ⛅ Partly Cloudy · ☁️ Cloudy · 🌧️ Rain · 🌦️ Showers/Drizzle
        //   ⛈️ Thunderstorm · ❄️ Snow · 🌫️ Fog · 💨 Windy · 🧊 Hail
        //   🌪️ Tornado · 🌀 Hurricane · 🌡️ Other
        const LOCALMAP_CODE_INFO = {
            0: ['Clear', '☀️'], 1: ['Mostly Clear', '☀️'], 2: ['Partly Cloudy', '⛅'], 3: ['Overcast', '☁️'],
            45: ['Fog', '🌫️'], 48: ['Rime Fog', '🌫️'],
            51: ['Light Drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy Drizzle', '🌦️'],
            61: ['Light Rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy Rain', '🌧️'],
            66: ['Freezing Rain', '🌧️'], 67: ['Freezing Rain', '🌧️'],
            71: ['Light Snow', '❄️'], 73: ['Snow', '❄️'], 75: ['Heavy Snow', '❄️'], 77: ['Snow Grains', '❄️'],
            80: ['Light Showers', '🌦️'], 81: ['Showers', '🌦️'], 82: ['Violent Showers', '⛈️'],
            85: ['Snow Showers', '❄️'], 86: ['Snow Showers', '❄️'],
            95: ['Thunderstorm', '⛈️'], 96: ['Hail Storm', '🧊'], 99: ['Hail Storm', '🧊']
        };
        // Fallback icon for any unmapped code
        const LOCALMAP_ICON_OTHER = '🌡️';

        // The version of a grid cell at 15-minute frame idx: the live snapshot for
        // idx 0, otherwise the cell's own minutely_15 series value for that slot.
        function localMapFrameCell(cell, idx) {
            const s = cell && cell.series;
            if (!idx || !s || !Array.isArray(s.codes) || !s.codes.length) return cell;
            const i = Math.min(idx, s.codes.length - 1);
            const code = s.codes[i] != null ? s.codes[i] : cell.weatherCode || 0;
            const precipitation = s.precip && s.precip[i] != null ? s.precip[i] : cell.precipitation || 0;
            const snowfall = s.snow && s.snow[i] != null ? s.snow[i] : cell.snowfall || 0;
            const cloudCover = s.cloud && s.cloud[i] != null ? s.cloud[i] : cell.cloudCover || 0;
            const windSpeed = s.wind && s.wind[i] != null ? s.wind[i] : cell.wind_speed || 0;
            const windDirection = s.windDir && s.windDir[i] != null ? s.windDir[i] : cell.wind_direction || 0;
            const info = LOCALMAP_CODE_INFO[code] || ['Other', LOCALMAP_ICON_OTHER];
            return {
                lat: cell.lat, lon: cell.lon,
                type: localMapClassify(code, precipitation, snowfall, cloudCover),
                condition: info[0], icon: info[1], weatherCode: code,
                temp: s.temps && s.temps[i] != null ? s.temps[i] : cell.temp,
                precipitation, snowfall, cloudCover,
                wind_speed: windSpeed, wind_direction: windDirection
            };
        }

        // ===== 🗺️ Real-map background behind the weather field. Both basemaps
        // are CARTO Voyager NO-LABELS tiles: the same countryside / street map
        // with every baked-in place name and white village dot removed, so the
        // black names and white spots no longer appear on the "view from above".
        // The app draws its OWN labels (drawLocalMapPlaceLabels) — dark pills
        // with light text at the true geo position — and those remain the only
        // text on the map. tile.openstreetmap.org is deliberately NOT used:
        // it rate-limits embedded apps and answers with a blank 256×256
        // "blocked" placeholder that silently erased the whole map.
        // Tiles are fetched once per view, cached in memory, and drawn through
        // the SAME lat/lon → pixel mapping as the weather grid, so clouds stay
        // pinned to real places.
        // Attribution: © OpenStreetMap contributors · © CARTO
        const localMapTiles = new Map();      // 'source/z/x/y' -> { img, ok, done }

        function localMapScheduleRedraw() {
            if (localMapRedrawPending) return;
            localMapRedrawPending = true;
            requestAnimationFrame(() => {
                localMapRedrawPending = false;
                if (latestLocalMapData && latestLocalMapData.localMap && Array.isArray(latestLocalMapData.localMap.cells) && latestLocalMapData.localMap.cells.length) {
                    drawLocalMap(latestLocalMapData, performance.now() / 1000);
                }
            });
        }

        function localMapGetTile(z, x, y) {
            const source = localMapBasemap === 'topo' ? 'topo' : 'osm';
            const key = `${source}/${z}/${x}/${y}`;
            let entry = localMapTiles.get(key);
            if (entry) return entry;
            if (localMapTiles.size > 120) {
                const it = localMapTiles.keys();
                for (let i = 0; i < 40; i += 1) {
                    const k = it.next().value;
                    if (k !== undefined) localMapTiles.delete(k);
                }
            }
            const img = new Image();
            entry = { img, ok: false, done: false };
            img.crossOrigin = 'anonymous';
            const sub = 'abc'[(x + y + z) % 3];
            // CARTO's Voyager NO-LABELS tiles ONLY — voyager_nolabels is the
            // same street map minus every baked-in place name and white village
            // dot, so the map's own labels stay the ONLY text on the radar.
            // OpenTopoMap and labeled voyager are deliberately NOT in the queue:
            // they paint black city/village names + white spots into the tile
            // images themselves. tile.openstreetmap.org is also NOT in the queue —
            // it rate-limits apps and answers with a blank 256×256 "blocked"
            // placeholder (verified live: HTTP 200 + x-blocked header), which
            // passed the size check and silently blanked the map. CARTO serves
            // real tiles with CORS and no blocking (verified 200/256×256/ACAO:*).
            const queue = source === 'topo'
                ? [`https://${sub}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${z}/${x}/${y}.png`]
                : [`https://${sub}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${z}/${x}/${y}.png`];
            const tryNext = () => {
                if (!queue.length) {
                    entry.done = true;
                    entry.ok = false;
                    localMapScheduleRedraw();
                    return;
                }
                img.src = queue.shift();
            };
            img.onload = () => {
                entry.done = true;
                // Accept the tile ONLY if it's exactly 256x256 — real map tiles are
                // always 256x256; error placeholders from any server (ArcGIS, OSM
                // "zoom level not supported", etc.) are a different size and are
                // rejected here so they never appear on the radar.
                entry.ok = img.naturalWidth === 256 && img.naturalHeight === 256;
                if (!entry.ok && queue.length) {
                    tryNext();   // topo tile was an error placeholder → try CARTO
                    return;
                }
                localMapScheduleRedraw();
            };
            img.onerror = () => {
                if (queue.length) tryNext();   // network hiccup → try the next source
                else { entry.done = true; entry.ok = false; localMapScheduleRedraw(); }
            };
            // Never wait forever: if no source answers within 12 s (offline, or a
            // server hanging), give up on this tile so the map falls back to the
            // procedural background instead of hanging as a blank panel.
            entry.timer = setTimeout(() => {
                if (entry.done || entry.ok) return;
                if (queue.length) tryNext();
                else { entry.done = true; entry.ok = false; localMapScheduleRedraw(); }
            }, 12000);
            tryNext();
            localMapTiles.set(key, entry);
            return entry;
        }

        const tileLon = (x, z) => (x / Math.pow(2, z)) * 360 - 180;
        const tileLat = (y, z) => {
            const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
            return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        };
        const tileYFrac = (lat, z) => {
            const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
            return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z);
        };

        // ===== 🧭 Straight-down (nadir) projection helpers =====
        // Web Mercator world units — the exact space the OpenTopoMap / OSM /
        // RainViewer tiles live in. worldXof/worldYof map lon/lat → [0..1]
        // across the whole world; latAtWorld inverts worldY back to latitude.
        // Mercator is conformal, so one shared pixels-per-world-unit scale
        // keeps 1 km east = 1 km north on screen — a true view from above.
        const worldXof = (lon) => (lon + 180) / 360;
        const worldYof = (lat) => {
            const clamped = Math.max(-85.0, Math.min(85.0, lat));
            const r = (clamped * Math.PI) / 180;
            return 0.5 - Math.log(Math.tan(Math.PI / 4 + r / 2)) / (2 * Math.PI);
        };
        const latAtWorld = (wy) => (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - 2 * Math.PI * wy));

        function drawLocalMapTiles(ctx, proj) {
            const { PAD, mapW, mapH, k, worldX0, worldY0, gridX0, gridY0 } = proj;
            // Straight-down view: cover the ENTIRE canvas with Mercator tiles
            // using the one shared pixels-per-world-unit scale (k).
            const lonMin = (worldX0 - PAD / k) * 360 - 180;
            const lonMax = (worldX0 + (mapW + PAD) / k) * 360 - 180;
            const latMax = latAtWorld(worldY0 - PAD / k);
            const latMin = latAtWorld(worldY0 + (mapH + PAD) / k);
            const zoom = Math.max(8, Math.min(13, Math.floor(Math.log2(k) - 8)));
            const n = Math.pow(2, zoom);
            const tile = k / n;   // one 256-px tile in canvas px (shared scale)
            const tx0 = Math.floor(((lonMin + 180) / 360) * n);
            const tx1 = Math.floor(((lonMax + 180) / 360) * n);
            const ty0 = Math.floor(tileYFrac(latMax, zoom));
            const ty1 = Math.floor(tileYFrac(latMin, zoom));
            let drawn = 0;
            let anyLoading = false;
            ctx.save();
            ctx.beginPath();
            ctx.rect(PAD, PAD, mapW, mapH);
            ctx.clip();
            for (let ty = ty0; ty <= ty1; ty += 1) {
                for (let tx = tx0; tx <= tx1; tx += 1) {
                    const entry = localMapGetTile(zoom, tx, ty);
                    if (!entry.ok) {
                        if (!entry.done) anyLoading = true;
                        continue;
                    }
                    const latTop = tileLat(ty, zoom);
                    const lonL = tileLon(tx, zoom);
                    const x = gridX0 + (worldXof(lonL) - worldX0) * k;
                    const y = gridY0 + (worldYof(latTop) - worldY0) * k;   // world-Y grows southward
                    if (tile <= 0) continue;
                    ctx.drawImage(entry.img, x, y, tile, tile);
                    drawn += 1;
                }
            }
            if (!drawn && !anyLoading) {
                // Every tile source failed (offline or blocked) — say so instead
                // of leaving a silent, seemingly "missing" map behind the weather.
                ctx.fillStyle = 'rgba(8, 20, 40, 0.5)';
                ctx.fillRect(PAD, PAD, mapW, mapH);
                ctx.font = '600 11px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(6, 14, 30, 0.85)';
                const note = '🛰️ Map tiles unreachable (offline?) — weather only';
                ctx.strokeText(note, PAD + mapW / 2, PAD + mapH - 18);
                ctx.fillStyle = 'rgba(190, 214, 240, 0.85)';
                ctx.fillText(note, PAD + mapW / 2, PAD + mapH - 18);
                ctx.textAlign = 'left';
            }
            if (drawn) {
                if (localMapBasemap === 'topo') {
                    // OpenTopoMap is a light, colourful terrain map — keep it
                    // readable with only a whisper of a cool tint and vignette so
                    // the elevation and contours show through under the weather.
                    ctx.fillStyle = 'rgba(12, 30, 58, 0.15)';
                    ctx.fillRect(PAD, PAD, mapW, mapH);
                    const glow = ctx.createRadialGradient(PAD + mapW / 2, PAD + mapH * 0.38, 10, PAD + mapW / 2, PAD + mapH / 2, Math.max(mapW, mapH) * 0.75);
                    glow.addColorStop(0, 'rgba(90, 150, 220, 0.08)');
                    glow.addColorStop(1, 'rgba(6, 18, 40, 0.16)');
                    ctx.fillStyle = glow;
                    ctx.fillRect(PAD, PAD, mapW, mapH);
                } else {
                    // Dark street map: keep the existing cool tint + soft vignette.
                    ctx.fillStyle = 'rgba(8, 26, 52, 0.38)';
                    ctx.fillRect(PAD, PAD, mapW, mapH);
                    const glow = ctx.createRadialGradient(PAD + mapW / 2, PAD + mapH * 0.38, 10, PAD + mapW / 2, PAD + mapH / 2, Math.max(mapW, mapH) * 0.75);
                    glow.addColorStop(0, 'rgba(40, 92, 160, 0.16)');
                    glow.addColorStop(1, 'rgba(4, 14, 32, 0.5)');
                    ctx.fillStyle = glow;
                    ctx.fillRect(PAD, PAD, mapW, mapH);
                }
                // Attribution. Both basemaps are CARTO label-free Voyager tiles
                // derived from OSM. A light halo keeps it readable on the map.
                ctx.font = '500 9px system-ui, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                const credit = '© OpenStreetMap contributors · © CARTO';
                ctx.lineWidth = 3;
                ctx.strokeStyle = localMapBasemap === 'topo' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(4, 12, 28, 0.7)';
                ctx.strokeText(credit, PAD + mapW - 6, PAD + mapH - 5);
                ctx.fillStyle = localMapBasemap === 'topo' ? 'rgba(28, 44, 68, 0.8)' : 'rgba(190, 214, 240, 0.55)';
                ctx.fillText(credit, PAD + mapW - 6, PAD + mapH - 5);
                ctx.textAlign = 'left';
            }
            ctx.restore();
        }

        // Shared Web-Mercator tile painter: draws every tile of `zoom` that
        // intersects the visible map area through the ONE shared nadir
        // projection (proj), so basemap terrain, satellite clouds and rain
        // radar all stay pixel-aligned with the weather grid and the place
        // labels. getTile(zoom, tx, ty) returns the tile record (or a
        // not-yet-loaded entry); pick(entry) returns the image to draw, or
        // null to skip a tile that is not loaded / not usable.
        function drawLocalMapTileRange(ctx, proj, zoom, getTile, pick) {
            const { PAD, mapW, mapH, wxLeft, wyTop, pxPerWorld } = proj;
            const n = Math.pow(2, zoom);
            const tileW = pxPerWorld / n;                       // on-canvas size of one tile
            const x0 = Math.floor(wxLeft * n);
            const x1 = Math.floor(wxLeft * n + mapW / tileW);
            const y0 = Math.floor(wyTop * n);
            const y1 = Math.floor(wyTop * n + mapH / tileW);
            let drawn = 0;
            for (let ty = y0; ty <= y1; ty += 1) {
                for (let tx = x0; tx <= x1; tx += 1) {
                    const entry = getTile(zoom, tx, ty);
                    const img = entry && pick ? pick(entry) : null;
                    if (!img) continue;
                    // +0.6 px overlap hides hairline seams between tiles.
                    ctx.drawImage(img, PAD + (tx - wxLeft * n) * tileW, PAD + (ty - wyTop * n) * tileW, tileW + 0.6, tileW + 0.6);
                    drawn += 1;
                }
            }
            return drawn;
        }

        // ===== 💨 Wind layer: arrows over the radar that point in the direction
        // the wind blows TOWARDS (meteorological "from" direction + 180°). Length
        // = speed, colour = Beaufort force, and cells at-or-above Beaufort 5
        // (the app's "windy" threshold) get a glow + an exact km/h label.
        function localMapBeaufort(kmh) {
            const boundaries = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
            for (let i = 0; i < boundaries.length; i += 1) {
                if (kmh <= boundaries[i]) return i;
            }
            return 12;
        }

        function localMapWindColor(bft) {
            if (bft >= 7) return 'rgba(255, 84, 84, 0.95)';   // gale force — red
            if (bft >= 5) return 'rgba(255, 158, 66, 0.95)';  // windy (> Bf 4) — orange
            if (bft === 4) return 'rgba(255, 214, 110, 0.9)';  // fresh breeze — amber
            if (bft >= 3) return 'rgba(120, 200, 255, 0.85)';  // gentle breeze — cyan
            return 'rgba(168, 198, 232, 0.7)';                 // calm/light — pale blue
        }

        function drawLocalMapWind(ctx, proj, samplePts, t) {
            if (!samplePts || !samplePts.length) return;
            const time = typeof t === 'number' ? t : 0;
            const lenBase = Math.max(9, Math.min(20, proj.cellW * 0.4));
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (const pt of samplePts) {
                const cell = localMapFrameCell(pt.cell, localMapFrame);
                const ws = cell.wind_speed || 0;
                if (ws < 3) continue;   // calm air – no arrow
                const deg = (cell.wind_direction || 0) % 360;
                const toward = ((deg + 180) % 360) * Math.PI / 180;   // where it blows TO
                const dx = Math.sin(toward);
                const dy = -Math.cos(toward);
                // Gentle "gust" breathing so the field feels alive.
                const gust = 1 + 0.12 * Math.sin(time * 2.1 + cell.lat * 11 + cell.lon * 7.3);
                const len = lenBase * (0.65 + Math.min(1.5, ws / 29)) * gust;
                const bft = localMapBeaufort(ws);
                const color = localMapWindColor(bft);
                const px = pt.x, py = pt.y;
                const sx = px - dx * len, sy = py - dy * len;   // tail
                const ex = px + dx * len, ey = py + dy * len;   // tip

                if (bft >= 5) {
                    // Soft radial glow behind strongly-windy cells.
                    const glow = ctx.createRadialGradient(px, py, 2, px, py, len * 1.15);
                    glow.addColorStop(0, 'rgba(255, 150, 60, 0.22)');
                    glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(px, py, len * 1.15, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.strokeStyle = color;
                ctx.lineWidth = bft >= 5 ? 2 : 1.5;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();

                // Arrowhead at the tip.
                const ah = Math.max(3.5, len * 0.28);
                const back = Math.atan2(sy - ey, sx - ex);
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex + Math.cos(back + 0.5) * ah, ey + Math.sin(back + 0.5) * ah);
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex + Math.cos(back - 0.5) * ah, ey + Math.sin(back - 0.5) * ah);
                ctx.stroke();

                // Exact km/h label on windy cells (Beaufort 5+, the alert threshold).
                if (bft >= 5) {
                    ctx.font = '700 9px system-ui, -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(8, 20, 40, 0.85)';
                    ctx.strokeText(`${ws}`, sx + dx * 1.5, sy + dy * 1.5);
                    ctx.fillStyle = '#fff3df';
                    ctx.fillText(`${ws}`, sx + dx * 1.5, sy + dy * 1.5);
                }
            }
        }

        // Clock times for each 15-minute frame (from a cell's series, falling back
        // to the nowcast timeline start) — used for the slider label and badge.
        function localMapFrameTimes(data) {
            const grid = data && data.localMap;
            const cells = grid && Array.isArray(grid.cells) ? grid.cells : [];
            for (const c of cells) {
                const s = c.series;
                if (s && Array.isArray(s.times) && s.times.length && s.times[0]) {
                    const first = new Date(s.times[0]);
                    if (!isNaN(first.getTime())) {
                        return s.times.map((t) => {
                            const d = new Date(t);
                            return isNaN(d.getTime()) ? null : d.getTime();
                        });
                    }
                }
            }
            const tl = data && data.nowcast && Array.isArray(data.nowcast.timeline) ? data.nowcast.timeline : [];
            if (tl.length && tl[0].time) {
                const start = new Date(tl[0].time).getTime();
                if (!isNaN(start)) {
                    return Array.from({ length: LOCALMAP_FRAME_MAX + 1 }, (_, i) => start + i * 15 * 60 * 1000);
                }
            }
            return null;
        }

        function localMapFrameLabel(idx) {
            if (!idx) return 'Now';
            const mins = idx * 15;
            const dur = mins < 60 ? `${mins} min` : mins % 60 === 0 ? `${mins / 60} h` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
            const times = latestLocalMapFrameTimes;
            const t = times && times[idx] ? new Date(times[idx]) : null;
            const hhmm = t ? ` · ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` : '';
            return `+${dur}${hhmm}`;
        }

        function setLocalMapFrame(idx) {
            const max = latestLocalMapFrameTimes ? Math.max(0, latestLocalMapFrameTimes.length - 1) : LOCALMAP_FRAME_MAX;
            localMapFrame = Math.max(0, Math.min(max, Math.round(idx)));
            if (localMapFrameSlider) {
                localMapFrameSlider.max = String(max);
                localMapFrameSlider.value = String(localMapFrame);
            }
            if (localMapFrameTimeEl) localMapFrameTimeEl.textContent = localMapFrameLabel(localMapFrame);
            highlightLocalMapFrame();
            positionLocalMapTimelineNeedle();
            if (latestLocalMapData && latestLocalMapData.localMap && Array.isArray(latestLocalMapData.localMap.cells) && latestLocalMapData.localMap.cells.length) {
                drawLocalMap(latestLocalMapData, performance.now() / 1000);
            }
        }

        function highlightLocalMapFrame() {
            if (!localMapTlForecast) return;
            localMapTlForecast.querySelectorAll('i[data-idx]').forEach((el) => {
                el.classList.toggle('sel', Number(el.dataset.idx) === localMapFrame);
            });
        }

        // 🔴 Red "now" needle follows the forecast time actually on screen:
        // at frame 0 it sits at the real clock time, and as the ▶ preview
        // plays (or the slider is dragged) it slides along the timeline with
        // the +15 min…+3 h forecast being shown — so the red line is never
        // frozen while the weather ahead of it changes.
        function localMapNeedlePct() {
            const data = latestLocalMapData;
            const timeline = data && data.nowcast && Array.isArray(data.nowcast.timeline) ? data.nowcast.timeline : [];
            if (!timeline.length) return 0;
            const slotMs = 15 * 60 * 1000;
            const startMs = new Date(timeline[0].time).getTime();
            const windowMs = timeline.length * slotMs;
            const targetMs = localMapFrame <= 0
                ? Date.now()
                : (latestLocalMapFrameTimes && latestLocalMapFrameTimes[localMapFrame]) || (startMs + localMapFrame * slotMs);
            return Math.max(0, Math.min(100, ((targetMs - startMs) / windowMs) * 100));
        }

        function positionLocalMapTimelineNeedle() {
            if (!localMapTlNow || !latestLocalMapData) return;
            localMapTlNow.style.left = `${localMapNeedlePct()}%`;
        }

        // ▶ Movie loop: advance one 15-minute frame every 0.75 s, with a short
        // dwell when the loop restarts so the "now" frame registers.
        function stopLocalMapPlayback() {
            if (localMapPlayTimer) { clearTimeout(localMapPlayTimer); localMapPlayTimer = 0; }
            if (localMapPlayBtn) {
                localMapPlayBtn.textContent = '▶';
                localMapPlayBtn.classList.remove('playing');
                localMapPlayBtn.title = 'Play the 3-hour prediction';
            }
        }

        function localMapPlayStep() {
            localMapPlayTimer = 0;
            const max = latestLocalMapFrameTimes ? Math.max(0, latestLocalMapFrameTimes.length - 1) : LOCALMAP_FRAME_MAX;
            const atEnd = localMapFrame >= max;
            setLocalMapFrame(atEnd ? 0 : localMapFrame + 1);
            localMapPlayTimer = setTimeout(localMapPlayStep, atEnd ? 1800 : 750);
        }

        function startLocalMapPlayback() {
            stopLocalMapPlayback();
            if (localMapPlayBtn) {
                localMapPlayBtn.textContent = '⏸';
                localMapPlayBtn.classList.add('playing');
                localMapPlayBtn.title = 'Pause the prediction';
            }
            const max = latestLocalMapFrameTimes ? Math.max(0, latestLocalMapFrameTimes.length - 1) : LOCALMAP_FRAME_MAX;
            if (localMapFrame >= max) setLocalMapFrame(0);
            localMapPlayTimer = setTimeout(localMapPlayStep, 450);
        }

        // Small "⏩ +45 min · 15:15" pill in the canvas top-right whenever a
        // future frame is on screen (frame 0 = live view shows nothing).
        function drawLocalMapFrameBadge(ctx, cssW, label) {
            if (!label) return;
            ctx.font = '800 11px system-ui, -apple-system, sans-serif';
            const w = ctx.measureText(label).width + 18;
            const h = 19;
            const x = cssW - w - 8;
            const y = 8;
            ctx.beginPath();
            ctx.moveTo(x + 9, y);
            ctx.arcTo(x + w, y, x + w, y + h, 9);
            ctx.arcTo(x + w, y + h, x, y + h, 9);
            ctx.arcTo(x, y + h, x, y, 9);
            ctx.arcTo(x, y, x + w, y, 9);
            ctx.closePath();
            ctx.fillStyle = 'rgba(24, 38, 66, 0.85)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 214, 110, 0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#ffd66b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
            ctx.textAlign = 'left';
        }

        function drawLocalMap(data, tNow) {
            if (!localMapCanvas) return;
            const grid = data && data.localMap;
            const cells = grid && Array.isArray(grid.cells) ? grid.cells : [];

            if (localMapLoading) {
                localMapLoading.classList.toggle('hidden', cells.length > 0);
                if (!cells.length) {
                    localMapLoading.textContent = grid && grid.note
                        ? grid.note
                        : 'Radar view loading…';
                }
            }

            const dpr = window.devicePixelRatio || 1;
            const rect = localMapCanvas.getBoundingClientRect();
            const cssW = Math.max(60, rect.width);
            const cssH = Math.max(45, rect.height);
            const W = Math.round(cssW * dpr);
            const H = Math.round(cssH * dpr);
            if (localMapCanvas.width !== W) localMapCanvas.width = W;
            if (localMapCanvas.height !== H) localMapCanvas.height = H;

            const ctx = localMapCanvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cssW, cssH);

            // Radar screen base (dark glass, faint glow above the horizon)
            const bg = ctx.createRadialGradient(cssW / 2, cssH * 0.4, 8, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72);
            bg.addColorStop(0, 'rgba(26, 68, 122, 0.38)');
            bg.addColorStop(1, 'rgba(6, 22, 48, 0.92)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, cssW, cssH);

            const PAD = 12;
            const mapW = cssW - PAD * 2;
            const mapH = cssH - PAD * 2;
            const cx = PAD + mapW / 2;
            const cy = PAD + mapH / 2;
            localMapHoverCells = [];

            // Apply zoom & pan: scale around canvas center, then translate
            const zoom = localMapZoom;
            ctx.save();
            ctx.translate(cx + localMapPanX, cy + localMapPanY);
            ctx.scale(zoom, zoom);
            ctx.translate(-cx, -cy);

            if (!cells.length) {
                drawLocalMapGrid(ctx, cx, cy, 0);
                return;
            }

            const uniqLon = [...new Set(cells.map((c) => c.lon))].sort((a, b) => a - b);
            const uniqLat = [...new Set(cells.map((c) => c.lat))].sort((a, b) => a - b);
            const nCols = uniqLon.length;
            const nRows = uniqLat.length;
            const lonSpan = (uniqLon[nCols - 1] - uniqLon[0]) || 1;
            const latSpan = (uniqLat[nRows - 1] - uniqLat[0]) || 1;

            // ===== 🧭 TRUE straight-down (nadir) view =====
            // Both axes share ONE metres-per-pixel scale, so 1 km east and
            // 1 km north look identical on screen — the area is seen from
            // directly above instead of being lat/lon-stretched to fit the
            // window. Everything is measured in Web Mercator world units (the
            // exact space the map tiles use), centred on the grid midpoint.
            const lat0 = (uniqLat[0] + uniqLat[nRows - 1]) / 2;
            const worldX0 = worldXof(uniqLon[0]);
            const worldY0 = worldYof(uniqLat[nRows - 1]);
            const wSpanX = (worldXof(uniqLon[nCols - 1]) - worldX0) || 1e-9;
            const wSpanY = (worldYof(uniqLat[0]) - worldY0) || 1e-9;   // world-Y grows SOUTHWARD in Mercator → south edge − north edge > 0
            const k = Math.min(mapW / wSpanX, mapH / wSpanY);   // shared px per world unit
            const gridW = wSpanX * k;
            const gridH = wSpanY * k;
            const gridX0 = PAD + (mapW - gridW) / 2;   // centre the grid in the window
            const gridY0 = PAD + (mapH - gridH) / 2;
            const cellW = gridW / nCols;
            const cellH = gridH / nRows;
            const kmPerPx = (40075017 * Math.cos((lat0 * Math.PI) / 180) / k) / 1000;
            const slotCol = (lon) => Math.round(((worldXof(lon) - worldX0) / wSpanX) * (nCols - 1));
            const slotRow = (lat) => Math.round(((worldYof(lat) - worldY0) / wSpanY) * (nRows - 1));   // world-Y grows southward

            // Projected sample points (also used for the hover tooltip).
            const samplePts = cells.map((cell) => {
                const col = slotCol(cell.lon);
                const row = slotRow(cell.lat);
                return {
                    x: gridX0 + col * cellW + cellW / 2,
                    y: gridY0 + row * cellH + cellH / 2,
                    cell
                };
            });
            localMapHoverCells = samplePts;

            // Shared world→pixel transform: the real-map tiles below AND the
            // place labels above go through the SAME Mercator mapping as the
            // grid, so clouds, streets and town names all line up — straight
            // down, with no distortion.
            const xAt = (lon) => gridX0 + (worldXof(lon) - worldX0) * k;
            const yAt = (lat) => gridY0 + (worldYof(lat) - worldY0) * k;   // world-Y grows southward
            const proj = { PAD, mapW, mapH, cx, cy, uniqLon, uniqLat, nCols, nRows, lonSpan, latSpan, cellW, cellH, xAt, yAt, k, worldX0, worldY0, gridX0, gridY0, lat0, kmPerPx };

            // 0) Real-map background: OpenTopoMap terrain (or street map) tiles aligned
            //    with the weather grid, plus a light radar tint on top of them.
            drawLocalMapTiles(ctx, proj);

            // 1) ONE continuous weather field: draw every sample as a soft
            //    radial-gradient blob that overlaps its neighbours, so the whole
            //    area reads as a single radar screen instead of 20 small tiles.
            //    A grey-white CLOUD DECK goes first; rain (blue), snow (icy
            //    white) and hail (purple) are then painted as clearly distinct
            //    cores scaled by intensity. Hash-noise jitter breaks up the
            //    dot-grid so the field looks organic, not like a chessboard.
            const t = (typeof tNow === 'number' ? tNow : 0);      // seconds, for animated falling particles
            const jitAmpX = cellW * 0.3;
            const jitAmpY = cellH * 0.3;
            const jitPx = (pt, nc) => pt.x + (hashNoise(nc.lat * 3.7, nc.lon * 1.3) - 0.5) * 2 * jitAmpX;
            const jitPy = (pt, nc) => pt.y + (hashNoise(nc.lat * 1.9, nc.lon * 5.3) - 0.5) * 2 * jitAmpY;
            const deckR = Math.max(13, Math.min(52, Math.max(cellW, cellH) * 0.5));

            // 1a) Cloud deck — broad, soft grey-white blobs that merge together.
            //     The gradient falls off quickly (0.45/0.8 stops) so the deck
            //     reads as crisp individual cloud banks instead of a foggy blur.
            for (const pt of samplePts) {
                if (!localMapLayers.clouds && !localMapLayers.fog) break;   // clouds/fog layers off → no deck
                const fc = localMapFrameCell(pt.cell, localMapFrame);
                const c = localMapCellColor(fc);
                if (!c.cloud) continue;
                if (fc.type === 'fog' && !localMapLayers.fog) continue;
                const n = valueNoise(pt.cell.lat * 2, pt.cell.lon * 2);   // 0..1 organic variation
                const px = jitPx(pt, pt.cell);
                const py = jitPy(pt, pt.cell);
                const r = deckR * (0.70 + n * 0.42);
                const a = Math.max(0.06, c.a * (0.68 + n * 0.42));
                const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
                grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`);
                grad.addColorStop(0.45, `rgba(${c.r}, ${c.g}, ${c.b}, ${a * 0.72})`);
                grad.addColorStop(0.8, `rgba(${c.r}, ${c.g}, ${c.b}, ${a * 0.16})`);
                grad.addColorStop(1, `rgba(${c.r2}, ${c.g2}, ${c.b2}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
            }

            // 1b) Distinct precipitation cores + falling particles on the deck. Each
            //     kind (rain / snow / hail) only draws when its layer is on.
            for (const pt of samplePts) {
                const cell = localMapFrameCell(pt.cell, localMapFrame);
                const c = localMapCellColor(cell);
                if ((cell.type === 'rain' || cell.type === 'drizzle') && !localMapLayers.rain) continue;
                if (cell.type === 'snow' && !localMapLayers.snow) continue;
                if (cell.type === 'hail' && !localMapLayers.hail) continue;
                const isPrec = cell.type === 'rain' || cell.type === 'drizzle' || cell.type === 'snow' || cell.type === 'hail';
                if (!isPrec) continue;
                const n = valueNoise(cell.lat * 3.1, cell.lon * 4.7);
                const px = jitPx(pt, cell);
                const py = jitPy(pt, cell);
                const heavy = c.heavy || 0;
                const radius = deckR * (0.3 + 0.45 * heavy) * (0.76 + n * 0.3);
                const core = Math.min(0.98, c.a + 0.22);
                const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
                grad.addColorStop(0, `rgba(${c.r2}, ${c.g2}, ${c.b2}, ${Math.min(1, core + 0.08)})`);
                grad.addColorStop(0.35, `rgba(${c.r2}, ${c.g2}, ${c.b2}, ${core})`);
                grad.addColorStop(0.72, `rgba(${c.r}, ${c.g}, ${c.b}, ${core * 0.38})`);
                grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fill();

                // Sharp bright rim so each shower sits clearly on the map
                // instead of dissolving into the cloud deck behind it — but
                // trace drizzle stays a soft haze: no rim, no falling streaks.
                if (cell.type !== 'drizzle') {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.16 + 0.2 * heavy})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(px, py, radius * 0.92, 0, Math.PI * 2);
                    ctx.stroke();

                    // Animated falling particles: rain streaks, snow flakes, hail pellets.
                    ctx.fillStyle = cell.type === 'hail'
                        ? 'rgba(224, 190, 255, 0.95)'
                        : cell.type === 'snow' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(205, 232, 255, 0.92)';
                    const count = 3 + Math.round(4 * heavy);
                    for (let p = 0; p < count; p += 1) {
                        const ph = hashNoise(cell.lat * 7 + p * 13.7, cell.lon * 3 + p * 7.9);
                        const offX = (ph - 0.5) * radius * 1.5;
                        const fall = (p * 23 + Math.floor(t * 20) * 3 + ph * 47) % 16;
                        const offY = (ph - 0.5) * radius * 0.8 + fall * 0.7;
                        if (cell.type === 'rain') {
                            ctx.fillRect(px + offX, py + offY, 1.6, 4 + 2 * heavy);
                        } else if (cell.type === 'snow') {
                            ctx.beginPath();
                            ctx.arc(px + offX, py + offY, 1 + heavy * 0.8, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            ctx.fillRect(px + offX, py + offY, 1.9, 1.9);
                        }
                    }
                }
            }

            // 1c) Weather icons on EVERY cell — the icon is determined by the
            //     cloud/weather condition (clear→☀️, partly cloudy→⛅, overcast→☁️,
            //     rain→🌧️, drizzle→🌦️, thunderstorm→⛈️, snow→❄️, fog→🌫️, hail→🧊,
            //     tornado→🌪️, hurricane→🌀, other→🌡️) so each cell shows exactly
            //     what the sky looks like there.
            ctx.font = `${Math.max(13, Math.round(cellW * 0.36))}px "Segoe UI Emoji", "Apple Color Emoji", system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const pt of samplePts) {
                const fCell = localMapFrameCell(pt.cell, localMapFrame);
                const c = localMapCellColor(fCell);
                // Only draw icon if the cell's layer is visible:
                // precipitation icons (rain/drizzle/snow/hail) need their layer on;
                // cloud/fog icons need their layer on; clear/partly/overcast always show.
                const isPrecip = (fCell.type === 'rain' || fCell.type === 'drizzle' || fCell.type === 'snow' || fCell.type === 'hail');
                const layerOk = isPrecip
                    ? ((fCell.type === 'rain' || fCell.type === 'drizzle') && localMapLayers.rain) ||
                      (fCell.type === 'snow' && localMapLayers.snow) ||
                      (fCell.type === 'hail' && localMapLayers.hail)
                    : (fCell.type === 'fog' ? localMapLayers.fog : true);
                if (layerOk && fCell.icon) {
                    const px = jitPx(pt, pt.cell);
                    const py = jitPy(pt, pt.cell);
                    ctx.globalAlpha = 0.95;
                    ctx.fillText(fCell.icon, px, py);
                }
            }
            ctx.globalAlpha = 1;

            drawLocalMapGrid(ctx, cx, cy, kmPerPx);

            // 💨 Wind field — arrows pointing where the wind blows, coloured by
            // Beaufort force. Drawn under the town names so labels stay readable.
            if (localMapLayers.wind) {
                drawLocalMapWind(ctx, proj, samplePts, t);
            }

            // 🏙️ City / village / hamlet labels on top of the radar field. They
            // use the same lat/lon → pixel transform as the weather grid, so the
            // names line up with the clouds, rain and snow underneath them.
            drawLocalMapPlaceLabels(ctx, proj, data && data.nearbyPlaces);

            ctx.restore();   // end zoom/pan transform

            // "You are here" label below center dot
            ctx.save();
            ctx.font = '600 9px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255, 80, 80, 0.95)';
            ctx.fillText('📍 You are here', cx, cy + 14);
            ctx.restore();

            // ⏱️ Time badge is drawn OUTSIDE the zoom transform so it stays
            // pinned to the top-right corner at every zoom level. Always show
            // it (frame 0 = "Now", frames 1+ = "+15 min · 14:30" etc.).
            ctx.save();
            drawLocalMapFrameBadge(ctx, cssW, localMapFrameLabel(localMapFrame));
            ctx.restore();
        }

        // 🏙️ Draws crisp place labels (city / town / village / hamlet) on the
        // top-down radar. Every place gets a tiny dot at its true geo position
        // plus a pill label; labels are placed in priority order (big places
        // first) and de-conflicted so they never overlap, even on a narrow phone
        // screen. Looks like the town names on a real weather-radar map.
        function drawLocalMapPlaceLabels(ctx, proj, places) {
            if (!places || !places.length) return;
            const { PAD, mapW, mapH, cx, cy, k, worldX0, worldY0, gridX0, gridY0 } = proj;
            // Exact Mercator world→pixel mapping (the same straight-down view
            // as everything else), so labels sit at their true geo position.
            const xAt = (lon) => gridX0 + (worldXof(lon) - worldX0) * k;
            const yAt = (lat) => gridY0 + (worldYof(lat) - worldY0) * k;   // world-Y grows southward

            const fontSize = Math.max(9.5, Math.min(12.5, mapW * 0.03));
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';

            const placed = [];
            const overlaps = (x, y, w, h) => {
                for (const r of placed) {
                    if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return true;
                }
                return false;
            };

            for (const p of places) {
                const x = xAt(p.lon);
                const y = yAt(p.lat);
                if (x < PAD || x > PAD + mapW || y < PAD || y > PAD + mapH) continue;

                // The dark "📍 You are here" pill floats just above the map
                // centre — skip labels that would land on top of it.
                if (Math.abs(x - cx) < 62 && Math.abs(y - cy) < 15) continue;

                const major = p.kind === 'city' || p.kind === 'town';
                ctx.font = `${major ? 700 : 600} ${major ? fontSize + 1 : fontSize}px system-ui, -apple-system, sans-serif`;
                const textW = Math.min(120, ctx.measureText(p.name).width);
                const pillW = textW + 12;
                const pillH = Math.max(15, fontSize + 6);

                // Try boxes around the dot (right first, then left, then above /
                // below) until one fits without overlapping an earlier label.
                const candidates = [
                    { bx: x + 6, by: y - pillH / 2 },
                    { bx: x + 6, by: y - pillH - 4 },
                    { bx: x + 6, by: y + 4 },
                    { bx: x - pillW - 6, by: y - pillH / 2 },
                    { bx: x - pillW - 6, by: y - pillH - 4 },
                    { bx: x - pillW - 6, by: y + 4 },
                    { bx: x - pillW / 2, by: y - pillH - 4 },
                    { bx: x - pillW / 2, by: y + 4 }
                ];
                let chosen = null;
                for (const { bx, by } of candidates) {
                    if (bx < PAD || bx + pillW > PAD + mapW || by < PAD || by + pillH > PAD + mapH) continue;
                    if (!overlaps(bx, by, pillW, pillH)) { chosen = { bx, by }; break; }
                }
                if (!chosen) continue;

                // Dot at the true position (gold for city/town, ice-blue for villages).
                ctx.beginPath();
                ctx.arc(x, y, 2.6, 0, Math.PI * 2);
                ctx.fillStyle = major ? '#ffd76e' : 'rgba(222, 240, 255, 0.95)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(4, 16, 34, 0.9)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Pill background + border.
                ctx.beginPath();
                ctx.moveTo(chosen.bx + 7, chosen.by);
                ctx.arcTo(chosen.bx + pillW, chosen.by, chosen.bx + pillW, chosen.by + pillH, 7);
                ctx.arcTo(chosen.bx + pillW, chosen.by + pillH, chosen.bx, chosen.by + pillH, 7);
                ctx.arcTo(chosen.bx, chosen.by + pillH, chosen.bx, chosen.by, 7);
                ctx.arcTo(chosen.bx, chosen.by, chosen.bx + pillW, chosen.by, 7);
                ctx.closePath();
                ctx.fillStyle = major ? 'rgba(24, 38, 66, 0.82)' : 'rgba(6, 20, 42, 0.74)';
                ctx.fill();
                ctx.strokeStyle = major ? 'rgba(255, 214, 110, 0.55)' : 'rgba(140, 200, 255, 0.32)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = major ? '#ffedbe' : '#d9ecff';
                ctx.fillText(p.name, chosen.bx + 6, chosen.by + pillH / 2 + 0.5);

                placed.push({ x: chosen.bx, y: chosen.by, w: pillW, h: pillH });
            }
        }

        function updateLocalMapMeta(data) {
            if (!data) return;
            if (localMapLocation) {
                const place = data.location || 'your location';
                localMapLocation.textContent = `${place} · area ~70 km across`;
            }

            // Min & max temperature at the current location over the next 3 hours
            // (fall back to today's daily high/low when the nowcast is missing).
            const timeline = data.nowcast && Array.isArray(data.nowcast.timeline) ? data.nowcast.timeline : [];
            let minTemp = null;
            let maxTemp = null;
            const temps = timeline.map((s) => s.temperature).filter((t) => typeof t === 'number');
            if (temps.length) {
                minTemp = Math.min(...temps);
                maxTemp = Math.max(...temps);
            } else if (Array.isArray(data.forecast) && data.forecast[0]) {
                minTemp = data.forecast[0].low != null ? data.forecast[0].low : null;
                maxTemp = data.forecast[0].high != null ? data.forecast[0].high : null;
            }

            if (localMapTemps) {
                localMapTemps.innerHTML =
                    `<span class="localmap-temp min">↓ ${minTemp ?? '—'}°</span>` +
                    `<span class="localmap-temp max">↑ ${maxTemp ?? '—'}°</span>`;
            }

            // Time indication: validity window of the next-3-hours forecast plus
            // 💧 the TOTAL amount of rain/snow/hail expected to fall in that
            // window — from 0.1 mm drizzle all the way to 50 mm or more.
            let windowText = '';
            if (timeline.length) {
                const first = timeline[0].label;
                const last = timeline[timeline.length - 1];
                const end = new Date(new Date(last.time).getTime() + 15 * 60 * 1000);
                const endHHMM = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                windowText = `now ${first} → ${endHHMM}`;
            }
            const totalPrecipMm = data && data.nowcast && data.nowcast.summary && typeof data.nowcast.summary.totalPrecipMm === 'number'
                ? data.nowcast.summary.totalPrecipMm
                : Math.round(timeline.reduce((sum, s) => sum + (s.precipMm || 0), 0) * 10) / 10;
            if (localMapTime) {
                const mmLabel = `${fmtPrecipMm(totalPrecipMm)} mm`;
                localMapTime.textContent = windowText
                    ? `⏳ Next 3 hours · ${windowText} · 💧 ${mmLabel}`
                    : `⏳ Next 3 hours · 💧 ${mmLabel}`;
                localMapTime.title = `Forecast window for your current location — ${mmLabel} of precipitation (rain/snow/hail) expected in total`;
            }
        }

        // ⏱️ Arrival timeline: the red streak under the radar screen grows from
        // NOW to the moment precipitation reaches the location, using the same
        // thresholds as the alert engine (any precipitation > 0 mm or >= 60%).
        const LOCALMAP_PRECIP_PROB_PCT = 60;

        // 💧 Formats a precipitation amount: one decimal below 10 mm (0.1 …
        // 9.9), whole millimetres from 10 mm up — 50 mm or more stays exact.
        function fmtPrecipMm(mm) {
            const v = Math.max(0, Number(mm) || 0);
            return v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
        }

        function updateLocalMapTimeline(data) {
            if (!localMapTl || !localMapTlBar) return;
            const timeline = data && data.nowcast && Array.isArray(data.nowcast.timeline) ? data.nowcast.timeline : [];
            if (!timeline.length) {
                localMapTl.style.display = 'none';
                return;
            }
            localMapTl.style.display = '';

            const slotMs = 15 * 60 * 1000;                       // minutely_15 slots
            const startMs = new Date(timeline[0].time).getTime();
            const windowMs = timeline.length * slotMs;
            const nowMs = Date.now();
            const pct = (ms) => Math.max(0, Math.min(100, ((ms - startMs) / windowMs) * 100));
            const nowPct = pct(nowMs);
            const fmtIn = (m) => (m < 60 ? `in ${m} min` : m % 60 === 0 ? `in ${m / 60} h` : `in ${Math.floor(m / 60)} h ${m % 60} min`);
            // 💧 Total precipitation (rain/snow/hail) expected over the whole
            // window, from 0.1 mm up to 50 mm or more — server-provided when
            // available, otherwise summed from the 15-minute slots.
            const totalPrecipMm = data && data.nowcast && data.nowcast.summary && typeof data.nowcast.summary.totalPrecipMm === 'number'
                ? data.nowcast.summary.totalPrecipMm
                : Math.round(timeline.reduce((sum, s) => sum + (s.precipMm || 0), 0) * 10) / 10;

            // ☁️🌧️❄️🌨️ Next-3-hours sky strip: one coloured segment per 15-minute
            // slot (clear → clouds → rain/snow/hail) so you can SEE what is
            // coming, and the caption below/near it tells the whole story.
            const kindOfSlot = (s) => {
                const code = s.weatherCode || 0;
                const wet = (s.precipMm || 0) > 0 || (s.precipProb || 0) >= LOCALMAP_PRECIP_PROB_PCT;
                if (code >= 96) return 'hail';
                if (wet) {
                    if (code === 77 || (code >= 71 && code <= 86)) return 'snow';
                    return 'rain';
                }
                return (s.cloudCover || 0) >= 40 ? 'clouds' : 'clear';
            };
            const cloudsOf = (s) => Math.max(0, Math.min(100, s.cloudCover || 0));
            const kindLabel = { clear: 'Clear', clouds: 'Clouds', rain: 'Rain', snow: 'Snow', hail: 'Hail' };
            const kindIcon = { clear: '🌤️', clouds: '☁️', rain: '🌧️', snow: '❄️', hail: '🌨️' };
            const segStyle = (s) => {
                const kind = kindOfSlot(s);
                const cc = cloudsOf(s);
                const heat = Math.min(1, (s.precipMm || 0) / 3);
                if (kind === 'clear') return 'background:rgba(10,32,62,0.45);';
                if (kind === 'clouds') return `background:rgba(196,216,240,${(0.16 + cc / 100 * 0.62).toFixed(2)});`;
                if (kind === 'rain') {
                    return `background:linear-gradient(180deg, rgba(109,183,255,${(0.55 + 0.4 * heat).toFixed(2)}), rgba(47,111,159,${(0.85 + 0.15 * heat).toFixed(2)}));`;
                }
                if (kind === 'snow') return 'background:linear-gradient(180deg, rgba(255,255,255,0.95), rgba(200,232,255,0.85));';
                return 'background:linear-gradient(180deg, rgba(205,140,255,0.95), rgba(140,66,246,0.9));';
            };
            if (localMapTlForecast) {
                let band = '';
                let iconsHtml = '';
                let lastKind = '';
                for (let i = 0; i < timeline.length; i += 1) {
                    const s = timeline[i];
                    const kind = kindOfSlot(s);
                    const mm = s.precipMm || 0;
                    const prob = s.precipProb || 0;
                    const wet = kind === 'rain' || kind === 'snow' || kind === 'hail';
                    // Expected amount shown INSIDE each wet 15-minute block so you
                    // see at a glance what each slot will bring: the mm value when
                    // an amount is forecast, otherwise the % chance — and nothing
                    // for dry clear/cloud slots. Text colour adapts per block so
                    // it stays readable on the bright snow/hail and dark rain tiles.
                    let amount = '';
                    if (mm > 0) amount = fmtPrecipMm(mm);
                    else if (prob >= LOCALMAP_PRECIP_PROB_PCT) amount = `${Math.round(prob)}%`;
                    const title = `${s.label} · ${kindLabel[kind]} · ☁️ ${cloudsOf(s)}%${mm > 0 ? ` · 💧 ${mm} mm` : ''}${!mm && prob >= LOCALMAP_PRECIP_PROB_PCT ? ` · 🌧️ ${prob}% chance` : ''}`;
                    let style = segStyle(s);
                    if (amount) {
                        const textColor = kind === 'snow'
                            ? 'rgba(10, 25, 50, 0.95)'
                            : 'rgba(255, 255, 255, 0.96)';
                        const shadow = kind === 'snow' ? '' : 'text-shadow:0 1px 2px rgba(0,0,0,0.85);';
                        style += `;color:${textColor};${shadow}`;
                    }
                    band += `<i data-idx="${i}" style="${style}" title="${title.replace(/"/g, '&quot;')}">${amount}</i>`;
                    // Icon only at the start of each precipitation episode.
                    if (wet && kind !== lastKind) {
                        iconsHtml += `<em style="left:${pct(startMs + i * slotMs)}%" title="${title.replace(/"/g, '&quot;')}">${s.icon || kindIcon[kind]}</em>`;
                    }
                    lastKind = wet ? kind : '';
                }
                localMapTlForecast.innerHTML = band + iconsHtml;
                highlightLocalMapFrame();
            }

            // Concise "what the next 3 hours look like" summary for the caption.
            const firstCloud = cloudsOf(timeline[0]);
            const lastCloud = cloudsOf(timeline[timeline.length - 1]);
            const midCloud = Math.round(timeline.reduce((sum, s) => sum + cloudsOf(s), 0) / timeline.length);
            const cloudStory = (lastCloud - firstCloud) >= 15
                ? `☁️ ${midCloud}% average, building to ${lastCloud}% by ${timeline[timeline.length - 1].label}`
                : (firstCloud - lastCloud) >= 15
                    ? `☁️ ${midCloud}% average, clearing to ${lastCloud}% by ${timeline[timeline.length - 1].label}`
                    : `☁️ ${midCloud}% average cloud for the next 3 hours`;
            const precipEpisodes = [];
            let ep = null;
            timeline.forEach((s, i) => {
                const k = kindOfSlot(s);
                const prec = k === 'rain' || k === 'snow' || k === 'hail';
                if (prec && !ep) ep = { kind: k, start: i };
                if (!prec && ep) { precipEpisodes.push(ep); ep = null; }
            });
            if (ep) precipEpisodes.push(ep);

            // First 15-minute slot where precipitation is expected.
            let arrivalIdx = -1;
            for (let i = 0; i < timeline.length; i += 1) {
                const slot = timeline[i];
                if ((slot.precipMm || 0) > 0 || (slot.precipProb || 0) >= LOCALMAP_PRECIP_PROB_PCT) {
                    arrivalIdx = i;
                    break;
                }
            }

            // Half-hour ticks + HH:MM scale under the bar ("now" marks the needle).
            if (localMapTlTicks && localMapTlScale) {
                let ticksHtml = '';
                let scaleHtml = '';
                for (let k = 0; k * 30 <= timeline.length * 15; k += 1) {
                    const tickMs = startMs + k * 30 * 60 * 1000;
                    const tickPct = pct(tickMs);
                    const t = new Date(tickMs);
                    const hhmm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
                    ticksHtml += `<i style="left:${tickPct}%"></i>`;
                    scaleHtml += `<span style="left:${tickPct}%">${k === 0 ? 'now' : hhmm}</span>`;
                }
                localMapTlTicks.innerHTML = ticksHtml;
                localMapTlScale.innerHTML = scaleHtml;
            }

            // The red ▶ needle tracks the forecast time on screen (frame 0 = real
            // now; later frames = their clock time), not just the last data load.
            positionLocalMapTimelineNeedle();

            if (arrivalIdx === -1) {
                if (localMapTlStreak) { localMapTlStreak.style.left = '0%'; localMapTlStreak.style.width = '0%'; }
                if (localMapTlArrival) localMapTlArrival.classList.remove('show');
                if (localMapTlCaption) {
                    localMapTlCaption.className = 'localmap-tl-caption calm';
                    if (localMapTlSummary) localMapTlSummary.textContent = `😊 ${cloudStory} · no rain, snow or hail in the next 3 hours`;
                    if (localMapTlPrecip) localMapTlPrecip.textContent = `💧 Expected rainfall: ${fmtPrecipMm(totalPrecipMm)} mm`;
                }
                return;
            }

            const arrivalMs = startMs + arrivalIdx * slotMs;
            const arrivalPct = pct(arrivalMs);
            const slot = timeline[arrivalIdx];
            const minutesAway = Math.max(0, Math.round((arrivalMs - nowMs) / 60000));
            const fallingNow = arrivalIdx === 0 || arrivalPct <= nowPct;

            if (localMapTlStreak) {
                const fromPct = fallingNow ? Math.max(0, nowPct - 1) : nowPct;
                const toPct = fallingNow ? 100 : Math.min(100, Math.max(arrivalPct, nowPct + 6));
                localMapTlStreak.style.left = `${fromPct}%`;
                localMapTlStreak.style.width = `${Math.max(2, toPct - fromPct)}%`;
            }
            if (localMapTlArrival) {
                localMapTlArrival.style.left = `${fallingNow ? nowPct : arrivalPct}%`;
                localMapTlArrival.classList.add('show');
            }
            if (localMapTlCaption) {
                const laterEps = precipEpisodes.length > 1
                    ? ` · later ${precipEpisodes.slice(1).map((e) => `${kindIcon[e.kind]} ${timeline[e.start].label}`).join(', ')}`
                    : '';
                localMapTlCaption.className = 'localmap-tl-caption';
                if (localMapTlSummary) {
                    localMapTlSummary.textContent = fallingNow
                        ? `${slot.icon || '🌧️'} ${slot.condition || 'Precipitation'} — falling right now${laterEps} · ${cloudStory}`
                        : `${slot.icon || '🌧️'} ${slot.condition || 'Precipitation'} first at ${slot.label} · ${fmtIn(minutesAway)}${laterEps} · ${cloudStory}`;
                }
                if (localMapTlPrecip) localMapTlPrecip.textContent = `💧 Expected rainfall: ${fmtPrecipMm(totalPrecipMm)} mm`;
            }
        }

        let latestLocalMapData = null;   // snapshot for the animated radar loop
        let localMapRAF = 0;
        let lastLocalMapDraw = 0;
        let localMapZoom = 1;           // zoom multiplier (1 = full area, higher = zoomed in)
        let localMapPanX = 0;           // pan offset in CSS pixels
        let localMapPanY = 0;
        let localMapMinZoom = 1;
        let localMapMaxZoom = 5;
        let localMapIsPanning = false;
        let localMapPanStartX = 0;
        let localMapPanStartY = 0;
        let localMapPanStartPanX = 0;
        let localMapPanStartPanY = 0;
        let localMapPinchDist = 0;
        let localMapPinchZoom = 1;

        function localMapRenderLoop(now) {
            // MapLibre GL renders itself: one static push per data/frame change is
            // enough (no 20 fps particle loop — the GL map has no canvas
            // particles). Stop any loop the old canvas radar may have started.
            localMapRAF = 0;
            return;
        }

        function renderLocalMap(data) {
            if (!localMapCanvas && !document.getElementById('localmap-map')) return;
            // Reset zoom & pan whenever NEW location data arrives (different
            // reference = fresh fetch from a location change), so the
            // "seen from above" map re-centres on the new area instead of
            // staying stuck at the previous location's zoom/pan offset.
            // The resize handler reuses latestLocalMapData, so we skip reset.
            if (data !== latestLocalMapData && !(data && data.localMap && latestLocalMapData && latestLocalMapData.localMap && data.localMap === latestLocalMapData.localMap)) {
                resetLocalMapZoom();
            }
            latestLocalMapData = data;
            latestLocalMapFrameTimes = localMapFrameTimes(data);
            const maxFrame = latestLocalMapFrameTimes ? Math.max(0, latestLocalMapFrameTimes.length - 1) : LOCALMAP_FRAME_MAX;
            if (localMapFrame > maxFrame) localMapFrame = maxFrame;
            if (localMapFrameSlider) localMapFrameSlider.max = String(maxFrame);
            if (localMapFrameTimeEl) localMapFrameTimeEl.textContent = localMapFrameLabel(localMapFrame);
            updateLocalMapMeta(data);
            updateLocalMapTimeline(data);
            // ▶ The 3-hour prediction runs automatically: the moment the first
            // forecast series has rendered, start the preview loop without the
            // user having to press play. They can still pause/resume normally.
            if (!localMapAutoPlayed && latestLocalMapFrameTimes && latestLocalMapFrameTimes.length > 1) {
                localMapAutoPlayed = true;
                startLocalMapPlayback();
            }
            if (data && data.localMap && Array.isArray(data.localMap.cells) && data.localMap.cells.length) {
            }
            const grid = data && data.localMap;
            drawLocalMap(data, performance.now() / 1000);
            // MapLibre GL renders itself — no animation loop needed. Make sure
            // any loop the old canvas radar started is stopped.
            if (localMapRAF) { cancelAnimationFrame(localMapRAF); localMapRAF = 0; }
        }

        function handleLocalMapHover(e) {
            if (!localMapCanvas || !localMapCellInfo || !localMapHoverCells.length) return;
            const rect = localMapCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            let best = null;
            let bestD = Infinity;
            for (const pt of localMapHoverCells) {
                const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
                if (d < bestD) { bestD = d; best = pt; }
            }
            const raw = best && bestD < 1600 ? best.cell : null;
            const cell = raw ? localMapFrameCell(raw, localMapFrame) : null;
            if (cell) {
                const windKmh = cell.wind_speed || 0;
                const windText = windKmh > 0 ? ` · 💨 ${windKmh} km/h (Bf ${localMapBeaufort(windKmh)})` : '';
                localMapCellInfo.textContent =
                    `${cell.icon || ''} ${cell.condition || ''} · ${cell.temp}°C · 💧 ${cell.precipitation} mm · ☁️ ${cell.cloudCover}%${windText}${localMapFrame ? ` · ${localMapFrameLabel(localMapFrame)}` : ''}`;
            } else {
                localMapCellInfo.textContent = '';
            }
        }

        // ===== ⏩ 3-hour prediction player wiring =====
        if (localMapFrameSlider) {
            localMapFrameSlider.addEventListener('input', (e) => {
                stopLocalMapPlayback();
                setLocalMapFrame(Number(e.target.value));
            });
        }
        if (localMapPlayBtn) {
            localMapPlayBtn.addEventListener('click', () => {
                if (localMapPlayTimer) stopLocalMapPlayback();
                else startLocalMapPlayback();
            });
        }
        if (localMapTlForecast) {
            localMapTlForecast.addEventListener('click', (e) => {
                const seg = e.target && e.target.closest ? e.target.closest('i[data-idx]') : null;
                if (seg) {
                    stopLocalMapPlayback();
                    setLocalMapFrame(Number(seg.dataset.idx));
                }
            });
        }

        // ===== 🗺️ Radar layer toggles: basemap + clouds / rain / snow / hail / wind.
        // The MapLibre GL build below owns visibility (localMapGLApplyVis) — the
        // toggle just flips the flag and re-pushes the same data object, which
        // always refreshes layer visibility on the GL map.
        const localMapLayersEl = document.getElementById('localmap-layers');
        const localMapLayerBtns = {};
        if (localMapLayersEl) {
            localMapLayersEl.querySelectorAll('button[data-layer]').forEach((btn) => {
                const layer = btn.dataset.layer;
                localMapLayerBtns[layer] = btn;
                btn.addEventListener('click', () => {
                    if (layer === 'topo') {
                        localMapBasemap = localMapBasemap === 'topo' ? 'osm' : 'topo';
                        localMapLayers.topo = localMapBasemap === 'topo';
                    } else {
                        localMapLayers[layer] = !localMapLayers[layer];
                    }
                    try { localStorage.setItem('localmap-layers', JSON.stringify(localMapLayers)); } catch (err) { /* private mode */ }
                    syncLocalMapLayerBtns();
                    if (latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
                    else if (window.maplibregl) localMapGLApplyVis();
                });
            });
        }
        function syncLocalMapLayerBtns() {
            if (!localMapLayersEl) return;
            for (const [layer, btn] of Object.entries(localMapLayerBtns)) {
                const on = layer === 'topo' ? localMapBasemap === 'topo' : !!localMapLayers[layer];
                btn.classList.toggle('on', on);
                btn.classList.toggle('off', !on);
                if (layer === 'topo') {
                    btn.textContent = on ? '🎨 Colour' : '🌑 Dark';
                    btn.title = on
                        ? 'Basemap: colourful vector map — razor-sharp at any zoom, free. Tap for the dark night-radar style.'
                        : 'Basemap: dark vector night-radar — razor-sharp at any zoom, free. Tap for the colourful style.';
                } else {
                    btn.title = on ? `Tap to hide the ${layer} layer` : `Tap to show the ${layer} layer`;
                }
            }
        }
        syncLocalMapLayerBtns();

        function updateLocalMapZoomLabel() {
            const label = document.getElementById('localmap-zoom-label');
            if (label) label.textContent = localMapZoom.toFixed(1) + '×';
        }
        function applyLocalMapZoom(factor, centerX, centerY) {
            const newZoom = Math.max(localMapMinZoom, Math.min(localMapMaxZoom, localMapZoom * factor));
            if (newZoom === localMapZoom) return;
            const rect = localMapCanvas.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const offX = (centerX || cx) - cx;
            const offY = (centerY || cy) - cy;
            localMapPanX = (localMapPanX - offX) * (newZoom / localMapZoom) + offX;
            localMapPanY = (localMapPanY - offY) * (newZoom / localMapZoom) + offY;
            localMapZoom = newZoom;
            updateLocalMapZoomLabel();
            if (latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
        }
        function resetLocalMapZoom() {
            localMapZoom = 1;
            localMapPanX = 0;
            localMapPanY = 0;
            updateLocalMapZoomLabel();
            if (latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
        }
        if (localMapCanvas) {
            localMapCanvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const rect = localMapCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
                applyLocalMapZoom(factor, x, y);
            }, { passive: false });
            localMapCanvas.addEventListener('mousedown', (e) => {
                if (localMapZoom <= 1) return;
                localMapIsPanning = true;
                localMapPanStartX = e.clientX;
                localMapPanStartY = e.clientY;
                localMapPanStartPanX = localMapPanX;
                localMapPanStartPanY = localMapPanY;
                localMapCanvas.style.cursor = 'grabbing';
            });
            window.addEventListener('mousemove', (e) => {
                if (!localMapIsPanning) return;
                localMapPanX = localMapPanStartPanX + (e.clientX - localMapPanStartX);
                localMapPanY = localMapPanStartPanY + (e.clientY - localMapPanStartY);
                if (latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
            });
            window.addEventListener('mouseup', () => {
                if (localMapIsPanning) {
                    localMapIsPanning = false;
                    localMapCanvas.style.cursor = localMapZoom > 1 ? 'grab' : 'crosshair';
                }
            });
            localMapCanvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    localMapPinchDist = Math.sqrt(dx * dx + dy * dy);
                    localMapPinchZoom = localMapZoom;
                } else if (e.touches.length === 1 && localMapZoom > 1) {
                    localMapIsPanning = true;
                    localMapPanStartX = e.touches[0].clientX;
                    localMapPanStartY = e.touches[0].clientY;
                    localMapPanStartPanX = localMapPanX;
                    localMapPanStartPanY = localMapPanY;
                }
            }, { passive: false });
            localMapCanvas.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (localMapPinchDist > 0) {
                        const factor = dist / localMapPinchDist;
                        const newZoom = Math.max(localMapMinZoom, Math.min(localMapMaxZoom, localMapPinchZoom * factor));
                        if (newZoom !== localMapZoom) {
                            const rect = localMapCanvas.getBoundingClientRect();
                            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                            localMapPanX = (localMapPanX - cx) * (newZoom / localMapZoom) + cx;
                            localMapPanY = (localMapPanY - cy) * (newZoom / localMapZoom) + cy;
                            localMapZoom = newZoom;
                            updateLocalMapZoomLabel();
                            if (latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
                        }
                    }
                } else if (e.touches.length === 1 && localMapIsPanning) {
                    localMapPanX = localMapPanStartPanX + (e.touches[0].clientX - localMapPanStartX);
                    localMapPanY = localMapPanStartPanY + (e.touches[0].clientY - localMapPanStartY);
                    if (latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
                }
            }, { passive: false });
            localMapCanvas.addEventListener('touchend', () => {
                localMapIsPanning = false;
                localMapPinchDist = 0;
            });
        }
        if (localMapZoomInBtn) localMapZoomInBtn.addEventListener('click', () => applyLocalMapZoom(1.3));
        if (localMapZoomOutBtn) localMapZoomOutBtn.addEventListener('click', () => applyLocalMapZoom(1 / 1.3));
        if (localMapZoomResetBtn) localMapZoomResetBtn.addEventListener('click', resetLocalMapZoom);

        async function fetchWeather(location, resetSelectedDay = false, reportLocationError = false) {
            try {
                const timestamp = Date.now();
                const query = location ? `?location=${encodeURIComponent(location)}&_=${timestamp}` : `?_=${timestamp}`;
                const res = await fetch(`/weather${query}`);
                if (!res.ok) {
                    // The API answers 404 with { error } when the typed location
                    // could not be found — surface that message to the user.
                    let message = 'Failed to fetch weather data.';
                    try {
                        const errorBody = await res.json();
                        if (errorBody && typeof errorBody.error === 'string' && errorBody.error) {
                            message = errorBody.error;
                        }
                    } catch { /* keep the generic message */ }
                    throw new Error(message);
                }
                const data = await res.json();

                // Show which weather provider actually served this response —
                // "weatherapi" (WEATHERAPI_KEY set and working) or the
                // "open-meteo" fallback (no key / quota / error).
                const creditWapi = document.getElementById('credit-wapi');
                const creditOm = document.getElementById('credit-om');
                if (creditWapi && creditOm) {
                    const wapiLive = data.provider === 'weatherapi';
                    creditWapi.textContent = wapiLive
                        ? 'Powered by WeatherAPI.com · live'
                        : 'Powered by WeatherAPI.com (standby)';
                    creditOm.textContent = wapiLive
                        ? 'Open-Meteo standby'
                        : 'Open-Meteo — serving now';
                }

                if (resetSelectedDay || location !== lastFetchedLocation) {
                    selectedDayIndex = 0;
                }
                lastFetchedLocation = location;
                latestWeatherData = data;
                updateAlertsFromWeather(data);
                renderLocalMap(data);

                // GPS mode writes raw coordinates into the location box before
                // the API resolves them into a place name. Once resolved, show
                // the actual town / village name here — but never replace it
                // with coordinates again if geocoding could only give numbers.
                const resolvedName = (data.location || '').trim();
                if (resolvedName && locationInput) {
                    const looksLikeCoords = /^\s*-?\d+(?:\.\d+)?\s*[,;]\s*-?\d/.test(resolvedName);
                    if (!looksLikeCoords) {
                        locationInput.value = resolvedName;
                        activeLocation = resolvedName;
                    }
                }

                const condition = data.condition || 'Unknown';
                const icon = getWeatherIcon(condition, data.weatherCode) || data.icon;
                const temperature = data.temperature ?? '—';
                const stats = getStatsForDay(data, selectedDayIndex);
                const forecastHtml = renderForecast(data.forecast);
                const nowcastHtml = renderNowcast(data.nowcast);
                const displayLocation = data.location || 'your location';
                const prediction = data.prediction || 'Checking forecast...';

                weatherInfo.innerHTML = `
                    <div class="weather-top">
                        <div>
                            <div class="weather-icon">${icon}</div>
                            <div class="current-temp">${temperature}°C</div>
                            <div class="location-line">
                                <div class="location-tag">📍 ${displayLocation}</div>
                                <div class="weather-chip">${condition}</div>
                            </div>
                        </div>
                        <div class="status-pill" id="status-pill">${stats.statusLabel}</div>
                    </div>
                    ${nowcastHtml}
                    ${forecastHtml}
                    <div class="weather-summary">${prediction}</div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-label label-dual">Humidity<br><small>Luchtvochtigheid</small></span>
                            <span class="stat-value" id="stat-humidity">${stats.humidity ?? '—'}%</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label label-dual">Wind speed<br><small>Snelheid</small></span>
                            <span class="stat-value" id="stat-wind-speed">${stats.windSpeed ?? '—'} km/h</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label label-dual">Wind direction<br><small>Richting</small></span>
                            <span class="stat-value" id="stat-wind-direction">${stats.windDirection ?? '—'}</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label label-dual">Beaufort<br><small>Windkracht</small></span>
                            <span class="stat-value" id="stat-beaufort">${stats.beaufort ?? '—'}</span>
                        </div>
                    </div>
                `;
                updated.textContent = `Last updated: ${new Date().toLocaleTimeString()} · Refreshes every 30 sec`;
                showOnlyCurrentWeatherIcon(condition);
                attachForecastHandlers();
                updateStatsDisplay(selectedDayIndex);
                updateGlobeMarker(data);
                if (focusGlobeOnFetch) {
                    focusGlobeOnFetch = false;
                    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                        flyToLocation(data.latitude, data.longitude, data.location || 'your location', 2.2);
                    }
                }
            } catch (e) {
                weatherInfo.innerHTML = '<div style="color:#b42318;">Error loading weather data.</div>';
                // Let location-not-found errors reach updateLocation() so the
                // search box shows a clear message ("Location not found…").
                // Only when the user asked for it — the 30-second auto-refresh
                // must stay silent (the note is already visible on screen).
                if (reportLocationError && e && typeof e.message === 'string' && /^Location not found/i.test(e.message)) {
                    throw e;
                }
            }
        }

        async function updateLocation(showLoading = true) {
            activeLocation = locationInput.value.trim();
            focusGlobeOnFetch = true; // re-zoom the globe onto the location the user just chose
            if (showLoading) {
                manualBtn.disabled = true;
                manualBtn.textContent = 'Updating...';
            }
            try {
                await fetchWeather(activeLocation, true, true);
                clearLocationNote();
            } catch (e) {
                const reason = e && typeof e.message === 'string' && e.message ? e.message : 'Could not update weather for that location.';
                setLocationNote(`⚠️ ${reason} The globe and “seen from above” map keep showing the last good location.`);
            } finally {
                if (showLoading) {
                    manualBtn.disabled = false;
                    manualBtn.textContent = 'Update location';
                }
            }
        }

        // Inline feedback under the location search box (no blocking alert).
        function setLocationNote(text) {
            if (!locationNoteEl) return;
            locationNoteEl.textContent = text;
            locationNoteEl.className = 'location-note error';
        }
        function clearLocationNote() {
            if (locationNoteEl) locationNoteEl.className = 'location-note';
        }

        // ===== Globe helpers: texture + math =====
        function clampGlobe(v, min, max) { return Math.min(max, Math.max(min, v)); }

        // Shortest distance (0–180°) between two degree angles + shortest-path easing
        function globeAngleDist(a, b) {
            let d = (a - b) % 360;
            if (d < 0) d += 360;
            return d > 180 ? 360 - d : d;
        }
        function lerpGlobeAngle(a, b, t) {
            let diff = (b - a) % 360;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            return a + diff * t;
        }

        function setGlobeStatus(message, isError) {
            if (!globeStatusEl) return;
            globeStatusEl.textContent = message;
            globeStatusEl.classList.toggle('error', !!isError);
        }

        function hashNoise(x, y) {
            const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
            return s - Math.floor(s);
        }

        function valueNoise(x, y) {
            const xi = Math.floor(x), yi = Math.floor(y);
            const xf = x - xi, yf = y - yi;
            const a = hashNoise(xi, yi), b = hashNoise(xi + 1, yi);
            const c = hashNoise(xi, yi + 1), d = hashNoise(xi + 1, yi + 1);
            const u = xf * xf * (3 - 2 * xf);
            const v = yf * yf * (3 - 2 * yf);
            return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
        }

        function fbmNoise(x, y, octaves) {
            let sum = 0, amp = 1, freq = 1, max = 0;
            for (let i = 0; i < octaves; i += 1) {
                sum += amp * valueNoise(x * freq, y * freq);
                max += amp;
                amp *= 0.5;
                freq *= 2;
            }
            return sum / max;
        }

// ===== 🌊 El Niño warm sea-surface-temperature (SST) overlay =====
        // Stylised representation of the equatorial warm Pacific during a
        // moderate-to-strong El Niño event. `anomaly` is in pseudo °C above the
        // normal ocean temperature (0 = normal). The warmer it gets, the redder
        // it looks; less-warm water is shown orange. This is a visual model, not
        // live satellite data.
        const SST_GRID_W = 360, SST_GRID_H = 180;   // 1 cell per degree
        let elNinoGrid = null;

        function wrapLon(l) { return ((l + 180) % 360 + 360) % 360 - 180; }

        function sstGauss(x, mu, sigma) {
            const d = (x - mu) / sigma;
            return Math.exp(-0.5 * d * d);
        }

        // Longitude-aware Gaussian: measures the SHORTEST distance across the
        // 180° date line, so a warm pool hugging ±180° has no seam (no "stop").
        function sstGaussLon(lonDeg, mu, sigma) {
            const d = wrapLon(lonDeg - mu);
            return Math.exp(-0.5 * d * d / (sigma * sigma));
        }

        // ===== 🌊 Gulf Stream: warm water carried north through the Atlantic =====
        // Each node is [lat, lng, surfaceTempC]. The Gulf Stream pulls warm
        // subtropical water out of the Florida Strait, runs up the US East Coast,
        // then turns east across the North Atlantic (the North Atlantic Drift) and
        // reaches northwest Europe. The `tempC` shows how the water it carries
        // cools as it travels: warmest near Florida (~27°C), coolest by Europe.
        const GULF_STREAM = [
            [24.5, -82.5, 27.5],   // Gulf of Mexico / off Florida
            [26.0, -80.0, 27.0],   // Florida Strait
            [29.5, -79.5, 26.0],   // East Florida coast
            [33.0, -78.5, 24.5],   // Georgia / South Carolina
            [35.5, -75.0, 22.5],   // Cape Hatteras
            [38.0, -70.0, 20.0],   // offshore shelf edge
            [40.0, -62.0, 17.5],   // open Atlantic
            [43.0, -50.0, 15.0],   // mid North Atlantic
            [47.0, -38.0, 12.5],   // North Atlantic Drift
            [50.5, -27.0, 11.0],   // toward the Azores path
            [53.5, -17.0, 10.0],   // west of Ireland
            [57.0, -7.0, 9.5]      // reaches NW Europe
        ];

        // Cross-track distance (in degrees) from a point to a path segment,
        // using longitude scaled by cos(latitude) so it approximates km.
        function pointSegmentDistance(lat, lng, x1, y1, x2, y2) {
            const L = Math.cos(lat * Math.PI / 180);
            const dx = (x2 - x1) * L, dy = (y2 - y1);
            const len2 = dx * dx + dy * dy;
            let t = len2 > 0 ? (((lng - x1) * L * dx + (lat - y1) * dy) / len2) : 0;
            t = Math.max(0, Math.min(1, t));
            const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
            const dLng = (lng - px) * L, dLat = (lat - py);
            return Math.sqrt(dLng * dLng + dLat * dLat);
        }

        // -> How warm the water the Gulf Stream carries is, re-mapped into the same
        //    anomaly scale the colour ramp uses (0..~3.6). This lets the stream show
        //    the carried temperature itself: deep red near Florida (~27°C), shading
        //    down to orange off northwest Europe (~9.5°C) where it has cooled.
        const GULF_T_MIN = 4, GULF_T_MAX = 28;          // carried-water range maps to ramp
        const GULF_RANGE = 3.6;
        function gulfStreamAnomaly(latDeg, lngDeg) {
            let best = 0;
            for (let i = 0; i < GULF_STREAM.length - 1; i += 1) {
                const [y1, x1] = GULF_STREAM[i];
                const [y2, x2] = GULF_STREAM[i + 1];
                const d = pointSegmentDistance(latDeg, lngDeg, x1, y1, x2, y2);
                // The current is a narrow, intense core that spreads a little wider
                // as it moves east. Gaussian cross-section so the edges melt away.
                const core = Math.exp(-(d * d) / (2.2 * 2.2));
                if (core < 0.02) continue;
                // Along-stream water temperature at the nearest point on this leg.
                const frac = Math.max(0, Math.min(1, (
                    ((lngDeg - x1) * Math.cos(latDeg * Math.PI / 180) * (x2 - x1) * Math.cos(latDeg * Math.PI / 180) + (latDeg - y1) * (y2 - y1)) /
                    (((x2 - x1) * Math.cos(latDeg * Math.PI / 180)) ** 2 + (y2 - y1) ** 2)
                )));
                const temp = GULF_STREAM[i][2] + (GULF_STREAM[i + 1][2] - GULF_STREAM[i][2]) * frac;
                const val = ((temp - GULF_T_MIN) / (GULF_T_MAX - GULF_T_MIN)) * GULF_RANGE;
                best = Math.max(best, Math.max(0, val) * core);
            }
            return best;
        }

        function computeElNinoAnomaly(latDeg, lngDeg) {
            const lonW = wrapLon(lngDeg);
            const lon0 = ((lngDeg % 360) + 360) % 360;   // 0°..360° so the Pacific is one span
            // Heart of the El Niño warm tongue (Niño 3.4 region, ~140°W)
            let a = 2.6 * sstGauss(latDeg, 0, 7) * sstGaussLon(lonW, -140, 50);
            // Warm water spreading to the South American coast (~90°W)
            a += 1.3 * sstGauss(latDeg, -1, 9) * sstGaussLon(lonW, -92, 34);
            // Broad band of above-normal warmth right along the equator
            a += 0.8 * sstGauss(latDeg, 0, 16) * sstGaussLon(lonW, -112, 105);
            // Milder, normally-warm western Pacific pool (Indonesian side)
            a += 0.5 * sstGauss(latDeg, 0, 13) * sstGaussLon(lonW, 162, 70);
            // Seamless organic variation — periodic in longitude (cos/sin of the
            // angle) so there is NO visible seam/"stop" where the map wraps at 180°.
            const lr = lngDeg * Math.PI / 180;
            const organic = 0.9 + 0.22 * fbmNoise(Math.cos(lr) * 1.6 + latDeg / 40, Math.sin(lr) * 1.6, 2);
            // Confine the tint to the Pacific basin with smooth smoothstep fades so
            // the warm colour melts gently into normal ocean instead of cutting off.
            const smoothEdge = (x) => { const t = clampGlobe(x, 0, 1); return t * t * (3 - 2 * t); };
            const west = smoothEdge((lon0 - 128) / 62);
            const east = smoothEdge((292 - lon0) / 62);
            const pacific = Math.max(0, a * organic * Math.min(west, east));

            // 🌊 Gulf Stream: warm Atlantic current (separate basin, so we simply add).
            const gulf = gulfStreamAnomaly(latDeg, lngDeg);

            return Math.max(pacific, gulf);
        }

        function buildElNinoGrid() {
            elNinoGrid = new Float32Array(SST_GRID_W * SST_GRID_H);
            for (let v = 0; v < SST_GRID_H; v += 1) {
                const latDeg = 90 - v;                       // top row = +90°
                for (let u = 0; u < SST_GRID_W; u += 1) {
                    elNinoGrid[v * SST_GRID_W + u] = computeElNinoAnomaly(latDeg, -180 + u);
                }
            }
        }

        function elNinoAnomalyAt(latDeg, lngDeg) {
            const gu = clampGlobe((((lngDeg + 180) / 360) * SST_GRID_W) | 0, 0, SST_GRID_W - 1);
            const gv = clampGlobe(((90 - latDeg) / 180 * SST_GRID_H) | 0, 0, SST_GRID_H - 1);
            return elNinoGrid[gv * SST_GRID_W + gu];
        }

        // Warm = red, less warm = orange (deep red at the hottest core). The ramp is
        // deliberately tapered (slow curve) so the centre stays GRADED instead of
        // turning into one flat, solid red blob with a hard boundary.
        function elNinoColor(anomaly) {
            const t = clampGlobe((anomaly - 0.1) / 3.6, 0, 1);
            const STOPS = [
                { t: 0.0, r: 235, g: 170, b: 95,  a: 0.08 },   // faint warmth over water
                { t: 0.30, r: 250, g: 150, b: 60, a: 0.34 },   // soft orange
                { t: 0.55, r: 252, g: 98,  b: 34, a: 0.55 },   // orange
                { t: 0.78, r: 238, g: 42,  b: 16, a: 0.72 },   // orange-red
                { t: 1.0, r: 200, g: 14,  b: 8,  a: 0.85 }     // deep red core
            ];
            let i = 0;
            while (i < STOPS.length - 2 && t > STOPS[i + 1].t) i += 1;
            const s0 = STOPS[i], s1 = STOPS[i + 1];
            const f = clampGlobe((t - s0.t) / (s1.t - s0.t || 1), 0, 1);
            return {
                r: s0.r + (s1.r - s0.r) * f,
                g: s0.g + (s1.g - s0.g) * f,
                b: s0.b + (s1.b - s0.b) * f,
                a: s0.a + (s1.a - s0.a) * f
            };
        }
        // Fallback "stylized earth" texture used when the CDN image can't load
        function makeFallbackEarthTexture() {
            const w = EARTH_TEX_W, h = EARTH_TEX_H;
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const ctx = cv.getContext('2d');
            const img = ctx.createImageData(w, h);
            const px = img.data;
            for (let j = 0; j < h; j += 1) {
                for (let i = 0; i < w; i += 1) {
                    const u = i / w, v = j / h;
                    const n = fbmNoise(u * 3.4, v * 2.3, 4);
                    const m = fbmNoise(u * 7.9 + 30, v * 5.7 + 13, 3);
                    const isLand = n * 0.72 + m * 0.28 > 0.545;
                    const idx = (j * w + i) * 4;
                    if (isLand) {
                        px[idx] = 42 + Math.round(n * 34);
                        px[idx + 1] = 94 + Math.round(n * 70) + Math.round(m * 24);
                        px[idx + 2] = 56 + Math.round(m * 22);
                    } else {
                        px[idx] = 10 + Math.round(n * 26);
                        px[idx + 1] = 34 + Math.round(n * 52);
                        px[idx + 2] = 82 + Math.round(n * 34);
                    }
                    px[idx + 3] = 255;
                }
            }
            ctx.putImageData(img, 0, 0);
            return cv;
        }

        function setEarthTexture(img) {
            const cv = document.createElement('canvas');
            cv.width = EARTH_TEX_W; cv.height = EARTH_TEX_H;
            const ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0, EARTH_TEX_W, EARTH_TEX_H);
            earthTexCanvas = cv;
            earthTexData = ctx.getImageData(0, 0, EARTH_TEX_W, EARTH_TEX_H).data;
        }

        function loadEarthTexture() {
            if (!globeCanvas) return;
            const sources = [
                'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
                'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'
            ];
            const img = new Image();
            img.crossOrigin = 'anonymous';
            let index = 0;
            img.onload = () => setEarthTexture(img);
            img.onerror = () => {
                index += 1;
                if (index < sources.length) {
                    img.src = sources[index];
                } else {
                    earthTexCanvas = makeFallbackEarthTexture();
                    earthTexData = earthTexCanvas.getContext('2d').getImageData(0, 0, EARTH_TEX_W, EARTH_TEX_H).data;
                }
            };
            img.src = sources[0];
        }

        // Project a (lat, lng) point onto the 2D globe; null when it's on the far side.
        // Order matters for the poles: the globe is first spun around its own polar
        // (Y) axis — `rotY` picks which longitude faces you — and only then tilted
        // around the screen-X axis. So when you look straight at the North or South
        // pole (tilt ≈ ±90°) the pole stays pinned at the screen centre while the
        // whole disc spins cleanly, instead of the pole rolling off to the side.
        function globePoint(latDeg, lngDeg) {
            if (!globeCanvas) return null;
            const size = globeCanvas.width;
            const R = size * 0.40 * Math.max(0.8, globeZoom);
            const cx = size / 2 + viewDx, cy = size / 2 + viewDy;
            const c = globeRotY * Math.PI / 180;
            const t = globeTiltX * Math.PI / 180;
            const la = latDeg * Math.PI / 180, lo = lngDeg * Math.PI / 180;
            const gx = Math.cos(la) * Math.sin(lo);
            const gy = Math.sin(la);
            const gz = Math.cos(la) * Math.cos(lo);
            // 1) spin around the polar axis (rotY)
            const xf = gx * Math.cos(c) + gz * Math.sin(c);
            const zs = -gx * Math.sin(c) + gz * Math.cos(c);
            // 2) tilt around the screen-X axis (tilt)
            const yv = gy * Math.cos(t) - zs * Math.sin(t);
            const zv = gy * Math.sin(t) + zs * Math.cos(t);
            if (zv <= 0.02) return null;
            return { x: cx + xf * R, y: cy - yv * R, z: zv };
        }

        function drawGlobe() {
            if (!globeCtx || !globeCanvas) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const cssW = Math.max(180, globeCanvas.clientWidth || 320);
            const size = Math.round(cssW * dpr);
            if (globeCanvas.width !== size || globeCanvas.height !== size) {
                globeCanvas.width = size;
                globeCanvas.height = size;
            }
            const ctx = globeCtx;
            const R = size * 0.40 * Math.max(0.8, globeZoom);
            const cx = size / 2 + viewDx, cy = size / 2 + viewDy;
            const c = globeRotY * Math.PI / 180;
            const t = globeTiltX * Math.PI / 180;
            const cosC = Math.cos(c), sinC = Math.sin(c);
            const cosT = Math.cos(t), sinT = Math.sin(t);

            // soft atmosphere glow around the planet
            const glow = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, R * 1.3);
            glow.addColorStop(0, 'rgba(120,190,255,0.0)');
            glow.addColorStop(0.68, 'rgba(120,190,255,0.16)');
            glow.addColorStop(1, 'rgba(120,190,255,0.0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, size, size);

            // render the globe itself, pixel by pixel
            const img = ctx.createImageData(size, size);
            const out = img.data;
            const hasTex = !!earthTexData;
            const Lx = 0.55, Ly = 0.38, Lz = 0.74; // light direction
            if (!elNinoGrid) buildElNinoGrid(); // El Niño lookup table, built once

            for (let j = 0; j < size; j += 1) {
                for (let i = 0; i < size; i += 1) {
                    const nx = (i - cx) / R;
                    const ny = (cy - j) / R;
                    const z2 = 1 - nx * nx - ny * ny;
                    if (z2 <= 0) continue;
                    const nz = Math.sqrt(z2);
                    const idx = (j * size + i) * 4;

                    let r, g, b;
                    // inverse view transform -> lat/lon for this pixel.
                    // Mirror globePoint: undo the tilt first, then the polar spin.
                    const gy = ny * cosT + nz * sinT;
                    const zs = -ny * sinT + nz * cosT;
                    const gx = nx * cosC - zs * sinC;
                    const gz = nx * sinC + zs * cosC;
                    const latDeg = Math.asin(clampGlobe(gy, -1, 1)) * 180 / Math.PI;
                    const lngDeg = Math.atan2(gx, gz) * 180 / Math.PI;

                    let isOcean = true;
                    if (hasTex) {
                        // sample the earth texture (u right, v down on the map)
                        const u = (lngDeg / 180 + 1) / 2;
                        const v = (90 - latDeg) / 180;
                        const su = clampGlobe((u * EARTH_TEX_W) | 0, 0, EARTH_TEX_W - 1);
                        const sv = clampGlobe((v * EARTH_TEX_H) | 0, 0, EARTH_TEX_H - 1);
                        const to = (sv * EARTH_TEX_W + su) * 4;
                        r = earthTexData[to];
                        g = earthTexData[to + 1];
                        b = earthTexData[to + 2];
                        isOcean = (r < b && g < b);   // blue-dominant = ocean water
                    } else {
                        // no texture yet: plain ocean blue until the texture loads
                        r = 22; g = 62; b = 126;
                    }

                    // 🌊 El Niño warm-water tint, painted only over the ocean:
                    // the warmer the water, the redder it gets (orange when cooler).
                    if (isOcean && elNinoGrid) {
                        const anomaly = elNinoAnomalyAt(latDeg, lngDeg);
                        if (anomaly > 0.05) {
                            const sst = elNinoColor(anomaly);
                            r = r + (sst.r - r) * sst.a;
                            g = g + (sst.g - g) * sst.a;
                            b = b + (sst.b - b) * sst.a;
                        }
                    }

                    // sunlight + limb shading
                    if (hasTex) {
                        const light = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
                        const tone = (0.34 + 0.72 * light) * (0.84 + 0.16 * nz);
                        r = Math.min(255, r * tone);
                        g = Math.min(255, g * tone);
                        b = Math.min(255, b * tone);
                    } else {
                        const tone = 0.18 + 0.5 * Math.max(0, nz);
                        r = Math.min(255, r * tone);
                        g = Math.min(255, g * tone);
                        b = Math.min(255, b * tone);
                    }

                    out[idx] = Math.min(255, r);
                    out[idx + 1] = Math.min(255, g);
                    out[idx + 2] = Math.min(255, b);
                    out[idx + 3] = 255;
                }
            }
            ctx.putImageData(img, 0, 0);

            // subtle graticule (latitude / longitude lines)
            ctx.strokeStyle = 'rgba(150,205,255,0.10)';
            ctx.lineWidth = Math.max(1, size * 0.002);
            ctx.beginPath();
            for (let lat = -60; lat <= 60; lat += 30) {
                let prev = null;
                for (let lng = -180; lng <= 180; lng += 4) {
                    const p = globePoint(lat, lng);
                    if (p) { if (prev) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); prev = p; }
                    else { prev = null; }
                }
            }
            for (let lng = -150; lng <= 150; lng += 30) {
                let prev = null;
                for (let lat = -90; lat <= 90; lat += 4) {
                    const p = globePoint(lat, lng);
                    if (p) { if (prev) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); prev = p; }
                    else { prev = null; }
                }
            }
            ctx.stroke();

            // planet outline
            ctx.strokeStyle = 'rgba(150,210,255,0.35)';
            ctx.lineWidth = Math.max(1, size * 0.006);
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, 2 * Math.PI);
            ctx.stroke();

            // 🌦️ weather markers: clouds, thunder, rain and sun where they happen
            drawWeatherMarkers(ctx, cx, cy, R, size);

            // 🌀 live hurricanes (NOAA NHC): name + wind speed plotted on the globe
            drawLiveHurricanes(ctx, cx, cy, R, size);

            // pulsing "you are here" marker, tinted + labelled with the live weather condition
            const mp = globePoint(globeMarkerLat, globeMarkerLng);
            if (mp) {
                const you = youWeather;
                const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 3.2);
                const condition = (latestWeatherData && latestWeatherData.condition) || 'Locating…';
                const color = (you && WEATHER_COLOR[you.type]) || 'rgba(255,110,140,0.95)';
                const emoji = (you && you.emoji) || '📍';
                const rad = Math.max(8 * dpr, Math.min(20 * dpr, R * 0.052));
                ctx.save();
                ctx.shadowColor = color;
                ctx.shadowBlur = R * 0.05;
                ctx.strokeStyle = color;
                ctx.globalAlpha *= 0.45 + 0.35 * pulse;
                ctx.lineWidth = Math.max(1.2, R * 0.01);
                ctx.beginPath();
                ctx.arc(mp.x, mp.y, rad * (1.3 + 0.2 * pulse), 0, 2 * Math.PI);
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;

                const bg = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, rad);
                bg.addColorStop(0, 'rgba(255,255,255,0.96)');
                bg.addColorStop(1, color);
                ctx.fillStyle = bg;
                ctx.beginPath();
                ctx.arc(mp.x, mp.y, rad, 0, 2 * Math.PI);
                ctx.fill();

                ctx.font = '700 ' + Math.round(rad * 1.35) + 'px Inter, Segoe UI Emoji, Apple Color Emoji, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#10243f';
                ctx.fillText(emoji, mp.x, mp.y + rad * 0.12);

                ctx.font = '600 ' + Math.max(10, Math.round(R * 0.038)) + 'px Inter, system-ui, sans-serif';
                ctx.textBaseline = 'bottom';
                // live temperature placed on the globe together with the weather icon
                const liveTemp = (latestWeatherData && typeof latestWeatherData.temperature === 'number') ? Math.round(latestWeatherData.temperature) + '°C' : null;
                const youLabel = '● You · ' + condition + (liveTemp ? ' · ' + liveTemp : '');
                ctx.lineWidth = Math.max(1.5, R * 0.006);
                ctx.strokeStyle = 'rgba(6,18,38,0.85)';
                ctx.strokeText(youLabel, mp.x, mp.y - rad * 1.3);
                ctx.fillStyle = 'rgba(240,248,255,0.96)';
                ctx.fillText(youLabel, mp.x, mp.y - rad * 1.3);
                if (liveTemp) {
                    drawGlobeTempBadge(ctx, Math.round(latestWeatherData.temperature), mp.x + rad * 0.6, mp.y - rad * 0.55, dpr);
                }
                ctx.restore();
            }

            // 🌩️ rain, fog, thunderstorm and lightning at the "you" location
            drawYouWeatherEffects(ctx, cx, cy, R, size);
        }

        // Small pill badge that puts the temperature next to a globe weather icon.
        function drawGlobeTempBadge(ctx, tempC, x, y, dpr) {
            if (!Number.isFinite(tempC)) return;
            const d = Math.max(1, dpr || 1);
            const fontSize = Math.max(9, Math.round(9.5 * d));
            ctx.save();
            ctx.font = '800 ' + fontSize + 'px Inter, system-ui, sans-serif';
            const text = Math.round(tempC) + '°';
            const tw = ctx.measureText(text).width;
            const padX = 4 * d;
            const bw = tw + padX * 2;
            const bh = Math.max(13 * d, fontSize * 1.35);
            const bx = x - bw / 2, by = y - bh / 2;
            const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
            bg.addColorStop(0, 'rgba(12, 28, 52, 0.94)');
            bg.addColorStop(1, 'rgba(7, 18, 36, 0.94)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.moveTo(bx + bh / 2, by);
            ctx.arcTo(bx + bw, by, bx + bw, by + bh, bh / 2);
            ctx.arcTo(bx + bw, by + bh, bx, by + bh, bh / 2);
            ctx.arcTo(bx, by + bh, bx, by, bh / 2);
            ctx.arcTo(bx, by, bx + bw, by, bh / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = Math.max(0.6, 0.5 * d);
            ctx.stroke();
            ctx.fillStyle = '#ffd66b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y + 0.5 * d);
            ctx.restore();
        }

        function drawWeatherMarkers(ctx, cx, cy, R, size) {
            lastWeatherHits.length = 0;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const markerScale = Math.min(1.15, 0.6 + globeZoom * 0.22); // grow only slightly with zoom
            const now = performance.now();
            for (const m of WEATHER_MARKERS) {
                const p = globePoint(m.lat, m.lng);
                if (!p) continue; // far side of the planet
                const rad = Math.max(8 * dpr, Math.min(22 * dpr, R * 0.06 * markerScale));
                const pulse = 0.5 + 0.5 * Math.sin(now / 1000 * 2.4 + m.lat);
                const emoji = WEATHER_EMOJI[m.type] || '☁️';
                const color = WEATHER_COLOR[m.type] || 'rgba(200,220,255,0.8)';

                ctx.save();
                ctx.strokeStyle = color;
                ctx.globalAlpha *= 0.35 + 0.3 * pulse;
                ctx.lineWidth = Math.max(1.5, rad * 0.16);
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad * (1.25 + 0.18 * pulse), 0, 2 * Math.PI);
                ctx.stroke();
                ctx.globalAlpha = 1;

                const bg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
                bg.addColorStop(0, 'rgba(255,255,255,0.95)');
                bg.addColorStop(1, color.replace(/[\d.]+\)$/, '0.95)'));
                ctx.fillStyle = bg;
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
                ctx.fill();
                ctx.shadowColor = color;
                ctx.shadowBlur = rad * 0.5;

                ctx.font = (700) + ' ' + Math.round(rad * 1.35) + 'px Inter, Segoe UI Emoji, Apple Color Emoji, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#10243f';
                ctx.fillText(emoji, p.x, p.y + rad * 0.1);

                ctx.shadowBlur = 0;
                ctx.font = '600 ' + Math.max(10, Math.round(rad * 0.42)) + 'px Inter, system-ui, sans-serif';
                ctx.textBaseline = 'top';
                const labelY = p.y + rad * 1.05 + 10 * dpr;
                ctx.lineWidth = Math.max(1.5, rad * 0.10);
                ctx.strokeStyle = 'rgba(6,18,38,0.8)';
                ctx.strokeText(m.label, p.x, labelY);
                ctx.fillStyle = 'rgba(244,250,255,0.97)';
                ctx.fillText(m.label, p.x, labelY);
                // 🌡️ temperature badge right next to the weather icon
                if (typeof m.temp === 'number') {
                    drawGlobeTempBadge(ctx, m.temp, p.x + rad * 0.48, p.y - rad * 0.45, dpr);
                }
                ctx.restore();

                // ❄️ Snow markers: gentle drifting flakes around the pin
                if (m.type === 'snow') {
                    ctx.save();
                    for (let fl = 0; fl < 6; fl += 1) {
                        const seed = m.lat * 7 + fl * 11.3;
                        const fx = p.x + (hashNoise(seed, 1.7) - 0.5) * rad * 2.2 + Math.sin(now / 800 + seed) * rad * 0.3;
                        const phase = (now / 1100 + hashNoise(seed, 3.1)) % 1;
                        const fy = p.y + phase * rad * 1.8;
                        ctx.globalAlpha = 0.45 + 0.4 * hashNoise(seed, 5.2);
                        ctx.fillStyle = 'rgba(255,255,255,0.95)';
                        ctx.beginPath();
                        ctx.arc(fx, fy, Math.max(1, dpr) * (1 + hashNoise(seed, 6.4)), 0, 2 * Math.PI);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                    ctx.restore();
                }

                // 🌀 Hurricane markers: slowly rotating spiral arms
                if (m.type === 'hurricane') {
                    ctx.save();
                    ctx.lineCap = 'round';
                    for (let arm = 0; arm < 2; arm += 1) {
                        const armRot = now / 900 + arm * Math.PI;
                        ctx.strokeStyle = arm === 0 ? 'rgba(190, 150, 255, 0.75)' : 'rgba(255, 210, 150, 0.65)';
                        ctx.lineWidth = Math.max(1.5, rad * 0.12);
                        ctx.beginPath();
                        for (let a = 0; a <= 22; a += 1) {
                            const t = a / 22;
                            const ang = armRot + t * Math.PI * 3.2;
                            const rr = rad * (0.35 + 1.1 * t);
                            const xx = p.x + Math.cos(ang) * rr;
                            const yy = p.y + Math.sin(ang) * rr * 0.55; // elliptical, weather-map look
                            if (a === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
                        }
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                lastWeatherHits.push({ x: p.x, y: p.y, r: rad * 1.4, label: m.label, lat: m.lat, lng: m.lng, type: m.type });
            }
        }

        // ===== 🌀 Live hurricanes on the globe (NOAA NHC) =====
        // Every active storm is plotted at its real coordinates with a rotating
        // cyclone marker and a card showing its NAME + WIND SPEED (+ knots and
        // Saffir–Simpson category). Clicking a storm zooms into it.
        function drawLiveHurricanes(ctx, cx, cy, R, size) {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            for (const s of liveHurricanes) {
                if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
                const p = globePoint(s.lat, s.lng);
                if (!p) continue;
                const isHurricane = !!(s.category && s.category.num);
                const color = isHurricane ? 'rgba(255, 74, 54, 0.95)' : 'rgba(255, 168, 60, 0.95)';
                const rad = Math.max(9 * dpr, Math.min(26 * dpr, R * 0.07));
                const pulse = 0.5 + 0.5 * Math.sin(now / 900 + (s.lat || 0) * 3);

                ctx.save();
                // pulsing outer ring
                ctx.strokeStyle = color;
                ctx.globalAlpha *= 0.45 + 0.35 * pulse;
                ctx.lineWidth = Math.max(1.3, rad * 0.14);
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad * (1.35 + 0.18 * pulse), 0, 2 * Math.PI);
                ctx.stroke();
                ctx.globalAlpha = 1;

                // cyclone spiral arms (weather-map look)
                ctx.lineCap = 'round';
                for (let arm = 0; arm < 2; arm += 1) {
                    const armRot = now / 900 + arm * Math.PI + (s.lat || 0);
                    ctx.strokeStyle = arm === 0 ? color : 'rgba(255, 214, 150, 0.7)';
                    ctx.lineWidth = Math.max(1.4, rad * 0.12);
                    ctx.beginPath();
                    for (let a = 0; a <= 22; a += 1) {
                        const t = a / 22;
                        const ang = armRot + t * Math.PI * 3.2;
                        const rr = rad * (0.35 + 1.1 * t);
                        const xx = p.x + Math.cos(ang) * rr;
                        const yy = p.y + Math.sin(ang) * rr * 0.55;
                        if (a === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
                    }
                    ctx.stroke();
                }

                // NAME + WIND SPEED card above the cyclone
                const name = String(s.name || 'Storm');
                const windLine = (s.windKmh != null ? s.windKmh + ' km/h' : '—') +
                    (s.knots != null ? ' · ' + s.knots + ' kt' : '') +
                    (isHurricane ? ' · Cat ' + s.category.num : '');
                ctx.font = '800 ' + Math.max(10, Math.round(rad * 0.56)) + 'px Inter, system-ui, sans-serif';
                const nameW = ctx.measureText('🌀 ' + name).width;
                ctx.font = '700 ' + Math.max(8, Math.round(rad * 0.42)) + 'px Inter, system-ui, sans-serif';
                const windW = ctx.measureText(windLine).width;
                const padX = 7 * dpr;
                const lineGap = Math.max(12, rad * 0.68);
                const cardW = Math.max(nameW, windW) + padX * 2;
                const cardH = Math.max(13, rad * 0.5) * 2 + lineGap + 4 * dpr;
                const cardX = clampGlobe(p.x - cardW / 2, 4, Math.max(4, size - cardW - 4));
                const cardY = clampGlobe(p.y - rad * 2.4 - cardH, 4, Math.max(4, size - cardH - 4));
                ctx.fillStyle = 'rgba(8, 20, 40, 0.9)';
                ctx.strokeStyle = color;
                ctx.lineWidth = Math.max(1, dpr);
                ctx.beginPath();
                const cr = 8 * dpr;
                ctx.moveTo(cardX + cr, cardY);
                ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, cr);
                ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, cr);
                ctx.arcTo(cardX, cardY + cardH, cardX, cardY, cr);
                ctx.arcTo(cardX, cardY, cardX + cardW, cardY, cr);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '800 ' + Math.max(10, Math.round(rad * 0.56)) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('🌀 ' + name, cardX + cardW / 2, cardY + Math.max(7, rad * 0.52));
                ctx.font = '700 ' + Math.max(8, Math.round(rad * 0.42)) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#ffd66b';
                ctx.fillText(windLine, cardX + cardW / 2, cardY + Math.max(7, rad * 0.52) + lineGap);
                ctx.restore();

                lastWeatherHits.push({ x: p.x, y: p.y, r: rad * 2.4, label: s.name, lat: s.lat, lng: s.lng, type: 'hurricane' });
            }
        }

        // ===== 🌩️ Draw rain, fog, thunderstorm and lightning at the "you" location =====
        function drawYouWeatherEffects(ctx, cx, cy, R, size) {
            if (!youEffects || typeof globeMarkerLat !== 'number' || typeof globeMarkerLng !== 'number') return;
            const p = globePoint(globeMarkerLat, globeMarkerLng);
            if (!p) return; // far side of the planet
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const scale = Math.min(1.8, 0.55 + globeZoom * 0.38); // effects grow gently with zoom
            const baseR = Math.max(22 * dpr, R * 0.12 * scale);

            ctx.save();

            // ---- 🌫️ Fog: dense grey haze drifting around the location ----
            if (youEffects.fog) {
                const fogR = baseR * 2.2;
                const drift = Math.sin(now / 3500) * fogR * 0.15;
                const drift2 = Math.cos(now / 4200) * fogR * 0.08;
                const fog = ctx.createRadialGradient(p.x + drift, p.y + drift2, 0, p.x + drift, p.y + drift2, fogR);
                fog.addColorStop(0, 'rgba(205, 214, 224, 0.48)');
                fog.addColorStop(0.45, 'rgba(195, 205, 218, 0.32)');
                fog.addColorStop(0.8, 'rgba(190, 200, 212, 0.14)');
                fog.addColorStop(1, 'rgba(190, 200, 212, 0)');
                ctx.fillStyle = fog;
                ctx.beginPath();
                ctx.arc(p.x + drift, p.y + drift2, fogR, 0, 2 * Math.PI);
                ctx.fill();
                // second fog layer for depth
                const fog2 = ctx.createRadialGradient(p.x - drift * 0.6, p.y - drift2 * 0.5, 0, p.x - drift * 0.6, p.y - drift2 * 0.5, fogR * 0.7);
                fog2.addColorStop(0, 'rgba(215, 222, 232, 0.30)');
                fog2.addColorStop(1, 'rgba(215, 222, 232, 0)');
                ctx.fillStyle = fog2;
                ctx.beginPath();
                ctx.arc(p.x - drift * 0.6, p.y - drift2 * 0.5, fogR * 0.7, 0, 2 * Math.PI);
                ctx.fill();
            }

            // ---- ⛈️ Thunderstorm: dark towering cloud puffs overhead ----
            if (youEffects.thunder) {
                const cloudR = baseR * 1.35;
                const cloudY = p.y - baseR * 1.05;
                const puffCount = 8;
                for (let i = 0; i < puffCount; i += 1) {
                    const ang = (i / puffCount) * Math.PI * 2;
                    const px = p.x + Math.cos(ang) * cloudR * 0.6;
                    const py = cloudY + Math.sin(ang) * cloudR * 0.32;
                    const pr = cloudR * (0.5 + 0.22 * Math.sin(now / 800 + i * 1.7));
                    const cg = ctx.createRadialGradient(px, py, 0, px, py, pr);
                    cg.addColorStop(0, 'rgba(52, 60, 76, 0.92)');
                    cg.addColorStop(0.65, 'rgba(36, 42, 56, 0.82)');
                    cg.addColorStop(1, 'rgba(26, 30, 42, 0)');
                    ctx.fillStyle = cg;
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, 2 * Math.PI);
                    ctx.fill();
                }
                // dark anvil cloud base
                const anvil = ctx.createRadialGradient(p.x, cloudY + baseR * 0.1, 0, p.x, cloudY + baseR * 0.1, cloudR * 1.1);
                anvil.addColorStop(0, 'rgba(30, 35, 48, 0.55)');
                anvil.addColorStop(1, 'rgba(30, 35, 48, 0)');
                ctx.fillStyle = anvil;
                ctx.beginPath();
                ctx.arc(p.x, cloudY + baseR * 0.1, cloudR * 1.1, 0, 2 * Math.PI);
                ctx.fill();
            }

            // ---- 🌧️ Rain: heavy animated falling streaks ----
            if (youEffects.rain) {
                const rainW = baseR * 1.8;
                const rainH = baseR * 2.0;
                const rainTop = p.y - baseR * 0.65;
                const streakCount = Math.round(48 * scale);
                ctx.strokeStyle = 'rgba(110, 175, 255, 0.7)';
                ctx.lineWidth = Math.max(1.2, dpr * 1.5);
                ctx.lineCap = 'round';
                for (let i = 0; i < streakCount; i += 1) {
                    const seed = i * 12.9898;
                    const sx = p.x + (hashNoise(seed, 1.3) - 0.5) * rainW;
                    const speed = 0.45 + hashNoise(seed, 2.7) * 0.6;
                    const len = baseR * (0.12 + hashNoise(seed, 4.1) * 0.15);
                    const phase = (now / 1000 * speed + hashNoise(seed, 5.5) * 10) % 1;
                    const sy = rainTop + phase * rainH;
                    ctx.globalAlpha = 0.45 + 0.45 * hashNoise(seed, 6.9);
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx - len * 0.2, sy + len);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // ---- ⚡ Lightning: jagged bolt that flashes periodically ----
            if (youEffects.lightning) {
                const flashInterval = 1800 + hashNoise(globeMarkerLat, globeMarkerLng) * 1400;
                const elapsed = now - lastLightningTime;
                if (elapsed > flashInterval) {
                    lastLightningTime = now;
                    // build a jagged bolt from the cloud down to the marker
                    const startX = p.x + (hashNoise(now, 1) - 0.5) * baseR * 0.7;
                    const startY = p.y - baseR * 1.8;
                    const endY = p.y + baseR * 0.3;
                    const segs = 9;
                    const pts = [{ x: startX, y: startY }];
                    for (let s = 1; s < segs; s += 1) {
                        const t = s / segs;
                        pts.push({
                            x: startX + (hashNoise(now + s, 2) - 0.5) * baseR * 1.1,
                            y: startY + (endY - startY) * t
                        });
                    }
                    pts.push({ x: startX + (hashNoise(now + 9, 3) - 0.5) * baseR * 0.5, y: endY });
                    lightningBolt = { pts, born: now };
                }
                if (lightningBolt) {
                    const age = now - lightningBolt.born;
                    if (age < 400) {
                        const fade = 1 - age / 400;
                        // bright flash halo
                        const flash = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, baseR * 2.6);
                        flash.addColorStop(0, 'rgba(255, 250, 220, ' + (0.38 * fade) + ')');
                        flash.addColorStop(1, 'rgba(255, 250, 220, 0)');
                        ctx.fillStyle = flash;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, baseR * 2.6, 0, 2 * Math.PI);
                        ctx.fill();
                        // the bolt itself
                        ctx.strokeStyle = 'rgba(255, 244, 200, ' + fade + ')';
                        ctx.lineWidth = Math.max(2, dpr * 2.8);
                        ctx.lineJoin = 'round';
                        ctx.shadowColor = 'rgba(255, 240, 180, ' + (0.95 * fade) + ')';
                        ctx.shadowBlur = baseR * 0.6;
                        ctx.beginPath();
                        ctx.moveTo(lightningBolt.pts[0].x, lightningBolt.pts[0].y);
                        for (let s = 1; s < lightningBolt.pts.length; s += 1) {
                            ctx.lineTo(lightningBolt.pts[s].x, lightningBolt.pts[s].y);
                        }
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    } else {
                        lightningBolt = null;
                    }
                }
            }

            // ---- ❄️ Snow: drifting flakes when the live weather at this spot is snowy ----
            const liveCondition = String((latestWeatherData && latestWeatherData.condition) || '').toLowerCase();
            const liveSnow = liveCondition.includes('snow') || liveCondition.includes('sleet') || liveCondition.includes('freezing');
            if (youEffects.snow && liveSnow) {
                const snowW = baseR * 1.8;
                const snowTop = p.y - baseR * 1.6;
                for (let i = 0; i < 26; i += 1) {
                    const seed = i * 7.13;
                    const sx = p.x + (hashNoise(seed, 1.3) - 0.5) * snowW;
                    const speed = 0.20 + hashNoise(seed, 2.7) * 0.35;
                    const sway = Math.sin(now / 600 + seed) * baseR * 0.22;
                    const phase = (now / 1400 * speed + hashNoise(seed, 5.5) * 10) % 1;
                    const sy = snowTop + phase * baseR * 2.0;
                    ctx.globalAlpha = 0.4 + 0.5 * hashNoise(seed, 6.9);
                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.beginPath();
                    ctx.arc(sx + sway, sy, Math.max(1, dpr) * (0.9 + hashNoise(seed, 8.2)), 0, 2 * Math.PI);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // ---- 🌀 Hurricane: spinning rings when a named storm is about ----
            const liveHurricane = liveCondition.includes('hurricane') || liveCondition.includes('tornado') || liveCondition.includes('cyclone');
            if (youEffects.hurricane && liveHurricane) {
                const hr = baseR * 1.9;
                ctx.lineCap = 'round';
                for (let ring = 0; ring < 3; ring += 1) {
                    const r = hr * (0.5 + ring * 0.28);
                    ctx.strokeStyle = ring === 1 ? 'rgba(255, 210, 150, 0.7)' : 'rgba(190, 150, 255, 0.75)';
                    ctx.lineWidth = Math.max(1.5, dpr * (1.6 - ring * 0.3));
                    ctx.setLineDash([r * 0.25, r * 0.2]);
                    ctx.lineDashOffset = ring % 2 === 0 ? -now / 55 : now / 65;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            }

            ctx.restore();
        }

        function centerOn(lat, lng) {
            if (!globeCanvas) return;
            const size = globeCanvas.width;
            const p = globePoint(lat, lng);
            if (!p) return;
            viewDx += (size / 2 - p.x);
            viewDy += (size / 2 - p.y);
        }

        function flyToWeather(m, zoomIn) {
            focusedWeather = m ? { lat: m.lat, lng: m.lng, label: m.label, type: m.type } : null;
            if (m) {
                centerOn(m.lat, m.lng);
                globeZoomTarget = Math.min(2.6, Math.max(globeZoom, zoomIn ? 2.2 : 1.35));
            } else {
                globeZoomTarget = 1;
            }
            setGlobeStatus(m ? '🔎 Zoomed to ' + WEATHER_EMOJI[m.type] + ' ' + m.label : '🌍 Full globe view');
        }

        function flyToLocation(lat, lng, label, zoom) {
            if (!globeCanvas || typeof lat !== 'number' || typeof lng !== 'number') return;
            // Rotate + tilt the globe so the chosen (lat, lng) faces the viewer dead-centre,
            // then zoom in. This works for any location on Earth.
            const la = lat * Math.PI / 180;
            const lo = lng * Math.PI / 180;
            const gy = Math.sin(la);
            const gz = Math.cos(la) * Math.cos(lo);
            const gx = Math.cos(la) * Math.sin(lo);
            // polar-axis spin that brings this longitude to the front...
            const c = Math.atan2(-gx, gz);
            const zs = Math.sqrt(gx * gx + gz * gz);
            // ...then tilt the point straight at the viewer (in the new rotation
            // order this is simply the latitude, so polar locations reach ±90°)
            const t = Math.atan2(gy, zs);
            globeRotYTarget = (c * 180 / Math.PI + 360) % 360;
            globeTiltXTarget = clampGlobe(t * 180 / Math.PI, -90, 90);
            globeRotAnimating = true;
            viewDx = 0;
            viewDy = 0;
            // Keep the globe spinning (west→east) while the camera flies and holds at 2.2×.
            globeAutoRotate = true;
            // ease from the current zoom instead of jumping straight to the target (2.2× by default)
            globeZoomTarget = Math.min(3.2, Math.max(globeZoom, typeof zoom === 'number' ? zoom : 2.2));
            focusedWeather = youWeather ? { lat, lng, label, type: youWeather.type } : { lat, lng, label, type: 'you' };
            setGlobeStatus('📍 Zoomed to ' + label + ' — live ' + (latestWeatherData && latestWeatherData.condition ? latestWeatherData.condition : 'weather'));
        }

        function renderGlobeLoop(now) {
            requestAnimationFrame(renderGlobeLoop);
            const delta = (now - lastGlobeDraw) / 1000;
            if (delta < 0.033) return; // ~30 fps cap
            lastGlobeDraw = now;

            // smooth camera zoom + rotation (gentler fly-to on new locations)
            const flyEase = 0.07; // lower = slower, smoother zoom/rotate animation
            if (Math.abs(globeZoom - globeZoomTarget) > 0.01) {
                globeZoom += (globeZoomTarget - globeZoom) * flyEase;
            } else {
                globeZoom = globeZoomTarget;
            }
            if (globeRotAnimating && !globeDragging) {
                // While the globe is set to keep spinning, auto-rotate owns the
                // Y-axis spin (west→east): never lerp it toward the fly-to target,
                // or the spin would cancel and the globe would stall during the
                // zoom-in. The fly-to still eases the tilt for a nice presentation,
                // and `centerOn` below keeps the focused marker centred via the
                // view offset as the globe rotates underneath it.
                if (!globeAutoRotate) {
                    globeRotY = lerpGlobeAngle(globeRotY, globeRotYTarget, flyEase);
                }
                globeTiltX += (globeTiltXTarget - globeTiltX) * flyEase;
                const rotSettled = !globeAutoRotate && globeAngleDist(globeRotY, globeRotYTarget) < 0.05;
                if (Math.abs(globeTiltX - globeTiltXTarget) < 0.05 && (globeAutoRotate || rotSettled)) {
                    globeTiltX = globeTiltXTarget;
                    if (rotSettled) globeRotY = globeRotYTarget;
                    globeRotAnimating = false;
                }
            }
            if (focusedWeather && !globeDragging) centerOn(focusedWeather.lat, focusedWeather.lng);

            // Keep spinning the whole way while the camera zooms in to 2.2×
            // (and while holding exactly at 2.2×). Above 2.2× the spin stops —
            // the requirement is rotation continuing until 2.2× is reached.
            if (!globeDragging && globeAutoRotate && globeZoom <= GLOBE_AUTOROTATE_MAX_ZOOM) {
                globeRotY = (globeRotY + Math.min(delta, 0.1) * 7) % 360;
            }
            const zoomEl = document.getElementById('globe-zoom-label');
            if (zoomEl) zoomEl.textContent = globeZoom.toFixed(1) + '×';
            drawGlobe();
        }

        function zoomGlobeBy(factor) {
            globeZoomTarget = clampGlobe(globeZoomTarget * factor, 1, 3.2);
            if (globeZoomTarget <= 1.001 && focusedWeather) {
                focusedWeather = null;
                viewDx = 0;
                viewDy = 0;
                globeAutoRotate = true;
                setGlobeStatus('🌍 Full globe view');
            }
        }

        function resetGlobeView(updateStatus) {
            focusedWeather = null;
            globeZoom = 1;
            globeZoomTarget = 1;
            viewDx = 0;
            viewDy = 0;
            globeRotY = 20;
            globeRotYTarget = 20;
            globeTiltX = 0;
            globeTiltXTarget = 0;
            globeRotAnimating = false;
            globeAutoRotate = true;
            if (updateStatus) setGlobeStatus('🌍 View reset — showing your location');
        }

        function getGlobeCPR() {
            if (!globeCanvas) return 1;
            const clientW = globeCanvas.clientWidth || globeCanvas.width;
            return Math.max(1, globeCanvas.width / Math.max(1, clientW));
        }

        function handleGlobeClick(e) {
            if (!globeCanvas || !lastDragPoint) return;
            const dxs = e.clientX - lastDragPoint.x;
            const dys = e.clientY - lastDragPoint.y;
            if (dxs * dxs + dys * dys > 60) return; // this was a drag, not a click
            const dpr = getGlobeCPR();
            const grabX = e.clientX * dpr;
            const grabY = e.clientY * dpr;

            let best = null, bestDist = 1e9;
            for (const h of lastWeatherHits) {
                const d = (h.x - grabX) * (h.x - grabX) + (h.y - grabY) * (h.y - grabY);
                if (d < bestDist) { bestDist = d; best = h; }
            }
            if (best && Math.sqrt(bestDist) <= best.r) {
                flyToWeather(best, true);
                return;
            }
            if (typeof globeMarkerLat === 'number' && typeof globeMarkerLng === 'number') {
                const you = globePoint(globeMarkerLat, globeMarkerLng);
                if (you) {
                    const size = globeCanvas.width;
                    const R = size * 0.40 * Math.max(0.8, globeZoom);
                    if (Math.hypot(you.x - grabX, you.y - grabY) < R * 0.12) {
                        focusedWeather = { lat: globeMarkerLat, lng: globeMarkerLng, label: 'Your location', type: 'you' };
                        centerOn(globeMarkerLat, globeMarkerLng);
                        globeZoomTarget = 2.2;
                        globeAutoRotate = true;
                        setGlobeStatus('📍 Zoomed to your location');
                    }
                }
            }
        }

        function updateGlobeMarker(data) {
            if (!data) return;
            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                globeMarkerLat = data.latitude;
                globeMarkerLng = data.longitude;
            }
            const name = data.location || 'Unknown location';
            if (globeNameEl) {
                globeNameEl.textContent = name;
                globeNameEl.title = 'GPS ' + globeMarkerLat.toFixed(4) + ', ' + globeMarkerLng.toFixed(4);
            }
            youWeather = {
                lat: globeMarkerLat,
                lng: globeMarkerLng,
                label: name,
                type: conditionToMarkerType(data.condition),
                emoji: data.icon || getWeatherIcon(data.condition, data.weatherCode)
            };
            setGlobeStatus(gpsCoords ? '📍 Live GPS · ' + name : '📍 ' + name);

            // Fill the "globe weather" box (was previously stuck on "Loading…")
            const temp = data.temperature ?? '--';
            const condition = data.condition || 'Unknown';
            if (globeWeatherIconEl) globeWeatherIconEl.textContent = data.icon || getWeatherIcon(condition, data.weatherCode);
            if (globeWeatherTempEl) globeWeatherTempEl.textContent = (typeof temp === 'number' ? temp + '°' : temp);
            if (globeWeatherCondEl) globeWeatherCondEl.textContent = condition;
            if (globeWeatherEffectsEl) {
                const c = String(condition).toLowerCase();
                const chips = [];
                if (c.includes('thunder')) chips.push('⛈️ Thunder');
                if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) chips.push('🌧️ Rain');
                if (c.includes('snow') || c.includes('sleet') || c.includes('hail')) chips.push('❄️ Snow');
                if (c.includes('fog') || c.includes('mist')) chips.push('🌫️ Fog');
                if (c.includes('hurricane') || c.includes('tornado') || c.includes('cyclone')) chips.push('🌀 Storm');
                if (c.includes('wind')) chips.push('💨 Wind');
                if (c.includes('cloud') || c.includes('overcast')) chips.push('☁️ Clouds');
                if (c.includes('clear') || c.includes('sun')) chips.push('☀️ Clear');
                globeWeatherEffectsEl.innerHTML = chips.map((t) => `<span class="globe-weather-effect-chip">${t}</span>`).join('');
            }
        }

        // ===== 📍 Connection-aware GPS / location (WiFi & mobile data) =====
        // Detect the current connection so we pick a strategy that works for both
        // a laptop on WiFi and a phone on a slow mobile network.
        function getConnectionInfo() {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (!conn) return { effectiveType: '4g', saveData: false };
            return {
                effectiveType: conn.effectiveType || '4g',  // slow-2g | 2g | 3g | 4g
                saveData: !!conn.saveData
            };
        }

        // Wrap the one-shot geolocation call in a Promise so we can chain attempts.
        function requestPosition(opts) {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) reject(new Error('unsupported'));
                else navigator.geolocation.getCurrentPosition(resolve, reject, opts);
            });
        }

        // Best-effort IP-based location fallback. Works indoors, on WiFi and on
        // mobile data — the places where a satellite GPS fix often can't lock.
        async function ipBasedLocation() {
            const sources = [
                {
                    url: 'https://ipwho.is/',
                    parse: (d) => {
                        const lat = Number(d.latitude), lng = Number(d.longitude);
                        if (!isFinite(lat) || !isFinite(lng)) return null;
                        const label = [d.city, d.country].filter(Boolean).join(', ') || 'current location';
                        return { latitude: lat, longitude: lng, label };
                    }
                },
                {
                    url: 'https://ipapi.co/json/',
                    parse: (d) => {
                        const lat = Number(d.latitude), lng = Number(d.longitude);
                        if (!isFinite(lat) || !isFinite(lng)) return null;
                        const label = [d.city, d.country_name].filter(Boolean).join(', ') || 'current location';
                        return { latitude: lat, longitude: lng, label };
                    }
                }
            ];
            for (const src of sources) {
                try {
                    const res = await fetch(src.url, { signal: AbortSignal.timeout(6000) });
                    if (!res.ok) continue;
                    const data = await res.json();
                    const parsed = src.parse(data);
                    if (parsed) return parsed;
                } catch (e) { /* try the next source */ }
            }
            return null;
        }

        function setGpsIdle(label) {
            if (gpsBtnEl) { gpsBtnEl.disabled = false; gpsBtnEl.textContent = label || '📍 Use my location'; }
        }

        function applyGpsPosition(latitude, longitude, statusLabel, name) {
            globeMarkerLat = latitude;
            globeMarkerLng = longitude;
            locationInput.value = latitude.toFixed(5) + ', ' + longitude.toFixed(5);
            setGpsIdle('📍 My GPS location');
            if (name && globeNameEl) globeNameEl.textContent = name;
            setGlobeStatus((statusLabel || 'Location') + ' captured — updating weather…');
            updateLocation(true);
            // Keep the push-notification subscription pointed at the user's current
            // position so alerts always reflect "here" — wherever they travel.
            refreshPushCoordinates();
        }


        async function useMyLocation() {
            if (!globeCanvas) return;
            if (!window.isSecureContext) {
                setGlobeStatus('Location needs a secure page (https or localhost)', true);
                return;
            }
            if (gpsBtnEl) { gpsBtnEl.disabled = true; gpsBtnEl.textContent = 'Locating…'; }

            const conn = getConnectionInfo();
            // On slow mobile data, the satellite GPS chip rarely locks quickly and
            // drains the radio/battery — so skip it and use tower/WiFi + assisted GPS.
            const slowConnection = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.saveData;
            setGlobeStatus(slowConnection
                ? 'Locating… (mobile data — lighter location mode)'
                : 'Locating your position (GPS / network)…');

            // 1) Reuse a fresh cached position for an instant result (no re-lock).
            const CACHE_MS = 5 * 60 * 1000;
            if (gpsCoords && Date.now() - (gpsCoords.timestamp || 0) < CACHE_MS) {
                applyGpsPosition(gpsCoords.latitude, gpsCoords.longitude, '📍 Live GPS (cached)', gpsCoords.label);
                return;
            }

            // 2) Connection-aware attempts: high accuracy only when it makes sense,
            //    then a standard WiFi/cell-tower + assisted GPS attempt for indoors.
            const attempts = [];
            if (navigator.geolocation) {
                if (!slowConnection) {
                    attempts.push({ mode: 'GPS (high accuracy)', opts: { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 } });
                }
                attempts.push({ mode: 'WiFi / mobile network', opts: { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 } });
            }

            for (const attempt of attempts) {
                setGlobeStatus('Locating via ' + attempt.mode + '…');
                try {
                    const pos = await requestPosition(attempt.opts);
                    const { latitude, longitude, accuracy } = pos.coords;
                    const acc = typeof accuracy === 'number' ? ' · ±' + Math.round(accuracy) + ' m' : '';
                    gpsCoords = { latitude, longitude, timestamp: Date.now(), label: (attempt.mode + acc) };
                    applyGpsPosition(latitude, longitude, '📍 ' + attempt.mode + acc, null);
                    return;
                } catch (err) {
                    if (err && err.code === 1) { // permission denied — stop asking
                        setGpsIdle();
                        setGlobeStatus('Location permission denied — enable it in your browser settings', true);
                        return;
                    }
                    // timeout / unavailable → try the next, more reliable method
                }
            }

            // 3) GPS could not get a fix → IP-based location (great indoors on WiFi
            //    and on mobile data, no satellite needed; approximate to city level).
            setGpsIdle();
            setGlobeStatus('No satellite fix — trying IP-based location…');
            const ip = await ipBasedLocation();
            if (ip) {
                gpsCoords = { latitude: ip.latitude, longitude: ip.longitude, timestamp: Date.now(), label: 'IP (approximate)' };
                applyGpsPosition(ip.latitude, ip.longitude, '📍 IP (approx)', ip.label);
                return;
            }

            setGlobeStatus('Could not get your location — check location permission or your connection', true);
        }

        if (globeCanvas) {
            globeCanvas.addEventListener('pointerdown', (e) => {
                globeDragging = true;
                globeRotAnimating = false; // let the user take control of the globe
                globeAutoRotate = false;
                globeCanvas.classList.add('dragging');
                try { globeCanvas.setPointerCapture(e.pointerId); } catch (err) {}
                lastDragPoint = { x: e.clientX, y: e.clientY };
            });
            globeCanvas.addEventListener('pointermove', (e) => {
                if (!globeDragging || !lastDragPoint) return;
                globeRotY = (globeRotY + (e.clientX - lastDragPoint.x) * 0.35) % 360;
                globeTiltX = clampGlobe(globeTiltX + (e.clientY - lastDragPoint.y) * 0.3, -90, 90);
                lastDragPoint = { x: e.clientX, y: e.clientY };
            });
            const endDrag = (e) => {
                globeDragging = false;
                globeCanvas.classList.remove('dragging');
                if (globeZoom <= GLOBE_AUTOROTATE_MAX_ZOOM) globeAutoRotate = true;
                handleGlobeClick(e);
            };
            globeCanvas.addEventListener('pointerup', endDrag);
            globeCanvas.addEventListener('pointercancel', endDrag);
            globeCanvas.addEventListener('dblclick', () => resetGlobeView(true));
            globeCanvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                zoomGlobeBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
            }, { passive: false });

            const zoomInBtn = document.getElementById('globe-zoom-in');
            const zoomOutBtn = document.getElementById('globe-zoom-out');
            const zoomResetBtn = document.getElementById('globe-zoom-reset');
            if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomGlobeBy(1.18));
            if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomGlobeBy(1 / 1.18));
            if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => resetGlobeView(true));

            if (gpsBtnEl) gpsBtnEl.addEventListener('click', useMyLocation);
            loadEarthTexture();
            lastGlobeDraw = performance.now();
            requestAnimationFrame(renderGlobeLoop);
        }

        if (localMapCanvas) {
            localMapCanvas.addEventListener('mousemove', handleLocalMapHover);
            localMapCanvas.addEventListener('mouseleave', () => {
                if (localMapCellInfo) localMapCellInfo.textContent = '';
            });
            localMapCanvas.addEventListener('touchstart', (e) => {
                const t = e.touches && e.touches[0];
                if (t) handleLocalMapHover({ clientX: t.clientX, clientY: t.clientY });
            }, { passive: true });
        }
        let localMapResizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(localMapResizeTimer);
            localMapResizeTimer = setTimeout(() => renderLocalMap(latestWeatherData), 150);
        });

        let locationDebounce;
        locationInput.addEventListener('input', () => {
            clearTimeout(locationDebounce);
            locationDebounce = setTimeout(() => {
                const nextLocation = locationInput.value.trim();
                if (nextLocation !== activeLocation) {
                    updateLocation(false);
                }
            }, 800);
        });

        manualBtn.addEventListener('click', () => updateLocation(true));
        locationInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                clearTimeout(locationDebounce);
                updateLocation(true);
            }
        });

// ===== 📲 PWA install button + 🔔 push alert notifications =====
        // Alerts trigger for rain, hail, snow and wind ABOVE Beaufort 4 (> 28 km/h)
        // expected in the next 3 hours at the user's own location, anywhere on Earth.
        let deferredInstallPrompt = null;
        let pushSubscription = null;
        let vapidPublicKey = null;
        let lastAlertSignature = null;

        const isIOS = !!(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

        function setAlertsStatus(text) {
            if (alertsStatusEl) alertsStatusEl.textContent = text;
        }

        // ---- install prompt (Chrome / Edge / Android WebView, etc.) ----
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            if (installBtn) installBtn.style.display = 'inline-flex';
        });
        window.addEventListener('appinstalled', () => {
            if (installBtn) installBtn.style.display = 'none';
            if (iosHintEl) iosHintEl.style.display = 'none';
            deferredInstallPrompt = null;
        });

        // Show the 📲 Download button in EVERY browser that is not already running as an
        // installed app. iOS Safari never fires `beforeinstallprompt` and offers no
        // native install prompt, so the button must not be gated on that event —
        // otherwise it stays permanently hidden on iPhone / iPad (and in browsers
        // like Firefox that never fire it either). Tapping it runs the native
        // install prompt where available, or reveals the "Share → Add to Home
        // Screen" steps on iOS (see installApp below).
        const runsStandalone = (navigator.standalone === true) ||
            (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
        if (!runsStandalone) {
            if (installBtn) installBtn.style.display = 'inline-flex';
        }

        async function installApp() {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                try {
                    const choice = await deferredInstallPrompt.userChoice;
                    if (choice.outcome === 'accepted' && installBtn) installBtn.style.display = 'none';
                } catch (e) {
                    console.warn('Install prompt dismissed', e);
                }
                deferredInstallPrompt = null;
            } else if (isIOS) {
                if (iosHintEl) {
                    iosHintEl.style.display = 'block';
                    iosHintEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                setAlertsStatus('Open your browser menu (⋯) and choose "Install app", "Install", or "Add to Home screen".');
            }
        }

        if (installBtn) installBtn.addEventListener('click', installApp);

        // ---- 📱 Install note — PWA only, no APK file (Google Play Protect has nothing to block) ----
        function showInstallNote() {
            if (!installNoteEl) return;
            const isAndroid = /android/i.test(navigator.userAgent || '');
            let html = '';
            if (isAndroid) {
                html = 'ℹ️ <b>No APK download, nothing for Google Play Protect to block.</b> This app installs straight from the browser — Google Play is not involved. In Chrome choose <b>“Install app”</b> (⋮ menu) or <b>“Add to Home screen”</b>.';
            } else if (isIOS) {
                html = 'ℹ️ <b>No APK download.</b> This is a web app (PWA) — Google Play Play Protect does not apply to it. Tap <b>Share</b> ⬆️ then <b>“Add to Home Screen”</b>.';
            } else {
                html = 'ℹ️ <b>No APK download.</b> This is an installable web app (PWA) served over HTTPS — it installs straight from the browser, so Google Play Play Protect has nothing to block.';
            }
            installNoteEl.innerHTML = html;
        }
        if (installNoteEl) installNoteEl.style.display = 'block';
        showInstallNote();

        // ===== 🌀 Storm names — official 2026 WMO lists (Atlantic + East Pacific) =====
        // Verified against NOAA NHC (https://www.nhc.noaa.gov/aboutnames.shtml).
        // 2026 reuses the 2020 lists; retired "Laura" was replaced by "Leah".
        const ATLANTIC_STORM_NAMES_2026 = [
            'Arthur', 'Bertha', 'Cristobal', 'Dolly', 'Edouard', 'Fay', 'Gonzalo', 'Hanna',
            'Isaias', 'Josephine', 'Kyle', 'Leah', 'Marco', 'Nana', 'Omar', 'Paulette',
            'Rene', 'Sally', 'Teddy', 'Vicky', 'Wilfred'
        ];
        const PACIFIC_STORM_NAMES_2026 = [
            'Amanda', 'Boris', 'Cristina', 'Douglas', 'Elida', 'Fausto', 'Genevieve',
            'Hernan', 'Iselle', 'Julio', 'Karina', 'Lowell', 'Marie', 'Norbert',
            'Odalys', 'Polo', 'Rachel', 'Simon', 'Trudy', 'Vance', 'Winnie',
            'Xavier', 'Yolanda', 'Zeke'
        ];
        const STORM_CLASS_LABELS = {
            TD: 'Tropical Depression',
            TS: 'Tropical Storm',
            HU: 'Hurricane',
            EX: 'Post-Tropical',
            SS: 'Subtropical Storm',
            SD: 'Subtropical Depression',
            LO: 'Low',
            WV: 'Tropical Wave'
        };
        function stormClassLabel(code) {
            return STORM_CLASS_LABELS[String(code || '').toUpperCase()] || String(code || 'storm');
        }
        function escapeHtml(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        // Saffir–Simpson hurricane category from the NHC wind reading (knots).
        // 1 knot = 1.852 km/h. NHC 'intensity' is always in knots.
        const SAFFIR_SIMPSON_STEPS = [
            { knots: 137, cat: 5 },
            { knots: 113, cat: 4 },
            { knots: 96, cat: 3 },
            { knots: 83, cat: 2 },
            { knots: 64, cat: 1 }
        ];
        function hurricaneCategory(knots) {
            if (!Number.isFinite(knots)) return null;
            if (knots < 34) return { num: null, label: 'Tropical Depression' };
            if (knots < 64) return { num: null, label: 'Tropical Storm' };
            for (const step of SAFFIR_SIMPSON_STEPS) {
                if (knots >= step.knots) return { num: step.cat, label: 'Hurricane Cat ' + step.cat };
            }
            return { num: 1, label: 'Hurricane Cat 1' };
        }
        function renderStormNames(activeStorms) {
            const atlWrap = document.getElementById('atlantic-names');
            const pacWrap = document.getElementById('pacific-names');
            const activeWrap = document.getElementById('storm-active');
            if (!atlWrap || !pacWrap) return;

            const activeNames = new Set((activeStorms || []).map((s) => s.name));
            const chip = (name, isActive) => `<span class="storm-names-chip${isActive ? ' active' : ''}">${name}</span>`;
            atlWrap.innerHTML = ATLANTIC_STORM_NAMES_2026.map((n) => chip(n, activeNames.has(n))).join('');
            pacWrap.innerHTML = PACIFIC_STORM_NAMES_2026.map((n) => chip(n, activeNames.has(n))).join('');

            if (activeWrap) {
                if (activeStorms && activeStorms.length) {
                    // Hurricanes & storms ranked #1–10, strongest first: name · category · speed.
                    const sorted = activeStorms.slice().sort((a, b) => (b.knots || -Infinity) - (a.knots || -Infinity));
                    const items = sorted.slice(0, 10).map((s, i) => {
                        const cat = hurricaneCategory(s.knots);
                        const kind = stormClassLabel(s.classification);
                        const wind = s.windKmh != null ? s.windKmh + ' km/h' : '—';
                        const knots = s.knots != null ? s.knots + ' kt' : '';
                        const updated = s.lastUpdate
                            ? 'Updated ' + new Date(s.lastUpdate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '';
                        const catChip = cat && cat.num
                            ? `<span class="storm-cat">Category ${cat.num}</span>`
                            : `<span class="storm-cat">${escapeHtml(kind)}</span>`;
                        return `<a class="storm-active-row" href="https://www.nhc.noaa.gov/" target="_blank" rel="noopener">
                            <span class="storm-rank">${i + 1}</span>
                            <span class="storm-name-cell"><b>🌀 ${escapeHtml(s.name)}</b>${updated ? `<small>${updated}</small>` : ''}</span>
                            ${catChip}
                            <span class="storm-wind"><b>${wind}</b>${knots ? `<small>${knots}</small>` : ''}</span>
                        </a>`;
                    }).join('');
                    activeWrap.innerHTML = `<div class="storm-active-title">Active right now (NOAA NHC) — ranked by strength:</div>
                        <div class="storm-active-list">${items}</div>`;
                    activeWrap.hidden = false;
                } else {
                    activeWrap.hidden = true;
                    activeWrap.innerHTML = '';
                }
            }
        }

        // Fetch live active storm names from the same-origin /api/nhc proxy (never cache).
        async function fetchActiveStorms() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 6000);
                const res = await fetch('/api/nhc', { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                const storms = Array.isArray(data.activeStorms)
                    ? data.activeStorms.filter((s) => s.name).map((s) => {
                        const knots = typeof s.intensityKnots === 'number' ? s.intensityKnots : null;
                        return {
                            name: s.name,
                            classification: s.classification,
                            knots,
                            windKmh: knots != null ? Math.round(knots * 1.852) : null,
                            lat: typeof s.lat === 'number' ? s.lat : null,
                            lng: typeof s.lng === 'number' ? s.lng : null,
                            category: hurricaneCategory(knots),
                            lastUpdate: s.lastUpdate
                        };
                    })
                    : [];
                liveHurricanes = storms; // keep the globe in sync with the leaderboard
                renderStormNames(storms);
            } catch (e) {
                console.warn('Could not fetch active storms, showing reference lists only.', e);
                liveHurricanes = [];
                renderStormNames([]);
            }
        }

        fetchActiveStorms();
        // Hurricane updates refresh much faster: every 20 seconds (the /api/nhc proxy
        // only caches for 60 s, and NOAA typically issues new advisories every few hours).
        setInterval(() => fetchActiveStorms(), 20000);

        // ---- service worker + push helpers ----
        function urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; i += 1) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        }

        async function getVapidPublicKey() {
            if (vapidPublicKey) return vapidPublicKey;
            try {
                const res = await fetch('/api/push?action=info');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                vapidPublicKey = data.publicKey;
                return vapidPublicKey;
            } catch (e) {
                console.warn('Could not fetch VAPID key', e);
                return null;
            }
        }

        async function registerServiceWorker() {
            if (!('serviceWorker' in navigator)) return null;
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;
                return reg;
            } catch (e) {
                console.warn('Service worker registration failed', e);
                return null;
            }
        }

        function pushSupported() {
            // NOTE: iOS Safari (16.4+, installed as a home-screen PWA) supports push +
            // notifications but does NOT expose the global `Notification` object, so it
            // must not be part of the capability check or alerts would never enable on
            // iPhone / iPad.
            return 'serviceWorker' in navigator && 'PushManager' in window;
        }

        function currentCoordinates() {
            if (latestWeatherData && typeof latestWeatherData.latitude === 'number' &&
                typeof latestWeatherData.longitude === 'number') {
                return {
                    lat: latestWeatherData.latitude,
                    lng: latestWeatherData.longitude,
                    label: latestWeatherData.location || ''
                };
            }
            if (gpsCoords && typeof gpsCoords.latitude === 'number') {
                return {
                    lat: gpsCoords.latitude,
                    lng: gpsCoords.longitude,
                    label: gpsCoords.label || 'GPS location'
                };
            }
            return null;
        }
async function postPushAction(payload) {
            const res = await fetch('/api/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }

        async function enableAlerts() {
            if (!pushSupported()) {
                setAlertsStatus('This browser does not support push notifications. You can still use the 📲 Download app button and see on-screen weather warnings.');
                return;
            }
            if (!window.isSecureContext) {
                setAlertsStatus('Notifications need a secure connection (https or localhost).');
                return;
            }
            try {
                // iOS Safari has no `Notification.requestPermission()` — permission is
                // granted implicitly when `pushManager.subscribe()` is called below
                // (iOS 16.4+ installed PWA), so only ask explicitly where it exists.
                if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        setAlertsStatus('Notifications blocked. Allow them in your browser settings to get alert pushes.');
                        return;
                    }
                }

                const reg = await registerServiceWorker();
                if (!reg) {
                    setAlertsStatus('Service worker failed — cannot enable alerts.');
                    return;
                }

                const key = await getVapidPublicKey();
                pushSubscription = await reg.pushManager.getSubscription();
                if (!pushSubscription) {
                    if (!key) {
                        setAlertsStatus('Push service is not configured yet — try again in a few minutes.');
                        return;
                    }
                    try {
                        pushSubscription = await reg.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(key)
                        });
                    } catch (subErr) {
                        // iOS: every subscribe() call triggers the OS notification
                        // prompt; it can fail when the app isn't installed yet or
                        // when the permission was declined / not granted.
                        if (isIOS && !runsStandalone) {
                            setAlertsStatus('On iPhone / iPad first tap 📲 Download app and choose “Add to Home Screen”, then open the app icon and tap Enable alerts. (Push alerts work in the installed app.)');
                        } else if (isIOS) {
                            setAlertsStatus('Notifications were not allowed. Turn on “Notifications” for this app in iOS Settings, then try again.');
                        } else {
                            setAlertsStatus('Notification permission was declined. Allow notifications in your browser settings, then try again.');
                        }
                        return;
                    }
                }

                const coords = currentCoordinates();
                await postPushAction({
                    action: 'register',
                    subscription: pushSubscription.toJSON(),
                    lat: coords ? coords.lat : undefined,
                    lng: coords ? coords.lng : undefined,
                    label: coords ? coords.label : ''
                });

                if (alertsBtn) {
                    alertsBtn.textContent = '🔔 Alerts enabled';
                    alertsBtn.classList.add('success');
                }
                setAlertsStatus('You will be notified when rain, hail, snow or wind above Beaufort 4 is expected here. Tap the button again to turn notifications off.');
            } catch (e) {
                console.error('Enable alerts failed', e);
                setAlertsStatus('Could not enable alerts (' + e.message + ').');
            }
        }
        // Turn push notifications off with the very same 🔔 button.
        async function disableAlerts() {
            try {
                let sub = pushSubscription;
                if (!sub) {
                    const reg = await registerServiceWorker();
                    if (reg) sub = await reg.pushManager.getSubscription();
                }
                if (sub) {
                    try {
                        await postPushAction({ action: 'unregister', endpoint: sub.endpoint });
                    } catch (e) {
                        console.warn('Unregister API call failed (subscription still removed locally).', e);
                    }
                    try {
                        await sub.unsubscribe();
                    } catch (e) {
                        console.warn('Browser unsubscribe failed', e);
                    }
                }
                pushSubscription = null;
                lastAlertSignature = null;
                if (alertsBtn) {
                    alertsBtn.textContent = '🔔 Enable weather alerts';
                    alertsBtn.classList.remove('success');
                }
                setAlertsStatus('Notifications turned off. Tap the button again to turn them back on.');
            } catch (e) {
                console.error('Disable alerts failed', e);
                setAlertsStatus('Could not turn off alerts (' + e.message + ').');
            }
        }
async function sendTestPush() {
            try {
                const reg = await registerServiceWorker();
                const sub = reg ? await reg.pushManager.getSubscription() : null;
                if (sub) await postPushAction({ action: 'test', endpoint: sub.endpoint });
            } catch (e) {
                console.warn('Test push failed', e);
            }
        }

        async function refreshPushCoordinates() {
            try {
                const reg = await navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null;
                const sub = reg ? await reg.pushManager.getSubscription() : null;
                if (!sub) return;
                const coords = currentCoordinates();
                await postPushAction({
                    action: 'refresh',
                    endpoint: sub.endpoint,
                    lat: coords ? coords.lat : undefined,
                    lng: coords ? coords.lng : undefined,
                    label: coords ? coords.label : ''
                });
            } catch (e) {
                console.warn('Coordinate refresh failed', e);
            }
        }

        if (alertsBtn) {
            alertsBtn.addEventListener('click', async () => {
                const reg = await registerServiceWorker();
                const existing = reg ? await reg.pushManager.getSubscription() : null;
                if (existing && alertsBtn.classList.contains('success')) {
                    await disableAlerts();   // same button now ALSO turns notifications off
                } else {
                    await enableAlerts();
                }
            });
        }

        // If the user already granted permission once, silently re-attach push.
        // On iOS there is no `Notification` global, so fall back to just checking
        // whether a subscription already exists (which implies permission was kept).
        if (pushSupported() && ('Notification' in window ? Notification.permission === 'granted' : isIOS)) {
            (async () => {
                try {
                    const reg = await registerServiceWorker();
                    if (reg) {
                        const sub = await reg.pushManager.getSubscription();
                        if (sub) {
                            pushSubscription = sub;
                            if (alertsBtn) {
                                alertsBtn.textContent = '🔔 Alerts enabled';
                                alertsBtn.classList.add('success');
                            }
                            setAlertsStatus('Alerts are enabled for this device.');
                            await refreshPushCoordinates();
                        }
                    }
                } catch (e) {
                    console.warn('Push re-attach skipped', e);
                }
            })();
        }

        // ----- in-page alert banner + instant client-side notification -----
        // The page already refreshes its forecast every 30 seconds, so this gives
        // near-real-time alerts while the app is open (every plan). The server
        // cron (/api/push?action=notify) is the catch-up when the app is closed.
        function updateAlertsFromWeather(data) {
            const summary = data && data.nowcast ? data.nowcast.summary : null;
            if (!summary || !alertBannerEl) return;

            const parts = [];
            if (summary.hasRain) parts.push('🌧️ Rain');
            if (summary.hasHail) parts.push('🌨️ Hail');
            if (summary.hasSnow) parts.push('❄️ Snow');
            if (summary.strongWindAbove4) {
                parts.push('💨 Wind > Beaufort 4' + (summary.maxWindKmh ? ` (${summary.maxWindKmh} km/h)` : ''));
            }
            const signature = parts.length ? parts.join('|') : 'none';

            if (parts.length) {
                const place = data.location || 'your location';
                alertBannerEl.innerHTML = `<strong>⚠️ Weather alert — next 3 hours</strong><br>${parts.join(' · ')} expected in <strong>${place}</strong>.`;
                alertBannerEl.classList.add('show');

                // Fire an instant native notification the first time this exact
                // set of alerts appears (dedupe) — only if the user enabled alerts.
                if (pushSubscription && signature !== lastAlertSignature) {
                    fireLocalNotification('⛈️ Weather alert', parts.join(' · ') + ' expected in ' + place);
                }
                lastAlertSignature = signature;
            } else {
                alertBannerEl.classList.remove('show');
                if (lastAlertSignature) lastAlertSignature = null;
            }
        }

        async function fireLocalNotification(title, body) {
            try {
                const reg = await registerServiceWorker();
                if (!reg) return;
                await reg.showNotification(title, {
                    body,
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    tag: 'weather-alert-local',
                    renotify: true
                });
            } catch (e) {
                console.warn('Local notification failed', e);
            }
        }
                // ===== 🛰️ MapLibre GL — the professional top-down local weather radar =====
        // The old hand-drawn canvas radar is replaced by a real WebGL map: a free
        // professional vector basemap (colourful or dark night-radar style), the
        // Open-Meteo grid painted as crisp GeoJSON cells, Beaufort-coloured wind
        // arrows, true-distance range rings, a scale bar and real place labels.
        // Same layers & toggles as before: drawLocalMap / applyLocalMapZoom /
        // resetLocalMapZoom are declared BELOW their canvas originals, so these
        // implementations win and every existing call site keeps working.
        const localMapGLEl = document.getElementById('localmap-map');
        const localMapGLBadge = null;   // top-right forecast pill removed — the
        // top-left "Live radar / Forecast +45 min" chip is the only one now.
        let localMapGL = null;                    // maplibregl.Map
        let localMapGLReady = false;
        let localMapGLPendingData = null;         // data seen before the style 'load'
        let localMapGLHome = { zoom: null, bounds: null };
        let localMapGLIconMarkers = [];   // HTML emoji markers on the map
        const localMapGLState = { dataRef: null, gridFrame: -1, ringsKey: '', placesKey: '' };
        const localMapGLEmptyFC = { type: 'FeatureCollection', features: [] };

        // Professional radar palette — vivid on the dark basemap, matching the
        // legend chips: rich blue-grey clouds, lavender fog, pale-blue drizzle,
        // deep blue→cyan rain by mm, icy-blue snow, vivid violet hail. Nothing
        // paints near-white, so no "white blocks" can cover the map.
        function localMapGLCellPaint(cls, cell) {
            const mm = cell.precipitation || 0;
            if (cls === 'hail') return 'rgba(163, 94, 255, 0.85)';
            if (cls === 'snow') return 'rgba(150, 205, 255, 0.85)';
            if (cls === 'rain') {
                if (mm >= 10) return 'rgba(24, 90, 220, 0.85)';
                if (mm >= 5) return 'rgba(30, 130, 245, 0.78)';
                if (mm >= 2) return 'rgba(35, 165, 250, 0.68)';
                return 'rgba(55, 185, 250, 0.58)';
            }
            if (cls === 'drizzle') return 'rgba(90, 160, 235, 0.38)';
            if (cls === 'fog') return 'rgba(165, 170, 205, 0.42)';
            if (cls === 'clouds') {
                const cc = Math.min(100, cell.cloudCover || 0);
                const a = (0.18 + (cc / 100) * 0.45).toFixed(3);
                return `rgba(105, 135, 185, ${a})`;
            }
            return 'rgba(0, 0, 0, 0)';   // clear — invisible but hoverable
        }

        // ===== 🗺️ Vector basemap — stays razor-sharp at ANY zoom, free forever =====
        // RASTER tiles (PNG images) always go blurry / pixelated when you zoom
        // past their native zoom. VECTOR tiles instead send the raw geometry to
        // the GPU and the map is re-drawn crisply on every frame — streets,
        // parks, water and buildings stay perfectly sharp from world view down
        // to street level, on any screen (including retina phones).
        // OpenFreeMap (https://openfreemap.org) serves the full OpenMapTiles
        // planet as vector tiles for FREE: no API key, no registration, no
        // view limits, commercial use allowed. Two flavours ship with the app:
        //   • Bright (colourful — green parks, blue water, warm roads) = default
        //   • Dark (professional night-radar look) = the "Dark" toggle
        // Attribution: OpenFreeMap © OpenMapTiles · Data from OpenStreetMap
        const LOCALMAP_VECTOR_STYLES = {
            topo: 'https://tiles.openfreemap.org/styles/bright',
            osm: 'https://tiles.openfreemap.org/styles/dark'
        };
        let localMapGLStyleKind = null;   // which vector style is currently loaded
        function localMapGLStyleUrl() {
            return LOCALMAP_VECTOR_STYLES[localMapBasemap === 'topo' ? 'topo' : 'osm'];
        }

        function localMapGLStyle() {
            // Kept for compatibility — the MapLibre map now boots straight from
            // the free vector style URL; weather sources/layers are injected on
            // 'load' / 'styledata' by localMapGLEnsureOverlays().
            return localMapGLStyleUrl();
        }

        // Hide the basemap's own baked-in place/city labels so the app's OWN
        // gold place pills stay the only city text on the radar (same promise
        // the old no-labels raster tiles kept). Road names / shields are kept
        // so the map stays readable when zoomed deep into streets.
        function localMapGLHideBaseLabels() {
            if (!localMapGL) return;
            let ready = false;
            try { ready = !!localMapGL.isStyleLoaded(); } catch (err) { ready = !!localMapGLReady; }
            if (!ready) return;
            let style;
            try { style = localMapGL.getStyle(); } catch (err) { return; }
            if (!style || !Array.isArray(style.layers)) return;
            for (const l of style.layers) {
                if (String(l.id || '').indexOf('lmc-') === 0) continue;  // ours — never hide
                if (l.type !== 'symbol') continue;
                const id = String(l.id || '').toLowerCase();
                const src = String(l.source || '').toLowerCase();
                if (id.indexOf('label_') === 0 || id.indexOf('place_') === 0 || id.indexOf('poi') !== -1 ||
                    id.indexOf('airport') !== -1 || (src.indexOf('openmaptiles') !== -1 && (
                        id.indexOf('place') !== -1 || id.indexOf('poi') !== -1 || id === 'label_other' ||
                        id === 'label_village' || id === 'label_town' || id === 'label_city'))) {
                    try { localMapGL.setLayoutProperty(l.id, 'visibility', 'none'); } catch (err) { /* race — next tick */ }
                }
            }
        }

        // First symbol layer of the basemap — weather goes UNDER it so map
        // text stays readable, while our own topmost labels are added without
        // a `before` so they stay above everything.
        function localMapGLFirstSymbolId() {
            try {
                const layers = localMapGL.getStyle().layers || [];
                for (const l of layers) {
                    if (l.type === 'symbol' && String(l.id || '').indexOf('lmc-') !== 0) return l.id;
                }
            } catch (err) { /* style not ready yet */ }
            return undefined;
        }

        // setStyle() wipes every custom source + layer, so (re-)create the
        // weather sources if the freshly-loaded vector style lacks them.
        function localMapGLEnsureSources() {
            if (!localMapGL) return;
            const defs = {
                'lmc-grid': { type: 'geojson', data: localMapGLEmptyFC },
                'lmc-wind': { type: 'geojson', data: localMapGLEmptyFC },
                'lmc-rings': { type: 'geojson', data: localMapGLEmptyFC },
                'lmc-places': { type: 'geojson', data: localMapGLEmptyFC },
                'lmc-me': { type: 'geojson', data: localMapGLEmptyFC }
            };
            for (const [id, def] of Object.entries(defs)) {
                if (!localMapGL.getSource(id)) {
                    try { localMapGL.addSource(id, def); } catch (err) { /* duplicate race */ }
                }
            }
        }

        // The weather-grid fill layers are appended after the base layers so
        // weather paints over radar, and radar over the basemap. Fills carry a
        // thin outline so neighbouring forecast cells read as one continuous
        // professional radar sheet instead of a patchwork of squares.
        function localMapGLAddGridLayers() {
            // Re-runs after every basemap switch (setStyle wipes layers), so
            // every layer is added only if missing — weather first UNDER the
            // basemap text, our own dots/labels topmost with no `before`.
            localMapGLEnsureSources();
            const before = localMapGLFirstSymbolId();
            const addUnder = (def) => {
                if (localMapGL.getLayer(def.id)) return;
                try { localMapGL.addLayer(def, before); }
                catch (err) { try { localMapGL.addLayer(def); } catch (err2) { /* race */ } }
            };
            const addTop = (def) => {
                if (localMapGL.getLayer(def.id)) return;
                try { localMapGL.addLayer(def); } catch (err) { /* race */ }
            };
            for (const cls of ['clear', 'clouds', 'fog', 'drizzle', 'rain', 'snow', 'hail']) {
                addUnder({
                    id: `lmc-fill-${cls}`, type: 'fill', source: 'lmc-grid',
                    filter: ['==', ['get', 'cls'], cls],
                    paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'op'] }
                });
            }
            // No grid lines, no MapLibre symbol layer — emoji are rendered as
            // HTML markers (see localMapGLBuildIcons) so they always show in full
            // colour regardless of the GPU font/glyph pipeline.
            addTop({
                id: 'lmc-hover', type: 'line', source: 'lmc-grid',
                filter: ['==', ['get', 'i'], -1],
                layout: { 'line-join': 'round' },
                paint: { 'line-color': 'rgba(255, 255, 255, 0.9)', 'line-width': 1.6 }
            });
            addUnder({
                id: 'lmc-wind', type: 'line', source: 'lmc-wind',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'w'] }
            });
            addTop({
                id: 'lmc-wind-labels', type: 'symbol', source: 'lmc-wind',
                filter: ['has', 'label'],
                layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true },
                paint: { 'text-color': '#fff3df', 'text-halo-color': 'rgba(8, 20, 40, 0.9)', 'text-halo-width': 1.4 }
            });
            addTop({
                id: 'lmc-places-dots', type: 'circle', source: 'lmc-places',
                paint: { 'circle-radius': 2.4, 'circle-color': 'rgba(255, 214, 110, 0.95)', 'circle-stroke-width': 1.2, 'circle-stroke-color': 'rgba(10, 22, 42, 0.85)' }
            });
            addTop({
                id: 'lmc-places-labels', type: 'symbol', source: 'lmc-places',
                layout: {
                    'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'],
                    'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 11, 11.5, 13, 13],
                    'text-offset': [0, 0.9], 'text-anchor': 'top',
                    'text-allow-overlap': false, 'text-ignore-placement': false,
                    'text-padding': 6
                },
                paint: { 'text-color': '#f2f8ff', 'text-halo-color': 'rgba(6, 16, 32, 0.95)', 'text-halo-width': 1.6 }
            });
            addTop({
                id: 'lmc-me-glow', type: 'circle', source: 'lmc-me',
                paint: { 'circle-radius': 14, 'circle-color': 'rgba(255, 77, 94, 0.3)', 'circle-blur': 1 }
            });
            addTop({
                id: 'lmc-me-ring', type: 'circle', source: 'lmc-me',
                paint: { 'circle-radius': 8, 'circle-color': 'rgba(255, 77, 94, 0)', 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255, 255, 255, 0.9)' }
            });
            addTop({
                id: 'lmc-me-core', type: 'circle', source: 'lmc-me',
                paint: { 'circle-radius': 5, 'circle-color': 'rgba(255, 80, 80, 0.95)' }
            });
            // Rings live under the weather cells.
            addUnder({
                id: 'lmc-rings', type: 'line', source: 'lmc-rings',
                filter: ['==', ['get', 'kind'], 'ring'],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': 'rgba(148, 190, 235, 0.42)', 'line-width': 1.2, 'line-dasharray': [2, 3] }
            });
            addTop({
                id: 'lmc-ring-labels', type: 'symbol', source: 'lmc-rings',
                filter: ['==', ['get', 'kind'], 'label'],
                layout: { 'text-field': ['get', 'text'], 'text-font': ['Noto Sans Regular'], 'text-size': 9.5, 'text-allow-overlap': true },
                paint: { 'text-color': 'rgba(190, 216, 244, 0.8)', 'text-halo-color': 'rgba(5, 13, 28, 0.9)', 'text-halo-width': 1.2 }
            });
            localMapGLHideBaseLabels();
            localMapGLApplyVis();
        }

        function localMapGLInit() {
            if (!localMapGLEl || localMapGL) return;
            if (!window.maplibregl) {
                if (localMapLoading) {
                    localMapLoading.classList.remove('hidden');
                    localMapLoading.textContent = '🛰️ The map engine (MapLibre GL) failed to load — check the internet connection.';
                }
                return;
            }
            localMapGLStyleKind = localMapBasemap === 'topo' ? 'topo' : 'osm';
            localMapGL = new maplibregl.Map({
                container: localMapGLEl,
                style: localMapGLStyleUrl(),
                center: [5.3, 52.2],
                zoom: 8,
                minZoom: 4,
                maxZoom: 16,
                attributionControl: { compact: true },
                dragRotate: false,
                pitchWithRotate: false,
                touchPitch: false,
                maxPitch: 0,          // a true straight-down (nadir) radar view
                fadeDuration: 0
            });
            localMapGL.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
            if (maplibregl.NavigationControl) localMapGL.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
            localMapGL.on('load', () => {
                localMapGLReady = true;
                localMapGLAddGridLayers();
                try { localMapGL.resize(); } catch (err) { /* canvas not laid out yet */ }
                if (localMapLoading) localMapLoading.classList.add('hidden');
                const d = localMapGLPendingData || latestLocalMapData;
                localMapGLPendingData = null;
                if (d) drawLocalMap(d, performance.now() / 1000);
            });
            // setStyle() fires styledata — re-inject the wiped weather layers,
            // re-apply tile URLs + weather data on the next drawLocalMap frame.
            localMapGL.on('styledata', () => {
                if (!localMapGLReady) return;
                try {
                    if (!localMapGL.getLayer('lmc-fill-rain')) {
                        localMapGLAddGridLayers();
                        const d = localMapGLPendingData || latestLocalMapData;
                        localMapGLPendingData = null;
                        if (d) drawLocalMap(d, performance.now() / 1000);
                    } else localMapGLHideBaseLabels();
                } catch (err) { /* style mid-swap — next event */ }
            });
            localMapGL.on('zoom', localMapGLSyncZoomLabel);
            localMapGL.on('move', localMapGLRepositionIcons);
            localMapGL.on('mousemove', localMapGLHover);
            localMapGL.on('mouseout', () => {
                localMapGL.getCanvas().style.cursor = '';
                if (localMapCellInfo) localMapCellInfo.textContent = '';
                localMapGLSetHoverFilter(null);
            });
            localMapGL.on('error', (e) => {
                // Tile hiccups (slow CDN, phone offline) are normal and recover on
                // their own — only surface style-level failures while loading.
                if (e && e.error && e.error.status && localMapLoading && !localMapGLReady) {
                    localMapLoading.classList.remove('hidden');
                    localMapLoading.textContent = '🛰️ The map style failed to load — weather layers still work.';
                }
            });
        }

        function localMapGLSyncZoomLabel() {
            if (!localMapGL || localMapGLHome.zoom == null) return;
            localMapZoom = Math.max(0.1, Math.pow(2, localMapGL.getZoom() - localMapGLHome.zoom));
            updateLocalMapZoomLabel();
        }

        function localMapGLSetHoverFilter(expr) {
            if (!localMapGLReady) return;
            if (!localMapGL.getLayer('lmc-hover')) return;
            localMapGL.setFilter('lmc-hover', expr || ['==', ['get', 'i'], -1]);
        }

        function localMapGLHover(e) {
            if (!localMapGLReady || !localMapCellInfo) return;
            const feats = localMapGL.queryRenderedFeatures(e.point, {
                layers: ['lmc-fill-clear', 'lmc-fill-clouds', 'lmc-fill-fog', 'lmc-fill-drizzle', 'lmc-fill-rain', 'lmc-fill-snow', 'lmc-fill-hail']
            });
            if (feats.length) {
                const f = feats[0];
                const suffix = localMapFrame ? ` · ${localMapFrameLabel(localMapFrame)}` : '';
                localMapCellInfo.textContent = (f.properties.tip || '') + suffix;
                localMapGL.getCanvas().style.cursor = 'crosshair';
                localMapGLSetHoverFilter(['==', ['get', 'i'], f.properties.i]);
            } else {
                localMapCellInfo.textContent = '';
                localMapGL.getCanvas().style.cursor = '';
                localMapGLSetHoverFilter(null);
            }
        }

        // Grid spacing: the modal gap between the unique grid longitudes /
        // latitudes (the API returns a regular 5×5 lattice around the location).
        function localMapGLGridSpacing(cells) {
            const uniq = (vals) => [...new Set(vals.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b);
            const gap = (vals, fallback) => {
                let best = 0;
                for (let i = 1; i < vals.length; i += 1) {
                    const d = vals[i] - vals[i - 1];
                    if (d > 0.002 && (d < best || best === 0)) best = d;
                }
                return best || fallback;
            };
            return {
                dLon: gap(uniq(cells.map((c) => c.lon)), 0.08),
                dLat: gap(uniq(cells.map((c) => c.lat)), 0.05)
            };
        }

        function localMapGLCellTip(cell) {
            const windKmh = cell.wind_speed || 0;
            const windText = windKmh > 0 ? ` · 💨 ${windKmh} km/h (Bf ${localMapBeaufort(windKmh)})` : '';
            return `${cell.icon || ''} ${cell.condition || ''} · ${cell.temp}°C · 💧 ${cell.precipitation} mm · ☁️ ${cell.cloudCover}%${windText}`;
        }

        function localMapGLBuildGrid(data, cells) {
            const { dLon, dLat } = localMapGLGridSpacing(cells);
            const hx = dLon * 0.56, hy = dLat * 0.56;
            const features = [];
            cells.forEach((raw, i) => {
                const cell = localMapFrameCell(raw, localMapFrame);
                const cls = cell.type || 'clear';
                features.push({
                    type: 'Feature',
                    id: i + 1,
                    properties: {
                        i,
                        cls,
                        fill: localMapGLCellPaint(cls, cell),
                        op: 0,
                        tip: localMapGLCellTip(cell),
                        icon: cell.icon || LOCALMAP_ICON_OTHER
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [cell.lon - hx, cell.lat - hy],
                            [cell.lon + hx, cell.lat - hy],
                            [cell.lon + hx, cell.lat + hy],
                            [cell.lon - hx, cell.lat + hy],
                            [cell.lon - hx, cell.lat - hy]
                        ]]
                    }
                });
            });
            localMapGL.getSource('lmc-grid').setData({ type: 'FeatureCollection', features });
            localMapGLState.gridFrame = localMapFrame;
        }

        // ☀️⛅☁️🌧️ Weather icons as HTML markers — GPU symbol layers can't reliably
        // render colour emoji, so each grid cell gets a real <div> positioned with
        // MapLibre's projector. Rebuilt on every data/frame change; repositioned on
        // every map move/zoom. Scales with zoom for visual consistency.
        function localMapGLBuildIcons(cells) {
            if (!localMapGL || !localMapGLEl) return;
            // Remove old markers
            for (const m of localMapGLIconMarkers) { try { m.el.remove(); } catch (e) { /* gone */ } }
            localMapGLIconMarkers = [];
            if (!cells || !cells.length) return;
            const zoom = localMapGL.getZoom();
                        // Scale: 40px at z8 → 64px at z13, capped to a comfortable range
            const size = Math.min(96, Math.max(40, 40 + (zoom - 8) * 4.8));
            const fontSize = Math.round(size * 0.75);
            const haloBlur = Math.max(2, Math.round(size * 0.1));
            for (const raw of cells) {
                const cell = localMapFrameCell(raw, localMapFrame);
                const el = document.createElement('div');
                el.className = 'lmc-icon-marker';
                el.textContent = cell.icon || LOCALMAP_ICON_OTHER;
                el.style.cssText = `position:absolute;width:${size}px;height:${size}px;font-size:${fontSize}px;line-height:${size}px;text-align:center;pointer-events:none;z-index:50;transform:translate(-50%,-50%);text-shadow:0 0 ${haloBlur}px rgba(8,18,38,0.7);`;
                localMapGLEl.appendChild(el);
                localMapGLIconMarkers.push({ el, lon: cell.lon, lat: cell.lat, size, fontSize, haloBlur });
            }
            localMapGLRepositionIcons();
        }

        function localMapGLRepositionIcons() {
            if (!localMapGL || !localMapGLIconMarkers.length) return;
            const zoom = localMapGL.getZoom();
            const size = Math.min(96, Math.max(40, 40 + (zoom - 8) * 4.8));
            const fontSize = Math.round(size * 0.75);
            const haloBlur = Math.max(2, Math.round(size * 0.1));
            for (const m of localMapGLIconMarkers) {
                try {
                    m.el.style.width = size + 'px';
                    m.el.style.height = size + 'px';
                    m.el.style.fontSize = fontSize + 'px';
                    m.el.style.lineHeight = size + 'px';
                    m.el.style.textShadow = `0 0 ${haloBlur}px rgba(8,18,38,0.7)`;
                    const p = localMapGL.project([m.lon, m.lat]);
                    m.el.style.left = p.x + 'px';
                    m.el.style.top = p.y + 'px';
                } catch (e) { /* out of bounds */ }
            }
        }
        }

        // 💨 Wind arrows point where the wind blows TO ("from" direction + 180°),
        // coloured by Beaufort force; cells at Beaufort 5+ (the alert threshold)
        // get a km/h label, like the canvas radar did.
        function localMapGLBuildWind(cells, dLon, dLat, centerLat) {
            const lenDeg = Math.max(dLon, dLat) * 0.62;
            const cosLat = Math.max(0.2, Math.cos((centerLat || 0) * Math.PI / 180));
            const features = [];
            for (const raw of cells) {
                const cell = localMapFrameCell(raw, localMapFrame);
                const ws = cell.wind_speed || 0;
                if (ws < 3) continue;   // calm air — no arrow
                const toward = (((cell.wind_direction || 0) + 180) % 360) * Math.PI / 180;
                const dx = Math.sin(toward) * lenDeg;
                const dy = Math.cos(toward) * lenDeg * cosLat;   // lon/lat scale fix
                const bft = localMapBeaufort(ws);
                const cx = cell.lon, cy = cell.lat;
                const tx = cx + dx, ty = cy + dy;                // arrow tip
                const back = Math.atan2(-dy, -dx);
                const head = Math.max(lenDeg * 0.28, 0.004);
                features.push({
                    type: 'Feature',
                    properties: {
                        color: localMapWindColor(bft),
                        w: bft >= 5 ? 2.4 : 1.7,
                        label: bft >= 5 ? `${ws} km/h` : null
                    },
                    geometry: {
                        type: 'MultiLineString',
                        coordinates: [
                            [[cx - dx, cy - dy], [tx, ty]],
                            [[tx, ty], [tx + Math.cos(back + 0.5) * head, ty + Math.sin(back + 0.5) * head]],
                            [[tx, ty], [tx + Math.cos(back - 0.5) * head, ty + Math.sin(back - 0.5) * head]]
                        ]
                    }
                });
            }
            localMapGL.getSource('lmc-wind').setData({ type: 'FeatureCollection', features });
        }

        // True-distance range rings around "you are here" — the look of a real
        // straight-down radar. Rings every 5 km up to 30 km, each labelled.
        function localMapGLBuildRings(lat, lon) {
            // Rings removed — user wants a clean map with only weather icons.
            localMapGL.getSource('lmc-rings').setData({ type: 'FeatureCollection', features: [] });
            localMapGL.getSource('lmc-me').setData({
                type: 'FeatureCollection',
                features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lon, lat] } }]
            });
        }

        function localMapGLBuildPlaces(places) {
            const features = (places || []).filter((p) => p && p.name && typeof p.lat === 'number' && typeof p.lon === 'number')
                .map((p) => ({
                    type: 'Feature',
                    properties: { name: p.name },
                    geometry: { type: 'Point', coordinates: [p.lon, p.lat] }
                }));
            localMapGL.getSource('lmc-places').setData({ type: 'FeatureCollection', features });
        }

        // Centre the map on the weather grid — the same ~70 km window the old
        // radar framed — and remember that home view for the ⟳ reset button.
        // Margin is a small frame (~12% of a cell), not a full cell: the old
        // canvas radar spanned just the grid lattice itself.
        function localMapGLGoHome(cells) {
            const { dLon, dLat } = localMapGLGridSpacing(cells);
            const mx = dLon * 0.12, my = dLat * 0.12;
            let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
            for (const c of cells) {
                if (c.lon < minLon) minLon = c.lon;
                if (c.lon > maxLon) maxLon = c.lon;
                if (c.lat < minLat) minLat = c.lat;
                if (c.lat > maxLat) maxLat = c.lat;
            }
            const bounds = new maplibregl.LngLatBounds(
                [minLon - mx, minLat - my],
                [maxLon + mx, maxLat + my]
            );
            localMapGLHome.bounds = bounds;
            const cam = localMapGL.cameraForBounds(bounds, { padding: 24, maxZoom: 11.5 });
            if (cam) localMapGLHome.zoom = cam.zoom;
            localMapGL.fitBounds(bounds, { padding: 24, duration: 800, maxZoom: 11.5, essential: true });
        }

        function localMapGLApplyVis() {
            if (!localMapGL || !localMapGLReady) return;
            // The basemap is the loaded vector style itself (bright = colourful
            // default, dark = night-radar) — switch styles when the toggle state
            // changed. setStyle() wipes our layers; 'styledata' re-adds them.
            const want = localMapBasemap === 'topo' ? 'topo' : 'osm';
            if (want !== localMapGLStyleKind) {
                localMapGLStyleKind = want;
                try { localMapGL.setStyle(localMapGLStyleUrl()); } catch (err) { /* next tick */ }
                return;
            }
            if (!localMapGL.getLayer('lmc-fill-rain')) return;
            const vis = (id, on) => localMapGL.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
            vis('lmc-fill-clouds', !!localMapLayers.clouds);
            vis('lmc-fill-fog', !!localMapLayers.fog);
            vis('lmc-fill-drizzle', !!localMapLayers.rain);
            vis('lmc-fill-rain', !!localMapLayers.rain);
            vis('lmc-fill-snow', !!localMapLayers.snow);
            vis('lmc-fill-hail', !!localMapLayers.hail);
            if (localMapGL.getLayer('lmc-grid-lines')) vis('lmc-grid-lines', !!(localMapLayers.clouds || localMapLayers.fog || localMapLayers.rain || localMapLayers.snow || localMapLayers.hail));
            vis('lmc-wind', !!localMapLayers.wind);
            vis('lmc-wind-labels', !!localMapLayers.wind);
            // Keep the corner chip honest: "Live" on frame 0, the forecast
            // offset (+15 min … +3 h) while a prediction frame is on screen.
            var liveText = document.getElementById('localmap-live-text');
            if (liveText) liveText.textContent = localMapFrame > 0 ? ('Forecast ' + localMapFrameLabel(localMapFrame)) : 'Live';
        }

        // ===== 🛰️ The new drawLocalMap: pushes everything into MapLibre =====
        // Declared AFTER the canvas original, so this implementation wins.
        function drawLocalMap(data, tNow) {
            if (!localMapGLEl) return;
            if (!localMapGL) localMapGLInit();
            if (!localMapGL) return;   // CDN failed — the loading note explains
            const grid = data && data.localMap;
            const cells = grid && Array.isArray(grid.cells) ? grid.cells : [];
            if (!localMapGLReady) { localMapGLPendingData = data; return; }
            const dataChanged = data !== localMapGLState.dataRef;
            const frameChanged = localMapFrame !== localMapGLState.gridFrame;
            if (dataChanged) {
                localMapGLState.dataRef = data;
                localMapGLState.gridFrame = -1;      // force a grid rebuild
            }
            if (cells.length && localMapLoading) localMapLoading.classList.add('hidden');
            if (!cells.length && localMapLoading && localMapLoading.textContent.indexOf('grid') === -1) {
                localMapLoading.classList.remove('hidden');
                localMapLoading.textContent = 'No weather grid around this location (open water?) — basemap only.';
            }
            if (dataChanged && cells.length) {
                localMapGLGoHome(cells);
                const cl = cells[0];
                const lat = typeof data.latitude === 'number' ? data.latitude : cl.lat;
                const lon = typeof data.longitude === 'number' ? data.longitude : cl.lon;
                localMapGLBuildRings(lat, lon);
            }
            const placesKey = data && Array.isArray(data.nearbyPlaces)
                ? data.nearbyPlaces.map((p) => p && p.name).join('|') : '';
            if (placesKey !== localMapGLState.placesKey) {
                localMapGLState.placesKey = placesKey;
                localMapGLBuildPlaces(data ? data.nearbyPlaces : []);
            }
            if (dataChanged || frameChanged) localMapGLBuildGrid(data, cells);
            if (cells.length) localMapGLBuildIcons(cells);
            if (dataChanged || frameChanged) {
                const sp = cells.length ? localMapGLGridSpacing(cells) : { dLon: 0.08, dLat: 0.05 };
                const centerLat = typeof data.latitude === 'number' ? data.latitude : (cells[0] ? cells[0].lat : 0);
                localMapGLBuildWind(cells, sp.dLon, sp.dLat, centerLat);
            }
            // Visibility is refreshed on EVERY push (including layer toggles,
            // which re-push the same data object with no data/frame change).
            // (The top-left "Live radar / Forecast …" chip already carries the
            // forecast time — the old top-right duplicate pill is gone.)
            if (localMapGLReady) localMapGLApplyVis();
            localMapGLSyncZoomLabel();
        }

        // Zoom buttons (+ / − / ⟳) now drive the GL camera. Declared after the
        // canvas originals, so the existing click listeners call these instead.
        function applyLocalMapZoom(factor) {
            if (!localMapGL || !localMapGLReady) return;
            const z = localMapGL.getZoom() + Math.log2(factor || 1.3);
            localMapGL.easeTo({ zoom: Math.max(localMapGL.getMinZoom(), Math.min(localMapGL.getMaxZoom(), z)), duration: 280 });
        }

        function resetLocalMapZoom() {
            if (!localMapGL || !localMapGLReady || !localMapGLHome.bounds) {
                localMapZoom = 1;
                updateLocalMapZoomLabel();
                return;
            }
            localMapGL.fitBounds(localMapGLHome.bounds, { padding: 30, duration: 500, maxZoom: 11.5 });
        }


        // Always start at the phone's location — the globe marker, the weather and the
        // push-alert coordinates all follow wherever the user is. If GPS / network
        // positioning isn't available (permission denied, indoors, …), it falls back
        // to an IP-based location and only then to the default city. The manual city
        // input remains available to pin a different place for the session.
        useMyLocation();
        fetchWeather(activeLocation);                        // guaranteed first paint while GPS resolves
        setInterval(() => fetchWeather(activeLocation), 30000);
    