(function() {
    'use strict';

    var network = new Lampa.Reguest();
    var IMDB_USER_ID = 'ur155421292';
    var WATCHLIST_URL = 'https://www.imdb.com/user/' + IMDB_USER_ID + '/watchlist';

    function parseHTML(html) {
        var results = [];
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        // IMDb Watchlist items
        var items = doc.querySelectorAll('.lister-list .lister-item');
        items.forEach(function(item) {
            var link = item.querySelector('.lister-item-header a');
            if (!link) return;

            var imdb_id = link.getAttribute('href').match(/\/title\/(tt\d+)\//);
            if (!imdb_id) return;

            var title = link.textContent.trim();
            var yearEl = item.querySelector('.lister-item-year');
            var year = yearEl ? parseInt(yearEl.textContent.replace(/\D/g,'')) : null;

            results.push({
                title: title,
                original_title: title,
                year: year,
                imdb_id: imdb_id[1],
                source: 'imdb'
            });
        });

        return results;
    }

    function full(params, oncomplete, onerror) {
        network.silent(WATCHLIST_URL, function(data) {
            if (!data) return onerror('Не удалось получить Watchlist');

            var results = parseHTML(data);
            if (results.length === 0) return onerror('Немає фільмів або змінилась структура сторінки');

            oncomplete({secuses: true, page: 1, results: results});
        }, onerror, false, {type:'get'});
    }

    function clear() {
        network.clear();
    }

    var Api = {full: full, clear: clear};

    function component(object) {
        var comp = new Lampa.InteractionCategory(object);
        comp.create = function() {
            Api.full(object, this.build.bind(this), this.empty.bind(this));
        };
        comp.nextPageReuest = function(object, resolve, reject) {
            Api.full(object, resolve.bind(comp), reject.bind(comp));
        };
        return comp;
    }

    function startPlugin() {
        var manifest = {
            type: 'video',
            version: '0.1.0',
            name: 'IMDb Watchlist',
            description: 'Список твоїх фільмів з IMDb',
            component: 'imdb_watchlist'
        };

        Lampa.Manifest.plugins = manifest;
        Lampa.Component.add('imdb_watchlist', component);

        function addButton() {
            var button = $("<li class=\"menu__item selector\">\n" +
                "<div class=\"menu__ico\">🎬</div>\n" +
                "<div class=\"menu__text\">" + manifest.name + "</div>\n</li>");

            button.on('hover:enter', function() {
                Lampa.Activity.push({url:'', title: manifest.name, component:'imdb_watchlist', page:1});
            });

            $('.menu .menu__list').eq(0).append(button);
        }

        if(window.appready) addButton();
        else {
            Lampa.Listener.follow('app', function(e){
                if(e.type=='ready') addButton();
            });
        }
    }

    if(!window.imdb_watchlist_ready) startPlugin();

})();
