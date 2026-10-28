/* Home rows: native playback positions and confirmed Trakt truth are independent. */
(function () {
    'use strict';
    if (window.LampaHomeHistory) return;
    var L = window.Lampa, timer = null, hooks = [], installed = false, policy = null;
    var contentBatch = null, currentContentBatch = null, contentRevision = 0, rowSnapshot = null;
    var entryUrl = document.currentScript && document.currentScript.src;
    var titles = { resume: 'Продовжити перегляд', watched: 'Переглянуто', rated: 'Мої оцінки · Trakt' };
    var lists = ['history', 'viewed', 'look', 'continued', 'book', 'like', 'scheduled'];
    function tv(c) {
        var type = c.media_type || c.method || c.type;
        if (type === 'movie' || c.method === 'movie') return false;
        if (type === 'anime' && c.original_title && c.release_date && !c.original_name && !c.first_air_date) return false;
        return type === 'tv' || type === 'show' || type === 'anime' || !!(c.original_name || c.first_air_date || c.number_of_seasons);
    }
    function aliases(c) {
        var type = tv(c) ? 'tv:' : 'movie:', ids = c.ids || {}, out = [];
        function add(source, id) { if (id !== undefined && id !== null && String(id)) out.push(type + source + ':' + id); }
        add('tmdb', ids.tmdb || c.tmdb_id); add('trakt', ids.trakt); add('imdb', ids.imdb || c.imdb_id);
        var source = c.source || 'tmdb'; if (source === 'cub') source = 'tmdb';
        add(source, c.id); return out;
    }
    function candidates() {
        var groups = [], byAlias = Object.create(null);
        lists.forEach(function (name) {
            var cards; try { cards = L.Favorite.get({ type: name }) || []; } catch (e) { cards = []; }
            cards.forEach(function (c) {
                if (!c || !c.id) return;
                var keys = aliases(c), matches = [];
                keys.forEach(function (key) { var g = byAlias[key]; if (g && matches.indexOf(g) < 0) matches.push(g); });
                var group = matches[0] || { cards: [], keys: [] };
                if (!matches.length) groups.push(group);
                matches.slice(1).forEach(function (other) {
                    other.cards.forEach(function (card) { if (group.cards.indexOf(card) < 0) group.cards.push(card); });
                    other.keys.forEach(function (key) { if (group.keys.indexOf(key) < 0) group.keys.push(key); byAlias[key] = group; });
                    groups.splice(groups.indexOf(other), 1);
                });
                if (group.cards.indexOf(c) < 0) group.cards.push(c);
                keys.forEach(function (key) { byAlias[key] = group; if (group.keys.indexOf(key) < 0) group.keys.push(key); });
            });
        });
        return groups;
    }
    function scope() {
        if (L.Timeline && typeof L.Timeline.filename === 'function') return L.Timeline.filename();
        var permit = L.Account && L.Account.Permit;
        return 'file_view' + (permit && permit.sync && permit.account && permit.account.profile ? '_' + permit.account.profile.id : '');
    }
    function roads() {
        var value = L.Storage.get(scope(), {});
        if (typeof value === 'string') { try { value = JSON.parse(value); } catch (e) { return {}; } }
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }
    function linked(c) {
        var key = (tv(c) ? 'tv' : 'movie') + '_' + c.id, source = c.source || 'tmdb';
        if (source !== 'tmdb' && source !== 'cub') key = source + '_' + key;
        return key.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 64);
    }
    function progress(r) {
        if (!r || typeof r !== 'object') return null;
        var time = Number(r.time), duration = Number(r.duration), percent = Number(r.percent), updated = Number(r.updated);
        if (!isFinite(time) || time < 0) time = 0;
        if (!isFinite(duration) || duration < 0) duration = 0;
        if (r.percent === undefined || r.percent === null) percent = duration ? 100 * time / duration : NaN;
        if (!isFinite(percent) || percent < 0 || percent > 100) return null;
        return { percent: percent, time: time, duration: duration, updated: isFinite(updated) && updated > 0 ? updated : 0,
            complete: percent === 100 || duration > 0 && time >= duration,
            partial: percent > 0 && percent < 100 && !(duration > 0 && time >= duration) };
    }
    function watched(c) {
        // Reuse #7/#8. Do not infer watched or persist another watched cache.
        try { return window.TraktPlus && typeof window.TraktPlus.cachedWatched === 'function' ? window.TraktPlus.cachedWatched(c) : window.TraktPlus && typeof window.TraktPlus.isWatched === 'function' ? window.TraktPlus.isWatched(c) : null; }
        catch (e) { return null; }
    }
    function homeProgress(card) {
        try { return window.TraktPlus && typeof window.TraktPlus.cachedHomeProgress === 'function' ? window.TraktPlus.cachedHomeProgress(card) || {} : {}; }
        catch (e) { return {}; }
    }
    function cardFor(group) {
        var card = group.cards.find(function (c) { return c.source === 'tmdb' || c.source === 'cub' || !c.source; }) || group.cards[0];
        var result = Object.assign({}, card); // Keep native playback identity; aliases are for dedup only.
        result.media_type = tv(card) ? 'tv' : 'movie'; return result;
    }
    function schedule(card) {
        // Without a callback this public API only reads the already cached timetable.
        try { return L.TimeTable && L.TimeTable.get ? L.TimeTable.get(card) || [] : []; } catch (e) { return []; }
    }
    function readings(group, snapshot, names, index) {
        var found = [], seen = Object.create(null), keys = group.cards.map(linked);
        function add(hash, road, owner) {
            if (!road || typeof road !== 'object' || seen[hash] || road.card && keys.indexOf(road.card) < 0) return;
            seen[hash] = true; found.push({ hash: hash, road: road, owner: owner });
        }
        keys.forEach(function (key) { (index[key] || []).forEach(function (entry) { add(entry.hash, entry.road); }); });
        group.cards.forEach(function (c) {
            var episodes = tv(c) ? schedule(c) : [];
            [c.original_title, c.original_name, c.title, c.name].forEach(function (name) {
                if (!name || names[name] > 1) return;
                if (!tv(c)) { var hash = String(L.Utils.hash(name)); add(hash, snapshot[hash], c); return; }
                episodes.forEach(function (ep) {
                    var s = Number(ep.season_number), e = Number(ep.episode_number);
                    if (!(s > 0 && e > 0)) return;
                    var hash = String(L.Utils.hash([s, s > 10 ? ':' : '', e, name].join(''))), road = snapshot[hash];
                    if (road && typeof road === 'object') add(hash, Object.assign({}, road, { season: s, episode: e }), c);
                });
            });
        });
        return found;
    }
    function newer(old, next) {
        if (!old || old.progress.updated < next.progress.updated) return next;
        // With no ordering evidence, do not resurrect a reset/completed position.
        if (old.progress.updated === next.progress.updated && (next.progress.complete || next.progress.percent === 0)) return next;
        return old;
    }
    function episodeEvidence(entries) {
        var byEpisode = Object.create(null);
        entries.forEach(function (entry) {
            var s = Number(entry.road.season), e = Number(entry.road.episode), p = progress(entry.road);
            if (!p || !(s > 0 && e > 0)) return;
            var key = s + ':' + e;
            byEpisode[key] = newer(byEpisode[key], { entry: entry, progress: p });
        });
        return byEpisode;
    }
    function nextEpisode(card, evidence) {
        var now = Date.now(), any = false, updated = 0;
        var aired = schedule(card).filter(function (e) {
            return Number(e.season_number) > 0 && Number(e.episode_number) > 0 && e.air_date &&
                isFinite(Date.parse(e.air_date)) && Date.parse(e.air_date) <= now;
        }).sort(function (a, b) { return a.season_number - b.season_number || a.episode_number - b.episode_number; });
        for (var i = 0; i < aired.length; i++) {
            var ep = aired[i], item = evidence[ep.season_number + ':' + ep.episode_number];
            if (!item || !item.progress.complete) return any ? { season: ep.season_number, episode: ep.episode_number,
                mode: 'next_episode', positionKnown: false, label: 'Наступний епізод · позиція недоступна', updated: updated } : null;
            any = true; updated = Math.max(updated, item.progress.updated);
        }
        return null;
    }
    function annotate(card, resume) {
        var copy = Object.assign({}, card, { home_history_resume: resume, ydesign_row: 'cont', _trakt_cached_only: true });
        // Carry exact provider hash/position as metadata, never inject a guessed Timeline.
        // Native Full/source selection still owns playback and reads its own Timeline.
        if (!resume.positionKnown || resume.rewatch) {
            copy.params = Object.assign({}, card.params);
            copy.params.emit = Object.assign({}, copy.params.emit);
            ['onCreate', 'onVisible'].forEach(function (event) {
                var previous = copy.params.emit[event];
                copy.params.emit[event] = function () {
                    if (typeof previous === 'function') previous.apply(this, arguments);
                    var root = this.html && (this.html[0] || this.html);
                    if (!root || root.querySelector('.home-history-note')) return;
                    var label = document.createElement('div'); label.className = 'home-history-note';
                    label.style.cssText = 'font-size:.65em;opacity:.8;line-height:1.3;padding-top:.3em';
                    label.textContent = (resume.season ? 'S' + resume.season + ' E' + resume.episode + ' · ' : '') + resume.label;
                    root.appendChild(label);
                };
            });
        }
        return copy;
    }
    function buildRows() {
        var groups = candidates(), snapshot = roads(), names = Object.create(null), byLink = Object.create(null), result = { resume: [], watched: [] };
        Object.keys(snapshot).forEach(function (hash) {
            var road = snapshot[hash];
            if (road && typeof road === 'object' && road.card) (byLink[road.card] || (byLink[road.card] = [])).push({ hash: hash, road: road });
        });
        groups.forEach(function (g) {
            var unique = Object.create(null);
            g.cards.forEach(function (c) { [c.original_title, c.original_name, c.title, c.name].forEach(function (n) { if (n && !unique[n]) { names[n] = (names[n] || 0) + 1; unique[n] = true; } }); });
        });
        groups.forEach(function (group, index) {
            var card = cardFor(group), entries = readings(group, snapshot, names, byLink);
            var status = watched(card), remote = homeProgress(card);
            if (card.media_type === 'tv' && window.TraktPlus && typeof window.TraktPlus.refreshHomeProgress === 'function') {
                try { window.TraktPlus.refreshHomeProgress(card, schedule(card)); } catch (e) {}
            }
            if (status === true) result.watched.push(Object.assign({}, card, { _trakt_cached_only: true, home_history_watched_at: Number(remote.lastWatchedAt) || 0 }));
            var evidence = card.media_type === 'tv' ? episodeEvidence(entries) : {}, latest = null;
            if (card.media_type !== 'tv') entries.forEach(function (entry) { var p = progress(entry.road); if (p) latest = newer(latest, { entry: entry, progress: p }); });
            // Verified Trakt episodes supplement local predecessor evidence, never a playback position.
            if (card.media_type === 'tv' && status !== null) (Array.isArray(remote.episodes) ? remote.episodes : []).forEach(function (ep) {
                if (!(ep.season > 0 && ep.episode > 0 && ep.season % 1 === 0 && ep.episode % 1 === 0)) return;
                var key = ep.season + ':' + ep.episode, local = evidence[key], updated = Number(ep.watchedAt) || 0;
                if (!local || updated > 0 && updated >= local.progress.updated) evidence[key] = { progress: { complete: true, updated: updated } };
            });
            if (card.media_type === 'tv') {
                latest = null;
                Object.keys(evidence).forEach(function (key) { var item = evidence[key]; if (item.entry && item.progress.partial && (!latest || latest.progress.updated < item.progress.updated)) latest = item; });
            }
            var rewatch = status === true && latest && latest.progress.partial && latest.progress.time > 0 && Number(remote.lastWatchedAt) > 0 && latest.progress.updated > remote.lastWatchedAt;
            if (status === true && !rewatch) return;
            var resume;
            if (latest && latest.progress.partial && (latest.progress.time > 0 || card.media_type === 'tv')) {
                var p = latest.progress, road = latest.entry.road;
                resume = { mode: 'position', hash: latest.entry.hash, time: p.time, duration: p.duration, percent: p.percent, updated: p.updated,
                    positionKnown: p.time > 0, label: p.time > 0 ? 'Продовжити збережене відтворення' : 'Прогрес відомий · позиція недоступна' };
                if (card.media_type === 'tv') { resume.season = Number(road.season); resume.episode = Number(road.episode); }
            } else if (card.media_type === 'tv') {
                // A verified Trakt next episode may be newer than the local
                // timetable. It is an episode choice, never a playback timestamp.
                var next = remote.next;
                if (status === false && remote.episodes && remote.episodes.length && next && next.season > 0 && next.episode > 0 && next.airedAt > 0 && next.airedAt <= Date.now()) {
                    resume = { mode: 'next_episode', season: next.season, episode: next.episode, positionKnown: false,
                        updated: Math.max(Number(remote.lastWatchedAt) || 0, next.airedAt),
                        label: remote.newEpisodes > 0 ? '+' + remote.newEpisodes + ' нових · Trakt' : 'Наступний епізод · Trakt' };
                } else resume = nextEpisode(card, evidence);
            }
            if (resume) {
                if (rewatch) { resume.rewatch = true; resume.label = 'Повторний перегляд · збережена позиція'; }
                if (latest && resume.mode === 'position') {
                    var owner = group.cards.find(function (c) { return linked(c) === latest.entry.road.card; }) || latest.entry.owner;
                    if (owner) card = Object.assign({}, card, owner, { media_type: tv(owner) ? 'tv' : 'movie' });
                }
                result.resume.push({ card: annotate(card, resume), index: index, updated: resume.updated });
            }
        });
        result.resume.sort(function (a, b) { return b.updated - a.updated || a.index - b.index; });
        result.resume = result.resume.map(function (r) { return r.card; });
        result.watched.sort(function (a, b) { return b.home_history_watched_at - a.home_history_watched_at; }); return result;
    }
    function copyRows(rows) {
        function copyCard(card) {
            var copy = Object.assign({}, card);
            if (card.ids) copy.ids = Object.assign({}, card.ids);
            if (card.home_history_resume) copy.home_history_resume = Object.assign({}, card.home_history_resume);
            if (card.params) {
                copy.params = Object.assign({}, card.params);
                if (card.params.emit) copy.params.emit = Object.assign({}, card.params.emit);
            }
            return copy;
        }
        return { resume: rows.resume.map(copyCard), watched: rows.watched.map(copyCard) };
    }
    function buildRowsForRevision() {
        var currentScope = scope();
        if (rowSnapshot && rowSnapshot.revision === contentRevision && rowSnapshot.scope === currentScope) return copyRows(rowSnapshot.rows);
        rowSnapshot = { revision: contentRevision, scope: currentScope, rows: buildRows() };
        return copyRows(rowSnapshot.rows);
    }
    function node(line) { var el = line.render(true); return el && (el[0] || el); }
    function payload(kind, cards) {
        return { title: titles[kind] + ' (' + cards.length + ')', results: cards, home_history: kind, home_row_id: kind === 'rated' ? 'TraktPlusRated' : 'home_history_' + kind, home_row_origin: kind === 'rated' ? 'trakt' : 'history',
            params: { emit: { onCreate: function () { node(this).setAttribute('data-home-history', kind); } } } };
    }
    function paint(component, kind, cards) {
        var line = component.items.find(function (item) { return item.data && (item.data.home_history === kind || kind === 'rated' && item.data.home_row_id === 'TraktPlusRated'); });
        if (!line) {
            if (!cards.length) return;
            var fragment = component.fragment; component.fragment = document.createDocumentFragment();
            component.emit('createAndAppend', payload(kind, cards));
            component.scroll.append(component.fragment); component.fragment = fragment; return true;
        }
        var sig = function (items) { return JSON.stringify(items.map(function (c) { return [aliases(c), c.home_history_resume || null, c.home_history_watched_at || 0]; })); };
        var old = line.data.results || []; if (sig(old) === sig(cards)) return;
        var own = L.Controller && L.Controller.own && L.Controller.own(line), selected = old[line.active || 0], key = selected && aliases(selected)[0];
        if (!cards.length) {
            var index = component.items.indexOf(line); component.items.splice(index, 1); line.destroy();
            component.active = Math.max(0, Math.min(component.active - (index < component.active ? 1 : 0), component.items.length - 1));
            if (own && component.items[component.active]) component.items[component.active].toggle(); return true;
        }
        (line.items || []).forEach(function (item) { item.destroy(); });
        line.items = []; line.more = null; line.last = null; line.active = 0;
        line.data.results = cards; line.data.title = titles[kind] + ' (' + cards.length + ')';
        var title = node(line).querySelector('.items-line__title'); if (title) title.textContent = line.data.title;
        var selectedIndex = key ? cards.findIndex(function (c) { return aliases(c)[0] === key; }) : 0;
        cards.slice(0, Math.max(line.view || 7, selectedIndex + 1)).forEach(function (card) { line.emit('createAndAppend', card); });
        line.active = Math.max(0, selectedIndex); if (line.items[line.active]) line.last = line.items[line.active].render(true);
        if (own) line.toggle(); if (L.Layer) L.Layer.visible(line.render(true));
        return true;
    }
    function refresh() {
        timer = null;
        var active = L.Activity && L.Activity.active(), component = active && active.activity && active.activity.component;
        if (!active || active.component !== 'main' || !component || !Array.isArray(component.items) || !component.emit) return;
        if (!hooks.some(function (r) { return r.component === component; }) && component.use) {
            var record = { component: component, hook: { onBuild: queue, onAppend: queue, onDestroy: function () { hooks.splice(hooks.indexOf(record), 1); } } };
            hooks.push(record); component.use(record.hook);
        }
        var rows = buildRowsForRevision(), changed = false;
        ['resume', 'watched'].forEach(function (kind) { if (paint(component, kind, rows[kind])) changed = true; });
        if (window.TraktPlus && typeof window.TraktPlus.cachedRatedCards === 'function') {
            var rated = window.TraktPlus.cachedRatedCards();
            if (Array.isArray(rated) && paint(component, 'rated', rated)) changed = true;
        }
        if (policy) policy.apply(component);
        if (changed) component.emit('homeHistoryChanged');
    }
    function queue() { contentRevision++; rowSnapshot = null; if (currentContentBatch) currentContentBatch.rows = null; if (!timer) timer = setTimeout(refresh, 120); }
    function install() {
        if (installed || !L || !L.ContentRows || !L.ContentRows.call) return;
        installed = true; window.LampaHomeHistory.active = true; var originalCall = L.ContentRows.call;
        // One registry boundary owns history replacement, core provenance and row metadata.
        var originalAdd = L.ContentRows.add;
        L.ContentRows.add = function (row) { if (policy) policy.register(row); return originalAdd.apply(this, arguments); };
        L.ContentRows.call = function (screen, params, calls) {
            if (screen !== 'main') return originalCall.apply(this, arguments);
            if (policy) policy.prepare(calls);
            if (currentContentBatch) currentContentBatch.rows = null;
            var previousBatch = contentBatch;
            var batch = { revision: contentRevision, scope: scope(), rows: null, remaining: 0 };
            contentBatch = batch; currentContentBatch = batch;
            var previous = calls.slice();
            try { originalCall.apply(this, arguments); }
            finally { contentBatch = previousBatch; }
            for (var i = calls.length - 1; i >= 0; i--) {
                var callback = calls[i]; if (typeof callback !== 'function') continue;
                var wrapped = policy ? policy.wrap(callback, previous.indexOf(callback) < 0) : callback;
                if (wrapped) calls[i] = wrapped; else calls.splice(i, 1);
            }
        };
        ['resume', 'watched'].forEach(function (kind, i) {
            L.ContentRows.add({ name: 'home_history_' + kind, title: titles[kind], index: 2 + i, screen: ['main'], call: function () {
                var batch = contentBatch;
                if (batch) batch.remaining++;
                return function (callback) {
                    var rows = batch && batch === currentContentBatch && batch.revision === contentRevision && batch.scope === scope() ? (batch.rows || (batch.rows = buildRowsForRevision())) : buildRows();
                    try { callback(payload(kind, rows[kind])); }
                    finally { if (batch && --batch.remaining <= 0) { batch.rows = null; if (batch === currentContentBatch) currentContentBatch = null; } }
                };
            } });
        });
        L.Listener.follow('activity', queue);
        L.Listener.follow('state:changed', function (e) { if (e && /^(timeline|favorite|timetable)$/.test(e.target || e.name || '')) queue(); });
        if (L.Timeline && L.Timeline.listener) { L.Timeline.listener.follow('update', queue); L.Timeline.listener.follow('read', queue); }
        if (L.Favorite && L.Favorite.listener) ['add', 'added', 'remove', 'read'].forEach(function (name) { L.Favorite.listener.follow(name, queue); });
        if (L.Storage.listener) L.Storage.listener.follow('change', function (e) { if (e && /^(trakt_|account|profile|file_view)/.test(e.name || '')) queue(); });
        document.addEventListener('traktplus:watched', queue);
        document.addEventListener('traktplus:ratings', queue);
        if (policy) { policy.install(); policy.bootstrap(); }
        queue();
    }
    function start() {
        function ready() {
            if (window.createHomeHistoryPolicy) policy = window.createHomeHistoryPolicy(L, { scope: scope, node: node, refresh: queue });
            window.LampaHomeHistory.policyReady = !!policy; install();
        }
        if (window.createHomeHistoryPolicy || !entryUrl || !document.head) return ready();
        var script = document.createElement('script');
        script.src = entryUrl.replace(/home-history\.js(?=\?|$)/, 'home-policy.js');
        script.onload = ready; script.onerror = function () { console.warn('Home policy unavailable; retaining history-only mode.'); ready(); };
        document.head.appendChild(script);
    }
    window.LampaHomeHistory = { version: '2.1.0', active: false, policyReady: false, buildRows: buildRows, refresh: queue,
        applyOrder: function (component) { if (policy) policy.apply(component); },
        policy: function () { return policy; } };
    if (window.appready) start(); else if (L && L.Listener) L.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
