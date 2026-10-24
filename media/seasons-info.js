(function () {
    'use strict';


    if (window.SeasonBadgePlugin && window.SeasonBadgePlugin.__initialized) return;
    window.SeasonBadgePlugin = window.SeasonBadgePlugin || {};
    window.SeasonBadgePlugin.__initialized = true;

    if (typeof window.Promise === 'undefined') {
        (function () {
            function SimplePromise(executor) {
                var self = this;
                self._state = 'pending';
                self._value = undefined;
                self._handlers = [];

                function fulfill(result) {
                    if (self._state !== 'pending') return;
                    self._state = 'fulfilled';
                    self._value = result;
                    runHandlers();
                }

                function reject(err) {
                    if (self._state !== 'pending') return;
                    self._state = 'rejected';
                    self._value = err;
                    runHandlers();
                }

                function runHandlers() {
                    setTimeout(function () {
                        var handlers = self._handlers.slice();
                        self._handlers = [];
                        for (var i = 0; i < handlers.length; i++) {
                            handle(handlers[i]);
                        }
                    }, 0);
                }

                function handle(handler) {
                    if (self._state === 'pending') {
                        self._handlers.push(handler);
                        return;
                    }

                    var cb = self._state === 'fulfilled' ? handler.onFulfilled : handler.onRejected;

                    if (!cb) {
                        if (self._state === 'fulfilled') {
                            handler.resolve(self._value);
                        } else {
                            handler.reject(self._value);
                        }
                        return;
                    }

                    try {
                        var ret = cb(self._value);
                        handler.resolve(ret);
                    } catch (e) {
                        handler.reject(e);
                    }
                }

                self.then = function (onFulfilled, onRejected) {
                    return new SimplePromise(function (resolve, reject) {
                        handle({
                            onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
                            onRejected: typeof onRejected === 'function' ? onRejected : null,
                            resolve: resolve,
                            reject: reject
                        });
                    });
                };

                self.catch = function (onRejected) {
                    return self.then(null, onRejected);
                };

                try {
                    executor(fulfill, reject);
                } catch (e) {
                    reject(e);
                }
            }

            window.Promise = SimplePromise;
        })();
    }

    if (typeof window.requestAnimationFrame === 'undefined') {
        window.requestAnimationFrame = function (cb) {
            return setTimeout(cb, 16);
        };
    }
    (function () {
        if (!Element.prototype.matches) {
            Element.prototype.matches =
                Element.prototype.msMatchesSelector ||
                Element.prototype.webkitMatchesSelector ||
                function (selector) {
                    var node = this;
                    var matches = (node.document || node.ownerDocument).querySelectorAll(selector);
                    var i = matches.length;
                    while (i-- > 0 && matches.item(i) !== node) { }
                    return i > -1;
                };
        }

        if (!Element.prototype.closest) {
            Element.prototype.closest = function (selector) {
                var el = this;
                while (el && el.nodeType === 1) {
                    if (el.matches(selector)) return el;
                    el = el.parentElement || el.parentNode;
                }
                return null;
            };
        }
    })();

    var safeStorage = (function () {
        var memoryStore = {};
        try {
            if (typeof window.localStorage !== 'undefined') {
                var testKey = '__season_test__';
                window.localStorage.setItem(testKey, '1');
                window.localStorage.removeItem(testKey);
                return window.localStorage;
            }
        } catch (e) {

        }

        return {
            getItem: function (k) {
                return memoryStore.hasOwnProperty(k) ? memoryStore[k] : null;
            },
            setItem: function (k, v) {
                memoryStore[k] = String(v);
            },
            removeItem: function (k) {
                delete memoryStore[k];
            }
        };
    })();

    function safeFetch(url) {
        if (typeof window.fetch === 'function') {
            return window.fetch(url);
        }

        return new Promise(function (resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        var status = xhr.status;
                        var respText = xhr.responseText;

                        var responseObj = {
                            ok: status >= 200 && status < 300,
                            status: status,
                            json: function () {
                                return new Promise(function (res, rej) {
                                    try {
                                        res(JSON.parse(respText));
                                    } catch (err) {
                                        rej(err);
                                    }
                                });
                            },
                            text: function () {
                                return new Promise(function (res) {
                                    res(respText);
                                });
                            }
                        };

                        if (status >= 200 && status < 300) {
                            resolve(responseObj);
                        } else {
                            reject(new Error('HTTP ' + status));
                        }
                    }
                };
                xhr.onerror = function () {
                    reject(new Error('Network error'));
                };
                xhr.send(null);
            } catch (err) {
                reject(err);
            }
        });
    }

    var NativeMutationObserver = window.MutationObserver ||
        window.WebKitMutationObserver ||
        window.MozMutationObserver;

    function createObserver(callback) {
        if (NativeMutationObserver) {
            return new NativeMutationObserver(callback);
        }
        return {
            observe: function () { /* no-op */ },
            disconnect: function () { /* no-op */ }
        };
    }

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
            if (!list) {
                var descriptorKey = String(movie.id);
                if (descriptors[descriptorKey]) { descriptors[descriptorKey].push(function (data) { retry(data); }); return; }
                descriptors[descriptorKey] = [retry];
                function retry(data) {
                    if (!data || String(data.id) !== String(movie.id) || !seasons(data)) return done({});
                    var verified = copy(movie); verified.seasons = seasons(data);
                    source.seasons(verified, from, done);
                }
                function descriptorDone(data) { var callbacks = descriptors[descriptorKey]; delete descriptors[descriptorKey]; callbacks.forEach(function (callback) { callback(data); }); }
                return source.get('tv/' + movie.id, {}, descriptorDone, function () { descriptorDone(null); });
            }
            (from || []).forEach(function (n) { if (integer(n) && numbers.indexOf(Number(n)) < 0 && (!list || list.some(function (s) { return Number(s.season_number) === Number(n); }))) numbers.push(Number(n)); });
            if (!numbers.length) return done({});
            var language = L.Storage && L.Storage.field ? L.Storage.field('tmdb_lang') : '';
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
                        return { title: n === 0 ? (season.name || 'Спеціальні випуски') + ' · S0' : label + (season.name && season.name !== label ? ' · ' + season.name : ''), season: String(n), selected: Number(active.season) === n };
                    });
                }
                return originalSelect.call(this, options);
            };
        }
        window.SeasonBadgePlugin.integrity = { seasons: seasons, restore: restore };
    }
    installSeasonIntegrity(window.Lampa);

    var CONFIG = {
        tmdbApiKey: '',
        cacheTime: 23 * 60 * 60 * 1000,
        enabled: true,                 
        language: 'uk',
        badgeView: 'standard'
    };

    function tmdbGet(tvId, resolve, reject) {
        try {
            if (window.Lampa && Lampa.Api && Lampa.Api.sources && Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.get) {
                Lampa.Api.sources.tmdb.get('tv/' + tvId, { language: CONFIG.language }, resolve, reject);
                return;
            }
            if (window.Lampa && Lampa.TMDB) {

                if (typeof Lampa.TMDB.tv === 'function') {
                    Lampa.TMDB.tv(
                        tvId,
                        function (data) {
                            resolve(data);
                        },
                        function (err) {
                            reject(err || new Error('TMDB error via Lampa.TMDB.tv'));
                        },
                        { language: CONFIG.language }
                    );
                    return;
                }

                if (typeof Lampa.TMDB.get === 'function') {
                    Lampa.TMDB.get(
                        'tv/' + tvId,
                        {
                            language: CONFIG.language,
                            api_key: CONFIG.tmdbApiKey
                        },
                        function (data) {
                            resolve(data);
                        },
                        function (err) {
                            reject(err || new Error('TMDB error via Lampa.TMDB.get'));
                        }
                    );
                    return;
                }
            }
        } catch (e) {

        }

        var url =
            'https://api.themoviedb.org/3/tv/' + tvId +
            '?api_key=' + CONFIG.tmdbApiKey +
            '&language=' + CONFIG.language;

        safeFetch(url)
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                resolve(data);
            })
            .catch(function (err) {
                reject(err);
            });
    }

    var style = document.createElement('style');
    style.textContent =
        "    .card--season-complete {\n" +
        "        position: absolute;\n" +
        "        left: 0;\n" +
        "        margin-left: -0.65em;\n" +
        "        bottom: 2.4em;\n" +
        "        background-color: rgba(61, 161, 141, 0.9);\n" +
        "        z-index: 12;\n" +
        "        width: fit-content;\n" +
        "        max-width: calc(100% - 1em);\n" +
        "        border-radius: 0.3em 0.3em 0.3em 0.3em;\n" +
        "        overflow: hidden;\n" +
        "        opacity: 0;\n" +
        "        transition: opacity 0.22s ease-in-out;\n" +
        "    }\n" +
        "\n" +
        "    .card--season-progress {\n" +
        "        position: absolute;\n" +
        "        left: 0;\n" +
        "        margin-left: -0.65em;\n" +
        "        bottom: 2.4em;\n" +
        "        background-color: rgba(255, 66, 66, 1);\n" +
        "        z-index: 12;\n" +
        "        width: fit-content;\n" +
        "        max-width: calc(100% - 1em);\n" +
        "        border-radius: 0.3em 0.3em 0.3em 0.3em;\n" +
        "        overflow: hidden;\n" +
        "        opacity: 0;\n" +
        "        transition: opacity 0.22s ease-in-out;\n" +
        "    }\n" +
        "\n" +
        "    .card--season-complete div,\n" +
        "    .card--season-progress div {\n" +
        "        text-transform: uppercase;\n" +
        "        font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif;  \n" +
        "        font-weight: 600;\n" +
        "        font-size: 0.9em;\n" +
        "        padding: 0.39em 0.39em;\n" +
        "        white-space: nowrap;\n" +
        "        display: flex;\n" +
        "        align-items: center;\n" +
        "        gap: 4px;\n" +
        "        text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3);\n" +
        "    }\n" +
        "\n" +
        "    .card--season-complete div {\n" +
        "        color: #ffffff;\n" +
        "    }\n" +
        "\n" +
        "    .card--season-progress div {\n" +
        "        color: #ffffff;\n" +
        "    }\n" +
        "\n" +
        "    .card--season-complete.show,\n" +
        "    .card--season-progress.show {\n" +
        "        opacity: 1;\n" +
        "    }\n" +
        "\n" +
        "    @media (max-width: 768px) {\n" +
        "        .card--season-complete div,\n" +
        "        .card--season-progress div {\n" +
        "            font-size: 0.80em;\n" +
        "            padding: 0.35em 0.40em;\n" +
        "        }\n" +
        "    }\n" +
        "\n" +
        "    .card--season-alt {\n" +
        "        left: 0.7em !important;\n" +
        "        margin-left: 0 !important;\n" +
        "        border-radius: 0.6em !important;\n" +
        "    }\n" +
        "\n" +
        "    .card--season-alt div {\n" +
        "        letter-spacing: 0.05em !important;\n" +
        "    }\n" +
        "\n" +
        "    .card--season-complete.card--season-alt div {\n" +
        "        padding: 0.29em 0.8em !important;\n" +
        "    }\n" +
        "\n" +
        "    .card--season-progress.card--season-alt div {\n" +
        "        padding: 0.29em 0.5em !important;\n" +
        "    }\n";
    document.head.appendChild(style);

    function getMediaType(cardData) {
        if (!cardData) return 'unknown';
        if (cardData.name || cardData.first_air_date) return 'tv';
        if (cardData.title || cardData.release_date) return 'movie';
        return 'unknown';
    }

    var cacheRaw = safeStorage.getItem('seasonBadgeCache_v2') || '{}';
    var cache;
    try {
        cache = JSON.parse(cacheRaw) || {};
    } catch (e) {
        cache = {};
    }

    var inFlight = {};
    function fetchSeriesData(tmdbId) {
        var key = CONFIG.language + ':' + tmdbId;
        if (inFlight[key]) return inFlight[key];
        var pending = new Promise(function (resolve, reject) {
            var now = (new Date()).getTime(), entry = cache[key];
            if (entry && entry.data && now - entry.timestamp < CONFIG.cacheTime) { resolve(entry.data); return; }
            tmdbGet(tmdbId, function (data) {
                if (!data || String(data.id) !== String(tmdbId) || !Array.isArray(data.seasons) || data.success === false) { reject(new Error('Invalid TMDB series metadata')); return; }
                cache[key] = { data: data, timestamp: now };
                var keys = Object.keys(cache).sort(function (a, b) { return cache[b].timestamp - cache[a].timestamp; });
                keys.slice(250).forEach(function (old) { delete cache[old]; });
                try { safeStorage.setItem('seasonBadgeCache_v2', JSON.stringify(cache)); } catch (e) {}
                resolve(data);
            }, reject);
        });
        inFlight[key] = pending;
        function settled() { if (inFlight[key] === pending) delete inFlight[key]; }
        pending.then(settled, settled);
        return pending;
    }

    function getSeasonProgress(tmdbData) {
        if (!tmdbData || !tmdbData.seasons || !tmdbData.last_episode_to_air) return false;
        var lastEpisode = tmdbData.last_episode_to_air;
        var currentSeason = null;
        for (var i = 0; i < tmdbData.seasons.length; i++) {
            var s = tmdbData.seasons[i];
            if (s.season_number === lastEpisode.season_number && s.season_number > 0) {
                currentSeason = s;
                break;
            }
        }

        if (!currentSeason) return false;
        var totalEpisodes = currentSeason.episode_count || 0;
        var airedEpisodes = lastEpisode.episode_number || 0;
        if (totalEpisodes <= 0 || airedEpisodes <= 0) return false;

        return {
            seasonNumber: lastEpisode.season_number,
            airedEpisodes: airedEpisodes,
            totalEpisodes: totalEpisodes,
            isComplete: airedEpisodes >= totalEpisodes
        };
    }

    function createBadge(content, isComplete, loading) {
        var badge = document.createElement('div');
        var badgeClass = isComplete ? 'card--season-complete' : 'card--season-progress';
        if (CONFIG.badgeView === 'alt') {
            badgeClass += ' card--season-alt';
        }
        badge.className = badgeClass + (loading ? ' loading' : '');
        badge.innerHTML = '<div>' + content + '</div>';

        return badge;
    }

    function adjustBadgePosition(cardEl, badge) {
        if (!cardEl || !badge) return;
        var quality = cardEl.querySelector('.card__quality');

        if (quality) {
            var qHeight = quality.offsetHeight;
            var qBottom = 0;
            if (window.getComputedStyle) {
                var styleVal = window.getComputedStyle(quality).bottom;
                if (styleVal) {
                    qBottom = parseFloat(styleVal) || 0;
                }
            }
            badge.style.bottom = (qHeight + qBottom) + 'px';
        } else {

            badge.style.bottom = '2.4em';
        }
    }

    function updateBadgePositions(cardEl) {
        if (!cardEl) return;
        var badgesNodeList = cardEl.querySelectorAll('.card--season-complete, .card--season-progress');
        var badgesArr = Array.prototype.slice.call(badgesNodeList, 0);
        for (var i = 0; i < badgesArr.length; i++) {
            adjustBadgePosition(cardEl, badgesArr[i]);
        }
    }

    var qualityObserver = createObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var mutation = mutations[i];
            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var addedNode = mutation.addedNodes[j];
                    if (addedNode.classList && addedNode.classList.contains('card__quality')) {
                        var parentCardA = addedNode.closest('.card');
                        if (parentCardA) {
                            setTimeout(
                                (function (cardCopyA) {
                                    return function () {
                                        updateBadgePositions(cardCopyA);
                                    };
                                })(parentCardA),
                                100
                            );
                        }
                    }
                }
            }

            if (mutation.removedNodes && mutation.removedNodes.length) {
                for (var k = 0; k < mutation.removedNodes.length; k++) {
                    var removedNode = mutation.removedNodes[k];
                    if (removedNode.classList && removedNode.classList.contains('card__quality')) {
                        var parentCardB = removedNode.closest('.card');
                        if (parentCardB) {
                            setTimeout(
                                (function (cardCopyB) {
                                    return function () {
                                        updateBadgePositions(cardCopyB);
                                    };
                                })(parentCardB),
                                100
                            );
                        }
                    }
                }
            }
        }
    });

    function addSeasonBadge(cardEl) {
        if (!cardEl) return;
        if (cardEl.hasAttribute('data-season-processed') && cardEl.__seasonData === cardEl.card_data) return;
        cardEl.__seasonData = cardEl.card_data;
        if (!cardEl.card_data) {
            if (!cardEl.__seasonRetry && document.documentElement.contains(cardEl)) {
                cardEl.__seasonRetry = true;
                requestAnimationFrame(function () { addSeasonBadge(cardEl); });
            }
            return;
        }

        var data = cardEl.card_data;
        if (getMediaType(data) !== 'tv') return;
        var view = cardEl.querySelector('.card__view');
        if (!view) return;
        var oldBadgesNodeList = view.querySelectorAll('.card--season-complete, .card--season-progress');
        var oldBadgesArr = Array.prototype.slice.call(oldBadgesNodeList, 0);
        for (var i = 0; i < oldBadgesArr.length; i++) {
            if (oldBadgesArr[i] && oldBadgesArr[i].parentNode) {
                oldBadgesArr[i].parentNode.removeChild(oldBadgesArr[i]);
            }
        }
        var badge = createBadge('...', false, true);
        view.appendChild(badge);
        adjustBadgePosition(cardEl, badge);
        try {
            qualityObserver.observe(view, {
                childList: true,
                subtree: true
            });
        } catch (e) {

        }

        cardEl.setAttribute('data-season-processed', 'loading');

        fetchSeriesData(data.id)
            .then(function (tmdbData) {
                if (cardEl.card_data !== data || !view.contains(badge)) return;
                var progressInfo = getSeasonProgress(tmdbData);

                if (progressInfo) {
                    var isComplete = progressInfo.isComplete;
                    var content = '';

                    if (isComplete) {
                        content = "S" + progressInfo.seasonNumber;
                    } else {
                        content =
                            "S" + progressInfo.seasonNumber + " " +
                            progressInfo.airedEpisodes + "/" +
                            progressInfo.totalEpisodes;
                    }

                    badge.className = isComplete ? 'card--season-complete' : 'card--season-progress';
                    if (CONFIG.badgeView === 'alt') {
                        badge.className += ' card--season-alt';
                    }
                    badge.innerHTML = '<div>' + content + '</div>';
                    adjustBadgePosition(cardEl, badge);
                    setTimeout(function () {
                        if (badge.classList) {
                            badge.classList.add('show');
                        } else {

                            badge.className += ' show';
                        }

                        adjustBadgePosition(cardEl, badge);
                    }, 50);

                    cardEl.setAttribute(
                        'data-season-processed',
                        isComplete ? 'complete' : 'in-progress'
                    );
                } else {

                    if (badge && badge.parentNode) {
                        badge.parentNode.removeChild(badge);
                    }
                    cardEl.setAttribute('data-season-processed', 'error');
                }
            })
            .catch(function (error) {

                try {
                    console.log('SeasonBadgePlugin помилка:', error && error.message ? error.message : error);
                } catch (eLog) { }

                if (badge && badge.parentNode) {
                    badge.parentNode.removeChild(badge);
                }
                cardEl.setAttribute('data-season-processed', 'error');
            });
    }

    var observer = createObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var mutation = mutations[i];

            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var node = mutation.addedNodes[j];

                    if (!node || node.nodeType !== 1) continue;

                    if (node.classList && node.classList.contains('card')) {
                        addSeasonBadge(node);
                    }

                    if (typeof node.querySelectorAll === 'function') {
                        var innerCardsNodeList = node.querySelectorAll('.card');
                        var innerCardsArr = Array.prototype.slice.call(innerCardsNodeList, 0);

                        for (var k = 0; k < innerCardsArr.length; k++) {
                            addSeasonBadge(innerCardsArr[k]);
                        }
                    }
                }
            }
        }
    });

    window.addEventListener('resize', function () {
        var allBadgesNodeList = document.querySelectorAll('.card--season-complete, .card--season-progress');
        var allBadgesArr = Array.prototype.slice.call(allBadgesNodeList, 0);

        for (var i = 0; i < allBadgesArr.length; i++) {
            var badge = allBadgesArr[i];
            var cardEl = badge.closest('.card');
            if (cardEl) {
                adjustBadgePosition(cardEl, badge);
            }
        }
    });

    var started = false;
    function initPlugin() {
        if (started || !CONFIG.enabled) return;
        started = true;
        installSeasonIntegrity(window.Lampa);

        var containersNodeList = document.querySelectorAll(
            '.cards, .card-list, .content, .main, .cards-list, .preview__list'
        );
        var containersArr = Array.prototype.slice.call(containersNodeList, 0);

        if (containersArr.length > 0) {
            for (var i = 0; i < containersArr.length; i++) {
                var containerEl = containersArr[i];
                try {
                    observer.observe(containerEl, {
                        childList: true,
                        subtree: true
                    });
                } catch (e) {

                    try {
                        observer.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                    } catch (e2) { }
                }
            }
        } else {

            try {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            } catch (e3) { }
        }

        var existingCardsNodeList = document.querySelectorAll('.card:not([data-season-processed])');
        var existingCardsArr = Array.prototype.slice.call(existingCardsNodeList, 0);

        for (var idx = 0; idx < existingCardsArr.length; idx++) {
            (function (card, delay) {
                setTimeout(function () {
                    addSeasonBadge(card);
                }, delay);
            })(existingCardsArr[idx], idx * 300);
        }
    }

    if (window.appready) {

        setTimeout(initPlugin, 0);
    } else if (window.Lampa && Lampa.Listener) {

        try {
            Lampa.Listener.follow('app', function (e) {
                if (e && e.type === 'ready') initPlugin();
            });
        } catch (e) {

            setTimeout(initPlugin, 2000);
        }
    } else {

        setTimeout(initPlugin, 2000);
    }

(function(){
  'use strict';

  var SETTINGS_KEY='sbadger_settings_v1';
  var st;

  function sbToast(msg){
    try{ if (Lampa && Lampa.Noty) return Lampa.Noty(msg); }catch(e){}
    var id='sbadger_toast', el=document.getElementById(id);
    if(!el){
      el=document.createElement('div');
      el.id=id;
      el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:2rem;padding:.6rem 1rem;background:rgba(0,0,0,.85);color:#fff;border-radius:.5rem;z-index:9999;font-size:14px;transition:opacity .2s;opacity:0';
      document.body.appendChild(el);
    }
    el.textContent=msg; el.style.opacity='1';
    setTimeout(function(){ el.style.opacity='0'; },1300);
  }

  function load(){ var s=Lampa.Storage.get(SETTINGS_KEY)||{}; return { tmdb_key: s.tmdb_key || '', badge_view: s.badge_view || 'standard' }; }
  function apply(){ if (st.tmdb_key) CONFIG.tmdbApiKey = String(st.tmdb_key).trim(); CONFIG.badgeView = st.badge_view || 'standard'; }
  function updateBadgesOnScreen() {
    var badges = document.querySelectorAll('.card--season-complete, .card--season-progress');
    for (var i = 0; i < badges.length; i++) {
      var b = badges[i];
      if (CONFIG.badgeView === 'alt') {
        if (b.className.indexOf('card--season-alt') === -1) {
          b.className += ' card--season-alt';
        }
      } else {
        b.className = b.className.replace(' card--season-alt', '').replace('card--season-alt', '');
      }
    }
  }

  function save(){ 
    Lampa.Storage.set(SETTINGS_KEY, st); 
    apply(); 
    updateBadgesOnScreen();
    sbToast('Збережено'); 
  }

  function clearCache(){
    try{
      if (safeStorage && safeStorage.removeItem) safeStorage.removeItem('seasonBadgeCache_v2');
      else if (window.localStorage) localStorage.removeItem('seasonBadgeCache_v2');
      cache = {};
    }catch(e){}
    sbToast('Кеш очищено');
  }

  Lampa.Template.add('settings_sbadger','<div></div>');

  function registerUI(){
    Lampa.SettingsApi.addParam({
      component:'interface',
      param:{ type:'button', component:'sbadger' },
      field:{ name:'Мітки прогресу серій/сезонів', description:'Налаштування бейджів прогресу серій та сезонів' },
      onChange:function(){
        Lampa.Settings.create('sbadger', {
          template:'settings_sbadger',
          onBack:function(){ Lampa.Settings.create('interface'); }
        });
      }
    });

    Lampa.SettingsApi.addParam({
      component:'sbadger',
      param:{ name:'sbadger_tmdb_key', type:'input', values:'', "default": (st.tmdb_key||'') },
      field:{ name:'TMDB API ключ', description:'Потрібен для отримання даних про сезони. Можна отримати на themoviedb.org' },
      onRender:function(item){ try{ $(item).find('input').attr('placeholder','встав ключ TMDB'); }catch(e){} },
      onChange:function(v){ st.tmdb_key = String(v||'').trim(); save(); }
    });

    Lampa.SettingsApi.addParam({
      component:'sbadger',
      param:{
        name: 'sbadger_badge_view',
        type: 'select',
        values: {
          'standard': 'Стандартний вигляд',
          'alt': 'Альтернативний вигляд'
        },
        "default": (st.badge_view || 'standard')
      },
      field:{ name:'Вигляд мітки', description:'Оберіть стиль відображення мітки на картці' },
      onChange: function(v){ 
        st.badge_view = v; 
        save(); 
      }
    });

    Lampa.SettingsApi.addParam({
      component:'sbadger',
      param:{ type:'button', component:'sbadger_clear_cache' },
      field:{ name:'Очистити кеш' },
      onChange: clearCache
    });
  }  
  var settingsStarted = false;
  function start(){ 
      if (settingsStarted) return; settingsStarted = true;
      st=load(); 
      apply(); 
      
      if (window.Lampa && Lampa.SettingsApi && Lampa.SettingsApi.addParam) {
          setTimeout(registerUI, 0); 
      }
  }
  
  if (window.appready) start();
  else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app', function(e){ if(e.type==='ready') start(); });
})();
 
})();
