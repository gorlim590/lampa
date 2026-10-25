/*
 * YDesign v3.4 — вертикальні TV-картки та наповнення для Stremio Hybrid.
 * Оригінальний плагін: yarikrazor-star/lmp (ydes.js); змінена збірка.
 * Постери, логотипи, внутрішні градієнти, метадані та локальний прогрес збережені.
 */
(function () {
    'use strict';

    if (window.YDesignLoaded) return;
    window.YDesignLoaded = true;
    window.YDesignVersion = '3.4.2';

    // =========================================================================
    // 1. КОНФІГУРАЦІЯ ТА ВЕКТОРНІ ІКОНКИ РЕЙТИНГІВ
    // =========================================================================
    var CONFIG = {
        name: 'YDesign',
        cacheTime: 7 * 24 * 60 * 60 * 1000,
        tmdbKey: function () {
            try {
                return (window.Lampa && Lampa.TMDB && Lampa.TMDB.key) ? (Lampa.TMDB.key() || '') : '';
            } catch (e) {
                return '';
            }
        }
    };

    var rateIcons = {
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://yarikrazor-star.github.io/lmp/mc.svg',
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        trakt: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Trakt.tv-favicon.svg',
        mdblist: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='%23ffffff'%3E%3Cpath d='M1.928.029A2.47 2.47 0 0 0 .093 1.673c-.085.248-.09.629-.09 10.33s.005 10.08.09 10.33a2.51 2.51 0 0 0 1.512 1.558l.276.108h20.237l.277-.108a2.51 2.51 0 0 0 1.512-1.559c.085-.25.09-.63.09-10.33s-.005-10.08-.09-10.33A2.51 2.51 0 0 0 22.395.115l-.277-.109L12.117 0C6.615-.004 2.032.011 1.929.029m7.48 8.067l2.123 2.004v1.54c0 .897-.02 1.536-.043 1.527s-.92-.845-1.995-1.86c-1.071-1.01-1.962-1.84-1.977-1.84s-.024 1.91-.024 4.248v4.25H4.911V6.085h1.188l1.183.006zm9.729 3.93v5.94h-2.63l-.01-4.25l-.013-4.25l-1.907 1.795a367 367 0 0 1-1.98 1.864c-.076.056-.08-.047-.08-1.489v-1.555l2.127-1.995l2.127-1.995l1.187-.005h1.184z'/%3E%3C/svg%3E",
        popcorn: 'https://yarikrazor-star.github.io/lmp/rt.svg',
        letterboxd: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Letterboxd_2023_logo.png'
    };

    // =========================================================================
    // 2. ДЕФОЛТНІ НАЛАШТУВАННЯ
    // =========================================================================
    var DefaultSettings = {
        ydesign_grid_items_v: '5',
        ydesign_card_gap: '0.8',
        ydesign_lazy_load: false,
        ydesign_perf_mode: 'auto',
        ydesign_ua_torrents: false,
        ydesign_ribbons: true,
        ydesign_watched_mark: true,
        ydesign_progress_marks: true,
        ydesign_collection_mark: true,
        ydesign_row_continue: true,
        ydesign_row_week: true,
        ydesign_theme: 'default',
        ydesign_style: 'classic',
        ydesign_focus_fx: 'scale',
        ydesign_card_anim: true,
        ydesign_trakt_chip: true,

        ydesign_badge_shape: 'pill',
        ydesign_glass_pill_bg: true,
        ydesign_color_age: true,
        ydesign_color_ua: true,
        ydesign_border_year: true,
        ydesign_border_age: true,
        ydesign_border_seasons: true,
        ydesign_border_ua: true,
        ydesign_border_genres: true,
        ydesign_border_ratings: true,
        ydesign_ratings_order: 'tmdb, popcorn, mc, ',
        ydesign_ratings_saturate: '100',

        // Шрифти
        ydesign_font: 'golos-montserrat',
        ydesign_font_family: '',
        ydesign_font_css: '',

        // Верхні бейджі
        ydesign_notch_show: true,
        ydesign_notch_bg: true,
        ydesign_notch_border: true,
        ydesign_notch_uniform_size: true,
        ydesign_notch_size: '0.5',
        ydesign_notch_type_size: '0.5',
        ydesign_notch_standard_size: '0.5',
        ydesign_notch_custom_size: '0.5',
        ydesign_notch_show_type: true,
        ydesign_notch_show_standard: true,
        ydesign_notch_show_custom: true,
        ydesign_notch_std_monochrome: false,

        ydesign_logo_type: 'logo',
        ydesign_lang: 'uk_en',
        ydesign_slogan_lang: 'uk_en',
        ydesign_add_title_lang: 'auto',
        ydesign_poster_quality: 'w300',
        ydesign_logo_quality: 'w500',

        // Вертикальні
        ydesign_v_logo_max_h: '35',
        ydesign_v_logo_max_w: '80',
        ydesign_v_title_size: '1.5',
        ydesign_v_add_title_size: '0.9',
        ydesign_v_slogan_size: '0.7',
        ydesign_v_badge_size: '0.8',
        ydesign_v_year_size: '0.8',
        ydesign_v_age_size: '0.8',
        ydesign_v_seasons_size: '0.8',
        ydesign_v_ua_size: '0.8',
        ydesign_v_genres_size: '0.8',
        ydesign_v_rating_size: '0.8',
        ydesign_v_uniform_badges: true,
        ydesign_v_badges_one_row: false,
        ydesign_v_show_year: true,
        ydesign_v_show_seasons: true,
        ydesign_v_show_ua: true,
        ydesign_v_show_age: true,
        ydesign_v_show_genres: true,
        ydesign_v_show_slogan: true,
        ydesign_v_show_add_title: true,
        ydesign_v_align_logo: 'center',
        ydesign_v_align_add_title: 'left',
        ydesign_v_align_badges: 'left',
        ydesign_v_align_slogan: 'left',
        ydesign_v_uniform_v_gaps: false,
        ydesign_v_uniform_v_gap_val: '0.05',
        ydesign_v_badges_gap: '0.15',
        ydesign_v_badge_rows_gap: '0.3',
        ydesign_v_genres_gap: '-0.35',
        ydesign_v_content_pb: '0.3',
        ydesign_v_slogan_padding: '0.3',
        ydesign_v_logo_mb: '1.0',
        ydesign_v_add_title_mb: '0.3',


        // Серії
        ydesign_series_redesign: true,
        ydesign_series_cards: '4',
        ydesign_hide_left_column: true,
        ydesign_series_badge_size: '0.8',
        ydesign_series_title_size: '0.9',
        ydesign_series_badge_shape: 'pill',
        ydesign_series_glass_pill: true,
        ydesign_series_border_badges: false,
        ydesign_series_show_date: true,
        ydesign_series_show_voice: true,
        ydesign_series_show_rate: true,
        ydesign_series_show_time: true,

        ydesign_omdb_key: '',
        ydesign_mdblist_key: ''
    };

    var SettingsMemo = {};

    function migrateVertical(el) {
        // Legacy orientation keys/classes are migration-only, never render controls.
        if (el) { el.classList.remove('ydesign-horizontal'); el.classList.add('ydesign-vertical'); return; }
        ['ydesign_card_type_main', 'ydesign_card_type_other'].forEach(function (key) {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get(key) === 'horizontal') Lampa.Storage.set(key, 'vertical');
        });
    }

    function getSet(key, fallbackKey) {
        var mk = key + '\u0001' + (fallbackKey || '');
        if (SettingsMemo.hasOwnProperty(mk)) return SettingsMemo[mk];
        var v = getSetRaw(key, fallbackKey);
        if (window.Lampa && Lampa.Storage) SettingsMemo[mk] = v;
        return v;
    }

    // Режим продуктивності: 'lite' = без blur/drop-shadow/блиску, 'fx' = повні ефекти, 'auto' = за пристроєм
    var LiteCache = { t: 0, v: false };
    function isLite() {
        var now = Date.now();
        if (now - LiteCache.t < 1000) return LiteCache.v;
        var res = false;
        try {
            var mode = String(getSet('ydesign_perf_mode') || 'auto');
            if (mode === 'lite') res = true;
            else if (mode === 'fx') res = false;
            else {
                try {
                    if (window.Lampa && Lampa.Platform && typeof Lampa.Platform.screen === 'function' && Lampa.Platform.screen('tv')) res = true;
                } catch (e1) {}
                if (!res) {
                    var ua = navigator.userAgent || '';
                    if (/Android TV|SmartTV|SMART-TV|Tizen|Web0S|WebOS|BRAVIA|AFTM|AFTS|AFTT|GoogleTV|CrKey|HbbTV|Philips|NetCast/i.test(ua)) res = true;
                    else if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) res = true;
                    else if (navigator.deviceMemory && navigator.deviceMemory <= 4) res = true;
                }
            }
        } catch (e) {}
        LiteCache.t = now; LiteCache.v = res;
        return res;
    }

    function getSetRaw(key, fallbackKey) {
        try {
            if (!window.Lampa || !Lampa.Storage) {
                if (DefaultSettings.hasOwnProperty(key)) return DefaultSettings[key];
                if (fallbackKey && DefaultSettings.hasOwnProperty(fallbackKey)) return DefaultSettings[fallbackKey];
                return '';
            }
            var val = Lampa.Storage.get(key);
            if (val !== null && val !== undefined && val !== '' && val !== 'undefined') return val;
            if (fallbackKey) {
                var fval = Lampa.Storage.get(fallbackKey);
                if (fval !== null && fval !== undefined && fval !== '' && fval !== 'undefined') return fval;
            }
        } catch (e) {}
        if (DefaultSettings.hasOwnProperty(key)) return DefaultSettings[key];
        if (fallbackKey && DefaultSettings.hasOwnProperty(fallbackKey)) return DefaultSettings[fallbackKey];
        return '';
    }

    // =========================================================================
    // 3. РОЗПІЗНАВАННЯ ТИПУ КАРТОК ТА МЕДІА
    // =========================================================================
    function isPersonCard(data) {
        if (!data) return false;
        if (data.media_type === 'person' || data.type === 'person') return true;
        if (data.profile_path && !data.poster_path && !data.backdrop_path) return true;
        if (data.gender !== undefined && !data.poster_path && !data.backdrop_path) return true;
        if (data.known_for_department && !data.poster_path && !data.backdrop_path) return true;
        return false;
    }

    function isSpecialPluginCard(data, html) {
        if (!data) return false;
        if (data.vinyl || data.vinyl_type) return true;
        if (['playlist', 'album', 'artist', 'radio', 'song', 'genre', 'section'].indexOf(data.media) !== -1) return true;
        if (['playlist', 'album', 'artist', 'radio', 'song', 'genre', 'section'].indexOf(data.type) !== -1) return true;
        if (html) {
            var el = html[0] || html;
            if (el && el.classList && (
                el.classList.contains('card--vinyl') || 
                el.classList.contains('card-more') || 
                el.classList.contains('card--collection') ||
                el.classList.contains('card--iptv')
            )) return true;
        }
        return false;
    }

    function isMovieCard(data, html) {
        if (!data || !data.id) return false;
        if (isSpecialPluginCard(data, html)) return false;
        if (isPersonCard(data)) return false;

        if (data.media_type === 'movie' || data.media_type === 'tv') return true;
        if (data.poster_path || data.backdrop_path) return true;
        if (data.title || (data.name && (data.first_air_date || data.seasons || data.vote_average !== undefined))) return true;

        return false;
    }

    // Резервні назви жанрів для карток, якщо TMDB detail-запит не повернув genres.
    function fallbackGenres(data, type) {
        if (!data) return [];
        var source = Array.isArray(data.genres) ? data.genres : [];
        if (source.length) {
            return source.map(function (g) {
                if (g && typeof g === 'object') return { id: g.id, name: g.name || '' };
                return { name: String(g || '') };
            }).filter(function (g) { return !!g.name; });
        }

        var ids = Array.isArray(data.genre_ids) ? data.genre_ids : [];
        var movieGenres = {
            28: 'Бойовик', 12: 'Пригоди', 16: 'Анімація', 35: 'Комедія', 80: 'Кримінал',
            99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історичний',
            27: 'Жахи', 10402: 'Музика', 9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика',
            10770: 'Телефільм', 53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'
        };
        var tvGenres = {
            10759: 'Бойовик і пригоди', 16: 'Анімація', 35: 'Комедія', 80: 'Кримінал',
            99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 10762: 'Дитячий',
            9648: 'Детектив', 10763: 'Новини', 10764: 'Реаліті-шоу', 10765: 'Фантастика і фентезі',
            10766: 'Мильна опера', 10767: 'Ток-шоу', 10768: 'Війна і політика', 37: 'Вестерн'
        };
        var dictionary = type === 'tv' ? tvGenres : movieGenres;
        return ids.map(function (id) { return { id: id, name: dictionary[id] || '' }; })
            .filter(function (g) { return !!g.name; });
    }

    function isTvMedia(movie, cardEl, extData) {
        if (!movie && !cardEl && !extData) return false;

        if (extData) {
            if (extData.seasons || extData.se_str || extData.number_of_seasons) return true;
            if (extData.type === 'tv' || extData.type === 'tv_series' || extData.type === 'show' ||
                extData.type === 'anime' || extData.media_type === 'tv' || extData.media_type === 'show' ||
                extData.media_type === 'anime') return true;
            if (extData.type === 'movie' || extData.media_type === 'movie') return false;
        }

        if (movie) {
            if (movie.media_type === 'tv' || movie.type === 'tv' || movie.type === 'tv_series' ||
                movie.type === 'show' || movie.type === 'anime' || movie.media_type === 'show' ||
                movie.media_type === 'anime' || movie.card_type === 'anime') return true;
            if (movie.media_type === 'movie' || movie.type === 'movie') return false;
            if (movie.number_of_seasons !== undefined && movie.number_of_seasons !== null && movie.number_of_seasons > 0) return true;
            if (movie.seasons && movie.seasons.length > 0) return true;
            if (movie.number_of_episodes !== undefined && movie.number_of_episodes !== null && movie.number_of_episodes > 0) return true;

            // TMDB специфіка: серіали завжди мають first_air_date або original_name, фільми - ніколи
            if (movie.first_air_date) return true;
            if (movie.original_name) return true;
            if (movie.name && !movie.title) return true;
        }

        if (cardEl) {
            if (cardEl.classList) {
                if (cardEl.classList.contains('card--tv') || cardEl.classList.contains('tv')) return true;
                if (cardEl.classList.contains('card--movie') || cardEl.classList.contains('movie')) return false;
            }
            if (cardEl.querySelector) {
                var typeDiv = cardEl.querySelector('.card__type');
                if (typeDiv) {
                    var txt = (typeDiv.innerText || typeDiv.textContent || '').trim().toUpperCase();
                    if (txt === 'TV' || txt === 'СЕРІАЛ' || txt === 'СЕРИАЛ') return true;
                    if (txt === 'MOV' || txt === 'ФІЛЬМ' || txt === 'ФИЛЬМ') return false;
                }
            }
        }

        return false;
    }

    // =========================================================================
    // 3.1. ТИПОГРАФІКА ТА ШРИФТИ (NETFLIX UI)
    // =========================================================================
    var YDESIGN_FONT_FALLBACK = '"SegoeUI","Helvetica Neue",Helvetica,Arial,sans-serif';

    var YDESIGN_FONTS = {
        'golos-montserrat': {
            css: 'family=Golos+Text:wght@400..900&family=Montserrat:wght@600..900',
            ui: '"Golos Text"',
            display: '"Montserrat"',
            numeric: '"Montserrat"',
            caps: true
        },
        'golos': {
            css: 'family=Golos+Text:wght@400..900',
            ui: '"Golos Text"',
            display: '"Golos Text"',
            numeric: '"Golos Text"',
            caps: false
        },
        'manrope': {
            css: 'family=Manrope:wght@400..800',
            ui: '"Manrope"',
            display: '"Manrope"',
            numeric: '"Manrope"',
            caps: false
        },
        'montserrat': {
            css: 'family=Montserrat:wght@400..900',
            ui: '"Montserrat"',
            display: '"Montserrat"',
            numeric: '"Montserrat"',
            caps: true
        },
        'inter': {
            css: 'family=Inter:wght@400..900',
            ui: '"Inter"',
            display: '"Inter"',
            numeric: '"Inter"',
            caps: false
        },
        'inter-montserrat': {
            css: 'family=Inter:wght@400..900&family=Montserrat:wght@600..900',
            ui: '"Inter"',
            display: '"Montserrat"',
            numeric: '"Montserrat"',
            caps: true
        }
    };

    function fontActive() {
        var key = '' + getSet('ydesign_font');
        if (key === 'off') return null;

        if (key === 'custom') {
            var family = ('' + getSet('ydesign_font_family')).trim();
            if (!family) return null;
            var quoted = /[",]/.test(family) ? family : '"' + family + '"';
            return {
                url: ('' + getSet('ydesign_font_css')).trim(),
                ui: quoted,
                display: quoted,
                numeric: quoted,
                caps: false
            };
        }

        var preset = YDESIGN_FONTS[key] || YDESIGN_FONTS['golos-montserrat'];
        return {
            url: 'https://fonts.googleapis.com/css2?' + preset.css + '&display=swap',
            ui: preset.ui,
            display: preset.display,
            numeric: preset.numeric,
            caps: preset.caps
        };
    }

    function fontLink(url) {
        var link = document.getElementById('ydesign-font-link');
        if (!url) {
            if (link && link.parentNode) link.parentNode.removeChild(link);
            return;
        }
        if (!link) {
            link = document.createElement('link');
            link.id = 'ydesign-font-link';
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.onerror = function () {
                console.log('YDesign', 'Font load failed:', url);
            };
            document.head.appendChild(link);
        }
        if (link.getAttribute('href') !== url) link.setAttribute('href', url);
    }

    function cssFont(font) {
        var ui   = font.ui + ',' + YDESIGN_FONT_FALLBACK;
        var disp = font.display + ',' + font.ui + ',' + YDESIGN_FONT_FALLBACK;
        var num  = font.numeric + ',Arial,Helvetica,sans-serif';

        var rules = [
            'body.ydesign--font, body.ydesign--font input, body.ydesign--font textarea, body.ydesign--font button, body.ydesign--font .simple-keyboard-input { font-family: ' + ui + ' !important; }',

            'body.ydesign--font .items-line__title,',
            'body.ydesign--font .full-start-new__title,',
            'body.ydesign--font .full-start__title,',
            'body.ydesign--font .settings__head,',
            'body.ydesign--font .search-box__title,',
            'body.ydesign--font .card__title,',
            'body.ydesign--font .ydesign-text-title,',
            'body.ydesign--font .nfx-bb__title,',
            'body.ydesign--font .nfx-row__title,',
            'body.ydesign--font .empty__title { font-family: ' + disp + ' !important; }',

            'body.ydesign--font .nfx-card__rank > span { font-family: ' + num + ' !important; }',
            'body.ydesign--font .items-line__title, body.ydesign--font .nfx-row__title { font-weight: 800; letter-spacing: -.005em; }',
            'body.ydesign--font .full-start-new__title, body.ydesign--font .full-start__title { font-weight: 800; }',
            'body.ydesign--font .ydesign-card-notch { font-family: ' + ui + ' !important; }'
        ];

        if (font.caps) {
            rules.push('body.ydesign--font .full-start-new__title, body.ydesign--font .full-start__title, body.ydesign--font .nfx-bb__title { letter-spacing: .015em; }');
        }

        return rules.join('\n');
    }

    function fontApply() {
        var font = fontActive();
        var styleEl = document.getElementById('ydesign-font-css');

        if (!font) {
            fontLink('');
            if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
            document.body.classList.remove('ydesign--font');
            return;
        }

        fontLink(font.url);

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'ydesign-font-css';
            document.head.appendChild(styleEl);
        }
        var fontCss = cssFont(font);
        if (styleEl.textContent !== fontCss) styleEl.textContent = fontCss;
        document.body.classList.add('ydesign--font');
    }

    // =========================================================================
    // 3.2. ВЕРХНІЙ БЛОК-ВИРІЗ КАРТКИ ("ЧОЛКА") ТА МІТКИ
    // =========================================================================
    function getMediaTypeName(data, cardEl, extData) {
        var isTv = isTvMedia(data, cardEl, extData) || (data && (data.media_type === 'tv' || data.type === 'tv'));
        var lang = (window.Lampa && Lampa.Storage) ? (Lampa.Storage.get('language', 'uk') || 'uk') : 'uk';
        if (lang === 'en') return isTv ? 'Series' : 'Movie';
        if (lang === 'ru') return isTv ? 'Сериал' : 'Фильм';
        return isTv ? 'Серіал' : 'Фільм';
    }

    var CustomFavMemo = { t: 0, v: {} };
    function getCustomFavCached() {
        var now = Date.now();
        if (now - CustomFavMemo.t > 1500) {
            try {
                CustomFavMemo.v = (window.Lampa && Lampa.Storage) ? (Lampa.Storage.get('custom_favorite', {}) || {}) : {};
            } catch (e) { CustomFavMemo.v = {}; }
            CustomFavMemo.t = now;
        }
        return CustomFavMemo.v;
    }

    function getCustomFavTags(data, cardEl) {
        if (!data) return [];
        var tags = [];
        var seen = {};

        function addTag(name) {
            if (!name) return;
            var trimmed = String(name).trim();
            if (trimmed && !seen[trimmed]) {
                seen[trimmed] = true;
                tags.push(trimmed);
            }
        }

        // 1. Статуси та мітки перегляду Lampa (look, viewed, scheduled, continued, thrown)
        try {
            if (window.Lampa && Lampa.Favorite && Lampa.Favorite.check) {
                var favStatus = Lampa.Favorite.check(data) || {};
                var markKeys = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
                var markDict = {
                    look: 'Дивлюся',
                    viewed: 'Переглянуто',
                    scheduled: 'Заплановано',
                    continued: 'Продовжую',
                    thrown: 'Кинуто'
                };
                for (var i = 0; i < markKeys.length; i++) {
                    var mk = markKeys[i];
                    if (mk === 'viewed' ? isWatched(data) === true : favStatus[mk]) {
                        var markTitle = (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_' + mk) : '';
                        if (!markTitle || markTitle.indexOf('title_') === 0) {
                            markTitle = markDict[mk] || mk;
                        }
                        addTag(markTitle);
                    }
                }
            }
        } catch (e) {}

        // 2. Списки та мітки з розширення custom-favs
        try {
            var cf = getCustomFavCached();
            if (cf && cf.customTypes && data.id) {
                var systemFields = ['card', 'migrationVersion'];
                var dataIdStr = String(data.id);
                for (var typeName in cf.customTypes) {
                    if (systemFields.indexOf(typeName) !== -1) continue;
                    var uid = cf.customTypes[typeName];
                    var list = cf[uid];
                    if (Array.isArray(list)) {
                        for (var j = 0; j < list.length; j++) {
                            if (String(list[j]) === dataIdStr) {
                                addTag(typeName);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (e) {}

        // 3. Якщо у картці вже був наявний елемент .card__marker
        try {
            if (cardEl && cardEl.querySelector) {
                var markerSpan = cardEl.querySelector('.card__marker span');
                if (markerSpan && markerSpan.innerText) {
                    addTag(markerSpan.innerText);
                }
            }
        } catch (e) {}

        return tags;
    }

    function getStandardFavoriteIconsHtml(data) {
        if (!data || !data.id) return '';
        var iconsHtml = '';
        try {
            var favStatus = (window.Lampa && Lampa.Favorite && Lampa.Favorite.check) ? Lampa.Favorite.check(data) : {};
            var hasProgress = moviePercent(data) > 0;

            // 1. Закладки (book)
            if (favStatus.book) {
                iconsHtml += '<svg class="ydesign-notch-icon ydesign-notch-icon-book" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>';
            }
            // 2. Подобається (like)
            if (favStatus.like) {
                iconsHtml += '<svg class="ydesign-notch-icon ydesign-notch-icon-like" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
            }
            // 3. Пізніше (wath)
            if (favStatus.wath) {
                iconsHtml += '<svg class="ydesign-notch-icon ydesign-notch-icon-wath" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 13H11V7h1.5v6.2l3.75 2.25-.75 1.23-4-2.48z"/></svg>';
            }
            // 4. Історія перегляду (history / watched)
            if (favStatus.history || hasProgress) {
                iconsHtml += '<svg class="ydesign-notch-icon ydesign-notch-icon-history" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>';
            }
        } catch (e) {}

        if (iconsHtml) {
            var isMono = !!getSet('ydesign_notch_std_monochrome');
            return '<span class="ydesign-notch-std-list' + (isMono ? ' ydesign-notch-mono' : '') + '">' + iconsHtml + '</span>';
        }
        return '';
    }

    function renderCardNotchContent(data, cardEl, extData) {
        if (!data || !getSet('ydesign_notch_show')) return '';

        var html = '';

        // 1-а група: Тип медіа (Фільм або Серіал)
        if (getSet('ydesign_notch_show_type')) {
            var typeName = getMediaTypeName(data, cardEl, extData);
            if (typeName) {
                html += '<span class="ydesign-notch-type">' + typeName + '</span>';
            }
        }

        // 2-а група: Стандартні мітки (закладки, подобається, пізніше, історія)
        if (getSet('ydesign_notch_show_standard')) {
            var stdIcons = getStandardFavoriteIconsHtml(data);
            if (stdIcons) {
                html += stdIcons;
            }
        }

        // 3-я група: Кастомні мітки та статуси перегляду (Дивлюся, Переглянуто, custom-favs)
        if (getSet('ydesign_notch_show_custom')) {
            var customTags = getCustomFavTags(data, cardEl);
            if (customTags && customTags.length > 0) {
                customTags.forEach(function (tag) {
                    html += '<span class="ydesign-notch-custom">' + tag + '</span>';
                });
            }
        }

        return html;
    }

    function updateCardNotch(cardEl, data, extData) {
        if (!cardEl) return;
        var view = cardEl.querySelector ? cardEl.querySelector('.card__view') : null;
        if (!view) return;

        var notchEl = view.querySelector('.ydesign-card-notch');
        if (!getSet('ydesign_notch_show')) {
            if (notchEl) notchEl.style.display = 'none';
            return;
        }

        var contentHtml = renderCardNotchContent(data, cardEl, extData);
        if (!contentHtml) {
            if (notchEl) {
                notchEl.innerHTML = '';
                notchEl.style.display = 'none';
            }
            return;
        }

        if (!notchEl) {
            notchEl = document.createElement('div');
            notchEl.className = 'ydesign-card-notch';
            view.appendChild(notchEl);
        }

        notchEl.innerHTML = contentHtml;
        notchEl.style.display = '';
    }

    // =========================================================================
    // 4. КЕШ (ES5 Object Map)
    // =========================================================================
    var MemoryCache = {
        _data: {},
        size: 0,
        has: function(key) { return this._data.hasOwnProperty(key); },
        get: function(key) { return this._data[key]; },
        set: function(key, val) {
            if (!this.has(key)) this.size++;
            this._data[key] = val;
        },
        delete: function(key) {
            if (this.has(key)) {
                delete this._data[key];
                this.size--;
            }
        },
        clear: function() {
            this._data = {};
            this.size = 0;
        },
        keys: function() {
            var k = [];
            for (var i in this._data) {
                if (this._data.hasOwnProperty(i)) k.push(i);
            }
            return k;
        }
    };
    var MAX_MEM_CACHE = 250;

    // Один ключ у localStorage замість сотень; запис відкладений і пакетний
    var PERSIST_KEY = 'ydesign_cache_v6';
    var PERSIST_MAX = 450;
    var persistData = null;
    var persistTimer = null;

    function persistLoad() {
        if (persistData) return;
        try {
            var raw = localStorage.getItem(PERSIST_KEY);
            persistData = raw ? JSON.parse(raw) : {};
            if (!persistData || typeof persistData !== 'object') persistData = {};
        } catch (e) { persistData = {}; }
    }

    function persistFlush() {
        persistTimer = null;
        if (!persistData) return;
        try {
            var now = Date.now();
            var keys = Object.keys(persistData);
            var arr = [];
            for (var i = 0; i < keys.length; i++) {
                var rec = persistData[keys[i]];
                if (!rec || now - rec.t > CONFIG.cacheTime) delete persistData[keys[i]];
                else arr.push(keys[i]);
            }
            if (arr.length > PERSIST_MAX) {
                arr.sort(function (a, b) { return persistData[a].t - persistData[b].t; });
                for (var j = 0; j < arr.length - PERSIST_MAX; j++) delete persistData[arr[j]];
            }
            localStorage.setItem(PERSIST_KEY, JSON.stringify(persistData));
        } catch (e) {
            try { persistData = {}; localStorage.removeItem(PERSIST_KEY); } catch (e2) {}
        }
    }

    function persistSchedule() {
        if (persistTimer) return;
        persistTimer = setTimeout(function () {
            if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(persistFlush, { timeout: 3000 });
            else persistFlush();
        }, 4000);
    }

    // Одноразове прибирання старих ключів ydesign_c_* (вони роздували localStorage і гальмували Lampa)
    function persistCleanupLegacy() {
        try {
            if (localStorage.getItem('ydesign_legacy_cleaned') === '1') return;
            var del = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf('ydesign_c_') === 0) del.push(k);
            }
            for (var j = 0; j < del.length; j++) localStorage.removeItem(del[j]);
            localStorage.setItem('ydesign_legacy_cleaned', '1');
        } catch (e) {}
    }
    setTimeout(function () {
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(persistCleanupLegacy, { timeout: 8000 });
        else persistCleanupLegacy();
    }, 6000);

    window.addEventListener('pagehide', function () { if (persistTimer) { clearTimeout(persistTimer); persistFlush(); } });

    var ApiCache = {
        get: function (key) {
            if (MemoryCache.has(key)) {
                var memory = MemoryCache.get(key), age = Date.now() - Number(memory.t);
                if (isFinite(age) && age >= 0 && age < CONFIG.cacheTime) return memory.v;
                MemoryCache.delete(key);
            }
            persistLoad();
            var rec = persistData[key];
            if (rec && rec.t && Date.now() >= rec.t && (Date.now() - rec.t < CONFIG.cacheTime)) {
                MemoryCache.set(key, rec);
                return rec.v;
            }
            return null;
        },
        set: function (key, val) {
            if (MemoryCache.size >= MAX_MEM_CACHE) {
                var keys = MemoryCache.keys();
                if (keys.length > 0) MemoryCache.delete(keys[0]);
            }
            MemoryCache.set(key, { v: val, t: Date.now() });
            persistLoad();
            persistData[key] = { v: val, t: Date.now() };
            persistSchedule();
        }
    };

    // =========================================================================
    // 5. ДОМІНАНТНИЙ КОЛІР
    // =========================================================================
    var ProminentColorStore = {};
    var PCCount = 0;
    var sharedCanvas = null;
    var sharedCtx = null;

    function getProminentColorAsync(path) {
        if (!path) return Promise.resolve('rgb(40, 40, 45)');
        var url = (path.indexOf('http') === 0 || path.indexOf('data:') === 0) ? path : ('https://image.tmdb.org/t/p/w92' + path);

        if (ProminentColorStore[url]) return ProminentColorStore[url];

        if (++PCCount > 300) { ProminentColorStore = {}; PCCount = 0; } // не даємо мапі рости безкінечно
        ProminentColorStore[url] = new Promise(function (resolve) {
            var cachedColor = ApiCache.get('col_' + path);
            if (cachedColor) return resolve(cachedColor);

            var img = new Image();
            img.crossOrigin = 'Anonymous';

            img.onload = function () {
                try {
                    if (!sharedCanvas) {
                        sharedCanvas = document.createElement('canvas');
                        sharedCanvas.width = 1;
                        sharedCanvas.height = 1;
                        sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
                    }
                    var sx = 0, sy = img.naturalHeight * 0.7, sw = img.naturalWidth, sh = img.naturalHeight * 0.3;
                    sharedCtx.drawImage(img, sx, sy, sw, sh, 0, 0, 1, 1);
                    var data = sharedCtx.getImageData(0, 0, 1, 1).data;
                    var r = data[0], g = data[1], b = data[2];

                    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    if (luma > 140) {
                        var factor = 110 / luma;
                        r = Math.floor(r * factor);
                        g = Math.floor(g * factor);
                        b = Math.floor(b * factor);
                    } else if (luma < 30) {
                        r = 35; g = 35; b = 40;
                    }

                    var colorResult = 'rgb(' + r + ',' + g + ',' + b + ')';
                    ApiCache.set('col_' + path, colorResult);
                    resolve(colorResult);
                } catch (e) {
                    resolve('rgb(40, 40, 45)');
                }
            };
            img.onerror = function () {
                resolve('rgb(40, 40, 45)');
            };
            img.src = url;
            setTimeout(function () { resolve('rgb(40, 40, 45)'); }, 3000);
        });

        return ProminentColorStore[url];
    }

    // =========================================================================
    // 6. ЛІНИВЕ ЗАВАНТАЖЕННЯ
    // =========================================================================
    var LazyLoader = {
        observer: null,
        init: function () {
            if (this.observer || typeof IntersectionObserver === 'undefined') return;
            var self = this;
            try {
                this.observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            var el = entry.target;
                            if (el._lazyQueue) {
                                el._lazyQueue.forEach(function (fn) { fn(); });
                                delete el._lazyQueue;
                            }
                            self.observer.unobserve(el);
                        }
                    });
                }, { rootMargin: '200px' });
            } catch (e) {}
        },
        add: function (el, fn) {
            if (typeof IntersectionObserver === 'undefined' || !getSet('ydesign_lazy_load')) {
                fn();
                return;
            }
            this.init();
            if (!this.observer) {
                fn();
                return;
            }
            el._lazyQueue = [fn];
            this.observer.observe(el);
        }
    };

    // =========================================================================
    // 6.1. ЧЕРГА МЕРЕЖЕВИХ ЗАПИТІВ (макс. N одночасно, найновіші першими)
    // =========================================================================
    var NetQ = {
        active: 0,
        queue: [],
        limit: function () { return isLite() ? 4 : 8; },
        push: function (opts) { this.queue.push(opts); this.pump(); },
        pump: function () {
            var self = this;
            while (self.active < self.limit() && self.queue.length) {
                var o = self.queue.pop(); // LIFO: те, що зараз на екрані, важливіше за те, що вже прокрутили
                self.active++;
                (function (o) {
                    var released = false;
                    function release() {
                        if (released) return;
                        released = true;
                        self.active--;
                        self.pump();
                    }
                    var okCb = o.success, errCb = o.error;
                    o.success = function () { release(); if (okCb) okCb.apply(this, arguments); };
                    o.error = function () { release(); if (errCb) errCb.apply(this, arguments); };
                    try { $.ajax(o); } catch (e) { release(); if (errCb) errCb(); }
                })(o);
            }
        }
    };
    function qajax(opts) { NetQ.push(opts); }

    // =========================================================================
    // 7. API ТА ДАНІ TMDB
    // =========================================================================
    function parseAgeRating(ageStr) {
        if (!ageStr) return '16+';
        var s = String(ageStr).toUpperCase().trim();
        if (s === 'G' || s === 'TV-G' || s === 'TV-Y') return '0+';
        if (s === 'PG' || s === 'TV-PG') return '6+';
        if (s === 'TV-Y7') return '7+';
        if (s === 'PG-13') return '13+';
        if (s === 'TV-14') return '14+';
        if (s === 'R' || s === 'NC-17' || s === 'TV-MA') return '18+';
        var digits = s.replace(/\D/g, '');
        if (digits.length > 0 && digits.length <= 2) return digits + '+';
        return '16+';
    }

    var UA_NEG_TTL = 12 * 60 * 60 * 1000; // «немає UA» перевіряємо знову через 12 годин (раніше — 7 діб)

    var UaRequests = {};
    function parseUaResponse(value) {
        if (value === true || value === false) return value;
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        if (value.error || value.status === 'error' || value.success === false || value.ok === false) return null;
        // Observed WH schema: {play: absolute HTTP(S) URL}. A generic success
        // object is not audio evidence. Errors/unknown shapes are never cached.
        if (Object.prototype.hasOwnProperty.call(value, 'play')) {
            if (typeof value.play === 'string' && /^https?:\/\/[^\s]+$/i.test(value.play)) return true;
            if (value.play === null || value.play === '') return false;
        }
        return null;
    }
    function checkUaVoiceover(tmdbId, type) {
        var media = type === 'tv' || type === 'tv_series' || type === 'anime' ? 'tv' : 'movie';
        var id = Number(tmdbId);
        if (!(id > 0 && id % 1 === 0)) return Promise.resolve(null);
        var cacheKey = 'ua_v2_' + media + '_' + id, cached = ApiCache.get(cacheKey);
        if (cached && cached.v === 2 && typeof cached.value === 'boolean' && cached.t > 0 && Date.now() >= cached.t && Date.now() - cached.t < (cached.value ? CONFIG.cacheTime : UA_NEG_TTL)) return Promise.resolve(cached.value);
        if (UaRequests[cacheKey]) return UaRequests[cacheKey];
        var request = new Promise(function (resolve) {
            qajax({
                url: 'https://wh.lme.isroot.in/?tmdb_id=' + encodeURIComponent(id) + '&serial=' + (media === 'tv' ? 1 : 0) + '&silent=true',
                timeout: 5000,
                success: function (value) {
                    var answer = parseUaResponse(value);
                    if (answer !== null) ApiCache.set(cacheKey, { v: 2, value: answer, t: Date.now() });
                    resolve(answer);
                },
                error: function () { resolve(null); }
            });
        });
        UaRequests[cacheKey] = request.then(function (value) { delete UaRequests[cacheKey]; return value; }, function () { delete UaRequests[cacheKey]; return null; });
        return UaRequests[cacheKey];
    }

    // =========================================================================
    // 6.2. ДОДАТКОВА ПЕРЕВІРКА UA ЧЕРЕЗ ПАРСЕР ТОРЕНТІВ (Jackett / Prowlarr / JacRed → Толока тощо)
    // Працює лише з налаштованим парсером; видимі картки перевіряються послідовно без фокусу.
    // =========================================================================
    var UA_TORR_POS_TTL = 7 * 24 * 60 * 60 * 1000;
    var UA_TORR_NEG_TTL = 24 * 60 * 60 * 1000;
    var TorrentUaChain = Promise.resolve();

    function torrentUaEnabled() {
        try {
            if (!getSet('ydesign_ua_torrents')) return false;
            if (!window.Lampa || !Lampa.Parser || typeof Lampa.Parser.get !== 'function' || !Lampa.Storage) return false;
            if (typeof Lampa.Storage.field !== 'function' || !Lampa.Storage.field('parser_use')) return false;
            var t = Lampa.Storage.field('parser_torrent_type');
            if (t === 'jackett') return !!(Lampa.Storage.field('jackett_url') || Lampa.Storage.field('jackett_url_two'));
            if (t === 'prowlarr') return !!(Lampa.Storage.field('prowlarr_url') || Lampa.Storage.field('prowlarr_url_two'));
            return false;
        } catch (e) { return false; }
    }

    function torrentUaCached(tmdbId, type) {
        var rec = ApiCache.get('uat_' + type + '_' + tmdbId);
        if (!rec || typeof rec !== 'object' || !rec.t) return null;
        var age = Date.now() - rec.t;
        if (rec.r && age < UA_TORR_POS_TTL) return true;
        if (!rec.r && age < UA_TORR_NEG_TTL) return false;
        return null;
    }

    function normTitle(s) {
        return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-z0-9а-яіїєґ]+/g, '');
    }

    // Чи є в назві релізу українська озвучка (а не лише субтитри)
    function titleHasUaVoice(title) {
        var t = String(title || '');
        t = t.replace(/(?:sub(?:s|titles)?|субтитр[а-яі]*|суб)\s*[:=\-]?\s*[^\]\)\|]*/ig, ' ');
        return /(?:^|[^a-z])(?:ukr|ua)(?:[^a-z]|$)|укр|ukrainian/i.test(t);
    }

    function runTorrentUaCheck(data, type) {
        return new Promise(function (resolve) {
            var isTv = (type === 'tv' || type === 'tv_series');
            var orig = data.original_title || data.original_name || data.title || data.name || '';
            var local = data.title || data.name || orig;
            var year = parseInt(String(data.release_date || data.first_air_date || '').slice(0, 4), 10) || 0;
            var movie = {
                id: data.id, title: local, original_title: orig, genres: [],
                release_date: data.release_date || '', first_air_date: data.first_air_date || ''
            };
            if (isTv) { movie.original_name = orig; movie.number_of_seasons = 1; }

            var done = false;
            function finish(v) { if (done) return; done = true; resolve(v); }
            setTimeout(function () { finish(null); }, 25000); // таймаут: не кешуємо

            var nOrig = normTitle(orig), nLocal = normTitle(local);
            try {
                Lampa.Parser.get({ search: orig || local, movie: movie, page: 1 }, function (res) {
                    var list = (res && res.Results) || [];
                    for (var i = 0; i < list.length; i++) {
                        var it = list[i], title = it.Title || it.title || '';
                        if (!(parseInt(it.Seeders, 10) > 0)) continue;
                        var nt = normTitle(title);
                        var nameOk = (nOrig.length >= 3 && nt.indexOf(nOrig) !== -1) || (nLocal.length >= 3 && nt.indexOf(nLocal) !== -1);
                        if (!nameOk) continue;
                        if (year && !isTv) {
                            var ys = (title.match(/(?:19|20)\d{2}/g) || []).map(Number);
                            var yearOk = false;
                            for (var k = 0; k < ys.length; k++) if (Math.abs(ys[k] - year) <= 1) yearOk = true;
                            if (!yearOk) continue;
                        }
                        if (titleHasUaVoice(title)) return finish(true);
                    }
                    finish(false);
                }, function () { finish(null); });
            } catch (e) { finish(null); }
        });
    }

    function checkTorrentsUa(data, type) {
        // по одному запиту за раз: пошук у парсері важкий
        TorrentUaChain = TorrentUaChain.then(function () {
            var cached = torrentUaCached(data.id, type);
            if (cached !== null) return cached;
            return runTorrentUaCheck(data, type).then(function (r) {
                if (r === true || r === false) ApiCache.set('uat_' + type + '_' + data.id, { r: r, t: Date.now() });
                return r === true;
            });
        }).catch(function () { return false; });
        return TorrentUaChain;
    }

    function fetchExternalRatings(tmdbId, type) {
        var cacheKey = 'ext_rates_v5_' + tmdbId;
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);

        var _omdbK = String(getSet('ydesign_omdb_key') || '').trim();
        var _mdbK = String(getSet('ydesign_mdblist_key') || '').trim();
        if (!_omdbK && !_mdbK) return Promise.resolve({});

        return new Promise(function (resolve) {
            var results = {};
            
            qajax({
                url: 'https://api.themoviedb.org/3/' + type + '/' + tmdbId + '/external_ids?api_key=' + CONFIG.tmdbKey(),
                timeout: 4000,
                success: function(extRes) {
                    var imdbId = extRes ? extRes.imdb_id : null;
                    if (!imdbId) {
                        ApiCache.set(cacheKey, results);
                        return resolve(results);
                    }

                    var omdbKey = String(getSet('ydesign_omdb_key') || '').trim();
                    var mdblistKey = String(getSet('ydesign_mdblist_key') || '').trim();
                    
                    var pOmdb = Promise.resolve();
                    if (omdbKey) {
                        pOmdb = new Promise(function(resOmdb) {
                            qajax({
                                url: 'https://www.omdbapi.com/?apikey=' + omdbKey + '&i=' + imdbId,
                                timeout: 3500,
                                success: function(omdbData) {
                                    if (omdbData && omdbData.Response !== 'False') {
                                        if (omdbData.Metascore && omdbData.Metascore !== 'N/A') results.mc = omdbData.Metascore;
                                        if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') results.imdb = omdbData.imdbRating;
                                        var rtArr = (omdbData.Ratings || []).filter(function (r) { return r.Source === 'Rotten Tomatoes'; });
                                        if (rtArr.length > 0) results.rt = rtArr[0].Value.replace('%', '');
                                    }
                                    resOmdb();
                                },
                                error: function() { resOmdb(); }
                            });
                        });
                    }

                    var pMdb = Promise.resolve();
                    if (mdblistKey) {
                        pMdb = new Promise(function(resMdb) {
                            qajax({
                                url: 'https://mdblist.com/api/?apikey=' + mdblistKey + '&i=' + imdbId,
                                timeout: 3500,
                                success: function(mdbData) {
                                    if (mdbData) {
                                        if (mdbData.score) results.mdblist = mdbData.score;
                                        (mdbData.ratings || []).forEach(function (r) {
                                            if (r.source === 'trakt') results.trakt = r.value;
                                            if (r.source === 'letterboxd') results.letterboxd = r.value;
                                            if (r.source === 'tomatoesaudience') results.popcorn = r.value;
                                            if (r.source === 'metacritic' && !results.mc) results.mc = r.value;
                                            if (r.source === 'tomatoes' && !results.rt) results.rt = r.value;
                                            if (r.source === 'imdb' && !results.imdb) results.imdb = r.value;
                                        });
                                    }
                                    resMdb();
                                },
                                error: function() { resMdb(); }
                            });
                        });
                    }

                    Promise.all([pOmdb, pMdb]).then(function() {
                        ApiCache.set(cacheKey, results);
                        resolve(results);
                    });
                },
                error: function() {
                    ApiCache.set(cacheKey, results);
                    resolve(results);
                }
            });
        });
    }

    function ymdToday() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    // Перша серія з датою виходу від сьогодні: поточний сезон, а якщо там немає — наступний
    function findUpcomingEpisode(tvId, season, seasonsList, cb) {
        var today = ymdToday();
        var hasNext = false;
        (seasonsList || []).forEach(function (x) { if (x.season_number === season + 1) hasNext = true; });

        function load(sn, onDone) {
            qajax({
                url: 'https://api.themoviedb.org/3/tv/' + tvId + '/season/' + sn + '?api_key=' + CONFIG.tmdbKey() + '&language=en-US',
                timeout: 4500,
                success: function (r) {
                    var eps = (r && r.episodes) || [];
                    for (var i = 0; i < eps.length; i++) {
                        if (eps[i].air_date && eps[i].air_date >= today) {
                            return onDone({ season: sn, episode: eps[i].episode_number, date: eps[i].air_date });
                        }
                    }
                    onDone(null);
                },
                error: function () { onDone(null); }
            });
        }

        load(season, function (ep) {
            if (ep || !hasNext) return cb(ep);
            load(season + 1, cb);
        });
    }

    var ExtendedRequests = {};
    function fetchExtendedData(id, type) {
        var langPref = getSet('ydesign_lang');
        var sloganLang = getSet('ydesign_slogan_lang');

        var cacheKey = extCacheKey(id, type);
        var cached = ApiCache.get(cacheKey);
        // дані серіалів (остання/наступна серія) швидко старіють — оновлюємо раз на 12 годин
        if (cached && !(type === 'tv' && (!cached.fetched || Date.now() - cached.fetched > 43200000))) return Promise.resolve(cached);

        if (ExtendedRequests[cacheKey]) return ExtendedRequests[cacheKey];
        var request = new Promise(function (resolve) {
            var langQuery = 'uk-UA'; // Always keep a Ukrainian text title, independently of the logo language.
            var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
                '?api_key=' + CONFIG.tmdbKey() +
                '&language=' + langQuery +
                '&append_to_response=images,release_dates,content_ratings' +
                '&include_image_language=uk,ru,en,null';

            qajax({
                url: url,
                timeout: 4500,
                success: function(data) {
                    if (!data || typeof data !== 'object' || Number(data.id) !== Number(id)) { resolve(null); return; }
                    var enData = null;
                    var needEn = false;
                    if (sloganLang === 'en' || langPref === 'en_orig') needEn = true;
                    if (sloganLang === 'uk_en' && (!data.tagline || !data.tagline.trim())) needEn = true;

                    function processData() {
                        var finalTagline = '';
                        if (sloganLang === 'uk') finalTagline = data.tagline || '';
                        else if (sloganLang === 'en') finalTagline = enData ? enData.tagline : '';
                        else finalTagline = data.tagline || (enData ? enData.tagline : '');

                        var se_str = '';
                        if (type === 'tv') {
                            var ds = data.number_of_seasons;
                            var de = data.number_of_episodes;
                            if (data.last_episode_to_air) {
                                var last_ep = data.last_episode_to_air;
                                var s_objArr = data.seasons ? data.seasons.filter(function (x) { return x.season_number === last_ep.season_number; }) : [];
                                var s_obj = s_objArr.length > 0 ? s_objArr[0] : null;
                                if (s_obj) {
                                    if (last_ep.episode_number < s_obj.episode_count) {
                                        ds = last_ep.season_number;
                                        de = last_ep.episode_number + '/' + s_obj.episode_count;
                                    } else {
                                        ds = last_ep.season_number;
                                        de = s_obj.episode_count;
                                    }
                                }
                            }
                            if (ds) se_str = 'S:' + ds + (de ? ' E:' + de : '');
                        }

                        var result = {
                            tagline: finalTagline || '',
                            genres: data.genres || (enData ? enData.genres : []),
                            clean_poster: null,
                            logo: null,
                            logo_lang: null,
                            age: null,
                            seasons: data.number_of_seasons,
                            episodes: data.number_of_episodes,
                            tmdb_rating: data.vote_average,
                            fetched: Date.now(),
                            ended: data.status === 'Ended' || data.status === 'Canceled',
                            last_ep: data.last_episode_to_air ? { season: data.last_episode_to_air.season_number, episode: data.last_episode_to_air.episode_number, date: data.last_episode_to_air.air_date || '' } : null,
                            next_ep: data.next_episode_to_air ? { season: data.next_episode_to_air.season_number, episode: data.next_episode_to_air.episode_number, date: data.next_episode_to_air.air_date || '' } : null,
                            season_list: (data.seasons || []).filter(function (x) { return x.season_number > 0; }).map(function (x) { return { n: x.season_number, c: x.episode_count || 0 }; }),
                            collection: data.belongs_to_collection ? { id: data.belongs_to_collection.id, name: data.belongs_to_collection.name || '' } : null,
                            se_str: se_str,
                            title_uk: data.title || data.name || '',
                            title_en: enData ? (enData.title || enData.name) : ''
                        };

                        if (data.images) {
                            var posters = data.images.posters || [];
                            var backdrops = data.images.backdrops || [];
                            var logos = data.images.logos || [];

                            var cpArr = posters.filter(function (p) { return p.iso_639_1 === null; });
                            result.clean_poster = cpArr.length > 0 ? cpArr[0].file_path : (posters.length ? posters[0].file_path : null);


                            var logo = null;
                            if (langPref === 'uk') {
                                var ukArr = logos.filter(function (l) { return l.iso_639_1 === 'uk'; });
                                logo = ukArr.length > 0 ? ukArr[0] : null;
                            } else if (langPref === 'uk_en') {
                                var ukArr2 = logos.filter(function (l) { return l.iso_639_1 === 'uk'; });
                                var enArr2 = logos.filter(function (l) { return l.iso_639_1 === 'en'; });
                                logo = ukArr2.length > 0 ? ukArr2[0] : (enArr2.length > 0 ? enArr2[0] : null);
                            } else {
                                var enArr3 = logos.filter(function (l) { return l.iso_639_1 === 'en'; });
                                logo = enArr3.length > 0 ? enArr3[0] : null;
                            }
                            if (!logo && logos.length) logo = logos[0];

                            if (logo) {
                                result.logo = logo.file_path;
                                result.logo_lang = logo.iso_639_1;
                            }
                        }

                        if (type === 'movie' && data.release_dates && data.release_dates.results) {
                            var usArr = data.release_dates.results.filter(function (r) { return r.iso_3166_1 === 'US'; });
                            if (usArr.length > 0 && usArr[0].release_dates && usArr[0].release_dates.length) result.age = usArr[0].release_dates[0].certification;
                        } else if (type === 'tv' && data.content_ratings && data.content_ratings.results) {
                            var usTvArr = data.content_ratings.results.filter(function (r) { return r.iso_3166_1 === 'US'; });
                            if (usTvArr.length > 0) result.age = usTvArr[0].rating;
                        }

                        result.age = parseAgeRating(result.age);

                        var finish = function () {
                            ApiCache.set(cacheKey, result);
                            resolve(result);
                        };

                        // TMDB часто не заповнює next_episode_to_air — шукаємо майбутню серію в даних сезону
                        if (type === 'tv' && !result.ended && !result.next_ep && result.last_ep) {
                            findUpcomingEpisode(id, result.last_ep.season, data.seasons, function (ep) {
                                if (ep) result.next_ep = ep;
                                finish();
                            });
                        } else {
                            finish();
                        }
                    }

                    if (needEn) {
                        qajax({
                            url: 'https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + CONFIG.tmdbKey() + '&language=en-US',
                            timeout: 3500,
                            success: function (enResponse) {
                                enData = enResponse;
                                processData();
                            },
                            error: function () {
                                processData();
                            }
                        });
                    } else {
                        processData();
                    }
                },
                error: function() {
                    resolve(null);
                }
            });
        });        ExtendedRequests[cacheKey] = request.then(function (value) { delete ExtendedRequests[cacheKey]; return value; }, function () { delete ExtendedRequests[cacheKey]; return null; });
        return ExtendedRequests[cacheKey];
    }

    // =========================================================================
    // 8. РЕНДЕР БЕЙДЖІВ ТА РЕЙТИНГІВ
    // =========================================================================
    function renderRatingsAsync(container, baseData, tmdbData, extRatings) {
        return new Promise(function(resolve) {
            var orderStr = String(getSet('ydesign_ratings_order') || 'tmdb, imdb, rt, popcorn');
            var order = orderStr.split(',').map(function (s) { return s.trim().toLowerCase(); });

            var formatR = function (v, is100) {
                if (v === null || v === undefined || v === '' || v === 'N/A') return null;
                var n = parseFloat(String(v).replace('%', ''));
                if (isNaN(n)) return null;
                if (is100 || n > 10) n = n / 10;
                return n.toFixed(1);
            };

            var available = {
                tmdb: formatR(tmdbData ? tmdbData.tmdb_rating : baseData.vote_average, false),
                kp: formatR(baseData.kp_rating, false),
                imdb: formatR((extRatings && extRatings.imdb) ? extRatings.imdb : baseData.imdb_rating, false),
                rt: formatR(extRatings && extRatings.rt, true),
                mc: formatR(extRatings && extRatings.mc, true),
                trakt: formatR(extRatings && extRatings.trakt, true),
                mdblist: formatR(extRatings && extRatings.mdblist, true),
                popcorn: formatR(extRatings && extRatings.popcorn, true),
                letterboxd: (extRatings && extRatings.letterboxd) ? formatR(parseFloat(extRatings.letterboxd) * 2, false) : null
            };

            // Render values immediately; remote logo availability must never gate metadata.
                var rhtml = '';
                order.forEach(function (key) {
                    if (Object.prototype.hasOwnProperty.call(available, key) && available[key]) {
                        if (key === 'kp') {
                            rhtml += '<span class="ydesign-rating"><b style="color:#f60; font-weight:800; font-size:1.1em; line-height:1; display:flex; align-items:center;">Kp</b> ' + available[key] + '</span>';
                        } else {
                            var iconUrl = rateIcons[key] || rateIcons.tmdb;
                            rhtml += '<span class="ydesign-rating"><img src="' + iconUrl + '" alt="' + key + '" decoding="async" /> ' + available[key] + '</span>';
                        }
                    }
                });
                container.innerHTML = rhtml;
                container.querySelectorAll('img').forEach(function (img) {
                    img.onerror = function () {
                        img.onerror = null;
                        if (!img.parentNode) return;
                        var fallback = document.createElement('b');
                        fallback.textContent = (img.alt || 'rating').toUpperCase();
                        img.parentNode.replaceChild(fallback, img);
                    };
                });
                resolve();
        });
    }

    // =========================================================================
    // 9. СТВОРЕННЯ КАРТОК ФІЛЬМІВ
    // =========================================================================
    // =========================================================================
    // 6.3. ФОКУС, ПОЗНАЧКИ («Новинка» / «Скоро», «Переглянуто») ТА ФОН ПІД КОЛІР ПОСТЕРА
    // =========================================================================
    var FocusState = { el: null, installed: false };

    // Lampa кидає на елемент нативну подію hover:focus (без bubbling) — ловимо її в фазі capture на document
    function installFocusHooks() {
        if (FocusState.installed) return;
        FocusState.installed = true;
        document.addEventListener('hover:focus', function (e) {
            var t = e.target;
            FocusState.el = t;
            var card = null;
            if (t && t.classList) card = t.classList.contains('ydesign-card') ? t : (t.closest ? t.closest('.ydesign-card') : null);
            if (card) {
                if (card._ydesign_updateMarks) card._ydesign_updateMarks();
                if (card._ydesign_lazyMarks) card._ydesign_lazyMarks();
                if (card._ydesign_onFocus) card._ydesign_onFocus();
            }
        }, true);
    }

    var UA_MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
    var NEW_DAYS = 14;          // «Новинка»: вийшло не раніше ніж 14 днів тому
    var SOON_DAYS = 14;         // «Нова серія» / «Скоро»: у найближчі 14 днів
    var WEEK_DAYS = 7;          // рядок «Виходять цього тижня»
    var EPISODE_PROGRESS_DONE = 90;   // серія вважається переглянутою від 90%
    var CONT_MIN = 3;           // від скількох % фільм вважається «розпочатим»
    var EXT_FAILED = { failed: true };

    // «епоха» позначок: збільшуємо, коли змінились таймлайн/історія — тоді кеш карток недійсний
    var MarksEpoch = 0;
    function bumpMarks() { MarksEpoch++; }

    function parseYmd(s) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }

    // скільки днів від сьогодні до дати (>0 — у майбутньому)
    function daysFromToday(d) {
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((d.getTime() - today.getTime()) / 86400000);
    }

    function soonLabel(d, left) {
        if (left === 0) return 'Сьогодні';
        if (left === 1) return 'Завтра';
        return d.getDate() + ' ' + UA_MONTHS[d.getMonth()];
    }

    // «Нова серія» — серіал/аніме з серією в найближчі 14 днів; «Скоро» — прем'єра самого серіалу;
    // «Новинка» — вийшло за останні 14 днів.
    function releaseInfo(data, type, ext) {
        var first = parseYmd(data.first_air_date || data.release_date);

        if (type === 'tv') {
            var next = ext && ext.next_ep ? parseYmd(ext.next_ep.date) : null;
            if (next) {
                var left = daysFromToday(next);
                if (left >= 0 && left <= SOON_DAYS) {
                    var isPremiere = ext.next_ep.season === 1 && ext.next_ep.episode === 1;
                    return isPremiere
                        ? { kind: 'soon', text: 'Скоро · ' + soonLabel(next, left) }
                        : { kind: 'episode', text: 'Нова серія · ' + soonLabel(next, left) };
                }
            }
            if (first) {
                var leftPremiere = daysFromToday(first);
                if (leftPremiere >= 0 && leftPremiere <= SOON_DAYS) return { kind: 'soon', text: 'Скоро · ' + soonLabel(first, leftPremiere) };
            }
        }

        if (first) {
            var ago = -daysFromToday(first);
            if (ago >= 0 && ago <= NEW_DAYS) return { kind: 'new', text: 'Новинка' };
        }
        return null;
    }

    // ---- Таймлайн Lampa ----
    function tlPercent(hash) {
        try {
            var v = Lampa.Timeline.view(hash);
            var p = v ? parseFloat(v.percent) : 0;
            return isNaN(p) ? 0 : p;
        } catch (e) { return 0; }
    }

    // Відсоток перегляду фільму: хеш за кількома назвами + власна функція Lampa
    function moviePercent(data) {
        // Managed Home cards already carry the selected native position. Do not
        // replace it with a larger percentage from another title/provider hash.
        if (data && data.home_history_resume) {
            var resume = data.home_history_resume, percent = Number(resume.percent);
            return resume.mode === 'position' && Number(resume.time) > 0 && isFinite(percent) && percent >= 0 && percent <= 100 ? percent : 0;
        }
        var best = 0, seen = {};
        var names = [data.original_title, data.original_name, data.title, data.name];
        for (var i = 0; i < names.length; i++) {
            var n = names[i];
            if (!n || seen[n]) continue;
            seen[n] = true;
            try { best = Math.max(best, tlPercent(Lampa.Utils.hash(n))); } catch (e) {}
        }
        try {
            if (typeof Lampa.Timeline.watched === 'function') {
                var w = Lampa.Timeline.watched(data, true);
                var wp = (w && typeof w === 'object') ? parseFloat(w.percent) : (typeof w === 'number' ? w : 0);
                if (!isNaN(wp)) best = Math.max(best, wp);
            }
        } catch (e2) {}
        return best;
    }

    // такий самий хеш серії, як у Lampa (онлайн-плагіни та таймлайн)
    function episodeHash(title, season, episode) {
        return Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, title].join(''));
    }

    // Чи є картка в списку «Історія перегляду» (індекс кешується на кілька секунд)


    // Прогрес серіалу/аніме: скільки серій переглянуто, яка наступна, прогрес поточного сезону
    function tvProgress(data, ext) {
        try {
            if (!ext || !ext.last_ep || !ext.season_list || !ext.season_list.length) return null;
            if (!Lampa.Utils || typeof Lampa.Utils.hash !== 'function' || !Lampa.Timeline) return null;
            var title = data.original_title || data.original_name || data.title || data.name || '';
            if (!title) return null;
            var last = ext.last_ep, list = ext.season_list;
            var seen = 0, aired = 0, next = null, per = {}, guard = 0;
            for (var i = 0; i < list.length; i++) {
                var s = list[i];
                if (s.n > last.season) break;
                var max = s.n === last.season ? last.episode : s.c;
                var ss = 0;
                for (var e = 1; e <= max && guard < 4000; e++, guard++) {
                    aired++;
                    if (tlPercent(episodeHash(title, s.n, e)) >= EPISODE_PROGRESS_DONE) { seen++; ss++; }
                    else if (!next) next = { s: s.n, e: e };
                }
                per[s.n] = { seen: ss, total: s.c || max };
            }
            var sn = next ? next.s : last.season;
            var ps = per[sn] || { seen: 0, total: 0 };
            return { seen: seen, aired: aired, unseen: aired - seen, next: next, seasonNum: sn, seasonSeen: ps.seen, seasonTotal: ps.total };
        } catch (e) {}
        return null;
    }

    // Confirmed Trakt evidence owns watched; local Timeline remains playback progress.

    // власний (повний URL) постер картки, якщо немає TMDB-шляху — наприклад, картки Trakt+
    function ownImg(d) {
        var u = d && (d.poster || d.img || d.image || '');
        return (typeof u === 'string' && u.indexOf('http') === 0) ? u : '';
    }

    // Presentation remembers only confirmed Trakt evidence, partitioned by account,
    // normalized media type and TMDB ID. Local playback progress is unrelated.
    var WatchPresentation = { loaded: false, accounts: {}, timer: null, dirty: false };
    var WATCH_PRESENT_KEY = 'ydesign_trakt_status_v1';
    function watchMetadata(data) {
        try {
            var provider = window.TraktPlus;
            if (!provider || typeof provider.watchedStatus !== 'function') return null;
            var state = provider.watchedStatus(data);
            if (!state || state.source !== 'trakt' || typeof state.owner !== 'string' || !/^(?:uuid|slug):[a-zA-Z0-9_-]{1,128}$/.test(state.owner) ||
                typeof state.session !== 'number' || !isFinite(state.session)) return null;
            return state;
        } catch (e) { return null; }
    }
    function presentationLoad() {
        if (WatchPresentation.loaded) return;
        WatchPresentation.loaded = true;
        try {
            var raw = Lampa.Storage.get(WATCH_PRESENT_KEY);
            if (raw && raw.v === 1 && raw.accounts && typeof raw.accounts === 'object' && !Array.isArray(raw.accounts)) {
                WatchPresentation.accounts = JSON.parse(JSON.stringify(raw.accounts));
            }
        } catch (e) { WatchPresentation.accounts = {}; }
    }
    function presentationSave(data, state) {
        if (WatchPresentation.timer) return;
        var owner = state.owner, session = state.session;
        WatchPresentation.timer = setTimeout(function () {
            WatchPresentation.timer = null;
            var current = watchMetadata(data);
            if (!current || current.owner !== owner || current.session !== session) {
                if (current && WatchPresentation.dirty) presentationSave(data, current);
                return;
            }
            var accounts = WatchPresentation.accounts;
            Object.keys(accounts).forEach(function (key) {
                var account = accounts[key];
                if (!account || !account.items || typeof account.items !== 'object') { delete accounts[key]; return; }
                var ids = Object.keys(account.items).sort(function (a, b) { return (account.items[b].t || 0) - (account.items[a].t || 0); });
                ids.slice(1500).forEach(function (id) { delete account.items[id]; });
            });
            Object.keys(accounts).sort(function (a, b) { return (accounts[b].t || 0) - (accounts[a].t || 0); }).slice(3).forEach(function (key) { delete accounts[key]; });
            try { Lampa.Storage.set(WATCH_PRESENT_KEY, { v: 1, accounts: JSON.parse(JSON.stringify(accounts)) }); WatchPresentation.dirty = false; } catch (e) {}
        }, 300);
    }
    function isWatched(data, output) {
        var state = watchMetadata(data);
        if (output) output.watchPhase = state ? state.phase : 'unavailable';
        if (!state) return null; // No plugin/authenticated owner is never negative evidence.
        var id = Number(state.tmdbId), media = state.mediaType;
        var expected = data && data.ids && data.ids.tmdb || data && data.tmdb_id || (data && data.source !== 'trakt' && data.id);
        if (!data || !(id > 0 && id % 1 === 0) || Number(expected) !== id ||
            (media !== 'movie' && media !== 'tv') || media !== (isTvMedia(data) ? 'tv' : 'movie')) return null;
        presentationLoad();
        var account = WatchPresentation.accounts[state.owner], key = media + ':' + id;
        var old = account && account.items && account.items[key];
        if (state.phase === 'ready' && typeof state.value === 'boolean' &&
            typeof state.updatedAt === 'number' && state.updatedAt > 0 && state.updatedAt <= Date.now()) {
            if (old && old.confirmedAt > state.updatedAt && typeof old.value === 'boolean') return old.value;
            if (!account || !account.items || Array.isArray(account.items)) account = WatchPresentation.accounts[state.owner] = { items: {}, t: 0 };
            if (!old || old.value !== state.value || old.confirmedAt !== state.updatedAt) {
                account.items[key] = { value: state.value, confirmedAt: state.updatedAt, t: Date.now() };
                account.t = Date.now(); WatchPresentation.dirty = true;
            }
            if (WatchPresentation.dirty) presentationSave(data, state);
            return state.value;
        }
        if (WatchPresentation.dirty) presentationSave(data, state);
        return old && typeof old.value === 'boolean' && old.confirmedAt > 0 && old.confirmedAt <= Date.now() ? old.value : null;
    }

    // ---- «Продовження»: чи бачили попередню частину франшизи ----
    var CollectionRequests = {};
    function fetchCollectionParts(cid) {
        var key = 'coll_' + cid;
        var cached = ApiCache.get(key);
        if (cached) return Promise.resolve(cached);
        if (CollectionRequests[cid]) return CollectionRequests[cid];
        var request = new Promise(function (resolve) {
            qajax({
                url: 'https://api.themoviedb.org/3/collection/' + cid + '?api_key=' + CONFIG.tmdbKey() + '&language=en-US',
                timeout: 4500,
                success: function (r) {
                    var parts = ((r && r.parts) || []).map(function (p) {
                        return { id: p.id, o: p.original_title || p.title || '', t: p.title || '', d: p.release_date || '' };
                    });
                    ApiCache.set(key, parts);
                    resolve(parts);
                },
                error: function () { resolve(null); }
            });
        });
        CollectionRequests[cid] = request.then(function (parts) {
            delete CollectionRequests[cid];
            return parts;
        });
        return CollectionRequests[cid];
    }

    function getCollParts(el, ext) {
        if (el._ydesign_collParts) return el._ydesign_collParts;
        if (ext && ext.collection) {
            var c = ApiCache.get('coll_' + ext.collection.id);
            if (c) { el._ydesign_collParts = c; return c; }
        }
        return null;
    }

    function collectionSeen(el, data, ext) {
        if (!getSet('ydesign_collection_mark')) return false;
        var parts = getCollParts(el, ext);
        if (!parts) return false;
        var mine = String(data.release_date || '');
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p.id == data.id || !p.d || (mine && p.d >= mine)) continue;
            if (isWatched({id:p.id,media_type:'movie',source:'tmdb'}) === true) return true;
        }
        return false;
    }

    // Підвантажуємо франшизу для видимих карток; фокус більше не потрібний.
    function ensureCollection(el, data, type, ext) {
        if (type === 'tv' || !ext || !ext.collection || el._ydesign_collLoading || el._ydesign_collParts) return;
        if (!getSet('ydesign_collection_mark')) return;
        el._ydesign_collLoading = true;
        fetchCollectionParts(ext.collection.id).then(function (parts) {
            el._ydesign_collLoading = false;
            if (parts && parts.length && el.isConnected && el._ydesign_updateMarks) {
                el._ydesign_collParts = parts;
                el._ydesign_mk = null;
                el._ydesign_updateMarks();
            }
        });
    }

    // Усі обчислення позначок одним разом і з кешем (повторний фокус майже безкоштовний)
    function computeMarks(el, data, type, ext) {
        var day = new Date().getDate();
        var parts = type === 'tv' ? null : getCollParts(el, ext);
        var mk = el._ydesign_mk;
        var homeProgress = data && data.home_history_resume ? [data.home_history_resume.mode, data.home_history_resume.percent, data.home_history_resume.time, data.home_history_resume.updated].join('|') : null;
        var traktSession = data && data._trakt_cached_only && window.TraktPlus && typeof TraktPlus.detailsSession === 'function' ? TraktPlus.detailsSession() : null;
        if (mk && mk.epoch === MarksEpoch && mk.ext === ext && mk.day === day && mk.coll === !!parts && mk.traktSession === traktSession && mk.homeProgress === homeProgress) { mk.watched = isWatched(data, mk); return mk; }

        mk = { epoch: MarksEpoch, ext: ext, day: day, coll: !!parts, traktSession: traktSession, homeProgress: homeProgress, pct: 0, tv: null, seq: false };
        mk.info = releaseInfo(data, type, ext);
        mk.watched = isWatched(data, mk);
        if (type === 'tv') {
            if (ext && !ext.failed) mk.tv = tvProgress(data, ext);
        } else {
            mk.pct = moviePercent(data);
            mk.seq = collectionSeen(el, data, ext);
        }
        el._ydesign_mk = mk;
        return mk;
    }

    var CHECK_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var TR_HTML = '<div class="ydesign-next"><span class="ydesign-next-t"></span><span class="ydesign-next-n"></span></div>' +
        '<div class="ydesign-ring"><svg viewBox="0 0 24 24"><circle class="yr-t" cx="12" cy="12" r="9"></circle><circle class="yr-a" cx="12" cy="12" r="9"></circle></svg><span></span></div>';

    // створює/оновлює/видаляє вузол-мітку (text === null → видалити)
    function syncNode(parent, cls, className, text) {
        var node = parent.querySelector('.' + cls);
        if (text === null || text === undefined) {
            if (node && node.parentNode) node.parentNode.removeChild(node);
            return null;
        }
        if (!node) { node = document.createElement('div'); parent.appendChild(node); }
        if (node.className !== className) node.className = className;
        if (node.textContent !== text) node.textContent = text;
        return node;
    }

    function removeNode(view, cls) {
        var n = view.querySelector('.' + cls);
        if (n && n.parentNode) n.parentNode.removeChild(n);
    }

    function updateCardMarks(el, data, type, ext) {
        var view = el.querySelector ? el.querySelector('.card__view') : null;
        if (!view) return;
        var mk = computeMarks(el, data, type, ext);
        if (data && data._trakt_cached_only) {
            var cachedProgress = window.TraktPlus && TraktPlus.cachedViewing ? TraktPlus.cachedViewing(data) : null;
            syncNode(view, 'tp-person-watch', 'tp-person-watch', cachedProgress && cachedProgress.partial ? 'Trakt · ' + cachedProgress.completed + '/' + cachedProgress.aired + ' еп.' : null);
        }

        // зліва зверху: «Новинка» / «Нова серія · Завтра» / «Скоро» + «Продовження»
        var tl = view.querySelector('.ydesign-tl');
        if (mk.info || mk.seq) {
            if (!tl) { tl = document.createElement('div'); tl.className = 'ydesign-tl'; view.appendChild(tl); }
            syncNode(tl, 'ydesign-ribbon', mk.info ? 'ydesign-ribbon ydesign-ribbon-' + mk.info.kind : '', mk.info ? mk.info.text : null);
            syncNode(tl, 'ydesign-seq', 'ydesign-seq', mk.seq ? 'Продовження' : null);
        } else if (tl && tl.parentNode) {
            tl.parentNode.removeChild(tl);
        }

        var progressOn = !!getSet('ydesign_progress_marks');

        // справа зверху (серіали): «Далі S2E5» + «+3» + кільце сезону «7/12»
        var pr = mk.tv;
        var showTv = progressOn && !mk.watched && pr && pr.next && pr.seen > 0 && pr.unseen > 0;
        var tr = view.querySelector('.ydesign-tr');
        if (showTv) {
            if (!tr) {
                tr = document.createElement('div');
                tr.className = 'ydesign-tr';
                tr.innerHTML = TR_HTML;
                view.appendChild(tr);
            }
            var key = pr.next.s + ':' + pr.next.e + ':' + pr.unseen + ':' + pr.seasonSeen + ':' + pr.seasonTotal;
            if (tr._k !== key) {
                tr._k = key;
                tr.querySelector('.ydesign-next-t').textContent = 'Далі S' + pr.next.s + 'E' + pr.next.e;
                tr.querySelector('.ydesign-next-n').textContent = pr.unseen > 1 ? '+' + pr.unseen : '';
                var frac = pr.seasonTotal > 0 ? Math.min(1, pr.seasonSeen / pr.seasonTotal) : 0;
                tr.querySelector('.yr-a').style.strokeDasharray = (frac * 56.55).toFixed(1) + ' 56.55';
                tr.querySelector('.ydesign-ring span').textContent = pr.seasonSeen + '/' + (pr.seasonTotal || '?');
            }
        } else if (tr && tr.parentNode) {
            tr.parentNode.removeChild(tr);
        }

        // знизу (фільми): смужка прогресу, відсоток видно у фокусі
        var showBar = progressOn && type !== 'tv' && mk.pct >= CONT_MIN && mk.pct < 100;
        var bar = view.querySelector('.ydesign-pbar');
        if (showBar) {
            var pct = Math.min(100, Math.round(mk.pct));
            if (!bar) {
                bar = document.createElement('div');
                bar.className = 'ydesign-pbar';
                bar.innerHTML = '<i></i><b></b>';
                view.appendChild(bar);
            }
            if (bar._p !== pct) {
                bar._p = pct;
                bar.firstChild.style.width = pct + '%';
                bar.lastChild.textContent = pct + '%';
            }
        } else if (bar && bar.parentNode) {
            bar.parentNode.removeChild(bar);
        }

        // «Переглянуто»: затемнення всієї картки + зелена галочка
        if (mk.watched && !view.querySelector('.ydesign-watched-dim')) {
            var dim = document.createElement('div');
            dim.className = 'ydesign-watched-dim';
            // дублюємо ключові стилі inline, щоб затемнення працювало незалежно від CSS
            dim.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;pointer-events:none;background:rgba(6,8,16,.62);';
            view.appendChild(dim);
            var chk = document.createElement('div');
            chk.className = 'ydesign-watched-check';
            chk.innerHTML = CHECK_SVG;
            view.appendChild(chk);
        }
        var confirmed = mk.watched === true;
        if (!confirmed) { removeNode(view, 'ydesign-watched-dim'); removeNode(view, 'ydesign-watched-check'); }
        if (el.classList.contains('ydesign-is-watched') !== confirmed) el.classList.toggle('ydesign-is-watched', confirmed);
        if (el.classList.contains('ydesign-from-trakt') !== confirmed) el.classList.toggle('ydesign-from-trakt', confirmed);
        el.setAttribute('data-ydesign-watched', mk.watched === null ? 'unknown' : confirmed ? 'watched' : 'unwatched');
        el.setAttribute('data-ydesign-watch-phase', mk.watchPhase);

    }

    // Оновлення позначок на видимих картках після змін у таймлайні/історії (порціями, без фризів)
    var RefreshT = null;
    function scheduleRefreshMarks() {
        if (RefreshT) return;
        RefreshT = setTimeout(function () {
            RefreshT = null;
            bumpMarks();
            var list = document.querySelectorAll('.activity--active .ydesign-card');
            var i = 0;
            (function step() {
                var end = Math.min(i + 10, list.length);
                for (; i < end; i++) {
                    var c = list[i];
                    if (c.offsetParent !== null && c._ydesign_updateNotch) c._ydesign_updateNotch();
                }
                if (i < list.length) requestAnimationFrame(step);
            })();
        }, 120);
    }

    // =========================================================================
    // 6.4. РЯДКИ ГОЛОВНОЇ: «Продовжити перегляд (N)» та «Виходять цього тижня (N)»
    // =========================================================================
    var RowsStore = { registered: false, busy: false, last: 0 };
    var ROW_LISTS = ['look', 'continued', 'scheduled', 'book', 'like', 'wath', 'history'];

    function extCacheKey(id, type) {
        return 'ext_' + type + '_' + id + '_' + getSet('ydesign_lang') + '_' + getSet('ydesign_slogan_lang') + '_v8';
    }

    function rowCandidates() {
        var out = [], seen = {};
        for (var t = 0; t < ROW_LISTS.length; t++) {
            var list = [];
            try { list = Lampa.Favorite.get({ type: ROW_LISTS[t] }) || []; } catch (e) {}
            for (var i = 0; i < list.length; i++) {
                var c = list[i];
                if (!c || !c.id) continue;
                var k = (isTvMedia(c) ? 't' : 'm') + c.id;
                if (seen[k]) continue;
                seen[k] = 1;
                out.push(c);
                if (out.length >= 90) return out;
            }
        }
        return out;
    }

    // Рахуємо тільки з кешу (без мережі): якщо даних серіалу ще немає — їх підтягне warmRows
    function computeRows() {
        var up = [], cont = [], cands = rowCandidates();
        for (var i = 0; i < cands.length && jobs.length < 24; i++) {
            var c = cands[i];
            if (isTvMedia(c)) {
                var ext = ApiCache.get(extCacheKey(c.id, 'tv'));
                if (!ext) continue;
                if (ext.next_ep) {
                    var d = parseYmd(ext.next_ep.date);
                    if (d) {
                        var left = daysFromToday(d);
                        if (left >= 0 && left <= WEEK_DAYS) up.push({ c: c, d: d.getTime() });
                    }
                }
                var pr = tvProgress(c, ext);
                if (pr && pr.seen > 0 && pr.unseen > 0) cont.push(c);
            } else {
                var p = moviePercent(c);
                if (p >= CONT_MIN && p < 100) cont.push(c);
            }
        }
        up.sort(function (a, b) { return a.d - b.d; });
        return { up: up.map(function (x) { return x.c; }), cont: cont };
    }

    function rowItem(c, kind) {
        var o = {};
        for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) o[k] = c[k];
        o.ydesign_row = kind;
        if (isTvMedia(c)) o.media_type = 'tv';
        else if (!o.media_type) o.media_type = 'movie';
        return o;
    }

    function makeRowCall(kind, title) {
        try {
            if (!getSet(kind === 'cont' ? 'ydesign_row_continue' : 'ydesign_row_week')) return;
            var rows = computeRows();
            var list = kind === 'cont' ? rows.cont : rows.up;
            if (!list.length) return;
            var items = list.map(function (c) { return rowItem(c, kind); });
            var full = title + ' (' + items.length + ')';
            return function (callback) { callback({ results: items, title: full }); };
        } catch (e) {}
    }

    function registerRows() {
        if (RowsStore.registered) return;
        try {
            if (!window.Lampa || !Lampa.ContentRows || typeof Lampa.ContentRows.add !== 'function') return;
            RowsStore.registered = true;
            if (!(window.LampaHomeHistory && window.LampaHomeHistory.active)) Lampa.ContentRows.add({
                index: 1, name: 'ydesign_continue', title: 'Продовжити перегляд', screen: ['main'],
                call: function () { if (!(window.LampaHomeHistory && window.LampaHomeHistory.active)) return makeRowCall('cont', 'Продовжити перегляд'); }
            });
            Lampa.ContentRows.add({
                index: 2, name: 'ydesign_week', title: 'Виходять цього тижня', screen: ['main'],
                call: function () { return makeRowCall('week', 'Виходять цього тижня'); }
            });
        } catch (e) {}
    }

    // Фонове підтягування даних серіалів зі списків користувача (з кешем 12 год., через чергу запитів)
    function warmRows(force) {
        try {
            var active = Lampa.Activity && Lampa.Activity.active();
            if (!active || active.component !== 'main') return;
            if (!getSet('ydesign_row_continue') && !getSet('ydesign_row_week')) return;
            var now = Date.now();
            if (RowsStore.busy || (!force && now - RowsStore.last < 20 * 60 * 1000)) return;
            RowsStore.busy = true;
            RowsStore.last = now;
            var cands = rowCandidates(), jobs = [];
            for (var i = 0; i < cands.length && jobs.length < 24; i++) {
                if (isTvMedia(cands[i])) jobs.push(fetchExtendedData(cands[i].id, 'tv'));
            }
            var done = function () { RowsStore.busy = false; };
            Promise.all(jobs).then(done, done);
        } catch (e) { RowsStore.busy = false; }
    }


    function logoQuality() {
        var q = String(getSet('ydesign_logo_quality') || 'w500');
        if (isLite() && (q === 'w500' || q === 'w780' || q === 'w1280' || q === 'original')) return 'w300';
        return q;
    }

    // Пакетна перевірка переповнення бейджів: спершу всі читання, потім усі записи (без layout thrash)
    var OverflowQ = { layers: [], timer: null };
    function scheduleOverflowFix(layer) {
        if (!layer) return;
        if (OverflowQ.layers.indexOf(layer) === -1) OverflowQ.layers.push(layer);
        if (OverflowQ.timer) return;
        OverflowQ.timer = setTimeout(function () {
            OverflowQ.timer = null;
            var layers = OverflowQ.layers; OverflowQ.layers = [];
            var ops = [], li, ci, k;
            for (li = 0; li < layers.length; li++) {
                var layer = layers[li];
                if (!layer || !layer.isConnected) continue;
                var containers = layer.querySelectorAll('.ydesign-info-wrap, .ydesign-badges, .ydesign-genres, .ydesign-ratings');
                for (ci = 0; ci < containers.length; ci++) {
                    var cont = containers[ci], children = cont.children;
                    if (children.length < 2) continue;
                    if (window.getComputedStyle(cont).flexDirection !== 'row') continue;
                    var firstTop = children[0].offsetTop;
                    for (k = 1; k < children.length; k++) {
                        ops.push([children[k], children[k].offsetTop > firstTop + 12]);
                    }
                }
            }
            for (k = 0; k < ops.length; k++) {
                var st = ops[k][0].style;
                st.opacity = ops[k][1] ? '0' : '1';
                st.pointerEvents = ops[k][1] ? 'none' : 'auto';
            }
        }, 350);
    }

    function buildCardCustomDOM(cardHtml, data) {
        var el = cardHtml[0] || cardHtml;

        el.classList.add('ydesign-card');
        migrateVertical(el);

        var render = el._ydesign_render = (el._ydesign_render || 0) + 1;
        el._ydesign_data = data;
        el._ydesign_settingsEpoch = CardSettingsEpoch;
        function current() { return el.isConnected && el._ydesign_render === render && el._ydesign_data === data; }
        var prefix = 'ydesign_v_';
        var type = isTvMedia(data, el) ? 'tv' : (data.media_type || 'movie');
        if (!data.media_type) data.media_type = type;
        if (!data.id) return;


        var refreshMarks = function () {
            updateCardMarks(el, data, type, el._ydesign_extData || (el._ydesign_extFailed ? EXT_FAILED : null));
        };
        el._ydesign_updateNotch = function () {
            updateCardNotch(el, data, el._ydesign_extData);
            refreshMarks();
        };
        el._ydesign_updateMarks = refreshMarks;
        el._ydesign_lazyMarks = function () { ensureCollection(el, data, type, el._ydesign_extData); };
        refreshMarks();

        var buildExtendedCard = function () {
            var view = el.querySelector('.card__view');
            if (!view) return;
            view.innerHTML = '';
            el._ydesign_bg_applied = null;

            var imgLayer = document.createElement('div'); imgLayer.className = 'ydesign-img-layer';
            var gradientLayer = document.createElement('div'); gradientLayer.className = 'ydesign-gradient-layer';
            var contentLayer = document.createElement('div'); contentLayer.className = 'ydesign-content-layer';

            view.appendChild(imgLayer);
            view.appendChild(gradientLayer);
            view.appendChild(contentLayer);
            updateCardNotch(el, data, el._ydesign_extData);
            refreshMarks();

            var bgQuality = getSet('ydesign_poster_quality');

            var applyBg = function (path) {
                if (!path) return;
                var fullUrl = String(path).indexOf('http') === 0 ? String(path) : ('https://image.tmdb.org/t/p/' + bgQuality + path);
                if (el._ydesign_bg_applied === fullUrl) return;
                el._ydesign_bg_applied = fullUrl;

                getProminentColorAsync(path).then(function (color) {
                    if (!current()) return;
                    if (color) {
                        view.style.backgroundColor = color;
                        el.style.setProperty('--yd-glow', color);
                        el._ydesign_color = color;
                        var rgba95 = color.replace('rgb', 'rgba').replace(')', ', 0.95)');
                        gradientLayer.style.background = 'linear-gradient(to top, ' + color + ' 0%, ' + rgba95 + ' 45%, transparent 100%)';
                        contentLayer.style.background = 'linear-gradient(to top, ' + color + ' 10%, transparent 100%)';
                    }

                    var img = new Image();
                    img.decoding = 'async';
                    img.onload = function () {
                        if (!current()) return;
                        imgLayer.style.setProperty('--loaded-bg', 'url(' + fullUrl + ')');
                        imgLayer.classList.add('loaded');
                    };
                    img.src = fullUrl;
                });
            };

            fetchExtendedData(data.id, type).then(function (extData) {
                if (!current()) return;
                if (extData) {
                    // Якщо детальна відповідь не містить опису/жанрів, використовуємо дані картки.
                    if (!Array.isArray(extData.genres) || !extData.genres.length) extData.genres = fallbackGenres(data, type);
                    el._ydesign_extData = extData;
                    updateCardNotch(el, data, extData);
                } else {
                    // Не відмовляємося від усієї картки через помилку додаткового запиту TMDB.
                    el._ydesign_extFailed = true;
                    extData = {
                        tagline: data.tagline || '',
                        genres: fallbackGenres(data, type),
                        title_uk: data.title || data.name || '',
                        title_en: data.original_title || data.original_name || '',
                        seasons: data.number_of_seasons || 0,
                        episodes: data.number_of_episodes || 0,
                        tmdb_rating: data.vote_average,
                        clean_poster: null,
                        logo: null,
                        logo_lang: null,
                        age: null,
                        se_str: ''
                    };
                    el._ydesign_extData = extData;
                }
                ensureCollection(el, data, type, extData);
                refreshMarks();
                var bgToLoad = null;
                if (extData) {
                    bgToLoad = extData.clean_poster || data.poster_path || data.backdrop_path || ownImg(data);
                } else {
                    bgToLoad = data.poster_path || data.backdrop_path || ownImg(data);
                }

                if (bgToLoad) applyBg(bgToLoad);

                var logoContainer = document.createElement('div');
                logoContainer.className = 'ydesign-logo-container';

                var titleText = document.createElement('div');
                titleText.className = 'ydesign-text-title ydesign-fallback-text';

                var mainTitle = data.title || data.name || data.original_title || data.original_name || '';
                titleText.innerText = mainTitle;

                if (extData.logo) {
                    var logoImg = document.createElement('img');
                    logoImg.className = 'ydesign-logo-img';
                    logoImg.decoding = 'async';
                    logoImg.src = 'https://image.tmdb.org/t/p/' + logoQuality() + extData.logo;
                    logoImg.alt = mainTitle;
                    logoContainer.appendChild(logoImg);
                } else {
                    titleText.classList.remove('ydesign-fallback-text');
                }
                logoContainer.appendChild(titleText);
                contentLayer.appendChild(logoContainer);

                // A readable Ukrainian title always precedes year, ratings and genres.
                var addTitleWrap = document.createElement('div');
                addTitleWrap.className = 'ydesign-add-title ydesign-local-title';
                addTitleWrap.textContent = extData.title_uk || mainTitle;
                addTitleWrap.title = addTitleWrap.textContent;
                contentLayer.appendChild(addTitleWrap);

                var infoWrap = document.createElement('div');
                infoWrap.className = 'ydesign-info-wrap';

                var badgesWrap = document.createElement('div');
                badgesWrap.className = 'ydesign-badges';
                var bh = '';

                if (data.release_date || data.first_air_date) {
                    var year = String(data.release_date || data.first_air_date).substring(0, 4);
                    if (year && year !== 'unde') bh += '<span class="ydesign-badge ydesign-badge-year">' + year + '</span>';
                }

                if (type === 'tv' && extData.se_str) {
                    bh += '<span class="ydesign-badge ydesign-badge-seasons">' + extData.se_str + '</span>';
                } else if (type === 'tv' && extData.seasons) {
                    var str = 'S:' + extData.seasons + (extData.episodes ? ' E:' + extData.episodes : '');
                    bh += '<span class="ydesign-badge ydesign-badge-seasons">' + str + '</span>';
                }

                if (extData.age) {
                    var ageClass = 'ydesign-age-' + extData.age.replace('+', '');
                    bh += '<span class="ydesign-badge ydesign-badge-age ' + ageClass + '">' + extData.age + '</span>';
                }

                badgesWrap.innerHTML = bh;
                if (bh !== '') infoWrap.appendChild(badgesWrap);

                function addUaBadge(source) {
                    if (badgesWrap.querySelector('.ydesign-badge-ua')) return;
                    var uaBadge = document.createElement('span');
                    uaBadge.className = 'ydesign-badge ydesign-badge-ua';
                    uaBadge.innerText = 'UA';
                    if (source) uaBadge.title = source;
                    badgesWrap.appendChild(uaBadge);
                    scheduleOverflowFix(contentLayer);
                    if (badgesWrap.parentNode !== infoWrap) infoWrap.insertBefore(badgesWrap, infoWrap.firstChild);
                }

                // buildExtendedCard is already visibility-gated by LazyLoader.
                // Check visible cards in the existing serial queue, without waiting for focus.
                function armTorrentUa() {
                    if (!torrentUaEnabled()) return;
                    var cached = torrentUaCached(data.id, type);
                    if (cached === true) { addUaBadge('Є в торентах'); return; }
                    if (cached === false) return;
                    checkTorrentsUa(data, type).then(function (found) {
                        if (found && current()) addUaBadge('Є в торентах');
                    });
                }

                if (torrentUaCached(data.id, type) === true) addUaBadge('Є в торентах');
                checkUaVoiceover(data.id, type).then(function (hasUa) {
                    if (!current()) return;
                    if (hasUa === true) addUaBadge();
                    else armTorrentUa();
                });

                var genresWrap = null;
                if (getSet(prefix + 'show_genres', 'ydesign_show_genres')) {
                    genresWrap = document.createElement('div');
                    genresWrap.className = 'ydesign-genres';
                    var genreList = (extData && Array.isArray(extData.genres) && extData.genres.length)
                        ? extData.genres : fallbackGenres(data, type);
                    if (genreList.length) {
                        genreList.forEach(function (g) {
                            var genreName = g && (g.name || g);
                            if (!genreName) return;
                            var gb = document.createElement('span');
                            gb.className = 'ydesign-genre-badge';
                            gb.innerText = genreName;
                            genresWrap.appendChild(gb);
                        });
                    }
                }

                var ratingsWrap = document.createElement('div');
                ratingsWrap.className = 'ydesign-ratings';

                renderRatingsAsync(ratingsWrap, data, extData, null).then(function() {
                    scheduleOverflowFix(contentLayer);
                    if (!current()) return;
                    fetchExternalRatings(data.id, type).then(function (extRatings) {
                        if (!current()) return;
                        if (extRatings && Object.keys(extRatings).length > 0) {
                            renderRatingsAsync(ratingsWrap, data, extData, extRatings).then(function () { scheduleOverflowFix(contentLayer); });
                        }
                    });
                });

                infoWrap.appendChild(ratingsWrap);
                contentLayer.appendChild(infoWrap);
                if (genresWrap && genresWrap.children.length) contentLayer.appendChild(genresWrap);

                var oldSlogan = contentLayer.querySelector('.ydesign-slogan');
                if (oldSlogan) oldSlogan.remove();

                if (getSet(prefix + 'show_slogan', 'ydesign_show_slogan')) {
                    var slogan = document.createElement('div');
                    slogan.className = 'ydesign-slogan ydesign-slogan-text';
                    var sText = extData.tagline || ' ';
                    if (sText.trim() !== '' && sText.length > 46) {
                        sText = sText.substring(0, 44) + '...';
                    }
                    slogan.innerText = sText;
                    contentLayer.appendChild(slogan);
                }

                scheduleOverflowFix(contentLayer);
                setTimeout(function () { if (current()) scheduleOverflowFix(contentLayer); }, 1500);
                el.classList.add('ydesign-ready');
            });
        };

        if (getSet('ydesign_lazy_load')) {
            LazyLoader.add(el, buildExtendedCard);
        } else {
            buildExtendedCard();
        }
    }

    // =========================================================================
    // 10. CSS СТИЛІ
    // =========================================================================
    var YD_EXTRA_CSS = ".ydesign-active .ydesign-rating img {filter: none !important;}\nbody.ydesign-sat-on .ydesign-rating img {filter: saturate(var(--ydesign-ratings-saturate, 100%)) !important;}\n.ydesign-active .ydesign-card {contain: layout;}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-card {transform: none;backface-visibility: visible;transition: transform .2s cubic-bezier(.2,.8,.2,1);}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-card.focus {transform: scale(1.045);will-change: transform;}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-card .card__view {transition: none !important;}\n.ydesign-active .ydesign-content-layer {opacity: 0;}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-content-layer {transition: opacity .4s ease-out;}\n.ydesign-active .ydesign-card.ydesign-ready .ydesign-content-layer {opacity: 1;}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-card.focus::after {content: \"\";position: absolute;left: -7%;right: -7%;top: -5%;bottom: -5%;background: radial-gradient(closest-side, var(--yd-glow, transparent) 0%, transparent 100%);opacity: 0;z-index: -1;pointer-events: none;animation: ydGlow .35s ease-out .05s forwards;}\n@keyframes ydGlow { to { opacity: .6; } }\nbody:not(.stremio-hybrid).is--touch .ydesign-active .ydesign-card.focus::after {display: none;}\nbody:not(.stremio-hybrid).ydesign-fx.ydesign-glass-pill .ydesign-badge {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}\nbody:not(.stremio-hybrid).ydesign-fx.ydesign-glass-pill .ydesign-genre-badge {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}\nbody:not(.stremio-hybrid).ydesign-fx.ydesign-glass-pill .ydesign-rating {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}\nbody:not(.stremio-hybrid).ydesign-fx.ydesign-notch-bg .ydesign-card-notch {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}\nbody:not(.stremio-hybrid).ydesign-fx.ydesign-series-glass-pill .ydesign-series-pill {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}\nbody:not(.stremio-hybrid).ydesign-fx .ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}\nbody.ydesign-fx .ydesign-logo-container img {filter: drop-shadow(0 2px 6px rgba(0,0,0,0.85));}\nbody:not(.stremio-hybrid).ydesign-fx .ydesign-card.focus .ydesign-content-layer::after {content: \"\";position: absolute;top: 0;left: 0;width: 55%;height: 100%;background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,.14) 50%, transparent 100%);transform: translateX(-130%) skewX(-12deg);animation: ydShine .9s ease-out .12s 1 both;pointer-events: none;}\n@keyframes ydShine { to { transform: translateX(280%) skewX(-12deg); } }\nbody:not(.ydesign-fx).ydesign-glass-pill .ydesign-badge:not(.ydesign-badge-ua) {background: rgba(255,255,255,0.16) !important;}\nbody:not(.ydesign-fx).ydesign-glass-pill .ydesign-genre-badge {background: rgba(255,255,255,0.16) !important;}\nbody:not(.ydesign-fx).ydesign-glass-pill .ydesign-rating {background: rgba(255,255,255,0.16) !important;}\nbody:not(.ydesign-fx).ydesign-notch-bg .ydesign-card-notch {background: rgba(30,30,40,0.55) !important;}\nbody:not(.ydesign-fx).ydesign-series-glass-pill .ydesign-series-pill {background: rgba(255,255,255,0.18) !important;}";

    var YD_MARKS_CSS = ".ydesign-tl {position: absolute;top: 2.4em;left: .6em;z-index: 24;display: flex;flex-direction: column;align-items: flex-start;gap: .3em;pointer-events: none;}\n.ydesign-ribbon {padding: .32em .8em;border-radius: 2em;font-size: .72em;font-weight: 800;letter-spacing: .06em;text-transform: uppercase;line-height: 1.1;color: #fff;white-space: nowrap;}\nbody:not(.stremio-hybrid) .ydesign-ribbon {box-shadow: 0 2px 8px rgba(0,0,0,.35);animation: ydRibbonIn .35s ease-out both;}\n.ydesign-ribbon-new {background: linear-gradient(135deg, #ff5f6d, #ff9966);}\n.ydesign-ribbon-soon {background: linear-gradient(135deg, #5b7cfa, #9b59ff);}\n.ydesign-ribbon-episode {background: linear-gradient(135deg, #00b8a9, #2dd4bf);color: #06201d;}\n.ydesign-seq {padding: .3em .75em;border-radius: 2em;font-size: .66em;font-weight: 800;letter-spacing: .06em;text-transform: uppercase;color: #fff;background: rgba(20,22,32,.78);border: 1px solid rgba(255,255,255,.35);white-space: nowrap;}\nbody:not(.stremio-hybrid) .ydesign-seq {animation: ydRibbonIn .35s ease-out both;}\n@keyframes ydRibbonIn { from { opacity: 0; transform: translateY(-.4em); } to { opacity: 1; transform: none; } }\nbody.ydesign-ribbons-off .ydesign-tl {display: none !important;}\nbody.ydesign-seq-off .ydesign-seq {display: none !important;}\n.ydesign-watched-dim {position: absolute;left: 0;top: 0;right: 0;bottom: 0;z-index: 5;background: rgba(6,8,16,.62);opacity: 0;pointer-events: none;}\nbody:not(.stremio-hybrid) .ydesign-watched-dim {transition: opacity .45s ease;}\n.ydesign-watched-check {position: absolute;top: .7em;right: .7em;z-index: 26;width: 2.1em;height: 2.1em;font-size: .8em;box-sizing: border-box;padding: .34em;border-radius: 50%;background: linear-gradient(135deg, #34d27b, #1fa85a);opacity: 0;pointer-events: none;}\nbody:not(.stremio-hybrid) .ydesign-watched-check {box-shadow: 0 2px 10px rgba(0,0,0,.45);transform: scale(.6);transition: opacity .35s ease, transform .35s cubic-bezier(.2,1.4,.4,1);}\n.ydesign-is-watched .ydesign-watched-dim {opacity: 1;}\n.ydesign-is-watched .ydesign-watched-check {opacity: 1;}\nbody:not(.stremio-hybrid) .ydesign-is-watched .ydesign-watched-check {transform: scale(1);}\n.ydesign-is-watched.focus .ydesign-watched-dim {opacity: .5;}\nbody.ydesign-watched-off .ydesign-watched-dim {display: none !important;}\nbody.ydesign-watched-off .ydesign-watched-check {display: none !important;}\n.ydesign-tr {position: absolute;top: .7em;right: .7em;z-index: 26;display: flex;flex-direction: column;align-items: flex-end;gap: .3em;font-size: .8em;pointer-events: none;}\nbody:not(.stremio-hybrid) .ydesign-tr {animation: ydRibbonIn .35s ease-out both;}\n.ydesign-next {display: flex;align-items: center;gap: .35em;padding: .28em .3em .28em .7em;border-radius: 2em;background: rgba(20,22,32,.8);color: #fff;font-weight: 800;font-size: .85em;white-space: nowrap;border: 1px solid rgba(255,255,255,.3);}\n.ydesign-next-n {padding: .05em .5em;border-radius: 2em;background: var(--yd-acc, #34d27b);color: #04210f;font-size: .9em;}\n.ydesign-next-n:empty {display: none;}\n.ydesign-next:has(.ydesign-next-n:empty) {padding-right: .7em;}\n.ydesign-ring {display: flex;align-items: center;gap: .35em;padding: .2em .65em .2em .25em;border-radius: 2em;background: rgba(20,22,32,.8);color: #fff;font-size: .72em;font-weight: 700;white-space: nowrap;}\n.ydesign-ring svg {width: 1.7em;height: 1.7em;flex-shrink: 0;}\nbody:not(.stremio-hybrid) .ydesign-ring svg {transform: rotate(-90deg);}\n.ydesign-ring circle {fill: none;stroke-width: 3.4;}\n.ydesign-ring .yr-t {stroke: rgba(255,255,255,.22);}\n.ydesign-ring .yr-a {stroke: var(--yd-acc, #34d27b);stroke-linecap: round;stroke-dasharray: 0 56.55;}\nbody:not(.stremio-hybrid) .ydesign-ring .yr-a {transition: stroke-dasharray .5s ease;}\n.ydesign-pbar {position: absolute;left: 0;right: 0;bottom: 0;height: .32em;z-index: 27;background: rgba(255,255,255,.22);pointer-events: none;}\n.ydesign-pbar i {display: block;height: 100%;width: 0;background: var(--yd-acc, #34d27b);}\nbody:not(.stremio-hybrid) .ydesign-pbar i {transition: width .5s ease;}\n.ydesign-pbar b {position: absolute;right: .6em;bottom: .6em;font-size: .62em;font-weight: 800;color: #fff;text-shadow: 0 1px 4px rgba(0,0,0,.95);opacity: 0;}\nbody:not(.stremio-hybrid) .ydesign-pbar b {transition: opacity .25s ease;}\n.ydesign-card.focus .ydesign-pbar b {opacity: 1;}\nbody.ydesign-progress-off .ydesign-pbar {display: none !important;}\nbody.ydesign-progress-off .ydesign-tr {display: none !important;}\nbody:not(.stremio-hybrid) .ydesign-card-notch {transition: opacity .2s ease !important;}\n@media (prefers-reduced-motion: reduce) {body:not(.stremio-hybrid) .ydesign-ribbon {animation: none !important;}\nbody:not(.stremio-hybrid) .ydesign-seq {animation: none !important;}\nbody:not(.stremio-hybrid) .ydesign-tr {animation: none !important;}\nbody:not(.stremio-hybrid) .ydesign-card {transition: none !important;}}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-card .card__view {border-radius: var(--yd-r, .85em) !important;}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-card.focus .card__view {box-shadow: 0 0 0 var(--yd-rw, 4px) var(--yd-ring, #fff) !important;}\nbody.ydesign-theme-netflix {--yd-ring: #fff;--yd-rw: 3px;--yd-r: .35em;--yd-acc: #e50914;}\nbody.ydesign-theme-minimal {--yd-ring: rgba(255,255,255,.9);--yd-rw: 2px;--yd-r: .6em;--yd-acc: #ffffff;}\nbody.ydesign-theme-warm {--yd-ring: #ffb454;--yd-rw: 4px;--yd-r: 1.15em;--yd-acc: #ffb454;}\nbody.ydesign-theme-oled {--yd-ring: #fff;--yd-rw: 3px;--yd-r: .8em;--yd-acc: #34d27b;}\nbody:not(.stremio-hybrid).ydesign-theme-oled {background: #000;}\nbody.ydesign-theme-minimal .ydesign-ribbon-new {background: rgba(20,22,32,.8) !important;color: #fff !important;border: 1px solid rgba(255,255,255,.4);}\nbody:not(.stremio-hybrid).ydesign-theme-minimal .ydesign-ribbon-new {box-shadow: none;}\nbody.ydesign-theme-minimal .ydesign-ribbon-soon {background: rgba(20,22,32,.8) !important;color: #fff !important;border: 1px solid rgba(255,255,255,.4);}\nbody:not(.stremio-hybrid).ydesign-theme-minimal .ydesign-ribbon-soon {box-shadow: none;}\nbody.ydesign-theme-minimal .ydesign-ribbon-episode {background: rgba(20,22,32,.8) !important;color: #fff !important;border: 1px solid rgba(255,255,255,.4);}\nbody:not(.stremio-hybrid).ydesign-theme-minimal .ydesign-ribbon-episode {box-shadow: none;}\nbody:not(.stremio-hybrid).ydesign-theme-minimal .ydesign-card.focus::after {display: none;}";

    var YD_PLUS_CSS = "@keyframes ydCardIn { from { opacity: 0; translate: 0 .6em; } to { opacity: 1; translate: 0 0; } }\n@keyframes ydSkel { to { transform: translateX(100%); } }\nbody:not(.stremio-hybrid).ydesign-active:not(.ydesign-anim-off) .ydesign-card.ydesign-ready {animation: ydCardIn .45s ease-out both;}\nbody:not(.stremio-hybrid).ydesign-fx.ydesign-active:not(.ydesign-anim-off) .ydesign-card:not(.ydesign-ready) .card__view::before {content: \"\";position: absolute;left: 0;top: 0;right: 0;bottom: 0;z-index: 1;pointer-events: none;background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.08) 50%, transparent 80%);transform: translateX(-100%);animation: ydSkel 1.3s ease-in-out 4;}\n@media (prefers-reduced-motion: reduce) {body:not(.stremio-hybrid) .ydesign-card.ydesign-ready {animation: none !important;}\nbody:not(.stremio-hybrid) .ydesign-card:not(.ydesign-ready) .card__view::before {display: none !important;}}\nbody:not(.stremio-hybrid).ydesign-active .ydesign-card.focus .card__view {box-shadow: 0 0 0 var(--yd-rw, 4px) var(--yd-ring, #fff), var(--yd-halo, 0 0 0 0 rgba(0,0,0,0)) !important;}\nbody:not(.stremio-hybrid).ydesign-active:not(.is--touch).ydesign-focus-lift .ydesign-card.focus {transform: translateY(-.35em) scale(1.06) translateZ(0) !important;}\nbody.ydesign-fx.ydesign-active:not(.is--touch).ydesign-focus-lift .ydesign-card.focus {--yd-halo: 0 1em 1.8em -.5em rgba(0,0,0,.8);}\nbody.ydesign-fx.ydesign-active:not(.is--touch).ydesign-focus-glow .ydesign-card.focus {--yd-halo: 0 0 1.5em var(--yd-glow, rgba(255,255,255,.4));}\nbody:not(.stremio-hybrid).ydesign-active:not(.is--touch).ydesign-focus-none .ydesign-card.focus {transform: none !important;will-change: auto;}\nbody.ydesign-style-glass {--yd-r: 1.2em;--yd-rw: 2px;--yd-ring: rgba(255,255,255,.9);}\nbody.ydesign-fx.ydesign-style-glass .ydesign-content-layer {background: linear-gradient(to top, rgba(12,14,24,.62), rgba(12,14,24,.12)) !important;}\nbody:not(.stremio-hybrid).ydesign-fx.ydesign-style-glass .ydesign-content-layer {backdrop-filter: blur(10px) saturate(1.25) !important;-webkit-backdrop-filter: blur(10px) saturate(1.25) !important;}\nbody:not(.ydesign-fx).ydesign-style-glass .ydesign-content-layer {background: linear-gradient(to top, rgba(12,14,24,.82), transparent) !important;}\nbody.ydesign-style-neon {--yd-r: .5em;--yd-rw: 3px;--yd-ring: #00e5ff;--yd-acc: #00e5ff;}\nbody.ydesign-fx.ydesign-style-neon .ydesign-card.focus {--yd-halo: 0 0 1.3em rgba(0,229,255,.55);}\nbody.ydesign-style-cinema {--yd-r: .25em;--yd-rw: 2px;--yd-ring: #f5c542;--yd-acc: #f5c542;}\nbody.ydesign-style-cinema .ydesign-text-title {letter-spacing: .06em;text-transform: uppercase;}\nbody.ydesign-fx.ydesign-style-cinema .ydesign-card.focus {--yd-halo: 0 0 1.2em rgba(245,197,66,.45);}\nbody.ydesign-style-soft {--yd-r: 1.6em;--yd-rw: 2px;--yd-ring: rgba(255,255,255,.6);}\nbody.ydesign-fx.ydesign-style-soft .ydesign-card.focus {--yd-halo: 0 .8em 1.6em -.4em rgba(0,0,0,.6);}\n.ydesign-from-trakt.ydesign-is-watched .ydesign-watched-check::after {content: \"Trakt\";position: absolute;right: 0;top: 118%;padding: .18em .55em;border-radius: 2em;background: #ed1c24;color: #fff;font-size: .55em;font-weight: 800;letter-spacing: .04em;line-height: 1.1;}\nbody:not(.stremio-hybrid) .ydesign-from-trakt.ydesign-is-watched .ydesign-watched-check::after {box-shadow: 0 2px 6px rgba(0,0,0,.4);}\nbody.ydesign-trakt-chip-off .ydesign-watched-check::after {display: none !important;}";

    function ydPostCss(css) {
        // Важкі декларації прибираємо з базового CSS; у режимі ефектів вони повертаються правилами з YD_EXTRA_CSS
        css = css.replace(/(?:-webkit-)?backdrop-filter\s*:[^;]*;/g, '');
        css = css.replace(/filter\s*:\s*drop-shadow\([^;]*;/g, '');
        return css + '\n@media (prefers-reduced-motion: reduce) { .ydesign-card, .ydesign-card *, .ydesign-card::after, .ydesign-card *::before, .ydesign-card *::after { animation: none !important; transition: none !important; } }\n' + YD_EXTRA_CSS + '\n' + YD_MARKS_CSS + '\n' + YD_PLUS_CSS;
    }

    function injectCSS() {
        var style = document.getElementById('ydesign-style-block');
        if (!style) {
            style = document.createElement('style');
            style.id = 'ydesign-style-block';
            document.head.appendChild(style);
        }

        var __ydCss = [
            ".ydesign-active .ydesign-card .card__title {display: none !important;}",
            ".ydesign-active .ydesign-card .card__age {display: none !important;}",
            ".ydesign-active .ydesign-card .card__vote {display: none !important;}",
            ".ydesign-active .items-line:not(.vinyl-line) .items-cards {display: flex;flex-wrap: nowrap;}",
            "body:not(.stremio-hybrid).ydesign-active .items-line:not(.vinyl-line) .items-cards {gap: var(--ydesign-card-gap, 0.8em);padding-bottom: 0;}",
            ".ydesign-active .items-line:not(.vinyl-line) .scroll__body {display: flex;flex-wrap: nowrap;}",
            "body:not(.stremio-hybrid).ydesign-active .items-line:not(.vinyl-line) .scroll__body {gap: var(--ydesign-card-gap, 0.8em);padding-bottom: 0;}",
            ".ydesign-active .ydesign-card {position: relative;overflow: visible;background-color: transparent !important;border: none !important;flex: 0 0 auto;cursor: pointer;}",
            "body:not(.stremio-hybrid).ydesign-active .ydesign-card {transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);transform: translateZ(0);backface-visibility: hidden;box-shadow: none !important;}",
            ".ydesign-active .ydesign-card.focus {z-index: 20;}",
            "body:not(.stremio-hybrid).ydesign-active .ydesign-card.focus {transform: scale(1.045) translateZ(0);box-shadow: none !important;}",
            "body:not(.stremio-hybrid).ydesign-active .ydesign-card.focus .card__view {box-shadow: 0 0 0 4px #ffffff !important;}",
            "body:not(.stremio-hybrid).is--touch .ydesign-active .ydesign-card.focus {transform: none !important;}",
            "body:not(.stremio-hybrid).is--touch .ydesign-active .ydesign-card.focus .card__view {box-shadow: none !important;}",
            ".ydesign-active .ydesign-card .card__view {position: relative;top: 0;left: 0;right: 0;bottom: 0;background-color: #1a1a1a;overflow: hidden;}",
            "body:not(.stremio-hybrid).ydesign-active .ydesign-card .card__view {width: 100%;height: 0 !important;border-radius: 0.85em !important;box-shadow: 0 0 0 4px transparent;transition: background-color 0.4s ease, box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);}",
            "body:not(.stremio-hybrid).ydesign-active .ydesign-card.ydesign-vertical .card__view {padding-bottom: 177.77% !important;}",
            "@media (min-width: 769px) {.ydesign-active .card.ydesign-vertical {width: calc(100% / var(--ydesign-grid-items-v, 5));height: auto !important;}",
            ".ydesign-active .items-line:not(.vinyl-line) .card.ydesign-vertical {width: calc(100% / var(--ydesign-grid-items-v, 5));}}",
            "@media (max-width: 768px) {.ydesign-active .card.ydesign-vertical {width: calc(100% / 2);height: auto !important;}",
            ".ydesign-active .items-line:not(.vinyl-line) .card.ydesign-vertical {width: 46vw;}}",
            ".ydesign-img-layer {position: absolute;top: 0;left: 0;width: 100%;height: 100%;background-color: #1a1a1a;background-image: url(\"./img/img_load.svg\");background-size: cover !important;background-repeat: no-repeat;background-position: center center !important;}",
            ".ydesign-img-layer::after {content: \"\";position: absolute;top: 0;left: 0;width: 100%;height: 100%;background-image: var(--loaded-bg, none);background-size: cover !important;background-repeat: no-repeat;background-position: center center !important;opacity: 0;z-index: 1;}",
            "body:not(.stremio-hybrid) .ydesign-img-layer::after {transition: opacity 0.25s ease-in-out;}",
            ".ydesign-img-layer.loaded::after {opacity: 1;}",
            ".ydesign-gradient-layer {position: absolute;bottom: 0;left: 0;width: 100%;height: 60%;pointer-events: none;z-index: 2;}",
            ".ydesign-content-layer {position: absolute;bottom: 0;left: 0;width: 100%;height: 100%;display: flex;flex-direction: column;justify-content: flex-end;align-items: stretch;padding: 1.2em 0.8em var(--ydesign-content-pb, 0.3em) 0.8em;box-sizing: border-box;z-index: 3;pointer-events: none;}",
            ".ydesign-logo-container {display: flex;align-items: flex-end;margin-bottom: var(--ydesign-logo-mb, 1.2em) !important;width: 100%;height: var(--ydesign-logo-h, 35%);max-height: var(--ydesign-logo-h, 35%);flex-shrink: 0;justify-content: var(--ydesign-align-logo, center);position: relative;z-index: 10;}",
            ".ydesign-logo-container img {max-width: var(--ydesign-logo-w, 80%);max-height: 100%;height: auto;width: auto;object-fit: contain;object-position: bottom var(--ydesign-text-logo, center);filter: drop-shadow(0 2px 6px rgba(0,0,0,0.85));}",
            ".ydesign-text-title {width: var(--ydesign-logo-w, 100%);max-height: 100%;display: flex;align-items: flex-end;justify-content: var(--ydesign-align-logo, center);font-size: calc(var(--ydesign-title-size-val, 1.2) * 1em) !important;font-weight: 800;color: #fff;text-align: var(--ydesign-text-logo, center);text-shadow: 0 2px 4px rgba(0,0,0,0.95);line-height: 1.25;padding-bottom: 0.15em;}",
            "body .ydesign-card.ydesign-vertical .ydesign-add-title.ydesign-local-title {display: -webkit-box !important;-webkit-line-clamp: 2;-webkit-box-orient: vertical;white-space: normal !important;overflow: hidden;font-size: .9em !important;font-weight: 700;line-height: 1.3 !important;min-height: 0 !important;text-align: left !important;margin: 0 0 .4em !important;text-shadow: 0 1px 6px rgba(0,0,0,.4) !important;}",
            ".ydesign-add-title {width: 100%;font-size: calc(var(--ydesign-add-title-size-eff, 0.9) * 1em) !important;color: rgba(255, 255, 255, 0.9);font-weight: 600;font-style: italic;text-align: var(--ydesign-text-add-title, center);white-space: nowrap;overflow: hidden;text-overflow: ellipsis;line-height: 1.35 !important;padding: 0.1em 0 0.25em 0 !important;margin-left: 0 !important;box-sizing: border-box !important;min-height: calc(var(--ydesign-add-title-size-eff, 0.9) * 1.55em);margin-top: 0 !important;margin-bottom: var(--ydesign-add-title-mb, 0.3em) !important;text-shadow: none !important;}",
            ".ydesign-slogan {width: 100%;font-size: calc(var(--ydesign-slogan-size-eff, 0.85) * 1em) !important;color: #fff;text-align: var(--ydesign-text-slogan, center);margin: var(--ydesign-slogan-padding, 0.3em) 0 0 0 !important;padding: 0.1em 0.35em !important;box-sizing: border-box !important;line-height: 1.35 !important;font-weight: 500;text-shadow: none !important;display: block;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;min-height: calc(var(--ydesign-slogan-size-eff, 0.85) * 1.45em);}",
            ".ydesign-info-wrap {display: flex;width: 100%;overflow: visible !important;padding: 0 !important;margin: 0 !important;}",
            "body.ydesign-v-badges-one-row .ydesign-vertical .ydesign-info-wrap {display: flex;flex-direction: row;flex-wrap: wrap !important;align-content: flex-start !important;align-items: center !important;justify-content: var(--ydesign-align-badges, center);column-gap: var(--ydesign-badges-gap, 0.15em) !important;row-gap: 50em !important;height: 2.15em !important;max-height: 2.15em !important;min-height: 2.15em !important;line-height: 2.15em !important;padding: 2px 0 !important;box-sizing: border-box !important;margin: 0 !important;overflow: hidden !important;clip-path: none !important;}",
            ".ydesign-vertical .ydesign-info-wrap {flex-direction: column;align-items: var(--ydesign-align-badges, center) !important;height: auto !important;max-height: none !important;overflow: visible !important;gap: var(--ydesign-badge-rows-gap, 0.3em) !important;padding: 0 !important;margin: 0 !important;}",
            ".ydesign-vertical .ydesign-badges {display: flex !important;flex: 0 0 auto !important;flex-wrap: wrap !important;align-content: flex-start !important;align-items: center !important;column-gap: var(--ydesign-badges-gap, 0.15em) !important;row-gap: var(--ydesign-v-badge-rows-gap, 0.3em) !important;justify-content: var(--ydesign-align-badges, center) !important;width: 100% !important;height: auto !important;max-height: none !important;min-height: 1.85em !important;line-height: normal !important;padding: 2px 0 !important;box-sizing: border-box !important;margin: 0 !important;overflow: visible !important;clip-path: none !important;position: relative !important;z-index: 12 !important;visibility: visible !important;opacity: 1 !important;}",
            ".ydesign-vertical .ydesign-ratings {display: flex !important;flex: 0 0 auto !important;flex-wrap: wrap !important;align-content: flex-start !important;align-items: center !important;column-gap: var(--ydesign-badges-gap, 0.15em) !important;row-gap: var(--ydesign-v-badge-rows-gap, 0.3em) !important;justify-content: var(--ydesign-align-badges, center) !important;width: 100% !important;height: auto !important;max-height: none !important;min-height: 1.85em !important;line-height: normal !important;padding: 2px 0 !important;box-sizing: border-box !important;margin: 0 !important;overflow: visible !important;clip-path: none !important;position: relative !important;z-index: 12 !important;visibility: visible !important;opacity: 1 !important;}",
            ".ydesign-vertical .ydesign-genres {display: flex !important;flex: 0 0 auto !important;flex-wrap: wrap !important;align-content: flex-start !important;align-items: center !important;column-gap: var(--ydesign-badges-gap, 0.15em) !important;row-gap: var(--ydesign-v-badge-rows-gap, 0.3em) !important;justify-content: var(--ydesign-align-badges, center) !important;width: 100% !important;height: auto !important;max-height: none !important;min-height: 1.85em !important;line-height: normal !important;padding: 2px 0 !important;box-sizing: border-box !important;margin: 0 !important;overflow: visible !important;clip-path: none !important;position: relative !important;z-index: 12 !important;visibility: visible !important;opacity: 1 !important;}",
            ".ydesign-vertical .ydesign-genres {margin-top: var(--ydesign-genres-gap, 0em) !important;margin-bottom: var(--ydesign-genres-gap, 0em) !important;}",
            "body.ydesign-v-badges-one-row .ydesign-vertical .ydesign-ratings {display: flex !important;flex-wrap: wrap !important;align-content: flex-start !important;width: auto !important;height: 2.15em !important;max-height: 2.15em !important;min-height: 2.15em !important;line-height: 2.15em !important;margin: 0 !important;padding: 2px 0 !important;box-sizing: border-box !important;flex-shrink: 0 !important;column-gap: var(--ydesign-badges-gap, 0.15em) !important;row-gap: 50em !important;overflow: hidden !important;}",
            ".ydesign-badges {font-size: 1em !important;}",
            ".ydesign-ratings {font-size: 1em !important;}",
            ".ydesign-genres {font-size: 1em !important;}",
            ".ydesign-badge {display: inline-flex !important;align-items: center !important;justify-content: center !important;box-sizing: border-box !important;height: 1.85em !important;min-height: 1.85em !important;max-height: 1.85em !important;line-height: 1.1 !important;border: 1px solid transparent !important;background: transparent !important;padding: 0 0.50em !important;text-shadow: none !important;white-space: nowrap !important;flex-shrink: 0 !important;text-align: center !important;vertical-align: middle !important;border-radius: var(--ydesign-badge-radius, 50px) !important;max-width: 100% !important;overflow: visible !important;}",
            "body:not(.stremio-hybrid) .ydesign-badge {box-shadow: none !important;}",
            ".ydesign-genre-badge {display: inline-flex !important;align-items: center !important;justify-content: center !important;box-sizing: border-box !important;height: 1.85em !important;min-height: 1.85em !important;max-height: 1.85em !important;line-height: 1.1 !important;border: 1px solid transparent !important;background: transparent !important;padding: 0 0.50em !important;text-shadow: none !important;white-space: nowrap !important;flex-shrink: 0 !important;text-align: center !important;vertical-align: middle !important;border-radius: var(--ydesign-badge-radius, 50px) !important;max-width: 100% !important;overflow: visible !important;}",
            "body:not(.stremio-hybrid) .ydesign-genre-badge {box-shadow: none !important;}",
            ".ydesign-rating {display: inline-flex !important;align-items: center !important;justify-content: center !important;box-sizing: border-box !important;height: 1.85em !important;min-height: 1.85em !important;max-height: 1.85em !important;line-height: 1.1 !important;border: 1px solid transparent !important;background: transparent !important;padding: 0 0.50em !important;text-shadow: none !important;white-space: nowrap !important;flex-shrink: 0 !important;text-align: center !important;vertical-align: middle !important;border-radius: var(--ydesign-badge-radius, 50px) !important;max-width: 100% !important;overflow: visible !important;}",
            "body:not(.stremio-hybrid) .ydesign-rating {box-shadow: none !important;}",
            ".ydesign-badge-year {font-size: calc(var(--ydesign-year-size-val, 0.8) * 1em) !important;font-weight: 700 !important;color: #fff !important;}",
            ".ydesign-badge-age {font-size: calc(var(--ydesign-age-size-val, 0.8) * 1em) !important;font-weight: 700 !important;color: #fff !important;}",
            ".ydesign-badge-seasons {font-size: calc(var(--ydesign-seasons-size-val, 0.8) * 1em) !important;font-weight: 700 !important;color: #fff !important;}",
            ".ydesign-badge-ua {font-size: calc(var(--ydesign-ua-size-val, 0.8) * 1em) !important;font-weight: 700 !important;color: #fff !important;}",
            ".ydesign-genre-badge {font-size: calc(var(--ydesign-genres-size-val, 0.8) * 1em) !important;font-weight: 600 !important;color: rgba(255,255,255,0.95) !important;}",
            ".ydesign-rating {font-size: calc(var(--ydesign-rating-size-val, 0.8) * 1em) !important;font-weight: 700 !important;color: #fff !important;gap: 0.25em !important;}",
            "body.ydesign-v-uniform-badges .ydesign-vertical .ydesign-badge {font-size: calc(var(--ydesign-badge-size-val, 0.8) * 1em) !important;}",
            "body.ydesign-v-uniform-badges .ydesign-vertical .ydesign-genre-badge {font-size: calc(var(--ydesign-badge-size-val, 0.8) * 1em) !important;}",
            "body.ydesign-v-uniform-badges .ydesign-vertical .ydesign-rating {font-size: calc(var(--ydesign-badge-size-val, 0.8) * 1em) !important;}",
            "body.ydesign-shape-pill {--ydesign-badge-radius: 50px;}",
            "body.ydesign-shape-rounded {--ydesign-badge-radius: 0.35em;}",
            "body.ydesign-shape-square {--ydesign-badge-radius: 0.15em;}",
            "body.ydesign-glass-pill .ydesign-badge {background: rgba(255, 255, 255, 0.1) !important;}",
            "body:not(.stremio-hybrid).ydesign-glass-pill .ydesign-badge {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;box-shadow: none !important;}",
            "body.ydesign-glass-pill .ydesign-genre-badge {background: rgba(255, 255, 255, 0.1) !important;}",
            "body:not(.stremio-hybrid).ydesign-glass-pill .ydesign-genre-badge {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;box-shadow: none !important;}",
            "body.ydesign-glass-pill .ydesign-rating {background: rgba(255, 255, 255, 0.1) !important;}",
            "body:not(.stremio-hybrid).ydesign-glass-pill .ydesign-rating {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;box-shadow: none !important;}",
            "body.ydesign-active .ydesign-glass-pill .ydesign-badge-ua {background: linear-gradient(135deg, #0057b7 0%, #0057b7 49%, #ffd700 51%, #ffd700 100%) !important;background-color: #0057b7 !important;background-image: linear-gradient(135deg, #0057b7 0%, #0057b7 49%, #ffd700 51%, #ffd700 100%) !important;color: #ffffff !important;font-weight: 800 !important;}",
            "body:not(.stremio-hybrid).ydesign-active .ydesign-glass-pill .ydesign-badge-ua {box-shadow: none !important;-webkit-backdrop-filter: none !important;backdrop-filter: none !important;}",
            "body.ydesign-active .ydesign-badge-ua {background: linear-gradient(135deg, #0057b7 0%, #0057b7 49%, #ffd700 51%, #ffd700 100%) !important;background-color: #0057b7 !important;background-image: linear-gradient(135deg, #0057b7 0%, #0057b7 49%, #ffd700 51%, #ffd700 100%) !important;color: #ffffff !important;font-weight: 800 !important;}",
            "body:not(.stremio-hybrid).ydesign-active .ydesign-badge-ua {box-shadow: none !important;-webkit-backdrop-filter: none !important;backdrop-filter: none !important;}",
            ".ydesign-rating img {width: 1.15em !important;height: 1.15em !important;object-fit: contain !important;display: block !important;filter: saturate(var(--ydesign-ratings-saturate, 100%)) !important;}",
            "body.ydesign-color-age .ydesign-age-18 {color: #ff5252 !important;}",
            "body.ydesign-color-age .ydesign-age-16 {color: #ffab40 !important;}",
            "body.ydesign-color-age .ydesign-age-14 {color: #ffd740 !important;}",
            "body.ydesign-color-age .ydesign-age-13 {color: #ffd740 !important;}",
            "body.ydesign-color-age .ydesign-age-6 {color: #69f0ae !important;}",
            "body.ydesign-color-age .ydesign-age-0 {color: #69f0ae !important;}",
            "body.ydesign-color-ua .ydesign-badge-ua {background: linear-gradient(135deg, #0057b7 0%, #0057b7 49%, #ffd700 51%, #ffd700 100%) !important;background-color: #0057b7 !important;color: #ffffff !important;font-weight: 800 !important;}",
            "body:not(.stremio-hybrid).ydesign-color-ua .ydesign-badge-ua {box-shadow: none !important;}",
            ".ydesign-vertical .ydesign-badge-ua {background: linear-gradient(135deg, #0057b7 0%, #0057b7 49%, #ffd700 51%, #ffd700 100%) !important;background-color: #0057b7 !important;color: #ffffff !important;font-weight: 800 !important;}",
            "body:not(.stremio-hybrid) .ydesign-vertical .ydesign-badge-ua {box-shadow: none !important;}",
            "body.ydesign-border-year .ydesign-badge-year {border-color: rgba(255,255,255,0.6) !important;}",
            "body.ydesign-border-seasons .ydesign-badge-seasons {border-color: rgba(255,255,255,0.6) !important;}",
            "body.ydesign-border-ua .ydesign-badge-ua {border-color: rgba(255,255,255,0.6) !important;}",
            "body.ydesign-border-genres .ydesign-genre-badge {border-color: rgba(255,255,255,0.4) !important;}",
            "body.ydesign-border-ratings .ydesign-rating {border-color: rgba(255,255,255,0.6) !important;}",
            "body.ydesign-border-age .ydesign-badge-age {border-color: rgba(255,255,255,0.6) !important;}",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-18 {border-color: rgba(244, 67, 54, 0.85) !important;}",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-16 {border-color: rgba(255, 152, 0, 0.85) !important;}",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-14 {border-color: rgba(255, 215, 64, 0.85) !important;}",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-13 {border-color: rgba(255, 215, 64, 0.85) !important;}",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-6 {border-color: rgba(105, 240, 174, 0.85) !important;}",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-0 {border-color: rgba(105, 240, 174, 0.85) !important;}",
            ".ydesign-card-notch {position: absolute !important;top: 0 !important;left: 50% !important;z-index: 25 !important;display: inline-flex !important;align-items: center !important;justify-content: center !important;gap: 0.4em !important;padding: 0.18em 0.6em !important;box-sizing: border-box !important;white-space: nowrap !important;pointer-events: none !important;max-width: 92% !important;overflow: hidden !important;margin: 0 !important;margin-top: 0 !important;border-top: none !important;border-radius: 0 0 0.65em 0.65em !important;border-top-left-radius: 0 !important;border-top-right-radius: 0 !important;border-bottom-left-radius: 0.65em !important;border-bottom-right-radius: 0.65em !important;}",
            "body:not(.stremio-hybrid) .ydesign-card-notch {transform: translateX(-50%) !important;transition: all 0.2s ease !important;}",
            "body.ydesign-notch-hide .ydesign-card-notch {display: none !important;}",
            "body.ydesign-notch-bg .ydesign-card-notch {background: rgba(255, 255, 255, 0.12) !important;}",
            "body:not(.stremio-hybrid).ydesign-notch-bg .ydesign-card-notch {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}",
            "body:not(.ydesign-notch-bg) .ydesign-card-notch {background: transparent !important;}",
            "body:not(.stremio-hybrid):not(.ydesign-notch-bg) .ydesign-card-notch {backdrop-filter: none !important;-webkit-backdrop-filter: none !important;}",
            "body.ydesign-notch-border .ydesign-card-notch {border-left: 1px solid rgba(255, 255, 255, 0.6) !important;border-right: 1px solid rgba(255, 255, 255, 0.6) !important;border-bottom: 1px solid rgba(255, 255, 255, 0.6) !important;border-top: none !important;}",
            "body:not(.ydesign-notch-border) .ydesign-card-notch {border: none !important;}",
            ".ydesign-notch-type {font-size: var(--ydesign-notch-type-size, 0.5em) !important;font-weight: 400 !important;color: #ffffff !important;text-transform: uppercase !important;letter-spacing: 0.04em !important;line-height: 1 !important;white-space: nowrap !important;flex-shrink: 0 !important;}",
            ".ydesign-notch-std-list {display: inline-flex !important;align-items: center !important;gap: 0.25em !important;flex-shrink: 0 !important;}",
            ".ydesign-notch-icon {display: inline-block !important;width: var(--ydesign-notch-std-size, 0.5em) !important;height: var(--ydesign-notch-std-size, 0.5em) !important;vertical-align: middle !important;flex-shrink: 0 !important;}",
            "body.ydesign-notch-mono .ydesign-notch-icon {color: rgba(255, 255, 255, 0.92) !important;}",
            ".ydesign-notch-mono .ydesign-notch-icon {color: rgba(255, 255, 255, 0.92) !important;}",
            "body:not(.ydesign-notch-mono) .ydesign-notch-icon-book {color: #ffd166 !important;}",
            "body:not(.ydesign-notch-mono) .ydesign-notch-icon-like {color: #ff4757 !important;}",
            "body:not(.ydesign-notch-mono) .ydesign-notch-icon-wath {color: #00d2d3 !important;}",
            "body:not(.ydesign-notch-mono) .ydesign-notch-icon-history {color: #be95ff !important;}",
            ".ydesign-notch-custom {font-size: var(--ydesign-notch-custom-size, 0.5em) !important;font-weight: 400 !important;color: #ffffff !important;text-transform: uppercase !important;letter-spacing: 0.04em !important;background: transparent !important;padding: 0 !important;border: none !important;border-radius: 0 !important;line-height: 1 !important;white-space: nowrap !important;flex-shrink: 0 !important;}",
            ".ydesign-active .ydesign-card.ydesign-vertical {--ydesign-logo-h: calc(var(--ydesign-v-logo-max-h, 35) * 1%);--ydesign-logo-w: calc(var(--ydesign-v-logo-max-w, 80) * 1%);--ydesign-title-size-val: var(--ydesign-v-title-size, 1.5);--ydesign-add-title-size-eff: var(--ydesign-v-add-title-size, 0.9);--ydesign-slogan-size-eff: var(--ydesign-v-slogan-size, 0.7);--ydesign-badge-size-val: var(--ydesign-v-badge-size, 0.8);--ydesign-year-size-val: var(--ydesign-v-year-size, 0.8);--ydesign-age-size-val: var(--ydesign-v-age-size, 0.8);--ydesign-seasons-size-val: var(--ydesign-v-seasons-size, 0.8);--ydesign-ua-size-val: var(--ydesign-v-ua-size, 0.8);--ydesign-genres-size-val: var(--ydesign-v-genres-size, 0.8);--ydesign-rating-size-val: var(--ydesign-v-rating-size, 0.8);--ydesign-logo-mb: var(--ydesign-v-logo-mb, 1.2em);--ydesign-add-title-mb: var(--ydesign-v-add-title-mb, 0.3em);--ydesign-badge-rows-gap: var(--ydesign-v-badge-rows-gap, 0.3em);--ydesign-badges-gap: var(--ydesign-v-badges-gap, 0.15em);--ydesign-genres-gap: var(--ydesign-v-genres-gap, 0em);--ydesign-content-pb: var(--ydesign-v-content-pb, 0.3em);--ydesign-slogan-padding: var(--ydesign-v-slogan-padding, 0.3em);--ydesign-uniform-v-gap: var(--ydesign-v-uniform-v-gap-val, 0.25em);--ydesign-align-logo: var(--ydesign-v-align-logo-flex, center);--ydesign-text-logo: var(--ydesign-v-align-logo, center);--ydesign-text-add-title: var(--ydesign-v-align-add-title, left);--ydesign-align-badges: var(--ydesign-v-align-badges-flex, flex-start);--ydesign-align-slogan: var(--ydesign-v-align-slogan-flex, flex-start);--ydesign-text-slogan: var(--ydesign-v-align-slogan, left);}",
            "body.ydesign-v-uniform-gaps .ydesign-vertical .ydesign-add-title {margin-top: var(--ydesign-uniform-v-gap, 0.25em) !important;margin-bottom: 0 !important;}",
            "body.ydesign-v-uniform-gaps .ydesign-vertical .ydesign-info-wrap {margin-top: var(--ydesign-uniform-v-gap, 0.25em) !important;margin-bottom: 0 !important;}",
            "body.ydesign-v-uniform-gaps .ydesign-vertical .ydesign-genres {margin-top: var(--ydesign-uniform-v-gap, 0.25em) !important;margin-bottom: 0 !important;}",
            "body.ydesign-v-uniform-gaps:not(.ydesign-v-badges-one-row) .ydesign-vertical .ydesign-info-wrap {gap: var(--ydesign-uniform-v-gap, 0.25em) !important;}",
            "body.ydesign-v-uniform-gaps:not(.ydesign-v-badges-one-row) .ydesign-vertical .ydesign-info-wrap > * + * {margin-top: 0 !important;margin-bottom: 0 !important;}",
            "body.ydesign-v-uniform-gaps .ydesign-vertical .ydesign-slogan {margin-top: var(--ydesign-uniform-v-gap, 0.25em) !important;margin-bottom: 0 !important;}",
            "body.ydesign-v-hide-year .ydesign-vertical .ydesign-badge-year {display: none !important;}",
            "body.ydesign-v-hide-seasons .ydesign-vertical .ydesign-badge-seasons {display: none !important;}",
            "body.ydesign-v-hide-ua .ydesign-vertical .ydesign-badge-ua {display: none !important;}",
            "body.ydesign-v-hide-age .ydesign-vertical .ydesign-badge-age {display: none !important;}",
            "body.ydesign-v-hide-slogan .ydesign-vertical .ydesign-slogan {display: none !important;}",
            "body.ydesign-v-hide-add-title .ydesign-vertical .ydesign-add-title {display: none !important;}",
            "body.ydesign-v-hide-genres .ydesign-vertical .ydesign-genres {display: none !important;}",
            "body[data-ydesign-logo=\"text\"] .ydesign-logo-img {display: none !important;}",
            "body[data-ydesign-logo=\"text\"] .ydesign-fallback-text {display: flex !important;}",
            "body[data-ydesign-logo=\"logo\"] .ydesign-fallback-text {display: none !important;}",
            ".explorer.ydesign-has-series .online-prestige.online-prestige-watched.ydesign-empty-history {display: none !important;pointer-events: none !important;visibility: hidden !important;height: 0 !important;margin: 0 !important;padding: 0 !important;}",
            ".explorer.ydesign-has-series .scroll--mask {-webkit-mask-image: none !important;mask-image: none !important;}",
            ".explorer.ydesign-has-series .scroll--mask::before {display: none !important;content: none !important;}",
            ".explorer.ydesign-has-series .scroll--mask::after {display: none !important;content: none !important;}",
            ".explorer.ydesign-has-series .scroll::before {display: none !important;content: none !important;}",
            ".explorer.ydesign-has-series .scroll::after {display: none !important;content: none !important;}",
            "body.ydesign-hide-left-column .explorer.ydesign-has-series .explorer__left {display: none !important;}",
            "body.ydesign-hide-left-column .explorer.ydesign-has-series .explorer__files {width: 100% !important;flex: 1 1 100% !important;max-width: 100% !important;padding: 0 !important;box-sizing: border-box !important;}",
            ".explorer.ydesign-has-series .explorer__files {width: 100% !important;flex: 1 1 100% !important;max-width: 100% !important;padding: 0 !important;box-sizing: border-box !important;}",
            ".explorer.ydesign-has-series .explorer__files-head {padding: 8px 28px 0 28px !important;margin: 0 !important;display: flex !important;align-items: center !important;flex-wrap: wrap !important;gap: 10px !important;width: 100% !important;box-sizing: border-box !important;}",
            ".explorer.ydesign-has-series .explorer__files-body {margin: 0 !important;padding: 0 !important;}",
            ".explorer.ydesign-has-series .scroll {overflow-x: visible !important;margin: 0 !important;padding: 0 !important;}",
            ".explorer.ydesign-has-series .scroll .scroll__content {padding-top: 6px !important;padding-bottom: 0px !important;padding-left: 10px !important;padding-right: 10px !important;margin: 0 !important;box-sizing: border-box !important;}",
            ".explorer.ydesign-has-series .scroll--mask .scroll__content {padding-top: 6px !important;padding-bottom: 0px !important;padding-left: 10px !important;padding-right: 10px !important;margin: 0 !important;box-sizing: border-box !important;}",
            ".explorer.ydesign-has-series .scroll__content {padding-top: 6px !important;padding-bottom: 0px !important;padding-left: 10px !important;padding-right: 10px !important;margin: 0 !important;box-sizing: border-box !important;}",
            "body:not(.stremio-hybrid) .explorer.ydesign-has-series .explorer__files .scroll__body {padding: 0 !important;margin: 0 !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full {display: inline-block !important;vertical-align: top !important;margin: 8px 12px !important;position: relative !important;height: auto !important;border-radius: 0.85em !important;overflow: hidden !important;background-color: #1a1a1a !important;box-sizing: border-box !important;border: none !important;outline: none !important;width: calc(var(--ydesign-series-width, 50%) - 24px) !important;cursor: pointer !important;pointer-events: auto !important;}",
            "body:not(.stremio-hybrid) .ydesign-series-active .online-prestige.online-prestige--full {transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;box-shadow: none !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full::before {content: \"\";display: block !important;padding-top: 56.25% !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full.focus {z-index: 50 !important;}",
            "body:not(.stremio-hybrid) .ydesign-series-active .online-prestige.online-prestige--full.focus {transform: scale(1.035) translateZ(0) !important;box-shadow: 0 0 0 3.5px #ffffff !important;}",
            "body:not(.stremio-hybrid).is--touch .ydesign-series-active .online-prestige.online-prestige--full.focus {transform: none !important;box-shadow: none !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__img {position: absolute !important;top: 0 !important;left: 0 !important;width: 100% !important;height: 100% !important;z-index: 1 !important;border-radius: 0 !important;pointer-events: none !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__img img {width: 100% !important;height: 100% !important;object-fit: cover !important;opacity: 1 !important;pointer-events: none !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full .ydesign-series-shade {position: absolute !important;top: 0 !important;left: 0 !important;right: 0 !important;bottom: 0 !important;background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 35%, transparent 65%) !important;z-index: 2 !important;pointer-events: none !important;}",
            "body:not(.stremio-hybrid) .ydesign-series-active .online-prestige.online-prestige--full .ydesign-series-shade {transition: background 0.3s ease !important;}",
            ".ydesign-series-pill {display: inline-flex !important;align-items: center !important;justify-content: center !important;height: 1.85em !important;min-height: 1.85em !important;max-height: 1.85em !important;padding: 0 0.55em !important;box-sizing: border-box !important;font-size: calc(var(--ydesign-series-badge-size-val, 0.8) * 1em) !important;font-weight: 600 !important;color: #ffffff !important;text-shadow: none !important;white-space: nowrap !important;line-height: 1.1 !important;text-align: center !important;vertical-align: middle !important;border: 1px solid transparent !important;background: transparent !important;border-radius: var(--ydesign-series-badge-radius, 50px) !important;pointer-events: none !important;overflow: visible !important;}",
            "body:not(.stremio-hybrid) .ydesign-series-pill {box-shadow: none !important;}",
            "body.ydesign-series-shape-pill {--ydesign-series-badge-radius: 50px;}",
            "body.ydesign-series-shape-rounded {--ydesign-series-badge-radius: 0.35em;}",
            "body.ydesign-series-shape-square {--ydesign-series-badge-radius: 0.15em;}",
            "body.ydesign-series-glass-pill .ydesign-series-pill {background: rgba(255, 255, 255, 0.12) !important;}",
            "body:not(.stremio-hybrid).ydesign-series-glass-pill .ydesign-series-pill {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;box-shadow: none !important;}",
            "body.ydesign-series-border-badges .ydesign-series-pill {border-color: rgba(255, 255, 255, 0.45) !important;}",
            ".ydesign-series-top-left {position: absolute !important;top: 10px !important;left: 12px !important;z-index: 5 !important;display: flex !important;align-items: center !important;gap: 6px !important;pointer-events: none !important;overflow: visible !important;}",
            ".ydesign-series-top-right {position: absolute !important;top: 10px !important;right: 12px !important;z-index: 5 !important;display: flex !important;align-items: center !important;gap: 6px !important;pointer-events: none !important;overflow: visible !important;}",
            ".ydesign-series-bottom-left {position: absolute !important;bottom: calc(1.15em + 8px) !important;left: 12px !important;right: 80px !important;z-index: 5 !important;display: flex !important;flex-direction: column !important;align-items: flex-start !important;gap: 5px !important;max-width: calc(100% - 92px) !important;overflow: visible !important;pointer-events: none !important;}",
            ".ydesign-series-bottom-right {position: absolute !important;bottom: calc(1.15em + 8px) !important;right: 12px !important;z-index: 5 !important;display: flex !important;align-items: center !important;pointer-events: none !important;overflow: visible !important;}",
            ".ydesign-series-voice-wrap {max-width: 100% !important;display: flex !important;overflow: visible !important;pointer-events: none !important;}",
            ".ydesign-series-voice-badge {color: #ffffff !important;font-weight: 600 !important;max-width: 100% !important;overflow: hidden !important;text-overflow: ellipsis !important;white-space: nowrap !important;pointer-events: none !important;}",
            ".ydesign-series-date {font-weight: 500 !important;color: #ffffff !important;opacity: 0.95 !important;pointer-events: none !important;}",
            ".ydesign-series-rate {color: #ffffff !important;font-weight: 700 !important;pointer-events: none !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__title {font-size: calc(var(--ydesign-series-title-size-val, 0.9) * 1em) !important;font-weight: 600 !important;line-height: 1.25 !important;color: #ffffff !important;text-shadow: 0 2px 4px rgba(0,0,0,0.95) !important;margin: 0 !important;padding: 0 !important;white-space: nowrap !important;overflow: hidden !important;text-overflow: ellipsis !important;width: 100% !important;pointer-events: none !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline {position: absolute !important;bottom: 0 !important;left: 0 !important;right: 0 !important;width: 100% !important;height: 1.15em !important;margin: 0 !important;z-index: 12 !important;background: rgba(255, 255, 255, 0.22) !important;border-radius: 0 0 0.85em 0.85em !important;overflow: hidden !important;display: block !important;pointer-events: none !important;}",
            "body:not(.stremio-hybrid) .ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline {backdrop-filter: blur(6px) !important;-webkit-backdrop-filter: blur(6px) !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline .time-line {width: 100% !important;height: 100% !important;background: transparent !important;margin: 0 !important;border-radius: 0 !important;position: absolute !important;top: 0 !important;left: 0 !important;z-index: 1 !important;pointer-events: none !important;}",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline .time-line > div {height: 100% !important;border-radius: 0 !important;background: #ffffff !important;pointer-events: none !important;}",
            "body:not(.stremio-hybrid) .ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline .time-line > div {box-shadow: 0 0 8px rgba(255,255,255,0.7) !important;transition: width 0.3s ease !important;}",
            ".ydesign-series-percent-text {position: absolute !important;top: 0 !important;left: 0 !important;right: 0 !important;bottom: 0 !important;width: 100% !important;height: 100% !important;display: flex !important;align-items: center !important;justify-content: center !important;font-size: 0.8em !important;font-weight: 500 !important;color: #000000 !important;text-shadow: none !important;z-index: 20 !important;pointer-events: none !important;line-height: 1 !important;}"
        ].join('\n');
        style.innerHTML = ydPostCss(__ydCss);
    }

    function getFlexAlign(val) {
        if (val === 'left') return 'flex-start';
        if (val === 'right') return 'flex-end';
        return 'center';
    }

    // кілька змін налаштувань підряд (пресет, два listener-и) → одне перерахування CSS
    var ApplyT = null;
    function applyDynamicCSS() {
        clearTimeout(ApplyT);
        ApplyT = setTimeout(applyDynamicCSSNow, 60);
    }

    function applyDynamicCSSNow() {
        try {
            SettingsMemo = {};
            LiteCache.t = 0;
            document.body.classList.add('ydesign-active');
            document.body.classList.toggle('ydesign-fx', !isLite());
            document.body.classList.toggle('ydesign-ribbons-off', !getSet('ydesign_ribbons'));
            document.body.classList.toggle('ydesign-watched-off', !getSet('ydesign_watched_mark'));
            document.body.classList.toggle('ydesign-progress-off', !getSet('ydesign_progress_marks'));
            document.body.classList.toggle('ydesign-seq-off', !getSet('ydesign_collection_mark'));
            ['default', 'netflix', 'minimal', 'warm', 'oled'].forEach(function (th) { document.body.classList.remove('ydesign-theme-' + th); });
            document.body.classList.add('ydesign-theme-' + (getSet('ydesign_theme') || 'default'));
            ['classic', 'glass', 'neon', 'cinema', 'soft'].forEach(function (st) { document.body.classList.remove('ydesign-style-' + st); });
            document.body.classList.add('ydesign-style-' + (getSet('ydesign_style') || 'classic'));
            ['scale', 'lift', 'glow', 'none'].forEach(function (fx) { document.body.classList.remove('ydesign-focus-' + fx); });
            document.body.classList.add('ydesign-focus-' + (getSet('ydesign_focus_fx') || 'scale'));
            document.body.classList.toggle('ydesign-anim-off', !getSet('ydesign_card_anim'));
            document.body.classList.toggle('ydesign-trakt-chip-off', !getSet('ydesign_trakt_chip'));
            document.body.classList.toggle('ydesign-series-active', getSet('ydesign_series_redesign'));
            document.body.classList.toggle('ydesign-series-glass-pill', getSet('ydesign_series_glass_pill'));
            document.body.classList.toggle('ydesign-series-border-badges', getSet('ydesign_series_border_badges'));

            var sShape = getSet('ydesign_series_badge_shape');
            document.body.classList.remove('ydesign-series-shape-pill', 'ydesign-series-shape-rounded', 'ydesign-series-shape-square');
            document.body.classList.add('ydesign-series-shape-' + sShape);

            document.body.classList.toggle('ydesign-hide-left-column', getSet('ydesign_hide_left_column'));

            // Загальні бейджі
            document.body.classList.toggle('ydesign-border-year', getSet('ydesign_border_year'));
            document.body.classList.toggle('ydesign-border-age', getSet('ydesign_border_age'));
            document.body.classList.toggle('ydesign-border-seasons', getSet('ydesign_border_seasons'));
            document.body.classList.toggle('ydesign-border-ua', getSet('ydesign_border_ua'));
            document.body.classList.toggle('ydesign-border-genres', getSet('ydesign_border_genres'));
            document.body.classList.toggle('ydesign-border-ratings', getSet('ydesign_border_ratings'));

            document.body.classList.toggle('ydesign-color-age', getSet('ydesign_color_age'));
            document.body.classList.toggle('ydesign-color-ua', getSet('ydesign_color_ua'));
            document.body.classList.toggle('ydesign-glass-pill', getSet('ydesign_glass_pill_bg'));

            var shape = getSet('ydesign_badge_shape');
            document.body.classList.remove('ydesign-shape-pill', 'ydesign-shape-rounded', 'ydesign-shape-square');
            document.body.classList.add('ydesign-shape-' + shape);

            document.body.dataset.ydesignLogo = getSet('ydesign_logo_type');

            // Серії
            var seriesCards = parseInt(getSet('ydesign_series_cards')) || 2;
            document.documentElement.style.setProperty('--ydesign-series-width', (100 / seriesCards) + '%');
            document.documentElement.style.setProperty('--ydesign-series-badge-size-val', getSet('ydesign_series_badge_size'));
            document.documentElement.style.setProperty('--ydesign-series-title-size-val', getSet('ydesign_series_title_size'));

            // Сітка
            document.documentElement.style.setProperty('--ydesign-grid-items-v', getSet('ydesign_grid_items_v'));
            document.documentElement.style.setProperty('--ydesign-card-gap', getSet('ydesign_card_gap') + 'em');
            document.documentElement.style.setProperty('--ydesign-ratings-saturate', getSet('ydesign_ratings_saturate') + '%');
            document.body.classList.toggle('ydesign-sat-on', String(getSet('ydesign_ratings_saturate')) !== '100');

            // Верхні бейджі
            document.body.classList.toggle('ydesign-notch-hide', !getSet('ydesign_notch_show'));
            document.body.classList.toggle('ydesign-notch-bg', !!getSet('ydesign_notch_bg'));
            document.body.classList.toggle('ydesign-notch-border', !!getSet('ydesign_notch_border'));
            document.body.classList.toggle('ydesign-notch-mono', !!getSet('ydesign_notch_std_monochrome'));

            var nUniform = !!getSet('ydesign_notch_uniform_size');
            var nSize = getSet('ydesign_notch_size') || '0.5';
            var nTypeSize = nUniform ? nSize : (getSet('ydesign_notch_type_size') || '0.5');
            var nStdSize = nUniform ? nSize : (getSet('ydesign_notch_standard_size') || '0.5');
            var nCustSize = nUniform ? nSize : (getSet('ydesign_notch_custom_size') || '0.5');

            document.documentElement.style.setProperty('--ydesign-notch-type-size', nTypeSize + 'em');
            document.documentElement.style.setProperty('--ydesign-notch-std-size', nStdSize + 'em');
            document.documentElement.style.setProperty('--ydesign-notch-custom-size', nCustSize + 'em');

            // ----------------- ВЕРТИКАЛЬНІ ПАРАМЕТРИ -----------------
            document.body.classList.toggle('ydesign-v-uniform-badges', getSet('ydesign_v_uniform_badges', 'ydesign_uniform_badges'));
            document.body.classList.toggle('ydesign-v-uniform-gaps', getSet('ydesign_v_uniform_v_gaps', 'ydesign_uniform_v_gaps_vert'));
            document.body.classList.toggle('ydesign-v-badges-one-row', getSet('ydesign_v_badges_one_row', 'ydesign_badges_one_row'));

            document.body.classList.toggle('ydesign-v-hide-year', !getSet('ydesign_v_show_year', 'ydesign_show_year'));
            document.body.classList.toggle('ydesign-v-hide-seasons', !getSet('ydesign_v_show_seasons', 'ydesign_show_seasons'));
            document.body.classList.toggle('ydesign-v-hide-ua', !getSet('ydesign_v_show_ua', 'ydesign_show_ua'));
            document.body.classList.toggle('ydesign-v-hide-age', !getSet('ydesign_v_show_age', 'ydesign_show_age'));
            document.body.classList.toggle('ydesign-v-hide-genres', !getSet('ydesign_v_show_genres', 'ydesign_show_genres'));
            document.body.classList.toggle('ydesign-v-hide-slogan', !getSet('ydesign_v_show_slogan', 'ydesign_show_slogan'));
            document.body.classList.toggle('ydesign-v-hide-add-title', !getSet('ydesign_v_show_add_title', 'ydesign_show_add_title'));

            document.documentElement.style.setProperty('--ydesign-v-logo-max-h', getSet('ydesign_v_logo_max_h', 'ydesign_logo_max_h'));
            document.documentElement.style.setProperty('--ydesign-v-logo-max-w', getSet('ydesign_v_logo_max_w', 'ydesign_logo_max_w'));
            document.documentElement.style.setProperty('--ydesign-v-title-size', getSet('ydesign_v_title_size', 'ydesign_text_title_size'));
            document.documentElement.style.setProperty('--ydesign-v-add-title-size', getSet('ydesign_v_add_title_size', 'ydesign_text_add_title_size'));
            document.documentElement.style.setProperty('--ydesign-v-slogan-size', getSet('ydesign_v_slogan_size', 'ydesign_text_slogan_size'));
            document.documentElement.style.setProperty('--ydesign-v-badge-size', getSet('ydesign_v_badge_size', 'ydesign_text_badge_size'));
            document.documentElement.style.setProperty('--ydesign-v-year-size', getSet('ydesign_v_year_size', 'ydesign_text_year_size'));
            document.documentElement.style.setProperty('--ydesign-v-age-size', getSet('ydesign_v_age_size', 'ydesign_text_age_size'));
            document.documentElement.style.setProperty('--ydesign-v-seasons-size', getSet('ydesign_v_seasons_size', 'ydesign_text_seasons_size'));
            document.documentElement.style.setProperty('--ydesign-v-ua-size', getSet('ydesign_v_ua_size', 'ydesign_text_ua_size'));
            document.documentElement.style.setProperty('--ydesign-v-genres-size', getSet('ydesign_v_genres_size', 'ydesign_text_genres_size'));
            document.documentElement.style.setProperty('--ydesign-v-rating-size', getSet('ydesign_v_rating_size', 'ydesign_text_rating_size'));
            
            document.documentElement.style.setProperty('--ydesign-v-logo-mb', getSet('ydesign_v_logo_mb', 'ydesign_logo_mb') + 'em');
            document.documentElement.style.setProperty('--ydesign-v-add-title-mb', getSet('ydesign_v_add_title_mb', 'ydesign_add_title_mb') + 'em');
            document.documentElement.style.setProperty('--ydesign-v-badge-rows-gap', getSet('ydesign_v_badge_rows_gap', 'ydesign_badge_rows_gap') + 'em');
            document.documentElement.style.setProperty('--ydesign-v-badges-gap', getSet('ydesign_v_badges_gap', 'ydesign_badges_gap_vert') + 'em');
            document.documentElement.style.setProperty('--ydesign-v-genres-gap', getSet('ydesign_v_genres_gap', 'ydesign_genres_gap') + 'em');
            document.documentElement.style.setProperty('--ydesign-v-content-pb', getSet('ydesign_v_content_pb', 'ydesign_content_pb') + 'em');
            document.documentElement.style.setProperty('--ydesign-v-slogan-padding', getSet('ydesign_v_slogan_padding', 'ydesign_slogan_padding') + 'em');
            document.documentElement.style.setProperty('--ydesign-v-uniform-v-gap-val', getSet('ydesign_v_uniform_v_gap_val', 'ydesign_uniform_v_gap_val_vert') + 'em');

            var vAlignLogo = getSet('ydesign_v_align_logo', 'ydesign_align_logo');
            document.documentElement.style.setProperty('--ydesign-v-align-logo-flex', getFlexAlign(vAlignLogo));
            document.documentElement.style.setProperty('--ydesign-v-align-logo', vAlignLogo);
            document.documentElement.style.setProperty('--ydesign-v-align-add-title', getSet('ydesign_v_align_add_title', 'ydesign_align_add_title'));
            var vAlignBadges = getSet('ydesign_v_align_badges', 'ydesign_align_badges');
            document.documentElement.style.setProperty('--ydesign-v-align-badges-flex', getFlexAlign(vAlignBadges));
            var vAlignSlogan = getSet('ydesign_v_align_slogan', 'ydesign_align_slogan');
            document.documentElement.style.setProperty('--ydesign-v-align-slogan-flex', getFlexAlign(vAlignSlogan));
            document.documentElement.style.setProperty('--ydesign-v-align-slogan', vAlignSlogan);

            // ----------------- ГОРИЗОНТАЛЬНІ ПАРАМЕТРИ -----------------


        } catch (e) {}
    }

    // =========================================================================
    // 11. МЕНЮ НАЛАШТУВАНЬ (YDesign)
    // =========================================================================

    // =========================================================================
    // 11.1. ПРЕСЕТИ ТА РОЗДІЛ «СТИЛІ»
    // =========================================================================
    function addPreconnect() {
        try {
            if (document.getElementById('ydesign-preconnect')) return;
            var l = document.createElement('link');
            l.id = 'ydesign-preconnect'; l.rel = 'preconnect'; l.href = 'https://image.tmdb.org'; l.crossOrigin = 'anonymous';
            document.head.appendChild(l);
        } catch (e) {}
    }

    function createStyleSettings() {
        var C = 'ydesign_styles';
        Lampa.SettingsApi.addParam({ component: C, param: { type: 'title' }, field: { name: 'Вигляд карток' } });
        Lampa.SettingsApi.addParam({ component: C,
            param: { name: 'ydesign_style', type: 'select', values: { classic: 'Класичний', glass: 'Скло (матова панель)', neon: 'Неон (бірюзове світіння)', cinema: 'Кінотеатр (золота рамка)', soft: 'М\u2019який (великі заокруглення)' }, default: DefaultSettings.ydesign_style },
            field: { name: 'Стиль карток', description: 'Заокруглення, колір рамки та акценту. Накладається поверх «Теми оформлення»' } });
        Lampa.SettingsApi.addParam({ component: C,
            param: { name: 'ydesign_focus_fx', type: 'select', values: { scale: 'Збільшення (стандарт)', lift: 'Підйом + тінь', glow: 'Світіння кольором постера', none: 'Без руху (лише рамка)' }, default: DefaultSettings.ydesign_focus_fx },
            field: { name: 'Ефект фокуса', description: 'Тінь і світіння працюють лише в режимі «Повні ефекти»; на слабких ТВ обирайте «Без руху»' } });
        Lampa.SettingsApi.addParam({ component: C,
            param: { name: 'ydesign_card_anim', type: 'trigger', default: DefaultSettings.ydesign_card_anim },
            field: { name: 'Анімація появи карток', description: 'М\u2019яке виринання картки та мерехтіння-скелетон, поки вантажаться дані' } });
        Lampa.SettingsApi.addParam({ component: C,
            param: { name: 'ydesign_trakt_chip', type: 'trigger', default: DefaultSettings.ydesign_trakt_chip },
            field: { name: 'Чіп «Trakt» на переглянутих', description: 'Біля галочки показує, що фільм позначено переглянутим на Trakt (потрібен плагін Trakt+)' } });
    }

    function createSettings() {
        if (!window.Lampa || !Lampa.SettingsApi) return;

        var qualities = { 'w92': 'w92', 'w154': 'w154', 'w200': 'w200', 'w300': 'w300', 'w500': 'w500', 'w780': 'w780', 'original': 'Оригінал' };

        var textSizesExt = {};
        for (var i = 3; i <= 40; i += 1) { var v = (i / 10).toFixed(1); textSizesExt[v] = v; }

        var gaps = {};
        for (var g = -20; g <= 40; g += 1) { var gv = (g / 10).toFixed(1); gaps[gv] = gv + ' em'; }

        var tinyGaps = {};
        for (var tg = -20; tg <= 40; tg += 1) { var tgv = (tg * 0.05).toFixed(2); tinyGaps[tgv] = tgv + ' em'; }

        var microGaps = {};
        for (var mg = -100; mg <= 200; mg += 1) { var mgv = (mg / 100).toFixed(2); microGaps[mgv] = mgv + ' em'; }

        var logoSizes = {};
        for (var ls = 1; ls <= 34; ls += 3) { logoSizes[ls] = ls + '%'; }
        logoSizes[35] = '35%';
        [40, 50, 60, 70, 80, 90, 100].forEach(function (val) { logoSizes[val] = val + '%'; });

        var saturates = { '0': '0% (Чорно-білі)', '25': '25%', '75': '75%', '100': '100% (Кольорові)' };
        var aligns = { 'left': 'Ліворуч', 'center': 'По центру', 'right': 'Праворуч' };
        var shapes = { 'pill': 'Пігулка (Сучасний Pill Capsule)', 'rounded': 'Прямокутний скруглений (4px)', 'square': 'Прямокутний (2px)' };

        var sectionKeys = ['ydesign_styles', 'ydesign_grid', 'ydesign_vertical', 'ydesign_notch', 'ydesign_badges_style', 'ydesign_fonts', 'ydesign_texts', 'ydesign_series', 'ydesign_perf'];
        sectionKeys.forEach(function (compKey) {
            Lampa.Template.add('settings_' + compKey, '<div></div>');
        });

        Lampa.SettingsApi.addComponent({
            component: 'ydesign',
            name: CONFIG.name,
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect><path d="M8 8l4 4 4-4"></path><path d="M12 12v4"></path></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'ydesign',
            param: { name: 'ydesign_donate_btn_main', type: 'button' },
            field: {
                name: '💙 YDesign • Підтримати розробника',
                description: 'Натисніть для переходу на ymods.donatik.ua та отримання оновлень'
            },
            onChange: function () { window.open('https://ymods.donatik.ua/', '_blank'); }
        });

        Lampa.SettingsApi.addParam({
            component: 'ydesign',
            param: { type: 'title' },
            field: { name: 'Розділи налаштувань' }
        });

        var subSections = [
            { id: 'ydesign_styles', name: '🎨 Стилі, ефекти та Пресети', desc: 'Скло / Неон / Кінотеатр, ефект фокуса, анімації, готові пресети дизайну одним натиском' },
            { id: 'ydesign_grid', name: '🎬 Відображення карток та Сітка', desc: 'Вертикальні картки: кількість колонок та ліниве завантаження' },
            { id: 'ydesign_vertical', name: '📱 Вертикальні картки', desc: 'Окремі налаштування розмірів, логотипу, слогану, бейджів, відступів та вирівнювання' },
            { id: 'ydesign_notch', name: '✂️ Верхні бейджі', desc: 'Верхній блок вирізу: тип (Фільм/Серіал), стандартні мітки, статус перегляду' },
            { id: 'ydesign_badges_style', name: '🏷️ Стилі бейджів та Рейтинги', desc: 'Форма пігулок, скляна підложка, рамки бейджів, кольори віку/UA, вибір рейтингів' },
            { id: 'ydesign_fonts', name: '🔤 Шрифти', desc: 'Вибір шрифтів Google Fonts для всієї програми' },
            { id: 'ydesign_texts', name: '🔤 Мови, Логотипи та Якість', desc: 'Вибір мов (лого, слоган, опис), тип логотипу та якість зображень TMDB' },
            { id: 'ydesign_series', name: '📺 Редизайн Серій та Епізодів', desc: 'Розміри бейджів і тексту, кількість карток, стиль пігулок, дата, озвучка, рейтинг' },
            { id: 'ydesign_perf', name: '⚙️ API Ключі, Кеш та Підтримка', desc: 'OMDb/MDBList ключі, очищення кешу плагіну та QR підтримки' }
        ];

        subSections.forEach(function (sub) {
            Lampa.SettingsApi.addParam({
                component: 'ydesign',
                param: { type: 'button' },
                field: { name: sub.name, description: sub.desc },
                onChange: function () {
                    Lampa.Settings.create(sub.id, {
                        onBack: function () {
                            Lampa.Settings.create('ydesign');
                        }
                    });
                }
            });
        });

        // -------------------------------------------------------------
        createStyleSettings();
        // ПІДКАТЕГОРІЯ 1: СІТКА ТА ТИПИ КАРТОК (ydesign_grid)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_lazy_load', type: 'trigger', default: DefaultSettings.ydesign_lazy_load }, field: { name: 'Ліниве завантаження', description: 'Завантажувати додаткові дані (лого, рейтинги) тільки при появі картки на екрані' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_ua_torrents', type: 'trigger', default: DefaultSettings.ydesign_ua_torrents }, field: { name: 'UA-плашка за торентами', description: 'Додатково шукати українську озвучку через парсер Lampa (Jackett/Prowlarr/JacRed з Толокою тощо). Видимі картки перевіряються у фоні без наведення. Потрібен налаштований парсер' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_ribbons', type: 'trigger', default: DefaultSettings.ydesign_ribbons }, field: { name: 'Позначки «Новинка» / «Скоро»', description: 'Новинка — вийшло менше ніж 14 днів тому; Нова серія — серіал/аніме з серією в найближчі 14 днів; Скоро — прем’єра серіалу' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_watched_mark', type: 'trigger', default: DefaultSettings.ydesign_watched_mark }, field: { name: 'Позначка «Переглянуто»', description: 'Підтверджений статус Trakt+ для поточного акаунта; локальна історія зберігає лише прогрес' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_progress_marks', type: 'trigger', default: DefaultSettings.ydesign_progress_marks }, field: { name: 'Прогрес на картках', description: 'Смужка для розпочатих фільмів; для серіалів — «Далі S2E5», «+3» непереглянутих і кільце сезону «7/12»' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_collection_mark', type: 'trigger', default: DefaultSettings.ydesign_collection_mark }, field: { name: 'Мітка «Продовження»', description: 'Для фільму з франшизи, попередню частину якого ви вже дивились' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_row_continue', type: 'trigger', default: DefaultSettings.ydesign_row_continue }, field: { name: 'Рядок «Продовжити перегляд»', description: 'На головній: розпочаті серіали та фільми з лічильником. Дані з’являються після першого фонового завантаження' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_row_week', type: 'trigger', default: DefaultSettings.ydesign_row_week }, field: { name: 'Рядок «Виходять цього тижня»', description: 'На головній: серіали й аніме з вашого списку, у яких цього тижня вийде нова серія' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_theme', type: 'select', values: { 'default': 'Стандартна', 'netflix': 'Netflix (червоний акцент)', 'minimal': 'Мінімалістична', 'warm': 'Тепла (бурштин)', 'oled': 'OLED (чорний фон)' }, default: DefaultSettings.ydesign_theme }, field: { name: 'Тема оформлення', description: 'Колір рамки фокуса й акценту, заокруглення карток' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_perf_mode', type: 'select', values: { 'auto': 'Авто (на ТВ — економний)', 'lite': 'Економний (без blur, для ТВ)', 'fx': 'Повні ефекти (blur, тіні, блиск)' }, default: DefaultSettings.ydesign_perf_mode }, field: { name: 'Режим продуктивності', description: 'Економний режим прибирає blur і важкі фільтри — скролінг стає плавнішим на приставках і ТВ' } });


        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_grid_items_v', type: 'select', values: { '4': '4', '5': '5', '6': '6', '7': '7', '8': '8' }, default: DefaultSettings.ydesign_grid_items_v }, field: { name: 'Кількість карток у рядку (Вертикальні)' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_card_gap', type: 'select', values: gaps, default: DefaultSettings.ydesign_card_gap }, field: { name: 'Відстань між картками' } });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 2: ВЕРТИКАЛЬНІ КАРТКИ (ydesign_vertical)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { type: 'title' }, field: { name: 'Розміри логотипу та назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_logo_max_h', type: 'select', values: logoSizes, default: DefaultSettings.ydesign_v_logo_max_h }, field: { name: 'Макс. висота логотипу/тексту' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_logo_max_w', type: 'select', values: logoSizes, default: DefaultSettings.ydesign_v_logo_max_w }, field: { name: 'Макс. ширина логотипу/тексту' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_title_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_title_size }, field: { name: 'Розмір тексту основної назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_show_add_title', type: 'trigger', default: DefaultSettings.ydesign_v_show_add_title }, field: { name: 'Показувати додаткову назву' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_add_title_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_add_title_size }, field: { name: 'Розмір додаткової назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_show_slogan', type: 'trigger', default: DefaultSettings.ydesign_v_show_slogan }, field: { name: 'Показувати слоган' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_slogan_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_slogan_size }, field: { name: 'Розмір слогану' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { type: 'title' }, field: { name: 'Видимість та розміри бейджів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_show_year', type: 'trigger', default: DefaultSettings.ydesign_v_show_year }, field: { name: 'Показувати Рік' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_show_seasons', type: 'trigger', default: DefaultSettings.ydesign_v_show_seasons }, field: { name: 'Показувати Сезони/Серії' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_show_age', type: 'trigger', default: DefaultSettings.ydesign_v_show_age }, field: { name: 'Показувати віковий рейтинг' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_show_ua', type: 'trigger', default: DefaultSettings.ydesign_v_show_ua }, field: { name: 'Показувати плашку UA' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_show_genres', type: 'trigger', default: DefaultSettings.ydesign_v_show_genres }, field: { name: 'Показувати Жанри' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_badges_one_row', type: 'trigger', default: DefaultSettings.ydesign_v_badges_one_row }, field: { name: 'Усі бейджі в 1 ряд' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_uniform_badges', type: 'trigger', default: DefaultSettings.ydesign_v_uniform_badges }, field: { name: 'Усі бейджі одного розміру' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_badge_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_badge_size }, field: { name: 'Базовий розмір бейджів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_year_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_year_size }, field: { name: 'Розмір бейджу Року' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_age_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_age_size }, field: { name: 'Розмір бейджу Віку' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_seasons_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_seasons_size }, field: { name: 'Розмір бейджу Сезонів/Серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_ua_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_ua_size }, field: { name: 'Розмір бейджу UA озвучки' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_genres_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_genres_size }, field: { name: 'Розмір бейджів Жанрів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_rating_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_v_rating_size }, field: { name: 'Розмір бейджів Рейтингів' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { type: 'title' }, field: { name: 'Вирівнювання та Відступи' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_align_logo', type: 'select', values: aligns, default: DefaultSettings.ydesign_v_align_logo }, field: { name: 'Центрування: Логотип/Назва' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_align_add_title', type: 'select', values: aligns, default: DefaultSettings.ydesign_v_align_add_title }, field: { name: 'Центрування: Додаткова назва' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_align_badges', type: 'select', values: aligns, default: DefaultSettings.ydesign_v_align_badges }, field: { name: 'Центрування: Бейджі/Рейтинги' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_align_slogan', type: 'select', values: aligns, default: DefaultSettings.ydesign_v_align_slogan }, field: { name: 'Центрування: Слоган' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_uniform_v_gaps', type: 'trigger', default: DefaultSettings.ydesign_v_uniform_v_gaps }, field: { name: 'Математично однакові вертикальні відступи' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_uniform_v_gap_val', type: 'select', values: microGaps, default: DefaultSettings.ydesign_v_uniform_v_gap_val }, field: { name: 'Значення вертикального відступу' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_badges_gap', type: 'select', values: tinyGaps, default: DefaultSettings.ydesign_v_badges_gap }, field: { name: 'Відстань між бейджами по горизонталі' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_badge_rows_gap', type: 'select', values: gaps, default: DefaultSettings.ydesign_v_badge_rows_gap }, field: { name: 'Відступ між рядками бейджів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_genres_gap', type: 'select', values: tinyGaps, default: DefaultSettings.ydesign_v_genres_gap }, field: { name: 'Відступ для блоку Жанрів (Ручний режим)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_content_pb', type: 'select', values: gaps, default: DefaultSettings.ydesign_v_content_pb }, field: { name: 'Відступ контенту знизу' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_slogan_padding', type: 'select', values: gaps, default: DefaultSettings.ydesign_v_slogan_padding }, field: { name: 'Відступ слогану зверху' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_logo_mb', type: 'select', values: gaps, default: DefaultSettings.ydesign_v_logo_mb }, field: { name: 'Відступ назви/лого від бейджів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_vertical', param: { name: 'ydesign_v_add_title_mb', type: 'select', values: gaps, default: DefaultSettings.ydesign_v_add_title_mb }, field: { name: 'Відступ додаткової назви від бейджів' } });

        // -------------------------------------------------------------
        // -------------------------------------------------------------


        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ: ВЕРХНІ БЕЙДЖІ (ydesign_notch)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_show', type: 'trigger', default: DefaultSettings.ydesign_notch_show },
            field: { name: 'Показувати верхні бейджі', description: 'Блок-виріз зверху посередині картки' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_bg', type: 'trigger', default: DefaultSettings.ydesign_notch_bg },
            field: { name: 'Скляна підложка', description: 'Напівпрозоре скло для блоку' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_border', type: 'trigger', default: DefaultSettings.ydesign_notch_border },
            field: { name: 'Контурна рамка', description: 'Рамка по контуру блоку (одна на весь блок)' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_std_monochrome', type: 'trigger', default: DefaultSettings.ydesign_notch_std_monochrome },
            field: { name: 'Монохромні іконки міток', description: 'Відображати стандартні іконки білим кольором замість різнокольорових' }
        });

        Lampa.SettingsApi.addParam({ component: 'ydesign_notch', param: { type: 'title' }, field: { name: 'Розміри бейджів у блоці' } });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_uniform_size', type: 'trigger', default: DefaultSettings.ydesign_notch_uniform_size },
            field: { name: 'Всі одного розміру', description: 'Однакова величина всіх елементів або окремо для кожного блоку' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_notch_size },
            field: { name: 'Загальний розмір бейджів', description: 'Діє, коли увімкнено варіант "Всі одного розміру"' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_type_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_notch_type_size },
            field: { name: 'Розмір типу (Фільм/Серіал)', description: 'Розмір шрифту першого блоку типу' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_standard_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_notch_standard_size },
            field: { name: 'Розмір стандартних міток', description: 'Розмір іконок закладок, подобається, пізніше, історії' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_custom_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_notch_custom_size },
            field: { name: 'Розмір мітки статусу/custom-favs', description: 'Розмір тексту бейджа статусу перегляду (Дивлюся тощо)' }
        });

        Lampa.SettingsApi.addParam({ component: 'ydesign_notch', param: { type: 'title' }, field: { name: 'Групи бейджів у блоці' } });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_show_type', type: 'trigger', default: DefaultSettings.ydesign_notch_show_type },
            field: { name: '1. Тип медіа (Фільм / Серіал)', description: 'Перший блок рядка' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_show_standard', type: 'trigger', default: DefaultSettings.ydesign_notch_show_standard },
            field: { name: '2. Стандартні мітки Lampa', description: 'Другий блок: закладки, подобається, пізніше, історія' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_notch',
            param: { name: 'ydesign_notch_show_custom', type: 'trigger', default: DefaultSettings.ydesign_notch_show_custom },
            field: { name: '3. Мітки статусу (Дивлюся / custom-favs)', description: 'Третій блок: статус перегляду та списки custom-favs' }
        });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 4: СТИЛІ БЕЙДЖІВ ТА РЕЙТИНГИ (ydesign_badges_style)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_badge_shape', type: 'select', values: shapes, default: DefaultSettings.ydesign_badge_shape }, field: { name: 'Форма бейджів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_glass_pill_bg', type: 'trigger', default: DefaultSettings.ydesign_glass_pill_bg }, field: { name: 'Скляна підложка (Liquid Glass)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_color_age', type: 'trigger', default: DefaultSettings.ydesign_color_age }, field: { name: 'Кольорові бейджі віку' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_color_ua', type: 'trigger', default: DefaultSettings.ydesign_color_ua }, field: { name: 'Кольорова плашка UA (Синьо-жовта)' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { type: 'title' }, field: { name: 'Окремі рамки для елементів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_border_year', type: 'trigger', default: DefaultSettings.ydesign_border_year }, field: { name: 'Рамка для бейджу Року' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_border_age', type: 'trigger', default: DefaultSettings.ydesign_border_age }, field: { name: 'Рамка для бейджу Віку' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_border_seasons', type: 'trigger', default: DefaultSettings.ydesign_border_seasons }, field: { name: 'Рамка для бейджу Сезонів/Серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_border_ua', type: 'trigger', default: DefaultSettings.ydesign_border_ua }, field: { name: 'Рамка для бейджу UA озвучки' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_border_genres', type: 'trigger', default: DefaultSettings.ydesign_border_genres }, field: { name: 'Рамка для бейджів Жанрів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_border_ratings', type: 'trigger', default: DefaultSettings.ydesign_border_ratings }, field: { name: 'Рамка для бейджів Рейтингів' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { type: 'title' }, field: { name: 'Вибір та насиченість рейтингів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges_style', param: { name: 'ydesign_ratings_saturate', type: 'select', values: saturates, default: DefaultSettings.ydesign_ratings_saturate }, field: { name: 'Насиченість іконок рейтингів' } });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_badges_style',
            param: { name: 'ydesign_ratings_order_btn', type: 'button' },
            field: { name: 'Порядок та вибір рейтингів', description: getSet('ydesign_ratings_order') },
            onChange: function () {
                Lampa.Input.edit({
                    title: 'Введіть через кому (tmdb, imdb, rt, mc, trakt, mdblist, popcorn, letterboxd, kp)',
                    value: getSet('ydesign_ratings_order'),
                    free: true, nosave: true
                }, function (new_val) {
                    if (new_val !== undefined) {
                        Lampa.Storage.set('ydesign_ratings_order', new_val.trim().toLowerCase());
                        Lampa.Settings.update();
                    }
                });
            }
        });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ: ШРИФТИ (ydesign_fonts)
        // -------------------------------------------------------------
        var fontOptions = {
            'golos-montserrat': 'Golos Text + Montserrat (рекомендовано)',
            'golos': 'Golos Text',
            'manrope': 'Manrope',
            'montserrat': 'Montserrat',
            'inter': 'Inter',
            'inter-montserrat': 'Inter + Montserrat',
            'custom': 'Свій шрифт',
            'off': 'Як у Lampa (SegoeUI)'
        };

        Lampa.SettingsApi.addParam({
            component: 'ydesign_fonts',
            param: { name: 'ydesign_font', type: 'select', values: fontOptions, default: DefaultSettings.ydesign_font },
            field: { name: 'Шрифт інтерфейсу', description: 'Завантажується з Google Fonts, діє на всю програму' }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_fonts',
            param: { name: 'ydesign_font_family_btn', type: 'button' },
            field: { name: 'Назва власного шрифту', description: getSet('ydesign_font_family') || 'Не вказано (наприклад: Golos Sharp)' },
            onChange: function () {
                Lampa.Input.edit({ title: 'Назва власного шрифту', value: getSet('ydesign_font_family'), free: true, nosave: true }, function (new_val) {
                    if (new_val !== undefined) {
                        Lampa.Storage.set('ydesign_font_family', new_val.trim());
                        fontApply();
                        Lampa.Settings.update();
                    }
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_fonts',
            param: { name: 'ydesign_font_css_btn', type: 'button' },
            field: { name: 'URL CSS власного шрифту', description: getSet('ydesign_font_css') || 'Не вказано (наприклад: http://.../font.css)' },
            onChange: function () {
                Lampa.Input.edit({ title: 'URL CSS власного шрифту', value: getSet('ydesign_font_css'), free: true, nosave: true }, function (new_val) {
                    if (new_val !== undefined) {
                        Lampa.Storage.set('ydesign_font_css', new_val.trim());
                        fontApply();
                        Lampa.Settings.update();
                    }
                });
            }
        });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 5: МОВИ, ЛОГОТИПИ ТА ЯКІСТЬ (ydesign_texts)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_logo_type', type: 'select', values: { 'logo': 'Логотип (зображення)', 'text': 'Текст' }, default: DefaultSettings.ydesign_logo_type }, field: { name: 'Відображення назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_lang', type: 'select', values: { 'uk': 'Тільки Українська', 'uk_en': 'Укр -> Англ -> Ориг', 'en_orig': 'Англ -> Ориг' }, default: DefaultSettings.ydesign_lang }, field: { name: 'Мова логотипу/назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_slogan_lang', type: 'select', values: { 'uk': 'Тільки Українська', 'uk_en': 'Укр (Англ. якщо немає)', 'en': 'Тільки Англійська' }, default: DefaultSettings.ydesign_slogan_lang }, field: { name: 'Мова слогану' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_add_title_lang', type: 'select', values: { 'uk': 'Завжди Українська', 'en': 'Завжди Англійська', 'auto': 'Залежить від логотипу' }, default: DefaultSettings.ydesign_add_title_lang }, field: { name: 'Мова додаткової назви' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_poster_quality', type: 'select', values: qualities, default: DefaultSettings.ydesign_poster_quality }, field: { name: 'Якість постерів' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_logo_quality', type: 'select', values: qualities, default: DefaultSettings.ydesign_logo_quality }, field: { name: 'Якість логотипів' } });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 6: РЕДИЗАЙН СЕРІЙ ТА ЕПІЗОДІВ (ydesign_series)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_redesign', type: 'trigger', default: DefaultSettings.ydesign_series_redesign }, field: { name: 'Змінити вигляд серій', description: 'Активувати новий вигляд карток всередині серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_cards', type: 'select', values: { '1': '1', '2': '2', '3': '3', '4': '4' }, default: DefaultSettings.ydesign_series_cards }, field: { name: 'Кількість карток серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_hide_left_column', type: 'trigger', default: DefaultSettings.ydesign_hide_left_column }, field: { name: 'Прибрати ліву колонку (Серії)', description: 'Приховує опис та розтягує картки серій на весь екран' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { type: 'title' }, field: { name: 'Розміри елементів на картках серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_badge_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_series_badge_size }, field: { name: 'Розмір бейджів на серіях' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_title_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_series_title_size }, field: { name: 'Розмір назви серії' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { type: 'title' }, field: { name: 'Стиль та бейджі на картках серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_badge_shape', type: 'select', values: shapes, default: DefaultSettings.ydesign_series_badge_shape }, field: { name: 'Форма бейджів на серіях' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_glass_pill', type: 'trigger', default: DefaultSettings.ydesign_series_glass_pill }, field: { name: 'Скляна підложка (Liquid Glass)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_border_badges', type: 'trigger', default: DefaultSettings.ydesign_series_border_badges }, field: { name: 'Рамка для бейджів серій' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_date', type: 'trigger', default: DefaultSettings.ydesign_series_show_date }, field: { name: 'Показувати дату виходу (зверху ліворуч)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_voice', type: 'trigger', default: DefaultSettings.ydesign_series_show_voice }, field: { name: 'Показувати студію озвучки (окремим рядком)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_rate', type: 'trigger', default: DefaultSettings.ydesign_series_show_rate }, field: { name: 'Показувати рейтинг (зверху праворуч)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_time', type: 'trigger', default: DefaultSettings.ydesign_series_show_time }, field: { name: 'Показувати тривалість серії (знизу праворуч)' } });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 7: API КЛЮЧІ, КЕШ ТА ПІДТРИМКА (ydesign_perf)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_omdb_key_btn', type: 'button' },
            field: { name: 'OMDB API Key', description: getSet('ydesign_omdb_key') ? 'Встановлено' : 'Не встановлено' },
            onChange: function () {
                Lampa.Input.edit({ title: 'OMDB API Key', value: getSet('ydesign_omdb_key'), free: true, nosave: true }, function (new_val) {
                    if (new_val !== undefined) { Lampa.Storage.set('ydesign_omdb_key', new_val.trim()); Lampa.Settings.update(); }
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_mdblist_key_btn', type: 'button' },
            field: { name: 'MDBList API Key', description: getSet('ydesign_mdblist_key') ? 'Встановлено' : 'Не встановлено' },
            onChange: function () {
                Lampa.Input.edit({ title: 'MDBList API Key', value: getSet('ydesign_mdblist_key'), free: true, nosave: true }, function (new_val) {
                    if (new_val !== undefined) { Lampa.Storage.set('ydesign_mdblist_key', new_val.trim()); Lampa.Settings.update(); }
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_clear_cache', type: 'button' },
            field: { name: 'Очистити кеш плагіну', description: 'Видаляє кеш зображень, рейтингів та перевірок озвучки' },
            onChange: function () {
                MemoryCache.clear();
                persistData = {}; ProminentColorStore = {}; PCCount = 0;
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && (key.indexOf('ydesign_c_') === 0 || key.indexOf('ydesign_cache_') === 0)) keysToRemove.push(key);
                }
                keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
                Lampa.Noty.show('Кеш плагіну успішно очищено (' + keysToRemove.length + ' записів)');
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_donate_qr', type: 'button' },
            field: {
                name: 'Підтримати розробника',
                description: '<div style="margin-top:0.5em;"><img src="https://raw.githubusercontent.com/yarikrazor-star/lmp/refs/heads/main/qrcode_363224392_90d1274dab2843222e1b2172e2fe0026.png" style="width:230px; border-radius:10px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);"></div><div style="margin-top:0.5em; opacity:0.8;">Натисніть для переходу на ymods.donatik.ua</div>'
            },
            onChange: function () { window.open('https://ymods.donatik.ua/', '_blank'); }
        });

        Lampa.Settings.listener.follow('change', onSettingChange);
    }

    var CardSettingsEpoch = 0, SettingRefresh = null, SettingChanges = {};
    function onSettingChange(e) {
        if (!e || !e.name) return;
        if (/^ydesign_card_type_/.test(e.name)) { migrateVertical(); return; }
        // Ignore data caches and settings from removed features.
        if (!Object.prototype.hasOwnProperty.call(DefaultSettings, e.name)) return;
        SettingsMemo = {}; LiteCache.t = 0;
        SettingChanges[e.name] = true;
        if (SettingRefresh) return;
        SettingRefresh = setTimeout(function () {
            SettingRefresh = null;
            var changes = SettingChanges; SettingChanges = {};
            applyDynamicCSS();
            if (changes.ydesign_font || changes.ydesign_font_family || changes.ydesign_font_css) fontApply();
            if (changes.ydesign_series_redesign) bindSeriesLogic();
            var rebuild = Object.keys(changes).some(function (name) {
                return /lang|quality|ratings_order|omdb_key|mdblist_key|show_genres|show_slogan|show_add_title/.test(name);
            });
            if (rebuild) {
                CardSettingsEpoch++;
                document.querySelectorAll('.activity--active .ydesign-card').forEach(function (c) {
                    if (c.offsetParent !== null && c._ydesign_data) buildCardCustomDOM(c, c._ydesign_data);
                });
            }
            if (Object.keys(changes).some(function (name) { return /notch_|watched_mark|progress_marks|collection_mark/.test(name); })) scheduleRefreshMarks();
        }, 60);
    }

    // =========================================================================
    // 12. ПЕРЕХОПЛЕННЯ ТА РЕНДЕРИНГ КАРТОК
    // =========================================================================
    function overrideCards() {
        installFocusHooks();
        try {
            var CardMaker = Lampa.Maker.map('Card');
            if (!CardMaker || !CardMaker.Card) return;

            if (CardMaker.Favorite) {
                var originalFavoriteOnUpdate = CardMaker.Favorite.onUpdate;
                CardMaker.Favorite.onUpdate = function () {
                    if (typeof originalFavoriteOnUpdate === 'function') {
                        originalFavoriteOnUpdate.apply(this, arguments);
                    }
                    if (this.html) {
                        var cardEl = this.html[0] || this.html;
                        if (cardEl && cardEl._ydesign_updateNotch) {
                            cardEl._ydesign_updateNotch();
                        }
                    }
                };
            }

            var originalOnCreate = CardMaker.Card.onCreate;
            var originalOnVisible = CardMaker.Card.onVisible;

            CardMaker.Card.onCreate = function () {
                if (isMovieCard(this.data, this.html)) {
                    if (typeof this.getPosterPath === 'function') {
                        this.nativeGetPosterPath = this.getPosterPath;
                        this.getPosterPath = function () {
                            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        };
                    }
                    if (typeof this.getBackgroundPath === 'function') {
                        this.nativeGetBackgroundPath = this.getBackgroundPath;
                        this.getBackgroundPath = function () {
                            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        };
                    }
                }

                if (typeof originalOnCreate === 'function') {
                    originalOnCreate.apply(this, arguments);
                }
            };

            CardMaker.Card.onVisible = function () {
                if (isMovieCard(this.data, this.html)) {
                    this.image_loaded = true;
                    if (this.img && !this.img.src) {
                        this.img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                    }
                    if (this.html) {
                        this.html.removeClass('card--preload').addClass('card--loaded');
                    }
                }

                if (typeof originalOnVisible === 'function') {
                    originalOnVisible.apply(this, arguments);
                }

                if (isMovieCard(this.data, this.html)) {
                    var cardEl = this.html[0] || this.html;
                    if (!cardEl._ydesign_built || cardEl._ydesign_settingsEpoch !== CardSettingsEpoch) {
                        cardEl._ydesign_built = true;
                        cardEl._ydesign_data = this.data;

                        try {
                            var act = Lampa.Activity.active() || {};
                            cardEl._ydesign_inHistory = (act.component === 'favorite' && (act.type === 'history' || (act.params && act.params.type === 'history')));
                        } catch (eH) {}

                        buildCardCustomDOM(cardEl, this.data);
                    }
                }
            };
        } catch (e) {}
    }

    // =========================================================================
    // 13. ПОКРАЩЕНИЙ РЕДИЗАЙН СЕРІЙ ТА ЕПІЗОДІВ
    // =========================================================================
    function cleanBulletsAndSymbols(str) {
        if (!str) return '';
        return str
            .replace(/[\u2022\u25CF\u00B7\u2219\u2043\u25AA\u25AB\u25C6\u2023•●·|*—–/\\]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isValidNumericRating(str) {
        if (!str) return false;
        var cleaned = str.replace(/[★\s]/g, '').trim();
        if (!/^\d+(\.\d+)?$/.test(cleaned)) return false;
        var num = parseFloat(cleaned);
        return !isNaN(num) && num > 0 && num <= 10;
    }

    function isQualityString(str) {
        if (!str) return false;
        return /^(2160p|1080p|720p|480p|360p|4k|uhd|hdr|fhd|hd|sd)$/i.test(str.trim());
    }

    function hookTemplates() {
        if (!window.Lampa || !Lampa.Template) return;
        
        if (Lampa.Template.get && !Lampa.Template._ydesign_hooked_get) {
            Lampa.Template._ydesign_hooked_get = true;
            var origGet = Lampa.Template.get;
            Lampa.Template.get = function(name, vars, like_static) {
                var res = origGet.apply(this, arguments);
                if (name === 'online_prestige_full' && vars) {
                    try {
                        if (typeof res === 'object' && res.length && res[0]) {
                            res[0]._online_data = vars;
                            res[0].data = vars;
                            if (vars.season !== undefined) res[0].dataset.season = vars.season;
                            if (vars.episode !== undefined) res[0].dataset.episode = vars.episode;
                            if (vars.voice_name) res[0].dataset.voice = vars.voice_name;
                            if (vars.quality) res[0].dataset.quality = vars.quality;
                        }
                    } catch(e) {}
                }
                return res;
            };
        }
        
        if (Lampa.Template.js && !Lampa.Template._ydesign_hooked_js) {
            Lampa.Template._ydesign_hooked_js = true;
            var origJs = Lampa.Template.js;
            Lampa.Template.js = function(name, vars) {
                var res = origJs.apply(this, arguments);
                if (name === 'online_prestige_full' && vars && res) {
                    try {
                        res._online_data = vars;
                        res.data = vars;
                        if (vars.season !== undefined) res.dataset.season = vars.season;
                        if (vars.episode !== undefined) res.dataset.episode = vars.episode;
                        if (vars.voice_name) res.dataset.voice = vars.voice_name;
                        if (vars.quality) res.dataset.quality = vars.quality;
                    } catch(e) {}
                }
                return res;
            };
        }
    }

    function getCurrentMovie() {
        if (!window.Lampa) return null;
        if (Lampa.Activity && Lampa.Activity.active) {
            var act = Lampa.Activity.active();
            if (act) {
                if (act.movie) {
                    var m1 = typeof act.movie === 'function' ? act.movie() : act.movie;
                    if (m1 && (m1.id || m1.title || m1.name)) return m1;
                }
                if (act.card) {
                    var m2 = typeof act.card === 'function' ? act.card() : act.card;
                    if (m2 && (m2.id || m2.title || m2.name)) return m2;
                }
                if (act.data && act.data.movie) return act.data.movie;
                if (act.activity) {
                    var a = act.activity;
                    if (a.movie) {
                        var m3 = typeof a.movie === 'function' ? a.movie() : a.movie;
                        if (m3 && (m3.id || m3.title || m3.name)) return m3;
                    }
                    if (a.card) {
                        var m4 = typeof a.card === 'function' ? a.card() : a.card;
                        if (m4 && (m4.id || m4.title || m4.name)) return m4;
                    }
                    if (a.object && a.object.movie) return a.object.movie;
                    if (a.props && a.props.card) return a.props.card;
                }
            }
        }
        if (window.lampa_movie) return window.lampa_movie;
        return null;
    }

    function getEpisodeNumber(card) {
        var data = card.data || card._online_data || {};
        
        if (data.episode !== undefined && data.episode !== null && data.episode !== '') {
            var epD = parseInt(data.episode, 10);
            if (!isNaN(epD) && epD > 0) return epD;
        }
        
        if (card.dataset.episode) {
            var epDs = parseInt(card.dataset.episode, 10);
            if (!isNaN(epDs) && epDs > 0) return epDs;
        }
        
        var epBadge = card.querySelector('.online-prestige__episode-number');
        if (epBadge) {
            var epBNum = parseInt(epBadge.innerText.trim(), 10);
            if (!isNaN(epBNum) && epBNum > 0) return epBNum;
        }
        
        var rawText = ((data.title || '') + ' ' + (card.querySelector('.online-prestige__title') ? card.querySelector('.online-prestige__title').innerText : '')).toLowerCase();
        
        var seMatch = /s\d+\s*e(\d+)/i.exec(rawText);
        if (seMatch) {
            var epSe = parseInt(seMatch[1], 10);
            if (!isNaN(epSe) && epSe > 0) return epSe;
        }
        
        var epMatch = /(?:епізод|серія|серия|episode|ep)\s*(\d+)|(\d+)\s*(?:епізод|серія|серия|episode|ep)/i.exec(rawText);
        if (epMatch) {
            var epM = parseInt(epMatch[1] || epMatch[2], 10);
            if (!isNaN(epM) && epM > 0) return epM;
        }
        
        var singleNumMatch = /^\s*0*(\d{1,3})\s*$/.exec(rawText.trim());
        if (singleNumMatch) {
            var epSg = parseInt(singleNumMatch[1], 10);
            if (!isNaN(epSg) && epSg > 0) return epSg;
        }
        
        if (card.parentNode) {
            var siblings = card.parentNode.querySelectorAll('.online-prestige--full');
            for (var i = 0; i < siblings.length; i++) {
                if (siblings[i] === card) {
                    return i + 1;
                }
            }
        }
        
        return null;
    }

    function getSeasonNumber(card) {
        var data = card.data || card._online_data || {};
        
        if (data.season !== undefined && data.season !== null && data.season !== '') {
            var sD = parseInt(data.season, 10);
            if (!isNaN(sD) && sD > 0) return sD;
        }
        
        if (card.dataset.season) {
            var sDs = parseInt(card.dataset.season, 10);
            if (!isNaN(sDs) && sDs > 0) return sDs;
        }
        
        var rawText = ((data.title || '') + ' ' + (card.querySelector('.online-prestige__title') ? card.querySelector('.online-prestige__title').innerText : '')).toLowerCase();
        
        var seMatch = /s(\d+)\s*e\d+/i.exec(rawText);
        if (seMatch) {
            var sSe = parseInt(seMatch[1], 10);
            if (!isNaN(sSe) && sSe > 0) return sSe;
        }
        
        var sMatch = /(?:сезон|season)\s*(\d+)|(\d+)\s*(?:сезон|season)/i.exec(rawText);
        if (sMatch) {
            var sM = parseInt(sMatch[1] || sMatch[2], 10);
            if (!isNaN(sM) && sM > 0) return sM;
        }
        
        var filterSeasonEl = document.querySelector('.filter--filter, .filter--sort, .explorer__files-head');
        if (filterSeasonEl) {
            var fText = filterSeasonEl.innerText.toLowerCase();
            var fMatch = /(?:сезон|season)\s*(\d+)|(\d+)\s*(?:сезон|season)/i.exec(fText);
            if (fMatch) {
                var sf = parseInt(fMatch[1] || fMatch[2], 10);
                if (!isNaN(sf) && sf > 0) return sf;
            }
        }
        
        return 1;
    }

    var InFlightSeasonRequests = {};
    function fetchTmdbSeason(tvId, seasonNum) {
        var cacheKey = 'tmdb_season_v7_' + tvId + '_' + seasonNum;
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);
        
        if (InFlightSeasonRequests[cacheKey]) {
            return InFlightSeasonRequests[cacheKey];
        }
        
        var tmdbKey = CONFIG.tmdbKey();
        var promise = new Promise(function (resolve) {
            var urlUk = 'https://api.themoviedb.org/3/tv/' + tvId + '/season/' + seasonNum + '?api_key=' + tmdbKey + '&language=uk-UA';
            
            $.ajax({
                url: urlUk,
                timeout: 5000,
                success: function (dataUk) {
                    var needEn = false;
                    if (dataUk && dataUk.episodes && dataUk.episodes.length) {
                        for (var i = 0; i < dataUk.episodes.length; i++) {
                            var eName = (dataUk.episodes[i].name || '').trim();
                            if (!eName || eName.indexOf('Епізод') === 0 || eName.indexOf('Эпизод') === 0 || eName.indexOf('Episode') === 0) {
                                needEn = true;
                                break;
                            }
                        }
                    }
                    
                    if (needEn) {
                        var urlEn = 'https://api.themoviedb.org/3/tv/' + tvId + '/season/' + seasonNum + '?api_key=' + tmdbKey + '&language=en-US';
                        $.ajax({
                            url: urlEn,
                            timeout: 3500,
                            success: function (dataEn) {
                                if (dataUk.episodes && dataEn.episodes) {
                                    for (var j = 0; j < dataUk.episodes.length; j++) {
                                        var epUk = dataUk.episodes[j];
                                        var epEn = null;
                                        for (var k = 0; k < dataEn.episodes.length; k++) {
                                            if (parseInt(dataEn.episodes[k].episode_number, 10) === parseInt(epUk.episode_number, 10)) {
                                                epEn = dataEn.episodes[k];
                                                break;
                                            }
                                        }
                                        if (epEn) {
                                            var uName = (epUk.name || '').trim();
                                            if (!uName || uName.indexOf('Епізод') === 0 || uName.indexOf('Эпизод') === 0 || uName === ('Episode ' + epUk.episode_number)) {
                                                epUk.name = epEn.name;
                                            }
                                            if (!epUk.overview && epEn.overview) epUk.overview = epEn.overview;
                                            if (!epUk.runtime && epEn.runtime) epUk.runtime = epEn.runtime;
                                        }
                                    }
                                }
                                ApiCache.set(cacheKey, dataUk);
                                delete InFlightSeasonRequests[cacheKey];
                                resolve(dataUk);
                            },
                            error: function () {
                                ApiCache.set(cacheKey, dataUk);
                                delete InFlightSeasonRequests[cacheKey];
                                resolve(dataUk);
                            }
                        });
                    } else {
                        ApiCache.set(cacheKey, dataUk);
                        delete InFlightSeasonRequests[cacheKey];
                        resolve(dataUk);
                    }
                },
                error: function () {
                    delete InFlightSeasonRequests[cacheKey];
                    resolve(null);
                }
            });
        });
        
        InFlightSeasonRequests[cacheKey] = promise;
        return promise;
    }

    var InFlightMovieRequests = {};
    function fetchTmdbMovie(movieId) {
        var cacheKey = 'tmdb_movie_v7_' + movieId;
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);
        
        if (InFlightMovieRequests[cacheKey]) {
            return InFlightMovieRequests[cacheKey];
        }
        
        var tmdbKey = CONFIG.tmdbKey();
        var promise = new Promise(function (resolve) {
            var urlMovie = 'https://api.themoviedb.org/3/movie/' + movieId + '?api_key=' + tmdbKey + '&language=uk-UA';
            $.ajax({
                url: urlMovie,
                timeout: 4500,
                success: function (dataM) {
                    ApiCache.set(cacheKey, dataM);
                    delete InFlightMovieRequests[cacheKey];
                    resolve(dataM);
                },
                error: function () {
                    delete InFlightMovieRequests[cacheKey];
                    resolve(null);
                }
            });
        });
        
        InFlightMovieRequests[cacheKey] = promise;
        return promise;
    }

    function getTmdbMetadata(movie, season, episode) {
        return new Promise(function (resolve) {
            if (!movie || !movie.id) return resolve(null);
            
            var isTv = isTvMedia(movie);
            
            if (isTv) {
                var sNum = (season !== null && season !== undefined && !isNaN(season) && season > 0) ? season : 1;
                
                fetchTmdbSeason(movie.id, sNum).then(function (seasonObj) {
                    var defaultRuntime = (movie.episode_run_time && movie.episode_run_time.length) ? movie.episode_run_time[0] : null;
                    
                    if (!seasonObj) {
                        return resolve({
                            isTv: true,
                            title: episode ? ('Епізод ' + episode) : ('Сезон ' + sNum),
                            date: movie.first_air_date,
                            rate: movie.vote_average,
                            time: defaultRuntime,
                            season: sNum,
                            episode: episode
                        });
                    }
                    
                    if (episode !== null && episode !== undefined && !isNaN(episode)) {
                        var ep = null;
                        if (seasonObj.episodes && seasonObj.episodes.length) {
                            for (var i = 0; i < seasonObj.episodes.length; i++) {
                                if (parseInt(seasonObj.episodes[i].episode_number, 10) === parseInt(episode, 10)) {
                                    ep = seasonObj.episodes[i];
                                    break;
                                }
                            }
                        }
                        
                        if (ep) {
                            var epRate = (ep.vote_average !== undefined && ep.vote_average !== null && ep.vote_average > 0) ? ep.vote_average : (seasonObj.vote_average || movie.vote_average);
                            var epDate = ep.air_date || seasonObj.air_date || movie.first_air_date;
                            var epTime = ep.runtime ? ep.runtime : defaultRuntime;
                            var epTitle = ep.name || ('Епізод ' + episode);
                            
                            resolve({
                                isTv: true,
                                title: epTitle,
                                date: epDate,
                                rate: epRate,
                                time: epTime,
                                season: sNum,
                                episode: episode
                            });
                        } else {
                            resolve({
                                isTv: true,
                                title: 'Епізод ' + episode,
                                date: seasonObj.air_date || movie.first_air_date,
                                rate: seasonObj.vote_average || movie.vote_average,
                                time: defaultRuntime,
                                season: sNum,
                                episode: episode
                            });
                        }
                    } else {
                        resolve({
                            isTv: true,
                            title: seasonObj.name || ('Сезон ' + sNum),
                            date: seasonObj.air_date || movie.first_air_date,
                            rate: seasonObj.vote_average || movie.vote_average,
                            time: defaultRuntime,
                            season: sNum,
                            episode: null
                        });
                    }
                });
            } else {
                fetchTmdbMovie(movie.id).then(function (movieObj) {
                    var mData = movieObj || movie;
                    resolve({
                        isTv: false,
                        title: mData.title || movie.title || movie.name,
                        date: mData.release_date || movie.release_date,
                        rate: mData.vote_average || movie.vote_average,
                        time: mData.runtime || movie.runtime,
                        season: null,
                        episode: null
                    });
                });
            }
        });
    }

    function updateCardTimeline(card) {
        try {
            if (!card || !card.classList || !card.classList.contains('online-prestige--full')) return;

            var existingTimeline = card.querySelector('.online-prestige__timeline');
            var rawTl = card.querySelector('.time-line');
            var innerLine = card.querySelector('.time-line > div');

            var percent = null;

            if (innerLine && innerLine.style && innerLine.style.width) {
                var sw = innerLine.style.width.trim();
                if (sw && sw !== '0%' && sw !== '0px') {
                    var iv = parseFloat(sw);
                    if (!isNaN(iv) && iv > 0 && iv <= 100) {
                        percent = Math.round(iv);
                    }
                }
            }

            var cardData = card.data || card._online_data;
            if (cardData && cardData.timeline && (percent === null || card._ydesign_dataPercent !== cardData.timeline.percent)) {
                card._ydesign_dataPercent = cardData.timeline.percent;
                var dp = parseFloat(cardData.timeline.percent);
                if (!isNaN(dp) && dp >= 0 && dp <= 100) {
                    percent = Math.round(dp);
                }
            }

            if (percent === null || percent <= 0) {
                if (percent === 0 && innerLine) { innerLine._ydesign_appliedWidth = '0%'; if (innerLine.style.width !== '0%') innerLine.style.width = '0%'; }
                if (existingTimeline) {
                    var oldText = existingTimeline.querySelector('.ydesign-series-percent-text');
                    if (oldText) oldText.remove();
                    if (existingTimeline.hasAttribute('data-percent')) existingTimeline.removeAttribute('data-percent');
                    if (!innerLine || !innerLine.style.width || innerLine.style.width === '0%' || innerLine.style.width === '0px') {
                        if (existingTimeline.style.display !== 'none') existingTimeline.style.display = 'none';
                    }
                }
                return;
            }

            var timeline = existingTimeline;
            if (!timeline && rawTl) {
                timeline = document.createElement('div');
                timeline.className = 'online-prestige__timeline';
                rawTl.parentNode.insertBefore(timeline, rawTl);
                timeline.appendChild(rawTl);
                card.appendChild(timeline);
            } else if (!timeline) {
                timeline = document.createElement('div');
                timeline.className = 'online-prestige__timeline';
                timeline.innerHTML = '<div class="time-line"><div style="width: ' + percent + '%"></div></div>';
                card.appendChild(timeline);
            } else if (timeline.parentNode !== card) {
                card.appendChild(timeline);
            }

            if (timeline.style.display !== 'block') timeline.style.display = 'block';
            if (timeline.getAttribute('data-percent') !== percent + '%') timeline.setAttribute('data-percent', percent + '%');

            var actualInnerLine = timeline.querySelector('.time-line > div');
            if (actualInnerLine) {
                actualInnerLine._ydesign_appliedWidth = percent + '%';
                if (actualInnerLine.style.width !== percent + '%') actualInnerLine.style.width = percent + '%';
            }

            var percentTextEl = timeline.querySelector('.ydesign-series-percent-text');
            if (!percentTextEl) {
                percentTextEl = document.createElement('div');
                percentTextEl.className = 'ydesign-series-percent-text';
                timeline.appendChild(percentTextEl);
            }
            if (percentTextEl.innerText !== percent + '%') percentTextEl.innerText = percent + '%';
        } catch (e) {}
    }

    function formatPrestigeCard(card) {
        if (!getSet('ydesign_series_redesign')) return false;
        
        if (card.classList.contains('online-prestige-watched')) {
            var txt = (card.innerText || '').toLowerCase();
            if (txt.indexOf('истори') !== -1 || txt.indexOf('історі') !== -1 || txt.indexOf('history') !== -1) {
                card.classList.add('ydesign-empty-history');
                card.style.display = 'none';
                card.classList.remove('selector', 'focus');
                return false;
            }
        }

        if (!card.classList.contains('online-prestige--full')) {
            return false;
        }

        card.classList.add('selector');
        if (card.dataset.fixedLayout === "true") return false;
        card.dataset.fixedLayout = "true";

        var explorer = card.closest('.explorer');
        if (explorer && !explorer.classList.contains('ydesign-has-series')) {
            explorer.classList.add('ydesign-has-series');
        }


        var shade = card.querySelector('.ydesign-series-shade');
        if (!shade) {
            shade = document.createElement('div');
            shade.className = 'ydesign-series-shade';
            card.appendChild(shade);
        }

        var imgEl = card.querySelector('.online-prestige__img img');
        if (imgEl && imgEl.src && imgEl.src.indexOf('data:') === -1) {
            getProminentColorAsync(imgEl.src).then(function (color) {
                if (color && shade) {
                    var rgba65 = color.replace('rgb', 'rgba').replace(')', ', 0.65)');
                    var rgba20 = color.replace('rgb', 'rgba').replace(')', ', 0.20)');
                    shade.style.background = 'linear-gradient(to top, ' + rgba65 + ' 0%, ' + rgba20 + ' 35%, transparent 65%)';
                }
            });
        }

        var infoBlock = card.querySelector('.online-prestige__info');
        var rawText = infoBlock ? infoBlock.innerText : '';

        var monthNames = '(?:Січня|Лютого|Березня|Квітня|Травня|Червня|Липня|Серпня|Вересня|Жовтня|Листопада|Грудня|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)';
        var dateRegex = new RegExp('(\\d{1,2}\\s+' + monthNames + '(?:\\s+\\d{2,4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}|\\d{4}\\s*р\\.?)', 'i');
        var dateMatch = dateRegex.exec(rawText);
        if (dateMatch) rawText = rawText.split(dateMatch[0]).join(' ');

        if (infoBlock) {
            var spans = infoBlock.querySelectorAll('span');
            for (var s = 0; s < spans.length; s++) {
                var st = spans[s].textContent.replace(/★/g, '').trim();
                if (isValidNumericRating(st)) {
                    rawText = rawText.split(spans[s].textContent).join(' ');
                    break;
                }
            }
        }
        var rateMatch = /(?:★\s*)?(\b[1-9](\.\d)?\b)/.exec(rawText);
        if (rateMatch && isValidNumericRating(rateMatch[1])) rawText = rawText.replace(rateMatch[0], ' ');

        var yearMatch = /\b(19\d\d|20\d\d)\b/.exec(rawText);
        if (yearMatch) rawText = rawText.replace(yearMatch[0], ' ');

        var timeRegex = /\b\d+\s*(?:хв|мин|min)\b/i;
        var timeMatch = timeRegex.exec(rawText);
        if (timeMatch) rawText = rawText.replace(timeMatch[0], ' ');

        var qualityEl = card.querySelector('.online-prestige__quality');
        var qualityVal = qualityEl ? cleanBulletsAndSymbols(qualityEl.innerText) : '';

        var titleEl = card.querySelector('.online-prestige__title');
        var sourceTitle = titleEl ? cleanBulletsAndSymbols(titleEl.innerText) : '';

        var cardData = card.data || card._online_data || {};
        var voiceVal = '';
        if (cardData.voice_name) {
            voiceVal = cleanBulletsAndSymbols(cardData.voice_name);
        } else {
            voiceVal = cleanBulletsAndSymbols(rawText);
        }

        if (voiceVal && (voiceVal.length > 25 || /[.,!?]/.test(voiceVal))) {
            if (sourceTitle && !isQualityString(sourceTitle)) {
                voiceVal = sourceTitle;
                sourceTitle = '';
            } else {
                voiceVal = '';
            }
        } else if (isQualityString(sourceTitle)) {
            if (!qualityVal) qualityVal = sourceTitle;
            if (voiceVal && !isQualityString(voiceVal)) {
                sourceTitle = voiceVal;
                voiceVal = '';
            } else {
                sourceTitle = '';
            }
        }

        if (voiceVal === sourceTitle) voiceVal = '';
        if (voiceVal && voiceVal.length > 32) voiceVal = voiceVal.substring(0, 30) + '...';
        if (!voiceVal && !qualityVal && sourceTitle && !isQualityString(sourceTitle)) voiceVal = sourceTitle;

        var oldBody = card.querySelector('.online-prestige__body');
        if (oldBody) oldBody.style.display = 'none';

        var topLeft = card.querySelector('.ydesign-series-top-left') || document.createElement('div');
        topLeft.className = 'ydesign-series-top-left';
        if (!topLeft.parentNode) card.appendChild(topLeft);
        topLeft.innerHTML = ''; 

        var topRight = card.querySelector('.ydesign-series-top-right') || document.createElement('div');
        topRight.className = 'ydesign-series-top-right';
        if (!topRight.parentNode) card.appendChild(topRight);
        topRight.innerHTML = '';
        if (qualityVal) {
            topRight.innerHTML = '<span class="ydesign-series-pill ydesign-series-quality">' + qualityVal + '</span>';
        }

        var movieObj = getCurrentMovie();
        var isTv = isTvMedia(movieObj);
        var movieTitle = movieObj ? (movieObj.title || movieObj.name || '') : '';

        if (voiceVal && movieTitle && voiceVal.toLowerCase() === movieTitle.toLowerCase()) {
            voiceVal = '';
        }

        var bottomLeft = card.querySelector('.ydesign-series-bottom-left') || document.createElement('div');
        bottomLeft.className = 'ydesign-series-bottom-left';
        if (!bottomLeft.parentNode) card.appendChild(bottomLeft);
        bottomLeft.innerHTML = '';

        var voiceBadgeWrap = null;
        if (voiceVal && getSet('ydesign_series_show_voice')) {
            voiceBadgeWrap = document.createElement('div');
            voiceBadgeWrap.className = 'ydesign-series-voice-wrap';
            voiceBadgeWrap.innerHTML = '<span class="ydesign-series-pill ydesign-series-voice-badge">' + voiceVal + '</span>';
            bottomLeft.appendChild(voiceBadgeWrap);
        }
        
        var cleanTitleEl = document.createElement('div');
        cleanTitleEl.className = 'online-prestige__title';

        var sNum = getSeasonNumber(card);
        var eNum = getEpisodeNumber(card);

        if (isTv) {
            if (eNum !== null) {
                cleanTitleEl.innerText = 'Епізод ' + eNum + '...';
            } else {
                cleanTitleEl.innerText = 'Сезон ' + sNum + '...';
            }
        } else {
            cleanTitleEl.innerText = movieTitle || sourceTitle || 'Фільм';
        }
        bottomLeft.appendChild(cleanTitleEl);

        var bottomRight = card.querySelector('.ydesign-series-bottom-right') || document.createElement('div');
        bottomRight.className = 'ydesign-series-bottom-right';
        if (!bottomRight.parentNode) card.appendChild(bottomRight);
        bottomRight.innerHTML = ''; 

        getTmdbMetadata(movieObj, sNum, eNum).then(function (tmdb) {
            if (!tmdb || !card.isConnected || card.dataset.fixedLayout !== 'true') return;

            if (tmdb.date && getSet('ydesign_series_show_date')) {
                topLeft.innerHTML = '<span class="ydesign-series-pill ydesign-series-date">' + tmdb.date + '</span>';
            }

            if (tmdb.rate && getSet('ydesign_series_show_rate')) {
                var rFormat = parseFloat(tmdb.rate).toFixed(1);
                if (rFormat > 0) {
                    var rateHtml = '<span class="ydesign-series-pill ydesign-series-rate">★ ' + rFormat + '</span>';
                    topRight.innerHTML = rateHtml + topRight.innerHTML;
                }
            }
            
            if (tmdb.time && getSet('ydesign_series_show_time')) {
                bottomRight.innerHTML = '<span class="ydesign-series-pill ydesign-series-time">' + tmdb.time + ' хв</span>';
            }

            if (tmdb.isTv) {
                if (tmdb.title) {
                    cleanTitleEl.innerText = tmdb.title;
                    if (voiceBadgeWrap && voiceVal && voiceVal.toLowerCase() === tmdb.title.toLowerCase()) {
                        voiceBadgeWrap.remove();
                    }
                }
            } else {
                if (tmdb.title) {
                    cleanTitleEl.innerText = tmdb.title;
                }
            }
        });

        updateCardTimeline(card);

        return false;
    }

    // Discovery is scoped to a potentially episodic activity, never document.body.
    // A bounded progress fallback exists only while episode cards are mounted.
    var SeriesLife = { initialized: false, root: null, observer: null, timer: null, queued: false };
    function stopSeriesLogic() {
        if (SeriesLife.observer) SeriesLife.observer.disconnect();
        SeriesLife.observer = null;
        if (SeriesLife.timer) clearInterval(SeriesLife.timer);
        SeriesLife.timer = null;
        SeriesLife.root = null;
    }

    function refreshSeries() {
        SeriesLife.queued = false;
        var root = SeriesLife.root;
        if (!root || !root.isConnected || !getSet('ydesign_series_redesign')) { stopSeriesLogic(); return; }
        var cards = root.querySelectorAll('.online-prestige');
        for (var i = 0; i < cards.length; i++) {
            formatPrestigeCard(cards[i]);
            updateCardTimeline(cards[i]);
        }
        if (cards.length && !SeriesLife.timer) SeriesLife.timer = setInterval(refreshSeries, 1000);
        if (!cards.length && SeriesLife.timer) { clearInterval(SeriesLife.timer); SeriesLife.timer = null; }
        // Do not steal focus from menus, search, settings, or a valid episode.
        var controller = Lampa.Controller && Lampa.Controller.enabled && Lampa.Controller.enabled().name;
        if (controller && /menu|head|select|settings|search/.test(controller)) return;
        var focus = root.querySelector('.focus');
        if (focus && focus.offsetParent !== null && focus.style.display !== 'none') return;
        var first = root.querySelector('.online-prestige--full.selector:not(.ydesign-empty-history)');
        if (first && first.offsetParent !== null && Lampa.Controller && Lampa.Controller.collectionFocus) {
            Lampa.Controller.collectionFocus(first, root);
        }
    }

    function queueSeries() {
        if (SeriesLife.queued) return;
        SeriesLife.queued = true;
        requestAnimationFrame(refreshSeries);
    }

    function bindSeriesLogic() {
        var activity = Lampa.Activity && Lampa.Activity.active();
        // Home/catalog rows do not need an episode discovery observer.
        if (!getSet('ydesign_series_redesign') || !activity ||
            /^(main|category|catalog|search|favorite|bookmarks|discovery)$/.test(activity.component || '')) {
            stopSeriesLogic(); return;
        }
        var root = document.querySelector('.modal:not(.hide)') || document.querySelector('.activity--active');
        if (!root) { stopSeriesLogic(); return; }
        if (SeriesLife.root !== root) {
            stopSeriesLogic();
            SeriesLife.root = root;
            SeriesLife.observer = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes') {
                        if (m.target.matches && m.target.matches('.time-line > div') &&
                            m.target.style.width !== m.target._ydesign_appliedWidth) { queueSeries(); return; }
                        continue;
                    }
                    // Ignore the renderer's text/badge mutations; discover replaced/late containers.
                    var nodes = Array.prototype.slice.call(m.addedNodes).concat(Array.prototype.slice.call(m.removedNodes));
                    for (var j = 0; j < nodes.length; j++) {
                        var node = nodes[j];
                        if (node.nodeType === 1 && (node.matches('.online-prestige') || node.querySelector('.online-prestige'))) {
                            queueSeries(); return;
                        }
                    }
                }
            });
            SeriesLife.observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
        }
        queueSeries();
    }

    function initSeriesLogic() {
        if (SeriesLife.initialized) return;
        SeriesLife.initialized = true;
        if (Lampa.Listener) Lampa.Listener.follow('activity', function (e) {
            if (e && e.type && !/^(start|build|create|destroy|archive)$/.test(e.type)) return;
            // The native activity event can precede attaching its rendered container.
            stopSeriesLogic();
            requestAnimationFrame(bindSeriesLogic);
        });
        if (Lampa.Timeline && Lampa.Timeline.listener) Lampa.Timeline.listener.follow('update', queueSeries);
        bindSeriesLogic();
    }

    // =========================================================================
    // 14. ГОЛОВНИЙ СТАРТ ТА ПЕРЕВІРКА ДЖЕРЕЛА
    // =========================================================================
    var initialized = false;
    function init() {
        if (initialized) return;
        initialized = true;
        try {
            hookTemplates();
            migrateVertical();
            createSettings();

            var currentSource = 'tmdb';
            if (window.Lampa && Lampa.Storage) {
                currentSource = Lampa.Storage.get('source') || 'tmdb';
                if (currentSource !== 'tmdb' && currentSource !== 'cub') {
                    setTimeout(function () {
                        if (window.Lampa && Lampa.Noty) {
                            Lampa.Noty.show('Для роботи YDesign потрібно обрати джерелом TMDB або CUB (Поточне: ' + currentSource + ')');
                        }
                    }, 2500);
                }
            }

            injectCSS();
            applyDynamicCSSNow();
            fontApply();
            addPreconnect();

            if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
                Lampa.Storage.listener.follow('change', onSettingChange);
            }

            if (window.Lampa && Lampa.Listener) {
                Lampa.Listener.follow('state:changed', function (e) {
                    CustomFavMemo.t = 0;
                    bumpMarks();
                    if (e && (e.target === 'favorite' || e.name === 'favorite')) {
                        document.querySelectorAll('.ydesign-card').forEach(function (c) {
                            if (c._ydesign_updateNotch) {
                                if (!e.card || (c._ydesign_data && c._ydesign_data.id == e.card.id)) {
                                    c._ydesign_updateNotch();
                                }
                            }
                        });
                    }
                });
            }

            overrideCards();
            initSeriesLogic();
            // Trakt+ повідомляє, коли змінився список переглянутих → оновлюємо позначки
            document.addEventListener('traktplus:watched', function () { scheduleRefreshMarks(); });

            // рядки головної, оновлення позначок після перегляду, фонове завантаження списків
            registerRows();
            if (window.Lampa && Lampa.Timeline && Lampa.Timeline.listener && typeof Lampa.Timeline.listener.follow === 'function') {
                try { Lampa.Timeline.listener.follow('update', scheduleRefreshMarks); } catch (eT) {}
            }
            if (window.Lampa && Lampa.Listener) {
                Lampa.Listener.follow('activity', function (e) {
                    if (!e || e.type !== 'start') return;
                    scheduleRefreshMarks();
                    if (e.component === 'main') warmRows(false);
                });
            }
            setTimeout(function () { warmRows(true); }, 6000);

            if (window.appready && Lampa.Activity && Lampa.Activity.active()) {
                setTimeout(function () {
                    var act = Lampa.Activity.active();
                    if (act && act.activity && act.activity.render) {
                        act.activity.render().find('.card').trigger('visible');
                    }
                }, 100);
            }

            console.log('Lampa Plugin: YDesign successfully loaded.');
        } catch (e) {
            console.error('YDesign init error:', e);
        }
    }

    hookTemplates();

    if (window.appready) {
        init();
    } else {
        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') init();
            });
        } else {
            setTimeout(init, 500);
        }
    }

})();
