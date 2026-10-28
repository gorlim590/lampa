(function () {
    'use strict';

    if (window.SeasonBadgePlugin && window.SeasonBadgePlugin.__initialized) return;
    window.SeasonBadgePlugin = window.SeasonBadgePlugin || {};
    window.SeasonBadgePlugin.__initialized = true;

    // Preserve provider identities: native date-gap splitting is not metadata.
    function installSeasonIntegrity(L) {
        if (!L || !L.Api || !L.Api.sources || !L.Api.sources.tmdb) return;
        if (window.SeasonBadgePlugin.integrity) return;
        function integer(value) { return value !== null && value !== '' && value !== undefined && isFinite(value) && Math.floor(Number(value)) === Number(value) && Number(value) >= 0; }
        function copy(value) { var out = {}; Object.keys(value || {}).forEach(function (key) { out[key] = value[key]; }); return out; }
        function seasons(movie) {
            if (!movie || !Array.isArray(movie.seasons)) return null;
            var byNumber = {};
            movie.seasons.forEach(function (season) {
                if (!season || !integer(season.season_number)) return;
                var number = Number(season.season_number), previous = byNumber[number];
                if (!previous) { byNumber[number] = copy(season); byNumber[number].season_number = number; }
                else Object.keys(season).forEach(function (key) { if (previous[key] == null) previous[key] = season[key]; });
            });
            return Object.keys(byNumber).map(function (key) { return byNumber[key]; }).sort(function (a, b) { return Number(a.season_number) - Number(b.season_number); });
        }
        function restore(data, number, movie) {
            if (!data || !Array.isArray(data.episodes)) return null;
            var original = data.episodes_original || data.episodes, seen = {}, result = copy(data);
            if (!Array.isArray(original)) return null;
            result.episodes = original.filter(function (episode) {
                if (!episode || !integer(episode.season_number) || Number(episode.season_number) !== number || !integer(episode.episode_number) || Number(episode.episode_number) < 1) return false;
                var key = String(episode.episode_number); if (seen[key]) return false; seen[key] = true; return true;
            }).map(copy).sort(function (a, b) { return Number(a.episode_number) - Number(b.episode_number); });
            if (original.length && !result.episodes.length) return null;
            delete result.episodes_original;
            var list = seasons(movie);
            result.seasons_count = list ? list.filter(function (s) { return Number(s.season_number) > 0; }).length : undefined;
            result.season_number = number;
            return result;
        }
        var source = L.Api.sources.tmdb, originalFull = source.full, originalSeasons = source.seasons;
        var requests = Object.create(null), descriptors = Object.create(null);
        source.seasons = function (movie, from, done) {
            var list = seasons(movie), numbers = [];
            var language = L.Storage && L.Storage.field ? L.Storage.field('tmdb_lang') : '';
            if (!list) {
                var descriptorKey = language + ':' + movie.id;
                var retry = function (data) {
                    if (!data || String(data.id) !== String(movie.id) || !seasons(data)) return done({});
                    var verified = copy(movie); verified.seasons = seasons(data);
                    source.seasons(verified, from, done);
                };
                if (descriptors[descriptorKey]) { descriptors[descriptorKey].push(retry); return; }
                var waiting = [retry]; descriptors[descriptorKey] = waiting;
                var descriptorDone = function (data) { if (descriptors[descriptorKey] !== waiting) return; delete descriptors[descriptorKey]; waiting.forEach(function (callback) { callback(data); }); };
                return source.get('tv/' + movie.id, {}, descriptorDone, function () { descriptorDone(null); });
            }
            (from || []).forEach(function (n) { if (integer(n) && numbers.indexOf(Number(n)) < 0 && (!list || list.some(function (s) { return Number(s.season_number) === Number(n); }))) numbers.push(Number(n)); });
            if (!numbers.length) return done({});
            var key = [movie.source || 'tmdb', movie.id, language, numbers.join(',')].join(':');
            if (requests[key]) { requests[key].push(done); return; }
            requests[key] = [done];
            var settled = false;
            function finish(data) {
                if (settled) return; settled = true;
                var clean = {};
                numbers.forEach(function (number) {
                    var value = data && data[number];
                    if (!value || Number(value.season_number) !== number) return;
                    var result = restore(value, number, movie); if (result) clean[number] = result;
                });
                var callbacks = requests[key]; delete requests[key];
                callbacks.forEach(function (callback) {
                    var isolated = {}; Object.keys(clean).forEach(function (n) { isolated[n] = copy(clean[n]); isolated[n].episodes = clean[n].episodes.map(copy); });
                    callback(isolated);
                });
            }
            try { return originalSeasons.call(this, movie, numbers, finish); }
            catch (e) { delete requests[key]; throw e; }
        };
        source.full = function (params, done, error) {
            var delivered = false, self = this, requestedId = params.id;
            return originalFull.call(this, params, function (data) {
                if (delivered) return; delivered = true;
                if (!data || !data.movie || params.method !== 'tv') return done(data);
                if (String(data.movie.id) !== String(requestedId)) { if (error) error(); return; }
                var result = copy(data), movie = copy(data.movie), list = seasons(movie);
                result.movie = movie; if (list) movie.seasons = list;
                var normal = list && list.filter(function (s) { return Number(s.season_number) > 0; });
                if (normal && normal.length) {
                    movie.number_of_seasons = normal.length;
                    var last = Number(normal[normal.length - 1].season_number);
                    result.episodes = data.episodes && Number(data.episodes.season_number) === last ? restore(data.episodes, last, movie) : null;
                    if (!result.episodes) return source.seasons.call(self, movie, [last], function (found) { result.episodes = found[last]; done(result); });
                } else if (data.episodes) result.episodes = restore(data.episodes, Number(data.episodes.season_number), movie);
                done(result);
            }, error);
        };
        // Keep the native episode page/controller. Correct only its season selector.
        if (L.Select && L.Select.show) {
            var originalSelect = L.Select.show;
            L.Select.show = function (options) {
                var active = L.Activity && L.Activity.active(), list = active && active.component === 'episodes' && seasons(active.card);
                if (list && list.length && options && options.items && options.items.length && options.items.every(function (item) { return item && integer(item.season); })) {
                    options = copy(options);
                    options.items = list.map(function (season) {
                        var n = Number(season.season_number), label = 'Сезон ' + n;
                        return { title: n === 0 ? (season.name || 'Спеціальні випуски') + ' · S0' : label + (season.name && season.name !== label ? ' · ' + season.name : ''), season: String(n), selected: Number(active.season == null ? list[list.length - 1].season_number : active.season) === n };
                    });
                }
                return originalSelect.call(this, options);
            };
        }
        window.SeasonBadgePlugin.integrity = { seasons: seasons, restore: restore };
    }
    function installWhenReady() {
        installSeasonIntegrity(window.Lampa);
    }

    installWhenReady();
    if (!window.appready) {
        if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('app', function (event) {
                if (event && event.type === 'ready') installWhenReady();
            });
        } else {
            setTimeout(installWhenReady, 2000);
        }
    }
})();
