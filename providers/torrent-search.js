/* Bounded metadata-backed torrent aliases. Native Parser owns transport and playback. */
(function () {
    'use strict';
    if (window.LampaTorrentSearch) return;
    var stopped = false, L = window.Lampa, generation = 0, current = null, originalGet, originalClear, wrappedGet, wrappedClear;
    var metadata = Object.create(null), keys = [], MAX_CALLS = 3, FALLBACK_MS = 8000;
    function text(value) { return value == null ? '' : String(value); }
    function normalize(value) {
        value = text(value).toLowerCase();
        if (value.normalize) value = value.normalize('NFKD');
        var normalized = value.replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9а-яёіїєґ\u1100-\u11ff\u3130-\u318f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/gi, ' ').trim();
        return /^[\u1100-\u11ff\u3130-\u318f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af ]+$/.test(normalized) ? normalized.replace(/ /g, '') : normalized;
    }
    function series(movie) { return movie.media_type === 'tv' || movie.method === 'tv' || !!(movie.original_name || movie.first_air_date || movie.number_of_seasons); }
    function target(movie) { return !!movie && (/^(ja|ko|zh|cn)$/i.test(movie.original_language || '') || /[\u0400-\u052f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test([movie.title,movie.name,movie.original_title,movie.original_name].join(' '))); }
    function identity(movie) { if (movie.id === undefined || movie.id === null || text(movie.id).trim() === '') return null; return (series(movie) ? 'tv:' : 'movie:') + (movie.source || 'tmdb') + ':' + movie.id; }
    function cached(movie) { var key = identity(movie), entry = key && metadata[key]; return entry && entry.expires > Date.now() ? entry.data : null; }
    function remember(movie, data) {
        var key = identity(movie); if (!key) return; var at = keys.indexOf(key); if (at >= 0) keys.splice(at, 1);
        keys.push(key); metadata[key] = { data: data, expires: Date.now() + 21600000 };
        while (keys.length > 32) delete metadata[keys.shift()];
    }
    function titles(movie, params, extra) {
        var list = [], used = Object.create(null), buckets = { uk: [], en: [], roman: [], original: [], ru: [], other: [] };
        function add(value, lang, kind) {
            value = text(value).trim(); if (!value || value.length > 240) return;
            var bucket = /roman|romaji|latin/i.test(kind || '') ? 'roman' : /^(uk|ua)$/i.test(lang) ? 'uk' : lang === 'en' ? 'en' : lang === 'ru' ? 'ru' : 'other';
            buckets[bucket].push(value);
        }
        function read(data) {
            if (!data) return;
            var translations = data.translations && (data.translations.translations || data.translations);
            if (Array.isArray(translations)) translations.slice(0, 80).forEach(function (tr) { var d = tr.data || tr; add(d.title || d.name, tr.iso_639_1 || tr.language); });
            var alternatives = data.alternative_titles && (data.alternative_titles.titles || data.alternative_titles.results || data.alternative_titles);
            if (Array.isArray(alternatives)) alternatives.slice(0, 80).forEach(function (a) { add(a.title || a.name, a.language || ({ UA: 'uk', US: 'en', GB: 'en', RU: 'ru' })[a.iso_3166_1], a.type); });
            if (Array.isArray(data.aliases)) data.aliases.slice(0, 80).forEach(function (a) { if (typeof a === 'object' && a) add(a.title || a.name, a.language, a.type); });
        }
        add(movie.title || movie.name, movie.original_language === 'en' ? 'en' : 'uk');
        read(movie); read(cached(movie)); read(extra);
        // Native component's verified EN fallback and local title are already available.
        if (params && params.search_two && normalize(params.search_two) !== normalize(movie.original_title || movie.original_name)) add(params.search_two, 'en');
        buckets.original.push(movie.original_title || movie.original_name);
        ['uk', 'en', 'roman', 'original', 'ru', 'other'].forEach(function (bucket) { buckets[bucket].forEach(function (name) { var key = normalize(name); if (key && !used[key]) { used[key] = true; list.push(name); } }); });
        return list.slice(0, 32);
    }
    function coordinate(value) { var n = Number(value); return value !== undefined && value !== null && value !== '' && isFinite(n) && n >= 0 && Math.floor(n) === n ? n : null; }
    function seasonSearch(params){return !!params&&coordinate(params.season)!==null&&/(?:\bS\d{1,3}(?:E\d{1,4})?|\bSeason\s*\d{1,3}|Сезон\s*\d{1,3}|\d{1,3}\s+сезон)/iu.test(String(params.search||''));}
    function match(row, movie, context, names) {
        context = context || {}; var raw = text(row.Title || row.title || row.parsed && row.parsed.raw), reasons = [], tv = series(movie);
        names = names || titles(movie); var year = text(movie.first_air_date || movie.release_date).slice(0, 4);
        var seasonRange = /\bS(\d{1,3})\s*[-–]\s*S?(\d{1,3})(?![a-z0-9])/i.exec(raw);
        var localizedSeasonRange = /\bSeasons?\s*(\d{1,3})\s*[-–]\s*(?:Seasons?\s*)?(\d{1,3})\b|Сезони?\s*(\d{1,3})\s*[-–]\s*(?:Сезони?\s*)?(\d{1,3})/iu.exec(raw);
        var seasonCollection = !!(seasonRange || localizedSeasonRange || /\b(?:complete\s+(?:series|show|collection)|all\s+seasons|full\s+series|collection|box[ .-]?set)\b|повн(?:ий|а)\s+(?:серіал|колекці)|усі\s+сезони/iu.test(raw));
        var season = /\bS(\d{1,2})(?:E\d|\b)|(?:season|сезон)[ ._:-]*(\d{1,2})/i.exec(raw), episode = /\bS\d{1,2}E(\d{1,3})(?!\d)(?:\s*[-–]\s*(?:S\d{1,2}E|E)?(\d{1,3})(?!\d))?/i.exec(raw);
        var alternateEpisode = /(?:\b(\d{1,2})x|(?:сері[яїій]|сери[яий]|епізод(?:и|ів)?|эпизод(?:ы|ов)?)[ ._:-]*)(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/i.exec(raw);
        var rs = coordinate(row.Season != null ? row.Season : row.season), re = coordinate(row.Episode != null ? row.Episode : row.episode);
        if (rs === null && season) rs = Number(season[1] || season[2]);
        if (rs === null && alternateEpisode && alternateEpisode[1]) rs = Number(alternateEpisode[1]);
        if (re === null && episode) re = Number(episode[1]);
        if (re === null && alternateEpisode) re = Number(alternateEpisode[2]);
        if (re === null) { var absolute = /\s-\s(\d{1,3})(?:v\d)?(?:\s|\[|$)/i.exec(raw); if (absolute) re = Number(absolute[1]); }
        var expectedSeason = coordinate(context.season), expectedEpisode = coordinate(context.episode);
        var explicit = raw.match(/\b(?:19|20)\d{2}\b/g) || [], titleNumbers = names.map(normalize).join(' ').split(' ');
        explicit = explicit.filter(function (y) { return titleNumbers.indexOf(y) < 0; });
        var releaseYear = explicit[0] || row.Year || row.year, effectiveSeason = expectedSeason === null ? rs : expectedSeason;
        if (releaseYear && year && (!tv || effectiveSeason === null || effectiveSeason <= 1) && text(releaseYear) !== year) reasons.push('Інший рік');
        if (!tv && (rs !== null || re !== null)) reasons.push('Серіальний реліз');
        var type = text(row.media_type || row.MediaType || row.Type).toLowerCase();
        if (tv && type === 'movie' || !tv && /^(tv|series|show)$/.test(type)) reasons.push('Інший тип');
        if (row.tmdb_id && text(row.tmdb_id) !== text(movie.id)) reasons.push('Інший TMDB ID');
        if (expectedSeason !== null && rs !== null && !seasonCollection && (seasonRange ? expectedSeason < Number(seasonRange[1]) || expectedSeason > Number(seasonRange[2]) : rs !== expectedSeason)) reasons.push('Інший сезон');
        if (expectedEpisode !== null && re !== null && (expectedEpisode < re || expectedEpisode > Number(episode && episode[2] || alternateEpisode && alternateEpisode[3] || re))) reasons.push('Інша серія');
        var clean = raw.replace(/^(?:\[[^\]]{1,60}\]\s*)+/, ''), pieces = clean.split(/\s*[\/|]\s*/);
        var found = pieces.some(function (piece) {
            // Strip release descriptors, never compare just a fraction of title words.
            var stop = /\b(?:S\d{1,2}E?\d*|Season\s*\d+|Episode\s*\d+|2160p|1080p|720p|480p|4K|WEB[ .-]?DL|WEBRip|BluRay|BDRip|HDTV|Remux|x26[45]|HEVC|AVC|Remastered|Ukr|Eng|Rus)\b|\s+-\s+\d{1,3}(?:\b|$)/i.exec(piece);
            var localizedStop = /(?:^|[ ._([\/-])(?:сезон|сері[яїій]|сери[яий]|епізод|эпизод)[ ._:-]*\d|\b\d{1,2}x\d{1,3}/i.exec(piece);
            if (localizedStop && (!stop || localizedStop.index < stop.index)) stop = localizedStop;
            if (stop) piece = piece.slice(0, stop.index);
            explicit.forEach(function (y) { var at = piece.indexOf(y); if (at >= 0) piece = piece.slice(0, at); });
            piece = normalize(piece); var normalizedNames = names.map(normalize); return normalizedNames.some(function (name) { return name === piece || piece.indexOf(name + ' ') === 0 && normalizedNames.indexOf(piece.slice(name.length + 1)) >= 0; });
        });
        if (!found) reasons.push('Назву не підтверджено');
        return { eligible: reasons.length === 0, similarity: found ? 1 : 0, reasons: reasons, collection: false };
    }
    function canonicalHash(value) {
        value = text(value).toLowerCase();
        if (/^[a-z2-7]{32}$/.test(value)) {
            var alphabet = 'abcdefghijklmnopqrstuvwxyz234567', bits = 0, buffer = 0, hex = '';
            for (var i = 0; i < value.length; i++) { buffer = (buffer << 5) | alphabet.indexOf(value[i]); bits += 5; while (bits >= 8) { bits -= 8; var byte = (buffer >>> bits) & 255; hex += (byte < 16 ? '0' : '') + byte.toString(16); } }
            return hex;
        }
        return /^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(value) ? value : '';
    }
    function releaseKey(row) {
        if (row.parser_release_key) return row.parser_release_key;
        var value = text(row.InfoHash || row.infoHash || row.info_hash), magnet = text(row.MagnetUri || row.magnet), fromMagnet = '';
        try { var m = /[?&]xt=urn:btih:([a-z0-9]+)/i.exec(decodeURIComponent(magnet)); if (m) fromMagnet = m[1]; } catch (e) { /* malformed magnet remains distinct */ }
        var hash = canonicalHash(value) || canonicalHash(fromMagnet); if (hash) return 'hash:' + hash;
        var url = row.Link || row.downloadUrl || row.DownloadUrl || magnet;
        return url ? 'url:' + url : 'title:' + normalize(row.Title || row.title) + '|' + text(row.Size || row.size) + '|' + text(row.Tracker || row.indexer) + '|' + JSON.stringify([row.Quality || row.Resolution, row.AudioLanguages || row.audio_languages, row.AudioTracks || row.audio_tracks, row.SubtitleLanguages || row.subtitle_languages, row.VoiceoverStudio || row.voiceover_studio, row.VoiceoverType || row.voiceover_type, row.ReleaseGroup || row.release_group, row.Version || row.version]);
    }
    function dedup(rows) {
        var used = Object.create(null), out = [];
        rows.forEach(function (row) { var key = releaseKey(row); if (!used[key]) { used[key] = true; out.push(row); } }); return out;
    }
    function dispatch(self, params, done, fail) {
        var providers = window.ParserProviders;
        if (providers && providers.search && !originalGet.__parserCoordinator) return providers.search(params, done, fail, function (p, ok, no) { return originalGet.call(self, p, ok, no); });
        return originalGet.call(self, params, done, fail);
    }
    function clearTransport(self) { if (!originalGet.__parserCoordinator && window.ParserProviders && window.ParserProviders.cancel && window.ParserProviders.cancel()) return; if (originalClear) return originalClear.call(self); }
    function cancel() { generation++; if (current) current.cancel(); current = null; }
    function install() {
        if (!L || !L.Parser || typeof L.Parser.get !== 'function') return;
        if (wrappedGet) { stopped = false; if (L.Parser.get === originalGet) L.Parser.get = wrappedGet; if (L.Parser.clear === originalClear) L.Parser.clear = wrappedClear; return; }
        originalGet = L.Parser.get; originalClear = L.Parser.clear;
        wrappedGet = function (params, done, fail) {
            if (stopped) return originalGet.apply(this, arguments);
            cancel();
            var mine = generation;
            if (!params || (params.from_search || params.clarification) || (!target(params.movie)&&!seasonSearch(params))) {
                return dispatch(this, params, function () { if (mine === generation && typeof done === 'function') return done.apply(this, arguments); }, function () { if (mine === generation && typeof fail === 'function') return fail.apply(this, arguments); });
            }
            var movie = params.movie, names = titles(movie, params), used = Object.create(null), calls = 0, ended = false, metadataRequest = null, timer = null, seasonCollectionQuery=false,seasonRows=[],seasonRawRows=[],seasonScoped=seasonSearch(params);
            var metadataTried = false, fallbackStart = 0, lastData = { Results: [] }, self = this;
            var stats = { calls: 0, metadataRequests: 0, cancelled: false, started: Date.now(), search: text(params.search), season: coordinate(params.season), seasonScoped: seasonScoped, phases: [] }; window.LampaTorrentSearch.lastStats = stats;
            function alive() { return !ended && mine === generation; }
            function clean() { clearTimeout(timer); if (metadataRequest) metadataRequest.clear(); metadataRequest = null; }
            current = { cancel: function () { ended = true; stats.cancelled = true; clean(); } };
            function finish(data, error) {
                if (!alive()) return; ended = true; clean(); current = null;
                if(data&&seasonScoped)data=Object.assign({},data,{torrent_search_raw_total:dedup(seasonRawRows).length});
                if (data && data.parser_pending) data = Object.assign({}, data, { parser_pending: false, parser_status: (data.parser_status || []).map(function (s) { return s.status === 'loading' ? Object.assign({}, s, { status: 'cancelled' }) : s; }) });
                stats.elapsed = Date.now() - stats.started;
                if (error) { if (typeof fail === 'function') fail(error); } else done(data);
            }
            function remaining() { return FALLBACK_MS - (Date.now() - fallbackStart); }
            function candidates() {
                var season=coordinate(params.season),list=[];
                if(season!==null&&seasonScoped){[params.search_one,params.search_two].forEach(function(value){if(value)list.push(String(value));});var padded=String(season).padStart(2,'0');names.forEach(function(name){list.push(name+' S'+padded);});}
                else list=names.slice();
                var seen=Object.create(null);return list.filter(function(name){var key=normalize(name);if(!key||seen[key]||used[key])return false;seen[key]=true;return true;});
            }
            function hasSeasonRelease(rows){var wanted=coordinate(params.season);if(wanted===null)return true;return rows.some(function(row){var raw=text(row.Title||row.Name||row.title||row.name),pack=/\bS\d{1,3}\s*[-–]\s*S?\d{1,3}\b|\bSeasons?\s*\d{1,3}\s*[-–]\s*(?:Seasons?\s*)?\d{1,3}\b|Сезони?\s*\d{1,3}\s*[-–]\s*(?:Сезони?\s*)?\d{1,3}\b|\b(?:complete\s+(?:series|show|collection)|all\s+seasons|full\s+series|collection|box[ .-]?set)\b|повн(?:ий|а)\s+(?:серіал|колекці)|усі\s+сезони/iu.test(raw);if(pack)return false;var m=/\bS(\d{1,3})(?:E\d{1,4}|\b)|\bSeason\s*(\d{1,3})|Сезон\s*(\d{1,3})|\b(\d{1,3})x\d{1,4}\b/iu.exec(raw),found=m?Number(m[1]||m[2]||m[3]||m[4]):coordinate(row.Season!=null?row.Season:row.season);return found===wanted;});}
            function next() {
                if (!alive()) return;
                if (calls >= MAX_CALLS || (fallbackStart && remaining() <= 0)) return finish(Object.assign({}, lastData, { Results: dedup(seasonRows) }));
                var available = candidates();
                // Fetch one metadata record only when local title variants contain no Latin-script
                // alias. Cyrillic-only local titles may still need a verified English translation.
                if (!metadataTried && names.every(function (name) { return !/[a-z]/i.test(name); })) return metadataThenNext();
                metadataTried = true;
                if (!available.length) return finish(Object.assign({}, lastData, { Results: dedup(seasonRows) }));
                run(available[0], true);
            }
            function metadataThenNext() {
                metadataTried = true;
                if (cached(movie) || !/^(tmdb|cub)$/.test(movie.source || 'tmdb') || !/^\d+$/.test(text(movie.id)) || !L.Reguest || !L.TMDB || !L.TMDB.api || !L.TMDB.key) return next();
                metadataRequest = new L.Reguest(); metadataRequest.timeout(Math.min(2000, remaining())); stats.metadataRequests++;
                var settled = false;
                function ready(data) {
                    if (settled || !alive()) return; settled = true;
                    if (data && text(data.id) === text(movie.id) && (series(movie) ? !!(data.name || data.original_name) : !!(data.title || data.original_title))) {
                        var safe = { translations: data.translations, alternative_titles: data.alternative_titles }; remember(movie, safe); names = titles(movie, params, safe);
                    }
                    next();
                }
                metadataRequest.silent(L.TMDB.api((series(movie) ? 'tv/' : 'movie/') + movie.id + '?append_to_response=translations,alternative_titles&api_key=' + encodeURIComponent(L.TMDB.key())), ready, function () { ready(); });
            }
            function run(query, fallback, broadSeasonQuery) {
                if (!alive()) return;
                used[normalize(query)] = true; calls++; stats.calls = calls;
                var request = fallback || !params.search ? Object.assign({}, params, { search: query, torrent_search_owner: params }) : params; if (fallback) request.clarification = true;
                if (fallback) timer = setTimeout(function () { if (!alive()) return; clearTransport(L.Parser); finish(Object.assign({}, lastData, { Results:seasonRows.length?dedup(seasonRows):[] })); }, Math.min(4000, remaining()));
                dispatch(self, request, function (data) {
                    if (!alive()) return; lastData = data || { Results: [] };
                    var rawRows=Array.isArray(lastData.Results)?lastData.Results:[],rejected={};if(seasonScoped&&rawRows.length)seasonRawRows=dedup(seasonRawRows.concat(rawRows));var rows = dedup(rawRows.filter(function (row) { var result=match(row, movie, Object.assign({}, params, params.params || {}), names);if(!result.eligible)(result.reasons||[]).forEach(function(reason){var key=String(reason).split(':')[0];rejected[key]=(rejected[key]||0)+1;});return result.eligible; }));var phase=stats.phases.filter(function(item){return item.search===String(query);})[0];if(!phase){phase={search:String(query),raw:0,accepted:0,rejected:{}};stats.phases.push(phase);}phase.raw=Math.max(phase.raw,rawRows.length);phase.accepted=Math.max(phase.accepted,rows.length);Object.keys(rejected).forEach(function(key){phase.rejected[key]=Math.max(phase.rejected[key]||0,rejected[key]);});
                    if (lastData.parser_pending) { if (rows.length) { clearTimeout(timer); done(Object.assign({}, lastData, { Results:dedup(seasonRows.concat(rows)),torrent_search_raw_total:dedup(seasonRawRows).length })); } return; }
                    clearTimeout(timer);
                    if(rows.length)seasonRows=dedup(seasonRows.concat(rows));
                    if(seasonScoped&&!seasonCollectionQuery){seasonCollectionQuery=true;fallbackStart=fallbackStart||Date.now();var broad=String(params.search||'').replace(/\s+(?:S\d{1,3}(?:E\d{1,4})?|Season\s*\d{1,3}|Сезон\s*\d{1,3}|\d{1,3}\s+сезон)$/iu,'').trim()||names[0];return run(broad,true,true);}
                    if (rows.length) {
                        if(seasonScoped&&!hasSeasonRelease(seasonRows)&&calls<MAX_CALLS)return next();
                        remember(movie, Object.assign({}, cached(movie) || {}, { aliases: names.map(function (title) { return { title: title }; }) })); return finish(Object.assign({}, lastData, { Results:dedup(seasonRows) }));
                    }
                    if(broadSeasonQuery){if(calls<MAX_CALLS)return next();return finish(Object.assign({},lastData,{Results:dedup(seasonRows)}));}
                    if (!fallback) { fallbackStart = Date.now(); next(); } else next();
                }, function (error) { if (!alive()) return; clearTimeout(timer); if (!fallback) finish(null, error); else finish(Object.assign({}, lastData, { Results: [] })); });
            }
            run(params.search || names[0], false);
        };
        wrappedClear = function () { cancel(); return clearTransport(this); };
        L.Parser.get = wrappedGet; L.Parser.clear = wrappedClear;
    }
    window.LampaTorrentSearch = { version: '1.0.0', normalize: normalize, titles: titles, match: match, dedup: dedup, target: target,
        canonicalHash: canonicalHash, releaseKey: releaseKey, nativeClear: function () { if (originalClear) originalClear.call(L.Parser); }, install: install, destroy: function () { stopped = true; cancel(); if (L && L.Listener && L.Listener.remove) L.Listener.remove('app', ready); if (L && L.Parser) { if (L.Parser.get === wrappedGet) L.Parser.get = originalGet; if (L.Parser.clear === wrappedClear) L.Parser.clear = originalClear; } } };
    function ready(e) { if (e.type === 'ready') { install(); if (L.Listener.remove) L.Listener.remove('app', ready); } }
    if (L && L.Parser) install(); else if (L && L.Listener) L.Listener.follow('app', ready);
})();
