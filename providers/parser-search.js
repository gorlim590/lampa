/* Internal coordinator loaded by parsers.js; native torrent UI/playback remain owners. */
(function () {
    'use strict';
    if (window.createParserCoordinator) return;
    window.createParserCoordinator = function (L, sources) {
        var active = null, epoch = 0, memo = Object.create(null), cooldown = Object.create(null), cacheKeys = [], MAX_CACHE = 24;
        var lastStats = null, stopNative = window.LampaTorrentSearch && window.LampaTorrentSearch.nativeClear || L.Parser.clear;
        function clone(row) { var r = {}; Object.keys(row || {}).forEach(function (key) { r[key] = row[key]; }); return r; }
        function hash(value) {
            if (window.LampaTorrentSearch && window.LampaTorrentSearch.canonicalHash) return window.LampaTorrentSearch.canonicalHash(value);
            value = String(value || '').toLowerCase();
            if (/^[a-z2-7]{32}$/.test(value)) { var alphabet = 'abcdefghijklmnopqrstuvwxyz234567', bits = 0, buffer = 0, hex = ''; for (var i = 0; i < value.length; i++) { buffer = (buffer << 5) | alphabet.indexOf(value[i]); bits += 5; while (bits >= 8) { bits -= 8; var byte = (buffer >>> bits) & 255; hex += (byte < 16 ? '0' : '') + byte.toString(16); } } return hex; }
            return /^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(value) ? value : '';
        }
        function identity(row, source, index) {
            var magnet = row.MagnetUri || row.magnet || '', found = '';
            try { var match = /[?&]xt=urn:btih:([a-z0-9]+)(?:&|$)/i.exec(decodeURIComponent(magnet)); if (match) found = hash(match[1]); } catch (e) {}
            var value = hash(row.InfoHash || row.infoHash || row.info_hash) || found;
            if (value) return 'hash:' + value;
            var link = row.Link || row.DownloadUrl || row.downloadUrl || magnet;
            return /^https?:\/\//i.test(link || '') ? 'url:' + link : 'opaque:' + source.id + ':' + index;
        }
        function merged(job) {
            var result = [], seen = Object.create(null);
            job.slots.forEach(function (slot) { (slot.rows || []).forEach(function (row, index) {
                var key = identity(row, slot.spec, index), existing = seen[key], provenance = { id: slot.spec.id, label: slot.spec.label, type: slot.spec.type };
                if (existing) {
                    if (!existing.parser_sources.some(function (source) { return source.id === provenance.id; })) existing.parser_sources.push(provenance);
                    ['MagnetUri','Link','DownloadUrl','AudioLanguages','audioLanguages','audio_languages','AudioTracks','audioTracks','audio_tracks','SubtitleLanguages','subtitleLanguages','subtitle_languages','Voices','voices','ReleaseGroup','release_group','VoiceoverStudio','voiceoverStudio','voiceover_studio','VoiceoverStudios','voiceoverStudios','voiceover_studios','VoiceoverTeams','voiceoverTeams','voiceover_teams','VoiceoverGroups','voiceoverGroups','voiceover_groups','VoiceoverType','voiceoverType','voiceover_type','DubbingStudio','dubbingStudio','dubbing_studio','DubbingType','dubbingType','dubbing_type','ffprobe','info','Resolution','resolution','Season','season','Episode','episode','InfoHash'].forEach(function (field) { if ((existing[field] == null || existing[field] === '') && row[field] != null) existing[field] = row[field]; });
                    existing.parser_originals.push(row); return;
                }
                var item = clone(row);
                if (item.hash && L.Storage.cache) item.viewed = L.Storage.cache('torrents_view', 5000, []).indexOf(item.hash) >= 0;
                item.parser_release_key = key; item.parser_sources = [provenance]; item.parser_originals = [row]; seen[key] = item; result.push(item);
            }); });
            return result;
        }
        function cancel() {
            epoch++; if (!active) return false;
            var pending = active.pending > 0; active.dead = true; active.slots.forEach(function (slot) { clearTimeout(slot.timer); if (slot.request && slot.status === 'loading') slot.request.clear(); }); active = null;
            if (pending && stopNative) stopNative.call(L.Parser); return pending;
        }
        function specKey(spec) { return JSON.stringify([spec.type, String(spec.url||'').replace(/^(https?:\/\/[^/]+)/i,function(host){return host.toLowerCase();}).replace(/\/+$/,''), spec.key]); } // memory only; never persisted/logged
        function read(key) {
            var entry=memo[key];if(!entry||entry.expires<=Date.now())return null;
            var index=cacheKeys.indexOf(key);if(index>=0)cacheKeys.splice(index,1);cacheKeys.push(key);return entry;
        }
        function put(key, rows) {
            try { if(JSON.stringify(rows).length>256000)return; } catch(e) { return; }
            var index = cacheKeys.indexOf(key); if (index >= 0) cacheKeys.splice(index, 1); cacheKeys.push(key);
            memo[key] = { rows: rows, expires: Date.now() + (rows.length ? 120000 : 10000) };
            while (cacheKeys.length > MAX_CACHE) delete memo[cacheKeys.shift()];
        }
        function snapshot(job) {
            return { Results: merged(job), parser_pending: job.pending > 0, parser_status: job.slots.map(function (slot) { return { id: slot.spec.id, label: slot.spec.label, type: slot.spec.type, status: slot.status }; }) };
        }
        function emit(job) {
            if (job.dead || job.epoch !== epoch) return;
            var data = snapshot(job), success = job.slots.some(function (slot) { return slot.status === 'ready' || slot.status === 'empty'; });
            job.stats.pending = job.pending;job.stats.sources=data.parser_status;if(!job.pending)job.stats.settledMs=Date.now()-job.stats.started;
            if (job.pending && !data.Results.length) return;
            if (!job.pending && job.slots.length && !success) { job.subscribers.forEach(function (sub) { if (sub.fail) sub.fail('Налаштовані джерела недоступні'); }); return; }
            if (data.Results.length && job.stats.firstResultMs == null) job.stats.firstResultMs = Date.now() - job.stats.started;
            job.stats.results = data.Results.length; job.stats.pending = job.pending; if (!job.pending) job.stats.settledMs = Date.now() - job.stats.started;
            job.subscribers.forEach(function (sub) { if (!data.parser_pending || sub.streaming) sub.done(data); });
        }
        // Native jackett() uses one private shared Reguest and exposes no abort handle.
        // Keep its wire/result contract here, but own a Reguest per queued slot.
        function jackett(params, slot, ok, fail) {
            var request=slot.request=new L.Reguest(), movie=params.movie||{}, spec=slot.spec;
            var args=[{name:'apikey',value:spec.key||''},{name:'Query',value:params.search||''}];
            if(!params.from_search){
                if(!params.clarification){args.push({name:'title',value:movie.title||''},{name:'title_original',value:movie.original_title||''});}
                args.push({name:'year',value:String(movie.first_air_date||movie.release_date||'0000').slice(0,4)},{name:'is_serial',value:movie.original_name?'2':params.other?'0':'1'},{name:'genres',value:(movie.genres||[]).map(function(g){return g.name;}).join(',')});
                if(!params.global)args.push({name:'Category[]',value:(movie.number_of_seasons>0?'5000':'2000')+(/^(ja|zh)$/.test(movie.original_language||'')&&(movie.genres||[]).some(function(g){return g.id===16;})?',5070':'')});
            }
            var base=spec.url.replace(/\/+$/,''), index=L.Storage.field('jackett_interview')==='healthy'?'status:healthy':'all';
            request.timeout(slot.timeout);
            request.native(L.Utils.buildUrl(base,'/api/v2.0/indexers/'+index+'/results',args),function(data){
                if(!data||!Array.isArray(data.Results)||data.Results.some(function(row){return !row||typeof row.Title!=='string';}))return fail('invalid');
                ok({Results:data.Results.map(function(raw){var row=clone(raw);row.PublisTime=L.Utils.strToTime(row.PublishDate);row.hash=L.Utils.hash(row.Title);row.viewed=L.Storage.cache('torrents_view',5000,[]).indexOf(row.hash)>=0;if(L.Utils.bytesToSize)row.size=L.Utils.bytesToSize(row.Size);row.checked_at=Date.now();row.source_rank=spec.id==='primary'?0:1;return row;})});
            },function(xhr){fail(xhr&&xhr.status===429?'rate-limit':xhr&&xhr.status>=500?'server-error':'network');});
        }
        function prowlarr(params, slot, ok, fail) {
            var request = slot.request = new L.Reguest(), spec = slot.spec, movie = params.movie || {};
            var args = [{ name: 'apikey', value: spec.key || '' }, { name: 'query', value: params.search || '' }];
            if (!params.from_search) {
                args.push({ name: 'type', value: movie.original_name ? 'tvsearch' : 'search' });
                if (!params.global) args.push({ name: 'categories', value: movie.number_of_seasons > 0 ? '5000' : '2000' });
                if (!params.global && /^(ja|zh)$/.test(movie.original_language || '') && (movie.genres || []).some(function (g) { return g.id === 16; })) args.push({ name: 'categories', value: '5070' });
            }
            var url = L.Utils.buildUrl(spec.url, '/api/v1/search', args);
            request.timeout(slot.timeout);
            request.native(url, function (data) {
                if (!Array.isArray(data)) return fail('invalid');
                ok({ Results: data.filter(function (r) { return r.protocol === 'torrent'; }).map(function (r) {
                    var item = clone(r), titleHash = L.Utils.hash(r.title);
                    item.Title = r.title; item.Tracker = r.indexer; item.Size = r.size; item.Seeders = parseInt(r.seeders, 10); item.Peers = parseInt(r.leechers, 10);
                    item.MagnetUri = r.magnetUrl || r.magnetUri || r.downloadUrl; item.Link = r.downloadUrl; item.InfoHash = r.infoHash;
                    item.PublishDate = L.Utils.strToTime(r.publishDate); item.PublisTime = item.PublishDate; item.hash = titleHash;
                    item.viewed = L.Storage.cache('torrents_view', 5000, []).indexOf(titleHash) >= 0; item.source_rank = spec.id === 'primary' ? 0 : 1;
                    item.AudioLanguages = r.AudioLanguages || r.audioLanguages || r.audio_languages;
                    item.AudioTracks = r.AudioTracks || r.audioTracks || r.audio_tracks;
                    item.SubtitleLanguages = r.SubtitleLanguages || r.subtitleLanguages || r.subtitle_languages;
                    item.VoiceoverStudio = r.VoiceoverStudio || r.voiceoverStudio || r.voiceover_studio;
                    item.VoiceoverType = r.VoiceoverType || r.voiceoverType || r.voiceover_type;
                    item.parser_original = r; return item;
                }) });
            }, function (xhr) { fail(xhr && xhr.status === 429 ? 'rate-limit' : xhr && xhr.status >= 500 ? 'server-error' : 'network'); });
        }
        function search(params, done, fail, nativeGet) {
            var configured = sources();
            if (configured == null) return nativeGet(params, done, fail);
            var account = L.Account && L.Account.Permit && L.Account.Permit.account || {};
            var scope = JSON.stringify([account.id, account.profile && account.profile.id]);
            // Alias fallbacks use at most four healthy responders from this owner's initial wave.
            // This bounds multilingual work instead of multiplying every alias by the catalog.
            if (params.clarification && params.torrent_search_owner && active && active.owner === params.torrent_search_owner && active.scope === scope) {
                var healthy = active.slots.filter(function(slot){return slot.status === 'ready' || slot.status === 'empty';}).map(function(slot){return specKey(slot.spec);});
                configured = configured.filter(function(spec){return healthy.indexOf(specKey(spec)) >= 0;}).slice(0,4);
            }
            var queryKey = scope + JSON.stringify([params.search, params.from_search, params.clarification, params.global, params.movie, params.params, params.season, params.episode]);
            var allKey = configured.map(specKey).join('|') + queryKey;
            if (active && !active.dead && active.pending && active.key === allKey) { active.subscribers.push({ done: done, fail: fail, streaming: !!params.parser_streaming }); if (params.parser_streaming && merged(active).length) done(snapshot(active)); return; }
            cancel();
            var cap = Math.max(1, Math.min(6, Math.floor(Number(L.Storage.field('parser_auto_concurrency'))) || 4));
            var job = active = { key: allKey, scope: scope, owner: params.torrent_search_owner || params, epoch: epoch, dead: false, slots: configured.map(function (spec) { return { spec: spec, status: 'queued', rows: [] }; }), pending: configured.length, running: 0, cursor: 0, pumping: false, subscribers: [{ done: done, fail: fail, streaming: !!params.parser_streaming }], stats: { started: Date.now(), requests: 0, peakConcurrency: 0, cacheHits: 0, firstResultMs: null, results: 0, pending: configured.length } }; lastStats = job.stats;
            if (job.slots.length && job.slots.every(function(slot){var entry=read(specKey(slot.spec)+queryKey);return entry&&entry.expires>Date.now();})) {
                job.slots.forEach(function(slot){slot.rows=memo[specKey(slot.spec)+queryKey].rows;slot.status=slot.rows.length?'ready':'empty';});
                job.pending=0;job.stats.cacheHits=job.slots.length;emit(job);return;
            }
            var runs = Object.create(null);
            function pump() {
                if (job.pumping || job.dead || job.epoch !== epoch) return;
                job.pumping = true;
                while (job.running < cap && job.cursor < job.slots.length && !job.dead) start(job.slots[job.cursor++]);
                job.pumping = false;
                if (!job.pending) emit(job);
            }
            function start(slot) {
                var key = specKey(slot.spec) + queryKey, cached = read(key), finished = false, running = false;
                slot.timeout = Math.max(500, Math.min(15000, (Number(L.Storage.field('parse_timeout')) || 10) * 1000));
                function complete(data, error) {
                    if (finished || job.dead || job.epoch !== epoch) return; finished = true; clearTimeout(slot.timer);
                    if (!error && (!data || !Array.isArray(data.Results) || data.Results.some(function (r) { return !r || typeof r.Title !== 'string'; }))) error = 'invalid';
                    slot.status = error || (data.Results.length ? 'ready' : 'empty');
                    if (!error) { slot.rows = data.Results.map(clone); if (!cached || cached.expires <= Date.now()) put(key, slot.rows); }
                    else if (error !== 'cooldown' && error !== 'unsupported') cooldown[specKey(slot.spec)] = Date.now() + 5000;
                    if (running) job.running--;
                    job.pending--;
                    if (job.pending) emit(job);
                    pump();
                }
                if (slot.spec.type !== 'jackett' && slot.spec.type !== 'prowlarr' || !/^https?:\/\//i.test(slot.spec.url || '') || window.location && window.location.protocol === 'https:' && /^http:/i.test(slot.spec.url)) { complete(null, 'unsupported'); return; }
                if (cached && cached.expires > Date.now()) { job.stats.cacheHits++; complete({ Results: cached.rows }); return; }
                if (cooldown[specKey(slot.spec)] > Date.now()) { complete(null, 'cooldown'); return; }
                if (runs[key]) { runs[key].push(complete); return; }
                runs[key] = [complete]; running = true; job.running++; slot.status = 'loading';
                job.stats.peakConcurrency = Math.max(job.stats.peakConcurrency, job.running);
                function reply(data, error) { if(slot.expiring)error='timeout'; var callbacks = runs[key]; if (!callbacks) return; delete runs[key]; callbacks.forEach(function (callback) { callback(data, error); }); }
                slot.timer = setTimeout(function () { slot.expiring=true; if (slot.request) slot.request.clear(); reply(null, 'timeout'); }, slot.timeout);
                job.stats.requests++;
                try {
                    if (slot.spec.type === 'jackett') jackett(params,slot,function(data){reply(data);},function(error){reply(null,error);});
                    else prowlarr(params, slot, function (data) { reply(data); }, function (error) { reply(null, error); });
                } catch (e) { reply(null, 'invalid'); }
            }
            pump();
        }
        function installConsumer() {
            if (!L.Component || !L.Component.get || !L.Component.add) return;
            var Original = L.Component.get('torrents'); if (typeof Original !== 'function' || Original.__parserStreaming) return;
            function Streaming(object) {
                var child = new Original(object), build = child.build, parse = child.parse, seen = false;
                child.parse = function () {
                    var get = L.Parser.get, delivered = false;
                    L.Parser.get = function (params, done, fail) { params.parser_streaming = true; return get.call(this, params, function (data) {
                        var toggle = child.activity.toggle, late = delivered; delivered = true;
                        if (late) child.activity.toggle = function () {};
                        try { done(data); } finally { child.activity.toggle = toggle; }
                        var root = child.render()[0], status = root.querySelector('.parser-search-status');
                        if (!status) { status = document.createElement('div'); status.className = 'parser-search-status'; status.setAttribute('role', 'status'); var filter = root.querySelector('.torrent-filter'); if (filter) filter.appendChild(status); }
                        var states=data.parser_status||[],ready=states.filter(function(s){return s.status==='ready'||s.status==='empty';}).length,pending=states.filter(function(s){return s.status==='loading'||s.status==='queued';}).length;
                        status.textContent = 'Джерела: '+ready+'/'+states.length+' · очікують: '+pending+' · недоступні: '+(states.length-ready-pending);
                    }, fail); };
                    try { return parse.apply(child, arguments); } finally { L.Parser.get = get; }
                };
                child.build = function () {
                    var root = child.render()[0], focused = root.querySelector('.torrent-item.focus'), key = focused && focused.getAttribute('data-parser-release-key');
                    var pages = Math.min(15, Number(object.page) || 1);
                    if (seen) { child.reset(); object.page = 1; }
                    var result = build.apply(child, arguments);
                    if (seen) for (var page = 1; page < pages; page++) child.next();
                    seen = true;
                    if (key) { var candidates = root.querySelectorAll('[data-parser-release-key]'); for (var i = 0; i < candidates.length; i++) if (candidates[i].getAttribute('data-parser-release-key') === key) { L.Controller.collectionSet(root); L.Controller.collectionFocus(candidates[i], root); break; } }
                    return result;
                };
                return child;
            }
            Streaming.__parserStreaming = true; L.Component.add('torrents', Streaming);
        }
        if (L.Account && L.Account.listener && L.Account.listener.follow) L.Account.listener.follow('profile_select',cancel);
        if (L.Storage.listener && L.Storage.listener.follow) L.Storage.listener.follow('change', function (event) {
            if (/^(parser_|jackett_|prowlarr_|ps_|bat_|account|profile)/.test(event.name || '')) cancel();
        });
        installConsumer();
        if (L.Listener && L.Listener.follow) L.Listener.follow('torrent', function (event) {
            if (event.type !== 'render' || !event.element || !event.element.parser_sources) return;
            var node = event.item[0] || event.item, element = event.element;
            node.setAttribute('data-parser-release-key', element.parser_release_key);
            var label = document.createElement('span'); label.className = 'parser-provenance'; label.textContent = element.parser_sources.map(function (s) { return s.label; }).join(' + ');
            var host = node.querySelector('.torrent-item__tracker') || node; host.appendChild(label);
        });
        var api = { search: search, cancel: cancel, stats: function () { return lastStats; }, identity: identity, retry: function(){cancel();cooldown=Object.create(null);} };
        if (!window.LampaTorrentSearch) {
            var originalGet = L.Parser.get, originalClear = L.Parser.clear;
            var get = function (params, done, fail) { return search(params, done, fail, function (p, ok, no) { return originalGet.call(L.Parser, p, ok, no); }); }; get.__parserCoordinator = true;
            L.Parser.get = get; L.Parser.clear = function () { if (!cancel()) return originalClear.apply(this, arguments); };
        }
        return api;
    };
})();
