        // MapLibre loader with a CDN fallback: unpkg first, jsDelivr second.
        // A blocking single-tag <script src> meant that one unreachable CDN left
        // the 🛰️ seen-from-above map blank forever ("failed to load" note).
        // The async loader dispatches maplibreready / maplibrefailed events that
        // the app listens for, so the map boots the instant the library lands.
        (function () {
            function inject(src, ok, fail) {
                var tag = document.createElement('script');
                tag.src = src;
                tag.async = true;
                tag.onload = ok;
                tag.onerror = fail;
                document.head.appendChild(tag);
            }
            function announce(name) { return function () { document.dispatchEvent(new Event(name)); }; }
            inject('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
                announce('maplibreready'),
                function () {
                    inject('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js',
                        announce('maplibreready'),
                        announce('maplibrefailed'));
                });
        })();
        // ===== 🇬🇧 ⇄ 🇳🇱 English / Dutch for the WHOLE app ========================
        // One big inline script with no build step, so this is a dictionary plus
        // a DOM walk rather than a bundler:
        //   * I18N_DICT maps an exact English phrase (chip labels included) to
        //     its Dutch equivalent.
        //   * applyLanguage() walks every text node plus title/aria-label/
        //     placeholder, caching the original English so the toggle is
        //     reversible and never drifts on a second press.
        //   * Anything not in the dictionary is left alone — an untranslated
        //     label is far better than a wrong or garbled one.
        // Runtime strings (forecast rows, alerts) go through t(), which falls
        // back to the English original when there is no entry.
        // Set by applyLanguage(); read by t() and i18nWalk(). Declared here so
        // the very first render already knows which language to paint.
        let currentLanguage = 'en';

        const I18N_DICT = {
            // --- page chrome ---
            'AI Weather Station': 'AI Weerstation',
            'Live conditions with a clear, readable forecast view': 'Live-omstandigheden met een duidelijke, leesbare weersvoorspelling',
            'Enter a city or location': 'Voer een plaats of stad in',
            'Update location': 'Locatie bijwerken',
            '📍 Use my location': '📍 Gebruik mijn locatie',
            'Locating…': 'Bezig met bepalen…',
            'Now': 'Nu',
            '☀️ Now': '☀️ Nu',
            '📅 14-Day Forecast': '📅 14-daagse verwachting',
            'Loading the 14-day forecast…': '14-daagse verwachting laden…',
            'Share': 'Delen',
            'Live': 'Live',
            'Setting up the weather view…': 'Weeraanzicht opzetten…',
            'Loading the sky above your area…': 'De lucht boven je omgeving laden…',
            'Current icon reference': 'Overzicht huidige pictogrammen',
            'Loading globe…': 'Globe laden…',
            'Loading...': 'Laden...',
            'Loading…': 'Laden…',
            '📲 Install app': '📲 App installeren',
            '🔔 Enable weather alerts': '🔔 Weermeldingen inschakelen',
            'Enabled': 'Ingeschakeld',
            // --- local map ---
            '🛰️ Local weather · seen from above': '🛰️ Lokaal weer · van boven gezien',
            '⏱️ Next 3 hours — the strip below shows the sky: clouds, rain, snow & hail': '⏱️ Komende 3 uur — de strook hieronder toont de lucht: wolken, regen, sneeuw & hagel',
            '⏳ Next 3 hours': '⏳ Komende 3 uur',
            '🌡️ Air temperature @ 2 m': '🌡️ Luchttemperatuur @ 2 m',
            '🌬️ Weather flowing with the wind · 5×5': '🌬️ Weer dat met de wind meestroomt · 5×5',
            '💧 Expected rainfall: —': '💧 Verwachte neerslag: —',
            'Play the 3-hour prediction': 'Speel de voorspelling van 3 uur af',
            'Radar prediction time — now to +3 hours': 'Tijd van de radarvoorspelling — nu tot +3 uur',
            'Radar layers — show or hide map layers': 'Radarlagen — toon of verberg kaartlagen',
            'Zoom in': 'Inzoomen',
            'Zoom out': 'Uitzoomen',
            'Reset view': 'Weergave herstellen',
            'Weather views': 'Weeraanzichten',
            '🌍 You are here': '🌍 Jij bent hier',
            'Neutral': 'Neutraal',
            'Live ONI': 'Live ONI',
            'El Niño': 'El Niño',
            'La Niña': 'La Niña',
            '🌫️ Fog': '🌫️ Mist',
            '🧊 Hail': '🧊 Hagel',
            '🌨️ Snow': '🌨️ Sneeuw',
            '🎨 Colour': '🎨 Kleur',
            // --- globe legend chips (whole label, emoji included) ---
            '🗺️ Borders': '🗺️ Grenzen',
            '☀️ Sun': '☀️ Zon',
            '☁️ Clouds': '☁️ Wolken',
            '🌧️ Rain': '🌧️ Regen',
            '⛈️ Thunder': '⛈️ Onweer',
            '🌌 Aurora': '🌌 Poollicht',
            '❄️ Snow': '❄️ Sneeuw',
            '🌀 Hurricane': '🌀 Orkaan',
            '⭕ M2.5+ Quakes': '⭕ Aardbevingen M2,5+',
            '🌋 Volcano lava': '🌋 Vulkanische lava',
            '🔥 Forest fires': '🔥 Bosbranden',
            'Forest fires': 'Bosbranden',
            '🪨 Mudslides & landslides': '🪨 Modderstromen & aardverschuivingen',
            'Mudslides': 'Modderstromen',
            '🏔️ Snow avalanches': '🏔️ Sneeuwlawines',
            'Avalanches': 'Lawines',
            '🏜️ Saharan dust': '🏜️ Sahara-stof',
            '🌪️ Sandstorm': '🌪️ Zandstorm',
            '🌊 Tsunami': '🌊 Tsunami',
            '💨 Wind': '💨 Wind',
            '🌊 El Niño': '🌊 El Niño',
            '🌊 La Niña': '🌊 La Niña',
            '🌊 Gulf Stream': '🌊 Golfstroom',
            'Reset globe view': 'Globe-weergave herstellen',
            'Globe layers — click a chip to switch that layer on or off': 'Globe-lagen — klik op een chip om die laag aan of uit te zetten',
            'Drag to spin · scroll or +/− to zoom (to 50×) · click a marker to zoom into it · double-click to reset · click a legend chip to switch that layer on or off': 'Sleep om te draaien · scroll of +/− om te zoomen (tot 50×) · klik op een markering om in te zoomen · dubbelklik om te herstellen · klik op een legend-chip om die laag aan of uit te zetten',
            // --- data sources & explanatory captions ---
            'Powered by WeatherAPI.com': 'Mogelijk gemaakt door WeatherAPI.com',
            'Open-Meteo fallback': 'Open-Meteo-reserve',
            'Speed source:': 'Bron snelheid:',
            'Year: not available': 'Jaar: niet beschikbaar',
            'Reported events': 'Gemelde gebeurtenissen',
            'Official forecast zones': 'Officiële verwachtingszones',
            'Modelled slope risk': 'Modellerend hogerisico',
            'Modelled snow-load risk': 'Modellerend sneeuwbelastingsrisico',
            'Open-Meteo air quality': 'Open-Meteo-luchtkwaliteit',
            'Open-Meteo air-quality model': 'Open-Meteo-luchtkwaliteitsmodel',
            'Open-Meteo forecast': 'Open-Meteo-verwachting',
            'Open-Meteo air-quality API': 'Open-Meteo-luchtkwaliteits-API',
            'Open-Meteo': 'Open-Meteo',
            'aerosol optical depth': 'aërosol optische diepte',
            'USGS earthquake feeds': 'USGS-aardbevingsbronnen',
            'USGS earthquake of M2.5+': 'USGS-aardbeving van M2,5+',
            'USGS + NOAA live feeds': 'USGS- en NOAA-livebronnen',
            'USGS earthquake feeds (free, keyless)': 'USGS-aardbevingsbronnen (gratis, zonder sleutel)',
            'NASA EONET': 'NASA EONET',
            'NASA EONET wildfires': 'NASA EONET-wildbranden',
            'NASA EONET landslides': 'NASA EONET-aardverschuivingen',
            'NASA EONET · active incidents': 'NASA EONET · actieve incidenten',
            'NASA EONET · Smithsonian GVP': 'NASA EONET · Smithsonian GVP',
            'Smithsonian Global Volcanism Program': 'Smithsonian Global Volcanism Program',
            'NOAA / NWS tsunami warning centres': 'NOAA- en NWS-tsunamiwaarschuwingscentra',
            'NOAA NHC': 'NOAA NHC',
            'NOAA National Ocean Service': 'NOAA National Ocean Service',
            'NOAA CPC historical ONI (ERSSTv6)': 'NOAA CPC historische ONI (ERSSTv6)',
            'NOAA CPC': 'NOAA CPC',
            'NOAA': 'NOAA',
            'CAMS': 'CAMS',
            'PTWC': 'PTWC',
            'NTWC': 'NTWC',
            'Natural Earth': 'Natural Earth',
            'NASA GIBS': 'NASA GIBS',
            'Saharan Air Layer': 'Sahara-luchtlaag',
            'Avalanche.org': 'Avalanche.org',
            'avalanche.org': 'avalanche.org',
            'Free Weather API': 'Gratis weer-API',
            'Active volcanoes': 'Actieve vulkanen',
            // --- severity & weather words ---
            'Saharan dust': 'Sahara-stof',
            'Low': 'Laag',
            'Moderate': 'Matig',
            'High': 'Hoog',
            'Very strong': 'Zeer sterk',
            'Extreme': 'Extreem',
            'Considerable': 'Aanzienlijk',
            'Strong': 'Sterk',
            'blowing dust': 'stuivend stof',
            'dust storm': 'stofstorm',
            'sandstorm': 'zandstorm',
            'severe sandstorm': 'ernstige zandstorm',
            'Loading': 'Laden',
            'Updated': 'Bijgewerkt',
            'Last updated': 'Laatst bijgewerkt',
            'Feels like': 'Gevoelstemperatuur',
            'Humidity': 'Luchtvochtigheid',
            'Wind': 'Wind',
            'Visibility': 'Zicht',
            'Pressure': 'Luchtdruk',
            'Sunrise': 'Zonsopgang',
            'Sunset': 'Zonsondergang',
            'Today': 'Vandaag',
            'Tomorrow': 'Morgen',
            'Daily forecast': 'Dagelijkse verwachting',
            'Hourly forecast': 'Uurlijkse verwachting',
            'Next 24 hours': 'Komende 24 uur',
            'Precipitation': 'Neerslag',
            'Chance of rain': 'Regenkans',
            'Min & max temperature · weather · wind · chance of rain': 'Min. & max. temperatuur · weer · wind · regenkans',
            'Enable JavaScript to list the globe-model temperatures along the current.': 'Zet JavaScript aan om de globe-modeltemperaturen langs de stroming te tonen.',
            'Flow intensity · model temperatures · period': 'Stroomintensiteit · modeltemperaturen · periode',
            'Historical intensity · temperature anomaly · year': 'Historische intensiteit · temperatuurafwijking · jaar',
            'The Gulf Stream is a': 'De Golfstroom is een',
            'continuous ocean current': 'continue oceaanstroom',
            'possible tsunami sources': 'mogelijke tsunamibronnen',
            'forecast and observed maximum tsunami wave height': 'voorspelde en waargenomen maximale tsunami-golfhoogte',
            '“Add to Home Screen”': '“Aan het startscherm toevoegen”',
            'To install on iPhone / iPad:': 'Installeren op iPhone / iPad:',
            'button ⬆️ in Safari, then choose': 'knop ⬆️ in Safari en kies daarna',
            'You’ll get a home-screen icon that opens like an app.': 'Je krijgt een startschermpictogram dat opent als een app.',

            // --- The five "now" stat labels -----------------------------------
            // These sat outside the dictionary, so in Dutch mode the card read
            // "Wind speed" / "Wind direction" / "Beaufort" in English while the
            // rest of the page was Dutch — the worst kind of half-translation.
            'Wind speed': 'Windsnelheid',
            'Wind direction': 'Windrichting',
            'Beaufort': 'Beaufort',
            // --- ☀️ Solar tab ---
            '☀️ Solar': '☀️ Zon',
            'Aurora — live northern & southern lights oval (NOAA)': 'Poollicht — live noorder- & zuiderlichtovaal (NOAA)',

            'Solar intensity · radiation · UV': 'Zonnekracht · straling · UV',
            'Loading solar data…': 'Zonnegegevens laden…',
            'Solar intensity': 'Zonnekracht',
            'Radiation': 'Straling',
            'UV index': 'UV-index',
            'Sunshine': 'Zonneschijn',
            'Direct': 'Direct',
            'Diffuse': 'Diffuus',
            'Clear-sky UV': 'UV bij heldere hemel',
            'Sunshine duration': 'Zonneschijnduur',
            'Daylight duration': 'Daglichtduur',
            'Night': 'Nacht',
            'Solar data is temporarily unavailable.': 'Zonnegegevens zijn tijdelijk niet beschikbaar.',
            'Refreshing every 15 minutes': 'Elke 15 minuten ververst',
            'Modelled solar + UV (Open-Meteo)': 'Gemodelleerde zon + UV (Open-Meteo)',
            'Solar & UV — next 12 hours': 'Zon & UV — komende 12 uur',

            // --- The icon-reference table (built from WEATHER_ICON_LEGEND) ---
            'Clear / Sunny': 'Helder / Zonnig',
            'Clear Night / Stars': 'Heldere nacht / Sterren',
            'Mainly Clear': 'Vrijwel helder',
            'Partly Cloudy': 'Gedeeltelijk bewolkt',
            'Cloudy / Overcast': 'Bewolkt / Zwaar bewolkt',
            'Showers / Drizzle': 'Buien / Motregen',
            'Freezing Rain / Sleet': 'IJzel / Natte sneeuw',
            'Thunderstorm': 'Onweer',
            'Hail / Ice storm': 'Hagel / Ijestorm',
            'Fog / Mist / Haze': 'Dichtmist / Mist / Nevel',
            'Windy / Smoke': 'Winderig / Rook',
            'Tornado / Sandstorm': 'Tornado / Zandstorm',
            'Other / Unknown': 'Overig / Onbekend',

            // --- Instructions and errors the user actually hits -------------
            '👆 Tap the map to see the weather for any spot':
                '👆 Tik op de kaart om het weer van elke plek te zien',
            'Location permission denied — enable it in your browser settings':
                'Locatietoestemming geweigerd — sta deze toe in je browserinstellingen',
            'No APK download.': 'Geen APK-download.',
            'No APK download, nothing for Google Play Protect to block.':
                'Geen APK-download, niets voor Google Play Protect om te blokkeren.',

            // --- Runtime status lines ---------------------------------------
            // These are NOT in the markup: the globe/alerts/location helpers
            // paint them from JavaScript, so the DOM walk above can never reach
            // them. They must be handed to t() by their call sites instead,
            // which is what the "wired" comments at each call site refer to.
            'Location needs a secure page (https or localhost)':
                'Locatie vereist een beveiligde pagina (https of localhost)',
            'Locating your current device position…':
                'Je huidige apparaatlocatie wordt bepaald…',
            'Device location unavailable — trying approximate IP location…':
                'Apparaatlocatie niet beschikbaar — proberen met een benaderde IP-locatie…',
            'Could not get your current location — check device location services and try again':
                'Je huidige locatie kon niet worden bepaald — controleer de locatiediensten en probeer het opnieuw',
            'This browser does not support device location':
                'Deze browser ondersteunt geen apparaatlocatie',
            'Could not update your current location — please try again':
                'Je huidige locatie kon niet worden bijgewerkt — probeer het opnieuw',
            '. The last displayed location has not been changed.':
                '. De laatst getoonde locatie is niet gewijzigd.',
            'Could not update weather for that location.':
                'Het weer voor die locatie kon niet worden bijgewerkt.',
            ' captured — updating weather…': ' vastgesteld — het weer wordt bijgewerkt…',
            'Location': 'Locatie',
            '📍 Live GPS · ': '📍 Live GPS · ',
            '📍 ': '📍 ',
            '📍 Zoomed to your location': '📍 Ingezoomd op je locatie',
            '📍 Zoomed to ': '📍 Ingezoomd op ',
            '🔎 Zoomed to ': '🔎 Ingezoomd op ',
            ' — live ': ' — live ',
            '🌍 Full globe view': '🌍 Volledige wereldbol',
            '🌍 View reset — showing your location': '🌍 Weergave hersteld — je locatie wordt getoond',
            'weather': 'weer',
            'Unknown': 'Onbekend',
            'Updating...': 'Bijwerken...',
            ' The globe and “seen from above” map keep showing the last good location.':
                ' De wereldbol en de kaart “van boven gezien” blijven de laatst goede locatie tonen.',

            // --- Install prompt / push notifications -------------------------
            'Open your browser menu (⋯) and choose "Install app", "Install", or "Add to Home screen".':
                'Open het browsermenu (⋯) en kies "App installeren", "Installeren" of "Toevoegen aan startscherm".',
            'This browser does not support push notifications. You can still use the 📲 Download app button and see on-screen weather warnings.':
                'Deze browser ondersteunt geen pushmeldingen. Je kunt de 📲 App-downloadknop nog steeds gebruiken en weerswaarschuwingen op het scherm zien.',
            'Notifications need a secure connection (https or localhost).':
                'Meldingen vereisen een beveiligde verbinding (https of localhost).',
            'Notifications blocked. Allow them in your browser settings to get alert pushes.':
                'Meldingen zijn geblokkeerd. Sta ze toe in je browserinstellingen om waarschuwingsmeldingen te ontvangen.',
            'Service worker failed — cannot enable alerts.':
                'Service worker is mislukt — meldingen kunnen niet worden ingeschakeld.',
            'Push service is not configured yet — try again in a few minutes.':
                'Pushdienst is nog niet ingesteld — probeer het over een paar minuten opnieuw.',
            'On iPhone / iPad first tap 📲 Download app and choose “Add to Home Screen”, then open the app icon and tap Enable alerts. (Push alerts work in the installed app.)':
                'Op iPhone / iPad tik je eerst op 📲 App-downloaden en kies je “Toevoegen aan startscherm”. Open daarna het apppictogram en tik op Meldingen inschakelen. (Pushmeldingen werken in de geïnstalleerde app.)',
            'Notifications were not allowed. Turn on “Notifications” for this app in iOS Settings, then try again.':
                'Meldingen zijn niet toegestaan. Zet “Meldingen” voor deze app aan in de iOS-instellingen en probeer het opnieuw.',
            'Notification permission was declined. Allow notifications in your browser settings, then try again.':
                'Toestemming voor meldingen is geweigerd. Sta meldingen toe in je browserinstellingen en probeer het opnieuw.',
            'You will be notified when rain, hail, snow or wind above Beaufort 4 is expected here. Tap the button again to turn notifications off.':
                'Je krijgt een melding wanneer hier regen, hagel, sneeuw of wind boven windkracht 4 wordt verwacht. Tik nogmaals op de knop om de meldingen uit te zetten.',
            'Notifications turned off. Tap the button again to turn them back on.':
                'Meldingen staan uit. Tik nogmaals op de knop om ze weer in te schakelen.',
            'Alerts are enabled for this device.':
                'Meldingen zijn ingeschakeld voor dit apparaat.',
            'Could not enable alerts (': 'Meldingen konden niet worden ingeschakeld (',
            'Could not turn off alerts (': 'Meldingen konden niet worden uitgeschakeld (',

            // --- Globe hints (the <span>s inside them are separate nodes) ---
            'orange': 'oranje',
            'red': 'rood',
            '= less warm': '= minder warm',
            '= warmest': '= het warmst',

            // --- The weather conditions themselves ---------------------------
            // This is the single most prominent string on the page (the hero
            // card, the status pill, every forecast row). Taken verbatim from
            // WEATHER_CODE_INFO.condition above, so the two can never drift.
            'Clear': 'Helder',
            'Cloudy': 'Bewolkt',
            'Fog': 'Mist',
            'Rime Fog': 'IJsmist',
            'Light Drizzle': 'Lichte motregen',
            'Drizzle': 'Motregen',
            'Heavy Drizzle': 'Zware motregen',
            'Freezing Drizzle': 'Bevrorende motregen',
            'Rain': 'Regen',
            'Heavy Rain': 'Zware regen',
            'Freezing Rain': 'IJzel',
            'Snow': 'Sneeuw',
            'Heavy Snow': 'Zware sneeuw',
            'Rain Showers': 'Regenbuien',
            'Heavy Rain Showers': 'Zware regenbuien',
            'Snow Showers': 'Sneeuwbuien',
            'Heavy Snow Showers': 'Zware sneeuwbuien',
            'Thunderstorm with Hail': 'Onweer met hagel',
            'Thunderstorm with Heavy Hail': 'Onweer met zware hagel'
        };
        // The English original of every text node the walk has touched, keyed
        // by the NODE itself (a WeakMap, so nodes dropped by an innerHTML
        // re-render are collected with their entry). One entry per node — see
        // the note inside i18nWalk for why a parent-level cache breaks
        // elements that hold several text nodes around inline <span>s.
        const I18N_NODE_EN = new WeakMap();
        // Walk every text node under `root`, swapping exact dictionary hits. The
        // English is cached on the parent element the first time we touch it,
        // so switching back to EN restores exactly what was there and pressing
        // the toggle repeatedly can never accumulate drift.
        function i18nWalk(root) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: function (node) {
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    const p = node.parentElement;
                    if (!p) return NodeFilter.FILTER_REJECT;
                    // Never touch script/style — that is our own source.
                    if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
                    // Live weather values (globe readout, solar tab, stats) are
                    // painted by JS after every fetch — the dictionary walk must
                    // never cache or restore them, otherwise it overwrites the
                    // live "18°" with the initial "--°" placeholder. The same
                    // applies to the hazard panels and their stamps: those are
                    // painted through translateFragments() at render time and
                    // re-rendered from repaintRuntimeText() on a language switch.
                    if (p.closest && p.closest('[data-i18n-skip], [data-i18n-raw]')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);

            let hits = 0;
            nodes.forEach(function (node) {
                const parent = node.parentElement;
                if (!parent) return;
                const raw = node.nodeValue;
                const trimmed = raw.trim();
                // Cache the English PER TEXT NODE, not per parent element: a
                // <p> like the sea hint mixes several text nodes with <span>s
                // in between, and a shared parent-level cache made only the
                // FIRST node translatable — worse, the EN restore then
                // replaced every sibling with the first node's English text.
                if (!I18N_NODE_EN.has(node)) I18N_NODE_EN.set(node, trimmed);
                const english = I18N_NODE_EN.get(node);

                if (currentLanguage === 'nl') {
                    // Look the WHOLE phrase up first. Only if that misses do we
                    // peel off a leading emoji + space ("☀️ Now" -> "Now") — and
                    // only when the first token really is non-ASCII, so plain
                    // text like "AI Weather Station" is never cut to
                    // "Weather Station" and then silently missed.
                    let prefix = '';
                    let core = english;
                    let dutch = I18N_DICT[core];
                    if (!dutch) {
                        const parts = /^(\S+\s+)([\s\S]*)$/.exec(english);
                        if (parts && /[^\x20-\x7E]/.test(parts[1])) {
                            prefix = parts[1];
                            core = parts[2];
                            dutch = I18N_DICT[core];
                        }
                    }
                    if (!dutch) return;               // unknown string: leave English
                    node.nodeValue = raw.replace(english, prefix + dutch);
                    hits += 1;
                } else if (english !== trimmed) {
                    node.nodeValue = raw.replace(trimmed, english);
                    hits += 1;
                }
            });
            return hits;
        }
        // Same treatment for the label-ish ATTRIBUTES. A Dutch page whose input
        // still says "Enter a city or location" reads half-finished, and these
        // are what screen readers announce. Only exact dictionary hits are
        // replaced, and the English is cached on the element as data-i18n-* so
        // the round trip is lossless.
        const I18N_ATTRS = ['placeholder', 'aria-label'];

        function i18nWalkAttrs(root) {
            let hits = 0;
            I18N_ATTRS.forEach(function (attr) {
                const nodes = root.querySelectorAll('[' + attr + ']');
                nodes.forEach(function (el) {
                    const value = el.getAttribute(attr);
                    if (!value || !value.trim()) return;
                    // Spelled with get/setAttribute, NOT el.dataset: dataset keys cannot contain
                    // a hyphen, so 'aria-label' would build the illegal key
                    // "i18nEnAria-label" and throw.
                    const cacheAttr = 'data-i18n-en-' + attr;
                    if (!el.getAttribute(cacheAttr)) el.setAttribute(cacheAttr, value);
                    const english = el.getAttribute(cacheAttr);

                    if (currentLanguage === 'nl') {
                        let prefix = '';
                        let core = english;
                        let dutch = I18N_DICT[core];
                        if (!dutch) {
                            const parts = /^(\S+\s+)([\s\S]*)$/.exec(english);
                            if (parts && /[^\x20-\x7E]/.test(parts[1])) {
                                prefix = parts[1];
                                core = parts[2];
                                dutch = I18N_DICT[core];
                            }
                        }
                        if (!dutch) return;
                        el.setAttribute(attr, prefix + dutch);
                        hits += 1;
                    } else if (english !== value) {
                        el.setAttribute(attr, english);
                        hits += 1;
                    }
                });
            });
            return hits;
        }

        function applyLanguage(lang) {
            currentLanguage = (lang === 'nl') ? 'nl' : 'en';
            document.documentElement.lang = currentLanguage === 'nl' ? 'nl' : 'en';
            // Drives the CSS that hides the legacy "Dutch underneath" hints,
            // which would otherwise duplicate the translated main line.
            document.documentElement.setAttribute('data-lang', currentLanguage);

            let hits = i18nWalk(document.body);
            hits += i18nWalkAttrs(document.body);

            const btn = document.getElementById('lang-toggle');
            if (btn) {
                const dutch = currentLanguage === 'nl';
                btn.setAttribute('aria-pressed', dutch ? 'true' : 'false');
                btn.textContent = dutch ? '🇬🇧 EN' : '🇳🇱 NL';
                btn.title = dutch
                    ? 'Terug naar het Engels'
                    : 'Nederlands — vertaal de hele pagina';
                btn.setAttribute('aria-label', btn.title);
            }
            try { localStorage.setItem('aiwx-lang', currentLanguage); } catch (e) { /* private mode */ }
            // Status lines painted by JS live outside the walked text nodes.
            repaintRuntimeText();
            return hits;
        }

        // Public helper for strings the app builds at runtime (forecast rows,
        // alert text, map captions). Never returns undefined or a blank string.
        function t(phrase) {
            if (!phrase) return phrase;
            if (currentLanguage === 'nl') return I18N_DICT[phrase] || phrase;
            return phrase;
        }

        // Translate the *fragments* of a composed sentence, not just the whole
        // string. The status lines are built by concatenation — '📍 Zoomed to '
        // + label + ' — live ' + condition — so no single dictionary key ever
        // matches the assembled result and a whole-string lookup would do
        // nothing. Longest keys are substituted first so a short key can never
        // chop a longer one in half ('Rain' must not eat into 'Raining').
        const I18N_KEYS_BY_LENGTH = Object.keys(I18N_DICT)
            .filter((k) => k.length > 1 && !/^[\s\S]{0,2}$/.test(k))
            .sort((a, b) => b.length - a.length);

        function translateFragments(text) {
            if (!text || currentLanguage !== 'nl') return text;
            let out = String(text);
            for (const key of I18N_KEYS_BY_LENGTH) {
                if (out.indexOf(key) === -1) continue;
                out = out.split(key).join(I18N_DICT[key]);
            }
            return out;
        }

        // Runtime status lines are painted straight into the DOM, so the
        // text-node walk in applyLanguage() can never reach them. Each sink
        // therefore remembers the ENGLISH it was given and re-paints itself
        // when the language changes — without this, switching back to English
        // would leave the last Dutch status message frozen on screen.
        const runtimeText = { globe: '', globeErr: false, alerts: '', locationNote: '' };

        function repaintRuntimeText() {
            if (runtimeText.globe) setGlobeStatus(runtimeText.globe, runtimeText.globeErr);
            if (runtimeText.alerts) setAlertsStatus(runtimeText.alerts);
            if (runtimeText.locationNote) setLocationNote(runtimeText.locationNote);
            // The globe readout is data-i18n-skip (live values), so repaint its
            // condition line explicitly — otherwise it stays frozen in the old
            // language after a toggle.
            if (typeof repaintGlobeWeather === 'function') { try { repaintGlobeWeather(); } catch (e) { /* keep old text */ } }
            if (typeof renderSolar === 'function' && latestWeatherData) { try { renderSolar(latestWeatherData); } catch (e) { /* keep old text */ } }
        }

        function initLanguage() {
            let saved = null;
            try { saved = localStorage.getItem('aiwx-lang'); } catch (e) { /* ignore */ }
            if (!saved) {
                const nav = (navigator.language || 'en').toLowerCase();
                saved = nav.indexOf('nl') === 0 ? 'nl' : 'en';
            }
            applyLanguage(saved);

            const btn = document.getElementById('lang-toggle');
            if (btn) {
                btn.addEventListener('click', function () {
                    applyLanguage(currentLanguage === 'nl' ? 'en' : 'nl');
                });
            }
        }

        // ===== 🌤️ ONE canonical weather-icon set for the WHOLE app ==============
        // Every screen — the hero icon, the 3-day cards, the 14-day rows, the
        // 30-minute drill-down, the 15-minute nowcast strip, the globe weather
        // box, the 🛰️ map cells, the wind-blown icon lattice, the arrival
        // timeline and the "Current icon reference" table — resolves its emoji
        // through this single table, so the same weather always wears the same
        // (most detailed) icon everywhere.
        //
        // It mirrors mapWeatherCodeToCondition() in api/weather.js one-to-one,
        // because that function decides the `icon` + `condition` the API sends.
        //
        // The icons used:  ☀️ clear · 🌙 clear night · 🌤️ mainly clear · ⛅ partly
        // cloudy · ☁️ cloudy · 🌫️ fog · 🌦️ drizzle / light showers · 🌧️ rain ·
        // 🌨️ freezing rain / sleet · ⛈️ thunderstorm · 🧊 hail · ❄️ snow ·
        // 💨 windy · 🌪️ tornado · 🌀 hurricane · 🌡️ unknown
        const WEATHER_ICON_NIGHT = '🌙';   // cloudless night — you can see the stars
        const WEATHER_ICON_OTHER = '🌡️';   // unmapped code / unknown sky
        const WEATHER_CODE_INFO = {
            0: { condition: 'Clear', icon: '☀️', group: 'Clear' },
            1: { condition: 'Mainly Clear', icon: '🌤️', group: 'Mainly Clear' },
            2: { condition: 'Partly Cloudy', icon: '⛅', group: 'Partly Cloudy' },
            3: { condition: 'Cloudy', icon: '☁️', group: 'Cloudy' },
            45: { condition: 'Fog', icon: '🌫️', group: 'Fog' },
            48: { condition: 'Rime Fog', icon: '🌫️', group: 'Fog' },
            51: { condition: 'Light Drizzle', icon: '🌦️', group: 'Showers' },
            53: { condition: 'Drizzle', icon: '🌦️', group: 'Showers' },
            55: { condition: 'Heavy Drizzle', icon: '🌧️', group: 'Rain' },
            56: { condition: 'Freezing Drizzle', icon: '🌨️', group: 'Freezing Rain' },
            57: { condition: 'Freezing Drizzle', icon: '🌨️', group: 'Freezing Rain' },
            61: { condition: 'Rain', icon: '🌧️', group: 'Rain' },
            63: { condition: 'Rain', icon: '🌧️', group: 'Rain' },
            65: { condition: 'Heavy Rain', icon: '🌧️', group: 'Rain' },
            66: { condition: 'Freezing Rain', icon: '🌨️', group: 'Freezing Rain' },
            67: { condition: 'Freezing Rain', icon: '🌨️', group: 'Freezing Rain' },
            71: { condition: 'Snow', icon: '❄️', group: 'Snow' },
            73: { condition: 'Snow', icon: '❄️', group: 'Snow' },
            75: { condition: 'Heavy Snow', icon: '❄️', group: 'Snow' },
            77: { condition: 'Snow', icon: '❄️', group: 'Snow' },
            80: { condition: 'Rain Showers', icon: '🌦️', group: 'Showers' },
            81: { condition: 'Rain Showers', icon: '🌧️', group: 'Rain' },
            82: { condition: 'Heavy Rain Showers', icon: '🌧️', group: 'Rain' },
            85: { condition: 'Snow Showers', icon: '❄️', group: 'Snow' },
            86: { condition: 'Heavy Snow Showers', icon: '❄️', group: 'Snow' },
            95: { condition: 'Thunderstorm', icon: '⛈️', group: 'Thunderstorm' },
            96: { condition: 'Thunderstorm with Hail', icon: '🧊', group: 'Hail Storm' },
            99: { condition: 'Thunderstorm with Heavy Hail', icon: '🧊', group: 'Hail Storm' }
        };

        // The user-facing legend ("Current icon reference") is BUILT from the set
        // above, so the reference table can never drift from the icons the app
        // really draws. showOnlyCurrentWeatherIcon() keeps exactly the row that
        // belongs to the condition on screen.
        const WEATHER_ICON_LEGEND = [
            { group: 'Clear', icon: '☀️', label: 'Clear / Sunny' },
            { group: 'Clear Night', icon: WEATHER_ICON_NIGHT, label: 'Clear Night / Stars' },
            { group: 'Mainly Clear', icon: '🌤️', label: 'Mainly Clear' },
            { group: 'Partly Cloudy', icon: '⛅', label: 'Partly Cloudy' },
            { group: 'Cloudy', icon: '☁️', label: 'Cloudy / Overcast' },
            { group: 'Showers', icon: '🌦️', label: 'Showers / Drizzle' },
            { group: 'Rain', icon: '🌧️', label: 'Rain' },
            { group: 'Freezing Rain', icon: '🌨️', label: 'Freezing Rain / Sleet' },
            { group: 'Thunderstorm', icon: '⛈️', label: 'Thunderstorm' },
            { group: 'Hail Storm', icon: '🧊', label: 'Hail / Ice storm' },
            { group: 'Snow', icon: '❄️', label: 'Snow' },
            { group: 'Fog', icon: '🌫️', label: 'Fog / Mist / Haze' },
            { group: 'Windy', icon: '💨', label: 'Windy / Smoke' },
            { group: 'Tornado', icon: '🌪️', label: 'Tornado / Sandstorm' },
            { group: 'Hurricane', icon: '🌀', label: 'Hurricane' },
            { group: 'Other', icon: WEATHER_ICON_OTHER, label: 'Other / Unknown' }
        ];
        const WEATHER_ICON_BY_GROUP = {};
        WEATHER_ICON_LEGEND.forEach((row) => { WEATHER_ICON_BY_GROUP[row.group] = row.icon; });

        // Text → icon group, for providers that send a condition without a WMO
        // code (WeatherAPI's own wording). Order matters: hail, fog and freezing
        // rain must be recognised before the plain rain / snow families, and
        // "partly cloudy" before the general cloud test.
        const WEATHER_TEXT_GROUPS = [
            [/hail|ice pellet|ice storm/, 'Hail Storm'],
            [/fog|mist|haze/, 'Fog'],
            [/freezing|sleet/, 'Freezing Rain'],
            [/thunder|lightning/, 'Thunderstorm'],
            [/tornado|sandstorm|dust/, 'Tornado'],
            [/hurricane|cyclone|typhoon/, 'Hurricane'],
            [/blizzard|snow/, 'Snow'],
            [/shower|drizzle/, 'Showers'],
            [/rain/, 'Rain'],
            [/wind|smoke/, 'Windy'],
            [/partly/, 'Partly Cloudy'],
            [/overcast|cloud/, 'Cloudy'],
            [/clear|sunny/, 'Clear']
        ];
        function weatherGroupFromText(normalized) {
            for (let i = 0; i < WEATHER_TEXT_GROUPS.length; i += 1) {
                if (WEATHER_TEXT_GROUPS[i][0].test(normalized)) return WEATHER_TEXT_GROUPS[i][1];
            }
            return 'Other';
        }
        function weatherIconForGroup(group) {
            return WEATHER_ICON_BY_GROUP[group] || WEATHER_ICON_OTHER;
        }
        // The canonical { condition, icon, group } for a WMO code (🌡️ when the
        // code is unknown).
        function weatherCodeInfo(code) {
            return WEATHER_CODE_INFO[code] || { condition: 'Unknown', icon: WEATHER_ICON_OTHER, group: 'Other' };
        }
        // The ONE place that decides which icon a condition wears: a WMO code
        // wins (it is precise), the condition text is only the fallback.
        function weatherConditionGroup(condition, weatherCode, isDay) {
            const normalized = (condition || '').toLowerCase();
            const info = typeof weatherCode === 'number' ? WEATHER_CODE_INFO[weatherCode] : null;
            // 🌙 Night: the sun cannot shine after dark — a cloudless sky (code
            // 0/1, or without a code a "clear"/"sunny" condition) shows the moon
            // and the stars instead. Rain, snow, fog … keep their own icons at
            // night, because those already read without a sun.
            const clearSky = info
                ? (weatherCode === 0 || weatherCode === 1)
                : (normalized.indexOf('clear') !== -1 || normalized.indexOf('sunny') !== -1);
            if ((isDay === false || normalized.indexOf('night') !== -1) && clearSky) return 'Clear Night';
            return info ? info.group : weatherGroupFromText(normalized);
        }
        // Signature: (condition, weatherCode, isDay) — used by every screen.
        function getWeatherIcon(condition, weatherCode, isDay) {
            return weatherIconForGroup(weatherConditionGroup(condition, weatherCode, isDay));
        }
        function getVisibleConditionGroup(condition, weatherCode, isDay) {
            return [weatherConditionGroup(condition, weatherCode, isDay)];
        }

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
        const localMapPanel = document.getElementById('localmap-panel');
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
        const localMapIconGrid = document.getElementById('localmap-icon-grid');
        const localMapIconGridTitle = document.getElementById('localmap-icon-grid-title');
        let localMapHoverCells = [];    // projected cell positions for the hover tooltip
        let activeLocation = '';
        // 💾 Manual location persistence: a city/place the user explicitly typed
        // (or tapped) is remembered so a reload doesn't silently fall back to a
        // coarse GPS/IP fix that may show the wrong place. Only explicit user
        // choices are saved — never an automatic GPS/IP coordinate.
        const LOCALSTORE_LOC_KEY = 'aiwx.manualLocation';
        function saveManualLocation(text) {
            try {
                const v = String(text || '').trim();
                if (v) localStorage.setItem(LOCALSTORE_LOC_KEY, v);
            } catch (e) { /* private mode / storage full — non-fatal */ }
        }
        function loadManualLocation() {
            try { return localStorage.getItem(LOCALSTORE_LOC_KEY) || ''; } catch (e) { return ''; }
        }
        function clearManualLocation() {
            try { localStorage.removeItem(LOCALSTORE_LOC_KEY); } catch (e) { /* ignore */ }
        }
        let latestWeatherData = null;
        let selectedDayIndex = 0;
        let expandedF14Day = -1;   // ⏱️ 30-min drill-down: which 14-day row is open (-1 = none)
        let lastFetchedLocation = null;
        let weatherRequestId = 0;
        // 🔀 The id of the last EXPLICIT user choice (typed search, Update/Enter,
        // map tap). GPS fixes compare against THIS — not weatherRequestId: the
        // background first paint and the 30-second auto-refresh bump
        // weatherRequestId constantly, which used to invalidate the startup GPS
        // fix every single time (the phone's location was never used).
        let userIntentId = 0;
        let locatingDevice = false;

        // ===== 🗺️ Bird's-eye weather icon grid (below the map) =====
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
        // Dimensions of the buffer the pixel loop actually samples: 4096×2048 once the
        // native image is in, 1024×512 for the stylised fallback.
        let earthTexW = 0;
        let earthTexH = 0;
        // The Blue Marble JPEG is natively 4096×2048 — 22.8 texels per degree, which
        // keeps the planet sharp to roughly 4×. The old code squashed it into
        // 1024×512 (5.7 texels/degree) and THAT was the blur seen when zooming in.
        // setEarthTexture() builds the full buffer in two passes so the globe is
        // textured immediately and the big 4096×2048 buffer follows when idle.
        const EARTH_TEX_W = 4096;
        const EARTH_TEX_H = 2048;
        // The stylised fallback is procedural noise (several octaves per pixel) and only
        // a stand-in for the satellite image, so it is built at the old, small size.
        const FALLBACK_TEX_W = 1024;
        const FALLBACK_TEX_H = 512;
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

        // ===== 🗺️ Weather icons carried by the wind (below the map) =====
        // Every icon keeps its TRUE sky condition (sun ☀️, cloud ☁️, rain 🌧️,
        // drizzle 🌦️, snow ❄️, hail 🧊, fog 🌫️) but drifts through its own
        // cell like weather flowing with the wind. Each cell supplies its live
        // wind speed + direction, so a west wind pushes every icon west, a
        // strong gale makes them skid, and calm air leaves them floating.
        let localMapIconFlows = [];
        let localMapIconFlowRAF = 0;
        let localMapIconFlowLast = 0;
        let lastLocalMapIconCells = null;
        let lastLocalMapIconFrame = -1;

        const wrapMod2 = (v, m) => ((v % m) + m) % m;

        function rebuildLocalMapIconFlow(cells) {
            if (!localMapIconGrid || !localMapIconGridTitle) return;
            const gridCellsEl = document.getElementById('localmap-icon-grid-cells');
            if (!gridCellsEl) return;
            // Stop the previous animation so it never touches the removed icons.
            if (localMapIconFlowRAF) { cancelAnimationFrame(localMapIconFlowRAF); localMapIconFlowRAF = 0; }
            localMapIconFlows = [];
            gridCellsEl.innerHTML = '';

            if (!cells || !cells.length) {
                localMapIconGridTitle.textContent = 'No weather icons available';
                return;
            }
            // Stable order: top-to-bottom, left-to-right across the 5×5 lattice.
            const sorted = cells.slice().sort((a, b) => {
                if (Math.abs(a.lat - b.lat) > 1e-6) return b.lat - a.lat;
                return a.lon - b.lon;
            });
            // Each chip wears the ONE canonical icon for its cell (see
            // WEATHER_CODE_INFO at the top of this script). The night flag comes
            // from the cell's own 15-minute series, so a cloudless cell after
            // dark shows 🌙 here too — exactly like the map cell it belongs to.
            const iconForCell = (c) => {
                const dayFlag = c && c.series && Array.isArray(c.series.day) ? c.series.day[0] : null;
                return getWeatherIcon(c.condition, c.weatherCode, dayFlag === 0 ? false : (dayFlag === 1 ? true : undefined));
            };
            let gustiest = 0;
            for (let i = 0; i < sorted.length; i++) {
                const c = sorted[i];
                const icon = iconForCell(c);
                // Feels-like at 1.50 m (apparent temperature) is the headline
                // number on each flowing chip; the measured air temperature
                // stays in the tooltip for comparison.
                const feelsVal = typeof c.feels === 'number' ? Math.round(c.feels) : (typeof c.temp === 'number' ? Math.round(c.temp) : null);
                const temp = feelsVal != null ? feelsVal + '°' : '—°';
                const actualTemp = typeof c.temp === 'number' ? Math.round(c.temp) + '°C' : '—';
                const label = (c.condition || '').trim() || 'Unknown';
                const windKmh = Math.max(0, Math.round(Number(c.wind_speed) || 0));
                gustiest = Math.max(gustiest, windKmh);

                const el = document.createElement('div');
                el.className = 'lmc-icon-grid-cell';
                el.title = `${icon} ${label} · 🌡️ Feels like ${temp} (at 1.50 m) · actual ${actualTemp} · 💨 ${windKmh} km/h`;
                el.innerHTML = `<span class="lmc-icon-grid-icon">${icon}</span><span class="lmc-icon-grid-temp">${temp}</span>`;
                gridCellsEl.appendChild(el);

                const col = i % 5, row = Math.floor(i / 5);
                const fromDeg = typeof c.wind_direction === 'number' && Number.isFinite(c.wind_direction) ? c.wind_direction : 0;
                const towardRad = ((fromDeg + 180) % 360) * Math.PI / 180;
                // Screen space: +x = east/right, +y = south/down, so a north
                // wind moves the icon UP (negative y). Speed: a 25 km/h wind
                // crosses a cell in ~12 s; calm air drifts very slowly.
                const spd = Math.max(0.0012, Math.min(0.05, 0.0167 * (windKmh / 25))) * (0.6 + 0.8 * ((i * 0.6180339887) % 1));
                localMapIconFlows.push({
                    el, col, row,
                    x: (col + 0.5) / 5 + (((i * 0.37) % 0.2) - 0.1),
                    y: (row + 0.5) / 5 + (((i * 0.53) % 0.2) - 0.1),
                    vx: Math.sin(towardRad) * spd,
                    vy: -Math.cos(towardRad) * spd,
                    wob: 0.018 + 0.012 * ((i * 0.5772156649) % 1),
                    phase: i * 1.7
                });
            }

            localMapIconGridTitle.textContent = `🌬️ Weather flowing with the wind · 🌡️ feels-like @ 1.50 m · 💨 ${gustiest} km/h`;
            localMapIconFlowLast = 0;
            localMapIconFlowRAF = requestAnimationFrame(localMapIconFlowTick);
        }

        function localMapIconFlowTick(now) {
            if (!localMapIconFlows.length) { localMapIconFlowRAF = 0; return; }
            const t = now / 1000;
            const dt = localMapIconFlowLast ? Math.min(0.1, (now - localMapIconFlowLast) / 1000) : 0.016;
            localMapIconFlowLast = now;

            if (dt > 0) {
                for (const f of localMapIconFlows) {
                    f.x += f.vx * dt;
                    f.y += f.vy * dt;
                }
            }
            // Wrap each icon back inside its own lattice cell, then add a gentle
            // breath so the flow looks organic instead of mechanical.
            const cellW = 0.2;
            for (const f of localMapIconFlows) {
                const x0 = f.col * cellW, y0 = f.row * cellW;
                f.x = x0 + wrapMod2(f.x - x0, cellW);
                f.y = y0 + wrapMod2(f.y - y0, cellW);
                const swayX = Math.sin(t * 0.6 + f.phase) * f.wob;
                const swayY = Math.cos(t * 0.75 + f.phase * 0.9) * f.wob;
                // Clamp just inside the panel so edge-row icons never clip.
                f.el.style.left = Math.min(98, Math.max(2, (f.x + swayX) * 100)) + '%';
                f.el.style.top = Math.min(98, Math.max(2, (f.y + swayY) * 100)) + '%';
                f.el.style.transform = 'translate(-50%, -50%)';
            }
            localMapIconFlowRAF = requestAnimationFrame(localMapIconFlowTick);
        }

        // Rebuilds the flow only when the cell set or the forecast frame changes.
        function refreshLocalMapIconGrid() {
            const data = latestLocalMapData;
            const grid = data && data.localMap;
            const cells = grid && Array.isArray(grid.cells) ? grid.cells : [];
            if (cells === lastLocalMapIconCells && localMapFrame === lastLocalMapIconFrame) return;
            lastLocalMapIconCells = cells;
            lastLocalMapIconFrame = localMapFrame;
            rebuildLocalMapIconFlow(cells);
            refreshLocalMapTempGraph();
        }

        // ===== 🌡️ Air-temperature bar graph @ 2 m (under the flowing icons) =====
        // The chips above headline the 1.50 m feels-like value; this graph shows
        // the MEASURED air temperature at the standard 2 m height for every cell
        // of the 5×5 grid, in the same top-to-bottom, left-to-right lattice
        // order. Each bar carries its cell's true weather icon, is coloured by
        // temperature, and the warmest / coldest cells get 🔥 / ❄️ markers. The
        // graph follows the timeline: dragging the slider (or ▶ playback) redraws
        // every bar for the frame on screen.
        let localMapTempGraphCells = null;
        let localMapTempGraphFrame = -1;

        // Temperature → bar colour: icy blue below zero, blue for cold, teal for
        // cool, green-yellow for mild, amber for warm, red for hot — matching the
        // app's dark-sky palette.
        function localMapTempBarColor(t) {
            if (t == null) return '#4a6a94';
            if (t <= 0) return '#7fd0ff';
            if (t <= 10) return '#4fa3e3';
            if (t <= 17) return '#3fc8a8';
            if (t <= 23) return '#ffd66b';
            if (t <= 29) return '#ff9f43';
            return '#ff5d5d';
        }

        // Marker honesty: the extreme-cell badges must MATCH the temperature.
        // 🔥 means genuinely hot air (≥ TEMP_HOT_MARK_C) and ❄️ means freezing
        // air (≤ TEMP_SNOW_MARK_C); milder extremes get neutral ▲ / ▼ arrows so
        // "warmest/coldest" never reads like a snow or heat forecast (a ❄️ on a
        // 17 °C bar looked like "snow is coming").
        const TEMP_HOT_MARK_C = 30;
        const TEMP_SNOW_MARK_C = 0;
        // Snow honesty: snow cannot fall when the air is well above freezing.
        // A snowy weather code at warmer temperatures is a known model quirk, so
        // such cells are shown as rain — keeping every icon honest about its
        // temperature. Wet snow at 0…2 °C (SNOW_TOO_WARM_C) is real and stays.
        // Freezing rain / sleet counts as snowy here too: 🌨️ or ❄️ over a 17 °C
        // cell would claim freezing precipitation in warm air, which cannot happen.
        // Same rule as the backend (honestSnowCondition in api/weather.js) so
        // the live "now" frame and the +15 min…+3 h frames agree.
        const SNOW_TOO_WARM_C = 2;
        function localMapTempIconForTemp(icon, label, tempC) {
            const snowy = String(icon || '').indexOf('❄') !== -1
                || String(icon || '').indexOf('🌨') !== -1
                || /snow|freezing|sleet/i.test(String(label || ''));
            if (!snowy || typeof tempC !== 'number' || tempC <= SNOW_TOO_WARM_C) return { icon, label };
            return { icon: weatherIconForGroup('Rain'), label: 'Rain' };
        }

        function refreshLocalMapTempGraph() {
            const data = latestLocalMapData;
            const grid = data && data.localMap;
            const cells = grid && Array.isArray(grid.cells) ? grid.cells : [];
            if (cells === localMapTempGraphCells && localMapFrame === localMapTempGraphFrame) return;
            localMapTempGraphCells = cells;
            localMapTempGraphFrame = localMapFrame;
            rebuildLocalMapTempGraph(cells);
        }

        function rebuildLocalMapTempGraph(cells) {
            const barsEl = document.getElementById('localmap-tempgraph-bars');
            const titleEl = document.getElementById('localmap-tempgraph-title');
            if (!barsEl || !titleEl) return;

            if (!cells || !cells.length) {
                titleEl.textContent = '🌡️ Temperature @ 2 m — no cell data';
                barsEl.innerHTML = '';
                return;
            }
            // Same stable order as the flowing icons: top-to-bottom, left-to-
            // right across the 5×5 lattice, so bar #n lines up with cell #n.
            const sorted = cells.slice().sort((a, b) => {
                if (Math.abs(a.lat - b.lat) > 1e-6) return b.lat - a.lat;
                return a.lon - b.lon;
            });

            // Frame-aware: each bar shows its cell at the timeline frame on
            // screen (frame 0 = live "now"). Feels-like at 1.50 m comes from the
            // cell's own 15-minute series so the tooltip can always compare
            // measured 2 m vs felt 1.50 m for the exact same moment.
            const rows = sorted.map((raw) => {
                const c = localMapFrameCell(raw, localMapFrame);
                const s = raw && raw.series;
                let feels = null;
                if (s && Array.isArray(s.feels) && s.feels.length) {
                    const i = Math.min(localMapFrame, s.feels.length - 1);
                    if (s.feels[i] != null) feels = s.feels[i];
                }
                if (feels == null && typeof c.feels === 'number') feels = c.feels;
                // Temperature-honest icon: a ❄️ snow code at 17 °C is a model
                // quirk, not a snow forecast — show 🌧️ Rain instead.
                const shown = localMapTempIconForTemp(c.icon || '🌡️', (c.condition || '').trim(), typeof c.temp === 'number' ? c.temp : null);
                return {
                    temp: typeof c.temp === 'number' ? c.temp : null,
                    feels,
                    icon: shown.icon || '🌡️',
                    label: shown.label || 'Unknown',
                    windKmh: Math.max(0, Math.round(Number(c.wind_speed) || 0)),
                    precip: typeof c.precipitation === 'number' ? c.precipitation : 0
                };
            });
            const temps = rows.map((r) => r.temp).filter((v) => v != null);
            if (!temps.length) {
                titleEl.textContent = '🌡️ Temperature @ 2 m — no temperature data';
                barsEl.innerHTML = '';
                return;
            }
            const tMin = Math.min(...temps);
            const tMax = Math.max(...temps);
            const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
            // The domain pads 1 °C beyond the extremes so no bar ever looks
            // pegged; a minimum 2 °C span keeps small differences readable when
            // the whole grid is nearly uniform.
            const lo = tMin - 1;
            const span = Math.max(2, (tMax + 1) - lo);

            let hot = rows[0], cold = rows[0];
            for (const r of rows) {
                if (r.temp == null) continue;
                if (hot.temp == null || r.temp > hot.temp) hot = r;
                if (cold.temp == null || r.temp < cold.temp) cold = r;
            }

            titleEl.textContent = `🌡️ Air temperature @ 2 m · ${localMapFrameLabel(localMapFrame)} · avg ${Math.round(avg)}° · max ${Math.round(tMax)}° · min ${Math.round(tMin)}°`;

            barsEl.innerHTML = '';
            const frag = document.createDocumentFragment();
            for (const r of rows) {
                const col = document.createElement('div');
                col.className = 'lm-temp-col';
                const t = r.temp != null ? Math.round(r.temp) : null;
                const feelsTxt = r.feels != null ? Math.round(r.feels) + '°C' : '—';
                // Extreme badges match the temperature (see TEMP_HOT_MARK_C /
                // TEMP_SNOW_MARK_C above): 🔥 only in real heat, ❄️ only when
                // freezing, neutral ▲ / ▼ arrows for milder extremes.
                let extremeMark = '';
                let extremeNote = '';
                if (rows.length > 1) {
                    if (r === hot) {
                        extremeMark = (t != null && t >= TEMP_HOT_MARK_C) ? '🔥' : '▲';
                        extremeNote = '▲ warmest cell';
                    } else if (r === cold) {
                        extremeMark = (t != null && t <= TEMP_SNOW_MARK_C) ? '❄️' : '▼';
                        extremeNote = '▼ coldest cell';
                    }
                }
                col.title = `${r.icon} ${r.label} · 🌡️ ${t != null ? t + '°C' : '—'} @ 2 m · feels ${feelsTxt} @ 1.50 m · 💨 ${r.windKmh} km/h · 💧 ${r.precip} mm${extremeNote ? ' · ' + extremeNote : ''}`;
                if (r === hot && rows.length > 1) col.classList.add('hot');
                if (r === cold && rows.length > 1) col.classList.add('cold');

                const icon = document.createElement('span');
                icon.className = 'lm-temp-icon';
                icon.textContent = r.icon;
                const val = document.createElement('span');
                val.className = 'lm-temp-val';
                let valText = t != null ? t + '°' : '—°';
                if (extremeMark) valText += ' ' + extremeMark;
                val.textContent = valText;
                const track = document.createElement('span');
                track.className = 'lm-temp-track';
                if (t != null) {
                    const bar = document.createElement('span');
                    bar.className = 'lm-temp-bar';
                    const pct = Math.max(0, Math.min(100, ((r.temp - lo) / span) * 100));
                    bar.style.height = pct + '%';
                    bar.style.background = `linear-gradient(180deg, ${localMapTempBarColor(t)}, ${localMapTempBarColor(t)}cc)`;
                    track.appendChild(bar);
                }
                col.appendChild(icon);
                col.appendChild(val);
                col.appendChild(track);
                frag.appendChild(col);
            }
            barsEl.appendChild(frag);
        }

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
        // Every emoji the journey/marker labels draw comes from the ONE canonical
        // icon set at the top of this script (quake ⭕ / tsunami 🌊 / volcano 🌋
        // are not weather conditions, so they stay local).
        const WEATHER_EMOJI = {
            thunder: weatherIconForGroup('Thunderstorm'),
            rain: weatherIconForGroup('Rain'),
            clouds: weatherIconForGroup('Cloudy'),
            sun: weatherIconForGroup('Clear'),
            snow: weatherIconForGroup('Snow'),
            hurricane: weatherIconForGroup('Hurricane'),
            night: WEATHER_ICON_NIGHT,
            quake: '⭕',
            tsunami: '🌊',
            volcano: '🌋',
            fires: '🔥'
        };
        const WEATHER_COLOR = {
            thunder: 'rgba(196, 168, 84, 0.85)',  // lightning amber
            rain: 'rgba(88, 156, 255, 0.85)',     // rain blue
            clouds: 'rgba(214, 222, 238, 0.85)',  // cloud white-grey
            sun: 'rgba(255, 199, 62, 0.85)',      // sun yellow
            snow: 'rgba(170, 220, 255, 0.85)',    // snow ice-blue
            hurricane: 'rgba(190, 150, 255, 0.9)',// hurricane storm-purple
            night: 'rgba(126, 148, 214, 0.9)',    // clear-night indigo (moon + stars)
            quake: 'rgba(244, 140, 20, 0.9)',     // magnitude circle orange
            tsunami: 'rgba(88, 196, 255, 0.9)',   // tsunami ripple blue
            volcano: 'rgba(255, 104, 24, 0.95)',  // erupting lava orange-red
            fires: 'rgba(255, 74, 10, 0.98)'     // active wildfire flame red-orange
        };

        // Zoom / camera state
        const GLOBE_AUTOROTATE_MAX_ZOOM = 2.2; // globe keeps spinning until this zoom is reached (and while holding exactly at 2.2×)
        let globeZoom = 1;          // 1× = whole planet, >1 = zoomed in
        let globeZoomTarget = 1;
        let viewDx = 0, viewDy = 0; // screen-centre offset (keeps a marker centred when zooming)
        let focusedWeather = null;  // current weather marker the camera is centred on
        let lastWeatherHits = [];   // markers projected this frame (device px), for click hit-testing
        let liveHurricanes = [];    // active NOAA NHC storms plotted on the globe (name + wind speed)
        let liveEarthquakes = [];   // USGS past-day quakes (M2.5+) plotted as magnitude circles
        let liveTsunamiMessages = []; // NOAA tsunami-centre messages (warning / advisory / watch / info)
        const QUAKE_MIN_MAGNITUDE = 2.5; // feed threshold; smaller quakes only show when zoomed in
        let liveVolcanoes = [];     // NASA EONET open volcano events, drawn as erupting lava
        let liveFires = [];         // NASA EONET open wildfire incidents, drawn as glowing flames
        let fireFeedAvailable = null; // null = loading, false = unavailable, true = response received
        let liveLandslides = [];    // NASA EONET landslide / mudslide reports (observed, brown markers)
        let landslideRisk = [];     // modelled rain-triggered slope risk (Open-Meteo, soft halos)
        let landslideFeedAvailable = null; // null = loading, false = unavailable, true = response received
        let liveAvalanches = [];    // Avalanche.org US forecast zones with their live danger rating
        let avalancheRisk = [];     // modelled snow-load risk on mountain ranges worldwide (Open-Meteo)
        let avalancheFeedAvailable = null; // null = loading, false = unavailable, true = response received
        let saharanDust = [];       // 💨 modelled Saharan / Sahel dust load (Open-Meteo air quality)
        let dustFeedAvailable = null; // null = loading, false = unavailable, true = response received
        let globeWind = [];        // 💨 modelled 10 m wind on a coarse global grid (Open-Meteo)
        let windFeedAvailable = null; // null = loading, false = unavailable, true = response received
        // Ceiling for the globe's backing store (CSS px × DPR). The planet is
        // rendered pixel by pixel every frame, so the bigger stage is capped here
        // to keep the frame budget sane — above this the canvas is upscaled by CSS.
        const GLOBE_MAX_RENDER_PX = 760;
        // Deepest zoom the wheel, the +/− buttons and a fly-to may reach.
        // Sharp all the way: the base texture covers up to ~2×, NASA GIBS level 6
        // (4.5° tiles, 113.8 texels/degree) holds ~20× crisp, and level 7
        // (2.25° tiles, 227.6 texels/degree — the deepest the 500m layer serves)
        // holds ~40× — while past that the patch simply keeps sampling its
        // finest tiles (upscaled, so still better than the base texture). The pixel loop stays
        // inside its 30 fps budget at any zoom: the per-frame cost depends only on
        // the stage size, never on the zoom factor.
        const GLOBE_MAX_ZOOM = 50;

        // ===== 🌍 Globe layers: every chip in the legend under the globe is a switch =====
        // One key per chip (`data-globe-layer` in the markup) and one painter behind
        // it: the country outlines (borders), weather markers (sun / clouds / rain /
        // thunder / snow / hurricane), the live feeds (hurricane / quakes / volcano /
        // tsunamis) and the three illustrative sea-surface tints (elnino = Pacific
        // warm phase, lanina = Pacific cold phase, gulf = Atlantic). A layer that is
        // switched off is skipped while drawing — its markers are not even hit-tested —
        // and its ocean label disappears together with its tint.
        const globeLayerOn = {
            borders: true,
            sun: true,
            clouds: true,
            aurora: true,
            rain: true,
            thunder: true,
            snow: true,
            hurricane: true,
            quakes: true,
            volcano: true,
            fires: true,
            landslide: true,
            avalanche: true,
            dust: true,
            sandstorm: true,
            wind: true,
            tsunami: true,
            elnino: true,
            lanina: true,
            gulf: true
        };

        // Weather effects painted at the "you" marker, mapped onto the chip that owns
        // them, so switching a layer off hides it everywhere (fog has no chip of its
        // own — it is cloud cover, so the Clouds chip governs it).
        const YOU_EFFECT_LAYER = {
            fog: 'clouds',
            thunder: 'thunder',
            rain: 'rain',
            lightning: 'thunder',
            snow: 'snow',
            hurricane: 'hurricane'
        };

        // Flip one globe layer on/off (called by the legend chips) and keep the chip's
        // pressed state, tooltip and the sea-surface hint in sync.
        function setGlobeLayer(key, on) {
            if (!Object.prototype.hasOwnProperty.call(globeLayerOn, key)) return;
            globeLayerOn[key] = !!on;
            const chip = document.querySelector('[data-globe-layer="' + key + '"]');
            if (chip) {
                chip.setAttribute('aria-pressed', on ? 'true' : 'false');
                chip.title = (chip.dataset.layerTitle || chip.textContent.trim()) +
                    (on ? ' (click to hide)' : ' — switched off (click to show)');
            }
            // The sea-surface heat hint only applies while at least one of the three sea
            // tints is showing.
            const seaHint = document.querySelector('.sea-hint');
            if (seaHint) seaHint.hidden = globeLayerOn.elnino === false && globeLayerOn.gulf === false && globeLayerOn.lanina === false;
            drawGlobe();
        }

        function getStatsForDay(data, dayIndex) {
            if (dayIndex === 0) {
                return {
                    humidity: data.humidity,
                    windSpeed: data.windSpeed,
                    windDirection: data.windDirection,
                    beaufort: data.beaufort,
                    feelsLike: data.feelsLike,
                    statusLabel: 'Live now'
                };
            }

            const day = data.forecast?.[dayIndex] || data.forecast14?.[dayIndex];
            if (!day) {
                return {
                    humidity: data.humidity,
                    windSpeed: data.windSpeed,
                    windDirection: data.windDirection,
                    beaufort: data.beaufort,
                    feelsLike: data.feelsLike,
                    statusLabel: 'Live now'
                };
            }

            return {
                humidity: day.humidity,
                windSpeed: day.windSpeed,
                windDirection: day.windDirection,
                beaufort: day.beaufort,
                // Forecast days carry the feels-like range; show the daytime
                // (max) value, matching the H:/L: temperature presentation.
                feelsLike: day.feelsHigh ?? day.feelsLow,
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
            const feelsEl = document.getElementById('stat-feels');
            const statusPill = document.getElementById('status-pill');

            if (humidityEl) humidityEl.textContent = `${stats.humidity ?? '—'}%`;
            if (windSpeedEl) windSpeedEl.textContent = `${stats.windSpeed ?? '—'} km/h`;
            if (windDirectionEl) windDirectionEl.textContent = stats.windDirection ?? '—';
            if (beaufortEl) beaufortEl.textContent = stats.beaufort ?? '—';
            if (feelsEl) feelsEl.textContent = stats.feelsLike != null ? `${stats.feelsLike}°C` : '—';
            if (statusPill) statusPill.textContent = stats.statusLabel;

            document.querySelectorAll('.forecast-day, .f14-day').forEach((el) => {
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

        // ===== 📅 Forecast tabs + ☀️ Solar tab =============================
        const tabNowBtn = document.getElementById('tab-now');
        const tabSolarBtn = document.getElementById('tab-solar');
        const tabForecast14Btn = document.getElementById('tab-forecast14');
        const tabUniverseBtn = document.getElementById('tab-universe');
        const panelNow = document.getElementById('panel-now');
        const panelSolar = document.getElementById('panel-solar');
        const panelForecast14 = document.getElementById('panel-forecast14');
        const panelUniverse = document.getElementById('panel-universe');
        const forecast14List = document.getElementById('forecast14-list');
        const forecast14Location = document.getElementById('forecast14-location');

        function setTabState(btn, panel, active) {
            if (btn) {
                btn.classList.toggle('on', active);
                btn.setAttribute('aria-selected', String(active));
            }
            if (panel) panel.hidden = !active;
        }

        function showTab(name) {
            const active = (name === 'universe') ? 'universe' : (name === 'solar') ? 'solar' : (name === 'forecast14' ? 'forecast14' : 'now');
            setTabState(tabNowBtn, panelNow, active === 'now');
            setTabState(tabSolarBtn, panelSolar, active === 'solar');
            setTabState(tabForecast14Btn, panelForecast14, active === 'forecast14');
            setTabState(tabUniverseBtn, panelUniverse, active === 'universe');
            if (active === 'now' && typeof fitLocalMapLayout === 'function') fitLocalMapLayout();
            if (active === 'forecast14') renderForecast14(latestWeatherData);
            if (active === 'solar') { renderSolar(latestWeatherData); fetchSolar(true); }
            if (active === 'universe' && typeof initUniverse === 'function') initUniverse();
        }
        if (tabNowBtn) tabNowBtn.addEventListener('click', () => showTab('now'));
        if (tabSolarBtn) tabSolarBtn.addEventListener('click', () => showTab('solar'));
        if (tabForecast14Btn) tabForecast14Btn.addEventListener('click', () => showTab('forecast14'));
        if (tabUniverseBtn) tabUniverseBtn.addEventListener('click', () => showTab('universe'));

                        // ===== 🌌 Universe tab — our place in the galaxy (free, offline, Vercel-safe) ======
        // Real, animated, zoomable scenes rendered on one 2D canvas. Four views:
        // Earth (real coastlines, rotating) → Solar System (real orbits) → Milky Way
        // (rotating spiral) → neighbouring galaxies. Zero images, zero fees.
        // ★ Real-star sky: the ~120 brightest stars (Yale Bright Star Catalog /
        // Hipparcos positions — public-domain facts, same sources Celestia builds
        // on) with a Celestia credit in the footnote. Planets follow NASA JPL
        // approximate orbital elements (public domain). All drawn on-device.
        const universeViewEl = () => document.getElementById('universe-canvas');
        let universeView = 'earth';
        let universeReady = false;
        let universeRaf = 0;
        let universeT = 0;              // scene time (seconds), advances every frame
        let universeLastTs = 0;
        const universeZoom = { earth: 1, system: 1, galaxy: 1, deep: 1 };
        const UNIVERSE_VIEWS = {
            earth: { title: '🌍 Earth — you are here', scale: 'Real coastlines · rotating on its 23.4° tilted axis',
                text: 'Earth — the third planet from the Sun. Your weather station lives here; every globe label above points back to this dot.' },
            system: { title: '☀️ Solar System — eight worlds in motion', scale: 'Orbital periods to scale, sizes compressed for visibility',
                text: 'The Sun holds eight planets, all orbiting the same way. Earth runs third — the only known world with liquid-water oceans and life.' },
            galaxy: { title: '🌠 Milky Way — our barred spiral', scale: '≈ 100,000 light-years across',
                text: 'Our Sun sits in the Orion Arm, ~26,000 light-years from the galactic centre — marked with 📍 YOU.' },
            deep: { title: '🔭 The Local Group — neighbouring galaxies', scale: 'Millions of light-years',
                text: 'Beyond the Milky Way: Andromeda (2.5M ly), Triangulum (2.7M ly) and the Large Magellanic Cloud (163k ly) — each turning slowly.' }
        };
        // Real coastline polygons (arrays of [lng, lat]) decoded once from the app's
        // existing TopoJSON so the Universe Earth is genuinely a map of our world.
        let universeLand = null;
        let universeLandLoading = false;
        function decodeTopoArcs(topo) {
            if (!topo || !topo.arcs || !topo.transform || !topo.objects) return null;
            const scale = topo.transform.scale, translate = topo.transform.translate;
            return topo.arcs.map((arc) => {
                let x = 0, y = 0;
                const pts = new Float64Array(arc.length * 2);
                for (let i = 0; i < arc.length; i += 1) {
                    x += arc[i][0]; y += arc[i][1];
                    pts[i * 2] = x * scale[0] + translate[0];
                    pts[i * 2 + 1] = y * scale[1] + translate[1];
                }
                return pts;
            });
        }
        function buildUniverseLand(topo) {
            const decoded = decodeTopoArcs(topo);
            if (!decoded) return null;
            const ringFromArc = (idx) => {
                const rev = idx < 0;
                const arc = decoded[rev ? ~idx : idx];
                const out = [];
                for (let i = rev ? arc.length / 2 - 1 : 0; rev ? i >= 0 : i < arc.length / 2; rev ? i -= 1 : i += 1) {
                    out.push([arc[i * 2], arc[i * 2 + 1]]);
                }
                return out;
            };
            const polys = [];
            const geoms = (topo.objects.countries && topo.objects.countries.geometries) || [];
            for (const g of geoms) {
                const list = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
                for (const poly of list) {
                    for (let r = 0; r < poly.length; r += 1) {
                        const ring = [];
                        for (const idx of poly[r]) for (const p of ringFromArc(idx)) ring.push(p);
                        if (ring.length > 2) polys.push(ring);
                    }
                }
            }
            return polys;
        }
        function loadUniverseLand(done) {
            if (universeLand) { done && done(universeLand); return; }
            if (universeLandLoading) return;
            universeLandLoading = true;
            fetch('data/countries-110m.json', { cache: 'force-cache' })
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
                .then((topo) => { universeLand = buildUniverseLand(topo) || []; universeLandLoading = false; done && done(universeLand); })
                .catch(() => { universeLand = []; universeLandLoading = false; done && done(universeLand); });
        }
        const U_RAD = Math.PI / 180;
        // Project (lat,lng) onto a sphere rotated by lon0 and tilted by tiltDeg.
        function universeProject(lat, lng, lon0, tiltDeg) {
            const phi = lat * U_RAD, lam = (lng - lon0) * U_RAD;
            const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
            const x = cosPhi * Math.sin(lam), y = sinPhi, z = cosPhi * Math.cos(lam);
            const t = tiltDeg * U_RAD, cosT = Math.cos(t), sinT = Math.sin(t);
            return { x: x, y: y * cosT - z * sinT, z: y * sinT + z * cosT };
        }
        function universeStars(ctx, w, hh, seed, count, alpha) {
            ctx.save();
            for (let i = 0; i < count; i += 1) {
                const x = ((seed * 97 + i * 137.5) % 1000) / 1000 * w;
                const y = ((seed * 57 + i * 89.3) % 1000) / 1000 * hh;
                const r = 0.4 + ((i * 7) % 3) * 0.45;
                ctx.globalAlpha = alpha * (0.35 + ((i * 13) % 10) / 16);
                ctx.fillStyle = '#dfeaff';
                ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
            }
            ctx.restore();
        }
        // ★ CELESTIA-COMPATIBLE BRIGHT STARS — [name, RA hours, Dec deg, mag].
        // Positions are public-domain facts from the Yale Bright Star Catalog /
        // Hipparcos (the same catalogues Celestia ships). Rendered on-device;
        // credit kept in the footnote — no Celestia code or data files copied.
        const UNIVERSE_BRIGHT_STARS = [
            ['Sirius', 6.752, -16.72, -1.46], ['Canopus', 6.399, -52.70, -0.74],
            ['Arcturus', 14.261, 19.18, -0.05], ['Vega', 18.616, 38.78, 0.03],
            ['Capella', 5.278, 45.998, 0.08], ['Rigel', 5.242, -8.20, 0.13],
            ['Procyon', 7.655, 5.225, 0.34], ['Betelgeuse', 5.919, 7.407, 0.42],
            ['Achernar', 1.630, -57.24, 0.46], ['Hadar', 14.064, -60.37, 0.61],
            ['Altair', 19.846, 8.868, 0.76], ['Acrux', 12.443, -63.10, 0.76],
            ['Aldebaran', 4.599, 16.509, 0.86], ['Antares', 16.490, -26.43, 0.91],
            ['Spica', 13.420, -11.16, 0.97], ['Pollux', 7.755, 28.03, 1.14],
            ['Fomalhaut', 22.961, -29.62, 1.16], ['Deneb', 20.690, 45.28, 1.25],
            ['Mimosa', 12.795, -59.69, 1.25], ['Regulus', 10.140, 11.967, 1.35],
            ['Adhara', 6.977, -28.97, 1.50], ['Castor', 7.576, 31.888, 1.58],
            ['Gacrux', 12.519, -57.11, 1.63], ['Shaula', 17.560, -37.10, 1.62],
            ['Bellatrix', 5.418, 6.350, 1.64], ['Elnath', 5.438, 28.608, 1.68],
            ['Miaplacidus', 9.219, -69.72, 1.69], ['Alnilam', 5.604, -1.202, 1.69],
            ['Alnair', 22.137, -46.96, 1.74], ['Alioth', 12.900, 55.96, 1.77],
            ['Alnitak', 5.679, -1.943, 1.77], ['Dubhe', 11.062, 61.751, 1.79],
            ['Mirfak', 3.405, 49.861, 1.79], ['Wezen', 7.140, -26.39, 1.83],
            ['Sargas', 17.621, -43.24, 1.86], ['Kaus Australis', 18.403, -34.38, 1.85],
            ['Avior', 8.376, -59.51, 1.86], ['Alkaid', 13.792, 49.313, 1.86],
            ['Menkalinan', 6.0, 44.95, 1.90], ['Atria', 16.811, -69.03, 1.91],
            ['Alhena', 6.629, 16.399, 1.92], ['Peacock', 20.427, -56.735, 1.94],
            ['Alsephina', 8.368, -47.34, 1.95], ['Mirzam', 6.378, -17.95, 1.98],
            ['Alphard', 9.460, -8.66, 1.98], ['Polaris', 2.530, 89.264, 1.98],
            ['Hamal', 2.119, 23.462, 2.0], ['Algieba', 10.333, 19.841, 2.01],
            ['Diphda', 0.726, -17.99, 2.04], ['Nunki', 18.921, -26.30, 2.05],
            ['Menkent', 14.113, -36.37, 2.06], ['Mirach', 1.162, 35.62, 2.07],
            ['Alpheratz', 0.140, 29.091, 2.07], ['Rasalhague', 17.582, 12.56, 2.08],
            ['Denebola', 11.817, 14.572, 2.11], ['Algol', 3.136, 40.957, 2.09],
            ['Kochab', 14.845, 74.155, 2.07], ['Alcyone', 3.791, 24.117, 2.87],
            ['Sirius B', 6.752, -16.72, 8.4], ['Proxima Cen', 14.495, -62.68, 11.1]
        ];
        function starColorFor(mag) {
            if (mag < 0.5) return '#ffffff';
            if (mag < 1.5) return '#eaf3ff';
            if (mag < 2.5) return '#cfe0ff';
            return '#a9c4ef';
        }
        // Real-star layer: RA/Dec → screen with a slow sidereal drift so the sky
        // feels alive. Twinkle respects prefers-reduced-motion.
        const universeMotionOK = typeof window !== 'undefined' && window.matchMedia
            ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : true;
        function universeRealStars(ctx, w, hh, alpha) {
            ctx.save();
            const drift = universeMotionOK ? (universeT * 0.5 % 360) : 0;
            const tw = universeMotionOK ? universeT : 0;
            for (let i = 0; i < UNIVERSE_BRIGHT_STARS.length; i += 1) {
                const s = UNIVERSE_BRIGHT_STARS[i];
                const raDeg = (s[1] * 15 + drift) % 360;
                const x = (raDeg / 360) * w;
                const y = ((90 - s[2]) / 180) * hh;
                const size = Math.max(0.5, 2.6 - (s[3] + 1.5) * 0.45);
                const twinkle = universeMotionOK ? 0.75 + 0.25 * Math.sin(tw * 2 + i * 1.7) : 1;
                ctx.globalAlpha = Math.max(0.12, Math.min(1, alpha * twinkle * (1.15 - s[3] * 0.12)));
                ctx.fillStyle = starColorFor(s[3]);
                ctx.beginPath(); ctx.arc(x, y, size, 0, 2 * Math.PI); ctx.fill();
                if (s[3] < 1.0 && size > 1.4) {
                    ctx.globalAlpha *= 0.35;
                    ctx.beginPath(); ctx.arc(x, y, size * 2.2, 0, 2 * Math.PI); ctx.fill();
                }
                if (s[3] < 0.8) {
                    ctx.globalAlpha = Math.min(1, alpha);
                    ctx.font = '700 10px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#bcd4f0';
                    ctx.fillText(s[0], x + size + 4, y);
                }
            }
            ctx.restore();
        }
        function universeLabel(ctx, text, x, y, px, fill) {
            ctx.save();
            ctx.font = '700 ' + px + 'px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineWidth = Math.max(2, px * 0.28);
            ctx.strokeStyle = 'rgba(3, 8, 20, 0.9)';
            ctx.strokeText(text, x, y);
            ctx.fillStyle = fill || '#eaf3ff';
            ctx.fillText(text, x, y);
            ctx.restore();
        }
        function setUniverseView(name) {
            if (!UNIVERSE_VIEWS[name]) return;
            universeView = name;
            document.querySelectorAll('.universe-btn').forEach((b) => {
                const on = b.getAttribute('data-universe') === name;
                b.classList.toggle('on', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            const cap = document.getElementById('universe-caption');
            const scl = document.getElementById('universe-scale');
            if (cap) cap.textContent = UNIVERSE_VIEWS[name].title + ' — ' + UNIVERSE_VIEWS[name].text;
            if (scl) scl.textContent = UNIVERSE_VIEWS[name].scale;
            if (name === 'earth') loadUniverseLand(() => drawUniverse());
        }
        function drawUniverse() {
            const cv = universeViewEl();
            if (!cv) return;
            const stage = cv.parentElement;
            const w = Math.max(280, stage ? stage.clientWidth : 640);
            const hh = Math.max(220, stage ? stage.clientHeight : 400);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
            const ctx = cv.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const cx = w / 2, cy = hh / 2;
            const bg = ctx.createLinearGradient(0, 0, 0, hh);
            bg.addColorStop(0, '#0a1730'); bg.addColorStop(0.6, '#050b1c'); bg.addColorStop(1, '#02040a');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, w, hh);
            universeStars(ctx, w, hh, 7, 200, 0.9);
            universeStars(ctx, w, hh, 31, 110, 0.5);
            universeRealStars(ctx, w, hh, 0.95);
            const z = universeZoom[universeView] || 1;
            if (universeView === 'earth') drawUniverseEarth(ctx, w, hh, cx, cy, z);
            else if (universeView === 'system') drawUniverseSystem(ctx, w, hh, cx, cy, z);
            else if (universeView === 'galaxy') drawUniverseGalaxy(ctx, w, hh, cx, cy, z);
            else drawUniverseDeep(ctx, w, hh, cx, cy, z);
        }
        function universeLoop(ts) {
            universeRaf = requestAnimationFrame(universeLoop);
            const cv = universeViewEl();
            const pp = document.getElementById('panel-universe');
            if (!cv || !pp || pp.hidden) { universeLastTs = ts; return; }
            if (!universeLastTs) universeLastTs = ts;
            const dt = Math.min(0.05, (ts - universeLastTs) / 1000);
            universeLastTs = ts; universeT += dt;
            drawUniverse();
        }
        function universeZoomBy(mult) {
            universeZoom[universeView] = Math.max(0.6, Math.min(6, (universeZoom[universeView] || 1) * mult));
            drawUniverse();
        }
        // ---------- 🌍 Earth: real coastlines on a rotating, tilted sphere ----------
        // Shaded Moon disc, shared by the Earth and Solar System views.
        function drawUniverseMoonDisc(ctx, x, y, r) {
            ctx.fillStyle = 'rgba(90,100,112,0.9)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
            const mg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
            mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.45, '#dfe5ec'); mg.addColorStop(1, '#9aa3ae');
            ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, 2 * Math.PI); ctx.fill();
            ctx.fillStyle = 'rgba(140,150,162,0.8)';
            ctx.beginPath(); ctx.arc(x - r * 0.25, y + r * 0.1, r * 0.22, 0, 2 * Math.PI); ctx.fill();
            ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.28, r * 0.15, 0, 2 * Math.PI); ctx.fill();
            ctx.strokeStyle = 'rgba(230,240,250,0.9)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
        }
        function drawUniverseEarth(ctx, w, hh, cx, cy, zoom) {
            const R = Math.min(w, hh) * 0.30 * zoom;
            const lon0 = -universeT * 12;          // spins west→east, ~12°/s (visible motion)
            const tilt = 23.4;                     // Earth's axial tilt
            // 🌙 Moon orbit — computed FIRST so the far half can be painted BEFORE the
            // globe (the Moon really passes BEHIND the Earth) and the near half AFTER
            // (passing IN FRONT). One loop every ~6 s on screen (real period 27.3 days).
            // Frozen under prefers-reduced-motion via universeMotionOK.
            const moonSpin = universeMotionOK ? universeT : 0;
            const moonAng = -0.9 + moonSpin * (2 * Math.PI / 6);
            const moonR = R * 1.45;
            const moonTilt = -0.35;
            const cosTilt = Math.cos(moonTilt), sinTilt = Math.sin(moonTilt);
            // Point on the rotated ellipse: rotate (cos*moonR, sin*moonR*0.52).
            const mOX = Math.cos(moonAng) * moonR;
            const mOY = Math.sin(moonAng) * moonR * 0.52;
            const mX = cx + mOX * cosTilt - mOY * sinTilt;
            const mY = cy + mOX * sinTilt + mOY * cosTilt;
            const moonBehind = mY < cy;           // above Earth's centre = far side of the orbit
            const mr = Math.max(4, R * 0.13);
            // Parametric angle where the tilted orbit crosses Earth's centre line:
            // vertical offset = A*cos(t) + B*sin(t); negative half is behind the globe.
            const mStar = Math.atan2(-moonR * sinTilt, moonR * 0.52 * cosTilt);
            // FAR half of the orbit ring first…
            ctx.strokeStyle = 'rgba(180,205,230,0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(cx, cy, moonR, moonR * 0.52, moonTilt, mStar + Math.PI, mStar + 2 * Math.PI); ctx.stroke();
            if (moonBehind) drawUniverseMoonDisc(ctx, mX, mY, mr);  // …and the Moon on the back side
            const litX = cx - R * 0.45, litY = cy - R * 0.45;
            const og = ctx.createRadialGradient(litX, litY, R * 0.1, cx, cy, R);
            og.addColorStop(0, '#5fb0ff'); og.addColorStop(0.5, '#1f6fd0'); og.addColorStop(1, '#08306e');
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fillStyle = og; ctx.fill();
            ctx.save();
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.clip();
            if (universeLand && universeLand.length) {
                for (const ring of universeLand) {
                    ctx.beginPath();
                    let started = false;
                    for (let i = 0; i < ring.length; i += 1) {
                        const p = universeProject(ring[i][1], ring[i][0], lon0, tilt);
                        if (p.z <= 0) { started = false; continue; }
                        const sx = cx + p.x * R, sy = cy - p.y * R;
                        if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
                    }
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(96, 168, 96, 0.92)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(150, 214, 150, 0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
                }
            } else {
                universeLabel(ctx, 'Loading Earth…', cx, cy, 13, '#cfe3ff');
            }
            const ng = ctx.createLinearGradient(cx + R * 0.15, cy, cx + R, cy);
            ng.addColorStop(0, 'rgba(2,6,18,0)'); ng.addColorStop(1, 'rgba(2,6,18,0.85)');
            ctx.fillStyle = ng; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
            ctx.restore();
            const ag = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.08);
            ag.addColorStop(0, 'rgba(120,190,255,0)'); ag.addColorStop(0.6, 'rgba(120,190,255,0.35)'); ag.addColorStop(1, 'rgba(120,190,255,0)');
            ctx.beginPath(); ctx.arc(cx, cy, R * 1.08, 0, 2 * Math.PI); ctx.fillStyle = ag; ctx.fill();
            // 🌙 NEAR half of the lunar orbit, drawn AFTER Earth — the ring visibly
            // passes in front of the globe (it already vanished behind it above).
            ctx.strokeStyle = 'rgba(210,228,248,0.65)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(cx, cy, moonR, moonR * 0.52, moonTilt, mStar, mStar + Math.PI); ctx.stroke();
            if (!moonBehind) drawUniverseMoonDisc(ctx, mX, mY, mr);   // Moon IN FRONT of Earth
            // Label only while the Moon is actually visible (not hidden by the globe).
            const moonVisible = !moonBehind || Math.hypot(mX - cx, mY - cy) > R + mr;
            if (moonVisible) universeLabel(ctx, '🌙 Moon · 27.3 d', mX, mY - mr - 11, Math.max(10, R * 0.065), moonBehind ? '#9db1c6' : '#eaf2fb');
            universeLabel(ctx, '📍 You are here', cx, cy - R - 22, Math.max(11, R * 0.10), '#ffe3a3');
            universeLabel(ctx, 'Earth · 12,742 km · one Moon', cx, cy + R + 22, Math.max(9, R * 0.075), '#9db8d8');
        }

        // ---------- ☀️ Solar System: eight worlds orbiting the Sun ----------
        // Real J2000 orbital elements: each orbit is a true ellipse with THE SUN AT
        // ONE FOCUS (Kepler's 1st law); planets advance by solving Kepler's equation,
        // so they move fastest at perihelion (2nd law); real periods obey the 3rd law
        // (ω ∝ a^-1.5), so inner planets visibly lap the outer ones. Semi-major axes
        // are compressed (a^0.42, normalised to Neptune) so all eight rings fit on the
        // canvas at every zoom. Screen projection: ecliptic plane squashed to 0.379
        // (viewer ~22° above the plane), out-of-plane height kept at 0.925 — so real
        // inclinations (i) tilt each orbit. Angles: i/node/peri in degrees =
        // inclination, longitude of ascending node, longitude of perihelion.
        const U_VIEW_Y = 0.379, U_VIEW_Z = 0.925;
        const U_PLANETS = [
            { name: 'Mercury', a: 0.3871, e: 0.2056, i: 7.005, node: 48.331,  peri: 77.456,  period: 0.2408, r: 2.2, color: '#b0a495' },
            { name: 'Venus',   a: 0.7233, e: 0.0068, i: 3.395, node: 76.680,  peri: 131.533, period: 0.6152, r: 3.4, color: '#e6c98a' },
            { name: 'Earth',   a: 1.0000, e: 0.0167, i: 0.000, node: 0.0,     peri: 102.937, period: 1.0000, r: 3.6, color: '#4f9fe0', you: true },
            { name: 'Mars',    a: 1.5237, e: 0.0934, i: 1.850, node: 49.558,  peri: 336.041, period: 1.8808, r: 2.8, color: '#d1683f' },
            { name: 'Jupiter', a: 5.2026, e: 0.0489, i: 1.303, node: 100.464, peri: 14.753,  period: 11.862, r: 8.5, color: '#d8b48c' },
            { name: 'Saturn',  a: 9.5549, e: 0.0565, i: 2.489, node: 113.665, peri: 92.432,  period: 29.457, r: 7.4, color: '#e4cf9a', ring: true },
            { name: 'Uranus',  a: 19.2184, e: 0.0457, i: 0.773, node: 74.006, peri: 170.964, period: 84.011, r: 5.2, color: '#9fe0e8' },
            { name: 'Neptune', a: 30.1104, e: 0.0113, i: 1.770, node: 131.784, peri: 44.971, period: 164.79, r: 5.0, color: '#5a7de0' }
        ];
        const U_EARTH_YEAR_S = 22;   // seconds for Earth to complete one orbit on screen
        // Kepler's equation M = E − e·sinE, solved for eccentric anomaly E (Newton).
        function solveKepler(M, e) {
            let E = M + e * Math.sin(M);
            for (let k = 0; k < 5; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            return E;
        }
        // Perifocal position at eccentric anomaly E → screen offset from the SUN, which
        // sits exactly at the ellipse's focus (rr = on-screen semi-major axis).
        function orbitOffset(pl, E, rr) {
            const xp = Math.cos(E) - pl.e;                        // a=1 units, focus at origin
            const yp = Math.sqrt(1 - pl.e * pl.e) * Math.sin(E);
            const w = (pl.peri - pl.node) * Math.PI / 180;        // argument of perihelion ω
            const O = pl.node * Math.PI / 180, I = pl.i * Math.PI / 180;
            const u = xp * Math.cos(w) - yp * Math.sin(w);        // rotate by ω within the orbit
            const v = xp * Math.sin(w) + yp * Math.cos(w);
            const y1 = v * Math.cos(I), z1 = v * Math.sin(I);     // incline about the node line
            const X = u * Math.cos(O) - y1 * Math.sin(O);         // rotate by node longitude Ω
            const Y = u * Math.sin(O) + y1 * Math.cos(O);
            return { x: X * rr, y: (Y * U_VIEW_Y - z1 * U_VIEW_Z) * rr };
        }
        function drawUniverseSystem(ctx, w, hh, cx, cy, zoom) {
            const maxR = Math.min(w, hh) * 0.46 * zoom;
            const kA = Math.pow(30.11, 0.42);              // normalise to Neptune (outermost) so all 8 fit
            // Sun: layered glow + bright core
            const sunR = Math.max(6, maxR * 0.055);
            for (let g = 4; g >= 1; g -= 1) {
                const rg = ctx.createRadialGradient(cx, cy, sunR * 0.4, cx, cy, sunR * (1 + g * 0.9));
                rg.addColorStop(0, 'rgba(255,214,120,' + (0.16 / g) + ')');
                rg.addColorStop(1, 'rgba(255,150,40,0)');
                ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, sunR * (1 + g * 0.9), 0, 2 * Math.PI); ctx.fill();
            }
            const sg = ctx.createRadialGradient(cx - sunR * 0.25, cy - sunR * 0.25, 0, cx, cy, sunR);
            sg.addColorStop(0, '#fff6d8'); sg.addColorStop(0.6, '#ffd15c'); sg.addColorStop(1, '#f39a2e');
            ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, sunR, 0, 2 * Math.PI); ctx.fill();
            universeLabel(ctx, 'Sun', cx, cy + sunR + 12, Math.max(9, sunR * 0.9), '#ffd66b');
            for (let i = 0; i < U_PLANETS.length; i += 1) {
                const pl = U_PLANETS[i];
                const rr = maxR * Math.pow(pl.a, 0.42) / kA;
                // True elliptical orbit with the Sun at its focus — sampled through the
                // exact projection the planet uses, so a planet is always ON its ring.
                ctx.strokeStyle = pl.you ? 'rgba(255,227,163,0.55)' : 'rgba(150,190,240,0.22)';
                ctx.lineWidth = pl.you ? 1.4 : 1;
                ctx.beginPath();
                for (let s = 0; s <= 72; s += 1) {
                    const ro = orbitOffset(pl, (s / 72) * 2 * Math.PI, rr);
                    if (s === 0) ctx.moveTo(cx + ro.x, cy + ro.y); else ctx.lineTo(cx + ro.x, cy + ro.y);
                }
                ctx.closePath(); ctx.stroke();
                // Mean anomaly advances uniformly with the real period; Kepler's equation
                // converts it to E → true position (fastest at perihelion, 2nd law).
                const M = -Math.PI / 2 + i * 0.7 + (universeT / U_EARTH_YEAR_S) * (2 * Math.PI) * (1 / pl.period);
                const Mw = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                const po = orbitOffset(pl, solveKepler(Mw, pl.e), rr);
                const px = cx + po.x;
                const py = cy + po.y;
                const pr = Math.max(1.6, pl.r * Math.min(1.3, 0.7 + zoom * 0.3));
                // 🌙 Moon-around-Earth — geometry computed BEFORE the globe is painted so
                // the far half of its orbit (and the Moon on it) is hidden behind Earth,
                // then the near half + Moon are drawn after (crossing IN FRONT). The Moon
                // genuinely swings from the BACK side of Earth to the FRONT side.
                // One loop every ~2.2 s on screen (real period 27.3 days), CCW like the
                // planets. Frozen under prefers-reduced-motion via universeMotionOK.
                let moonInfo = null;
                if (pl.you) {
                    const mSpin = universeMotionOK ? universeT : 0;
                    const mAng = -0.9 + mSpin * (2 * Math.PI / 2.2);
                    const mR = pr + 12;
                    const mPX = px + Math.cos(mAng) * mR;
                    const mPY = py + Math.sin(mAng) * mR * 0.38;
                    const mPR = Math.max(2, pr * 0.42);
                    const mFront = mPY >= py;             // below Earth's centre = near side
                    // FAR half of the lunar ring (sin < 0 ⇒ above centre)…
                    ctx.strokeStyle = 'rgba(200,220,242,0.65)'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.ellipse(px, py, mR, mR * 0.38, 0, Math.PI, 2 * Math.PI); ctx.stroke();
                    if (!mFront) drawUniverseMoonDisc(ctx, mPX, mPY, mPR);   // …Moon on the back side
                    moonInfo = { mPX: mPX, mPY: mPY, mPR: mPR, mR: mR, front: mFront,
                                 hidden: !mFront && Math.hypot(mPX - px, mPY - py) <= pr + mPR };
                }
                if (pl.ring) {   // Saturn's ring
                    ctx.save(); ctx.strokeStyle = 'rgba(228,207,154,0.85)'; ctx.lineWidth = Math.max(1, pr * 0.35);
                    ctx.beginPath(); ctx.ellipse(px, py, pr * 2, pr * 0.7, -0.35, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                }
                const pg = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.35, 0, px, py, pr);
                pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.25, pl.color); pg.addColorStop(1, pl.color);
                ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, 2 * Math.PI); ctx.fill();
                if (pl.you) {
                    ctx.strokeStyle = '#ffe3a3'; ctx.lineWidth = 1.6;
                    ctx.beginPath(); ctx.arc(px, py, pr + 4, 0, 2 * Math.PI); ctx.stroke();
                    universeLabel(ctx, '📍 YOU · Earth', px, py - 16, Math.max(9, pr + 3), '#ffe3a3');
                    if (moonInfo) {
                        // NEAR half of the lunar ring, over the globe (the far half was
                        // already painted behind it), then the Moon crossing IN FRONT.
                        ctx.strokeStyle = 'rgba(210,228,248,0.75)'; ctx.lineWidth = 1.1;
                        ctx.beginPath(); ctx.ellipse(px, py, moonInfo.mR, moonInfo.mR * 0.38, 0, 0, Math.PI); ctx.stroke();
                        if (moonInfo.front) {
                            drawUniverseMoonDisc(ctx, moonInfo.mPX, moonInfo.mPY, moonInfo.mPR);
                            universeLabel(ctx, 'Moon', moonInfo.mPX, moonInfo.mPY - moonInfo.mPR - 8, Math.max(8, pr * 0.75), '#dfe9f5');
                        } else if (!moonInfo.hidden) {
                            // Back side but clear of Earth's disc — still visible, dimmer.
                            universeLabel(ctx, 'Moon', moonInfo.mPX, moonInfo.mPY - moonInfo.mPR - 8, Math.max(8, pr * 0.75), '#9db1c6');
                        }
                    }
                } else {
                    // Every planet is ALWAYS named (no zoom gating); Earth's marker above
                    // already carries its name.
                    universeLabel(ctx, pl.name, px, py + pr + 9, Math.max(8, pr * 0.9), '#b9cfe8');
                }
            }
        }


        // ---------- 🌠 Milky Way: rotating barred spiral, Sun on the Orion Arm ----------
        // Pre-computed spiral star field; the whole disc turns slowly (differential
        // rotation: inner stars faster). The Sun sits ~26,000 ly from the centre.
        let uGalaxyStars = null;
        function buildUniverseGalaxy() {
            const out = [];
            const rnd = (s) => { let x = Math.sin(s) * 43758.5453; return x - Math.floor(x); };
            for (let arm = 0; arm < 4; arm += 1) {
                for (let s = 0; s < 260; s += 1) {
                    const t = s / 260;
                    const baseAng = arm * (Math.PI / 2) + t * Math.PI * 2.4;   // 2.4-turn spiral
                    const spread = (rnd(s * 7.1 + arm * 31) - 0.5) * 0.5 * (0.3 + t);
                    const rad = 0.10 + 0.90 * t + (rnd(s * 3.3 + arm) - 0.5) * 0.06;
                    out.push({ ang: baseAng + spread, rad: rad, hue: rnd(s + arm * 9), tw: rnd(s * 1.7 + arm) });
                }
            }
            for (let b = 0; b < 220; b += 1) {   // central bulge / bar
                const a = rnd(b * 2.1) * Math.PI * 2;
                const r = Math.pow(rnd(b * 5.3), 1.7) * 0.22;
                out.push({ ang: a, rad: r, hue: 0.12, tw: rnd(b * 3.1), bar: true });
            }
            return out;
        }
        function drawUniverseGalaxy(ctx, w, hh, cx, cy, zoom) {
            if (!uGalaxyStars) uGalaxyStars = buildUniverseGalaxy();
            const R = Math.min(w, hh) * 0.44 * zoom;
            // Rigid disc turn + differential shear TOGETHER: the whole pattern
            // rotates (rot) while inner stars lap the outer ones (shear). The
            // Sun rides rot exactly so it never leaves the Orion Arm.
            // Respects prefers-reduced-motion (frozen sky when reduced motion).
            const spin = universeMotionOK ? universeT : 0;
            const rot = spin * 0.05;                                // slow, steady turn (~2 min/rev)
            // Core glow
            const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.28);
            core.addColorStop(0, 'rgba(255,246,220,0.95)'); core.addColorStop(0.5, 'rgba(255,210,150,0.35)'); core.addColorStop(1, 'rgba(255,190,120,0)');
            ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R * 0.28, 0, 2 * Math.PI); ctx.fill();
            for (let i = 0; i < uGalaxyStars.length; i += 1) {
                const st = uGalaxyStars[i];
                // Cohesive drift: one rigid turn (rot) carries the whole pattern, plus a
                // tiny BOUNDED sway per star (a sine wobble, never accumulating) so the
                // arms shimmer but can never wind up or drift apart over time.
                const sway = st.bar
                    ? Math.sin(spin * 0.4 + st.tw * 6.283) * 0.03
                    : Math.sin(spin * 0.35 + st.tw * 6.283) * 0.05 * (1.15 - st.rad * 0.5);
                const a = st.ang + rot + sway;
                const rr = R * st.rad;
                const x = cx + Math.cos(a) * rr;
                const y = cy + Math.sin(a) * rr * 0.42;                  // face-on-ish tilt
                const tw = 0.65 + 0.35 * Math.sin(universeT * 2 + st.tw * 20);
                ctx.globalAlpha = (0.35 + 0.6 * (1 - st.rad * 0.6)) * tw;
                // Blue-white on the arms, warm gold toward the core
                ctx.fillStyle = st.hue > 0.7 ? '#bcd8ff' : st.bar ? '#ffe3b0' : '#eaf1ff';
                const size = st.bar ? 0.9 + st.tw * 0.7 : 0.7 + (1 - st.rad) * 1.1;
                ctx.beginPath(); ctx.arc(x, y, size, 0, 2 * Math.PI); ctx.fill();
            }
            ctx.globalAlpha = 1;
            // Sun: ~26,000 ly out, on the Orion Arm (between Perseus and Sagittarius).
            // Rides `rot` EXACTLY like the arm pattern, so it stays on its arm
            // instead of drifting through the disc.
            const sunAng = 2.35 + rot;
            const sunRr = R * 0.55;
            const sx = cx + Math.cos(sunAng) * sunRr, sy = cy + Math.sin(sunAng) * sunRr * 0.42;
            ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, 2 * Math.PI); ctx.fill();
            ctx.strokeStyle = 'rgba(255,227,163,0.9)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(sx, sy, 6 + Math.sin(universeT * 3) * 1.2, 0, 2 * Math.PI); ctx.stroke();
            universeLabel(ctx, '📍 YOU · Sun (Orion Arm)', sx, sy - 14, Math.max(9, R * 0.05), '#ffe3a3');
            universeLabel(ctx, 'Milky Way · ≈100,000 ly across', cx, cy + R * 0.62, Math.max(9, R * 0.05), '#9db8d8');
        }

        // ---------- 🔭 The Local Group: Andromeda, Triangulum, LMC — each turning ----------
        // Correct way: each galaxy spins around its OWN centre (arm angle +
        // spin), all in the same counter-clockwise sense as the Milky Way.
        // Frozen when prefers-reduced-motion is set.
        function drawUniverseGalaxyAt(ctx, x, y, R, seed, turns, tilt) {
            const rnd = (s) => { let v = Math.sin(s * 12.9898 + seed) * 43758.5453; return v - Math.floor(v); };
            const spin = universeMotionOK ? universeT : 0;
            const core = ctx.createRadialGradient(x, y, 0, x, y, R * 0.35);
            core.addColorStop(0, 'rgba(255,248,225,0.95)'); core.addColorStop(1, 'rgba(255,200,140,0)');
            ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, R * 0.35, 0, 2 * Math.PI); ctx.fill();
            for (let arm = 0; arm < 2; arm += 1) {
                for (let s = 0; s < 90; s += 1) {
                    const t = s / 90;
                    const ang = spin * 0.06 + arm * Math.PI + t * Math.PI * turns + (rnd(s * 3 + arm) - 0.5) * 0.4;
                    const rr = R * (0.12 + 0.88 * t + (rnd(s * 7 + arm) - 0.5) * 0.05);
                    const px = x + Math.cos(ang) * rr;
                    const py = y + Math.sin(ang) * rr * tilt;
                    ctx.globalAlpha = (0.2 + 0.7 * (1 - t * 0.5)) * (universeMotionOK ? (0.6 + 0.4 * Math.sin(spin * 2 + s)) : 1);
                    ctx.fillStyle = t > 0.75 ? '#a9ccff' : '#ffeccb';
                    ctx.beginPath(); ctx.arc(px, py, 0.9 + (1 - t) * 0.8, 0, 2 * Math.PI); ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
        }
        function drawUniverseDeep(ctx, w, hh, cx, cy, zoom) {
            const s = Math.min(w, hh) * 0.5 * zoom;
            drawUniverseGalaxyAt(ctx, cx - s * 0.42, cy - s * 0.28, s * 0.30, 3.7, 2.6, 0.5);  // Andromeda (M31)
            universeLabel(ctx, 'Andromeda · 2.5M ly', cx - s * 0.42, cy - s * 0.28 + s * 0.34, Math.max(9, s * 0.05), '#bcd4f0');
            drawUniverseGalaxyAt(ctx, cx + s * 0.46, cy + s * 0.10, s * 0.20, 8.1, 2.2, 0.6);   // Triangulum (M33)
            universeLabel(ctx, 'Triangulum · 2.7M ly', cx + s * 0.46, cy + s * 0.10 + s * 0.24, Math.max(9, s * 0.045), '#bcd4f0');
            drawUniverseGalaxyAt(ctx, cx + s * 0.05, cy + s * 0.52, s * 0.13, 5.5, 1.8, 0.7);  // Large Magellanic Cloud
            universeLabel(ctx, 'LMC · 163k ly', cx + s * 0.05, cy + s * 0.52 + s * 0.17, Math.max(9, s * 0.045), '#bcd4f0');
            // Milky Way as a small edge-on disc — our home among them
            drawUniverseGalaxyAt(ctx, cx - s * 0.16, cy + s * 0.18, s * 0.10, 1.3, 2.4, 0.35);
            universeLabel(ctx, 'Milky Way · 📍 YOU', cx - s * 0.16, cy + s * 0.18 + s * 0.14, Math.max(9, s * 0.045), '#ffe3a3');
            universeLabel(ctx, 'The Local Group · millions of light-years', cx, cy + s * 0.86, Math.max(9, s * 0.05), '#9db8d8');
        }
        // ---------- 🔧 Zoom controls + bootstrapping ----------
        function initUniverse() {
            if (universeReady) { drawUniverse(); return; }
            universeReady = true;
            document.querySelectorAll('.universe-btn').forEach((b) => {
                b.addEventListener('click', () => setUniverseView(b.getAttribute('data-universe')));
            });
            const zi = document.getElementById('universe-zoom-in');
            const zo = document.getElementById('universe-zoom-out');
            const zr = document.getElementById('universe-zoom-reset');
            if (zi) zi.addEventListener('click', () => universeZoomBy(1.25));
            if (zo) zo.addEventListener('click', () => universeZoomBy(0.8));
            if (zr) zr.addEventListener('click', () => { universeZoom[universeView] = 1; drawUniverse(); });
            const stage = document.getElementById('universe-canvas');
            if (stage) stage.addEventListener('wheel', (e) => { e.preventDefault(); universeZoomBy(e.deltaY < 0 ? 1.12 : 0.9); }, { passive: false });
            setUniverseView('earth');
            loadUniverseLand(() => drawUniverse());
            if (!universeRaf) universeRaf = requestAnimationFrame(universeLoop);
        }
        // ===== ☀️ Solar tab (radiation + UV + sunshine, every 15 min) ======
        // Data comes from /api/solar (keyless Open-Meteo, server-cached 15 min);
        // the weather payload's embedded `solar` block is the instant first
        // paint, then the dedicated endpoint refreshes on its own 15-minute
        // clock so it never waits for the 30-second weather refresh.
        const solarGrid = document.getElementById('solar-grid');
        const solarLocationEl = document.getElementById('solar-location');
        const solarAdviceEl = document.getElementById('solar-advice');
        const solarFootEl = document.getElementById('solar-foot');
        const solarSubtitleEl = document.getElementById('solar-subtitle');
        const SOLAR_REFRESH_MS = 15 * 60 * 1000;
        let latestSolarData = null;
        let solarTimer = 0;
        let sunArcTimer = 0;
        let solarFetchInFlight = false;

        function solarFmt(n, suffix) {
            return (typeof n === 'number' && Number.isFinite(n)) ? (n + (suffix || '')) : '—';
        }
        function solarDuration(sec) {
            if (typeof sec !== 'number' || !Number.isFinite(sec) || sec < 0) return '—';
            const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
            return h > 0 ? (h + 'h ' + m + 'm') : (m + ' min');
        }
        function solarUvClass(level) {
            const l = String(level || 'unknown').toLowerCase().replace(/\s+/g, '-');
            return ['low', 'moderate', 'high', 'very-high', 'extreme'].includes(l) ? l : 'unknown';
        }
        function solarClock(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '—';
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        function solarHourLabel(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '';
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        function renderSolar(data) {
            const solar = (data && data.solar) || latestSolarData;
            if (!solar || !solarGrid) return;
            latestSolarData = solar;
            const L = (en) => (typeof t === 'function' ? t(en) : en);
            if (solarSubtitleEl) solarSubtitleEl.textContent = L('Solar intensity · radiation · UV');
            if (solarLocationEl) solarLocationEl.textContent = '📍 ' + ((data && data.location) || '—');
            const uvLabelEn = solar.uvLabel || 'Unknown';
            const uvLabel = (typeof t === 'function' ? t(uvLabelEn) : uvLabelEn);
            const night = solar.isDay === false;
            solarGrid.innerHTML =
                '<div class="solar-cell"><div class="solar-emoji">🔆</div><div class="solar-value">' + solarFmt(solar.shortwaveWm2, ' W/m²') + '</div><div class="solar-label">' + L('Solar intensity') + '</div><div class="solar-sub">' + L('Radiation') + '</div></div>' +
                '<div class="solar-cell"><div class="solar-emoji">☀️</div><div class="solar-value">' + solarFmt(solar.directWm2, ' W/m²') + '</div><div class="solar-label">' + L('Direct') + '</div><div class="solar-sub">' + solarFmt(solar.diffuseWm2, ' W/m²') + ' ' + L('Diffuse') + '</div></div>' +
                '<div class="solar-cell"><div class="solar-emoji">' + (night ? '🌙' : '😎') + '</div><div class="solar-value">' + solarFmt(solar.uvIndex, '') + '</div><div class="solar-label">' + L('UV index') + '</div><div class="solar-sub">' + L('Clear-sky UV') + ': ' + solarFmt(solar.uvClearSky, '') + (night ? ' · ' + L('Night') : '') + '</div><span class="solar-uv-pill ' + solarUvClass(solar.uvLevel) + '">' + uvLabel + '</span></div>' +
                '<div class="solar-cell"><div class="solar-emoji">⏱️</div><div class="solar-value">' + solarDuration(solar.sunshineSeconds) + '</div><div class="solar-label">' + L('Sunshine') + '</div><div class="solar-sub">' + L('Daylight duration') + ': ' + solarDuration(solar.daylightSeconds) + '</div></div>';
            if (solarAdviceEl) solarAdviceEl.textContent = (typeof translateFragments === 'function' ? translateFragments(solar.uvAdvice || '') : (solar.uvAdvice || ''));
            // 🌅🌇 Sunrise / sunset row (location-local ISO from the API).
            const sunRow = document.getElementById('solar-sunrow');
            const sunriseEl = document.getElementById('solar-sunrise');
            const sunsetEl = document.getElementById('solar-sunset');
            const sunriseLabel = document.getElementById('solar-sunrise-label');
            const sunsetLabel = document.getElementById('solar-sunset-label');
            if (sunriseLabel) sunriseLabel.textContent = L('Sunrise');
            if (sunsetLabel) sunsetLabel.textContent = L('Sunset');
            if (sunriseEl) sunriseEl.textContent = solarClock(solar.sunrise);
            if (sunsetEl) sunsetEl.textContent = solarClock(solar.sunset);
            if (sunRow) sunRow.hidden = !(solar.sunrise || solar.sunset);
            updateSunArc();
            // 📈 Hourly solar + UV + temperature forecast strip (next 12 hours).
            const fcTitle = document.getElementById('solar-fc-title');
            const strip = document.getElementById('solar-strip');
            const hours = Array.isArray(solar.hourly) ? solar.hourly.slice(0, 12) : [];
            if (fcTitle) {
                fcTitle.hidden = !hours.length;
                if (hours.length) fcTitle.textContent = L('Solar & UV — next 12 hours');
            }
            if (strip) {
                strip.hidden = !hours.length;
                if (hours.length) {
                    const peak = Math.max(1, ...hours.map((h) => (typeof h.shortwaveWm2 === 'number' ? h.shortwaveWm2 : 0)));
                    strip.innerHTML = hours.map((h) => {
                        const w = (typeof h.shortwaveWm2 === 'number' && Number.isFinite(h.shortwaveWm2)) ? h.shortwaveWm2 : null;
                        const uv = (typeof h.uvIndex === 'number' && Number.isFinite(h.uvIndex)) ? h.uvIndex : null;
                        const tc = (typeof h.tempC === 'number' && Number.isFinite(h.tempC)) ? h.tempC : null;
                        const pct = w == null ? 0 : Math.round((w / peak) * 100);
                        const icon = h.isDay === false ? '🌙' : (w != null && w >= 400 ? '🔆' : (w != null && w >= 100 ? '☀️' : '⛅'));
                        const tip = solarHourLabel(h.time) + ' · ' + solarFmt(w, ' W/m²') + ' · UV ' + solarFmt(uv, '') + ' · ' + solarFmt(tc, '°');
                        return '<div class="solar-slot' + (h.isDay === false ? ' is-night' : '') + '" title="' + tip + '">' +
                            '<div class="ss-time">' + (solarHourLabel(h.time) || '—') + '</div>' +
                            '<div class="ss-icon">' + icon + '</div>' +
                            '<div class="ss-w">' + solarFmt(w, '') + '</div>' +
                            '<div class="ss-bar"><span class="ss-fill" style="width:' + pct + '%"></span></div>' +
                            '<div class="ss-uv">UV ' + solarFmt(uv, '') + '</div>' +
                            '<div class="ss-temp">' + solarFmt(tc == null ? null : Math.round(tc), '°') + '</div></div>';
                    }).join('');
                }
            }
            if (solarFootEl) {
                const when = solar.updated ? new Date(solar.updated).toLocaleTimeString() : '';
                solarFootEl.textContent = L('Refreshing every 15 minutes') + (when ? ' · ' + L('Updated') + ' ' + when : '') + ' · ' + L('Modelled solar + UV (Open-Meteo)');
            }
        }
        // 🌅 The arc's sun dot tracks the clock — sunrise (left base) → noon (apex) →
        // sunset (right base) — re-positioned every 30 s. The arc box is a half-ellipse
        // (border-radius 50% 50% 0 0 / 100% 100% 0 0 ⇒ centre at bottom-middle,
        // rx = half the width, ry = the full height), so a point on the curve is
        // x = 50% + 50%·cos φ, y = H − H·sin φ, with φ running π (sunrise) → 0 (sunset).
        // Linear time ⇒ sin φ gives the classic sine-shaped altitude path across the day.
        // Outside daylight the dot clamps to the horizon ends and dims (is-night).
        function updateSunArc() {
            const arc = document.querySelector('.solar-sun-arc');
            const dot = document.getElementById('solar-sun-dot');
            const solar = latestSolarData;
            if (!arc || !dot || !solar || !solar.sunrise || !solar.sunset) return;
            const sr = new Date(solar.sunrise).getTime();
            const ss = new Date(solar.sunset).getTime();
            if (Number.isNaN(sr) || Number.isNaN(ss) || ss <= sr) return;
            const now = Date.now();
            const p = Math.min(1, Math.max(0, (now - sr) / (ss - sr)));
            const phi = Math.PI * (1 - p);
            const h = arc.offsetHeight || 26;          // hidden panel fallback: CSS height
            dot.style.left = (50 + 50 * Math.cos(phi)) + '%';
            dot.style.top = (h - h * Math.sin(phi) - 4) + 'px';   // noon lands on the old static −4px
            dot.classList.toggle('is-night', now < sr || now > ss);
        }
        async function fetchSolar(onlyIfVisible) {
            if (solarFetchInFlight) return;
            if (onlyIfVisible && panelSolar && panelSolar.hidden) return;
            const lat = (latestWeatherData && typeof latestWeatherData.latitude === 'number') ? latestWeatherData.latitude : (typeof globeMarkerLat === 'number' ? globeMarkerLat : null);
            const lon = (latestWeatherData && typeof latestWeatherData.longitude === 'number') ? latestWeatherData.longitude : (typeof globeMarkerLng === 'number' ? globeMarkerLng : null);
            if (lat == null || lon == null) return;
            solarFetchInFlight = true;
            try {
                const res = await fetch('/api/solar?lat=' + lat + '&lon=' + lon);
                if (!res.ok) return;
                const body = await res.json();
                if (body && body.available !== false) {
                    latestSolarData = body;
                    renderSolar(Object.assign({}, latestWeatherData || {}, { solar: body }));
                }
            } catch (e) { /* keep the embedded solar block */ }
            finally { solarFetchInFlight = false; }
        }
        if (solarTimer) clearInterval(solarTimer);
        solarTimer = setInterval(() => fetchSolar(false), SOLAR_REFRESH_MS);
        // 🌅 Keep the arc's sun in sync with the clock (30 s catches every minute
        // boundary; cheap DOM write, runs whether or not the Solar tab is open).
        if (sunArcTimer) clearInterval(sunArcTimer);
        sunArcTimer = setInterval(updateSunArc, 30 * 1000);

        // The API's wind_direction is where the wind comes FROM (0° = from the
        // north), so the arrow — drawn pointing UP — is rotated 180° to point
        // where the wind blows TO. Same rule the 🛰️ map wind layer uses.
        function f14WindArrow(dirDeg) {
            const deg = typeof dirDeg === 'number' && Number.isFinite(dirDeg) ? dirDeg : 0;
            const toward = ((deg + 180) % 360 + 360) % 360;
            return `<svg class="f14-wind-arrow" viewBox="0 0 24 24" style="transform: rotate(${toward}deg)" aria-hidden="true"><path d="M12 2l6 10h-4v10h-4V12H6z"/></svg>`;
        }

        function f14DateLabel(dateString) {
            const d = new Date(`${dateString}T12:00:00`);
            return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        }
        function renderForecast14(data) {
            if (!forecast14List) return;
            const days = data?.forecast14;
            if (!Array.isArray(days) || !days.length) {
                forecast14List.innerHTML = '<div class="forecast14-note">The 14-day forecast is temporarily unavailable for this location.</div>';
                return;
            }
            if (forecast14Location) forecast14Location.textContent = `📍 ${data.location || '—'}`;

            // Scale every day's min–max range bar against the fortnight envelope,
            // so bars are comparable across all 14 rows at a glance.
            const highs = days.map((d) => d.high).filter((v) => v != null);
            const lows = days.map((d) => d.low).filter((v) => v != null);
            const envHigh = highs.length ? Math.max(...highs) : 0;
            const envLow = lows.length ? Math.min(...lows) : 0;
            const envSpan = Math.max(1, envHigh - envLow);

            forecast14List.innerHTML = days.map((day, index) => {
                const selectedClass = index === selectedDayIndex ? ' selected' : '';
                const dateLabel = f14DateLabel(day.date);
                const icon = getWeatherIcon(day.condition, day.weatherCode) || day.icon || '🌡️';
                const high = day.high != null ? `↑ ${day.high}°` : '↑ —';
                const low = day.low != null ? `↓ ${day.low}°` : '↓ —';
                let bar = '';
                if (day.low != null && day.high != null) {
                    const left = Math.max(0, Math.min(100, ((day.low - envLow) / envSpan) * 100));
                    const width = Math.max(4, Math.min(100 - left, ((day.high - day.low) / envSpan) * 100));
                    bar = `<span class="f14-range-track" title="Day range ${day.low}°C … ${day.high}°C"><span class="f14-range-fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></span></span>`;
                }
                const rain = day.rainProb != null ? `💧 ${day.rainProb}%` : '💧 —';
                const mm = day.precipMm != null && day.precipMm > 0 ? `<span class="f14-rain-mm">${day.precipMm} mm</span>` : '';
                const windTitle = day.windDirDeg != null
                    ? `Wind from ${day.windDirection} (${day.windDirDeg}°)`
                    : `Wind from ${day.windDirection}`;
                const slotCount = Array.isArray(day.hours) ? day.hours.length : 0;
                const isOpen = index === expandedF14Day;
                const hint = slotCount ? `<span class="f14-expand-hint">${isOpen ? '▴ hide 30-min' : '▾ 30-min'}</span>` : '';
                const slotsHtml = isOpen ? renderF14Slots(day) : '';
                return `
                    <div class="f14-day${selectedClass}${isOpen ? ' expanded' : ''}" data-day-index="${index}" title="${day.condition}">
                        <button type="button" class="f14-day-main" data-day-index="${index}" aria-expanded="${isOpen}" aria-label="${day.day} ${day.condition} — ${isOpen ? 'collapse' : 'expand'} half-hour slots">
                        <span class="f14-day-name">${day.day}${dateLabel ? `<small>${dateLabel}</small>` : ''}${hint}</span>
                        <span class="f14-day-weather"><span class="f14-day-icon">${icon}</span><span class="f14-day-cond">${day.condition}</span></span>
                        <span class="f14-day-temps"><span class="t-max">${high}</span><span class="t-min">${low}</span></span>
                        <span class="f14-day-bar">${bar}</span>
                        <span class="f14-day-wind" title="${windTitle}">${f14WindArrow(day.windDirDeg)}<span class="f14-wind-text"><b>${day.windSpeed ?? '—'} km/h</b><small>${day.windDirection ?? '—'} · Bf ${day.beaufort ?? '—'}</small></span></span>
                        <span class="f14-day-rain"><span class="f14-rain-chip">${rain}</span>${mm}</span>
                        </button>
                        ${slotsHtml}
                    </div>`;
            }).join('');
            attachForecast14Handlers();
            // Re-assert single-open: render + async refreshes must never leave
            // two expanded rows behind (e.g. after a data refresh mid-tap).
            {
                const open = forecast14List.querySelectorAll('.f14-day.expanded');
                open.forEach((row, i) => {
                    if (i > 0) row.classList.remove('expanded');
                });
            }
        }

        // ===== ⏱️ 30-minute drill-down: which day row is expanded ============
        // (state lives next to selectedDayIndex at the top of the script).
        // Selecting a day (stat cards) and expanding its half-hour slots are
        // separate gestures sharing one tap: the first tap selects + expands,
        // tapping the open row again collapses it but keeps it selected.
        // (expandedF14Day is declared next to selectedDayIndex above.)

        // Renders the 48 half-hour slots of one day as a grid of chips: each
        // chip is a small stacked card — time, weather icon, temperature, wind
        // (speed + direction + Beaufort force) and, on their own dedicated
        // line, the chance of rain 💧 % and of sunshine ☀️ % for that exact
        // half hour. Nothing is allowed to overflow the chip border.
        function renderF14Slots(day) {
            const slots = Array.isArray(day.hours) ? day.hours : [];
            if (!slots.length) return '<span class="f14-slots"><span class="f14-slots-empty">Half-hour slots unavailable for this day.</span></span>';
            return `<span class="f14-slots">${slots.map((s) => {
                const sIcon = getWeatherIcon(s.condition, s.weatherCode, s.isDay === false ? false : true) || s.icon || '🌡️';
                const sTemp = s.temperature != null ? `${s.temperature}°` : '—';
                const sDir = s.windDirection || '—';
                const sWindTitle = s.windDirDeg != null ? `Wind from ${sDir} (${s.windDirDeg}°)` : 'Wind';
                const sRain = s.rainProb != null ? `💧 ${s.rainProb}%` : '💧 —';
                const sSun = s.sunProb != null ? `☀️ ${s.sunProb}%` : '☀️ —';
                return `<span class="f14-slot${s.isDay === false ? ' night' : ''}" title="${s.time} · ${s.condition} · ${sTemp} · wind ${sDir} ${s.windSpeed ?? '—'} km/h (Bf ${s.beaufort ?? '—'}) · rain ${s.rainProb ?? '—'}% · sun ${s.sunProb ?? '—'}%${s.precipMm ? ` · ${s.precipMm} mm` : ''}">` +
                    `<span class="hh-time">${s.time}</span>` +
                    `<span class="hh-icon">${sIcon}</span>` +
                    `<span class="hh-temp">${sTemp}</span>` +
                    `<span class="hh-wind" title="${sWindTitle}">${f14WindArrow(s.windDirDeg)} ${s.windSpeed ?? '—'} km/h</span>` +
                    `<span class="hh-bf">${sDir} · Bf ${s.beaufort ?? '—'}</span>` +
                    `<span class="hh-probs"><span class="hh-prob rain" title="Chance of rain">${sRain}</span><span class="hh-prob sun" title="Chance of sunshine">${sSun}</span></span>` +
                    `</span>`;
            }).join('')}</span>`;
        }

        function selectForecast14Day(dayIndex, options) {
            if (!latestWeatherData?.forecast14?.[dayIndex]) return;
            selectedDayIndex = dayIndex;
            // Single-open accordion: opening a day closes any previously
            // open day; tapping the open row again collapses it (but keeps
            // the day selected for the stat cards).
            expandedF14Day = expandedF14Day === dayIndex ? -1 : dayIndex;
            updateStatsDisplay(dayIndex);
            renderForecast14(latestWeatherData);
            // Keep the newly expanded row fully in view so its 48 half-hour
            // slots (the sliding strip) are visible without manual scrolling.
            if (expandedF14Day === dayIndex && !options?.noScroll) {
                requestAnimationFrame(() => {
                    const el = forecast14List?.querySelector(`.f14-day[data-day-index="${dayIndex}"]`);
                    if (el && typeof el.scrollIntoView === 'function') {
                        try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch { /* ignore */ }
                    }
                });
            }
        }

        function attachForecast14Handlers() {
            if (!forecast14List) return;
            // Single-open accordion: only the summary button toggles. The
            // slots live outside the button so scrolling them never collapses.
            forecast14List.querySelectorAll('.f14-day-main').forEach((el) => {
                el.addEventListener('click', () => {
                    selectForecast14Day(Number(el.dataset.dayIndex));
                });
            });
        }

        // 🎨 getWeatherIcon() now lives in the ONE canonical icon set at the top of
        // this script, so the hero, the 3-day cards, the 14-day rows, the
        // half-hour slots, the nowcast strip, the globe and the map all draw the
        // same icon for the same weather.

        function conditionToMarkerType(condition) {
            const normalized = (condition || '').toLowerCase();
            if (normalized.includes('clear night')) return 'night';
            if (normalized.includes('thunder')) return 'thunder';
            if (normalized.includes('rain') || normalized.includes('drizzle') || normalized.includes('shower')
                || normalized.includes('sleet') || normalized.includes('hail')) return 'rain';
            if (normalized.includes('cloud') || normalized.includes('overcast')
                || normalized.includes('fog') || normalized.includes('mist')) return 'clouds';
            return 'sun';
        }

        // Builds the "Current icon reference" table from WEATHER_ICON_LEGEND, so
        // the legend always shows exactly the icons the app draws.
        function renderWeatherIconReference() {
            const table = document.getElementById('icon-list-table');
            if (!table || !table.tBodies.length) return;
            table.tBodies[0].innerHTML = WEATHER_ICON_LEGEND.map((row) =>
                `<tr data-condition="${row.group}"><td class="icon">${row.icon}</td><td>${row.label}</td></tr>`
            ).join('');
        }

        // Keeps exactly the legend row that belongs to the weather on screen —
        // the group comes from the SAME canonical table as the icon, so the
        // reference table always explains the icon the user is looking at.
        function showOnlyCurrentWeatherIcon(condition, weatherCode, isDay) {
            const rows = document.querySelectorAll('#icon-list-table tr');
            const visibleGroup = getVisibleConditionGroup(condition, weatherCode, isDay);
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
                const feels = day.feelsHigh != null ? `${day.feelsHigh}°` : null;
                return `
                    <button type="button" class="forecast-day${selectedClass}" data-day-index="${index}" aria-pressed="${index === selectedDayIndex}">
                        <div class="forecast-day-name">${day.day}</div>
                        <div class="forecast-day-icon" aria-label="${day.condition}">${dayIcon}</div>
                        <div class="forecast-day-condition">${day.condition}</div>
                        <div class="forecast-day-temps">H: ${high} / L: ${low}</div>
                        ${feels ? `<div class="forecast-day-temps">🌡️ Feels: ${feels}</div>` : ''}
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
                const uv = typeof slot.uvPct === 'number' ? (slot.isDay === false ? '🌙 0%' : `☀️ ${slot.uvPct}%`) : '';
                const condShort = String(slot.condition || '').replace('Showers', 'Shwr').replace('Slight ', '').replace('Heavy ', '');
                // 🎨 The icon comes from the ONE canonical set (not the payload)
                // so a nowcast slot can never disagree with the hero, the 3-day
                // cards, the 14-day rows or the 🛰️ map for the same weather.
                const slotIcon = getWeatherIcon(slot.condition, slot.weatherCode, slot.isDay === false ? false : true);
                return `
                    <div class="nowcast-slot${extra}" title="${slot.condition} · 🌡️ feels ${slot.feelsLike != null ? slot.feelsLike + '°C' : '—'} (1.50 m) · ${slot.precipMm || 0}mm · ${slot.precipProb}% · ${slot.windKmh || 0} km/h${typeof slot.uvIndex === 'number' ? ` · UV ${slot.uvIndex} · sun ${slot.uvPct}%` : ''}">
                        <div class="slot-time">${slot.label}</div>
                        <div class="slot-icon">${slotIcon}</div>
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
                            ${renderBadge(s.hasRain, 'active-rain', weatherIconForGroup('Rain'), 'Rain')}
                            ${renderBadge(s.hasHail, 'active-hail', weatherIconForGroup('Hail Storm'), 'Hail')}
                            ${renderBadge(s.hasSnow, 'active-snow', weatherIconForGroup('Snow'), 'Snow')}
                            ${renderBadge(s.hasSun, 'active-sun', weatherIconForGroup('Clear'), 'Sun')}
                            ${renderBadge(s.strongWind, 'active-wind', weatherIconForGroup('Windy'), 'Strong wind')}
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
        const LOCALMAP_HOME_EPSILON = 0.01;
        let localMapFrame = 0;
        let latestLocalMapFrameTimes = null;   // epoch ms per frame (clock times)
        let localMapPlayTimer = 0;
        let localMapAutoPlayed = false;        // ▶ the preview starts itself once per page load
        let localMapRedrawPending = false;

        // ===== 🗺️ Radar layer toggles: which overlays the top-down screen shows.
        // 'topo' = OpenTopoMap terrain basemap (great view from above, shows the
        // elevation), 'osm' = street map. Preferences are remembered locally.
        const LOCALMAP_LAYER_DEFAULTS = { topo: true, clouds: true, fog: true, rain: true, snow: true, hail: true, wind: true };
        let localMapLayers = { ...LOCALMAP_LAYER_DEFAULTS };
        try {
            const savedLayers = JSON.parse(localStorage.getItem('localmap-layers') || 'null');
            if (savedLayers && typeof savedLayers === 'object') localMapLayers = { ...LOCALMAP_LAYER_DEFAULTS, ...savedLayers };
            // Defaults to the bright vector map, but after the first visit we
            // respect the user's saved choice (including the dark style).
            try { localStorage.setItem('localmap-layers', JSON.stringify(localMapLayers)); } catch (err2) { /* private mode */ }
            try { localStorage.setItem('localmap-vector-migrated', '2'); } catch (err3) { /* private mode */ }
        } catch (err) { /* fresh defaults on first visit */ }
        let localMapBasemap = 'topo';   // 🎨 Colour is the written look: the colourful
            // vector basemap (green parks, blue water) — always, for everyone.
            // The 🎨 Colour chip is the control for it; saved prefs only decide
            // the WEATHER overlays (clouds/rain/…). A stored dark 'osm' basemap
            // from an older visit is migrated to colourful, never re-applied.

        // Same classification the backend uses (api/weather.js classifyLocalCell)
        // so a future frame reads exactly like the live view does. Trace amounts
        // (drizzle codes 51–57, or 0 < mm < 0.3) get their own faint drizzle
        // class so a sun shower never paints like a downpour.
        const LOCALMAP_RAIN_MIN_MM = 0.3;
        // Snowy WMO codes: snow falls (71–77) + snow showers (85/86); a snowfall
        // amount > 0 counts too. Keep in sync with SNOW_CODES in api/weather.js.
        function localMapIsSnowy(code, snowfall) {
            return (code >= 71 && code <= 77) || code === 85 || code === 86 || snowfall > 0;
        }
        function localMapClassify(code, precipitation, snowfall, cloudCover) {
            if (code === 96 || code === 99) return 'hail';
            if (localMapIsSnowy(code, snowfall)) return 'snow';
            if (precipitation >= LOCALMAP_RAIN_MIN_MM) return 'rain';
            if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
            if ((code >= 51 && code <= 57) || precipitation > 0) return 'drizzle';
            if (code === 45 || code === 48) return 'fog';
            if (cloudCover >= 40) return 'clouds';
            return 'clear';
        }

        // Icon map: the weather condition → emoji painted on the map cells.
        // DERIVED from WEATHER_CODE_INFO at the top of this script — the same
        // canonical set the hero, the 3-day cards, the 14-day rows and the
        // nowcast strip use — so a map cell can never wear a different icon than
        // the rest of the app for the same weather code. Kept as [condition,
        // icon] tuples because every call site reads them positionally.
        const LOCALMAP_CODE_INFO = {};
        Object.keys(WEATHER_CODE_INFO).forEach((code) => {
            LOCALMAP_CODE_INFO[Number(code)] = [WEATHER_CODE_INFO[code].condition, WEATHER_CODE_INFO[code].icon];
        });
        // Fallback icon for any unmapped code
        const LOCALMAP_ICON_OTHER = WEATHER_ICON_OTHER;

        // 🌤️ Honest 15-minute sky — mirror of honestSlotWeather in api/weather.js:
        // an icon may only claim precipitation when something is really expected to
        // land (>= 0.1 mm, any snowfall, or a >= 60 % chance). WeatherAPI's "Patchy
        // rain nearby" (0.03 mm, 17 % chance) reaches the browser as a WMO rain code
        // and used to paint the rain emoji over a sunlit cell while the sun was
        // shining through the clouds. When the code and the amount disagree, the
        // amount wins and the cloud cover decides which sky is really overhead. The
        // backend already sends honest codes, so this is the safety net for payloads
        // cached before the fix (and keeps both ends on the same rule).
        const LOCALMAP_SLOT_RAIN_MIN_MM = 0.1;   // same trace threshold as the nowcast
        const LOCALMAP_SLOT_PROB_MIN = 60;       // same chance as the rain badge
        const LOCALMAP_WET_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];

        // Returns null when the code and the amounts already agree, otherwise the
        // honest { weatherCode, condition, icon } for this frame.
        function localMapHonestInfo(code, isDay, precipitation, precipProb, snowfall, cloudCover) {
            const expected = precipitation >= LOCALMAP_SLOT_RAIN_MIN_MM
                || snowfall > 0
                || precipProb >= LOCALMAP_SLOT_PROB_MIN;
            const claimsWet = LOCALMAP_WET_CODES.includes(code);
            // Precipitation is expected but the code says "clear sky": the amount wins.
            if (expected && !claimsWet) return { weatherCode: 51, condition: 'Showers', icon: LOCALMAP_CODE_INFO[51][1] };
            // The code claims rain / snow but nothing will land: sky overhead.
            if (claimsWet && !expected) {
                if (cloudCover >= 80) return { weatherCode: 3, condition: LOCALMAP_CODE_INFO[3][0], icon: LOCALMAP_CODE_INFO[3][1] };
                if (cloudCover >= 40) return { weatherCode: 2, condition: LOCALMAP_CODE_INFO[2][0], icon: LOCALMAP_CODE_INFO[2][1] };
                return isDay === false
                    ? { weatherCode: 0, condition: 'Clear Night', icon: WEATHER_ICON_NIGHT }
                    : { weatherCode: 0, condition: LOCALMAP_CODE_INFO[0][0], icon: LOCALMAP_CODE_INFO[0][1] };
            }
            return null;
        }

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
            const temp = s.temps && s.temps[i] != null ? s.temps[i] : cell.temp;
            const precipProb = s.prob && s.prob[i] != null ? s.prob[i] : 0;
            // 🌙 Night frames: a cloudless sky after dark shows the moon and the
            // stars — the sun cannot shine at night. is_day comes per 15-minute
            // slot in the cell's series (s.day); payloads without it (older
            // cached cells) stay daytime.
            const slotIsDay = Array.isArray(s.day) ? (s.day[i] ?? 1) === 1 : true;
            let info;
            if (!slotIsDay && (code === 0 || code === 1)) {
                info = code === 0
                    ? ['Clear Night', WEATHER_ICON_NIGHT]
                    : [LOCALMAP_CODE_INFO[1][0], WEATHER_ICON_NIGHT];
            } else {
                info = LOCALMAP_CODE_INFO[code] || ['Other', LOCALMAP_ICON_OTHER];
            }
            let typeCode = code;
            let typeSnow = snowfall;
            // Snow cannot fall when the air is well above freezing: a snowy code
            // at warm temperatures is a model quirk, so those frames read as rain
            // — the icon, the map blob type and the 🌡️ bar graph all match the
            // temperature (SNOW_TOO_WARM_C, same rule as the backend).
            if (typeof temp === 'number' && temp > SNOW_TOO_WARM_C && localMapIsSnowy(code, snowfall)) {
                info = ['Rain', '🌧️'];
                typeCode = 63;
                typeSnow = 0;
            }
            // 🌤️ Honest sky (mirror of honestSlotWeather in api/weather.js): a rain
            // code with nothing expected to land — "patchy rain nearby" with a
            // trace amount and a low chance — shows the sky that is really
            // overhead instead of rain while the sun shines through. Fresh
            // payloads already arrive with honest codes (api/weather.js derives
            // the whole series through honestSlotWeather); this is the safety net
            // for payloads cached before the fix, and keeps both ends on the rule.
            const honest = localMapHonestInfo(typeCode, slotIsDay, precipitation, precipProb, typeSnow, cloudCover);
            if (honest) {
                info = [honest.condition, honest.icon];
                typeCode = honest.weatherCode;
                typeSnow = 0;   // the honest code already carries the precipitation type
            }

            return {
                lat: cell.lat, lon: cell.lon,
                type: localMapClassify(typeCode, precipitation, typeSnow, cloudCover),
                condition: info[0], icon: info[1], weatherCode: code,
                temp,
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
            // 🌡️ The temperature graph follows the same timeline frame as the map.
            refreshLocalMapTempGraph();
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
            // The red needle stays centred over the forecast block directly
            // above it (the selected timeline segment) so it moves in sync
            // with the forecast slider / playback / tap. Falls back to the
            // frame-time percentage when the block cannot be measured.
            // calc(pct% − 1px) so the 2px-wide line is truly centred (its
            // middle, not its left edge, lands on the block centre).
            let needlePct = null;
            try {
                if (localMapTlForecast) {
                    const sel = localMapTlForecast.querySelector('i.sel[data-idx]')
                        || localMapTlForecast.querySelector('i[data-idx="' + localMapFrame + '"]');
                    const bar = localMapTlBar || localMapTlForecast;
                    if (sel && bar && bar.getBoundingClientRect) {
                        const b = bar.getBoundingClientRect();
                        const r = sel.getBoundingClientRect();
                        if (b && b.width > 0 && r && r.width > 0) needlePct = ((r.left + r.width / 2) - b.left) / b.width * 100;
                    }
                }
            } catch (err) { needlePct = null; }
            if (needlePct === null || !isFinite(needlePct)) { try { needlePct = localMapNeedlePct(); } catch (err) { needlePct = 50; } }
            needlePct = Math.max(0, Math.min(100, Number(needlePct) || 0));
            localMapTlNow.style.left = 'calc(' + needlePct.toFixed(2) + '% - 1px)';
        }

        // ▶ Movie loop: advance one 15-minute frame every 0.75 s, with a short
        // dwell when the loop restarts so the "now" frame registers.

        // ▶ The ⏩ 3-hour forecast starts itself: as soon as the first forecast
        // series is on screen there is something to play, so the preview loop runs
        // without anyone having to press ▶. The latch makes it a one-off action per
        // page load, so a 30-second weather refresh can never restart it while the
        // user has paused it (or dragged the slider to a frame of their own).
        function maybeStartLocalMapAutoplay() {
            if (localMapAutoPlayed) return;
            if (!latestLocalMapFrameTimes || latestLocalMapFrameTimes.length < 2) return;
            localMapAutoPlayed = true;
            startLocalMapPlayback();
        }

        function stopLocalMapPlayback() {
            if (localMapPlayTimer) { clearTimeout(localMapPlayTimer); localMapPlayTimer = 0; }
            if (localMapPlayBtn) {
                localMapPlayBtn.textContent = '▶';
                localMapPlayBtn.classList.remove('playing');
                localMapPlayBtn.setAttribute('aria-pressed', 'false');
                localMapPlayBtn.setAttribute('aria-label', 'Play the 3-hour radar prediction');
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
                localMapPlayBtn.setAttribute('aria-pressed', 'true');
                localMapPlayBtn.setAttribute('aria-label', 'Pause the 3-hour radar prediction');
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
            // Same canonical icons as everywhere else — hail wears 🧊 here too
            // (it used to be 🌨️, which is the freezing-rain icon).
            const kindIcon = {
                clear: weatherIconForGroup('Mainly Clear'),
                clouds: weatherIconForGroup('Cloudy'),
                rain: weatherIconForGroup('Rain'),
                snow: weatherIconForGroup('Snow'),
                hail: weatherIconForGroup('Hail Storm')
            };
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
                        ? `${slot.icon || weatherIconForGroup('Rain')} ${slot.condition || 'Precipitation'} — falling right now${laterEps} · ${cloudStory}`
                        : `${slot.icon || weatherIconForGroup('Rain')} ${slot.condition || 'Precipitation'} first at ${slot.label} · ${fmtIn(minutesAway)}${laterEps} · ${cloudStory}`;
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
            // Only a genuinely new place re-centres the map. Weather is refreshed
            // every 30 seconds as a new object; treating each refresh as a location
            // change repeatedly threw away the user's zoom while they were using
            // the controls. A new name or materially different coordinates still
            // resets the view immediately.
            const previousPlace = latestLocalMapData && (latestLocalMapData.location || '');
            const nextPlace = data && (data.location || '');
            const oldLat = latestLocalMapData && Number(latestLocalMapData.latitude);
            const newLat = data && Number(data.latitude);
            const oldLng = latestLocalMapData && Number(latestLocalMapData.longitude);
            const newLng = data && Number(data.longitude);
            const placeChanged = latestLocalMapData && (
                (previousPlace && nextPlace && previousPlace !== nextPlace) ||
                (Number.isFinite(oldLat) && Number.isFinite(newLat) && Math.abs(oldLat - newLat) > LOCALMAP_HOME_EPSILON) ||
                (Number.isFinite(oldLng) && Number.isFinite(newLng) && Math.abs(oldLng - newLng) > LOCALMAP_HOME_EPSILON)
            );
            if (placeChanged) {
                stopLocalMapPlayback();
                // A NEW place is a fresh preview: re-arm the one-shot latch so the
                // ⏩ player starts itself for this location too. Same-place 30-second
                // refreshes never reach this branch, so a pause the user chose still
                // sticks — and a GPS/search/tap location change can no longer leave
                // the player stuck on ▶ forever.
                localMapAutoPlayed = false;
                localMapFrame = 0;
                if (localMapFrameSlider) localMapFrameSlider.value = '0';
                highlightLocalMapFrame();
                // drawLocalMap() below detects the new grid and performs the one
                // and only fitBounds for this location.
                localMapGLState.homeKey = '';
            }
            latestLocalMapData = data;
            latestLocalMapFrameTimes = localMapFrameTimes(data);
            const maxFrame = latestLocalMapFrameTimes ? Math.max(0, latestLocalMapFrameTimes.length - 1) : LOCALMAP_FRAME_MAX;
            if (localMapFrame > maxFrame) localMapFrame = maxFrame;
            if (localMapFrameSlider) localMapFrameSlider.max = String(maxFrame);
            if (localMapFrameTimeEl) localMapFrameTimeEl.textContent = localMapFrameLabel(localMapFrame);
            updateLocalMapMeta(data);
            updateLocalMapTimeline(data);
            // ▶ The ⏩ 3-hour forecast starts playing by itself the moment the first
            // forecast series is on screen (maybeStartLocalMapAutoplay fires once per
            // page load) — the ▶/⏸ button still pauses and resumes it at any time.
            maybeStartLocalMapAutoplay();
            refreshLocalMapIconGrid();
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

        // ===== 🛰️ "Local weather · seen from above" layout =====
        // Option C: the card, the form and the 🛰️ map all share ONE fluid width
        // (see the .container rule), so there is no bleed to measure any more —
        // the whole function is now the single place that keeps the MapLibre canvas
        // in step with the square's new size after a resize, a rotation or a tab
        // switch, because a stale canvas would clip the radar.
        // try/catch because this also runs during the very first layout, before the
        // map engine's localMapGL variable is initialised (and it is absent altogether
        // when the MapLibre CDN could not be reached).
        function fitLocalMapLayout() {
            if (localMapPanel) localMapPanel.style.marginLeft = '';
            if (localMapPanel) localMapPanel.style.marginRight = '';
            try {
                if (localMapGL && typeof localMapGL.resize === 'function') localMapGL.resize();
            } catch (err) { /* engine not laid out yet — MapLibre re-measures on its own */ }
        }
        fitLocalMapLayout();
        window.addEventListener('load', fitLocalMapLayout);
        window.addEventListener('resize', fitLocalMapLayout);
        window.addEventListener('orientationchange', fitLocalMapLayout);

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

        // Toggle the flag and update every affected surface synchronously. In
        // particular, the weather icons are HTML markers above MapLibre's canvas,
        // so they need their own display state while the map style is loading.
        // A redraw is still useful to refresh frame-specific data and hover state.
        function refreshLocalMapLayerVisibility() {
            syncLocalMapLayerBtns();
            localMapGLSyncAllVisibility();
            if (latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
        }

        const localMapLayersEl = document.getElementById('localmap-layers');
        const localMapLayerBtns = {};
        if (localMapLayersEl) {
            localMapLayersEl.querySelectorAll('button[data-layer]').forEach((btn) => {
                const layer = btn.dataset.layer;
                localMapLayerBtns[layer] = btn;
                btn.addEventListener('click', () => {
                    if (layer === 'topo') {
                        // 🎨 Colour is the written look: ON = colourful Bright,
                        // OFF = dark night-radar. Works every time — the map
                        // itself starts colourful (see localMapBasemap above).
                        localMapBasemap = localMapBasemap === 'topo' ? 'osm' : 'topo';
                        localMapLayers.topo = localMapBasemap === 'topo';
                    } else {
                        localMapLayers[layer] = !localMapLayers[layer];
                    }
                    try { localStorage.setItem('localmap-layers', JSON.stringify(localMapLayers)); } catch (err) { /* private mode */ }
                    refreshLocalMapLayerVisibility();
                });
            });
        }
        function syncLocalMapLayerBtns() {
            if (!localMapLayersEl) return;
            for (const [layer, btn] of Object.entries(localMapLayerBtns)) {
                const on = layer === 'topo' ? localMapBasemap === 'topo' : !!localMapLayers[layer];
                btn.classList.toggle('on', on);
                btn.classList.toggle('off', !on);
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
                if (layer === 'topo') {
                    btn.textContent = on ? '🎨 Colour' : '🌑 Dark';
                    btn.title = on
                        ? 'Basemap: colourful vector map — razor-sharp at any zoom, free. Tap for the dark night-radar style.'
                        : 'Basemap: dark vector night-radar — razor-sharp at any zoom, free. Tap for the colourful style.';
                } else {
                    btn.title = on
                        ? `Tap to hide the ${layer} layer`
                        : `Tap to show the ${layer} layer`;
                }
            }
        }
        syncLocalMapLayerBtns();

        function updateLocalMapZoomLabel() {
            const label = document.getElementById('localmap-zoom-label');
            if (!label) return;
            if (localMapGL && localMapGLReady && typeof localMapGL.getZoom === 'function' && Number.isFinite(localMapGLHome.zoom)) {
                label.textContent = Math.max(0.1, Math.pow(2, localMapGL.getZoom() - localMapGLHome.zoom)).toFixed(1) + '×';
            } else {
                label.textContent = localMapZoom.toFixed(1) + '×';
            }
        }
        function setLocalMapZoomControlsEnabled(enabled) {
            for (const button of [localMapZoomInBtn, localMapZoomOutBtn, localMapZoomResetBtn]) {
                if (button) button.disabled = !enabled;
            }
        }
        function localMapGLHomeIsSet() {
            return !!(localMapGLHome && localMapGLHome.bounds && Number.isFinite(localMapGLHome.zoom));
        }
        // These declarations sit near the shared state so every reset/zoom call
        // is safe even if the CDN finishes loading after the first click.
        function applyLocalMapZoom(factor) {
            if (!localMapGL || !localMapGLReady) return false;
            if (typeof localMapGL.getZoom !== 'function' || typeof localMapGL.easeTo !== 'function') return false;
            const z = localMapGL.getZoom() + Math.log2(factor || 1.3);
            localMapGL.easeTo({
                zoom: Math.max(localMapGL.getMinZoom(), Math.min(localMapGL.getMaxZoom(), z)),
                duration: 280
            });
            // Force the GL canvas to re-measure itself at the new zoom so the
            // weather grid, range rings and basemap all rescale crisply instead
            // of staying at the previous screen size.
            try { localMapGL.resize(); } catch (err) { /* best effort */ }
            return true;
        }
        function resetLocalMapZoom() {
            if (!localMapGL || !localMapGLReady || !localMapGLHomeIsSet() || typeof localMapGL.fitBounds !== 'function') {
                localMapZoom = 1;
                localMapPanX = 0;
                localMapPanY = 0;
                updateLocalMapZoomLabel();
                return false;
            }
            localMapGL.fitBounds(localMapGLHome.bounds, { padding: 30, duration: 500, maxZoom: 11.5 });
            return true;
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
            // NOTE: no `if (locatingDevice) return` here — GPS resolving must never
            // block the weather panel. Stale GPS overwrites are prevented by
            // weatherRequestId instead, so the first paint is instant on iOS
            // where a satellite fix can take 10–18 s (or never arrive).
            const requestId = ++weatherRequestId;
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
                if (requestId !== weatherRequestId) return;

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
                // Never steal what the user is typing: while the search box
                // has focus the resolved place name waits — otherwise the
                // field is rewritten mid-word and there is no time to type.
                const searchHasFocus = locationInput && document.activeElement === locationInput;
                if (resolvedName && locationInput && !searchHasFocus) {
                    const looksLikeCoords = /^\s*-?\d+(?:\.\d+)?\s*[,;]\s*-?\d/.test(resolvedName);
                    if (!looksLikeCoords) {
                        locationInput.value = resolvedName;
                        // Keep coordinates as the query: a town name can geocode to
                        // its centre (or another town) on the next refresh.
                        activeLocation = location || resolvedName;
                    }
                }

                const condition = data.condition || 'Unknown';
                const icon = getWeatherIcon(condition, data.weatherCode, data.isDay) || data.icon;
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
                            <div class="feels-line">🌡️ Feels like ${data.feelsLike ?? temperature}°C <small>· measured at 1.50 m</small></div>
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
                            <span class="stat-label label-dual">Feels like<br><small>Gevoelstemp · 1.5 m</small></span>
                            <span class="stat-value" id="stat-feels">${stats.feelsLike != null ? stats.feelsLike + '°C' : '—'}</span>
                        </div>
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
                showOnlyCurrentWeatherIcon(condition, data.weatherCode, data.isDay);
                attachForecastHandlers();
                renderForecast14(data);
                updateStatsDisplay(selectedDayIndex);
                updateGlobeMarker(data);
                renderSolar(data);
                if (focusGlobeOnFetch) {
                    focusGlobeOnFetch = false;
                    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                        flyToLocation(data.latitude, data.longitude, data.location || 'your location', 2.2);
                    }
                }
                // The 30-second auto-refresh replaces whole blocks of markup with
                // the ENGLISH template above, which would silently drop the page
                // back to English mid-session. Re-walk the DOM so Dutch survives
                // every refresh; in English mode this is a cheap no-op.
                applyLanguage(currentLanguage);
            } catch (e) {
                if (requestId !== weatherRequestId) return;
                // A failed load never wipes the panel: the last good weather
                // data stays on screen instead of a red error line.
                // When the user asked for the update, rethrow so
                // updateLocation() shows the reason under the search box; the
                // 30-second auto-refresh stays silent (the note is visible).
                if (reportLocationError) throw e;
            }
        }

        async function updateLocation(showLoading = true, keepMapPin = false) {
            // Every call here is an explicit user choice (Update button, Enter,
            // the search debounce, a map tap — and applyGpsPosition, whose GPS
            // guard already passed before it calls us). Bumping the intent
            // invalidates a GPS fix still in flight, so a late fix can never
            // overwrite what the user just chose.
            ++userIntentId;
            activeLocation = locationInput.value.trim();
            // A search / GPS change invalidates a map-tap pin — but a tap
            // itself must KEEP the pin it just set (keepMapPin), otherwise the
            // formatting round-trip (lon.toFixed vs input value) wipes it.
            if (!keepMapPin) localMapGLClearPinIfStale(activeLocation);
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
            runtimeText.locationNote = text;
            locationNoteEl.textContent = translateFragments(text);
            locationNoteEl.className = 'location-note error';
        }
        function clearLocationNote() {
            runtimeText.locationNote = '';
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
            // Remember the ENGLISH so a later language switch can re-paint it.
            runtimeText.globe = message;
            runtimeText.globeErr = !!isError;
            globeStatusEl.textContent = translateFragments(message);
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
        let elNinoGrid = null;                      // Pacific warm tongue (El Niño chip)
        let laNinaGrid = null;                      // Pacific cold tongue (La Niña chip)
        let gulfStreamGrid = null;                  // Atlantic warm current (Gulf Stream chip)
        // 🌊 ENSO dial: manual -3..+3 °C. Positive scales the warm El Niño grid,
        // negative scales the cold La Niña grid; 0 = neutral (both fade out).
        // Live ONI (via /api/weather?action=enso) seeds the dial on load.
        let ensoDial = 1.0;
        let ensoLive = null;                        // { oni, phaseLabel, season } or null
        function ensoWarmGain() { return Math.max(0, ensoDial) / 2; }   // +2.0 °C core = full tint
        function ensoColdGain() { return Math.max(0, -ensoDial) / 2; }
        function ensoPhaseLabel(v) {
            if (v >= 0.5) return 'El Niño';
            if (v <= -0.5) return 'La Niña';
            return 'Neutral';
        }
        function ensoFmt(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + ' °C'; }
        function paintEnsoDial() {
            const val = document.getElementById('enso-val');
            if (val) val.textContent = ensoFmt(ensoDial) + ' · ' + ensoPhaseLabel(ensoDial);
            const live = document.getElementById('enso-live');
            if (live && ensoLive) live.textContent = 'Live ONI: ' + ensoFmt(ensoLive.oni) + ' ' + ensoLive.phaseLabel + (ensoLive.season ? ' (' + ensoLive.season + ')' : '');
        }
        function setEnsoDial(v, repaint) {
            ensoDial = Math.max(-3, Math.min(3, Number(v) || 0));
            const slider = document.getElementById('enso-dial');
            if (slider && String(slider.value) !== String(ensoDial)) slider.value = String(ensoDial);
            paintEnsoDial();
            if (repaint !== false) drawGlobe();
        }
        async function fetchEnsoLive() {
            try {
                const res = await fetch('/api/weather?action=enso');
                if (!res.ok) return;
                const data = await res.json();
                if (data && data.available && Number.isFinite(data.oni)) {
                    ensoLive = { oni: data.oni, phaseLabel: data.phaseLabel || 'Live', season: data.season || '' };
                    setEnsoDial(data.oni, true);
                } else {
                    const live = document.getElementById('enso-live');
                    if (live) live.textContent = 'Live ONI: unavailable';
                    paintEnsoDial();
                }
            } catch (e) {
                const live = document.getElementById('enso-live');
                if (live) live.textContent = 'Live ONI: unavailable';
            }
        }
        function initEnsoDial() {
            const slider = document.getElementById('enso-dial');
            if (slider) slider.addEventListener('input', () => setEnsoDial(Number(slider.value), true));
            document.querySelectorAll('.enso-preset[data-enso]').forEach((b) => {
                b.addEventListener('click', () => setEnsoDial(Number(b.getAttribute('data-enso')), true));
            });
            const liveBtn = document.getElementById('enso-live-btn');
            if (liveBtn) liveBtn.addEventListener('click', () => { if (ensoLive) setEnsoDial(ensoLive.oni, true); else fetchEnsoLive(); });
            paintEnsoDial();
            fetchEnsoLive();
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initEnsoDial, { once: true });
        } else { initEnsoDial(); }

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
            [24.5, -82.5, 28.0],   // Gulf of Mexico / off Florida
            [26.0, -80.0, 27.5],   // Florida Strait
            [29.5, -79.5, 26.5],   // East Florida coast
            [33.0, -78.5, 25.0],   // Georgia / South Carolina
            [35.5, -75.0, 23.0],   // Cape Hatteras
            [38.0, -70.0, 20.5],   // offshore shelf edge
            [40.0, -62.0, 18.0],   // open Atlantic
            [43.0, -50.0, 15.5],   // mid North Atlantic
            [47.0, -38.0, 13.0],   // North Atlantic Drift
            [50.5, -27.0, 11.5],   // toward the Azores path
            [53.5, -17.0, 10.5],   // west of Ireland
            [57.0, -7.0, 10.0]      // reaches NW Europe
        ];

        // Reference list shares the globe temperatures; never assign observation years
        // or measured speeds to these undated illustrative nodes.
        function renderGulfStreamList() {
            const list = document.getElementById('gulfstream-list');
            if (!list) return;
            const places = ['Off Florida', 'Florida Strait', 'East Florida coast',
                'Georgia / South Carolina', 'Cape Hatteras', 'Offshore shelf edge',
                'Open Atlantic', 'Mid North Atlantic', 'North Atlantic Drift',
                'Toward the Azores', 'West of Ireland', 'Northwest Europe'];
            list.innerHTML = GULF_STREAM.map((node, index) =>
                `<li class="ocean-row"><b>${escapeHtml(places[index])}</b>` +
                `<div class="ocean-metrics"><span>Model SST: <b>${node[2].toFixed(1)} °C</b></span>` +
                '<span>Year: not available (undated model)</span></div>' +
                '<small>Flow intensity: no local measurement supplied.</small></li>'
            ).join('');
        }
        renderGulfStreamList();

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
        // -> gulfStreamTempC() returns the °C itself at the point nearest the path —
        //    used for the visible readouts painted on the globe.
        function gulfStreamTempC(latDeg, lngDeg) {
            let bestD = Infinity, bestT = GULF_STREAM[0][2];
            for (let i = 0; i < GULF_STREAM.length - 1; i += 1) {
                const [y1, x1] = GULF_STREAM[i];
                const [y2, x2] = GULF_STREAM[i + 1];
                const d = pointSegmentDistance(latDeg, lngDeg, x1, y1, x2, y2);
                if (d >= bestD) continue;
                bestD = d;
                const c = Math.cos(latDeg * Math.PI / 180);
                const den = ((x2 - x1) * c) ** 2 + (y2 - y1) ** 2;
                let t = den > 0 ? (((lngDeg - x1) * c * (x2 - x1) * c + (latDeg - y1) * (y2 - y1)) / den) : 0;
                t = Math.max(0, Math.min(1, t));
                bestT = GULF_STREAM[i][2] + (GULF_STREAM[i + 1][2] - GULF_STREAM[i][2]) * t;
            }
            return bestT;
        }
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

        // Pacific-only El Niño warmth: the Niño 3.4 warm tongue, the spread towards the
        // South American coast and the milder western pool. The Gulf Stream is a
        // separate layer with its own chip, so it is NOT included here — see below.
        function elNinoPacificAnomaly(latDeg, lngDeg) {
            const lonW = wrapLon(lngDeg);
            const lon0 = ((lngDeg % 360) + 360) % 360;   // 0°..360° so the Pacific is one span
            // Heart of the El Niño warm tongue (Niño 3.4 region, ~140°W)
            // Textbook strong-event peak: ~+2.0 °C anomaly at the core.
            let a = 2.0 * sstGauss(latDeg, 0, 7) * sstGaussLon(lonW, -140, 50);
            // Warm water spreading to the South American coast (~90°W)
            a += 1.0 * sstGauss(latDeg, -1, 9) * sstGaussLon(lonW, -92, 34);
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

            return pacific;
        }

        // Pacific-only La Niña chill: the classic cold tongue — cool water from the
        // date line east to the South American coast, tight against the equator —
        // plus the coastal upwelling strip and a much weaker broad cool band. Same
        // Pacific window as the warm layer, but its own organic seed, so the two
        // ENSO phases never share a texture. Stored as a positive strength (like
        // the warm layer) so the cold ramp can read it directly.
        function laNinaPacificAnomaly(latDeg, lngDeg) {
            const lonW = wrapLon(lngDeg);
            const lon0 = ((lngDeg % 360) + 360) % 360;   // 0°..360° so the Pacific is one span
            // Cold tongue heart, EAST of the El Niño warm core (Niño 3.4 → Niño 1+2, ~105°W)
            // Textbook strong-event peak: ~-2.0 °C anomaly at the core.
            let a = 2.0 * sstGauss(latDeg, 0, 5) * sstGaussLon(lonW, -105, 45);
            // Upwelling chill hugging the South American coast (~87°W)
            a += 1.2 * sstGauss(latDeg, -3, 6) * sstGaussLon(lonW, -87, 22);
            // Broad band of below-normal temperature along the equator — weaker than
            // the warm layer's band, so the west/central basin stays El Niño's.
            a += 0.5 * sstGauss(latDeg, 0, 11) * sstGaussLon(lonW, -110, 80);
            // Seamless organic variation — periodic in longitude, own seed offset
            // (+11 / +7) so warm and cold phases never mirror each other pixel-for-pixel.
            const lr = lngDeg * Math.PI / 180;
            const organic = 0.9 + 0.22 * fbmNoise(Math.cos(lr) * 1.6 + latDeg / 40 + 11, Math.sin(lr) * 1.6 + 7, 2);
            // Confine to the same Pacific basin as El Niño with the same smooth fades.
            const smoothEdge = (x) => { const t = clampGlobe(x, 0, 1); return t * t * (3 - 2 * t); };
            const west = smoothEdge((lon0 - 128) / 62);
            const east = smoothEdge((292 - lon0) / 62);
            const pacific = Math.max(0, a * organic * Math.min(west, east));

            return pacific;
        }

        // All three layers are baked in one pass; each keeps its own lookup table so the
        // El Niño, La Niña and Gulf Stream chips can be switched on and off independently.
        function buildElNinoGrid() {
            elNinoGrid = new Float32Array(SST_GRID_W * SST_GRID_H);
            laNinaGrid = new Float32Array(SST_GRID_W * SST_GRID_H);
            gulfStreamGrid = new Float32Array(SST_GRID_W * SST_GRID_H);
            for (let v = 0; v < SST_GRID_H; v += 1) {
                const latDeg = 90 - v;                       // top row = +90°
                for (let u = 0; u < SST_GRID_W; u += 1) {
                    const lngDeg = -180 + u;
                    const cell = v * SST_GRID_W + u;
                    elNinoGrid[cell] = elNinoPacificAnomaly(latDeg, lngDeg);
                    laNinaGrid[cell] = laNinaPacificAnomaly(latDeg, lngDeg);
                    gulfStreamGrid[cell] = gulfStreamAnomaly(latDeg, lngDeg);
                }
            }
        }

        function sstGridValue(grid, latDeg, lngDeg) {
            if (!grid) return 0;
            const gu = clampGlobe((((lngDeg + 180) / 360) * SST_GRID_W) | 0, 0, SST_GRID_W - 1);
            const gv = clampGlobe(((90 - latDeg) / 180 * SST_GRID_H) | 0, 0, SST_GRID_H - 1);
            return grid[gv * SST_GRID_W + gu];
        }

        function elNinoAnomalyAt(latDeg, lngDeg) {
            return sstGridValue(elNinoGrid, latDeg, lngDeg) * ensoWarmGain();
        }

        function laNinaAnomalyAt(latDeg, lngDeg) {
            return sstGridValue(laNinaGrid, latDeg, lngDeg) * ensoColdGain();
        }

        function gulfStreamAnomalyAt(latDeg, lngDeg) {
            return sstGridValue(gulfStreamGrid, latDeg, lngDeg);
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
        // Cold = blue, less cold = pale blue (deep blue at the coldest core). The
        // mirror of the warm ramp with the same slow taper, so the cold tongue stays
        // GRADED instead of collapsing into one flat blue blob with a hard edge —
        // and the two phases read as one family of overlays.
        function laNinaColor(anomaly) {
            const t = clampGlobe((anomaly - 0.1) / 3.6, 0, 1);
            const STOPS = [
                { t: 0.0, r: 135, g: 195, b: 245, a: 0.08 },  // faint chill over water
                { t: 0.30, r: 96, g: 172, b: 240, a: 0.34 },   // soft blue
                { t: 0.55, r: 55, g: 138, b: 235, a: 0.55 },   // blue
                { t: 0.78, r: 28, g: 100, b: 225, a: 0.72 },   // strong blue
                { t: 1.0, r: 8, g: 62, b: 205, a: 0.85 }       // deep cold core
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
            const w = FALLBACK_TEX_W, h = FALLBACK_TEX_H;
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

        // Copy a canvas into the sampling buffer the pixel loop reads.
        function useEarthTexture(cv) {
            earthTexCanvas = cv;
            earthTexW = cv.width;
            earthTexH = cv.height;
            earthTexData = cv.getContext('2d', { willReadFrequently: true })
                .getImageData(0, 0, cv.width, cv.height).data;
        }

        function paintEarthTexture(img, w, h) {
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, w, h);
            useEarthTexture(cv);
        }

        // Two passes, so 33 MB of ImageData never delays the first paint: the half-size
        // buffer textures the globe straight away, the native 4096×2048 one follows on
        // the next idle slot. That native buffer is what keeps the planet crisp to ~4×
        // (the deep-zoom GIBS patch takes over beyond that).
        function setEarthTexture(img) {
            paintEarthTexture(img, EARTH_TEX_W >> 1, EARTH_TEX_H >> 1);
            let upgraded = false;
            const upgrade = () => {
                if (upgraded) return;
                upgraded = true;
                paintEarthTexture(img, EARTH_TEX_W, EARTH_TEX_H);
                globePatch = null;            // rebuilt against the sharper base
                globePatchKey = '';
            };
            if (typeof requestIdleCallback === 'function') requestIdleCallback(upgrade, { timeout: 2000 });
            else setTimeout(upgrade, 80);
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
                    useEarthTexture(makeFallbackEarthTexture());
                }
            };
            img.src = sources[0];
        }

        // ===== 🗺️ Country borders — Natural Earth outlines over the imagery =====
        // Every country is outlined on the planet: coastlines in a cool light blue, the
        // land borders two neighbours share in warm gold, so a country reads as a
        // country instead of as a patch of green in the satellite photo. The 🗺️ Borders
        // chip in the legend under the globe switches the whole layer on and off.
        //
        // Two resolutions, the same idea the imagery itself uses (base texture plus a
        // sharper deep-zoom patch). Both files come from world-atlas, which wraps
        // Natural Earth's public-domain 1:110m / 1:50m country outlines as quantized
        // TopoJSON, and both are served from this site itself — offline capable, no
        // third-party CDN:
        //   • 1:110m — 108 KB (38 KB gzip): 595 arcs / 8 246 vertices. Fetched with the
        //     globe and drawn at every zoom — a fraction of a millisecond per frame.
        //   • 1:50m  — 756 KB (233 KB gzip): 1 959 arcs / 80 617 vertices. Fetched the
        //     first time the user zooms past GLOBE_BORDERS_DETAIL_ZOOM and takes over
        //     above it, where the coarse set starts showing its straight-line segments.
        //     Per-arc view culling keeps it cheap: at 3× only a small cap of the sphere
        //     is on screen, so only the arcs touching that cap reach the projection.
        const GLOBE_BORDERS_BASE_URL = 'data/countries-110m.json';
        const GLOBE_BORDERS_DETAIL_URL = 'data/countries-50m.json';
        // First zoom level where the detailed outlines are worth their download.
        const GLOBE_BORDERS_DETAIL_ZOOM = 3;
        // Same horizon cut-off as globePoint(): below it a point sits behind the globe.
        const GLOBE_BORDER_HIDE_Z = 0.02;
        // Strokes are bucketed into three depth bands — the nearer a segment is, the
        // more of its alpha survives — so the outlines sink into the planet's dark limb
        // instead of ringing the whole disc at one flat brightness.
        const GLOBE_BORDER_BANDS = [GLOBE_BORDER_HIDE_Z, 0.3, 0.62, 1.01];
        const GLOBE_BORDER_BAND_ALPHA = [0.35, 0.7, 1];
        let globeBorders = null;           // coarse { coast, land } set — always drawn
        let globeBordersLoading = false;   // coarse fetch in flight
        let globeBordersRetryAt = 0;       // coarse back-off (ms) after a failed fetch
        let globeBordersDetail = null;     // detailed { coast, land } set — from the first deep zoom
        let globeBordersDetailWanted = false;
        let globeBordersDetailRetryAt = 0; // detailed back-off (ms) after a failed fetch

        // Decode one TopoJSON bundle into two stroke-ready sets:
        //   • `coast` — arcs claimed by exactly one country ring (its shoreline);
        //   • `land`  — arcs claimed by two or more rings (a real, shared border).
        // A set holds xyz (every vertex already on the unit sphere, 3 floats — a frame
        // never has to run trig again), starts (where every arc begins) and meta (4
        // floats per arc: the unit vector of its centre plus how far the arc strays
        // from that centre — the bound the painter needs to drop a whole arc before
        // any of its vertices is projected). Each set also owns its projection scratch.
        function buildGlobeBorders(topo) {
            if (!topo || !topo.arcs || !topo.transform || !topo.objects || !topo.objects.countries) return null;
            const scale = topo.transform.scale;
            const translate = topo.transform.translate;
            // 1) absolute lon/lat of every arc: the TopoJSON deltas accumulate away from
            //    the quantized origin the transform carries.
            const decoded = topo.arcs.map((arc) => {
                let x = 0;
                let y = 0;
                const pts = new Float64Array(arc.length * 2);
                for (let i = 0; i < arc.length; i += 1) {
                    x += arc[i][0];
                    y += arc[i][1];
                    pts[i * 2] = x * scale[0] + translate[0];
                    pts[i * 2 + 1] = y * scale[1] + translate[1];
                }
                return pts;
            });
            // 2) how many country rings claim each arc: 1 = coastline, 2+ = shared border
            const usage = new Int32Array(decoded.length);
            const geoms = topo.objects.countries.geometries || [];
            for (const g of geoms) {
                const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
                for (const poly of polys) {
                    for (const ring of poly) {
                        // A negative index points at the same arc, read backwards.
                        for (const a of ring) usage[a < 0 ? ~a : a] += 1;
                    }
                }
            }
            const build = (shared) => {
                const kept = [];
                for (let i = 0; i < usage.length; i += 1) {
                    if (usage[i] > 0 && shared(usage[i])) kept.push(i);
                }
                let vertices = 0;
                for (const i of kept) vertices += decoded[i].length / 2;
                const xyz = new Float32Array(vertices * 3);
                const scr = new Float32Array(vertices * 3);
                const starts = new Int32Array(kept.length + 1);
                const meta = new Float32Array(kept.length * 4);
                let w = 0;
                for (let k = 0; k < kept.length; k += 1) {
                    const pts = decoded[kept[k]];
                    const n = pts.length / 2;
                    starts[k] = w;
                    let mx = 0;
                    let my = 0;
                    let mz = 0;
                    for (let i = 0; i < n; i += 1) {
                        const la = pts[i * 2 + 1] * Math.PI / 180;
                        const lo = pts[i * 2] * Math.PI / 180;
                        const gx = Math.cos(la) * Math.sin(lo);
                        const gy = Math.sin(la);
                        const gz = Math.cos(la) * Math.cos(lo);
                        xyz[w * 3] = gx;
                        xyz[w * 3 + 1] = gy;
                        xyz[w * 3 + 2] = gz;
                        mx += gx;
                        my += gy;
                        mz += gz;
                        w += 1;
                    }
                    const len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
                    mx /= len;
                    my /= len;
                    mz /= len;
                    let chord = 0;
                    for (let i = 0; i < n; i += 1) {
                        const dx = xyz[(starts[k] + i) * 3] - mx;
                        const dy = xyz[(starts[k] + i) * 3 + 1] - my;
                        const dz = xyz[(starts[k] + i) * 3 + 2] - mz;
                        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (d > chord) chord = d;
                    }
                    meta[k * 4] = mx;
                    meta[k * 4 + 1] = my;
                    meta[k * 4 + 2] = mz;
                    meta[k * 4 + 3] = chord;
                }
                starts[kept.length] = w;
                return { xyz, scr, starts, meta, count: kept.length, vertices };
            };
            return { coast: build((n) => n === 1), land: build((n) => n > 1) };
        }

        // Can any vertex of this arc be on the near side of the horizon? The deepest an
        // arc's vertex can get is dot(centre, viewDir) + chord, so a bound below the
        // cut-off means the whole arc is certainly behind the globe and can be dropped
        // before a single vertex of it is projected. (Conservative: it never hides an
        // arc that really is on screen.)
        function globeBorderArcVisible(meta, arc, fx, fy, fz) {
            const m = arc * 4;
            return meta[m] * fx + meta[m + 1] * fy + meta[m + 2] * fz + meta[m + 3] >= GLOBE_BORDER_HIDE_Z;
        }

        // Stroke one set (coastlines first, then the borders on top of them). Every
        // vertex of every arc that might be on screen is projected once into the set's
        // scratch buffer; the segments are then stroked band by band, each landing in
        // the band of its shallowest endpoint. Two passes keep the cost linear in
        // *visible* segments: one projection pass, one path pass per band.
        function drawGlobeBorderSet(ctx, set, color, alpha, width, cx, cy, R, cosC, sinC, cosT, sinT) {
            const xyz = set.xyz, scr = set.scr, starts = set.starts, meta = set.meta;
            const arcCount = starts.length - 1;
            if (arcCount <= 0) return;
            // View direction in world space: a point's depth (zv) is its dot product
            // with this vector — globePoint's spin + tilt, split into their parts.
            const fx = -sinC * cosT;
            const fy = sinT;
            const fz = cosC * cosT;
            // 1) project the vertices of every arc that is not certainly behind the globe
            for (let a = 0; a < arcCount; a += 1) {
                if (!globeBorderArcVisible(meta, a, fx, fy, fz)) continue;
                const from = starts[a], to = starts[a + 1];
                for (let i = from; i < to; i += 1) {
                    const gx = xyz[i * 3], gy = xyz[i * 3 + 1], gz = xyz[i * 3 + 2];
                    const xf = gx * cosC + gz * sinC;
                    const zs = -gx * sinC + gz * cosC;
                    scr[i * 3] = cx + xf * R;
                    scr[i * 3 + 1] = cy - (gy * cosT - zs * sinT) * R;
                    scr[i * 3 + 2] = gy * sinT + zs * cosT;
                }
            }
            // 2) one stroke per depth band
            ctx.lineWidth = width;
            for (let band = 0; band < GLOBE_BORDER_BANDS.length - 1; band += 1) {
                const lo = GLOBE_BORDER_BANDS[band], hi = GLOBE_BORDER_BANDS[band + 1];
                let segments = 0;
                ctx.beginPath();
                for (let a = 0; a < arcCount; a += 1) {
                    if (!globeBorderArcVisible(meta, a, fx, fy, fz)) continue;
                    const from = starts[a], to = starts[a + 1];
                    let pen = -1; // vertex this band's pen rests on within this arc
                    for (let i = from; i + 1 < to; i += 1) {
                        const z0 = scr[i * 3 + 2];
                        const z1 = scr[(i + 1) * 3 + 2];
                        if (z0 < GLOBE_BORDER_HIDE_Z || z1 < GLOBE_BORDER_HIDE_Z) continue;
                        const depth = z0 < z1 ? z0 : z1;
                        if (depth < lo || depth >= hi) continue;
                        // Keep the pen down only when the previous segment of this arc
                        // ended exactly where this one starts — otherwise lift it, so a
                        // segment hidden by the horizon never bridges the gap.
                        if (pen !== i) ctx.moveTo(scr[i * 3], scr[i * 3 + 1]);
                        ctx.lineTo(scr[(i + 1) * 3], scr[(i + 1) * 3 + 1]);
                        pen = i + 1;
                        segments += 1;
                    }
                }
                if (segments > 0) {
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = alpha * GLOBE_BORDER_BAND_ALPHA[band];
                    ctx.stroke();
                }
            }
        }

        // 🗺️ The outlines layer, painted between the graticule and the weather markers
        // so every pin, storm and quake sits on top of the political map. Switching the
        // Borders chip off skips the lot; the detailed set takes over from
        // GLOBE_BORDERS_DETAIL_ZOOM once it has downloaded, and the coarse set draws
        // again below it — where it is cheaper and every bit as sharp.
        function drawGlobeBorders(ctx, cx, cy, R, size, cosC, sinC, cosT, sinT) {
            if (globeLayerOn.borders === false || !globeBorders) return;
            const set = (globeBordersDetail && globeZoom >= GLOBE_BORDERS_DETAIL_ZOOM)
                ? globeBordersDetail
                : globeBorders;
            ctx.save();
            drawGlobeBorderSet(ctx, set.coast, 'rgba(176, 224, 255, 1)', 0.4,
                Math.max(1, size * 0.0018), cx, cy, R, cosC, sinC, cosT, sinT);
            drawGlobeBorderSet(ctx, set.land, 'rgba(255, 224, 150, 1)', 0.62,
                Math.max(1.2, size * 0.003), cx, cy, R, cosC, sinC, cosT, sinT);
            ctx.restore();
        }

        // Fetch one TopoJSON bundle and hand the decoded sets to `done` (null when the
        // file is unreachable). The decode is pushed into an idle slot: parsing 756 KB
        // and mapping 80k vertices onto the sphere must never land inside a frame.
        function fetchGlobeBorders(url, done) {
            fetch(url, { cache: 'force-cache' })
                .then((res) => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
                .then((topo) => {
                    const publish = () => done(buildGlobeBorders(topo));
                    if (typeof requestIdleCallback === 'function') requestIdleCallback(publish, { timeout: 4000 });
                    else setTimeout(publish, 0);
                })
                .catch(() => done(null));
        }

        // Kick off the coarse outlines — called once beside loadEarthTexture(). A layer
        // that is switched off never downloads anything; switching it back on (which
        // repaints the globe) starts the fetch then.
        function loadGlobeBorders() {
            if (!globeCanvas || globeBorders || globeBordersLoading) return;
            if (globeLayerOn.borders === false) return;
            globeBordersLoading = true;
            fetchGlobeBorders(GLOBE_BORDERS_BASE_URL, (set) => {
                globeBordersLoading = false;
                if (set) globeBorders = set;
                else globeBordersRetryAt = Date.now() + 30000; // offline — try again later
            });
        }

        // Called once per frame from drawGlobe, right next to updateGlobePatch — a
        // couple of comparisons in the common case. It retries the coarse set after a
        // failed start-up fetch and pulls the detailed outlines the first time the view
        // gets deep enough to want them; a failed detail fetch backs off for a minute
        // instead of hammering a server that is down.
        function updateGlobeBorders(zoom) {
            if (globeLayerOn.borders === false) return;
            if (!globeBorders) {
                if (!globeBordersLoading && Date.now() >= globeBordersRetryAt) loadGlobeBorders();
                return;
            }
            if (globeBordersDetail || globeBordersDetailWanted) return;
            if (zoom < GLOBE_BORDERS_DETAIL_ZOOM || Date.now() < globeBordersDetailRetryAt) return;
            globeBordersDetailWanted = true;
            fetchGlobeBorders(GLOBE_BORDERS_DETAIL_URL, (set) => {
                globeBordersDetailWanted = false;
                if (set) globeBordersDetail = set;
                else globeBordersDetailRetryAt = Date.now() + 60000;
            });
        }

        // ===== 🛰️ Deep-zoom patch: NASA GIBS equirect satellite tiles =====
        // The planet is sampled from an equirectangular image, so a deep zoom can only be
        // as sharp as that image has texels per degree: the native Blue Marble buffer
        // holds 4096×2048 = 11.4 (crisp to about 2×). Past that, the visible cap is redrawn from
        // NASA GIBS (Global Imagery Browse Services) EPSG:4326 "500m" tiles — Blue
        // Marble with shaded relief + bathymetry, the same imagery in the same
        // projection, served with CORS — and composited over the base texture:
        //     level 4 =  18° tiles =  28.4 texels/degree   → crisp to ~ 5×
        //     level 5 =   9° tiles =  56.9 texels/degree   → crisp to ~10×
        //     level 6 = 4.5° tiles = 113.8 texels/degree   → crisp to ~20×
        //     level 7 = 2.25° tiles = 227.6 texels/degree  → crisp to ~40×
        // The level is picked so that a texel lands on every pixel the eye gets: a 10× view
        // wants ~57 texels/degree on a 760 px stage, so level 5 is 1:1 there and level 4
        // covers 6×. At 50× the view wants ~285 texels/degree — past even level 7 —
        // so the patch keeps sampling its finest tiles: still upscaled, but always
        // sharper than the 11.4 texel/degree base texture.
        //
        // ⚠️ The GIBS EPSG:4326 tile matrix is NOT a plain 2^n grid — these numbers come
        // from the layer's WMTS capabilities and were verified tile by tile against the
        // live service (a 2^n assumption is what used to fetch the wrong part of the
        // world):
        //     level: 0    1    2    3     4     5     6      7      8
        //     cols:  2    3    5   10    20    40    80    160    320
        //     rows:  1    2    3    5    10    20    40     80    160
        // 512×512 px per tile, TopLeftCorner (−180, 90), so
        //     col = ⌊(lng + 180) / spanX⌋,  row = ⌊(90 − lat) / spanY⌋,
        // with spanX = 360 / cols and spanY = 180 / rows (square from level 3 up).
        // Level 7 is the deepest the BlueMarble_ShadedRelief_Bathymetry 500m layer
        // serves (level 8 answers HTTP 400) — verified live 2026-09-28.
        const GLOBE_PATCH_SETS = [[2, 1], [3, 2], [5, 3], [10, 5], [20, 10], [40, 20], [80, 40], [160, 80], [320, 160]];
        const GLOBE_PATCH_TILE = 512;      // px per GIBS tile
        const GLOBE_PATCH_MIN_LEVEL = 3;   // 36°: the coarsest level still worth fetching
        const GLOBE_PATCH_MAX_LEVEL = 7;   // 2.25°: 227.6 texels/degree — crisp to ~40×
        const GLOBE_PATCH_MAX_TILES = 26;  // bounds a patch (≈26 MB decoded) and the fetch time
        const GLOBE_PATCH_MARGIN = 1.3;    // fetch beyond the view so a pan reuses the patch
        const GLOBE_PATCH_EDGE = 1.5;      // minimum over-scan in degrees, same reason
        const GLOBE_PATCH_FEATHER = 26;    // px of cross-fade into the base texture
        const GLOBE_PATCH_RETRY_MS = 400;  // throttle between two fetch attempts
        const GLOBE_PATCH_FAIL_MS = 60000; // back-off after a failed fetch (offline / blocked)
        const GLOBE_PATCH_TILES_KEPT = 40; // decoded tiles kept for panning (~40 MB max)
        const GIBS_TILE_URL = (level, row, col) => 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/' +
            'BlueMarble_ShadedRelief_Bathymetry/default/500m/' + level + '/' + row + '/' + col + '.jpeg';

        let globePatch = null;             // { data, w, h, level, lng0, lat1, scaleX, scaleY }
        let globePatchKey = '';            // spec of the patch loaded / currently loading
        let globePatchLoading = false;
        let globePatchLastTry = 0;
        let globePatchBackoffUntil = 0;
        const globeTileCache = new Map();

        // Decoded GIBS tiles, newest last, bounded (a 512×512 tile is ~1 MB decoded).
        function gibsTile(level, row, col) {
            const key = level + '/' + row + '/' + col;
            const cached = globeTileCache.get(key);
            if (cached) return cached;
            const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => { globeTileCache.delete(key); reject(new Error('GIBS tile ' + key)); };
                img.src = GIBS_TILE_URL(level, row, col);
            });
            globeTileCache.set(key, promise);
            while (globeTileCache.size > GLOBE_PATCH_TILES_KEPT) {
                globeTileCache.delete(globeTileCache.keys().next().value);
            }
            return promise;
        }

        // Screen pixels per degree at the centre of the disc: the magnification the view
        // really needs (R·π/180), which is what picks the patch level. `dispW` is the
        // canvas width in the pixels the eye ends up seeing — the backing store, or the
        // larger CSS box it is upscaled to on a retina / big stage (see GLOBE_MAX_RENDER_PX).
        function globePxPerDeg(dispW, zoom) {
            return dispW * 0.40 * Math.max(0.8, zoom) * Math.PI / 180;
        }

        // Inverse of globePoint for one screen offset — the same maths as the pixel loop,
        // used to work out which part of the world is on screen.
        function screenToLatLng(nx, ny, cosC, sinC, cosT, sinT, out) {
            const z2 = 1 - nx * nx - ny * ny;
            const nz = z2 > 0 ? Math.sqrt(z2) : 0;
            const gy = ny * cosT + nz * sinT;
            const zs = -ny * sinT + nz * cosT;
            const gx = nx * cosC - zs * sinC;
            const gz = nx * sinC + zs * cosC;
            out.lat = globeAsinDeg(gy);
            out.lng = globeAtan2Deg(gx, gz);
            return out;
        }

        // Which GIBS tiles cover the visible cap, and at which level. Returns null when the
        // base texture is already sharp enough (or when the box would need too many tiles,
        // e.g. looking straight down on a pole, where longitude spans the whole globe).
        function planGlobePatch(size, zoom, cx, cy, R, cosC, sinC, cosT, sinT, dispW) {
            if (!earthTexData || !earthTexCanvas) return null;
            const need = globePxPerDeg(dispW, zoom);
            if (need < (earthTexW / 360) * 1.02) return null;  // the base texture is sharp enough here

            // Bounding box of everything the canvas can see. The samples walk a circle that
            // ENCLOSES the canvas — half the diagonal, not half the width — otherwise the
            // four corners of a tilted view fall outside the patch and stay on the blurrier
            // base texture. Beyond the rim (radius 1) there is no planet to sample.
            const rad = Math.min(size * Math.SQRT1_2 / R, 1);
            let lat0 = 90, lat1 = -90, lng0 = 180, lng1 = -180;
            const acc = { lat: 0, lng: 0 };
            const steps = 24;
            for (let k = 0; k <= steps; k += 1) {
                const a = k / steps * Math.PI * 2;
                screenToLatLng(Math.cos(a) * rad, Math.sin(a) * rad, cosC, sinC, cosT, sinT, acc);
                if (acc.lat < lat0) lat0 = acc.lat;
                if (acc.lat > lat1) lat1 = acc.lat;
                if (acc.lng < lng0) lng0 = acc.lng;
                if (acc.lng > lng1) lng1 = acc.lng;
            }
            screenToLatLng(0, 0, cosC, sinC, cosT, sinT, acc);
            if (acc.lat < lat0) lat0 = acc.lat;
            if (acc.lat > lat1) lat1 = acc.lat;
            if (acc.lng < lng0) lng0 = acc.lng;
            if (acc.lng > lng1) lng1 = acc.lng;

            // Over-scan a little, so a small pan or spin reuses the patch we already have.
            const midLat = (lat0 + lat1) / 2, midLng = (lng0 + lng1) / 2;
            const halfLat = Math.max((lat1 - lat0) * GLOBE_PATCH_MARGIN / 2, GLOBE_PATCH_EDGE);
            const halfLng = Math.max((lng1 - lng0) * GLOBE_PATCH_MARGIN / 2, GLOBE_PATCH_EDGE);
            lat0 = clampGlobe(midLat - halfLat, -90, 90);
            lat1 = clampGlobe(midLat + halfLat, -90, 90);
            lng0 = midLng - halfLng;
            lng1 = midLng + halfLng;

            // The coarsest level that still puts a texel on every displayed pixel, falling
            // back on the sharpest GIBS level when even that is coarser than the view needs
            // (a retina stage at 10×); the tile budget below still applies.
            let wanted = GLOBE_PATCH_MAX_LEVEL;
            for (let level = GLOBE_PATCH_MIN_LEVEL; level <= GLOBE_PATCH_MAX_LEVEL; level += 1) {
                if (GLOBE_PATCH_TILE / (360 / GLOBE_PATCH_SETS[level][0]) >= need) { wanted = level; break; }
            }
            // …then walk coarser until the tile count fits: a coarser level always needs
            // fewer tiles, so this either finds a level we can afford or gives up.
            for (let level = wanted; level >= GLOBE_PATCH_MIN_LEVEL; level -= 1) {
                const cols = GLOBE_PATCH_SETS[level][0], rows = GLOBE_PATCH_SETS[level][1];
                const spanX = 360 / cols, spanY = 180 / rows;
                const col0 = clampGlobe(Math.floor((lng0 + 180) / spanX), 0, cols - 1);
                const col1 = clampGlobe(Math.floor((lng1 + 180) / spanX), 0, cols - 1);
                const row0 = clampGlobe(Math.floor((90 - lat1) / spanY), 0, rows - 1);
                const row1 = clampGlobe(Math.floor((90 - lat0) / spanY), 0, rows - 1);
                if ((col1 - col0 + 1) * (row1 - row0 + 1) > GLOBE_PATCH_MAX_TILES) continue;
                return { level, row0, row1, col0, col1 };
            }
            return null;
        }

        // Fetch a plan's tiles, feather them into the base texture and publish the finished
        // patch. Everything happens in the background: whatever is on screen now (the
        // previous patch, or the base texture) keeps painting until this one is ready.
        function buildGlobePatch(plan) {
            const set = GLOBE_PATCH_SETS[plan.level];
            const spanX = 360 / set[0], spanY = 180 / set[1];
            const cols = plan.col1 - plan.col0 + 1, rows = plan.row1 - plan.row0 + 1;
            const w = cols * GLOBE_PATCH_TILE, h = rows * GLOBE_PATCH_TILE;
            const jobs = [];
            for (let r = plan.row0; r <= plan.row1; r += 1) {
                for (let c = plan.col0; c <= plan.col1; c += 1) jobs.push([r, c]);
            }
            globePatchLoading = true;
            Promise.all(jobs.map((rc) => gibsTile(plan.level, rc[0], rc[1]).then((img) => [rc[0], rc[1], img])))
                .then((tiles) => {
                    // 1) the GIBS mosaic for this box
                    const mosaic = document.createElement('canvas');
                    mosaic.width = w; mosaic.height = h;
                    const mctx = mosaic.getContext('2d');
                    for (let t = 0; t < tiles.length; t += 1) {
                        mctx.drawImage(tiles[t][2],
                            (tiles[t][1] - plan.col0) * GLOBE_PATCH_TILE,
                            (tiles[t][0] - plan.row0) * GLOBE_PATCH_TILE);
                    }
                    // 2) the same box of the base texture goes underneath, and the tiles sit
                    //    on top through a mask that fades out over the outer FEATHER pixels —
                    //    so the sharper imagery dissolves into the base image instead of
                    //    ending in a visible seam.
                    const cv = document.createElement('canvas');
                    cv.width = w; cv.height = h;
                    const ctx = cv.getContext('2d', { willReadFrequently: true });
                    const base = earthTexCanvas;
                    ctx.drawImage(base,
                        (plan.col0 * spanX) / 360 * base.width, (plan.row0 * spanY) / 180 * base.height,
                        (cols * spanX) / 360 * base.width, (rows * spanY) / 180 * base.height,
                        0, 0, w, h);
                    const edge = Math.max(2, Math.min(GLOBE_PATCH_FEATHER, Math.floor(w / 3), Math.floor(h / 3)));
                    const mask = document.createElement('canvas');
                    mask.width = w; mask.height = h;
                    const kctx = mask.getContext('2d');
                    kctx.fillStyle = '#fff';
                    kctx.fillRect(0, 0, w, h);
                    kctx.globalCompositeOperation = 'destination-in';
                    const ramps = [
                        kctx.createLinearGradient(0, 0, edge, 0),
                        kctx.createLinearGradient(w, 0, w - edge, 0),
                        kctx.createLinearGradient(0, 0, 0, edge),
                        kctx.createLinearGradient(0, h, 0, h - edge)
                    ];
                    for (let k = 0; k < ramps.length; k += 1) {
                        ramps[k].addColorStop(0, 'rgba(255,255,255,0)');
                        ramps[k].addColorStop(1, 'rgba(255,255,255,1)');
                        kctx.fillStyle = ramps[k];
                        kctx.fillRect(0, 0, w, h);
                    }
                    mctx.globalCompositeOperation = 'destination-in';
                    mctx.drawImage(mask, 0, 0);
                    ctx.drawImage(mosaic, 0, 0);
                    // 3) publish — the render loop picks it up on the very next frame
                    globePatch = {
                        data: ctx.getImageData(0, 0, w, h).data,
                        w, h,
                        level: plan.level,
                        lng0: plan.col0 * spanX - 180,
                        lat1: 90 - plan.row0 * spanY,
                        scaleX: w / (cols * spanX),
                        scaleY: h / (rows * spanY)
                    };
                    globePatchLoading = false;
                })
                .catch(() => {
                    // Offline, blocked or a 404: the base texture keeps painting and we stop
                    // asking for a while instead of hammering the service.
                    globePatchLoading = false;
                    globePatchKey = '';
                    globePatchBackoffUntil = performance.now() + GLOBE_PATCH_FAIL_MS;
                });
        }

        // Called once per frame from drawGlobe (29 projections — negligible). Fetches a patch
        // only when the camera has settled and the patch we have no longer covers the view.
        function updateGlobePatch(size, zoom, cx, cy, R, cosC, sinC, cosT, sinT, dispW) {
            if (!earthTexData || !earthTexCanvas) return;
            const now = performance.now();
            if (now < globePatchBackoffUntil) return;
            if (globePxPerDeg(dispW, zoom) < (earthTexW / 360) * 1.02) {
                // Zoomed back out far enough that the base texture is sharp again: drop the
                // patch so the whole planet keeps a single, consistent look.
                if (globePatch && !globePatchLoading) {
                    globePatch = null;
                    globePatchKey = '';
                }
                return;
            }
            const plan = planGlobePatch(size, zoom, cx, cy, R, cosC, sinC, cosT, sinT, dispW);
            if (!plan) return;
            const key = plan.level + ':' + plan.row0 + ':' + plan.col0 + ':' + plan.row1 + ':' + plan.col1;
            if (key === globePatchKey) return;
            // Let the gesture settle first — a wheel spin or a fly-to would otherwise fire
            // off a fetch for every intermediate zoom level.
            if (globeDragging || Math.abs(globeZoom - globeZoomTarget) > 0.02) return;
            if (now - globePatchLastTry < GLOBE_PATCH_RETRY_MS) return;
            globePatchLastTry = now;
            globePatchKey = key;
            buildGlobePatch(plan);
        }

        // Debug hook for the puppeteer patch-planning smoke test (_gibstest.js):
        // lets the test call planGlobePatch() with synthetic zooms and read the
        // tile-matrix geometry without fetching anything.
        try {
            window.__globePatchDebug = {
                plan: planGlobePatch,
                sets: GLOBE_PATCH_SETS,
                pxPerDeg: globePxPerDeg,
                maxLevel: GLOBE_PATCH_MAX_LEVEL,
                maxTiles: GLOBE_PATCH_MAX_TILES
            };
        } catch (hookErr) { /* non-browser context: ignore */ }

        // ===== 🔭 Fast maths for the pixel loop =====
        // The planet is drawn pixel by pixel, so every transcendental call in that loop
        // is paid a few hundred thousand times per frame. These tables replace
        // Math.asin / Math.atan2 (the two per pixel) with a multiply + lerp:
        //   • asin  — tabulated over |g| ∈ [0,1], worst error 0.32° (a third of one
        //             texel even on the sharpest GIBS patch, i.e. invisible);
        //   • atan2 — tabulated over t = min/max ∈ [0,1], worst error 0.001°.
        const GLOBE_LUT_N = 4096;
        const GLOBE_LUT_MAX = GLOBE_LUT_N - 1;
        const GLOBE_RAD2DEG = 180 / Math.PI;
        const globeAsinLut = new Float32Array(GLOBE_LUT_N + 1);
        for (let k = 0; k <= GLOBE_LUT_N; k += 1) globeAsinLut[k] = Math.asin(Math.min(1, k / GLOBE_LUT_N)) * GLOBE_RAD2DEG;
        const globeAtanLut = new Float32Array(GLOBE_LUT_N + 1);
        for (let k = 0; k <= GLOBE_LUT_N; k += 1) globeAtanLut[k] = Math.atan(k / GLOBE_LUT_N);

        function globeAsinDeg(g) {
            if (g >= 1) return 90;
            if (g <= -1) return -90;
            const neg = g < 0;
            const a = neg ? -g : g;
            const x = a * GLOBE_LUT_N;
            const k = x | 0;
            const v = globeAsinLut[k] + (globeAsinLut[k + 1] - globeAsinLut[k]) * (x - k);
            return neg ? -v : v;
        }

        function globeAtan2Deg(y, x) {
            const ay = y < 0 ? -y : y, ax = x < 0 ? -x : x;
            let a, xr, k;
            if (ax >= ay) {
                xr = (ay / (ax || 1e-20)) * GLOBE_LUT_N;
                k = xr | 0;
                if (k > GLOBE_LUT_MAX) k = GLOBE_LUT_MAX;
                a = globeAtanLut[k] + (globeAtanLut[k + 1] - globeAtanLut[k]) * (xr - k);
            } else {
                xr = (ax / (ay || 1e-20)) * GLOBE_LUT_N;
                k = xr | 0;
                if (k > GLOBE_LUT_MAX) k = GLOBE_LUT_MAX;
                a = Math.PI / 2 - (globeAtanLut[k] + (globeAtanLut[k + 1] - globeAtanLut[k]) * (xr - k));
            }
            if (x < 0) a = Math.PI - a;
            if (y < 0) a = -a;
            return a * GLOBE_RAD2DEG;
        }

        // Per-column (nx) and per-row (ny) inverse-projection tables, so the inner loop
        // only needs a subtract and a multiply per axis instead of two divisions.
        const globeNxTable = new Float32Array(GLOBE_MAX_RENDER_PX);
        const globeNyTable = new Float32Array(GLOBE_MAX_RENDER_PX);
        const globeNx2Table = new Float32Array(GLOBE_MAX_RENDER_PX);
        const globeNy2Table = new Float32Array(GLOBE_MAX_RENDER_PX);

        // ===== 🏷️ Globe label declutter — one claim box per drawn label =====
        // Every globe label (weather names, ocean names, °C badges, quake/volcano/
        // fire/tsunami/hurricane names) claims a screen box first. A label that
        // would overlap an already-claimed box is skipped this frame, so letters
        // and numbers can never pile into the jumbled mess. Zoom out = fewer
        // labels (only the most central ones win); zoom in = room for more.
        const globeLabelBoxes = [];
        function globeLabelClaim(x, y, halfW, halfH) {
            for (let i = 0; i < globeLabelBoxes.length; i += 1) {
                const b = globeLabelBoxes[i];
                if (Math.abs(b.x - x) < b.halfW + halfW && Math.abs(b.y - y) < b.halfH + halfH) return false;
            }
            globeLabelBoxes.push({ x, y, halfW, halfH });
            return true;
        }
        function globeLabelAllowed(x, y, text, fontPx) {
            const halfW = Math.max(8, String(text).length * fontPx * 0.34);
            const halfH = Math.max(7, fontPx * 0.75);
            return globeLabelClaim(x, y, halfW, halfH);
        }
        // Project a (lat, lng) point onto the 2D globe; null when it's on the far side
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

        // Same as globePoint but for a light at ALTITUDE above the surface —
        // the auroral curtains live ~90–700 km up (Earth radius 6371 km), so
        // their tops project visibly above the limb and shift with parallax as
        // the globe turns. zv is kept: footpoints need zv > 0.02, but curtain
        // tops are allowed slightly behind the limb (zv > -0.12) so polar
        // curtains peek over the edge exactly as real aurora does.
        function globePointAlt(latDeg, lngDeg, altKm, limbAllow) {
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
            const xf = gx * Math.cos(c) + gz * Math.sin(c);
            const zs = -gx * Math.sin(c) + gz * Math.cos(c);
            const yv = gy * Math.cos(t) - zs * Math.sin(t);
            const zv = gy * Math.sin(t) + zs * Math.cos(t);
            const lim = (limbAllow == null ? 0.02 : limbAllow);
            if (zv <= lim) return null;
            const f = 1 + Math.max(0, altKm) / 6371;
            return { x: cx + xf * R * f, y: cy - yv * R * f, z: zv, f };
        }

        // Geographic names + model temperatures for the illustrative sea-surface
        // heat overlays. The sub-readout under each name is SAMPLED from the same
        // anomaly grid the colour overlay paints, so the number can never
        // contradict the colour beneath it.
        function oceanAnomalyText(value, warm) {
            return (warm ? '+' : '−') + Math.abs(value).toFixed(1) + ' °C';
        }

        // The three sea-tint names are FIXED geographic anchors, so they reserve
        // their label boxes at the TOP of drawGlobe() — before any transient
        // weather-marker label can steal the spot — yet they still PAINT last so
        // they stay readable above the weather effects. Reservation and painting
        // share one definition list so the two can never drift apart.
        function oceanLabelDefs() {
            if (!elNinoGrid) buildElNinoGrid();   // grids feed the readouts too
            return [
                { name: 'El Niño', sub: oceanAnomalyText(elNinoAnomalyAt(0, -135), true),
                  lat: 0, lng: -135, layer: 'elnino' },
                { name: 'La Niña', sub: oceanAnomalyText(laNinaAnomalyAt(0, -100), false),
                  lat: 0, lng: -100, layer: 'lanina', color: '#bfe3ff' },
                { name: 'Gulf Stream', sub: gulfStreamTempC(38, -70).toFixed(1) + ' °C',
                  lat: 38, lng: -70, layer: 'gulf' }
            ];
        }
        const globeOceanReserved = new Set();
        function reserveOceanLabels(dpr) {
            globeOceanReserved.clear();
            const d = Math.max(1, dpr || 1);
            for (const label of oceanLabelDefs()) {
                if (globeLayerOn[label.layer] === false) continue; // its tint is switched off
                const p = globePoint(label.lat, label.lng);
                if (!p) continue;
                // Only the three names contend with EACH OTHER (via the shared
                // claim list); no weather marker may take their reserved spot.
                if (globeLabelAllowed(p.x, p.y, label.name, Math.round(12 * d))) {
                    globeOceanReserved.add(label.name);
                }
            }
        }
        function drawOceanLabels(ctx, dpr) {
            const labels = oceanLabelDefs();
            const d = Math.max(1, dpr || 1);
            ctx.save();
            ctx.font = '700 ' + Math.round(12 * d) + 'px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 4 * d;
            ctx.strokeStyle = 'rgba(6,18,38,0.95)';
            for (const label of labels) {
                if (globeLayerOn[label.layer] === false) continue; // its tint is switched off
                if (!globeOceanReserved.has(label.name)) continue; // lost its top-of-frame reservation
                const p = globePoint(label.lat, label.lng);
                if (!p) continue;
                // Fade near the horizon; never draw a name through the far side.
                ctx.globalAlpha = Math.min(1, p.z / 0.2);
                ctx.fillStyle = label.color || '#ffe3a3';   // warm cream / icy blue
                ctx.strokeText(label.name, p.x, p.y);
                ctx.fillText(label.name, p.x, p.y);
                if (label.sub) {
                    ctx.font = '700 ' + Math.round(10.5 * d) + 'px Inter, system-ui, sans-serif';
                    if (globeLabelAllowed(p.x, p.y + 14 * d, label.sub, Math.round(10.5 * d))) { // 🏧️ sub-readout gets its own box
                    ctx.strokeText(label.sub, p.x, p.y + 14 * d);
                    ctx.fillText(label.sub, p.x, p.y + 14 * d);
                    }
                    ctx.font = '700 ' + Math.round(12 * d) + 'px Inter, system-ui, sans-serif';
                }
            }
            ctx.restore();
        }

        // ===== 🌡️ visible °C readouts painted ON the globe =====
        // Small badges at the model's key points so the temperatures themselves are
        // readable right on the surface, not only in the lists below the globe:
        // the El Niño warm-tongue core, the La Niña cold-tongue core and several
        // stops along the Gulf Stream path. Gulf Stream values are read straight
        // from GULF_STREAM, the ENSO values are sampled from the same anomaly grids
        // the colour wash is painted from — so a badge can never disagree with the
        // colour under it. Each badge hides with its layer and behind the horizon.
        const OCEAN_TEMP_BADGES = [
            { lat: 0,   lng: -140, layer: 'elnino', anom: true,  warm: true },   // Niño 3.4 warm core
            { lat: -1,  lng: -92,  layer: 'elnino', anom: true,  warm: true },   // warm spread, S. America
            { lat: 0,   lng: -105, layer: 'lanina', anom: false, warm: false },  // cold tongue core
            { lat: -3,  lng: -87,  layer: 'lanina', anom: false, warm: false },  // upwelling strip
            { node: 0,  layer: 'gulf' },   // Gulf of Mexico / off Florida
            { node: 4,  layer: 'gulf' },   // Cape Hatteras
            { node: 7,  layer: 'gulf' },   // mid North Atlantic
            { node: 11, layer: 'gulf' }    // reaches NW Europe
        ];

        function drawOceanTempReadouts(ctx, dpr) {
            if (!elNinoGrid) buildElNinoGrid();
            const d = Math.max(1, dpr || 1);
            ctx.save();
            ctx.font = '800 ' + Math.round(10 * d) + 'px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const b of OCEAN_TEMP_BADGES) {
                if (globeLayerOn[b.layer] === false) continue;
                let lat = b.lat, lng = b.lng, text = null;
                if (b.node != null) {
                    const node = GULF_STREAM[b.node];
                    lat = node[0]; lng = node[1];
                    text = node[2].toFixed(1) + ' °C';
                } else if (b.warm) {
                    text = oceanAnomalyText(elNinoAnomalyAt(lat, lng), true);
                } else {
                    text = oceanAnomalyText(laNinaAnomalyAt(lat, lng), false);
                }
                const p = globePoint(lat, lng);
                if (!p) continue;
                ctx.globalAlpha = Math.min(1, p.z / 0.2);
                const w = ctx.measureText(text).width + 12 * d;
                const h = 15 * d;
                const x = p.x - w / 2, y = p.y - h / 2;
                if (!globeLabelClaim(p.x, p.y, w / 2 + 1.5 * d, h / 2 + 1.5 * d)) continue; // 🏷️ no °C-badge pile-up
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(x, y, w, h, 7 * d);
                } else {
                    ctx.rect(x, y, w, h);
                }
                ctx.fillStyle = b.layer === 'lanina'
                    ? 'rgba(10,40,86,0.78)'
                    : b.layer === 'elnino' ? 'rgba(78,26,6,0.78)' : 'rgba(6,18,38,0.78)';
                ctx.fill();
                ctx.fillStyle = b.layer === 'lanina' ? '#bfe3ff' : '#ffe3a3';
                ctx.fillText(text, p.x, p.y + 0.5 * d);
            }
            ctx.restore();
        }

        // ===== 🌌 Aurora oval state + helpers (TOP LEVEL — must live OUTSIDE the
        // per-frame globe painter and the hurricane loop: a previous edit had
        // them inside drawGlobe()/drawLiveHurricanes(), so every frame re-ran
        // initAurora() → fetchAurora() → drawGlobe() in a feedback loop that
        // starved the whole page and made auroraCells a throwaway local.) =====
        // The /api/aurora proxy returns the live oval as grid cells plus the
        // forecast time. Each cell glows in TRUE auroral colours — green 557.7nm
        // oxygen lower border, through teal, into purple/red nitrogen tops — with
        // intensity from the Ovation power proxy. Bilinear sampling keeps the oval
        // smooth at 50x zoom; night side is boosted, day side stays faint.
        let auroraCells = [];
        let auroraForecastTime = null;
        let auroraUpdatedAt = 0;
        // Per-frame aurora clock (seconds) + oval drift, refreshed at the top of
        // drawGlobe() so every pixel of the same frame shares one consistent sky.
        // Real ovals sit around the magnetic poles (~80°N/74°S, offset toward
        // magnetic midnight) and breathe/drift on 10 s … 10 min scales while
        // individual rays dance on 1–5 s scales — that is what these globals do.
        let auroraAnimT = 0;
        let auroraDriftLng = 0;
        let auroraDriftLat = 0;
        function auroraTrueColor(t) {
            // TRUE auroral spectrum by ALTITUDE, not by brightness:
            //   ~100–120 km  green 557.7 nm atomic oxygen lower border (sharp),
            //   ~120–180 km  teal N2 + O mix in the curtain core,
            //   ~180–300 km  violet/purple N2+ bands,
            //   300 km+       red 630.0 nm oxygen top fringe (only in strong events).
            // t 0..1 walks UP the curtain, so faint diffuse aurora stays green
            // and only the brightest cores grow purple/red tops — as in real life.
            // NOTE: stops stay SATURATED (one dominant channel, others low) —
            // pastel stops summed along the ray all pile toward white.
            const STOPS = [
                [0.00, 16, 255, 110],
                [0.45, 22, 255, 125],
                [0.70, 36, 215, 165],
                [0.85, 120, 70, 255],
                [1.00, 255, 45, 85]
            ];
            const x = Math.max(0, Math.min(1, t));
            for (let i = 0; i < STOPS.length - 1; i += 1) {
                const a = STOPS[i], b = STOPS[i + 1];
                if (x >= a[0] && x <= b[0]) {
                    const f = (x - a[0]) / Math.max(1e-6, b[0] - a[0]);
                    return { r: a[1] + (b[1] - a[1]) * f, g: a[2] + (b[2] - a[2]) * f, b: a[3] + (b[3] - a[3]) * f };
                }
            }
            const l = STOPS[STOPS.length - 1];
            return { r: l[1], g: l[2], b: l[3] };
        }
        // The oval is sampled from a prebuilt 0.5° grid (the same trick the SST
        // tables use): stamping every cell into the grid happens ONCE per aurora
        // refresh, so the per-pixel painter does an O(1) bilinear read instead of
        // looping hundreds of cells for each of the globe's ~580k pixels — that
        // loop alone cost ~460 ms per frame once the fetch finally worked.
        const AURORA_LAT_MIN = -90, AURORA_LAT_MAX = 90;  // BOTH poles get an oval
        const AURORA_MIN_ABS_LAT = 50;                    // the oval lives around the poles
        const AURORA_GRID_STEP = 0.5;                     // degrees per grid cell
        const AURORA_GX = Math.round(360 / AURORA_GRID_STEP);                   // 720 columns (lng)
        const AURORA_GY = Math.round((AURORA_LAT_MAX - AURORA_LAT_MIN) / AURORA_GRID_STEP) + 1; // 361 rows (lat)
        let auroraGrid = null;   // Float32Array — built lazily, reset when the cells change

        function buildAuroraGrid() {
            const grid = new Float32Array(AURORA_GX * AURORA_GY);
            const R = 6, R2 = R * R, step = AURORA_GRID_STEP;
            const ring = Math.ceil(R / step);
            for (const c of auroraCells) {
                if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') continue;
                const amp = Math.min(1, (Number(c.intensity) || 0) / 60);
                if (amp <= 0) continue;
                const y0 = Math.max(0, Math.floor((c.lat - R - AURORA_LAT_MIN) / step));
                const y1 = Math.min(AURORA_GY - 1, Math.ceil((c.lat + R - AURORA_LAT_MIN) / step));
                const x0 = Math.round((c.lng + 180) / step);
                for (let gy = y0; gy <= y1; gy += 1) {
                    const dLat = (AURORA_LAT_MIN + gy * step) - c.lat;
                    for (let gx = x0 - ring; gx <= x0 + ring; gx += 1) {
                        let dLng = (gx * step) - 180 - c.lng;
                        dLng = ((dLng % 360) + 540) % 360 - 180;   // shortest way round
                        const d2 = dLat * dLat + dLng * dLng;
                        if (d2 > R2) continue;
                        const w = (1 - Math.sqrt(d2) / R) * amp;
                        const idx = gy * AURORA_GX + (((gx % AURORA_GX) + AURORA_GX) % AURORA_GX);
                        if (w > grid[idx]) grid[idx] = w;
                    }
                }
            }
            return grid;
        }

        function auroraGlowAt(latDeg, lngDeg) {
            if (!auroraCells.length || globeLayerOn.aurora === false) return 0;
            if (Math.abs(latDeg) < AURORA_MIN_ABS_LAT) return 0; // oval lives around the poles
            if (!auroraGrid) auroraGrid = buildAuroraGrid();
            // Real ovals breathe around the MAGNETIC poles: shift the sampling
            // point opposite to the drift so the whole oval slowly wanders —
            // westward electrojet drift + equatorward/poleward breathing on
            // minute scales, plus a fast small wobble so rays visibly dance.
            const hemi = latDeg < 0 ? -1 : 1;
            const lngS = lngDeg - auroraDriftLng * hemi;
            const latS = latDeg - auroraDriftLat * hemi;
            const step = AURORA_GRID_STEP;
            const fx = (lngS + 180) / step;
            const fy = (latS - AURORA_LAT_MIN) / step;
            const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
            let y0 = Math.floor(fy);
            if (y0 > AURORA_GY - 2) y0 = AURORA_GY - 2;
            const x0 = Math.floor(fx);
            const xa = ((x0 % AURORA_GX) + AURORA_GX) % AURORA_GX;
            const xb = (xa + 1) % AURORA_GX;
            const i00 = y0 * AURORA_GX + xa, i10 = y0 * AURORA_GX + xb;
            const i01 = (y0 + 1) * AURORA_GX + xa, i11 = (y0 + 1) * AURORA_GX + xb;
            const top = auroraGrid[i00] + (auroraGrid[i10] - auroraGrid[i00]) * tx;
            const bot = auroraGrid[i01] + (auroraGrid[i11] - auroraGrid[i01]) * tx;
            return Math.min(1, top + (bot - top) * ty);
        }

        // ===== 🌌 Volumetric aurora shell (top level, shared with the pixel loop) ====
        // Real curtains are NOT painted on the ground: they stand in a glowing
        // SHELL ~90–700 km above the auroral oval — a sharp green 557.7 nm floor
        // near 100–120 km, fading up through teal/violet into the faint red
        // 630.0 nm oxygen fringe near the top of tall curtains. The top sits
        // INSIDE the ~1.45 R atmosphere halo (see the destination-over glow in
        // drawGlobe) so the curtains visibly tower and lean over the limb
        // instead of hugging the ground, while the halo still reads as the
        // outer sky behind them. The globe therefore RAY-MARCHES each
        // view ray through that shell: every lit step adds emission at its
        // OWN altitude (so the oval gains true height and parallax as the
        // globe turns), grazing rays traverse more curtain (natural limb
        // brightening) and the column leans over the planet edge exactly
        // like real aurora seen from orbit.
        const AURORA_ALT_FLOOR_KM = 90;      // curtain lower border (quenched below this)
        const AURORA_ALT_TOP_KM = 700;       // red 630.0 nm top fringe of tall curtains (1.11 R — inside the ~1.45 R halo, towering past the limb)
        const AURORA_SHELL_R0 = 1 + AURORA_ALT_FLOOR_KM / 6371;
        const AURORA_SHELL_R1 = 1 + AURORA_ALT_TOP_KM / 6371;
        const AURORA_SHELL_R0_2 = AURORA_SHELL_R0 * AURORA_SHELL_R0;
        const AURORA_SHELL_R1_2 = AURORA_SHELL_R1 * AURORA_SHELL_R1;
        const AURORA_MARCH_STEPS = 10;       // samples through the shell per view ray (taller shell needs more)
        const AURORA_MARCH_GAIN = 78;        // emission scale (tuned to the old peak alpha)
        const AURORA_GATE_GY = Math.sin(50 * Math.PI / 180); // auroraGlowAt rejects |lat| < 50°
        const AURORA_SHELL_R1S = 1 / AURORA_SHELL_R1_2;      // for the sqrt-free oval gate
        // March result in module scope — the pixel loop must never allocate.
        let auroraMarchR = 0, auroraMarchG = 0, auroraMarchB = 0, auroraMarchA = 0;

        // Cheap per-pixel pre-gate: an upper bound on |sin(lat)| over ALL
        // samples of this view ray. |gy| ≤ |ny|·cosT + uzMax·sinT, and the
        // ray's furthest sample sits exactly at radius R1, so uzMax =
        // sqrt(1 - ρ²/R1²). When even that bound stays below sin(50°) no
        // sample can ever reach the oval → skip the whole march. The
        // comparison is arranged to need NO sqrt in the pixel loop:
        // reject when (1 - ρ²/R1²) < ((sin50° - |ny|·cosT) / sinT)².
        function auroraRaySeesOval(nx, ny, rho2, sinTa, cosTa) {
            const a = AURORA_GATE_GY - Math.abs(ny) * cosTa;
            if (a <= 0) return true;                          // bound already clears the gate
            if (sinTa < 1e-6) return false;                   // equator-on: only edge rows qualify
            const q = a / sinTa;
            return 1 - rho2 * AURORA_SHELL_R1S >= q * q;
        }

        // March ONE view ray through the aurora shell, accumulating additive
        // emission in the auroraMarch* scratch vars (no per-pixel allocation).
        // latRef/lngRef anchor the animated ray field: curtains are vertical,
        // so one set of rays/flicker modulates the whole column. Callers
        // pre-gate with auroraRaySeesOval; on-disc rays (rho < 1) automatically
        // start above the horizon because the shell bottom R0 > 1.
        function marchAuroraShell(nx, ny, rho2, latRef, lngRef, cosC, sinC, cosT, sinT, Lx, Ly, Lz) {
            auroraMarchR = auroraMarchG = auroraMarchB = auroraMarchA = 0;
            // s = depth along the view ray (+z toward the camera); the shell
            // spans radii R0..R1 (Earth radii): s ∈ [sqrt(R0²-ρ²), sqrt(R1²-ρ²)].
            const sTop2 = AURORA_SHELL_R1_2 - rho2;
            if (sTop2 <= 0) return;
            const sBot2 = AURORA_SHELL_R0_2 - rho2;
            const sTop = Math.sqrt(sTop2);
            const sBot = sBot2 > 0 ? Math.sqrt(sBot2) : 0;  // off-disc rays graze the outer shell only
            if (sTop <= sBot) return;
            const ds = (sTop - sBot) / AURORA_MARCH_STEPS;
            // Ray structure + shimmer, exactly as the flat painter used them —
            // but once per COLUMN so the striations stay vertical like real rays.
            const poleSign = latRef < 0 ? -1 : 1;
            const rayPhase = (lngRef * 2.2 + poleSign * auroraAnimT * 14.0) * Math.PI / 180;
            const rayPhase2 = (lngRef * 5.1 - poleSign * auroraAnimT * 23.0 + latRef * 1.7) * Math.PI / 180;
            const rays = 0.62 + 0.38 * Math.sin(rayPhase) * Math.sin(rayPhase2 * 0.7 + rayPhase * 1.3);
            const flick = 0.78 + 0.22 * Math.sin(auroraAnimT * 2.1 + lngRef * 0.35 + latRef * 0.9)
                * Math.sin(auroraAnimT * 0.9 - lngRef * 0.18);
            const anim = (0.55 + 0.45 * rays) * flick;
            let mr = 0, mg = 0, mb = 0;
            for (let k = 0; k < AURORA_MARCH_STEPS; k += 1) {
                const s = sBot + (k + 0.5) * ds;
                const r = Math.sqrt(rho2 + s * s);
                // View direction of this sample → world lat/lng: the same
                // inverse tilt+spin the pixel loop applies to surface points.
                const ux = nx / r, uy = ny / r, uz = s / r;
                const gy = uy * cosT + uz * sinT;
                const zs = -uy * sinT + uz * cosT;
                const gx = ux * cosC - zs * sinC;
                const gz = ux * sinC + zs * cosC;
                const glow = auroraGlowAt(globeAsinDeg(gy), globeAtan2Deg(gx, gz));
                if (glow <= 0.02) continue;
                // Vertical emission profile: sharp ramp above the ~90 km
                // quench line, then a SLOW tall-curtain falloff (~280 km scale
                // height) — bright green floor, faint high-altitude tops.
                const alt = (r - 1) * 6371;
                const d = alt - AURORA_ALT_FLOOR_KM;
                if (d <= 0) continue;
                const ramp = d < 20 ? d * 0.05 : 1;
                const decay = alt > 110 ? Math.exp(-(alt - 110) / 280) : 1;
                // Colour walks the TRUE auroral spectrum by ALTITUDE: green
                // 557.7 nm floor → teal → violet → red 630.0 nm fringe; only
                // strong cells push enough emission high enough for the red
                // tops to show, as in real life.
                const ac = auroraTrueColor((alt - 100) / 450);
                const reach = 0.4 + 0.6 * Math.min(1, glow * 1.5);
                const sunDot = ux * Lx + uy * Ly + uz * Lz;
                const night = sunDot < 0 ? 1 : Math.max(0.30, 1 - sunDot * 1.6);
                const c = glow * ramp * decay * reach * night * anim * ds * AURORA_MARCH_GAIN;
                mr += ac.r * c; mg += ac.g * c; mb += ac.b * c;
            }
            // Keep the hue: overlapping ray samples pile all three channels
            // toward saturation (white). Capping total emission preserves the
            // green/violet/red mix instead of clipping to white.
            const mPeak = mr > mg ? (mr > mb ? mr : mb) : (mg > mb ? mg : mb);
            if (mPeak > 0.7) { const f = 0.7 / mPeak; mr *= f; mg *= f; mb *= f; }
            auroraMarchR = mr; auroraMarchG = mg; auroraMarchB = mb;
            auroraMarchA = mr > mg ? mr : mb > mg ? mb : mg;   // max channel drives the off-limb alpha
        }

        // ===== 🌌 Live aurora oval fetch (NOAA SWPC Ovation via /api/aurora) ====
        // Runs ONCE at startup and then every 30 minutes — never per frame.
        const AURORA_REFRESH_MS = 30 * 60 * 1000;
        let auroraTimer = null;
        async function fetchAurora() {
            try {
                const res = await fetch('/api/aurora');
                if (!res.ok) return;
                const data = await res.json();
                if (data && data.available && Array.isArray(data.cells)) {
                    auroraCells = data.cells;
                    auroraGrid = null;   // new cells → re-stamp the sampling grid once
                    auroraForecastTime = data.forecastTime || null;
                    auroraUpdatedAt = Date.now();
                    drawGlobe();
                }
            } catch (e) { /* aurora is decorative — never break the globe */ }
        }
        function initAurora() {
            fetchAurora();
            if (auroraTimer) clearInterval(auroraTimer);
            auroraTimer = setInterval(fetchAurora, AURORA_REFRESH_MS);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAurora, { once: true });
        } else { initAurora(); }

        function drawGlobe() {
            globeLabelBoxes.length = 0; // per-frame label claims — stops the jumbled pile-up
            if (!globeCtx || !globeCanvas) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const cssW = Math.max(180, globeCanvas.clientWidth || 320);
            // Cap the backing store (see GLOBE_MAX_RENDER_PX): the planet is drawn
            // pixel by pixel every frame, so a huge stage must not become a huge
            // per-frame cost. Past the cap the browser upscales the canvas — the
            // globe still LOOKS bigger and every hit-test stays in device pixels.
            const size = Math.round(Math.min(cssW * dpr, GLOBE_MAX_RENDER_PX));
            if (globeCanvas.width !== size || globeCanvas.height !== size) {
                globeCanvas.width = size;
                globeCanvas.height = size;
            }
            // Fixed geographic names (El Niño / La Niña / Gulf Stream) reserve their
            // boxes FIRST, so transient weather-marker labels can never crowd them out.
            reserveOceanLabels(dpr);
            const ctx = globeCtx;
            const R = size * 0.40 * Math.max(0.8, globeZoom);
            const cx = size / 2 + viewDx, cy = size / 2 + viewDy;
            const c = globeRotY * Math.PI / 180;
            const t = globeTiltX * Math.PI / 180;
            const cosC = Math.cos(c), sinC = Math.sin(c);
            const cosT = Math.cos(t), sinT = Math.sin(t);

            ctx.clearRect(0, 0, size, size);
            // (No atmosphere glow here: putImageData below REPLACES every
            // pixel — including transparent ones — so anything painted now
            // would be erased. The halo is painted AFTER putImageData with
            // destination-over instead. Globe pixels themselves untouched.)

            // render the globe itself, pixel by pixel.
            // Three things keep this inside the 30 fps budget even where a zoomed-in planet
            // fills every one of the 760² pixels:
            //   1. the inverse projection splits into per-column (nx) and per-row (ny)
            //      tables, so each pixel costs one multiply per axis instead of a division;
            //   2. asin/atan2 come from lookup tables (globeAsinDeg / globeAtan2Deg);
            //   3. the shading is pre-clamped to 1, so the three channels go straight into
            //      the (self-clamping) Uint8ClampedArray — one Math.min less per channel.
            // Deep zoom adds one more source: inside the NASA GIBS patch the sample comes
            // from that sharper patch instead of the base texture (see updateGlobePatch).
            const img = ctx.createImageData(size, size);
            const out = img.data;
            const hasTex = !!earthTexData;
            const texData = earthTexData, texW = earthTexW, texH = earthTexH;
            const patch = globePatch;
            const patchOn = !!patch;
            const patchData = patchOn ? patch.data : null;
            const patchW = patchOn ? patch.w : 0, patchH = patchOn ? patch.h : 0;
            const patchLng0 = patchOn ? patch.lng0 : 0, patchLat1 = patchOn ? patch.lat1 : 0;
            const patchScaleX = patchOn ? patch.scaleX : 0, patchScaleY = patchOn ? patch.scaleY : 0;
            const Lx = 0.55, Ly = 0.38, Lz = 0.74; // light direction
            // 🌌 one aurora clock per frame: oval drift + breathing + ray dance
            // all share this so the curtains move coherently across the frame.
            //   driftLng — slow westward electrojet walk (~±8°, minute scales);
            //   driftLat — equatorward/poleward breathing (~±1.5°, ~6 min period).
            auroraAnimT = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
            auroraDriftLng = 6.0 * Math.sin(auroraAnimT * 0.021) + 2.0 * Math.sin(auroraAnimT * 0.11);
            auroraDriftLat = 1.1 * Math.sin(auroraAnimT * 0.017 + 1.3) + 0.35 * Math.sin(auroraAnimT * 0.23);
            // One lookup per frame: the whole pixel loop skips the volumetric
            // aurora march when the layer is off or no oval data has arrived.
            const auroraOn = globeLayerOn.aurora !== false && auroraCells.length > 0;
            const auroraGateSinT = Math.abs(sinT), auroraGateCosT = Math.abs(cosT);
            if (!elNinoGrid) buildElNinoGrid(); // all three SST lookup tables, built once
            // One lookup per frame instead of a property read per ocean pixel.
            const elNinoOn = globeLayerOn.elnino !== false;
            const gulfOn = globeLayerOn.gulf !== false && !!gulfStreamGrid;
            const laNinaOn = globeLayerOn.lanina !== false;
            const warmOn = !!elNinoGrid && (elNinoOn || gulfOn);
            const seaTintOn = warmOn || (laNinaOn && !!laNinaGrid);

            const invR = 1 / R;
            const nxT = globeNxTable, nyT = globeNyTable, nx2T = globeNx2Table, ny2T = globeNy2Table;
            for (let i = 0; i < size; i += 1) {
                const v = (i - cx) * invR;
                nxT[i] = v;
                nx2T[i] = v * v;
            }
            for (let j = 0; j < size; j += 1) {
                const v = (cy - j) * invR;
                nyT[j] = v;
                ny2T[j] = v * v;
            }

            // Let the deep-zoom loader decide whether this view needs NASA GIBS tiles. It
            // keeps its own throttle and never blocks, so calling it every frame is free.
            // `dispW` is what the eye gets, not the backing store: past GLOBE_MAX_RENDER_PX
            // the canvas is upscaled to the CSS box (retina / big stage), so the patch has
            // to satisfy that many pixels per degree, not just `size` of them.
            const dispW = cssW * dpr;
            updateGlobePatch(size, globeZoom, cx, cy, R, cosC, sinC, cosT, sinT, dispW);
            updateGlobeBorders(globeZoom);

            for (let j = 0; j < size; j += 1) {
                const ny = nyT[j], ny2 = ny2T[j];
                const rowOff = j * size;
                for (let i = 0; i < size; i += 1) {
                    const nx = nxT[i];
                    const z2 = 1 - nx2T[i] - ny2;
                    if (z2 <= 0) {
                        // 🌌 above the limb: the tops of far-side curtains peek past the
                        //    planet edge — real aurora stands over the horizon.
                        if (auroraOn) {
                            const rho2 = nx2T[i] + ny2;
                            if (rho2 < AURORA_SHELL_R1_2 && auroraRaySeesOval(nx, ny, rho2, auroraGateSinT, auroraGateCosT)) {
                                const gy0 = ny * cosT, zs0 = -ny * sinT;
                                marchAuroraShell(nx, ny, rho2, globeAsinDeg(gy0),
                                    globeAtan2Deg(nx * cosC - zs0 * sinC, nx * sinC + zs0 * cosC),
                                    cosC, sinC, cosT, sinT, Lx, Ly, Lz);
                                if (auroraMarchA > 0.12) {
                                    const oi = (rowOff + i) * 4;
                                    // March outputs are 0..~1 linear light but the
                                    // buffer is 0..255 — writing the raw floats
                                    // rounded every channel to 0 (black patches
                                    // with bright alpha where aurora should glow).
                                    out[oi] = auroraMarchR * 255;
                                    out[oi + 1] = auroraMarchG * 255;
                                    out[oi + 2] = auroraMarchB * 255;
                                    out[oi + 3] = Math.min(255, auroraMarchA * 320);
                                }
                            }
                        }
                        continue;             // off the planet: the pixel stays transparent
                    }
                    const nz = Math.sqrt(z2);
                    const idx = (rowOff + i) * 4;

                    // inverse view transform -> lat/lon for this pixel.
                    // Mirror globePoint: undo the tilt first, then the polar spin.
                    const gy = ny * cosT + nz * sinT;
                    const zs = -ny * sinT + nz * cosT;
                    const gx = nx * cosC - zs * sinC;
                    const gz = nx * sinC + zs * cosC;
                    const latDeg = globeAsinDeg(gy);
                    const lngDeg = globeAtan2Deg(gx, gz);

                    let r, g, b;
                    // Sample the deep-zoom GIBS patch when the pixel falls inside it, the
                    // base texture otherwise (u right, v down on the equirectangular map).
                    let to = -1;
                    if (patchOn) {
                        const pu = (lngDeg - patchLng0) * patchScaleX;
                        if (pu >= 0 && pu < patchW) {
                            const pv = (patchLat1 - latDeg) * patchScaleY;
                            if (pv >= 0 && pv < patchH) to = ((pv | 0) * patchW + (pu | 0)) * 4;
                        }
                    }
                    if (to >= 0) {
                        r = patchData[to]; g = patchData[to + 1]; b = patchData[to + 2];
                    } else if (hasTex) {
                        let su = ((lngDeg / 180 + 1) * 0.5 * texW) | 0;
                        if (su < 0) su = 0; else if (su > texW - 1) su = texW - 1;
                        let sv = ((90 - latDeg) / 180 * texH) | 0;
                        if (sv < 0) sv = 0; else if (sv > texH - 1) sv = texH - 1;
                        to = (sv * texW + su) * 4;
                        r = texData[to]; g = texData[to + 1]; b = texData[to + 2];
                    } else {
                        // no texture yet: plain ocean blue until the texture loads
                        r = 22; g = 62; b = 126;
                    }
                    const isOcean = hasTex ? (r < b && g < b) : true;   // blue-dominant = water

                    // 🌊 Sea-surface phase tint, painted only over the ocean. The two
                    // ENSO phases are opposites, so wherever BOTH have a say the
                    // STRONGER anomaly wins: El Niño's warm pool owns the west/central
                    // Pacific, La Niña's cold tongue owns the east — a clean split
                    // instead of warm and cold blending into mud. The Gulf Stream rides
                    // the warm ramp in its own basin.
                    if (isOcean && seaTintOn) {
                        let warm = 0;
                        if (elNinoOn) warm = elNinoAnomalyAt(latDeg, lngDeg);
                        if (gulfOn) warm = Math.max(warm, gulfStreamAnomalyAt(latDeg, lngDeg));
                        const cold = laNinaOn ? laNinaAnomalyAt(latDeg, lngDeg) : 0;
                        if (cold > warm && cold > 0.05) {
                            const sst = laNinaColor(cold);
                            r = r + (sst.r - r) * sst.a;
                            g = g + (sst.g - g) * sst.a;
                            b = b + (sst.b - b) * sst.a;
                        } else if (warm > 0.05) {
                            const sst = elNinoColor(warm);
                            r = r + (sst.r - r) * sst.a;
                            g = g + (sst.g - g) * sst.a;
                            b = b + (sst.b - b) * sst.a;
                        }
                    }

                    // sunlight + limb shading. The tone is clamped to 1 up front, so the
                    // three channels can be written raw: a Uint8ClampedArray rounds and
                    // clamps for us, which is one Math.min less per channel than before.
                    // (The aurora curtains just below ADD their light after this, so the
                    // surface tone never dims them back into a ground tint.)
                    if (hasTex) {
                        let light = nx * Lx + ny * Ly + nz * Lz;
                        if (light < 0) light = 0;
                        let tone = (0.34 + 0.72 * light) * (0.84 + 0.16 * nz);
                        if (tone > 1) tone = 1;
                        out[idx] = r * tone;
                        out[idx + 1] = g * tone;
                        out[idx + 2] = b * tone;
                    } else {
                        const tone = 0.18 + 0.5 * nz;
                        out[idx] = r * tone;
                        out[idx + 1] = g * tone;
                        out[idx + 2] = b * tone;
                    }
                    // 🌌 AURORA CURTAINS (additive emission above the surface, not a
                    // ground tint): the view ray is MARCHED through the 90–700 km
                    // auroral shell, so the oval gains real altitude — a sharp
                    // green 557.7 nm floor ~110 km, violet/red 630.0 nm tops
                    // hundreds of km up — leaning over the limb and shifting with
                    // parallax as the globe turns, exactly like real curtains.
                    // Ovation fixes WHERE the oval is; the vertical emission
                    // profile + per-frame clock fix HOW the column dances. Night
                    // side glows ~3× the day side; grazing rays brighten naturally.
                    if (auroraOn && auroraRaySeesOval(nx, ny, nx2T[i] + ny2, auroraGateSinT, auroraGateCosT)) {
                        marchAuroraShell(nx, ny, nx2T[i] + ny2, latDeg, lngDeg,
                            cosC, sinC, cosT, sinT, Lx, Ly, Lz);
                        // March outputs are 0..~1 linear light; the buffer is
                        // 0..255 (adding raw floats rounded to ±1: invisible).
                        out[idx] += auroraMarchR * 255;
                        out[idx + 1] += auroraMarchG * 255;
                        out[idx + 2] += auroraMarchB * 255;
                    }
                    out[idx + 3] = 255;
                }
            }
            ctx.putImageData(img, 0, 0);

            // 🌌 soft atmosphere glow around the planet — painted AFTER the
            // globe pixels with destination-over so it lands BEHIND the disc
            // (putImageData REPLACES every pixel, so anything painted before it
            // is erased). Never over the surface, borders, weather chips or
            // aurora curtains: a thin bright limb hugging the edge fading into
            // a soft halo out to ~1.45 R (~2,900 km — the photographed outer
            // glow, far above the ~300 km visible shell, exactly like orbit
            // photos). Globe pixels themselves untouched —
            // destination-over only fills transparent pixels.
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            const glow = ctx.createRadialGradient(cx, cy, R * 0.99, cx, cy, R * 1.45);
            glow.addColorStop(0, 'rgba(150,205,255,0.42)');
            glow.addColorStop(0.09, 'rgba(120,190,255,0.16)');
            glow.addColorStop(0.33, 'rgba(110,180,255,0.06)');
            glow.addColorStop(1, 'rgba(110,180,255,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, size, size);
            ctx.restore();

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

            // 🗺️ country borders and coastlines, under every weather marker
            drawGlobeBorders(ctx, cx, cy, R, size, cosC, sinC, cosT, sinT);

            // 🏜️ the Saharan Air Layer: drifting dust haze over the Sahara, the
            //    Sahel and the Atlantic outflow — painted under every marker, so
            //    the weather chips and event pins stay readable on top of it.
            drawSaharanDust(ctx, cx, cy, R, size);

            // 🌪️ sandstorms: where the modelled dust load meets wind strong enough to
            //    lift it — drawn on top of the haze, so the two read as one system
            drawSandstorms(ctx, cx, cy, R, size);

            // 💨 the wind on its own coarse global grid, under the sandstorms so a
            //    storm's swirl still sits on top of the flow that drives it
            drawWindField(ctx, cx, cy, R, size);

            // 🌦️ weather markers: clouds, thunder, rain and sun where they happen
            drawWeatherMarkers(ctx, cx, cy, R, size);

            // Ocean names + °C readouts remain readable above the weather effects.
            drawOceanLabels(ctx, dpr);
            drawOceanTempReadouts(ctx, dpr);

            // 🌀 live hurricanes (NOAA NHC): name + wind speed plotted on the globe
            drawLiveHurricanes(ctx, cx, cy, R, size);

            // 🌋 live volcanoes (NASA EONET): cone + crater glow + lava fountain +
            //   ash plume, erupting hardest where activity was reported most recently
            drawLiveVolcanoes(ctx, cx, cy, R, size);

            // 🔥 live forest fires (NASA EONET): glowing flame at the latest position
            drawLiveFires(ctx, cx, cy, R, size);

            // 🪨 mudslides (NASA EONET) + modelled rain-triggered slope halos
            drawLandslideRisk(ctx, cx, cy, R, size);
            drawLiveMudslides(ctx, cx, cy, R, size);

            // 🏔️ official avalanche zones + modelled snow-load halos
            drawAvalancheRisk(ctx, cx, cy, R, size);
            drawLiveAvalanches(ctx, cx, cy, R, size);

            // ⭕ live earthquakes (USGS): magnitude-scaled circles with the magnitude inside
            drawLiveEarthquakes(ctx, cx, cy, R, size);

            // 🌊 tsunami messages (NOAA warning centres): ripples + wave heights
            drawLiveTsunamis(ctx, cx, cy, R, size);

            // pulsing "you are here" marker, tinted + labelled with the live weather condition
            const mp = globePoint(globeMarkerLat, globeMarkerLng);
            if (mp) {
                const you = youWeather;
                const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 3.2);
                const condition = (latestWeatherData && latestWeatherData.condition) || 'Locating…';
                const color = (you && WEATHER_COLOR[you.type]) || 'rgba(255,110,140,0.95)';
                const emoji = (you && you.emoji) || '📍';
                const rad = Math.max(8 * dpr, Math.min(20 * dpr, R * 0.052 / Math.max(1, globeZoom)));
                ctx.save();
                ctx.shadowColor = color;
                ctx.shadowBlur = Math.max(2, Math.min(18 * dpr, R * 0.05 / Math.max(1, globeZoom)));
                ctx.strokeStyle = color;
                ctx.globalAlpha *= 0.45 + 0.35 * pulse;
                ctx.lineWidth = Math.max(1.2, Math.min(4 * dpr, R * 0.01 / Math.max(1, globeZoom)));
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

                ctx.font = '600 ' + Math.max(10, Math.round(Math.min(14 * dpr, rad * 1.1))) + 'px Inter, system-ui, sans-serif';
                ctx.textBaseline = 'bottom';
                // live temperature placed on the globe together with the weather icon
                const liveTemp = (latestWeatherData && typeof latestWeatherData.temperature === 'number') ? Math.round(latestWeatherData.temperature) + '°C' : null;
                const youLabel = '● You · ' + condition + (liveTemp ? ' · ' + liveTemp : '');
                ctx.lineWidth = Math.max(1.5, Math.min(3 * dpr, rad * 0.28));
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
            const markerScale = Math.min(1.5, 0.52 + Math.sqrt(globeZoom) * 0.24); // sub-linear: no giant pins at 50×
            const now = performance.now();
            for (const m of WEATHER_MARKERS) {
                if (globeLayerOn[m.type] === false) continue; // that chip is switched off
                const p = globePoint(m.lat, m.lng);
                if (!p) continue; // far side of the planet
                // R scales with the zoom, so R × markerScale would explode at 50×:
                // divide the zoom back out and let only the sub-linear markerScale
                // grow the pin (22–33 px device range).
                const rad = Math.max(8 * dpr, Math.min(33 * dpr, R * 0.06 * markerScale / Math.max(1, globeZoom)));
                const pulse = 0.5 + 0.5 * Math.sin(now / 1000 * 2.4 + m.lat);
                const emoji = WEATHER_EMOJI[m.type] || weatherIconForGroup('Cloudy');
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
                // 🏷️ declutter: far-zoomed globe shows icons only (no name pile-up);
                // closer zooms claim a box so names can never overlap.
                var labelPx = Math.max(10, Math.round(rad * 0.42));
                var showName = (globeZoom >= 1.35) || (focusedWeather && focusedWeather.lat === m.lat && focusedWeather.lng === m.lng);
                var nameOk = showName && globeLabelAllowed(p.x, p.y + rad * 1.05 + 10 * dpr, m.label, labelPx);
                ctx.font = '600 ' + labelPx + 'px Inter, system-ui, sans-serif';
                ctx.textBaseline = 'top';
                const labelY = p.y + rad * 1.05 + 10 * dpr;
                if (nameOk) {
                ctx.lineWidth = Math.max(1.5, rad * 0.10);
                ctx.strokeStyle = 'rgba(6,18,38,0.8)';
                ctx.strokeText(m.label, p.x, labelY);
                ctx.fillStyle = 'rgba(244,250,255,0.97)';
                ctx.fillText(m.label, p.x, labelY);
                }
                // 🌡️ temperature badge right next to the weather icon (claimed too, so °C never lands on a name)
                if (typeof m.temp === 'number' && globeLabelAllowed(p.x + rad * 0.48, p.y - rad * 0.45, m.temp + '°', 10 * dpr)) {
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
            if (globeLayerOn.hurricane === false) return; // 🌀 chip switched off
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            for (const s of liveHurricanes) {
                if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
                const p = globePoint(s.lat, s.lng);
                if (!p) continue;
                const isHurricane = !!(s.category && s.category.num);
                const color = isHurricane ? 'rgba(255, 74, 54, 0.95)' : 'rgba(255, 168, 60, 0.95)';
                // R scales with zoom: normalise it out so storms stay a constant device size.
                const rad = Math.max(9 * dpr, Math.min(26 * dpr, R * 0.07 / Math.max(1, globeZoom)));
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

                // NAME + WIND SPEED card above the cyclone (claimed: no card pile-up)
                // 🏷️ far zoom keeps only Cat-storms + the first few, so names never jumble.
                var hOrder = liveHurricanes.indexOf(s);
                var hStrong = isHurricane || hOrder < 3 || globeZoom >= 1.6;
                if (!hStrong) { ctx.restore(); lastWeatherHits.push({ x: p.x, y: p.y, r: rad * 2.4, label: s.name, lat: s.lat, lng: s.lng, type: 'hurricane' }); continue; }
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
                if (!globeLabelClaim(cardX + cardW / 2, cardY + cardH / 2, cardW / 2 + 2, cardH / 2 + 2)) { ctx.restore(); lastWeatherHits.push({ x: p.x, y: p.y, r: rad * 2.4, label: s.name, lat: s.lat, lng: s.lng, type: 'hurricane' }); continue; } // 🏷️ card overlaps: icon stays, card waits for zoom
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

        // ===== ⭕ Live earthquakes on the globe (USGS) =====
        // Every event from the USGS "past day" feed (M2.5+) is plotted at its
        // epicentre as a magnitude-scaled circle — the USGS map convention: a
        // bigger circle means a bigger quake. The magnitude is printed inside and
        // also picks the colour band; events USGS flagged as possible tsunami
        // sources get a dashed cyan ring. Clicking a circle zooms into it.
        function earthquakeRadius(mag, R, dpr) {
            const t = clampGlobe((mag - QUAKE_MIN_MAGNITUDE) / 6.5, 0, 1); // M2.5 → 0, M9+ → 1
            // R grows with the zoom: normalise it back out so circles keep a constant
            // device size at any zoom (previously R × zoom would explode to 50×).
            return clampGlobe(R * (0.016 + 0.105 * Math.pow(t, 0.7)) / Math.max(1, globeZoom), 3.4 * dpr, 30 * dpr);
        }

        function earthquakeColor(mag) {
            if (mag >= 7) return 'rgba(178, 12, 34, 0.95)';   // M7+ major
            if (mag >= 6) return 'rgba(228, 66, 28, 0.95)';   // M6 strong
            if (mag >= 5) return 'rgba(244, 140, 20, 0.95)';  // M5 moderate
            if (mag >= 4) return 'rgba(226, 196, 66, 0.9)';   // M4 light
            return 'rgba(150, 214, 255, 0.85)';               // minor / micro
        }

        function drawLiveEarthquakes(ctx, cx, cy, R, size) {
            if (globeLayerOn.quakes === false) return; // ⭕ chip switched off
            if (!liveEarthquakes.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            // Zoomed all the way out only the M4+ quakes are drawn so the planet
            // stays readable — the smaller ones appear once the user zooms in.
            const minMag = globeZoom >= 1.35 ? QUAKE_MIN_MAGNITUDE : 4;

            for (const q of liveEarthquakes) {
                if (typeof q.lat !== 'number' || typeof q.lng !== 'number' || typeof q.mag !== 'number') continue;
                if (q.mag < minMag) continue;
                const p = globePoint(q.lat, q.lng);
                if (!p) continue; // far side of the planet

                const rad = earthquakeRadius(q.mag, R, dpr);
                const color = earthquakeColor(q.mag);
                const major = q.mag >= 5;
                const lblSize = Math.max(9, Math.min(13 * dpr, rad * 1.5)); // zoom-normalised via rad
                const pulse = 0.5 + 0.5 * Math.sin(now / 1200 + q.lat * 2.3);

                ctx.save();
                // The strongest quakes glow harder so they stand out at a glance.
                ctx.shadowColor = color;
                ctx.shadowBlur = major ? rad * 0.9 : rad * 0.45;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(8, 20, 40, 0.5)';
                ctx.lineWidth = Math.max(1, dpr);
                ctx.stroke();

                // 🌊 USGS screened this event as a possible tsunami source.
                if (q.tsunami) {
                    ctx.strokeStyle = 'rgba(88, 208, 255, ' + (0.45 + 0.4 * pulse).toFixed(2) + ')';
                    ctx.lineWidth = Math.max(1.2, rad * 0.16);
                    ctx.setLineDash([Math.max(2, rad * 0.55), Math.max(2, rad * 0.45)]);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, rad * 1.9, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // The magnitude sits inside the circle.
                if (rad >= 6.5 * dpr) {
                    const magText = q.mag.toFixed(1);
                    ctx.font = '800 ' + Math.max(8, Math.round(rad * 0.92)) + 'px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineWidth = Math.max(1.5, rad * 0.16);
                    ctx.strokeStyle = 'rgba(6, 18, 38, 0.75)';
                    ctx.strokeText(magText, p.x, p.y + rad * 0.06);
                    ctx.fillStyle = '#f4faff';
                    ctx.fillText(magText, p.x, p.y + rad * 0.06);
                }
                ctx.restore();

                // The strong ones also get their place printed underneath.
                if (major) {
                    const place = String(q.place || 'Earthquake');
                    const label = place.length > 34 ? place.slice(0, 32) + '…' : place;
                    ctx.save();
                    ctx.font = '600 ' + Math.round(lblSize) + 'px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const labelY = p.y + rad + 3 * dpr;
                    if (!globeLabelAllowed(p.x, labelY, label, Math.round(lblSize))) { ctx.restore(); lastWeatherHits.push({ x: p.x, y: p.y, r: Math.max(rad * 1.6, 14 * dpr), label: 'M ' + q.mag.toFixed(1) + ' · ' + (q.place || 'earthquake'), lat: q.lat, lng: q.lng, type: 'quake' }); continue; } // 🏷️ no quake-name pile-up
                    ctx.lineWidth = Math.max(1.5, lblSize * 0.28);
                    ctx.strokeStyle = 'rgba(6, 18, 38, 0.8)';
                    ctx.strokeText(label, p.x, labelY);
                    ctx.fillStyle = 'rgba(255, 240, 214, 0.97)';
                    ctx.fillText(label, p.x, labelY);
                    ctx.restore();
                }

                lastWeatherHits.push({
                    x: p.x, y: p.y, r: Math.max(rad * 1.6, 14 * dpr),
                    label: 'M ' + q.mag.toFixed(1) + ' · ' + (q.place || 'earthquake'),
                    lat: q.lat, lng: q.lng, type: 'quake'
                });
            }
        }

        // ===== 🌋 Live volcanoes on the globe (NASA EONET) =====
        // Every volcano NASA EONET still lists as an open event — the eruptions
        // and unrest the Smithsonian Global Volcanism Program keeps reporting —
        // is drawn at its summit as a cone that ERUPTS: a pulsing crater glow,
        // molten streams creeping down the flanks, lava bombs flying out of the
        // vent on a ballistic arc and an ash plume drifting off the top.
        //
        // How violent the eruption looks follows the freshness of the last
        // report: activity from this month gets the full fountain, an event last
        // updated years ago only glows and fumes. The globe never invents a
        // volcano — no feed, no lava. Clicking a cone zooms into it.
        function volcanoEruptionIntensity(daysAgo) {
            if (!Number.isFinite(daysAgo)) return 0.4;
            if (daysAgo <= 30) return 1;      // reported this month → erupting now
            if (daysAgo <= 120) return 0.78;  // recent eruption
            if (daysAgo <= 400) return 0.56;  // ongoing unrest
            return 0.4;                       // long-running unrest / fumarole
        }

        function volcanoStageLabel(daysAgo) {
            if (!Number.isFinite(daysAgo)) return 'activity date unknown';
            if (daysAgo <= 30) return 'erupting — reported this month';
            if (daysAgo <= 120) return 'recent eruption';
            if (daysAgo <= 400) return 'ongoing unrest';
            return 'long-running unrest';
        }

        function volcanoDaysAgo(v) {
            if (!v || !Number.isFinite(v.epochMs)) return null;
            return (Date.now() - v.epochMs) / 86400000;
        }

        // Point on the quadratic Bézier p0 → control → p1, used for the molten
        // streams that run from the crater down the flank of the cone.
        function volcanoBezierPoint(x0, y0, x1, y1, x2, y2, t) {
            const mt = 1 - t;
            return {
                x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
                y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
            };
        }

        // ===== 🏜️ Saharan dust — the Saharan Air Layer on the globe =====
        // The keyless Open-Meteo air-quality model (CAMS) reports the mineral-dust
        // load of the air over the Sahara, the Sahel and the Atlantic outflow lanes
        // (see api/dust.js). Every reported cell is painted as a warm ochre veil
        // that drifts west — the direction the real plume travels with the trade
        // winds — so the globe shows one continuous tan band rather than a set of
        // dots. The haze is deliberately translucent: dust is an atmosphere, not a
        // marker, so the surface, the country borders and every weather chip have
        // to stay readable underneath it. Nothing here is clickable, and a cell is
        // only drawn once the model puts at least 30 µg/m³ of dust in the air.
        const DUST_TINT = {
            1: { core: 'rgba(228, 200, 140, ', mid: 'rgba(199, 162, 96, ', },
            2: { core: 'rgba(216, 176, 104, ', mid: 'rgba(181, 137, 66, ', },
            3: { core: 'rgba(200, 152, 74, ', mid: 'rgba(157, 110, 44, ', }
        };
        const DUST_HAZE_ALPHA = { 1: 0.20, 2: 0.34, 3: 0.48 }; // how opaque the veil may get

        // 🌪️ Sandstorms. The streak colour darkens with the modelled severity
        // (blowing dust → dust storm → severe dust storm), matching the ochre of
        // the haze underneath so the two layers read as one system.
        const SANDSTORM_SWIRL = {
            1: 'rgba(226, 197, 140, 0.9)',
            2: 'rgba(206, 164, 84, 0.95)',
            3: 'rgba(168, 116, 44, 1)'
        };
        // Mirrors SANDSTORM_MIN_WIND in api/dust.js — the wind below which dust
        // settles instead of being lifted, so no swirl is drawn. The API applies
        // the same cut before a cell is ever labelled a sandstorm; this constant
        // only decides how hard an already-qualified storm is driven.
        const SANDSTORM_MIN_WIND_KMH = 40;

        // 💨 Global wind. Barbs coloured by Beaufort so the planet reads calm →
        //   gale at a glance, and long enough to stay legible when zoomed out.
        const WIND_BARB_COLOR = [
            'rgba(190, 226, 255, 0.85)',   // 0–2  calm
            'rgba(150, 226, 190, 0.9)',    // 3    light breeze
            'rgba(214, 238, 132, 0.92)',   // 4–5  breeze / fresh breeze
            'rgba(255, 214, 110, 0.95)',   // 6    strong breeze
            'rgba(255, 160, 92, 0.97)',    // 7–8  near gale / gale
            'rgba(255, 106, 106, 1)'      // 9+   storm / violent storm
        ];
        // Barbs below this Beaufort are too weak to be worth a pin on a globe.
        const WIND_MIN_BEAUFORT = 2;
        const WIND_BEAUFORT_COLORS = [
            WIND_BARB_COLOR[0], WIND_BARB_COLOR[0], WIND_BARB_COLOR[0],
            WIND_BARB_COLOR[1], WIND_BARB_COLOR[2], WIND_BARB_COLOR[2],
            WIND_BARB_COLOR[3], WIND_BARB_COLOR[4], WIND_BARB_COLOR[4],
            WIND_BARB_COLOR[5], WIND_BARB_COLOR[5], WIND_BARB_COLOR[5], WIND_BARB_COLOR[5]
        ];

        function windBarbColor(beaufort) {
            const f = Math.round(clampGlobe(beaufort || 0, 0, 12));
            return WIND_BEAUFORT_COLORS[f] || WIND_BARB_COLOR[5];
        }

        // One arrow per grid square: a shaft with a head, pointing the way the air
        // is GOING (windDirectionDeg is the bearing it blows FROM). The barb grows
        // with the zoom so it never disappears, but only sub-linearly, so at 50×
        // the grid still reads as a field rather than a wall of arrows.
        function drawWindField(ctx, cx, cy, R, size) {
            if (globeLayerOn.wind === false) return;    // 💨 chip switched off
            if (!globeWind.length) return;              // feed down → no barbs
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const zoomScale = Math.min(2.6, 0.80 + Math.sqrt(Math.max(1, globeZoom)) * 0.20);

            for (let i = 0; i < globeWind.length; i += 1) {
                const point = globeWind[i];
                if (typeof point.lat !== 'number' || typeof point.lng !== 'number') continue;
                if ((point.beaufort || 0) < WIND_MIN_BEAUFORT) continue;
                const p = globePoint(point.lat, point.lng);
                if (!p) continue;                        // far side of the planet
                const limb = clampGlobe(p.z / 0.25, 0, 1);
                if (limb <= 0.02) continue;              // right on the horizon

                const track = sandstormTrackVector(point.directionDeg);
                const len = R * 0.055 * zoomScale / Math.max(1, globeZoom);
                const headLen = Math.max(4 * dpr, len * 0.42);
                const angle = Math.atan2(track.y, track.x);
                const tailX = p.x - track.x * len * 0.35;
                const tailY = p.y - track.y * len * 0.35;
                const tipX = p.x + track.x * len * 0.65;
                const tipY = p.y + track.y * len * 0.65;

                ctx.save();
                ctx.globalAlpha = limb * 0.9;
                ctx.strokeStyle = windBarbColor(point.beaufort);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = Math.max(1.4 * dpr, R * 0.004);
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
                // Arrow head, so it reads as travel and not as a plain stroke.
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headLen * Math.cos(angle - 0.5),
                    tipY - headLen * Math.sin(angle - 0.5));
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headLen * Math.cos(angle + 0.5),
                    tipY - headLen * Math.sin(angle + 0.5));
                ctx.stroke();
                // The knot: the station the arrow is measured at.
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(1.6 * dpr, R * 0.005), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        function drawSaharanDust(ctx, cx, cy, R, size) {
            if (globeLayerOn.dust === false) return;      // 🏜️ chip switched off
            if (!saharanDust.length) return;              // clean air → clean globe
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const zoomScale = Math.min(2.4, 0.84 + Math.sqrt(globeZoom) * 0.22);
            const markerCount = Math.min(saharanDust.length, 60);
            let labelX = 0, labelY = 0, labelTop = 0, drawn = 0, labelZ = 0;

            for (let i = 0; i < markerCount; i += 1) {
                const point = saharanDust[i];
                if (typeof point.lat !== 'number' || typeof point.lng !== 'number') continue;
                // Shift each cell a little downwind (west) and let that offset
                // breathe, so the haze reads as moving air and not a sticker.
                const seed = hashNoise(point.lat * 3.1, point.lng * 1.7);
                const drift = -1.9 + 1.1 * Math.sin(now / 9000 + seed * 12);
                const p = globePoint(point.lat, point.lng + drift);
                if (!p) continue;                          // far side of the planet
                const limb = clampGlobe(p.z / 0.25, 0, 1);
                if (limb <= 0.02) continue;                // right on the horizon

                const level = Math.round(clampGlobe(point.level, 1, 3));
                const strength = clampGlobe(0.4 + (Number.isFinite(point.score) ? point.score / 100 : 0.4), 0.4, 1);
                const pulse = 0.93 + 0.07 * Math.sin(now / 5200 + seed * 9);
                const rad = Math.max(16 * dpr,
                    R * (0.075 + 0.065 * strength) * zoomScale / Math.max(1, globeZoom) * pulse);
                const tint = DUST_TINT[level] || DUST_TINT[1];
                const alpha = DUST_HAZE_ALPHA[level] * limb * (0.55 + 0.45 * strength);

                ctx.save();
                const veil = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
                veil.addColorStop(0, tint.core + alpha.toFixed(3) + ')');
                veil.addColorStop(0.5, tint.mid + (alpha * 0.62).toFixed(3) + ')');
                veil.addColorStop(1, tint.mid + '0)');
                ctx.fillStyle = veil;
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
                ctx.fill();

                // A thin wind-streak through the thickest cells: the dust is being
                // carried west, and that motion is the whole point of the layer.
                if (level >= 2) {
                    ctx.globalAlpha = limb * 0.42;
                    ctx.strokeStyle = tint.mid + '0.75)';
                    ctx.lineWidth = Math.max(1 * dpr, rad * 0.05);
                    ctx.beginPath();
                    ctx.moveTo(p.x + rad * 0.15, p.y - rad * 0.22);
                    ctx.quadraticCurveTo(p.x - rad * 0.6, p.y - rad * 0.42, p.x - rad * 1.25, p.y - rad * 0.3);
                    ctx.stroke();
                }
                ctx.restore();

                drawn += 1;
                if (p.z > labelZ) { labelZ = p.z; labelX = p.x; labelY = p.y; labelTop = rad; }
            }

            // One shaded name over the thickest part of the plume, so the tan band
            // is never a mystery. Only while a good slice of it faces the viewer.
            if (drawn >= 3 && labelZ > 0.3) {
                const peak = saharanDust[0] && Number.isFinite(saharanDust[0].dustUgm3) ? saharanDust[0].dustUgm3 : '';
                const text = '🏜️ Saharan dust · ' + peak + ' µg/m³ peak';
                ctx.save();
                ctx.globalAlpha = clampGlobe(labelZ / 0.5, 0, 1) * 0.95;
                ctx.font = '800 ' + Math.max(11, Math.round(labelTop * 0.5)) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineJoin = 'round';
                ctx.lineWidth = Math.max(3, labelTop * 0.16);
                // Lift the name clear of the haze itself (and of the wildfire /
                // volcano names, which hug their own markers at the same latitude).
                const labelCY = labelY - labelTop * 1.5;
                // A feathered dark-ochre plate behind it, so the pale gold stays
                // readable over bright NASA imagery and over neighbouring labels.
                const halfW = Math.max(60, ctx.measureText(text).width / 2 + labelTop * 0.7);
                const plateH = Math.max(15, Math.round(labelTop * 0.62));
                ctx.save();
                ctx.translate(labelX, labelCY);
                ctx.scale(1, plateH / halfW);
                const plate = ctx.createRadialGradient(0, 0, 0, 0, 0, halfW);
                plate.addColorStop(0, 'rgba(30, 17, 3, 0.78)');
                plate.addColorStop(0.7, 'rgba(30, 17, 3, 0.62)');
                plate.addColorStop(1, 'rgba(30, 17, 3, 0)');
                ctx.fillStyle = plate;
                ctx.beginPath();
                ctx.arc(0, 0, halfW, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
                ctx.strokeStyle = 'rgba(48, 26, 4, 0.92)';
                ctx.fillStyle = 'rgba(255, 228, 164, 0.98)';
                ctx.strokeText(text, labelX, labelCY);
                ctx.fillText(text, labelX, labelCY);
                ctx.restore();
            }
        }

        // 🌪️ Sandstorms — the DUST+WIND layer. A sandstorm is not drawn from a
        // fixed list of regions and not on a timer: the swirl only appears where
        // the modelled dust load is thick AND the modelled wind is strong enough
        // to lift it (the API's `sandstormLevel`). With no wind data the whole
        // layer stays silent, because the second half of the evidence is missing.
        // Each swirl is stretched along the real wind bearing so the storms visibly
        // stream downwind instead of spinning in place.
        function drawSandstorms(ctx, cx, cy, R, size) {
            if (globeLayerOn.sandstorm === false) return;   // 🌪️ chip switched off
            if (!saharanDust.length) return;               // no dust → no sandstorm
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const zoomScale = Math.min(2.4, 0.84 + Math.sqrt(globeZoom) * 0.22);
            // Only the worst handful, so a busy dust belt does not turn the whole
            // Sahara into a spinning blur.
            const stormy = saharanDust.filter((p) => (p.sandstormLevel || 0) > 0)
                .sort((a, b) => (b.sandstormLevel - a.sandstormLevel) ||
                    ((b.windGustKmh ?? 0) - (a.windGustKmh ?? 0)))
                .slice(0, 14);
            if (!stormy.length) return;
            // Boxes already carrying a readout, so a dense belt does not stack its
            // own numbers on top of each other.
            const placed = [];

            for (let i = 0; i < stormy.length; i += 1) {
                const point = stormy[i];
                if (typeof point.lat !== 'number' || typeof point.lng !== 'number') continue;
                const p = globePoint(point.lat, point.lng);
                if (!p) continue;                           // far side of the planet
                const limb = clampGlobe(p.z / 0.25, 0, 1);
                if (limb <= 0.02) continue;                 // right on the horizon

                const level = Math.round(clampGlobe(point.sandstormLevel, 1, 3));
                const seed = hashNoise(point.lat * 2.3, point.lng * 1.9);
                // Swirl faster and wider the stronger the wind behind it.
                const gust = Number.isFinite(point.windGustKmh) ? point.windGustKmh : 40;
                const drive = clampGlobe((gust - SANDSTORM_MIN_WIND_KMH) / 60, 0, 1);
                const rad = Math.max(10 * dpr,
                    R * (0.045 + 0.045 * drive) * zoomScale / Math.max(1, globeZoom));
                // Where this dust is actually GOING. windDirectionDeg is the bearing
                // the wind blows FROM, so the storm heads the opposite way — drawing
                // the FROM bearing would point every storm back at its own source.
                const track = sandstormTrackVector(point.windDirectionDeg);
                const trackRad = track.bearingTo * Math.PI / 180;
                const phase = now / (2600 - 1100 * drive) + seed * 9;

                ctx.save();
                ctx.translate(p.x, p.y);
                // Lay the swirl's long axis ALONG the track. Rotating by the raw
                // bearing left the "wall" of dust broadside to its own travel.
                ctx.rotate(trackRad - Math.PI / 2);
                ctx.scale(1.9, 0.85);   // stretched downwind: a wall, not a dot

                // Three nested rotating arcs, phase-shifted per cell.
                ctx.strokeStyle = SANDSTORM_SWIRL[level] || SANDSTORM_SWIRL[1];
                ctx.lineCap = 'round';
                for (let ring = 0; ring < 3; ring += 1) {
                    const rr = rad * (0.42 + ring * 0.29);
                    const spin = phase * (ring % 2 ? -0.75 : 1) + ring * 1.9 + seed * 4;
                    ctx.globalAlpha = limb * (0.5 - ring * 0.13) * (0.55 + 0.45 * drive);
                    ctx.lineWidth = Math.max(1 * dpr, rad * (0.15 - ring * 0.03));
                    ctx.beginPath();
                    // A three-quarter arc, so it reads as a rotating gust.
                    ctx.arc(0, 0, rr, spin, spin + Math.PI * 1.55);
                    ctx.stroke();
                }
                ctx.restore();

                // ---- the two things that matter: how fast, and which way ----------
                // A shaft with a real arrowhead along the true track, so the storm
                // reads as travelling rather than merely spinning in place.
                const tint = SANDSTORM_SWIRL[level] || SANDSTORM_SWIRL[1];
                const shaftLen = rad * 1.8;
                const tipX = p.x + track.x * shaftLen;
                const tipY = p.y + track.y * shaftLen;
                const arrowAngle = Math.atan2(track.y, track.x);
                ctx.save();
                ctx.globalAlpha = limb * 0.85;
                ctx.strokeStyle = tint;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = Math.max(1.2 * dpr, rad * 0.1);
                ctx.beginPath();
                ctx.moveTo(p.x + track.x * rad * 0.85, p.y + track.y * rad * 0.85);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
                // The head, so the arrow has a direction rather than being a streak.
                const headLen = Math.max(5 * dpr, rad * 0.46);
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headLen * Math.cos(arrowAngle - 0.42),
                    tipY - headLen * Math.sin(arrowAngle - 0.42));
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headLen * Math.cos(arrowAngle + 0.42),
                    tipY - headLen * Math.sin(arrowAngle + 0.42));
                ctx.stroke();
                ctx.restore();

                // The readout: wind speed plus the compass point the dust is heading
                // for. Skipped when it would collide with a storm already labelled,
                // so the worst cell (sorted first) always keeps its own readout.
                const speedKmh = Number.isFinite(point.windKmh) ? point.windKmh : gust;
                const text = Math.round(speedKmh) + ' km/h → ' +
                    cardinalTo(point.windDirectionDeg);
                const fontPx = Math.max(10, Math.round(rad * 0.52));
                ctx.save();
                ctx.globalAlpha = limb * 0.95;
                ctx.font = '800 ' + fontPx + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const halfW = ctx.measureText(text).width / 2 + fontPx * 0.5;
                const labelX = p.x + track.x * (shaftLen + rad * 0.9);
                const labelY = p.y + track.y * (shaftLen + rad * 0.9);
                const clash = placed.some((b) =>
                    Math.abs(b.x - labelX) < b.halfW + halfW &&
                    Math.abs(b.y - labelY) < fontPx * 1.2);
                if (!clash) {
                    placed.push({ x: labelX, y: labelY, halfW });
                    // Same dark-ochre outline and pale-gold fill as the dust plume
                    // name, so both readouts read as part of the same layer.
                    ctx.lineJoin = 'round';
                    ctx.lineWidth = Math.max(3, fontPx * 0.3);
                    ctx.strokeStyle = 'rgba(48, 26, 4, 0.92)';
                    ctx.fillStyle = 'rgba(255, 228, 164, 0.98)';
                    ctx.strokeText(text, labelX, labelY);
                    ctx.fillText(text, labelX, labelY);
                }
                ctx.restore();
            }
        }

        function drawLiveVolcanoes(ctx, cx, cy, R, size) {
            if (globeLayerOn.volcano === false) return; // 🌋 chip switched off
            if (!liveVolcanoes.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            // Cones grow with the zoom so a volcano stays clickable when the user
            // flies into a region, but sub-linearly — never hiding the planet at 50×.
            const zoomScale = Math.min(2.6, 0.72 + Math.sqrt(globeZoom) * 0.30);

            for (let vi = 0; vi < liveVolcanoes.length; vi += 1) {
                const v = liveVolcanoes[vi];
                if (typeof v.lat !== 'number' || typeof v.lng !== 'number') continue;
                const p = globePoint(v.lat, v.lng);
                if (!p) continue;                        // far side of the planet
                const limb = clampGlobe(p.z / 0.22, 0, 1);
                if (limb <= 0.02) continue;              // right on the horizon

                const daysAgo = volcanoDaysAgo(v);
                const vigour = volcanoEruptionIntensity(daysAgo);
                // Lava and smoke are ALWAYS present on a volcano — report age
                // only modulates how violent the eruption looks, it never
                // removes it. The live EONET feed's freshest open event can be
                // months old, which dropped every alpha below to ~40 % and made
                // each cone read as a bare triangle with a name. `ember` floors
                // that intensity for the cosmetics (lava, glow, ash) while the
                // geometry keeps the true vigour, so fresher still erupts harder.
                const ember = Math.max(0.7, vigour);
                const seed = hashNoise(v.lat * 1.7, v.lng * 2.3);
                // R grows with the zoom, so normalise it back out: the cone keeps a
                // constant device size, growing only via the sub-linear zoomScale.
                // The size floor only varies a little with the report age — lava and
                // smoke are always present on a volcano, so the marker never shrinks
                // to a bare dot just because the last report is years old.
                const base = Math.max(3.2 * dpr, R * (0.020 + 0.006 * vigour) * zoomScale / Math.max(1, globeZoom));
                const coneH = base * (2 + 0.9 * vigour);
                // A volcano sits ON the sphere, so its cone points radially away
                // from the planet centre — straight out of the ground under it.
                // When the camera looks straight down the volcano (the point sits on
                // the disc centre) that screen-space vector collapses to (0, 0) and
                // the cone, its lava streams and its plume would degenerate into a
                // single pixel — fall back to "up" so the eruption still reads.
                const outLen = Math.hypot(p.x - cx, p.y - cy);
                let nx, ny;
                if (outLen > 1e-6) {
                    nx = (p.x - cx) / outLen;
                    ny = (p.y - cy) / outLen;
                } else {
                    nx = 0;
                    ny = -1;
                }
                const tx = -ny, ty = nx;                  // along the flank
                const craterX = p.x + nx * coneH;
                const craterY = p.y + ny * coneH;
                const flicker = 0.84 + 0.16 * Math.sin(now / 210 + seed * 37);

                ctx.save();
                ctx.globalAlpha = limb;

                // ---- 🌫️ ash and steam plume (drawn first: the cone covers its base)
                // The plume has to stay visible at full-planet zoom, where the cone
                // itself is only a few device pixels tall — so the puffs are drawn
                // wide and bright (a 0.22-alpha haze simply vanished next to the
                // tan Saharan-dust layer and the bright NASA imagery behind it).
                for (let k = 0; k < 3; k += 1) {
                    const t = 0.28 + k * 0.34;
                    const puffR = base * (0.95 + 1.75 * t) * (0.85 + 0.15 * flicker);
                    const drift = Math.sin(now / 2600 + seed * 11 + k) * base * 1.35 + base * 0.7;
                    const puffX = craterX + nx * coneH * (0.3 + 1.4 * t) + tx * drift;
                    const puffY = craterY + ny * coneH * (0.3 + 1.4 * t) + ty * drift;
                    const alpha = (0.62 - 0.13 * k) * (0.45 + 0.55 * ember);
                    const ash = ctx.createRadialGradient(puffX, puffY, 0, puffX, puffY, puffR);
                    ash.addColorStop(0, 'rgba(244, 241, 239, ' + alpha.toFixed(3) + ')');
                    ash.addColorStop(0.45, 'rgba(188, 184, 188, ' + (alpha * 0.78).toFixed(3) + ')');
                    ash.addColorStop(0.75, 'rgba(150, 145, 152, ' + (alpha * 0.36).toFixed(3) + ')');
                    ash.addColorStop(1, 'rgba(132, 127, 136, 0)');
                    ctx.fillStyle = ash;
                    ctx.beginPath();
                    ctx.arc(puffX, puffY, puffR, 0, 2 * Math.PI);
                    ctx.fill();
                }

                // ---- 🔥 heat halo: the ground around the vent glows red-hot
                const haloR = base * (3.1 + 1.2 * vigour) * (0.9 + 0.1 * flicker);
                const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
                halo.addColorStop(0, 'rgba(255, 158, 48, ' + (0.30 * ember).toFixed(3) + ')');
                halo.addColorStop(0.42, 'rgba(255, 104, 20, ' + (0.15 * ember).toFixed(3) + ')');
                halo.addColorStop(1, 'rgba(255, 80, 0, 0)');
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(p.x, p.y, haloR, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';

                // ---- 🪨 the cone itself: dark basalt with a molten crater on top
                const rock = ctx.createLinearGradient(p.x, p.y, craterX, craterY);
                rock.addColorStop(0, 'rgba(58, 48, 52, 0.95)');
                rock.addColorStop(0.55, 'rgba(92, 56, 46, 0.96)');
                rock.addColorStop(0.85, 'rgba(164, 68, 26, 0.97)');
                rock.addColorStop(1, 'rgba(255, 178, 70, 1)');
                ctx.fillStyle = rock;
                ctx.beginPath();
                ctx.moveTo(p.x + tx * base, p.y + ty * base);
                ctx.lineTo(p.x - tx * base, p.y - ty * base);
                ctx.lineTo(craterX, craterY);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(12, 10, 14, 0.5)';
                ctx.lineWidth = Math.max(0.8, base * 0.16);
                ctx.stroke();

                // The crater mouth: a dark ellipse across the summit, so the vent
                // reads as a hole rather than a point.
                const mouthR = base * (0.62 + 0.12 * flicker);
                ctx.save();
                ctx.translate(craterX, craterY);
                ctx.rotate(Math.atan2(ny, nx) + Math.PI / 2);
                ctx.fillStyle = 'rgba(26, 19, 22, 0.95)';
                ctx.beginPath();
                ctx.ellipse(0, 0, mouthR * 1.25, mouthR * 0.6, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();

                // The glow rising out of the vent (additive, so it looks emissive).
                const bloomR = base * (1.5 + 0.5 * vigour);
                ctx.globalCompositeOperation = 'lighter';
                const bloom = ctx.createRadialGradient(craterX, craterY, 0, craterX, craterY, bloomR);
                bloom.addColorStop(0, 'rgba(255, 252, 224, ' + (0.85 * flicker).toFixed(3) + ')');
                bloom.addColorStop(0.35, 'rgba(255, 186, 54, ' + (0.7 * ember * flicker).toFixed(3) + ')');
                bloom.addColorStop(1, 'rgba(255, 96, 0, 0)');
                ctx.fillStyle = bloom;
                ctx.beginPath();
                ctx.arc(craterX, craterY, bloomR, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';

                // ---- 🌋 molten streams down both flanks, each with a glowing blob
                //      crawling downhill — a lava flow in progress.
                for (let side = -1; side <= 1; side += 2) {
                    const flowX = p.x + tx * base * 0.72 * side;
                    const flowY = p.y + ty * base * 0.72 * side;
                    const ctrlX = craterX + tx * base * 0.5 * side + nx * base * 0.2;
                    const ctrlY = craterY + ty * base * 0.5 * side + ny * base * 0.2;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = 'rgba(255, 118, 22, ' + (0.45 + 0.35 * ember).toFixed(2) + ')';
                    ctx.lineWidth = Math.max(1, base * 0.22);
                    ctx.beginPath();
                    ctx.moveTo(craterX, craterY);
                    ctx.quadraticCurveTo(ctrlX, ctrlY, flowX, flowY);
                    ctx.stroke();

                    const tp = (((now / (2400 - 800 * vigour) + side * 0.37 + seed) % 1) + 1) % 1;
                    const blob = volcanoBezierPoint(craterX, craterY, ctrlX, ctrlY, flowX, flowY, tp);
                    const blobR = Math.max(0.9 * dpr, base * (0.3 - 0.1 * tp));
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.shadowColor = 'rgba(255, 120, 24, 0.95)';
                    ctx.shadowBlur = blobR * 2.4;
                    ctx.fillStyle = 'rgba(255, ' + Math.round(218 - 96 * tp) + ', 64, ' + (0.95 - 0.5 * tp).toFixed(2) + ')';
                    ctx.beginPath();
                    ctx.arc(blob.x, blob.y, blobR, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.globalCompositeOperation = 'source-over';
                }

                // ---- 💥 the lava fountain: bombs thrown out of the vent on a
                //      ballistic arc (rising, peaking, falling) that cool from
                //      white-hot to deep red as they fly.
                const bombs = Math.round(6 + 8 * ember);
                const flight = 1150 - 420 * vigour;               // ms for one full arc
                const arcH = coneH * (0.9 + 0.9 * ember);
                const spread = base * (1.5 + 1.4 * ember);
                ctx.globalCompositeOperation = 'lighter';
                for (let b = 0; b < bombs; b += 1) {
                    const jitter = hashNoise(b * 3.7 + 1.3, seed * 29);
                    const t = ((now / (flight * (0.75 + 0.5 * jitter)) + hashNoise(b * 5.1, seed * 13)) % 1 + 1) % 1;
                    const lift = 4 * t * (1 - t);                  // 0 → apex → 0
                    const along = (hashNoise(b * 7.3, seed * 7) - 0.5) * 2.4 * t;
                    const bombX = craterX + tx * spread * along + nx * arcH * lift;
                    const bombY = craterY + ty * spread * along + ny * arcH * lift;
                    let colour = '214, 48, 14';                    // falling, nearly crusted
                    if (t < 0.18) colour = '255, 250, 224';        // just launched
                    else if (t < 0.45) colour = '255, 208, 96';
                    else if (t < 0.72) colour = '255, 132, 32';
                    const alpha = ember * (1 - Math.max(0, (t - 0.78) / 0.22)) * (0.7 + 0.3 * flicker);
                    const bombR = Math.max(0.8 * dpr, base * (0.3 - 0.16 * t) * (0.8 + 0.5 * jitter));
                    ctx.fillStyle = 'rgba(' + colour + ', ' + alpha.toFixed(2) + ')';
                    ctx.beginPath();
                    ctx.arc(bombX, bombY, bombR, 0, 2 * Math.PI);
                    ctx.fill();
                }
                ctx.globalCompositeOperation = 'source-over';

                // ---- 🏷️ name (+ area) under the cone: always for a volcano erupting
                //      right now, always for the three freshest reports (so the
                //      whole-planet view still names something), otherwise as soon as
                //      the user zooms in — the planet never becomes a wall of labels.
                { const label = v.country ? v.name + ', ' + v.country : v.name;
                    const vPx = Math.max(9, Math.round(base * 2.1));
                    const vShow = (globeZoom >= 1.25 || vigour >= 1 || vi < 3) && globeLabelAllowed(p.x + nx * (coneH + 8 * dpr), p.y + ny * (coneH + 8 * dpr), label, vPx);
                    if (vShow) {
                    ctx.font = '700 ' + Math.max(9, Math.round(base * 2.1)) + 'px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    // Anchor just past the crater, along the outward normal, so the
                    // name never lands on top of the cone or its lava.
                    const labelX = p.x + nx * (coneH + 8 * dpr);
                    const labelY = p.y + ny * (coneH + 8 * dpr);
                    ctx.lineWidth = Math.max(1.5, base * 0.45);
                    ctx.strokeStyle = 'rgba(6, 18, 38, 0.85)';
                    ctx.strokeText(label, labelX, labelY);
                    ctx.fillStyle = 'rgba(255, 228, 192, 0.98)';
                    ctx.fillText(label, labelX, labelY);
                    } }

                ctx.restore();

                // The whole cone is one click target: tapping it flies the camera in.
                lastWeatherHits.push({
                    x: p.x, y: p.y, r: Math.max(base * 3.2, 16 * dpr),
                    label: v.name + ' volcano',
                    lat: v.lat, lng: v.lng, type: 'volcano'
                });
            }
        }

        // ===== 🔥 Active forest fires (NASA EONET) =====
        // Open EONET incidents become animated flames at their latest reported
        // point. Fresh reports glow more strongly; every flame is clickable.
        function drawLiveFires(ctx, cx, cy, R, size) {
            if (globeLayerOn.fires === false || !liveFires.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const zoomScale = Math.min(2.4, 0.82 + Math.sqrt(globeZoom) * 0.24); // sub-linear: flames stay small at 50×
            const markerCount = Math.min(liveFires.length, 100);
            for (let fi = 0; fi < markerCount; fi += 1) {
                const fire = liveFires[fi];
                if (typeof fire.lat !== 'number' || typeof fire.lng !== 'number') continue;
                const p = globePoint(fire.lat, fire.lng);
                if (!p) continue;
                const limb = clampGlobe(p.z / 0.22, 0, 1);
                if (limb <= 0.02) continue;
                const ageDays = Number.isFinite(fire.epochMs)
                    ? Math.max(0, (Date.now() - fire.epochMs) / 86400000) : 30;
                const freshness = clampGlobe(1 - ageDays / 30, 0.28, 1);
                const seed = hashNoise(fire.lat * 2.7 + fi, fire.lng * 1.9 - fi);
                const flicker = 0.84 + 0.16 * Math.sin(now / (145 + seed * 70) + seed * 41);
                // R scales with the zoom: divide it back out so flames keep a constant
                // device size (growing only via the sub-linear zoomScale).
                const flameH = Math.max(9 * dpr, R * (0.028 + 0.018 * freshness) * zoomScale / Math.max(1, globeZoom));
                const flameW = flameH * (0.56 + 0.08 * seed);
                const sway = Math.sin(now / 260 + seed * 29) * flameW * 0.10;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.globalAlpha = limb * (0.72 + 0.28 * freshness);

                // Hot pool of light on the ground.
                const glowR = flameH * (2.3 + 0.7 * freshness);
                const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
                glow.addColorStop(0, 'rgba(255, 242, 170, ' + (0.74 * freshness).toFixed(3) + ')');
                glow.addColorStop(0.28, 'rgba(255, 132, 24, ' + (0.48 * freshness).toFixed(3) + ')');
                glow.addColorStop(0.62, 'rgba(239, 55, 8, ' + (0.20 * freshness).toFixed(3) + ')');
                glow.addColorStop(1, 'rgba(180, 20, 0, 0)');
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(0, 0, glowR, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';

                // Teardrop outer flame with a leaning, animated tip.
                const outer = ctx.createLinearGradient(0, flameH * 0.45, 0, -flameH);
                outer.addColorStop(0, 'rgba(211, 32, 5, 0.98)');
                outer.addColorStop(0.48, 'rgba(255, 86, 12, 0.98)');
                outer.addColorStop(1, 'rgba(255, 198, 55, 0.96)');
                ctx.fillStyle = outer;
                ctx.beginPath();
                ctx.moveTo(0, flameH * 0.48);
                ctx.bezierCurveTo(-flameW * 0.78, flameH * 0.18, -flameW * 0.46, -flameH * 0.34, sway, -flameH);
                ctx.bezierCurveTo(flameW * 0.20, -flameH * 0.58, flameW * 0.68, -flameH * 0.28, flameW * 0.58, flameH * 0.10);
                ctx.bezierCurveTo(flameW * 0.48, flameH * 0.35, flameW * 0.20, flameH * 0.47, 0, flameH * 0.48);
                ctx.closePath();
                ctx.fill();

                // Bright inner core stays flame-shaped at full-planet scale.
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(255, 250, 205, ' + (0.78 + 0.20 * flicker).toFixed(3) + ')';
                ctx.beginPath();
                ctx.moveTo(0, flameH * 0.31);
                ctx.bezierCurveTo(-flameW * 0.27, flameH * 0.08, -flameW * 0.15, -flameH * 0.25, sway * 0.45, -flameH * 0.58);
                ctx.bezierCurveTo(flameW * 0.31, -flameH * 0.18, flameW * 0.24, flameH * 0.10, 0, flameH * 0.31);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';

                // A few sparks lift from fresh incidents.
                if (freshness > 0.62) {
                    for (let spark = 0; spark < 3; spark += 1) {
                        const phase = ((now / (900 + spark * 170) + seed * (spark + 1)) % 1 + 1) % 1;
                        const sx = Math.sin(seed * 17 + spark * 2.1) * flameW * (0.45 + phase * 0.55);
                        const sy = flameH * 0.25 - phase * flameH * 1.8;
                        ctx.globalAlpha = limb * (1 - phase) * 0.8;
                        ctx.fillStyle = spark % 2 ? '#ffd45a' : '#ff7a18';
                        ctx.beginPath();
                        ctx.arc(sx, sy, Math.max(0.8 * dpr, flameW * 0.07 * (1 - phase)), 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
                ctx.restore();

                // Label the newest few globally; zoom in to reveal the rest.
                // Font follows the flame size (zoom-normalised) — never R, which would
                // explode into giant text at 50×.
                if ((globeZoom >= 1.3 || fi < 4) && globeLabelAllowed(p.x, p.y + flameH * 0.70, fire.name, Math.max(9, Math.round(flameH * 0.95)))) { // 🏷️ no fire-name pile-up
                    ctx.save();
                    ctx.font = '700 ' + Math.max(9, Math.round(flameH * 0.95)) + 'px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.lineWidth = Math.max(1.5, flameH * 0.22);
                    ctx.strokeStyle = 'rgba(6, 18, 38, 0.92)';
                    ctx.strokeText(fire.name, p.x, p.y + flameH * 0.70);
                    ctx.fillStyle = 'rgba(255, 226, 178, 0.98)';
                    ctx.fillText(fire.name, p.x, p.y + flameH * 0.70);
                    ctx.restore();
                }

                lastWeatherHits.push({
                    x: p.x, y: p.y - flameH * 0.18, r: Math.max(flameH * 1.35, 17 * dpr),
                    label: fire.name + ' wildfire', lat: fire.lat, lng: fire.lng, type: 'fires'
                });
            }
        }

        // ===== 🪨 Mudslides & landslides on the globe =====
        // Two things share this one chip:
        //   • the observed NASA EONET reports → a luminous fluorescent GREEN
        //     circle marking where it happened that is clickable, and
        //   • the modelled rain-triggered slope risk → soft green halos, drawn
        //     UNDER the markers and deliberately NOT clickable: a halo is an
        //     estimate, so it must never look like an event you can open.
        const LANDSLIDE_RISK_COLOR = {
            1: 'rgba(120, 235, 150, 0.50)',
            2: 'rgba(74, 220, 110, 0.60)',
            3: 'rgba(20, 200, 74, 0.70)'
        };

        // ===== Luminous fluorescent markers =====
        // The 🪨 mudslide (GREEN) and 🏔️ avalanche (BLUE) globe markers are drawn
        // as ONE bright glowing disc — a fluorescent core, an additive soft halo
        // and a crisp white rim — so each event reads instantly on land and ocean.
        const LUMINOUS_MARKER = {
            mud: {
                core: '#4dff72',                        // luminous fluorescent green
                mid: 'rgba(0, 224, 74, 0.96)',
                glow: 'rgba(40, 255, 110, 0.85)',
                glowFade: 'rgba(40, 255, 110, 0.34)',
                glowOut: 'rgba(40, 255, 110, 0)'
            },
            snow: {
                core: '#5cc8ff',                        // luminous fluorescent blue
                mid: 'rgba(10, 141, 255, 0.96)',
                glow: 'rgba(70, 175, 255, 0.85)',
                glowFade: 'rgba(70, 175, 255, 0.34)',
                glowOut: 'rgba(70, 175, 255, 0)'
            }
        };

        function drawLuminousCircle(ctx, x, y, rad, dpr, palette, alpha) {
            // Soft fluorescent halo (additive, so it truly looks like it emits light).
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = 'lighter';
            const glowR = rad * 2.6;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            glow.addColorStop(0, palette.glow);
            glow.addColorStop(0.45, palette.glowFade);
            glow.addColorStop(1, palette.glowOut);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();

            // Bright neon core, with a dark halo underneath for contrast.
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = Math.max(4 * dpr, rad * 0.5);
            const disc = ctx.createRadialGradient(x, y - rad * 0.28, 0, x, y, rad);
            disc.addColorStop(0, '#ffffff');
            disc.addColorStop(0.35, palette.core);
            disc.addColorStop(1, palette.mid);
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, 2 * Math.PI);
            ctx.fillStyle = disc;
            ctx.fill();
            ctx.restore();

            // Crisp white rim keeps the circle legible on bright ice and dark ocean.
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.lineWidth = Math.max(1.6 * dpr, rad * 0.16);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();
        }

        function drawLandslideRisk(ctx, cx, cy, R, size) {
            if (globeLayerOn.landslide === false || !landslideRisk.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const zoomScale = Math.min(2.2, 0.8 + Math.sqrt(globeZoom) * 0.22);
            const markerCount = Math.min(landslideRisk.length, 60);
            for (let i = 0; i < markerCount; i += 1) {
                const slope = landslideRisk[i];
                if (typeof slope.lat !== 'number' || typeof slope.lng !== 'number') continue;
                const p = globePoint(slope.lat, slope.lng);
                if (!p) continue;
                const limb = clampGlobe(p.z / 0.22, 0, 1);
                if (limb <= 0.02) continue;
                const strength = clampGlobe(slope.score / 100, 0.1, 1);
                const colour = LANDSLIDE_RISK_COLOR[Math.round(clampGlobe(slope.level, 1, 3))] || LANDSLIDE_RISK_COLOR[1];
                const seed = hashNoise(slope.lat * 3.1 + i, slope.lng * 1.7 - i);
                const breathe = 0.86 + 0.14 * Math.sin(now / (900 + seed * 420) + seed * 27);
                const rad = Math.max(10 * dpr,
                    R * (0.030 + 0.045 * strength) * zoomScale / Math.max(1, globeZoom) * breathe);

                ctx.save();
                ctx.globalAlpha = limb * (0.34 + 0.40 * strength);
                const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
                halo.addColorStop(0, colour);
                halo.addColorStop(0.45, colour.replace(/[\d.]+\)$/, '0.28)'));
                halo.addColorStop(1, 'rgba(30, 200, 90, 0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
                ctx.fill();

                // Two slow ground rings: saturated soil creeping outward, not exploding.
                ctx.strokeStyle = 'rgba(74, 220, 110, 0.6)';
                for (let ring = 0; ring < 2; ring += 1) {
                    const phase = (now / (2600 + ring * 900) + seed + ring * 0.5) % 1;
                    ctx.globalAlpha = limb * (1 - phase) * 0.5;
                    ctx.lineWidth = Math.max(0.9 * dpr, rad * 0.05);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, rad * (0.35 + 0.65 * phase), 0, 2 * Math.PI);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        function drawLiveMudslides(ctx, cx, cy, R, size) {
            if (globeLayerOn.landslide === false || !liveLandslides.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const zoomScale = Math.min(2.4, 0.82 + Math.sqrt(globeZoom) * 0.24);
            const markerCount = Math.min(liveLandslides.length, 60);
            for (let i = 0; i < markerCount; i += 1) {
                const slide = liveLandslides[i];
                if (typeof slide.lat !== 'number' || typeof slide.lng !== 'number') continue;
                const p = globePoint(slide.lat, slide.lng);
                if (!p) continue;
                const limb = clampGlobe(p.z / 0.22, 0, 1);
                if (limb <= 0.02) continue;
                const ageDays = Number.isFinite(slide.epochMs)
                    ? Math.max(0, (Date.now() - slide.epochMs) / 86400000) : 90;
                const freshness = clampGlobe(1 - ageDays / 60, 0.35, 1);
                const seed = hashNoise(slide.lat * 2.3 + i, slide.lng * 1.3 - i);
                const h = Math.max(15 * dpr,
                    R * (0.042 + 0.020 * freshness) * zoomScale / Math.max(1, globeZoom));

                // Luminous fluorescent GREEN circle marking where the slide happened.
                // (A gentle breathe makes the glow feel alive; `seed` keeps each
                //  marker's pulse out of step with its neighbours.)
                const breathe = 0.92 + 0.08 * Math.sin(now / (1000 + seed * 400) + seed * 20);
                drawLuminousCircle(ctx, p.x, p.y, h * breathe, dpr, LUMINOUS_MARKER.mud, limb);

                // Name the newest reports; zoom in to read the rest.
                if (globeZoom >= 1.3 || i < 4) {
                    ctx.save();
                    ctx.font = '700 ' + Math.max(9, Math.round(h * 0.95)) + 'px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.lineWidth = Math.max(1.5, h * 0.22);
                    ctx.strokeStyle = 'rgba(6, 18, 38, 0.92)';
                    ctx.strokeText(slide.name, p.x, p.y + h * 1.05);
                    ctx.fillStyle = 'rgba(255, 226, 190, 0.98)';
                    ctx.fillText(slide.name, p.x, p.y + h * 1.05);
                    ctx.restore();
                }

                lastWeatherHits.push({
                    x: p.x, y: p.y, r: Math.max(h * 1.9, 20 * dpr),
                    label: slide.name + ' ' + (slide.hazard === 'mudslide' ? 'mudslide' : 'landslide'),
                    lat: slide.lat, lng: slide.lng, type: 'landslide'
                });
            }
        }


        // ===== 🏔️ Snow avalanches on the globe =====
        // Same split as the mudslide layer: the official Avalanche.org zones draw
        // as a luminous fluorescent BLUE circle (with the published danger number
        // inside) and are clickable, while the modelled snow-load estimate draws
        // as a soft icy halo and is deliberately not clickable.
        // The official 1–5 danger palette below mirrors the tags in the side panel.
        const AVALANCHE_DANGER_COLOR = {
            1: 'rgba(52, 176, 108, 0.95)',   // Low
            2: 'rgba(238, 206, 74, 0.95)',   // Moderate
            3: 'rgba(236, 148, 42, 0.95)',   // Considerable
            4: 'rgba(216, 58, 36, 0.95)',    // High
            5: 'rgba(140, 24, 32, 0.98)'     // Extreme
        };
        const AVALANCHE_DANGER_LABEL = { 1: 'Low', 2: 'Moderate', 3: 'Considerable', 4: 'High', 5: 'Extreme' };
        const AVALANCHE_RISK_COLOR = {
            1: 'rgba(206, 232, 255, 0.45)',
            2: 'rgba(178, 218, 255, 0.58)',
            3: 'rgba(142, 198, 255, 0.70)'
        };

        function drawAvalancheRisk(ctx, cx, cy, R, size) {
            if (globeLayerOn.avalanche === false || !avalancheRisk.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const zoomScale = Math.min(2.2, 0.8 + Math.sqrt(globeZoom) * 0.22);
            const markerCount = Math.min(avalancheRisk.length, 60);
            for (let i = 0; i < markerCount; i += 1) {
                const massif = avalancheRisk[i];
                if (typeof massif.lat !== 'number' || typeof massif.lng !== 'number') continue;
                const p = globePoint(massif.lat, massif.lng);
                if (!p) continue;
                const limb = clampGlobe(p.z / 0.22, 0, 1);
                if (limb <= 0.02) continue;
                const strength = clampGlobe(massif.score / 100, 0.1, 1);
                const colour = AVALANCHE_RISK_COLOR[Math.round(clampGlobe(massif.level, 1, 3))] || AVALANCHE_RISK_COLOR[1];
                const seed = hashNoise(massif.lat * 2.9 + i, massif.lng * 2.1 - i);
                const breathe = 0.88 + 0.12 * Math.sin(now / (1100 + seed * 500) + seed * 33);
                const rad = Math.max(10 * dpr,
                    R * (0.030 + 0.042 * strength) * zoomScale / Math.max(1, globeZoom) * breathe);

                ctx.save();
                ctx.globalAlpha = limb * (0.32 + 0.38 * strength);
                const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
                halo.addColorStop(0, colour);
                halo.addColorStop(0.45, colour.replace(/[\d.]+\)$/, '0.26)'));
                halo.addColorStop(1, 'rgba(150, 200, 255, 0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
                ctx.fill();

                // A slowly turning snow crystal marks the modelled snow load.
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.lineWidth = Math.max(0.8 * dpr, rad * 0.045);
                for (let spoke = 0; spoke < 3; spoke += 1) {
                    const angle = (Math.PI / 3) * spoke + now / 9000;
                    ctx.beginPath();
                    ctx.moveTo(p.x - Math.cos(angle) * rad * 0.45, p.y - Math.sin(angle) * rad * 0.45);
                    ctx.lineTo(p.x + Math.cos(angle) * rad * 0.45, p.y + Math.sin(angle) * rad * 0.45);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // Official Avalanche.org zones: only zones that actually carry a published
        // danger rating (1–5) or an avalanche warning in force are drawn — an
        // off-season "no rating" zone has nothing to say on a world map. Tap one
        // to fly to that zone; the panel lists them with their centre's advice.
        function drawLiveAvalanches(ctx, cx, cy, R, size) {
            if (globeLayerOn.avalanche === false || !liveAvalanches.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const zoomScale = Math.min(2.4, 0.82 + Math.sqrt(globeZoom) * 0.24);
            const rated = liveAvalanches.filter((zone) => zone.warning || zone.dangerLevel >= 1);
            const markerCount = Math.min(rated.length, 80);
            for (let i = 0; i < markerCount; i += 1) {
                const zone = rated[i];
                if (typeof zone.lat !== 'number' || typeof zone.lng !== 'number') continue;
                const p = globePoint(zone.lat, zone.lng);
                if (!p) continue;
                const limb = clampGlobe(p.z / 0.22, 0, 1);
                if (limb <= 0.02) continue;
                const level = Math.round(clampGlobe(zone.dangerLevel, 1, 5));
                const warned = !!zone.warning;
                const rad = Math.max(15 * dpr, R * 0.046 * zoomScale / Math.max(1, globeZoom));
                const pulse = warned ? 0.86 + 0.14 * Math.sin(now / 340) : 0.94 + 0.06 * Math.sin(now / 900 + i);

                ctx.save();
                ctx.globalAlpha = limb;

                // A warning keeps an expanding red ring around its zone.
                if (warned) {
                    const phase = (now / 1900) % 1;
                    ctx.globalAlpha = limb * (1 - phase) * 0.85;
                    ctx.strokeStyle = 'rgba(255, 74, 60, 0.95)';
                    ctx.lineWidth = Math.max(1.2 * dpr, rad * 0.16);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, rad * (1.1 + 1.5 * phase), 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.globalAlpha = limb;
                }

                // Luminous fluorescent BLUE circle marking the official zone.
                drawLuminousCircle(ctx, p.x, p.y, rad * pulse, dpr, LUMINOUS_MARKER.snow, limb);

                // The published danger rating (1–5) stays readable inside the disc.
                ctx.font = '800 ' + Math.round(rad * pulse * 1.30) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = Math.max(2, rad * 0.24);
                ctx.strokeStyle = 'rgba(6, 18, 38, 0.85)';
                ctx.strokeText(String(level), p.x, p.y + rad * pulse * 0.06);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(String(level), p.x, p.y + rad * pulse * 0.06);

                // Label the warned zones and the strongest few; zoom in for the rest.
                if (warned || globeZoom >= 1.3 || i < 3) {
                    const text = zone.name + ' · ' + (AVALANCHE_DANGER_LABEL[level] || level) + (warned ? ' · WARNING' : '');
                    ctx.font = '700 ' + Math.max(9, Math.round(rad * 0.92)) + 'px Inter, system-ui, sans-serif';
                    ctx.textBaseline = 'top';
                    ctx.lineWidth = Math.max(1.5, rad * 0.22);
                    ctx.strokeStyle = 'rgba(6, 18, 38, 0.92)';
                    ctx.strokeText(text, p.x, p.y + rad * 1.25);
                    ctx.fillStyle = 'rgba(232, 246, 255, 0.98)';
                    ctx.fillText(text, p.x, p.y + rad * 1.25);
                }
                ctx.restore();

                lastWeatherHits.push({
                    x: p.x, y: p.y, r: Math.max(rad * 2.1, 20 * dpr),
                    label: zone.name + ' avalanche zone · danger ' + level,
                    lat: zone.lat, lng: zone.lng, type: 'avalanche'
                });
            }
        }


        // ===== 🌊 Tsunami messages on the globe (NOAA warning centres) =====
        // NTWC (Palmer, AK) and PTWC (Honolulu) publish one message per event.
        // Each is plotted at the earthquake epicentre with expanding ripple rings
        // (the ocean wave spreading out), coloured by alert level, and for
        // warnings / advisories / watches the bulletin wave heights are printed
        // underneath. Information statements stay small and unlabelled.
        const TSUNAMI_STYLE = {
            Warning: { ripple: 'rgba(255, 72, 72, 0.95)', pin: 'rgba(214, 24, 32, 0.95)', short: 'Warning' },
            Advisory: { ripple: 'rgba(255, 168, 60, 0.95)', pin: 'rgba(232, 136, 12, 0.95)', short: 'Advisory' },
            Watch: { ripple: 'rgba(255, 214, 82, 0.95)', pin: 'rgba(201, 162, 39, 0.95)', short: 'Watch' },
            Information: { ripple: 'rgba(126, 190, 255, 0.75)', pin: 'rgba(70, 130, 200, 0.85)', short: 'Info' }
        };

        // "observed max 0.34 m (1.1 ft) · Kushiro (Japan)" — the headline number
        // from the bulletin tables (observed beats forecast, see api/tsunami.js).
        function tsunamiWaveHeightText(message) {
            const heights = message && message.waveHeights;
            if (!heights || heights.maxM == null) return null;
            const metres = heights.maxM;
            const feet = metres * 3.28084;
            const kind = heights.maxSource === 'observed' ? 'observed' : 'forecast';
            return kind + ' max ' + (metres < 1 ? metres.toFixed(2) : metres.toFixed(1)) + ' m (' +
                (feet < 10 ? feet.toFixed(1) : String(Math.round(feet))) + ' ft)' +
                (heights.maxSite ? ' · ' + heights.maxSite : '');
        }

        function drawLiveTsunamis(ctx, cx, cy, R, size) {
            if (globeLayerOn.tsunami === false) return; // 🌊 chip switched off
            if (!liveTsunamiMessages.length) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();

            for (const message of liveTsunamiMessages) {
                if (typeof message.lat !== 'number' || typeof message.lng !== 'number') continue;
                const p = globePoint(message.lat, message.lng);
                if (!p) continue; // far side of the planet

                const style = TSUNAMI_STYLE[message.category] || TSUNAMI_STYLE.Information;
                const threat = !!message.threat;
                // R scales with zoom: normalise it out so pins stay a constant device size.
                const zn = Math.max(1, globeZoom);
                const rad = threat
                    ? Math.max(9 * dpr, Math.min(26 * dpr, R * 0.07 / zn))
                    : Math.max(6 * dpr, Math.min(15 * dpr, R * 0.042 / zn));

                ctx.save();
                // Expanding ripple rings — the tsunami radiating from the epicentre.
                const rings = threat ? 3 : 2;
                for (let ring = 0; ring < rings; ring += 1) {
                    const t = ((now / (threat ? 2600 : 4200)) + ring / rings) % 1;
                    ctx.globalAlpha = (1 - t) * (threat ? 0.75 : 0.35);
                    ctx.strokeStyle = style.ripple;
                    ctx.lineWidth = Math.max(1, Math.min(4 * dpr, R * 0.009 / zn * (1 - t * 0.6)));
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, rad * (1 + t * (threat ? 4.6 : 3)), 0, 2 * Math.PI);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // The pin itself: a wave crest in the alert colour.
                const bg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
                bg.addColorStop(0, 'rgba(255,255,255,0.96)');
                bg.addColorStop(1, style.pin);
                ctx.fillStyle = bg;
                ctx.shadowColor = style.ripple;
                ctx.shadowBlur = threat ? rad * 0.8 : rad * 0.35;
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.lineWidth = Math.max(1, dpr);
                ctx.strokeStyle = 'rgba(8, 20, 40, 0.55)';
                ctx.stroke();

                ctx.font = '700 ' + Math.round(rad * 1.2) + 'px Inter, Segoe UI Emoji, Apple Color Emoji, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#10243f';
                ctx.fillText('🌊', p.x, p.y + rad * 0.08);
                ctx.restore();

                // Threat messages get a full label: alert level, magnitude and the
                // maximum wave height from the bulletin. Information statements stay
                // unlabelled — they are frequent and mean "no tsunami danger".
                if (threat) {
                    const headline = 'Tsunami ' + style.short + (message.magnitude != null ? ' · M ' + message.magnitude.toFixed(1) : '');
                    const waveLine = tsunamiWaveHeightText(message);
                    const lines = waveLine ? [headline, 'max height ' + waveLine] : [headline];
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    lines.forEach((line, index) => {
                        if (!globeLabelAllowed(p.x, p.y + rad * 1.15 + 10 * dpr + index * 14 * dpr, line, 11 * dpr)) return; // 🏷️ no tsunami-line pile-up
                        const size = index === 0 ? Math.max(10, Math.min(14 * dpr, rad * 0.85)) : Math.max(9, Math.min(12 * dpr, rad * 0.7));
                        ctx.font = (index === 0 ? '800 ' : '700 ') + Math.round(size) + 'px Inter, system-ui, sans-serif';
                        const y = p.y + rad * 1.15 + 10 * dpr + index * (size * 1.35);
                        ctx.lineWidth = Math.max(1.5, size * 0.28);
                        ctx.strokeStyle = 'rgba(6, 18, 38, 0.85)';
                        ctx.strokeText(line, p.x, y);
                        ctx.fillStyle = index === 0 ? 'rgba(255, 236, 236, 0.98)' : 'rgba(198, 235, 255, 0.98)';
                        ctx.fillText(line, p.x, y);
                    });
                    ctx.restore();
                }

                lastWeatherHits.push({
                    x: p.x, y: p.y, r: Math.max(rad * 2, 16 * dpr),
                    label: 'Tsunami ' + style.short + (message.magnitude != null ? ' · M ' + message.magnitude.toFixed(1) : ''),
                    lat: message.lat, lng: message.lng, type: 'tsunami'
                });
            }
        }

        // ===== 🌩️ Draw rain, fog, thunderstorm and lightning at the "you" location =====
        function drawYouWeatherEffects(ctx, cx, cy, R, size) {
            if (!youEffects || typeof globeMarkerLat !== 'number' || typeof globeMarkerLng !== 'number') return;
            const p = globePoint(globeMarkerLat, globeMarkerLng);
            if (!p) return; // far side of the planet
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const now = performance.now();
            const scale = Math.min(2.6, 0.52 + Math.sqrt(globeZoom) * 0.30); // sub-linear: effects stay compact at 50×
            // R scales with zoom: normalise it out so effects keep a constant device size.
            const baseR = Math.max(22 * dpr, R * 0.12 * scale / Math.max(1, globeZoom));

            // A layer switched off in the legend must not show up at the "you" marker
            // either, so every effect below is also checked against its own chip.
            const show = (kind) => youEffects[kind] && globeLayerOn[YOU_EFFECT_LAYER[kind]] !== false;

            ctx.save();

            // ---- 🌫️ Fog: dense grey haze drifting around the location ----
            if (show('fog')) {
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
            if (show('thunder')) {
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
            if (show('rain')) {
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
            if (show('lightning')) {
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
            if (show('snow') && liveSnow) {
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
            if (show('hurricane') && liveHurricane) {
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
            globeZoomTarget = Math.min(GLOBE_MAX_ZOOM, Math.max(globeZoom, typeof zoom === 'number' ? zoom : 2.2));
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
            if (zoomEl) zoomEl.textContent = (globeZoom < 10 ? globeZoom.toFixed(1) : Math.round(globeZoom)) + '×';
            drawGlobe();
        }

        function zoomGlobeBy(factor) {
            globeZoomTarget = clampGlobe(globeZoomTarget * factor, 1, GLOBE_MAX_ZOOM);
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
                    if (Math.hypot(you.x - grabX, you.y - grabY) < Math.max(28 * dpr, 20 * dpr + 8)) {
                        focusedWeather = { lat: globeMarkerLat, lng: globeMarkerLng, label: 'Your location', type: 'you' };
                        centerOn(globeMarkerLat, globeMarkerLng);
                        globeZoomTarget = 2.2;
                        globeAutoRotate = true;
                        setGlobeStatus('📍 Zoomed to your location');
                    }
                }
            }
        }

        let latestGlobeWeather = null;
        function repaintGlobeWeather() {
            if (!latestGlobeWeather) return;
            if (typeof globeWeatherTempEl !== 'undefined' && globeWeatherTempEl) globeWeatherTempEl.textContent = (typeof latestGlobeWeather.temp === 'number' ? latestGlobeWeather.temp + '°' : String(latestGlobeWeather.temp).endsWith('°') ? String(latestGlobeWeather.temp) : latestGlobeWeather.temp + '°');
            if (typeof globeWeatherCondEl !== 'undefined' && globeWeatherCondEl) globeWeatherCondEl.textContent = (typeof t === 'function' ? t(latestGlobeWeather.condition || 'Unknown') : (latestGlobeWeather.condition || 'Unknown'));
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
                emoji: getWeatherIcon(data.condition, data.weatherCode, data.isDay)
            };
            setGlobeStatus(gpsCoords ? '📍 Live GPS · ' + name : '📍 ' + name);

            // Fill the "globe weather" box (was previously stuck on "Loading…")
            const temp = data.temperature ?? '--';
            const condition = data.condition || 'Unknown';
            // 🎨 Same canonical icon as the hero card — the payload's own icon is
            // only a fallback for payloads that carry a condition but no code.
            if (globeWeatherIconEl) globeWeatherIconEl.textContent = getWeatherIcon(condition, data.weatherCode, data.isDay) || data.icon;
            if (globeWeatherTempEl) globeWeatherTempEl.textContent = (typeof temp === 'number' ? temp + '°' : String(temp).endsWith('°') ? String(temp) : temp + '°');
            // The box carries data-i18n-skip so the dictionary walk never touches
            // live values — translate the condition explicitly instead.
            if (globeWeatherCondEl) globeWeatherCondEl.textContent = (typeof t === 'function' ? t(condition) : condition);
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
                if (c.includes('clear night')) chips.push('🌙 Clear night');
                else if (c.includes('clear') || c.includes('sun')) chips.push('☀️ Clear');
                const paintChips = (list) => (typeof translateFragments === 'function' ? list.map((s) => translateFragments(s)) : list);
                globeWeatherEffectsEl.innerHTML = paintChips(chips).map((txt) => `<span class="globe-weather-effect-chip">${txt}</span>`).join('');
            }
            try { latestGlobeWeather = { temp, condition }; } catch (e) { /* keep old */ }
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
        // iOS Safari sometimes never calls back (no timeout enforcement) and
        // older iOS lacks AbortSignal.timeout — so every call gets its own
        // safety timer that rejects, guaranteeing the UI never hangs.
        function requestPosition(opts) {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
                let settled = false;
                const safetyMs = (opts && typeof opts.timeout === 'number' ? opts.timeout : 8000) + 2500;
                const timer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    const err = new Error('timeout');
                    err.code = 3; // mirror GeolocationPositionError.TIMEOUT
                    reject(err);
                }, safetyMs);
                try {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => { if (settled) return; settled = true; clearTimeout(timer); resolve(pos); },
                        (err) => { if (settled) return; settled = true; clearTimeout(timer); reject(err); },
                        opts
                    );
                } catch (e) {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    reject(e);
                }
            });
        }

        // fetch() with a timeout that also works on older iOS Safari without
        // AbortSignal.timeout (it would otherwise throw and kill the fallback).
        function fetchWithTimeout(url, ms) {
            try {
                if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
                    return fetch(url, { signal: AbortSignal.timeout(ms) });
                }
            } catch (e) { /* fall through to the manual controller */ }
            const controller = new AbortController();
            const timer = setTimeout(() => { try { controller.abort(); } catch (e) {} }, ms);
            return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
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
                    const res = await fetchWithTimeout(src.url, 5000);
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

        async function applyGpsPosition(latitude, longitude, statusLabel, name) {
            globeMarkerLat = latitude;
            globeMarkerLng = longitude;
            locationInput.value = latitude.toFixed(5) + ', ' + longitude.toFixed(5);
            setGpsIdle('📍 My GPS location');
            if (name && globeNameEl) globeNameEl.textContent = name;
            setGlobeStatus((statusLabel || 'Location') + ' captured — updating weather…');
            await updateLocation(true);
            // Keep the push-notification subscription pointed at the user's current
            // position so alerts always reflect "here" — wherever they travel.
            refreshPushCoordinates();
        }


        async function useMyLocation(userRequested = false) {
            if (locatingDevice) return;
            clearTimeout(locationDebounce);
            ++weatherRequestId; // older city responses must not overwrite the GPS result
            // A typed search / map tap / Update press that landed while GPS was
            // in flight bumped userIntentId — this GPS run is stale, so drop it
            // instead of overwriting the user's choice with the device position.
            // (Background refreshes do NOT bump userIntentId, so the startup fix
            // survives them.)
            const gpsIntent = userIntentId;
            // NOTE: fail() must receive the ENGLISH original: both sinks
            // (setGlobeStatus / setLocationNote) run translateFragments()
            // themselves, and runtimeText has to remember the English so
            // switching back to EN restores it instead of staying Dutch.
            const fail = (message) => {
                setGlobeStatus(message, true);
                setLocationNote('⚠️ ' + message + '. The last displayed location has not been changed.');
            };
            const isSecure = (typeof window.isSecureContext === 'boolean')
                ? window.isSecureContext
                : (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
            if (!isSecure) {
                fail('Location needs a secure page (https or localhost)');
                return;
            }
            locatingDevice = true;
            manualBtn.disabled = true;
            manualBtn.textContent = 'Locating…';
            // NOTE: locationInput stays enabled on purpose — disabling it while
            // GPS resolves makes iOS feel frozen when the fix takes seconds.
            if (gpsBtnEl) { gpsBtnEl.disabled = true; gpsBtnEl.textContent = 'Locating…'; }
            clearLocationNote();
            try {
                const conn = getConnectionInfo();
                const slowConnection = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.saveData;
                // iOS fix: try the fast low-power (WiFi/cell) fix FIRST — it
                // resolves in ~1-2 s indoors where high-accuracy GPS hangs for
                // the full 8 s timeout (or never calls back on iOS). The GPS
                // attempt runs second only if the fast fix fails. Timeouts are
                // short so the worst case is ~10 s, not 18 s.
                //
                // 🎯 Accuracy gate: a network/WiFi fix is only accepted while its
                // error radius is reasonable. Phones report a coarse city-level
                // fix when GPS can't lock (indoors / VPN) — that is exactly the
                // "shows a different location than where I am" symptom. A fix
                // with a huge radius is skipped so the high-accuracy GPS run
                // below gets its chance to place the pin correctly.
                const MAX_NETWORK_ACCURACY_M = 1500;
                const attempts = [];
                if (navigator.geolocation) {
                    attempts.push({ enableHighAccuracy: false, timeout: 5000, maximumAge: 0 });
                    if (!slowConnection) {
                        attempts.push({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
                    }
                }
                // Never reuse gpsCoords here: the user may have moved since the last fix.
                for (const opts of attempts) {
                    setGlobeStatus('Locating your current device position…');
                    let pos;
                    try {
                        pos = await requestPosition(opts);
                    } catch (err) {
                        if (err && err.code === 1) {
                            fail(t('Location permission denied — enable it in your browser settings'));
                            return;
                        }
                        continue; // timeout / unavailable: try the next mode
                    }
                    const { latitude, longitude, accuracy } = pos.coords;
                    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
                    // iOS can return a stale cached fix with a fresh timestamp —
                    // ignore fixes older than 60 s on the low-power attempt so a
                    // wrong-city weather card is never shown as "here".
                    if (pos.timestamp && !opts.enableHighAccuracy && (Date.now() - pos.timestamp) > 60000) continue;
                    // 🎯 Coarse network/WiFi fixes often land kilometres away
                    // (the "wrong city on my phone" bug). Skip them while a
                    // better high-accuracy attempt is still queued; only a
                    // coarse fix may be used as the last resort.
                    if (!opts.enableHighAccuracy &&
                        Number.isFinite(accuracy) && accuracy > MAX_NETWORK_ACCURACY_M &&
                        attempts.length > 1) continue;
                    // A map tap / city search that landed while this GPS fix was
                    // in flight bumped userIntentId — drop the stale fix so it
                    // can't overwrite the tapped spot. weatherRequestId is
                    // deliberately NOT compared: background refreshes bump it and
                    // must never cancel the startup GPS fix.
                    if (gpsIntent !== userIntentId) return;
                    gpsCoords = { latitude, longitude, timestamp: Date.now(), label: 'Device location' };
                    const acc = Number.isFinite(accuracy) ? ' · ±' + Math.round(accuracy) + ' m' : '';
                    locatingDevice = false; // allow the coordinate weather request
                    await applyGpsPosition(latitude, longitude, '📍 Device location' + acc, null);
                    return;
                }
                // Startup may use an approximate city. A button click must not
                // silently substitute an IP/VPN location for the device's position.
                if (!userRequested) {
                    // Same staleness rule as the GPS fix above: a city the user
                    // typed while the IP lookup ran outranks the approximation.
                    if (gpsIntent !== userIntentId) return;
                    setGlobeStatus('Device location unavailable — trying approximate IP location…');
                    const ip = await ipBasedLocation();
                    if (ip) {
                        gpsCoords = { latitude: ip.latitude, longitude: ip.longitude, timestamp: Date.now(), label: 'IP (approximate)' };
                        locatingDevice = false;
                        await applyGpsPosition(ip.latitude, ip.longitude, '📍 IP (approximate)', ip.label);
                        return;
                    }
                }
                fail(navigator.geolocation
                    ? 'Could not get your current location — check device location services and try again'
                    : 'This browser does not support device location');
            } catch (err) {
                fail('Could not update your current location — please try again');
            } finally {
                // NOTE: locationInput is intentionally NOT disabled above during
                // locating: on iOS, disabling the field + the failing GPS chain
                // makes the Update button feel dead. The input stays usable and
                // typing a city cancels the pending GPS via locationDebounce.
                locatingDevice = false;
                locationInput.disabled = false;
                manualBtn.disabled = false;
                manualBtn.textContent = 'Update location';
                setGpsIdle();
            }
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

            // 🌍 Every chip in the legend under the globe switches its own layer
            // on/off — a single click flips it, the globe repaints on the next frame.
            document.querySelectorAll('[data-globe-layer]').forEach((chip) => {
                const key = chip.getAttribute('data-globe-layer');
                chip.setAttribute('aria-pressed', globeLayerOn[key] === false ? 'false' : 'true');
                chip.addEventListener('click', () => setGlobeLayer(key, globeLayerOn[key] === false));
            });

            if (gpsBtnEl) gpsBtnEl.addEventListener('click', () => {
                // Explicit "Use my location" overrides any remembered manual
                // location — the saved place must not re-assert on the next load.
                clearManualLocation();
                useMyLocation(true);
            });
            loadEarthTexture();
            loadGlobeBorders();
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
            // Nothing has been fetched yet (latestWeatherData is still null on a
            // first paint / early resize) → there is no grid to re-draw, and the
            // MapLibre GL map resizes itself (trackResize). Re-rendering with null
            // would dereference data.latitude and throw in the console.
            localMapResizeTimer = setTimeout(() => { if (latestWeatherData) renderLocalMap(latestWeatherData); }, 150);
        });

        let locationDebounce;
        locationInput.addEventListener('input', () => {
            // The user is typing a place → a GPS fix still in flight is stale from
            // the FIRST character onward (programmatic writes like applyGpsPosition
            // or the resolved-name echo never fire 'input', so this is purely user
            // typing cancelling the fix).
            ++userIntentId;
            clearTimeout(locationDebounce);
            locationDebounce = setTimeout(() => {
                const nextLocation = locationInput.value.trim();
                if (nextLocation !== activeLocation) {
                    updateLocation(false);
                }
            }, 800);
        });

        manualBtn.addEventListener('click', () => {
            // "Update location" searches the typed city/place name.
            // GPS lives on the 📍 button (useMyLocation) — the Update button
            // must never trigger a GPS fix, or typed cities get overwritten
            // by device coordinates and the top weather panel never changes.
            clearTimeout(locationDebounce);
            const typed = locationInput.value.trim();
            updateLocation(true).then(() => {
                // Remember an explicit typed choice so a reload restores it
                // instead of a coarse GPS/IP fix.
                if (typed) saveManualLocation(typed);
            }).catch(() => { /* updateLocation already surfaced the error */ });
        });
        locationInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                clearTimeout(locationDebounce);
                const typed = locationInput.value.trim();
                updateLocation(true).then(() => {
                    if (typed) saveManualLocation(typed);
                }).catch(() => { /* error already surfaced */ });
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
            runtimeText.alerts = text;
            if (alertsStatusEl) alertsStatusEl.textContent = translateFragments(text);
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
                setAlertsStatus(t('Open your browser menu (⋯) and choose "Install app", "Install", or "Add to Home screen".'));
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

        // ---- ⭕ earthquakes (USGS) + 🌊 tsunamis (NOAA) ----
        // Both feeds are proxied through our own /api/* endpoints (the raw USGS
        // GeoJSON and the NOAA CAP documents have no CORS headers), normalized
        // there, and then drawn on the globe + listed in the 🌍 panel below.
        function ageLabel(epochMs) {
            if (!Number.isFinite(epochMs)) return '';
            const minutes = Math.max(0, Math.round((Date.now() - epochMs) / 60000));
            if (minutes < 1) return 'just now';
            if (minutes < 60) return minutes + ' min ago';
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return hours + ' h ago';
            return Math.floor(hours / 24) + ' d ago';
        }

        function quakeMagClass(mag) {
            if (mag >= 7) return 'm7';
            if (mag >= 6) return 'm6';
            if (mag >= 5) return 'm5';
            if (mag >= 4) return 'm4';
            return '';
        }

        function renderSeismicPanel() {
            const quakeWrap = document.getElementById('quake-active');
            const tsunamiWrap = document.getElementById('tsunami-active');
            const stamp = document.getElementById('seismic-updated');
            if (stamp) stamp.textContent = 'updated ' + new Date().toLocaleTimeString();

            if (quakeWrap) {
                if (!liveEarthquakes.length) {
                    quakeWrap.hidden = false;
                    quakeWrap.innerHTML = '<div class="storm-active-title">⭕ Earthquakes</div>' +
                        '<p class="seismic-empty">No M2.5+ earthquakes reported by USGS in the past 24 hours.</p>';
                } else {
                    const rows = liveEarthquakes.slice(0, 8).map((q) => {
                        const details = [
                            q.depthKm != null ? Math.round(q.depthKm) + ' km deep' : null,
                            q.tsunami ? 'possible tsunami source' : null,
                            ageLabel(q.epochMs)
                        ].filter(Boolean).join(' · ');
                        return `<a class="seismic-row quake" href="${q.url || 'https://earthquake.usgs.gov/earthquakes/map/'}" target="_blank" rel="noopener">
                            <span class="seismic-mag ${quakeMagClass(q.mag)}">${q.mag.toFixed(1)}</span>
                            <span class="seismic-info"><b>${escapeHtml(q.place || 'Unknown location')}</b><small>${escapeHtml(details)}</small></span>
                        </a>`;
                    }).join('');
                    quakeWrap.hidden = false;
                    quakeWrap.innerHTML = `<div class="storm-active-title">⭕ Earthquakes in the past 24 h — M2.5+, ${liveEarthquakes.length} events (strongest first):</div>` +
                        `<div class="storm-active-list">${rows}</div>`;
                }
            }

            if (tsunamiWrap) {
                if (!liveTsunamiMessages.length) {
                    tsunamiWrap.hidden = false;
                    tsunamiWrap.innerHTML = '<div class="storm-active-title">🌊 Tsunami messages</div>' +
                        '<p class="seismic-empty">No tsunami message from the NOAA warning centres (NTWC · PTWC) in the last 7 days — the Pacific and Atlantic are quiet.</p>';
                } else {
                    const inForce = liveTsunamiMessages.filter((m) => m.active).length;
                    const rows = liveTsunamiMessages.map((m) => {
                        const category = (m.category || 'Information').toLowerCase();
                        const headline = (m.magnitude != null ? 'M ' + m.magnitude.toFixed(1) + ' ' : '') + (m.region || 'Tsunami message');
                        const details = [
                            m.centerLabel || m.center,
                            ageLabel(Date.parse(m.issued)),
                            m.active ? 'in force' : null
                        ].filter(Boolean).join(' · ');
                        const wave = tsunamiWaveHeightText(m);
                        return `<a class="seismic-row tsunami" href="${m.bulletinUrl || 'https://www.tsunami.gov/'}" target="_blank" rel="noopener">
                            <span class="seismic-tag ${category}">${(m.category || 'Info').toUpperCase()}</span>
                            <span class="seismic-info"><b>${escapeHtml(headline)}</b>
                            <small>${escapeHtml(details)}</small>
                            ${wave ? `<small class="seismic-wave">🌊 ${escapeHtml(wave)}</small>` : ''}</span>
                        </a>`;
                    }).join('');
                    tsunamiWrap.hidden = false;
                    tsunamiWrap.innerHTML = `<div class="storm-active-title">${inForce ? '🌊 Tsunami message IN FORCE — read the official bulletin' : '🌊 Tsunami messages (none in force right now)'}</div>` +
                        `<div class="storm-active-list">${rows}</div>`;
                    // A live tsunami alert is worth opening the panel for.
                    if (inForce) {
                        const details = document.getElementById('seismic-names');
                        if (details) details.open = true;
                    }
                }
            }
        }

        // Fetch the USGS "past day" quakes through our own proxy (never cache).
        async function fetchEarthquakes() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 6000);
                const res = await fetch('/api/earthquake?minMag=' + QUAKE_MIN_MAGNITUDE, { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                liveEarthquakes = Array.isArray(data.events)
                    ? data.events.filter((q) => q && typeof q.lat === 'number' && typeof q.lng === 'number' && typeof q.mag === 'number')
                    : [];
            } catch (e) {
                console.warn('Could not fetch the USGS earthquake feed.', e);
                liveEarthquakes = [];
            }
            renderSeismicPanel();
        }

        // Fetch the NOAA tsunami-centre messages (warning / advisory / watch / info)
        // through our own proxy — including the wave heights parsed from the bulletins.
        async function fetchTsunamiMessages() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 9000); // the proxy may fetch a bulletin too
                const res = await fetch('/api/tsunami', { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                liveTsunamiMessages = Array.isArray(data.messages)
                    ? data.messages.filter((m) => m && typeof m.lat === 'number' && typeof m.lng === 'number')
                    : [];
            } catch (e) {
                console.warn('Could not fetch the NOAA tsunami messages.', e);
                liveTsunamiMessages = [];
            }
            renderSeismicPanel();
        }

        fetchEarthquakes();
        // USGS republishes the "past day" summary every minute.
        setInterval(() => fetchEarthquakes(), 60000);

        fetchTsunamiMessages();
        // Tsunami messages are only re-issued when an event is running, so a slow poll is enough.
        setInterval(() => fetchTsunamiMessages(), 120000);

        // ---- 🌋 volcanoes (NASA EONET → Smithsonian GVP) ----
        // Fetched through our own /api/volcano proxy so the raw event document is
        // normalized server-side, exactly like the USGS quakes and NOAA storms.
        function volcanoTagClass(daysAgo) {
            return Number.isFinite(daysAgo) && daysAgo <= 120 ? 'erupting' : 'restless';
        }

        function renderVolcanoPanel() {
            const wrap = document.getElementById('volcano-active');
            const stamp = document.getElementById('volcano-updated');
            if (stamp) {
                stamp.textContent = liveVolcanoes.length
                    ? liveVolcanoes.length + ' erupting lava · updated ' + new Date().toLocaleTimeString()
                    : 'NASA EONET · Smithsonian GVP';
            }
            if (!wrap) return;
            if (!liveVolcanoes.length) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🌋 Active volcanoes</div>' +
                    '<p class="seismic-empty">No open volcano activity reported by NASA EONET right now, so the globe shows no lava.</p>';
                return;
            }
            const rows = liveVolcanoes.slice(0, 12).map((v) => {
                const daysAgo = volcanoDaysAgo(v);
                const details = [
                    v.country,
                    volcanoStageLabel(daysAgo),
                    Number.isFinite(v.epochMs) ? ageLabel(v.epochMs) : null
                ].filter(Boolean).join(' · ');
                return `<a class="seismic-row volcano" href="${v.sourceUrl || 'https://eonet.gsfc.nasa.gov/'}" target="_blank" rel="noopener">
                    <span class="seismic-tag volcano ${volcanoTagClass(daysAgo)}">🌋</span>
                    <span class="seismic-info"><b>${escapeHtml(v.name)}</b><small>${escapeHtml(details)}</small></span>
                </a>`;
            }).join('');
            wrap.hidden = false;
            wrap.innerHTML = `<div class="storm-active-title">🌋 Volcanoes erupting lava on the globe — ${liveVolcanoes.length} active (most recent first):</div>` +
                `<div class="storm-active-list">${rows}</div>`;
        }

        async function fetchVolcanoes() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 8000);
                const res = await fetch('/api/volcano', { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                liveVolcanoes = Array.isArray(data.events)
                    ? data.events.filter((v) => v && typeof v.lat === 'number' && typeof v.lng === 'number' && v.name)
                    : [];
            } catch (e) {
                console.warn('Could not fetch the NASA EONET volcano feed.', e);
                liveVolcanoes = [];
            }
            renderVolcanoPanel();
        }

        fetchVolcanoes();
        // EONET republishes its volcano events a few times a day; 10 minutes is plenty.
        setInterval(() => fetchVolcanoes(), 600000);

        // ---- 🔥 active forest fires (NASA EONET) ----
        function fireAreaText(fire) {
            if (!Number.isFinite(fire.acres)) return null;
            return new Intl.NumberFormat(navigator.language || 'en', { maximumFractionDigits: 0 }).format(fire.acres) + ' acres';
        }

        function renderFirePanel() {
            const wrap = document.getElementById('fire-active');
            const stamp = document.getElementById('fire-updated');
            const chip = document.querySelector('[data-globe-layer="fires"]');
            const count = liveFires.length;
            // Requirement: the flame lights up only while active fires are loaded.
            if (chip) {
                chip.classList.toggle('has-active-fires', count > 0);
                chip.dataset.activeCount = String(count);
            }
            if (stamp) {
                if (fireFeedAvailable === null) stamp.textContent = 'NASA EONET · loading…';
                else if (fireFeedAvailable === false) stamp.textContent = 'NASA EONET · feed unavailable';
                else stamp.textContent = count
                    ? count + ' active · updated ' + new Date().toLocaleTimeString()
                    : 'NASA EONET · no active fires';
            }
            if (!wrap) return;
            if (fireFeedAvailable === null) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🔥 Forest fires</div>' +
                    '<p class="seismic-empty">Loading active NASA EONET wildfire incidents…</p>';
                return;
            }
            if (fireFeedAvailable === false) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🔥 Forest fires</div>' +
                    '<p class="seismic-empty">NASA EONET could not be reached, so active fires cannot be confirmed right now.</p>';
                return;
            }
            if (!count) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🔥 Forest fires</div>' +
                    '<p class="seismic-empty">NASA EONET reports no open wildfire incidents right now, so the globe shows no flames.</p>';
                return;
            }
            const rows = liveFires.slice(0, 12).map((fire) => {
                const details = [
                    fire.description,
                    fireAreaText(fire),
                    fire.prescribed ? 'prescribed burn' : null,
                    Number.isFinite(fire.epochMs) ? ageLabel(fire.epochMs) : null
                ].filter(Boolean).join(' · ');
                return `<a class="seismic-row fire" href="${escapeHtml(fire.sourceUrl || 'https://eonet.gsfc.nasa.gov/categories/wildfires')}" target="_blank" rel="noopener">
                    <span class="seismic-tag fire ${fire.prescribed ? 'prescribed' : ''}" aria-hidden="true">🔥</span>
                    <span class="seismic-info"><b>${escapeHtml(fire.name)}</b><small>${escapeHtml(details)}</small></span>
                </a>`;
            }).join('');
            wrap.hidden = false;
            wrap.innerHTML = `<div class="storm-active-title">🔥 Forest fires on the globe — ${count} active (most recent first):</div>` +
                `<div class="storm-active-list">${rows}</div>`;
        }

        async function fetchFires() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 8000);
                const res = await fetch('/api/fires', { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                fireFeedAvailable = true;
                liveFires = Array.isArray(data.events)
                    ? data.events.filter((fire) => fire && typeof fire.lat === 'number' && typeof fire.lng === 'number' && fire.name)
                    : [];
            } catch (error) {
                console.warn('Could not fetch the NASA EONET wildfire feed.', error);
                fireFeedAvailable = false;
                liveFires = [];
            }
            renderFirePanel();
            drawGlobe();
        }

        renderFirePanel();
        fetchFires();
        setInterval(() => fetchFires(), 600000);

        // ---- 🪨 mudslides & landslides (NASA EONET + modelled slope scan) ----
        function landslideRiskText(point) {
            const bits = [];
            if (Number.isFinite(point.rain24Mm)) bits.push(point.rain24Mm + ' mm rain in 24 h');
            if (Number.isFinite(point.rain72Mm)) bits.push(point.rain72Mm + ' mm in 72 h');
            if (point.soilMoisture != null) bits.push('topsoil ' + Math.round(point.soilMoisture * 100) + '% water');
            return bits.join(' · ');
        }

        function renderMudslidePanel() {
            const wrap = document.getElementById('mudslide-active');
            const stamp = document.getElementById('mudslide-updated');
            const chip = document.querySelector('[data-globe-layer="landslide"]');
            const observed = liveLandslides.length;
            const risk = landslideRisk.length;
            // The chip icon lights up while the layer actually has something to show.
            if (chip) {
                chip.classList.toggle('has-active-layer', observed + risk > 0);
                chip.dataset.activeCount = String(observed + risk);
            }
            if (stamp) {
                if (landslideFeedAvailable === null) stamp.textContent = 'NASA EONET · loading…';
                else if (landslideFeedAvailable === false) stamp.textContent = 'NASA EONET · feed unavailable';
                else stamp.textContent = observed
                    ? observed + ' reported · ' + risk + ' modelled · ' + new Date().toLocaleTimeString()
                    : risk + ' modelled slopes · no report';
            }
            if (!wrap) return;
            if (landslideFeedAvailable === null) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🪨 Mudslides &amp; landslides</div>' +
                    '<p class="seismic-empty">Loading the NASA EONET reports and scanning the landslide-prone slopes…</p>';
                return;
            }
            if (landslideFeedAvailable === false) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🪨 Mudslides &amp; landslides</div>' +
                    '<p class="seismic-empty">Neither NASA EONET nor the weather model could be reached, so mudslides cannot be confirmed right now — nothing is drawn.</p>';
                return;
            }

            const parts = [];
            if (observed) {
                const rows = liveLandslides.slice(0, 10).map((slide) => {
                    const details = [
                        slide.description,
                        slide.status === 'closed' ? 'event closed' : 'open event',
                        Number.isFinite(slide.epochMs) ? ageLabel(slide.epochMs) : null
                    ].filter(Boolean).join(' · ');
                    return `<a class="seismic-row mudslide" href="${escapeHtml(slide.sourceUrl || 'https://eonet.gsfc.nasa.gov/categories/landslides')}" target="_blank" rel="noopener">
                        <span class="seismic-tag mudslide" aria-hidden="true">🪨</span>
                        <span class="seismic-info"><b>${escapeHtml(slide.name)}</b><small>${escapeHtml(details)}</small></span>
                    </a>`;
                }).join('');
                parts.push(`<div class="storm-active-title">🪨 Reported mudslides &amp; landslides on the globe — ${observed} (most recent first):</div>` +
                    `<div class="storm-active-list">${rows}</div>`);
            } else {
                parts.push('<div class="storm-active-title">🪨 Reported mudslides &amp; landslides</div>' +
                    '<p class="seismic-empty">NASA EONET has logged no landslide or mudslide report inside the last 6 months, so the globe shows no brown slide markers. That feed is authoritative but sparse — the modelled slopes below are the only signal available until it reports again.</p>');
            }
            if (risk) {
                const rows = landslideRisk.slice(0, 10).map((point) => `<a class="seismic-row mudslide modelled" href="${escapeHtml(point.sourceUrl || 'https://open-meteo.com/')}" target="_blank" rel="noopener">
                        <span class="seismic-tag mudslide">${escapeHtml(String(point.score))}</span>
                        <span class="seismic-info"><b>${escapeHtml(point.name)}</b><small>modelled · ${escapeHtml(landslideRiskText(point))}</small></span>
                    </a>`).join('');
                parts.push(`<div class="storm-active-title">🪨 Modelled slope risk — ${risk} slopes carrying rain (estimate, not an official warning):</div>` +
                    `<div class="storm-active-list">${rows}</div>`);
            } else {
                parts.push('<div class="storm-active-title">🪨 Modelled slope risk</div>' +
                    '<p class="seismic-empty">No landslide-prone slope in the scan has had enough rain in the last 72 hours for its soil to load up, so no brown halo is drawn.</p>');
            }
            wrap.hidden = false;
            wrap.innerHTML = parts.join('');
        }

        async function fetchLandslides() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 9000);
                const res = await fetch('/api/landslide', { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                landslideFeedAvailable = true;
                liveLandslides = Array.isArray(data.events)
                    ? data.events.filter((e) => e && typeof e.lat === 'number' && typeof e.lng === 'number' && e.name)
                    : [];
                landslideRisk = Array.isArray(data.risk)
                    ? data.risk.filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number' && p.name)
                    : [];
            } catch (error) {
                console.warn('Could not fetch the mudslide / landslide layer.', error);
                landslideFeedAvailable = false;
                liveLandslides = [];
                landslideRisk = [];
            }
            renderMudslidePanel();
            drawGlobe();
        }

        renderMudslidePanel();
        fetchLandslides();
        // EONET republishes a few times a day and the model runs hourly.
        setInterval(() => fetchLandslides(), 600000);

        // ---- 🏔️ snow avalanches (Avalanche.org US zones + modelled snow load) ----
        function avalancheZoneText(zone) {
            const bits = [];
            if (zone.centre) bits.push(zone.centre);
            if (zone.state) bits.push(zone.state);
            if (zone.warning) bits.push('avalanche warning in force' + (zone.warning.danger ? ' · ' + zone.warning.danger : ''));
            if (zone.endsAt) bits.push('forecast valid until ' + new Date(zone.endsAt).toLocaleString());
            if (zone.travelAdvice) bits.push(zone.travelAdvice);
            return bits.join(' · ');
        }

        function avalancheRiskText(point) {
            const bits = [];
            if (Number.isFinite(point.newSnow72Cm)) bits.push(point.newSnow72Cm + ' cm new snow in 72 h');
            if (Number.isFinite(point.windGustKmh)) bits.push('gusts ' + point.windGustKmh + ' km/h');
            if (point.snowDepthM != null) bits.push('snow depth ' + point.snowDepthM + ' m');
            if (Number.isFinite(point.maxTempC)) bits.push('max ' + point.maxTempC + '°C');
            return bits.join(' · ');
        }

        function renderAvalanchePanel() {
            const wrap = document.getElementById('avalanche-active');
            const stamp = document.getElementById('avalanche-updated');
            const chip = document.querySelector('[data-globe-layer="avalanche"]');
            const zones = liveAvalanches.length;
            const rated = liveAvalanches.filter((zone) => zone.warning || zone.dangerLevel >= 1).length;
            const warnings = liveAvalanches.filter((zone) => zone.warning).length;
            const risk = avalancheRisk.length;
            if (chip) {
                chip.classList.toggle('has-active-layer', rated + risk > 0);
                chip.dataset.activeCount = String(rated + risk);
            }
            if (stamp) {
                if (avalancheFeedAvailable === null) stamp.textContent = 'Avalanche.org · loading…';
                else if (avalancheFeedAvailable === false) stamp.textContent = 'Avalanche.org · feed unavailable';
                else if (rated) stamp.textContent = rated + ' zones rated' +
                    (warnings ? ' · ' + warnings + ' warning' + (warnings === 1 ? '' : 's') : '') + ' · ' + risk + ' modelled';
                else stamp.textContent = zones + ' zones · no rating · ' + risk + ' modelled';
            }
            if (!wrap) return;
            if (avalancheFeedAvailable === null) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🏔️ Snow avalanches</div>' +
                    '<p class="seismic-empty">Loading the Avalanche.org forecast zones and scanning the mountain ranges…</p>';
                return;
            }
            if (avalancheFeedAvailable === false) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🏔️ Snow avalanches</div>' +
                    '<p class="seismic-empty">Neither Avalanche.org nor the weather model could be reached, so avalanche conditions cannot be shown right now — nothing is drawn.</p>';
                return;
            }

            const parts = [];
            if (rated) {
                const rows = liveAvalanches
                    .filter((zone) => zone.warning || zone.dangerLevel >= 1)
                    .slice(0, 12)
                    .map((zone) => {
                        const level = Math.round(Math.min(5, Math.max(1, zone.dangerLevel)));
                        return `<a class="seismic-row avalanche" href="${escapeHtml(zone.link || 'https://avalanche.org/')}" target="_blank" rel="noopener">
                        <span class="seismic-tag avalanche danger${level}">${level}</span>
                        <span class="seismic-info"><b>${escapeHtml(zone.name)}${zone.warning ? ' ⚠️' : ''}</b><small>${escapeHtml(avalancheZoneText(zone))}</small></span>
                    </a>`;
                    }).join('');
                parts.push(`<div class="storm-active-title">🏔️ Official US forecast zones on the globe — ${rated} with a published danger rating (highest first):</div>` +
                    `<div class="storm-active-list">${rows}</div>`);
            } else {
                parts.push('<div class="storm-active-title">🏔️ Official US forecast zones</div>' +
                    `<p class="seismic-empty">All ${zones} Avalanche.org centres currently publish <b>no rating</b> (the US snow season has not started, or a centre is between forecasts), so the globe shows no official danger markers — only the modelled snow-load halos below. In season this list carries every zone’s danger rating and any avalanche warning in force.</p>`);
            }
            if (risk) {
                const rows = avalancheRisk.slice(0, 12).map((point) => `<a class="seismic-row avalanche modelled" href="${escapeHtml(point.sourceUrl || 'https://open-meteo.com/')}" target="_blank" rel="noopener">
                        <span class="seismic-tag avalanche">${escapeHtml(String(point.score))}</span>
                        <span class="seismic-info"><b>${escapeHtml(point.name)}</b><small>modelled · ${escapeHtml(avalancheRiskText(point))}</small></span>
                    </a>`).join('');
                parts.push(`<div class="storm-active-title">🏔️ Modelled snow-load risk — ${risk} mountain ranges (estimate, not an official forecast):</div>` +
                    `<div class="storm-active-list">${rows}</div>`);
            } else {
                parts.push('<div class="storm-active-title">🏔️ Modelled snow-load risk</div>' +
                    '<p class="seismic-empty">No mountain range in the scan currently carries a modelled snowpack deep enough to slide, so no halo is drawn — the snow line is simply too high right now.</p>');
            }
            wrap.hidden = false;
            wrap.innerHTML = parts.join('');
        }

        async function fetchAvalanches() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 9000);
                const res = await fetch('/api/avalanche', { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                avalancheFeedAvailable = true;
                liveAvalanches = Array.isArray(data.zones)
                    ? data.zones.filter((zone) => zone && typeof zone.lat === 'number' && typeof zone.lng === 'number' && zone.name)
                    : [];
                avalancheRisk = Array.isArray(data.risk)
                    ? data.risk.filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number' && p.name)
                    : [];
            } catch (error) {
                console.warn('Could not fetch the avalanche layer.', error);
                avalancheFeedAvailable = false;
                liveAvalanches = [];
                avalancheRisk = [];
            }
            renderAvalanchePanel();
            drawGlobe();
        }

        renderAvalanchePanel();
        fetchAvalanches();
        // The avalanche centres publish a few times a day and the model runs hourly.
        setInterval(() => fetchAvalanches(), 600000);

        // ---- 🏜️ Saharan dust (the Saharan Air Layer) — modelled dust load ----
        function dustLoadText(point) {
            const bits = [];
            if (Number.isFinite(point.dustUgm3)) bits.push(point.dustUgm3 + ' µg/m³ mineral dust');
// 🌪️ / 💨 The sandstorm and wind chips used to give the user NOTHING:
            // no highlight, no count, no explanation. With 0 storms active the
            // chip looked broken rather than honest, which is exactly what
            // "the button doesn't work" meant. Both chips now report their real
            // state — lit with a count when there is something to see, and
            // carrying an honest explanation when the layer is on but empty.
            const stormCount = saharanDust.filter((p) => (p.sandstormLevel || 0) > 0).length;
            const stormChip = document.querySelector('[data-globe-layer="sandstorm"]');
            if (stormChip) {
                stormChip.classList.toggle('has-active-layer', stormCount > 0);
                stormChip.dataset.activeCount = String(stormCount);
                stormChip.title = stormCount
                    ? stormCount + ' sandstorm' + (stormCount === 1 ? '' : 's') +
                        ' modelled right now (click to hide)'
                    : 'Sandstorm — on, but no cell currently has both thick dust and ' +
                      '40 km/h wind, so no storm is drawn right now (click to hide)';
            }
            const windChip = document.querySelector('[data-globe-layer="wind"]');
            if (windChip) {
                windChip.classList.toggle('has-active-layer', globeWind.length > 0);
                windChip.dataset.activeCount = String(globeWind.length);
                const strongest = globeWind.reduce((m, p) =>
                    (p.speedKmh || 0) > (m.speedKmh || 0) ? p : m, { speedKmh: 0 });
                windChip.title = globeWind.length
                    ? globeWind.length + ' grid squares, strongest ' + strongest.speedKmh +
                      ' km/h (Beaufort ' + (strongest.beaufort || 0) + ') (click to hide)'
                    : 'Wind — on, but the wind model returned no usable squares (click to hide)';
            }
            if (point.aerosolOpticalDepth != null) bits.push('aerosol optical depth ' + point.aerosolOpticalDepth);
            if (Number.isFinite(point.pm10Ugm3)) bits.push('PM10 ' + point.pm10Ugm3 + ' µg/m³');
            if (Number.isFinite(point.pm2_5Ugm3)) bits.push('PM2.5 ' + point.pm2_5Ugm3 + ' µg/m³');
            if (Number.isFinite(point.windKmh)) {
                bits.push('wind ' + point.windKmh + ' km/h from ' + cardinalFrom(point.windDirectionDeg) +
                    (Number.isFinite(point.windGustKmh) ? ', gusting ' + point.windGustKmh : '') +
                    ', travelling towards ' + cardinalTo(point.windDirectionDeg));
            }
            if (point.sandstormLabel && point.sandstormLevel > 0) bits.push('🌪️ ' + point.sandstormLabel);
            if (point.observedAt) bits.push('model run ' + new Date(point.observedAt).toLocaleString());
            return bits.join(' · ');
        }

        // Compass point the wind blows FROM, the way a forecast reports it.
        function cardinalFrom(deg) {
            if (!Number.isFinite(deg)) return '?';
            const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            return points[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
        }

        // The compass point the dust is actually TRAVELLING towards. Wind data
        // reports where the wind comes FROM, so the storm's own heading is the
        // opposite side of the compass — without this the globe would claim a
        // westerly gale is blowing back west towards its own source.
        function cardinalTo(deg) {
            return Number.isFinite(deg) ? cardinalFrom(deg + 180) : '?';
        }

        // Screen-space unit vector along the storm's track. North is up (-y) and
        // east is right (+x), so a bearing θ gives (sin θ, -cos θ).
        function sandstormTrackVector(deg) {
            const to = Number.isFinite(deg) ? ((deg + 180) % 360 + 360) % 360 : 0;
            const rad = to * Math.PI / 180;
            return { bearingTo: to, x: Math.sin(rad), y: -Math.cos(rad) };
        }

        function renderDustPanel() {
            const wrap = document.getElementById('dust-active');
            const stamp = document.getElementById('dust-updated');
            const chip = document.querySelector('[data-globe-layer="dust"]');
            const count = saharanDust.length;
            if (chip) {
                chip.classList.toggle('has-active-layer', count > 0);
                chip.dataset.activeCount = String(count);
            }
            if (stamp) {
                if (dustFeedAvailable === null) stamp.textContent = 'Open-Meteo air quality · loading…';
                else if (dustFeedAvailable === false) stamp.textContent = 'Open-Meteo air quality · feed unavailable';
                else if (count) {
                    const storms = saharanDust.filter((p) => (p.sandstormLevel || 0) > 0).length;
                    stamp.textContent = count + ' dusty cells · peak ' + saharanDust[0].dustUgm3 + ' µg/m³' +
                        (storms ? ' · 🌪️ ' + storms + ' sandstorm' + (storms === 1 ? '' : 's') : '');
                }
                else stamp.textContent = 'Open-Meteo air quality · air is clear';
            }
            if (!wrap) return;
            if (dustFeedAvailable === null) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🏜️ Saharan dust</div>' +
                    '<p class="seismic-empty">Loading the Open-Meteo air-quality model and scanning the dust belt…</p>';
                return;
            }
            if (dustFeedAvailable === false) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🏜️ Saharan dust</div>' +
                    '<p class="seismic-empty">The Open-Meteo air-quality model could not be reached, so the dust load cannot be shown right now — nothing is drawn.</p>';
                return;
            }
            if (!count) {
                wrap.hidden = false;
                wrap.innerHTML = '<div class="storm-active-title">🏜️ Saharan dust</div>' +
                    '<p class="seismic-empty">Every cell in the dust scan is currently below 30 µg/m³, so the air over the Sahara and the Sahel is clean enough that no haze is drawn.</p>';
                return;
            }
            const rows = saharanDust.slice(0, 12).map((point) => `<a class="seismic-row dust" href="${escapeHtml(point.sourceUrl || 'https://open-meteo.com/')}" target="_blank" rel="noopener">
                        <span class="seismic-tag dust level${point.level}">${escapeHtml(String(point.dustUgm3))}</span>
                        <span class="seismic-info"><b>${escapeHtml(point.name)}</b><small>${escapeHtml(point.levelLabel)} · ${escapeHtml(dustLoadText(point))}</small></span>
                    </a>`).join('');
            wrap.hidden = false;
            wrap.innerHTML = `<div class="storm-active-title">🏜️ Modelled Saharan dust load — ${count} cells above 30 µg/m³ (µg/m³ shown on each row, heaviest first):</div>` +
                `<div class="storm-active-list">${rows}</div>`;
        }

        async function fetchDust() {
            try {
                const controller = typeof AbortController === 'function' ? new AbortController() : null;
                const timeout = setTimeout(() => controller && controller.abort(), 9000);
                const res = await fetch('/api/dust', { signal: controller && controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                dustFeedAvailable = true;
                saharanDust = Array.isArray(data.points)
                    ? data.points.filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number' && p.name)
                    : [];
                // 💨 The wind grid rides along in the same response, so the globe
                // gets global wind without a second browser request. It is read
                // independently of the dust list above: a missing or empty dust
                // scan must never cost us the wind.
                const wind = data.wind;
                windFeedAvailable = !!(wind && wind.available !== 'unavailable');
                globeWind = windFeedAvailable && Array.isArray(wind.points)
                    ? wind.points.filter((p) => p && typeof p.lat === 'number' &&
                        typeof p.lng === 'number' && Number.isFinite(p.speedKmh))
                    : [];
            } catch (error) {
                console.warn('Could not fetch the Saharan-dust air-quality layer.', error);
                dustFeedAvailable = false;
                saharanDust = [];
                globeWind = [];
                windFeedAvailable = false;
            }
            renderDustPanel();
            drawGlobe();
        }

        renderDustPanel();
        fetchDust();
        // CAMS republishes the dust columns every few hours.
        setInterval(() => fetchDust(), 600000);

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
                setAlertsStatus(t('Notifications need a secure connection (https or localhost).'));
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
                            setAlertsStatus(t('On iPhone / iPad first tap 📲 Download app and choose “Add to Home Screen”, then open the app icon and tap Enable alerts. (Push alerts work in the installed app.)'));
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
                setAlertsStatus(t('Could not enable alerts (') + e.message + ').');
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
                setAlertsStatus(t('Could not turn off alerts (') + e.message + ').');
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
        let localMapGLPin = null;                 // 📍 tap-a-spot pin (tap the map → weather for that place)
        let localMapGLPinCoords = null;           // { lat, lon } of the pin — used to detect stale pins
        let localMapLastTapAt = 0;                // double-tap debounce — the 2nd tap of a double-tap is a zoom gesture
        let localMapGLGridDriftCells = [];        // 🌧️ live radar drift — cells + wind so the blobs glide (below)
        const localMapGLState = { dataRef: null, gridFrame: -1, ringsKey: '', placesKey: '', homeKey: '' };
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
                    paint: {
                        'fill-color': ['get', 'fill'],
                        // Slight transparency + antialiasing lets the organic
                        // blobs melt into one continuous radar sheet.
                        'fill-opacity': ['*', ['get', 'op'], 0.92],
                        'fill-antialias': true
                    }
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
            localMapGLSyncAllVisibility();
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
                localMapGLSyncZoomLabel();
                setLocalMapZoomControlsEnabled(true);
                // One-time discoverability hint — the first hover or tap replaces it.
                if (localMapCellInfo && !localMapCellInfo.textContent) {
                    localMapCellInfo.textContent = '👆 Tap the map to see the weather for any spot';
                }
            });
            // setStyle() fires styledata — re-inject the wiped weather layers,
            // re-apply tile URLs + weather data on the next drawLocalMap frame.
            localMapGL.on('styledata', () => {
                if (!localMapGLReady) return;
                try {
                    if (!localMapGL.getLayer('lmc-fill-rain')) {
                        localMapGLAddGridLayers();
                        // setStyle() creates fresh empty GeoJSON sources. Force the
                        // next push to repopulate them without treating it as a new
                        // location (which would needlessly reset the user's camera).
                        localMapGLState.dataRef = null;
                        localMapGLState.gridFrame = -1;
                        const d = localMapGLPendingData || latestLocalMapData;
                        localMapGLPendingData = null;
                        if (d) drawLocalMap(d, performance.now() / 1000);
                        localMapGLSyncZoomLabel();
                    } else localMapGLHideBaseLabels();
                } catch (err) { /* style mid-swap — next event */ }
            });
            localMapGL.on('zoom', () => {
                localMapGLSyncZoomLabel();
                try { localMapGL.resize(); } catch (err) { /* best effort */ }
            });
            localMapGL.on('move', localMapGLRepositionIcons);
            localMapGL.on('mousemove', localMapGLHover);
            localMapGL.on('mouseout', () => {
                localMapGL.getCanvas().style.cursor = '';
                if (localMapCellInfo) localMapCellInfo.textContent = '';
                localMapGLSetHoverFilter(null);
            });
            // 👆 Tap anywhere on the map → that spot becomes the app's location:
            // the tapped coordinates enter the same flow as a GPS fix
            // (applyGpsPosition), so every panel re-renders for that place.
            localMapGL.on('click', handleLocalMapTap);
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

        // ===== 👆 Tap-a-spot: touch the map to see that place's full weather =====
        // A 📍 pin marks the exact tapped point and the coordinates enter the
        // same flow as a GPS fix (applyGpsPosition): the backend reverse-
        // geocodes "lat, lon" into a place name and fetchWeather re-renders
        // EVERY panel around it — current conditions, all stat cards, 7-day
        // forecast, 15-minute nowcast, the 14-day tab, alerts and the AI
        // prediction — while the seen-from-above map re-centres on the tapped
        // spot with its 5×5 weather grid and the globe flies there.
        function localMapGLSetPin(lngLat) {
            if (!localMapGL) return;
            localMapGLPinCoords = { lat: lngLat.lat, lon: lngLat.lng };
            if (localMapGLPin) {
                localMapGLPin.setLngLat(lngLat);
                return;
            }
            const el = document.createElement('div');
            el.className = 'lmc-pin-marker';
            el.textContent = '📍';
            // pointer-events:none — the pin must never swallow the next map tap
            el.style.cssText = 'font-size:32px;line-height:1;pointer-events:none;filter:drop-shadow(0 3px 3px rgba(4,12,28,0.65));';
            localMapGLPin = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(lngLat).addTo(localMapGL);
        }

        // A location change that did NOT come from a tap (search box, GPS)
        // makes the pin meaningless — remove it so it can't point at a stale spot.
        // Compare numerically (not as formatted strings): the tap writes
        // "lat.toFixed(5), lon.toFixed(5)" but lngLat carries full precision,
        // so a string compare always mismatched and wiped the pin on the tap
        // itself. A ~1 m epsilon keeps real mismatches clearing the pin.
        function localMapGLClearPinIfStale(locationText) {
            if (!localMapGLPin || !localMapGLPinCoords) return;
            const m = String(locationText || '').trim().match(/^(-?[\d.]+)\s*[,;]\s*(-?[\d.]+)/);
            if (!m) {
                try { localMapGLPin.remove(); } catch (err) { /* already gone */ }
                localMapGLPin = null;
                localMapGLPinCoords = null;
                return;
            }
            const lat = Number(m[1]), lon = Number(m[2]);
            const dLat = Math.abs(lat - localMapGLPinCoords.lat);
            const dLon = Math.abs(lon - localMapGLPinCoords.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon) || dLat > 0.00001 || dLon > 0.00001) {
                try { localMapGLPin.remove(); } catch (err) { /* already gone */ }
                localMapGLPin = null;
                localMapGLPinCoords = null;
            }
        }

        async function handleLocalMapTap(e) {
            const now = Date.now();
            if (now - localMapLastTapAt < 500) return;   // double-tap = zoom gesture
            localMapLastTapAt = now;
            if (!e || !e.lngLat) return;
            // A tap is an explicit user choice — it wins over anything in
            // flight. If GPS is still resolving, abandon it now instead of
            // letting the late fix overwrite the tapped spot on arrival
            // (useMyLocation also guards via gpsIntent, this is belt + braces).
            locatingDevice = false;
            const lat = e.lngLat.lat;
            const lon = e.lngLat.lng;
            localMapGLSetPin(e.lngLat);
            if (localMapCellInfo) {
                localMapCellInfo.textContent = '📡 Loading weather for ' + lat.toFixed(4) + ', ' + lon.toFixed(4) + '…';
            }
            // Reuse the GPS flow verbatim: coordinates into the search box,
            // then updateLocation() → /weather?location=… — the API resolves
            // the place name and every panel re-renders for the tapped spot.
            // keepMapPin=true: updateLocation must not clear the pin we just
            // set (the input holds "lat, lon" but the pin compares with 5-dp
            // formatting — without this the pin vanishes on every tap).
            // clearTimeout: typing a city + tapping within 800 ms must not let
            // the stale search debounce overwrite the tap afterwards.
            locationInput.value = lat.toFixed(5) + ', ' + lon.toFixed(5);
            saveManualLocation(locationInput.value);
            clearTimeout(locationDebounce);
            ++weatherRequestId; // a pending GPS/auto-refresh must not kill the tap
            try {
                await updateLocation(true, true);
                // Clear the loading line only if no hover tip took its place.
                if (localMapCellInfo && localMapCellInfo.textContent.indexOf('📡') === 0) {
                    localMapCellInfo.textContent = '';
                }
            } catch (err) {
                // updateLocation already surfaced the reason in the note under
                // the search box; the map + pin stay where the user tapped.
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

        function localMapGLBlobRing(lon, lat, seed, hx, hy) {
            const N = 28, ring = [];
            for (let k = 0; k < N; k += 1) {
                const a = (k / N) * Math.PI * 2;
                const wob = 1 + 0.13 * Math.sin(3 * a + seed * 1.7) + 0.07 * Math.sin(5 * a + seed * 2.9);
                const ex = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.72);
                const ey = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.72);
                ring.push([lon + ex * hx * wob, lat + ey * hy * wob]);
            }
            ring.push(ring[0].slice());
            return ring;
        }

        // 🌧️ Live drift state: one entry per radar blob so the GeoJSON field can
        // glide with the wind between forecast frames (same wind math as the icons).
        // (Storage is the top-level `localMapGLGridDriftCells` declared with the
        // other map state above — never re-declared here.)
        let localMapGLGridDriftLast = 0;
        function localMapGLDriftGrid(t) {
            try {
                if (!localMapGL || !localMapGLReady) return;
                const drift = localMapGLGridDriftCells;
                if (!drift || !drift.length) return;
                if (!localMapGL.getSource) return;
                const src = localMapGL.getSource('lmc-grid');
                if (!src || !src.setData) return;
                // ~12 fps is plenty for clouds — cheaper than 60 fps, still silky.
                if ((t - localMapGLGridDriftLast) * 1000 < 80) return;
                localMapGLGridDriftLast = t;
                const features = [];
                for (const d of drift) {
                    let dLon = 0, dLat = 0;
                    try {
                        const p0 = localMapGL.project([d.lon, d.lat]);
                        const speedPx = Math.max(3, 10 + d.windKmh * 0.42);
                        const px = localMapGL.project([d.lon + d.wrapLon, d.lat]);
                        const py = localMapGL.project([d.lon, d.lat + d.wrapLat]);
                        const cellPxX = Math.max(14, Math.abs(px.x - p0.x));
                        const cellPxY = Math.max(14, Math.abs(py.y - p0.y));
                        const ox = wrapMod2(Math.sin(d.windDirRad) * speedPx * t, 2 * cellPxX) - cellPxX + Math.sin(t * 0.6 + d.phase) * cellPxX * 0.16;
                        const oy = wrapMod2(-Math.cos(d.windDirRad) * speedPx * t, 2 * cellPxY) - cellPxY + Math.cos(t * 0.8 + d.phase * 0.9) * cellPxY * 0.16;
                        const back = localMapGL.unproject([p0.x + ox, p0.y + oy]);
                        const blon = Array.isArray(back) ? back[0] : back.lng;
                        const blat = Array.isArray(back) ? back[1] : back.lat;
                        if (Number.isFinite(blon) && Number.isFinite(blat)) { dLon = blon - d.lon; dLat = blat - d.lat; }
                    } catch (err) { /* keep base position */ }
                    features.push({
                        type: 'Feature',
                        id: d.i + 1,
                        properties: { i: d.i, cls: d.cls, fill: d.fill, op: 1, tip: d.tip, icon: d.icon },
                        geometry: { type: 'Polygon', coordinates: [localMapGLBlobRing(d.lon + dLon, d.lat + dLat, d.i + 1, d.hx, d.hy)] }
                    });
                }
                src.setData({ type: 'FeatureCollection', features });
            } catch (err) { /* drift is cosmetic — never break the map */ }
        }

        function localMapGLBuildGrid(data, cells) {
            const { dLon, dLat } = localMapGLGridSpacing(cells);
            // Cells overlap (~95% of grid spacing) so the radar field stays
            // continuous and visible at every zoom level — close in (10 km
            // altitude) you still see weather filling the view, far out (50 km)
            // the cells still paint as a coherent radar sheet instead of tiny
            // isolated dots.
            // Organic radar blobs: each cell paints a 28-vertex rounded blob
            // (superellipse + deterministic wobble) instead of a sharp
            // rectangle, so rain clouds read as clouds — soft overlapping
            // discs that melt into a continuous sheet, never square blocks.
            // 🌧️ The blobs then DRIFT with the live wind (localMapGLDriftGrid,
            // driven by the icon drift loop) so the radar glides even while a
            // single forecast frame is on screen — no more frozen clouds.
            const hx = dLon * 0.68, hy = dLat * 0.68;
            const blobRing = (lon, lat, seed) => localMapGLBlobRing(lon, lat, seed, hx, hy);
            // 🌧️ Forecast advection: carry each blob downwind by wind × time-ahead
            // so stepping the timeline visibly streams rain across the map — not
            // just recolouring pinned squares. Clamped to ±1 cell so a blob stays
            // tied to its sky patch while clearly gliding.
            const advect = (lon, lat, windKmh, toRad) => {
                if (!localMapFrame || !windKmh) return [lon, lat];
                const hoursAhead = localMapFrame * 0.25;
                const distKm = Math.min(windKmh * hoursAhead, 30);
                const cosLat = Math.max(0.2, Math.cos((lat || 0) * Math.PI / 180));
                let dLo = Math.sin(toRad) * distKm / (111.2 * cosLat);
                let dLa = Math.cos(toRad) * distKm / 111.2;
                dLo = Math.max(-dLon, Math.min(dLon, dLo));
                dLa = Math.max(-dLat, Math.min(dLat, dLa));
                return [lon + dLo, lat + dLa];
            };
            const features = [];
            const drift = [];
            const wrapLon = Math.max(dLon, 0.004) * 0.5;   // ± half a cell (same wrap as icons)
            const wrapLat = Math.max(dLat, 0.004) * 0.5;
            cells.forEach((raw, i) => {
                const cell = localMapFrameCell(raw, localMapFrame);
                const cls = cell.type || 'clear';
                // Keep this cell's live wind so the blob can flow with it
                const fromDeg = typeof cell.wind_direction === 'number' && Number.isFinite(cell.wind_direction) ? cell.wind_direction : 0;
                const windKmh = Math.max(0, Number(cell.wind_speed) || 0);
                const toRad = ((fromDeg + 180) % 360) * Math.PI / 180;
                const [aLon, aLat] = advect(cell.lon, cell.lat, windKmh, toRad);
                drift.push({
                    i, lon: aLon, lat: aLat, hx, hy,
                    cls, fill: localMapGLCellPaint(cls, cell),
                    tip: localMapGLCellTip(cell), icon: cell.icon || LOCALMAP_ICON_OTHER,
                    windDirRad: toRad,
                    windKmh, wrapLon, wrapLat,
                    phase: Math.abs(cell.lat * 0.731 + cell.lon * 0.159)
                });
                features.push({
                    type: 'Feature',
                    id: i + 1,
                    properties: {
                        i,
                        cls,
                        fill: localMapGLCellPaint(cls, cell),
                        op: 1,
                        tip: localMapGLCellTip(cell),
                        icon: cell.icon || LOCALMAP_ICON_OTHER
                    },
                    geometry: { type: 'Polygon', coordinates: [blobRing(aLon, aLat, i + 1)] }
                });
            });
            localMapGL.getSource('lmc-grid').setData({ type: 'FeatureCollection', features });
            localMapGLGridDriftCells = drift;   // 🌧️ live drift loop glides these blobs with the wind
            localMapGLState.gridFrame = localMapFrame;
            // The icon loop owns the rAF clock — make sure it is running so the
            // freshly stored blobs start gliding immediately (e.g. first paint
            // before icons exist, or after a frame rebuild cancelled it).
            try {
                if (!localMapGLIconDriftRAF && typeof requestAnimationFrame === 'function') {
                    localMapGLIconDriftRAF = requestAnimationFrame(localMapGLIconDriftLoop);
                }
            } catch (err) { /* drift is cosmetic */ }
        }

        // ☀️⛅☁️🌧️ Weather icons as HTML markers — GPU symbol layers can't reliably
        // render colour emoji, so each grid cell gets a real <div> positioned with
        // MapLibre's projector. Rebuilt on every data/frame change; repositioned on
        // every map move/zoom. Scales with zoom for visual consistency.
        // Map an icon marker to the same control that owns its coloured polygon.
        // Drizzle shares Rain; clear-sky markers have no overlay to switch off.
        function localMapIconLayer(cell) {
            const type = cell && cell.type ? cell.type : 'clear';
            if (type === 'rain' || type === 'drizzle') return 'rain';
            if (type === 'clouds' || type === 'fog' || type === 'snow' || type === 'hail') return type;
            return '';
        }

        function localMapGLSyncIconVisibility() {
            for (const marker of localMapGLIconMarkers) {
                const layer = marker.layer || marker.el.dataset.layer || localMapIconLayer(marker);
                marker.el.style.display = !layer || !!localMapLayers[layer] ? 'block' : 'none';
            }
        }

        // The HTML weather icons are siblings of MapLibre's canvas, not GeoJSON
        // layers, so MapLibre's `visibility` property cannot control them. Keep
        // both paths in step immediately (and on the next map draw), including
        // while a style swap is still loading.
        function localMapGLSyncAllVisibility() {
            // `localMapGLApplyVis` also syncs the HTML markers. Keep this wrapper
            // explicit for the synchronous button path: it must work even when
            // the map/style is absent or still loading.
            localMapGLSyncIconVisibility();
            localMapGLApplyVis();
        }

        function localMapGLBuildIcons(cells) {
            if (!localMapGL || !localMapGLEl) return;
            // Remove old markers (and stop the previous drift loop)
            if (localMapGLIconDriftRAF) { cancelAnimationFrame(localMapGLIconDriftRAF); localMapGLIconDriftRAF = 0; }
            for (const m of localMapGLIconMarkers) { try { m.el.remove(); } catch (e) { /* gone */ } }
            localMapGLIconMarkers = [];
            if (!cells || !cells.length) return;
            const zoom = localMapGL.getZoom();
            // Scale: 40px at z8 → 64px at z13, capped to a comfortable range
            const size = Math.min(96, Math.max(40, 40 + (zoom - 8) * 4.8));
            const fontSize = Math.round(size * 0.75);
            const haloBlur = Math.max(2, Math.round(size * 0.1));
            const sp = localMapGLGridSpacing(cells);
            const wrapLon = Math.max(sp.dLon, 0.004) * 0.5;   // ± half a cell
            const wrapLat = Math.max(sp.dLat, 0.004) * 0.5;
            for (const raw of cells) {
                const cell = localMapFrameCell(raw, localMapFrame);
                const layer = localMapIconLayer(cell);
                const el = document.createElement('div');
                el.className = 'lmc-icon-marker';
                el.dataset.layer = layer;
                el.textContent = cell.icon || LOCALMAP_ICON_OTHER;
                el.style.cssText = `position:absolute;width:${size}px;height:${size}px;font-size:${fontSize}px;line-height:${size}px;text-align:center;pointer-events:none;z-index:50;transform:translate(-50%,-50%);text-shadow:0 0 ${haloBlur}px rgba(8,18,38,0.7);`;
                localMapGLEl.appendChild(el);
                // Keep this cell's live wind so the icon can flow with it
                const fromDeg = typeof cell.wind_direction === 'number' && Number.isFinite(cell.wind_direction) ? cell.wind_direction : 0;
                const windKmh = Math.max(0, Number(cell.wind_speed) || 0);
                localMapGLIconMarkers.push({
                    el, type: cell.type || 'clear', layer,
                    lon: cell.lon, lat: cell.lat, size, fontSize, haloBlur,
                    windDirRad: ((fromDeg + 180) % 360) * Math.PI / 180,
                    windKmh,
                    wrapLon, wrapLat,
                    phase: Math.abs(cell.lat * 0.731 + cell.lon * 0.159)
                });
            }
            localMapGLSyncIconVisibility();
            localMapGLRepositionIcons();
            localMapGLIconDriftRAF = requestAnimationFrame(localMapGLIconDriftLoop);
        }

        // 🌬️ Drift clock: every on-map icon flows with its cell's live wind
        // (direction where the wind blows TOWARD, speed ∝ km/h), wrapped inside
        // ±half of its cell so the icon stays tied to its sky patch while
        // visibly streaming across the map. The radar BLOBS glide on the same
        // clock (localMapGLDriftGrid) so rain clouds are never frozen while a
        // single forecast frame is on screen.
        let localMapGLIconDriftRAF = 0;
        function localMapGLIconDriftLoop() {
            const hasIcons = !!(localMapGLIconMarkers && localMapGLIconMarkers.length);
            const hasBlobs = !!(typeof localMapGLGridDriftCells !== 'undefined' && localMapGLGridDriftCells && localMapGLGridDriftCells.length);
            if (!hasIcons && !hasBlobs) { localMapGLIconDriftRAF = 0; return; }
            if (hasIcons) localMapGLRepositionIcons();
            try { localMapGLDriftGrid(performance.now() / 1000); } catch (err) { /* drift is cosmetic */ }
            localMapGLIconDriftRAF = requestAnimationFrame(localMapGLIconDriftLoop);
        }

        function localMapGLRepositionIcons() {
            if (!localMapGL || !localMapGLIconMarkers.length) return;
            const zoom = localMapGL.getZoom();
            const size = Math.min(96, Math.max(40, 40 + (zoom - 8) * 4.8));
            const fontSize = Math.round(size * 0.75);
            const haloBlur = Math.max(2, Math.round(size * 0.1));
            const t = performance.now() / 1000;
            for (const m of localMapGLIconMarkers) {
                try {
                    m.el.style.width = size + 'px';
                    m.el.style.height = size + 'px';
                    m.el.style.fontSize = fontSize + 'px';
                    m.el.style.lineHeight = size + 'px';
                    m.el.style.textShadow = `0 0 ${haloBlur}px rgba(8,18,38,0.7)`;
                    const p0 = localMapGL.project([m.lon, m.lat]);
                    // Per-pixel wind speed (feels the same at every zoom), then
                    // wrap the offset inside ±half a cell and add a gentle swing.
                    const speedPx = Math.max(3, 10 + m.windKmh * 0.42);
                    const px = localMapGL.project([m.lon + m.wrapLon, m.lat]);
                    const py = localMapGL.project([m.lon, m.lat + m.wrapLat]);
                    const cellPxX = Math.max(14, Math.abs(px.x - p0.x));
                    const cellPxY = Math.max(14, Math.abs(py.y - p0.y));
                    const ox = wrapMod2(Math.sin(m.windDirRad) * speedPx * t, 2 * cellPxX) - cellPxX + Math.sin(t * 0.6 + m.phase) * cellPxX * 0.16;
                    const oy = wrapMod2(-Math.cos(m.windDirRad) * speedPx * t, 2 * cellPxY) - cellPxY + Math.cos(t * 0.8 + m.phase * 0.9) * cellPxY * 0.16;
                    m.el.style.left = (p0.x + ox) + 'px';
                    m.el.style.top = (p0.y + oy) + 'px';
                } catch (e) { /* out of bounds */ }
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
                try { localMapGL.setStyle(localMapGLStyleUrl()); } catch (err) { /* styledata will retry */ }
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
            if (!localMapGLReady) { localMapGLPendingData = data; return; }
            const grid = data && data.localMap;
            const cells = grid && Array.isArray(grid.cells) ? grid.cells : [];
            const dataChanged = data !== localMapGLState.dataRef;
            const frameChanged = localMapFrame !== localMapGLState.gridFrame;
            const nextHomeKey = cells.length
                ? cells.map((cell) => Number(cell.lat).toFixed(3) + ',' + Number(cell.lon).toFixed(3)).sort().join('|')
                : '';
            const homeChanged = nextHomeKey !== localMapGLState.homeKey;
            if (dataChanged) {
                localMapGLState.dataRef = data;
                localMapGLState.gridFrame = -1;      // force a grid rebuild
            }
            if (homeChanged) localMapGLState.homeKey = nextHomeKey;
            if (cells.length && localMapLoading) localMapLoading.classList.add('hidden');
            if (!cells.length && localMapLoading && localMapLoading.textContent.indexOf('grid') === -1) {
                localMapLoading.classList.remove('hidden');
                localMapLoading.textContent = 'No weather grid around this location (open water?) — basemap only.';
            }
            if (homeChanged && cells.length) {
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
            if (dataChanged || frameChanged) localMapGLBuildIcons(cells);
            if (dataChanged || frameChanged) {
                const sp = cells.length ? localMapGLGridSpacing(cells) : { dLon: 0.08, dLat: 0.05 };
                const centerLat = typeof data.latitude === 'number' ? data.latitude : (cells[0] ? cells[0].lat : 0);
                localMapGLBuildWind(cells, sp.dLon, sp.dLat, centerLat);
            }
            // Visibility is refreshed on EVERY push (including layer toggles,
            // which re-push the same data object with no data/frame change).
            // (The top-left "Live radar / Forecast …" chip already carries the
            // forecast time — the old top-right duplicate pill is gone.)
            if (localMapGLReady) localMapGLSyncAllVisibility();
            localMapGLSyncZoomLabel();
        }

        // MapLibre async-library boot (CDN fallback support) ============
        // The head loader injects MapLibre asynchronously (unpkg → jsDelivr) and
        // dispatches maplibreready / maplibrefailed on <document>. If data has
        // already arrived (fast API, slow CDN), drawLocalMap bailed out early —
        // this listener boots the map and replays the pending snapshot the
        // instant the library lands.
        document.addEventListener('maplibreready', () => {
            if (!localMapGLEl || localMapGL) return;
            localMapGLInit();
            if (localMapGL && latestLocalMapData) drawLocalMap(latestLocalMapData, performance.now() / 1000);
        });
        document.addEventListener('maplibrefailed', () => {
            setLocalMapZoomControlsEnabled(false);
            localMapGL = null;
            localMapGLReady = false;
            if (localMapLoading) {
                localMapLoading.classList.remove('hidden');
                localMapLoading.textContent = '🛰️ The map engine (MapLibre GL) failed to load from both CDNs — check the internet connection.';
            }
        });


        // Always start at the phone's location — the globe marker, the weather and the
        // push-alert coordinates all follow wherever the user is. If GPS / network
        // positioning isn't available (permission denied, indoors, …), it falls back
        // to an IP-based location and only then to the default city. The manual city
        // input remains available to pin a different place for the session.
        renderWeatherIconReference();                        // icon legend from the canonical set
        initLanguage();                                // 🇬🇧⇄🇳🇱 before the first paint
        // 💾 A remembered manual/tapped location wins on reload: it is the last
        // place the user explicitly asked for, so we restore it verbatim and
        // skip the automatic GPS/IP guess that could show the wrong place.
        const rememberedLocation = loadManualLocation();
        if (rememberedLocation) {
            locationInput.value = rememberedLocation;
            activeLocation = rememberedLocation;
            updateLocation(true, true)                    // resolve + render (keep any map pin)
                .catch(() => { /* note shown inline; last-good view stays */ });
        } else {
            useMyLocation();
            fetchWeather(activeLocation);                // guaranteed first paint while GPS resolves
        }
        setInterval(() => fetchWeather(activeLocation), 30000);
