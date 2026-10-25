/*
 * Lampa Unified Parser — standalone replacement for Jackett/Prowlarr transport.
 * Backend: HTTPS reverse proxy to the owner's /api/search/unified service.
 * Keep this as the ONLY plugin wrapping Lampa.Parser.get.
 * No embedded API credentials, public IP addresses, or fallback to third-party parsers.
 */
(function () {
    'use strict';
    if (window.LampaUnifiedParser) return;
    var L = window.Lampa;
    if (!L) return;
    var originalGet, originalClear, ownGet, ownClear, current = null, generation = 0;
    var cache = Object.create(null), cacheOrder = [], CACHE_MAX = 20, CACHE_MS = 45000;
    function str(v) { return v == null ? '' : String(v); }
    function setting(k, fallback) { try { return L.Storage.get(k, fallback); } catch (e) { return fallback; } }
    function endpoint() {
        var value = str(window.LAMPA_UNIFIED_PARSER_URL || setting('unified_parser_url', '')).replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
        // Android TV site is normally HTTPS: disallow mixed content and accidental loopback.
        if (!/^https:\/\/[^/]+/i.test(value) || /^(https:\/\/)(localhost|127\.|0\.0\.0\.0)([:/]|$)/i.test(value)) return '';
        return value.replace(/\/api\/search\/unified$/i, '') + '/api/search/unified';
    }
    function isSeries(m) { return !!m && (m.media_type === 'tv' || m.method === 'tv' || !!m.original_name || !!m.number_of_seasons || !!m.first_air_date); }
    function number(v) { var n = Number(v); return isFinite(n) && n >= 0 ? n : 0; }
    function hash(magnet, direct) {
        var m = /(?:^|[?&])xt=urn:btih:([A-Fa-f0-9]{40})(?:&|$)/i.exec(str(magnet));
        return str(direct || (m && m[1])).toLowerCase();
    }
    function encode(params) {
        return Object.keys(params).filter(function(k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; }).map(function(k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(str(params[k]));
        }).join('&');
    }
    function playableLink(direct, source) {
        // Keep topic pages excluded. AniDUB provides torrents through its download.php endpoint.
        // Only trust that exact path on the known AniDUB host family.
        if (/^https?:\/\//i.test(direct) && /\.torrent(?:[?#]|$)/i.test(direct)) return direct;
        if (source === 'AniDUB') {
            var m = /^https:\/\/([^\/:?#]+)(\/[^?#]*)(?:[?#]|$)/i.exec(direct);
            if (m && /(?:^|\.)anidub\.com$/i.test(m[1]) && m[2].toLowerCase() === '/engine/download.php') return direct;
        }
        return '';
    }
    function mapRow(item, i) {
        var title = str(item.title || item.name || item.Title);
        var magnet = str(item.magnet || item.magnet_uri || item.MagnetUri);
        // A tracker topic page is not a torrent download. Prefer magnet for playback.
        var direct = str(item.torrent_url || item.download_url || item.Link);
        var source = str(item.source || item.tracker || item.Tracker || 'Unified');
        var link = magnet || playableLink(direct, source);
        var infoHash = hash(magnet, item.infohash || item.info_hash || item.InfoHash);
        if (!title || !link) return null;
        var row = {
            Title: title, Tracker: source, MagnetUri: magnet, Link: link,
            Size: number(item.size_bytes != null ? item.size_bytes : item.size),
            // The live JacRed schema exposes 'pir' (peer count); it has no verified seed count.
            Seeders: item.seeds != null ? number(item.seeds) : item.seeders != null ? number(item.seeders) : null,
            Peers: number(item.peers != null ? item.peers : item.pir != null ? item.pir : item.leechers),
            InfoHash: infoHash,
            PublishDate: item.publish_date || item.date || item.created_at || item.createTime || null,
            Type: item.type === 'series' || item.type === 'anime' || item.type === 'dorama' ? 'tv' : item.type,
            AudioLanguages: item.audio_languages || item.AudioLanguages,
            Voices: item.voices || item.Voices,
            Quality: item.quality || item.Quality,
            SubtitleLanguages: item.subtitle_languages || item.SubtitleLanguages,
            Resolution: item.resolution || item.Resolution,
            Season: item.season != null ? item.season : item.Season,
            Episode: item.episode != null ? item.episode : item.Episode,
            source_priority: number(item.source_priority || item.priority || 999),
            parser_sources: [{ id: 'unified', label: source, type: 'unified' }],
            parser_original: item,
            hash: L.Utils && L.Utils.hash ? L.Utils.hash(title) : title.toLowerCase(),
            parser_release_key: infoHash ? 'hash:' + infoHash : 'link:' + link
        };
        if (L.Storage && L.Storage.cache) {
            try { row.viewed = L.Storage.cache('torrents_view', 5000, []).indexOf(row.hash) >= 0; } catch (e) {}
        }
        return row;
    }
    function toNative(body) {
        if (!body || !Array.isArray(body.results)) throw new Error('invalid-response');
        var rows = [], seen = Object.create(null);
        body.results.forEach(function(item, i) {
            var row = mapRow(item, i);
            if (!row || seen[row.parser_release_key]) return;
            seen[row.parser_release_key] = true;
            rows.push(row);
        });
        return { Results: rows, parser_pending: false, parser_status: [
            { id: 'unified', label: 'Власний Lampa Parser', type: 'unified', status: 'ready' }
        ] };
    }
    function clearCurrent() {
        generation++;
        if (current) {
            try { current.clear(); } catch (e) {}
            current = null;
        }
    }
    function get(params, done, fail) {
        clearCurrent();
        var mine = generation, url = endpoint();
        if (!url) {
            if (typeof fail === 'function') fail('Укажіть HTTPS адресу власного Parser у налаштуваннях');
            return;
        }
        var movie = params && params.movie || {};
        var q = str(params && (params.search || params.search_one) || movie.title || movie.name).trim();
        if (q.length < 2) { if (typeof done === 'function') done({ Results: [] }); return; }
        // The VPS backend filters results by release type before native UI matching.
        // 'movie' drops Toloka Gremlins; 'series'/'anime' drop AniDUB doramas.
        // Request all sources, then let the Lampa torrent UI narrow the releases.
        var query = { q: q, type: 'all', language: str(setting('unified_parser_language', 'all')), limit: 100 };
        var id = str(movie.tmdb_id || movie.id);
        if (/^\d+$/.test(id) && (!movie.source || /^(tmdb|cub)$/i.test(str(movie.source)))) {
            query.tmdb_id = id;
            query.tmdb_type = isSeries(movie) ? 'tv' : 'movie';
        }
        var key = url + '?' + encode(query), hit = cache[key];
        if (hit && hit.expires > Date.now()) {
            if (typeof done === 'function') done(toNative(hit.data));
            return;
        }
        var request = new L.Reguest();
        current = request;
        request.timeout(12000);
        request.native(key, function(body) {
            if (mine !== generation) return;
            current = null;
            try {
                var converted = toNative(body);
                cache[key] = { data: body, expires: Date.now() + CACHE_MS };
                cacheOrder.push(key);
                while (cacheOrder.length > CACHE_MAX) delete cache[cacheOrder.shift()];
                if (typeof done === 'function') done(converted);
            } catch (e) {
                if (typeof fail === 'function') fail('Некоректна відповідь власного Parser');
            }
        }, function() {
            if (mine !== generation) return;
            current = null;
            if (typeof fail === 'function') fail('Власний Parser недоступний');
        });
        return request;
    }
    function setupSettings() {
        if (!L.SettingsApi || !L.SettingsApi.addParam) return;
        try {
            L.SettingsApi.addParam({ component: 'parser', param: {
                name: 'unified_parser_url', type: 'input', values: '',
                default: '', placeholder: 'https://parser.example.com',
                title: 'Власний Parser · HTTPS адреса',
                description: 'HTTPS URL сервера Lampa Parser; /api/search/unified додається автоматично'
            }, field: { name: 'unified_parser_url', type: 'input' } });
            L.SettingsApi.addParam({ component: 'parser', param: {
                name: 'unified_parser_language', type: 'select',
                values: { all: 'Усі мови', uk: 'Українська' }, default: 'all',
                title: 'Власний Parser · мова'
            }, field: { name: 'unified_parser_language', type: 'select' } });
        } catch (e) { /* Older Lampa builds have different settings signatures. */ }
    }
    function install() {
        if (!L.Parser || typeof L.Parser.get !== 'function' || ownGet) return;
        originalGet = L.Parser.get; originalClear = L.Parser.clear;
        ownGet = function(params, done, fail) { return get(params, done, fail); };
        ownClear = function() { clearCurrent(); };
        L.Parser.get = ownGet;
        L.Parser.clear = ownClear;
        setupSettings();
    }
    function destroy() {
        clearCurrent();
        if (L.Parser) {
            if (L.Parser.get === ownGet) L.Parser.get = originalGet;
            if (L.Parser.clear === ownClear) L.Parser.clear = originalClear;
        }
        ownGet = null;
    }
    window.LampaUnifiedParser = { version: '0.1.3', install: install, destroy: destroy, endpoint: endpoint, toNative: toNative };
    if (L.Parser) install();
    else if (L.Listener && L.Listener.follow) L.Listener.follow('app', function(e) { if (e.type === 'ready') install(); });
})();
