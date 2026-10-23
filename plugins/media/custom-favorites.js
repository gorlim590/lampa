(function(){
    'use strict';
    // Вибір збірки за версією застосунку: app_digital >= 300 → v3, інакше v2.
    // Розширення подій картки (раніше завантажувалось окремим файлом listener-extensions.js).
    // Захищено глобальним прапорцем window.lampa_listener_extensions від повторного запуску.
    function ensureListenerExtensions(done) {
        ((function () {
            'use strict';
        
            function start() {
                if (window.lampa_listener_extensions) {
                    return;
                }
        
                window.lampa_listener_extensions = true;
        
                Object.defineProperty(window.Lampa.Card.prototype, 'build', {
                    get: function () {
                        return this._build;
                    },
                    set: function (value) {
                        this._build = function () {
                            value.apply(this);
        
                            Lampa.Listener.send('card', {
                                type: 'build',
                                object: this
                            });
                        }.bind(this);
                    }
                });
            }
        
            if (window.appready) {
                start();
            } else {
                Lampa.Listener.follow('app', function (event) {
                    if (event.type === 'ready') 
                    {
                        start();
                    }
                });
            }
        })());
        if (done) done();
    }

    function start() {
        if (Lampa.Manifest.app_digital >= 300) {
(function () {
    'use strict';

    if (!window.location.origin) { window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : ""); }

    var HOST = window.location.origin;
    var STORAGE_KEY = "custom_favorite";
    var STORAGE_SYNC_KEY = "lampac_sync_custom_favorite";

    function CustomFavoriteFolder(data) {
        var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        this.data = data;
        this.params = params;
        this.card = this.data.length ? this.data[0] : {};

        this.create = function () {
            var self = this;

            this.folder = Lampa.Template.js('bookmarks_folder');
            this.folder.querySelector('.bookmarks-folder__title').innerText = Lampa.Lang.translate('menu_' + params.media);
            this.folder.querySelector('.bookmarks-folder__num').innerText = this.data.length;
            this.folder.addEventListener('hover:focus', function () {
                if (self.onFocus) {
                    self.onFocus(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:touch', function () {
                if (self.onTouch) {
                    self.onTouch(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:hover', function () {
                if (self.onHover) {
                    self.onHover(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: params.title + ' - ' + Lampa.Lang.translate('menu_' + params.media),
                    component: 'favorite',
                    type: params.category,
                    filter: params.media,
                    page: 1
                });
            });
            this.folder.addEventListener('visible', this.visible.bind(this));
        };

        this.image = function (src, i) {
            var self = this;

            var img = document.createElement('img');
            img.addClass('card__img');
            img.addClass('i-' + i);

            img.onload = function () {
                self.folder.classList.add('card--loaded');
            };

            img.onerror = function () {
                img.src = './img/img_broken.svg';
            };

            this.folder.querySelector('.bookmarks-folder__body').append(img);
            img.src = src;
        };

        this.visible = function () {
            var self = this;

            var filtred = this.data.filter(function (a) {
                return a.poster_path;
            }).slice(0, 3);
            filtred.forEach(function (a, i) {
                self.image(Lampa.Api.img(a.poster_path), i);
            });
            if (filtred.length == 0) {
                this.image('./img/img_load.svg');
            }
            if (this.onVisible) {
                this.onVisible(this.folder, data);
            }
        };

        this.destroy = function () {
            this.folder.remove();
        };

        this.render = function (js) {
            return js ? this.folder : $(this.folder);
        };
    }

    function CustomFavorite() {
        var _customFavorite = null;
        var allCustomFavs = [];

        this.migration = function () {
            this.migrationV1();
        }

        this.migrationV1 = function () {
            var customFavs = this.getFavorite();
            var customTypes = customFavs.customTypes || {};
            customFavs.customTypes = customTypes;

            if (typeof customTypes.migrationVersion === 'number'
                && isFinite(customTypes.migrationVersion)
                && customTypes.migrationVersion > 0) {
                return;
            }

            var fav = Lampa.Storage.get('favorite', {});

            if (isFavoriteEmpty(fav)) {
                return;
            }

            if (!fav.customTypes || !Array.isArray(fav.customTypes.card) || fav.customTypes.card.length == 0) {
                customFavs.customTypes.migrationVersion = 1;
                Lampa.Storage.set(STORAGE_KEY, customFavs);
                return;
            }

            customTypes.card = mergeCard(customTypes.card || [], fav.customTypes.card);

            var oldTypesDefinitions = this.getTypesWithoutSystem(fav);

            oldTypesDefinitions.forEach(function (typeName) {
                if (!fav.customTypes.hasOwnProperty(typeName)) return;
                var typeUid = fav.customTypes[typeName];

                customFavs.customTypes[typeName] = typeUid;
                customFavs[typeUid] = mergeCategory(customFavs[typeUid] || [], fav[typeUid]);

            });

            customFavs.customTypes.migrationVersion = 1;
            Lampa.Storage.set(STORAGE_KEY, customFavs);

            function isFavoriteEmpty(favorite) {
                var emptyFavorite = true;

                for (var key in favorite) {
                    if (favorite.hasOwnProperty(key)) {
                        var value = favorite[key];

                        if (Array.isArray(value)) {
                            if (value.length !== 0) {
                                emptyFavorite = false;
                                break;
                            }
                        }
                    }
                }

                return emptyFavorite;
            }

            function mergeCard(arr1, arr2) {
                var merged = [];
                var ids = {};

                for (var i = 0; i < arr1.length; i++) {
                    var obj = arr1[i];
                    ids[obj.id] = obj;
                }

                for (var j = 0; j < arr2.length; j++) {
                    var obj2 = arr2[j];
                    if (ids.hasOwnProperty(obj2.id)) {
                        var existing = ids[obj2.id];
                        for (var key in obj2) {
                            if (obj2.hasOwnProperty(key)) {
                                existing[key] = obj2[key];
                            }
                        }
                    } else {
                        ids[obj2.id] = obj2;
                    }
                }

                for (var id in ids) {
                    if (ids.hasOwnProperty(id)) {
                        merged.push(ids[id]);
                    }
                }

                return merged;
            }

            function mergeCategory(arr1, arr2) {
                var merged = arr1.concat(arr2);
                var unique = [];
                var seen = {};

                for (var i = 0; i < merged.length; i++) {
                    var item = merged[i];
                    if (!seen.hasOwnProperty(item)) {
                        seen[item] = true;
                        unique.push(item);
                    }
                }

                return unique;
            }
        }

        this.init = function (obj) {
            _customFavorite = obj || Lampa.Storage.get(STORAGE_KEY, {});
            _customFavorite.customTypes = _customFavorite.customTypes || { card: [] };
        }

        this.getFavorite = function () {
            if (_customFavorite == null) {
                this.init();
                this.migration();
            }

            return _customFavorite;
        }

        this.getTypes = function () {
            return this.getTypesWithoutSystem(this.getFavorite());
        }

        this.hasTypeId = function (favorite, type) {
            var customTypes = favorite.customTypes;
            for (var key in customTypes) {
                if (customTypes.hasOwnProperty(key) && customTypes[key] === type) {
                    return true;
                }
            }
            return false;
        };

        this.getTypesWithoutSystem = function (favorite) {
            var systemFields = ['card', 'migrationVersion'];

            return Object
                .keys(favorite.customTypes || {})
                .filter(function (type) { return systemFields.indexOf(type) == -1 });
        }

        this.getCards = function (favorite) {
            if (!favorite && allCustomFavs.length > 0) {
                return allCustomFavs;
            }

            favorite = favorite || this.getFavorite();
            allCustomFavs = this.getTypesWithoutSystem(favorite).reduce(function (acc, key) {
                var uid = favorite.customTypes[key];
                return favorite.hasOwnProperty(uid) ? acc.concat(favorite[uid]) : acc;
            }, []);

            return allCustomFavs;
        }

        this.createType = function (typeName) {
            var favorite = this.getFavorite();

            if (favorite.customTypes[typeName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }

            var uid = Lampa.Utils.uid(8).toLowerCase();
            favorite.customTypes[typeName] = uid;
            favorite[uid] = [];

            Lampa.Storage.set(STORAGE_KEY, favorite);

            return {
                name: typeName,
                uid: uid,
                counter: 0
            };
        }

        this.renameType = function (oldName, newName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[oldName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            if (favorite.customTypes[newName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }

            favorite.customTypes[newName] = uid;
            delete favorite.customTypes[oldName];

            Lampa.Storage.set(STORAGE_KEY, favorite);
            return true;
        }

        this.removeType = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            delete favorite.customTypes[typeName];
            delete favorite[uid];

            Lampa.Storage.set(STORAGE_KEY, favorite);
            return true;
        }

        this.getTypeList = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            return favorite[uid] || [];
        }

        this.toggleCard = function (typeName, card) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            var typeList = favorite[uid] || [];
            favorite[uid] = typeList;

            var customTypeCards = favorite.customTypes.card;

            if (typeList.indexOf(card.id) === -1) {
                if (customTypeCards.every(function (favCard) { return favCard.id !== card.id })) {
                    Lampa.Arrays.insert(customTypeCards, 0, sanitizeCard(card));
                }

                Lampa.Arrays.insert(typeList, 0, card.id);
                this.getCards(favorite);

            } else {
                Lampa.Arrays.remove(typeList, card.id);
                var customCards = this.getCards(favorite);

                var used = customCards.indexOf(card.id) >= 0;

                if (!used) {
                    favorite.customTypes.card = customTypeCards.filter(function (favCard) {
                        return favCard.id !== card.id;
                    });
                }
            }

            Lampa.Storage.set(STORAGE_KEY, favorite);

            return {
                name: typeName,
                uid: uid,
                counter: typeList.length,
            }
        }

        function sanitizeCard(card) {
            if (!card) return null;
            var prepared = card;

            if (Lampa && Lampa.Arrays && Lampa.Utils && Lampa.Utils.clearCard)
                prepared = Lampa.Utils.clearCard(Lampa.Arrays.clone(card));

            return prepared;
        }
    }

    var customFavorite = new CustomFavorite();

    function SyncService() {
        function account(url) {
            url = url + '';
            if (url.indexOf('account_email=') === -1) {
                var email = Lampa.Storage.get('account_email');
                if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
            }
            if (url.indexOf('uid=') === -1) {
                var uid = Lampa.Storage.get('lampac_unic_id', '');
                if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
            }
            return url;
        }

        function goExport() {
            if (window.sync_disable) return;

            var value = Lampa.Storage.get(STORAGE_KEY, {});
            if (!value.hasOwnProperty('customTypes')) return;

            var uri = account(HOST + '/storage/set?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', ''));

            $.ajax({
                url: uri + '&events=' + encodeURIComponent(Lampa.Base64.encode(JSON.stringify({
                    connectionId: (window.lwsEvent ? window.lwsEvent.connectionId : ''),
                    name: 'sync_custom_favorite',
                    data: Lampa.Storage.get('lampac_profile_id', ''),
                }))),
                type: 'POST',
                data: JSON.stringify(value),
                async: true,
                cache: false,
                contentType: 'application/json',
                processData: false,
                success: function (j) {
                    if (j.success && j.fileInfo) {
                        Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                    }
                },
                error: function () {
                    console.log('Lampac Storage', 'export', 'error');
                }
            });
        }

        function goImport(callback) {
            if (window.sync_disable) return;

            var network = new Lampa.Reguest();
            network.silent(
                account(HOST + '/storage/get?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', '')),
                function (j) {
                    if (j.success && j.fileInfo && j.data) {
                        if (j.fileInfo.changeTime > Lampa.Storage.get(STORAGE_SYNC_KEY, 0)) {
                            try {
                                var data = JSON.parse(j.data);
                                if (data.hasOwnProperty('customTypes')) {
                                    Lampa.Storage.set(STORAGE_KEY, data, true);
                                    Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                                    customFavorite.init(data);
                                }
                            } catch (error) {
                                console.log('Lampac Storage', 'import', error.message);
                            }
                        }
                    } else if (j.msg && j.msg === 'outFile') {
                        customFavorite.init();
                        goExport();
                    }

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            );
        }

        function sync() {
            if (window.custom_favs_sync_init) return;
            window.custom_favs_sync_init = true;

            goImport(function () {
                Lampa.Storage.listener.follow('change', function (event) {
                    if (event.name === STORAGE_KEY) {
                        goExport();
                    }
                });

                document.addEventListener('lwsEvent', function (event) {
                    var profileId = Lampa.Storage.get('lampac_profile_id', '');
                    var eventName = event.detail.name;
                    var eventData = event.detail.data;
                    var eventSource = event.detail.src;

                    if ((eventName === 'sync_custom_favorite' || eventName === 'profile_synced') && eventData === profileId) {
                        goImport(function () {
                            if (eventSource === 'profiles.js') {
                                customFavorite.migration();
                            }
                        });
                    } else if (eventName === 'system' && eventData === 'reconnected' && eventSource !== 'profiles.js') {
                        goImport(function () { });
                    }
                });
            });
        }

        this.start = function () {
            if (!window.lwsEvent) {
                Lampa.Utils.putScript([account(HOST + '/invc-ws.js')], function () { }, false, function () {
                    sync();
                }, true);
            } else sync();
        }
    }

    function FavoritePageService() {
    }

    FavoritePageService.prototype.renderCustomFavoriteButton = function (type, $render) {
        var customTypeCssClass = 'custom-type-' + type.uid;

        var $register = Lampa.Template.js('register').addClass('selector').addClass(customTypeCssClass).addClass('custom-type');
        $register.find('.register__name').text(type.name).addClass(customTypeCssClass);
        $register.find('.register__counter').text(type.counter || 0).addClass(customTypeCssClass);

        $register.on('hover:long', function () {
            var menu = [
                {
                    title: Lampa.Lang.translate('rename'),
                    action: 'rename'
                },
                {
                    title: Lampa.Lang.translate('settings_remove'),
                    action: 'remove'
                }
            ]

            var controllerName = Lampa.Controller.enabled().name;

            Lampa.Select.show({
                title: Lampa.Lang.translate('title_action'),
                items: menu,
                onBack: function () {
                    Lampa.Controller.toggle(controllerName);
                    Lampa.Controller.toggle('content');
                },
                onSelect: function (item) {
                    switch (item.action) {
                        case 'remove': {
                            try {
                                customFavorite.removeType(type.name);
                                $register.remove();

                                Lampa.Controller.toggle(controllerName);
                                Lampa.Controller.toggle('content');
                            } finally {
                                break;
                            }
                        }
                        case 'rename': {
                            var inputOptions = {
                                title: Lampa.Lang.translate('filter_set_name'),
                                value: type.name,
                                free: true,
                                nosave: true
                            };

                            Lampa.Input.edit(inputOptions, function (value) {
                                if (value === '' || type.name == value || value === 'card') {
                                    Lampa.Controller.toggle('content');
                                    Lampa.Noty.show(Lampa.Lang.translate('invalid_name'));
                                    return;
                                };

                                try {
                                    customFavorite.renameType(type.name, value);
                                    $register.find('.register__name').text(value);
                                    type.name = value;
                                } finally {
                                    Lampa.Controller.toggle(controllerName);
                                    Lampa.Controller.collectionFocus($register, $render);
                                }
                            });

                            break;
                        }
                    }
                }
            });
        });

        $register.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                component: 'favorite',
                title: type.name,
                type: type.uid,
                page: 1,
            });
        });

        $('.register:first', $render).after($register);
        return $register;
    }

    FavoritePageService.prototype.refresh = function (type) {
        var activity = Lampa.Activity.active();

        if (activity.component === 'bookmarks') {
            $('.register__counter.custom-type-' + type.uid).text(type.counter || 0);
        };
    }

    FavoritePageService.prototype.renderAddButton = function ($render) {
        var self = this;

        var $register = Lampa.Template.js('register').addClass('selector').addClass('new-custom-type');
        $register.find('.register__counter').html('<img src="./img/icons/add.svg"/>');

        $('.register:first', $render).before($register);

        $register.on('hover:enter', function () {
            var inputOptions = {
                title: Lampa.Lang.translate('filter_set_name'),
                value: '',
                free: true,
                nosave: true
            };

            Lampa.Input.edit(inputOptions, function (value) {
                if (value === '' || value === 'card') {
                    Lampa.Controller.toggle('content');
                    Lampa.Noty.show(Lampa.Lang.translate('invalid_name'));
                    return;
                };

                try {
                    var type = customFavorite.createType(value);
                    self.renderCustomFavoriteButton(type, $render);
                } finally {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    }

    FavoritePageService.prototype.registerLines = function () {
        Lampa.ContentRows.add({
            index: 1,
            name: 'custom_favs',
            title: Lampa.Lang.translate('custom_favs'),
            screen: ['bookmarks'],
            call: function (params, screen) {
                var favorite = customFavorite.getFavorite();
                var mediaTypes = ['movies', 'tv'];
                var lines = [];

                customFavorite.getTypesWithoutSystem(favorite).reverse().forEach(function (typeName) {
                    var typeUid = favorite.customTypes[typeName];
                    var typeList = favorite[typeUid] || [];
                    var typeCards = favorite.customTypes.card.filter(function (card) {
                        return typeList.indexOf(card.id) !== -1
                    });

                    var lineItems = Lampa.Arrays.clone(typeCards.slice(0, 20));

                    lineItems.forEach(function (item) {
                        item.params = {
                            emit: {
                                onEnter: Lampa.Router.call.bind(Lampa.Router, 'full', item),
                                onFocus: function () {
                                    Lampa.Background.change(Lampa.Utils.cardImgBackground(item))
                                }
                            }
                        };
                    });

                    var i = 0;

                    mediaTypes.forEach(function (m) {
                        var filter = Lampa.Utils.filterCardsByType(typeCards, m);

                        if (filter.length) {
                            Lampa.Arrays.insert(lineItems, i, {
                                results: filter,
                                media: m,
                                params: {
                                    module: Lampa.Maker.module('Card').only('Folder', 'Callback'),
                                    createInstance: function (item_data) {
                                        return new CustomFavoriteFolder(filter, {
                                            title: typeName,
                                            category: typeUid,
                                            media: m
                                        });
                                    },
                                    emit: {
                                        onEnter: Lampa.Router.call.bind(Lampa.Router, 'favorite', {
                                            title: typeName + ' - ' + m,
                                            type: typeUid,
                                            filter: m
                                        })
                                    }
                                }
                            });
                            i++;
                        }
                    });

                    lineItems = lineItems.slice(0, 20);

                    if (lineItems.length > 0) {
                        lines.push({
                            title: typeName,
                            results: lineItems,
                            type: typeUid,
                            total_pages: typeCards.length > 20 ? Math.ceil(typeCards.length / 20) : 1,
                            icon_svg: Lampa.Template.string('custom-fav-icon-svg'),  
                            icon_bgcolor: '#fff',
                            icon_color: '#fd4518',
                            params: {
                                module: Lampa.Maker.module('Line').toggle(Lampa.Maker.module('Line').MASK.base, 'Icon', 'Event'),  
                                emit: {
                                    onMore: function () {
                                        Lampa.Activity.push({
                                            type: typeUid,
                                            title: typeName,
                                            component: 'favorite',
                                            page: 2
                                        });
                                    }
                                }
                            }
                        });
                    }
                });

                if (lines.length) return lines;
            }
        });
    }

    var favoritePageSvc = new FavoritePageService();

    function isPerson(data) {
        return !!data && !!(data.profile_path || data.known_for_department || typeof data.gender !== 'undefined');
    }

    function CardFavoriteService() {
        this.extendContextMenu = function (object) {
            var self = this;

            var bookmarkMenuItem = $('body > .selectbox').find('.selectbox-item__title').filter(function () {
                return $(this).text() === Lampa.Lang.translate('title_book');
            });

            customFavorite.getTypes().forEach(function (customCategory) {
                var $menuItem = $('<div class="selectbox-item selector"><div class="selectbox-item__title">' + customCategory + '</div><div class="selectbox-item__checkbox"></div></div>');
                $menuItem.insertBefore(bookmarkMenuItem.parent());
                $menuItem.on('hover:enter', function () {
                    var category = $(this).find('.selectbox-item__title').text();
                    var type = customFavorite.toggleCard(category, object.data);
                    $(this).toggleClass('selectbox-item--checked');

                    setTimeout(function () {
                        if (object.card) {
                            self.refreshCustomFavoriteIcon(object);
                        } else {
                            self.refreshBookmarkIcon();
                        }
                    }, 0);

                    favoritePageSvc.refresh(type);
                });

                if (customFavorite.getTypeList(customCategory).indexOf(object.data.id) >= 0) {
                    $menuItem.addClass('selectbox-item--checked');
                }
            });

            Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));

            setTimeout(function () {
                var $menuItems = $('body > .selectbox').find('.selector');
                if ($menuItems.length > 0) {
                    Lampa.Controller.focus($menuItems.get(0));
                    Navigator.focus($menuItems.get(0));
                }
            }, 10);
        };

        this.refreshCustomFavoriteIcon = function (object) {
            var customFavCards = customFavorite.getCards();

            var $iconHolder = $('.card__icons-inner', object.card);

            var id = object.data.id;
            var anyFavorite = customFavCards.indexOf(id) >= 0;

            var $starIcon = $('.icon--star', $iconHolder);
            var hasIcon = $starIcon.length !== 0;
            var hasHiddenIcon = hasIcon && $starIcon.hasClass('hide');

            if (anyFavorite) {
                if (!hasIcon) {
                    $iconHolder.prepend(Lampa.Template.get('custom-fav-icon'));
                } else if (hasHiddenIcon) {
                    $starIcon.removeClass('hide');
                }
            } else {
                if (hasIcon && !hasHiddenIcon) {
                    $starIcon.addClass('hide');
                }
            }
        }

        this.refreshBookmarkIcon = function () {
            var active = Lampa.Activity.active();

            if (active.component !== 'full') {
                return;
            }

            var card = active.card;
            var anyCustomFavorite = customFavorite.getCards().indexOf(card.id) !== -1;

            var favStates = anyCustomFavorite ? {} : Lampa.Favorite.check(card);
            var anyFavorite = anyCustomFavorite || Object.keys(favStates).filter(function (favType) {
                return favType !== 'history' && favType !== 'any';
            }).some(function (favType) {
                return !!favStates[favType];
            });

            var $svg = $(".button--book svg path", active.activity.render());

            if (anyFavorite) {
                $svg.attr('fill', 'currentColor');
            } else {
                $svg.attr('fill', 'transparent');
            };
        }
    }

    var cardFavoriteSvc = new CardFavoriteService();

    function start() {
        if (window.custom_favorites) {
            return;
        }

        window.custom_favorites = true;

        var originalProfileWaiter = window.__profile_extra_waiter;

        window.__profile_extra_waiter = function () {
            var synced = Lampa.Storage.get(STORAGE_SYNC_KEY, 0) !== 0;

            if (typeof originalProfileWaiter === 'function') {
                synced = synced && !!originalProfileWaiter();
            }

            return synced;
        }

        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name == 'lampac_sync_favorite' && event.value == 0) {
                Lampa.Storage.set(STORAGE_KEY, '{}', true);
                Lampa.Storage.set(STORAGE_SYNC_KEY, 0, true);

                customFavorite.init({});
            }
        });

        HOST = Lampa.Storage.get('custom_favorite_host', '') || HOST;
        new SyncService().start();

        var cardModule = Lampa.Maker.map('Card');
        var onFavoriteUpdate = cardModule.Favorite.onUpdate;

        cardModule.Favorite.onUpdate = function () {
            var self = this;
            onFavoriteUpdate.apply(self);

            if (isPerson(self.data)) return;

            cardFavoriteSvc.refreshCustomFavoriteIcon({
                data: self.data,
                card: self.html
            });
        }

        var onMenuCreate = cardModule.Menu.onCreate;
        cardModule.Menu.onCreate = function () {
            var self = this;
            var favoriteMenuList = this.menu_list.filter(function (menu) {
                return menu.title === Lampa.Lang.translate('settings_input_links');
            })[0];

            if (!favoriteMenuList || isPerson(self.data)) return onMenuCreate.apply(this, arguments);

            var favoriteMenu = favoriteMenuList.menu;

            favoriteMenuList.menu = function () {
                var newItems = customFavorite.getTypes().map(function (typeName) {
                    var isChecked = customFavorite.getTypeList(typeName).indexOf(self.data.id) >= 0;
                    return {
                        checkbox: true,
                        checked: isChecked ? self.data.id : undefined,
                        onCheck: function () {
                            customFavorite.toggleCard(typeName, self.data);
                            Lampa.Maker.map('Card').Favorite.onUpdate.apply(self);
                        },
                        title: typeName
                    };
                })

                var oldMenuItems = favoriteMenu.apply(favoriteMenuList).map(function (menuItem) {
                    if (!menuItem.onCheck) {
                        return menuItem;
                    }

                    var onCheck = menuItem.onCheck;
                    menuItem.onCheck = function () {
                        onCheck.apply(this, arguments);
                        Lampa.Maker.map('Card').Favorite.onUpdate.apply(self);
                    }

                    return menuItem;
                });

                return newItems.concat(oldMenuItems);
            }

            onMenuCreate.apply(this, arguments);
        }

        var favoriteGet = Lampa.Favorite.get;

        Lampa.Favorite.get = function (params) {
            if (!params || !params.type) {
                return favoriteGet.apply(this, arguments);
            }

            var favorite = customFavorite.getFavorite();

            if (favorite &&
                favorite.hasOwnProperty(params.type) &&
                Array.isArray(favorite[params.type]) &&
                customFavorite.hasTypeId(favorite, params.type)) {

                var cardIds = favorite[params.type];
                var customTypeCards = favorite.customTypes.card;

                var filtered = [];
                for (var i = 0; i < customTypeCards.length; i++) {
                    var favCard = customTypeCards[i];
                    if (cardIds.indexOf(favCard.id) !== -1) {
                        filtered.push(Lampa.Arrays.clone(favCard));
                    }
                }

                return filtered;
            }

            return favoriteGet.apply(this, arguments);
        };

        Lampa.Lang.add({
            rename: {
                en: 'Rename',
                uk: 'Змінити ім’я',
                ru: 'Изменить имя'
            },
            invalid_name: {
                en: 'Invalid name',
                uk: 'Некоректне ім’я',
                ru: 'Некорректное имя'
            },
            custom_favs: {
                en: 'Custom bookmarks',
                uk: 'Користувацькі закладки',
                ru: 'Пользовательские закладки'
            }
        });

        var svgIcon = '<svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.6162 7.10981L15.8464 7.55198L16.3381 7.63428L22.2841 8.62965C22.8678 8.72736 23.0999 9.44167 22.6851 9.86381L18.4598 14.1641L18.1104 14.5196L18.184 15.0127L19.0748 20.9752C19.1622 21.5606 18.5546 22.002 18.025 21.738L12.6295 19.0483L12.1833 18.8259L11.7372 19.0483L6.34171 21.738C5.81206 22.002 5.20443 21.5606 5.29187 20.9752L6.18264 15.0127L6.25629 14.5196L5.9069 14.1641L1.68155 9.86381C1.26677 9.44167 1.49886 8.72736 2.08255 8.62965L8.02855 7.63428L8.52022 7.55198L8.75043 7.10981L11.5345 1.76241C11.8078 1.23748 12.5589 1.23748 12.8322 1.76241L15.6162 7.10981Z" stroke="currentColor" stroke-width="2.2"></path></svg>';
        Lampa.Template.add('custom-fav-icon-svg', svgIcon);
        Lampa.Template.add('custom-fav-icon', '<div class="card__icon icon--star">' + svgIcon + '</div>');

        $('<style>').prop('type', 'text/css').html(
            '.card__icon { position: relative; } ' +
            '.icon--star svg { position: absolute; height: 60%; width: 60%; top: 50%; left: 50%; transform: translate(-50%, -50%) }' +
            '.new-custom-type .register__counter { display:flex; justify-content:center; align-items:center }' +
            '.new-custom-type .register__counter img { height:2.2em; padding:0.4em; }' +
            '.register.custom-type { background-image: url("https://levende.github.io/lampa-plugins/assets/tap.svg"); background-repeat: no-repeat; background-position: 90% 90%; background-size: 20%; }'
        ).appendTo('head');

        Lampa.Listener.follow('full', function (event) {
            if (event.type == 'complite') {
                var active = Lampa.Activity.active();
                cardFavoriteSvc.refreshBookmarkIcon();

                var $btnBook = $(".button--book", active.activity.render());
                $btnBook.on('hover:enter', function () {
                    cardFavoriteSvc.extendContextMenu({ data: active.card });
                });
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (event.type !== 'create' || event.component !== 'bookmarks') {
                return;
            }

            var $render = event.object.activity.render();

            if ($('.new-custom-type', $render).length !== 0) {
                return;
            }

            favoritePageSvc.renderAddButton($render);
            var favorite = customFavorite.getFavorite();

            customFavorite.getTypesWithoutSystem(favorite).reverse().forEach(function (typeName) {
                var typeUid = favorite.customTypes[typeName];
                var typeList = favorite[typeUid] || [];
                var typeCounter = typeList.length;

                favoritePageSvc.renderCustomFavoriteButton({
                    name: typeName,
                    uid: typeUid,
                    counter: typeCounter
                }, $render);
            });
        });

        favoritePageSvc.registerLines();
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }
})();

        } else {
(function () {
    'use strict';

    if(!window.location.origin){window.location.origin=window.location.protocol+"//"+window.location.hostname+(window.location.port ? ":"+window.location.port : "");}

    var HOST = window.location.origin;
    var STORAGE_KEY = "custom_favorite";
    var STORAGE_SYNC_KEY = "lampac_sync_custom_favorite";

    function CustomFavoriteFolder(data) {
        var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        this.data = data;
        this.params = params;
        this.card = this.data.length ? this.data[0] : {};

        this.create = function () {
            var self = this;

            this.folder = Lampa.Template.js('bookmarks_folder');
            this.folder.querySelector('.bookmarks-folder__title').innerText = Lampa.Lang.translate('menu_' + params.media);
            this.folder.querySelector('.bookmarks-folder__num').innerText = this.data.length;
            this.folder.addEventListener('hover:focus', function () {
                if (self.onFocus) {
                    self.onFocus(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:touch', function () {
                if (self.onTouch) {
                    self.onTouch(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:hover', function () {
                if (self.onHover) {
                    self.onHover(self.folder, self.card);
                }
            });
            this.folder.addEventListener('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: params.title + ' - ' + Lampa.Lang.translate('menu_' + params.media),
                    component: 'favorite',
                    type: params.category,
                    filter: params.media,
                    page: 1
                });
            });
            this.folder.addEventListener('visible', this.visible.bind(this));
        };

        this.image = function (src, i) {
            var self = this;

            var img = document.createElement('img');
            img.addClass('card__img');
            img.addClass('i-' + i);

            img.onload = function () {
                self.folder.classList.add('card--loaded');
            };

            img.onerror = function () {
                img.src = './img/img_broken.svg';
            };

            this.folder.querySelector('.bookmarks-folder__body').append(img);
            img.src = src;
        };

        this.visible = function () {
            var self = this;

            var filtred = this.data.filter(function (a) {
                return a.poster_path;
            }).slice(0, 3);
            filtred.forEach(function (a, i) {
                self.image(Lampa.Api.img(a.poster_path), i);
            });
            if (filtred.length == 0) {
                this.image('./img/img_load.svg');
            }
            if (this.onVisible) {
                this.onVisible(this.folder, data);
            }
        };

        this.destroy = function () {
            this.folder.remove();
        };

        this.render = function (js) {
            return js ? this.folder : $(this.folder);
        };
    }

    function CustomFavorite() {
        var _customFavorite = null;
        var allCustomFavs = [];

        this.migration = function() {
            this.migrationV1();
        }

        this.migrationV1 = function() {
            var customFavs = this.getFavorite();
            var customTypes = customFavs.customTypes || {};
            customFavs.customTypes = customTypes;

            if (typeof customTypes.migrationVersion === 'number'
                && isFinite(customTypes.migrationVersion)
                && customTypes.migrationVersion > 0) {
                return;
            }

            var fav = Lampa.Storage.get('favorite', {});

            if (isFavoriteEmpty(fav)) {
                return;
            }
            
            if (!fav.customTypes || !Array.isArray(fav.customTypes.card) || fav.customTypes.card.length == 0) {
                customFavs.customTypes.migrationVersion = 1;
                Lampa.Storage.set(STORAGE_KEY, customFavs);
                return;
            }

            customTypes.card = mergeCard(customTypes.card || [], fav.customTypes.card);

            var oldTypesDefinitions = this.getTypesWithoutSystem(fav);

            oldTypesDefinitions.forEach(function(typeName) {
                if (!fav.customTypes.hasOwnProperty(typeName)) return;
                var typeUid = fav.customTypes[typeName];

                customFavs.customTypes[typeName] = typeUid;
                customFavs[typeUid] = mergeCategory(customFavs[typeUid] || [], fav[typeUid]);

                //delete fav[typeUid];
            });

            customFavs.customTypes.migrationVersion = 1;
            Lampa.Storage.set(STORAGE_KEY, customFavs);

            //delete fav.customTypes;
            //Lampa.Storage.set('favorite', fav);

            function isFavoriteEmpty(favorite) {
                var emptyFavorite = true;

                for (var key in favorite) {
                    if (favorite.hasOwnProperty(key)) {
                        var value = favorite[key];

                        if (Array.isArray(value)) {
                            if (value.length !== 0) {
                                emptyFavorite = false;
                                break;
                            }
                        }
                    }
                }

                return emptyFavorite;
            }

            function mergeCard(arr1, arr2) {
                var merged = [];
                var ids = {};

                for (var i = 0; i < arr1.length; i++) {
                    var obj = arr1[i];
                    ids[obj.id] = obj;
                }

                for (var j = 0; j < arr2.length; j++) {
                    var obj2 = arr2[j];
                    if (ids.hasOwnProperty(obj2.id)) {
                        var existing = ids[obj2.id];
                        for (var key in obj2) {
                            if (obj2.hasOwnProperty(key)) {
                                existing[key] = obj2[key];
                            }
                        }
                    } else {
                        ids[obj2.id] = obj2;
                    }
                }

                for (var id in ids) {
                    if (ids.hasOwnProperty(id)) {
                        merged.push(ids[id]);
                    }
                }

                return merged;
            }

            function mergeCategory(arr1, arr2) {
                var merged = arr1.concat(arr2);
                var unique = [];
                var seen = {};

                for (var i = 0; i < merged.length; i++) {
                    var item = merged[i];
                    if (!seen.hasOwnProperty(item)) {
                        seen[item] = true;
                        unique.push(item);
                    }
                }

                return unique;
            }
        }

        this.init = function(obj) {
            _customFavorite = obj || Lampa.Storage.get(STORAGE_KEY, {});
            _customFavorite.customTypes = _customFavorite.customTypes || { card: [] };
        }

        this.getFavorite = function () {
            if (_customFavorite == null) {
                this.init();
                this.migration();
            }

            return _customFavorite;
        }

        this.getTypes = function () {
            return this.getTypesWithoutSystem(this.getFavorite());
        }

        this.hasTypeId = function (favorite, type) {
            var customTypes = favorite.customTypes;
            for (var key in customTypes) {
                if (customTypes.hasOwnProperty(key) && customTypes[key] === type) {
                    return true;
                }
            }
            return false;
        };

        this.getTypesWithoutSystem = function(favorite) {
            var systemFields = [ 'card', 'migrationVersion'];

            return Object
                .keys(favorite.customTypes || {})
                .filter(function(type) { return systemFields.indexOf(type) == -1 } );
        }

        this.getCards = function (favorite) {
            if (!favorite && allCustomFavs.length > 0) {
                return allCustomFavs;
            }

            favorite = favorite || this.getFavorite();
            allCustomFavs =  this.getTypesWithoutSystem(favorite).reduce(function (acc, key) {
                var uid = favorite.customTypes[key];
                return favorite.hasOwnProperty(uid) ? acc.concat(favorite[uid]) : acc;
            }, []);

            return allCustomFavs;
        }

        this.createType = function (typeName) {
            var favorite = this.getFavorite();

            if (favorite.customTypes[typeName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }

            var uid = Lampa.Utils.uid(8).toLowerCase();
            favorite.customTypes[typeName] = uid;
            favorite[uid] = [];

            Lampa.Storage.set(STORAGE_KEY, favorite);

            return {
                name: typeName,
                uid: uid,
                counter: 0
            };
        }

        this.renameType = function (oldName, newName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[oldName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            if (favorite.customTypes[newName]) {
                var err = new Error('custom.fav.name-used');
                err.code = 'custom.fav';
                throw err;
            }

            favorite.customTypes[newName] = uid;
            delete favorite.customTypes[oldName];

            Lampa.Storage.set(STORAGE_KEY, favorite);
            return true;
        }

        this.removeType = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            delete favorite.customTypes[typeName];
            delete favorite[uid];

            Lampa.Storage.set(STORAGE_KEY, favorite);
            return true;
        }

        this.getTypeList = function (typeName) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            return favorite[uid] || [];
        }

        this.toggleCard = function (typeName, card) {
            var favorite = this.getFavorite();
            var uid = favorite.customTypes[typeName];

            if (!uid) {
                var err = new Error('custom.fav.not-defined');
                err.code = 'custom.fav';
                throw err;
            }

            var typeList = favorite[uid] || [];
            favorite[uid] = typeList;

            var customTypeCards = favorite.customTypes.card;

            if (typeList.indexOf(card.id) === -1) {
                if (customTypeCards.every(function (favCard) { return favCard.id !== card.id })) {
                    Lampa.Arrays.insert(customTypeCards, 0, card);
                }

                Lampa.Arrays.insert(typeList, 0, card.id);
                this.getCards(favorite);

            } else {
                Lampa.Arrays.remove(typeList, card.id);
                var customCards = this.getCards(favorite);

                var used = customCards.indexOf(card.id) >= 0;

                if (!used) {
                    favorite.customTypes.card = customTypeCards.filter(function (favCard) {
                        return favCard.id !== card.id;
                    });
                }
            }

            Lampa.Storage.set(STORAGE_KEY, favorite);

            return {
                name: typeName,
                uid: uid,
                counter: typeList.length,
            }
        }
    }

    var customFavorite = new CustomFavorite();

    function SyncService() {
        function account(url) {
            url = url + '';
            if (url.indexOf('account_email=') === -1) {
                var email = Lampa.Storage.get('account_email');
                if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
            }
            if (url.indexOf('uid=') === -1) {
                var uid = Lampa.Storage.get('lampac_unic_id', '');
                if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
            }
            return url;
        }

        function goExport() {
            if (window.sync_disable) return;

            var value = Lampa.Storage.get(STORAGE_KEY, {});
            if (!value.hasOwnProperty('customTypes')) return;

            var uri = account(HOST + '/storage/set?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', ''));

            $.ajax({
                url: uri + '&events=' + encodeURIComponent(Lampa.Base64.encode(JSON.stringify({
                    connectionId: (window.lwsEvent ? window.lwsEvent.connectionId : ''),
                    name: 'sync_custom_favorite',
                    data: Lampa.Storage.get('lampac_profile_id', ''),
                }))),
                type: 'POST',
                data: JSON.stringify(value),
                async: true,
                cache: false,
                contentType: 'application/json',
                processData: false,
                success: function (j) {
                    if (j.success && j.fileInfo) {
                        Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                    }
                },
                error: function () {
                    console.log('Lampac Storage', 'export', 'error');
                }
            });
        }

        function goImport(callback) {
            if (window.sync_disable) return;

            var network = new Lampa.Reguest();
            network.silent(
                account(HOST + '/storage/get?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', '')),
                function (j) {
                    if (j.success && j.fileInfo && j.data) {
                        if (j.fileInfo.changeTime > Lampa.Storage.get(STORAGE_SYNC_KEY, 0)) {
                            try {
                                var data = JSON.parse(j.data);
                                if (data.hasOwnProperty('customTypes')) {
                                    Lampa.Storage.set(STORAGE_KEY, data, true);
                                    Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                                    customFavorite.init(data);
                                }
                            } catch (error) {
                                console.log('Lampac Storage', 'import', error.message);
                            }
                        }
                    } else if (j.msg && j.msg === 'outFile') {
                        customFavorite.init();
                        goExport();
                    }

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            );
        }

        function sync() {
            if (window.custom_favs_sync_init) return;
            window.custom_favs_sync_init = true;

            goImport(function () {
                Lampa.Storage.listener.follow('change', function (event) {
                    if (event.name === STORAGE_KEY) {
                        goExport();
                    }
                });

                document.addEventListener('lwsEvent', function (event) {
                    var profileId = Lampa.Storage.get('lampac_profile_id', '');
                    var eventName = event.detail.name;
                    var eventData = event.detail.data;
                    var eventSource = event.detail.src;

                    if ((eventName === 'sync_custom_favorite' || eventName === 'profile_synced') && eventData === profileId) {
                        goImport(function () {
                            if (eventSource === 'profiles.js') {
                                customFavorite.migration();
                            }
                        });
                    } else if (eventName === 'system' && eventData === 'reconnected' && eventSource !== 'profiles.js') {
                        goImport(function () {});
                    }
                });
            });
        }

        this.start = function() {
            if (!window.lwsEvent) {
                Lampa.Utils.putScript([account(HOST + '/invc-ws.js')], function () { }, false, function () {
                    sync();
                }, true);
            } else sync();
        }
    }

    function FavoritePageService() {
    }

    FavoritePageService.prototype.renderCustomFavoriteButton = function (type) {
        var customTypeCssClass = 'custom-type-' + type.uid;

        var $register = Lampa.Template.js('register').addClass('selector').addClass(customTypeCssClass).addClass('custom-type');
        $register.find('.register__name').text(type.name).addClass(customTypeCssClass);
        $register.find('.register__counter').text(type.counter || 0).addClass(customTypeCssClass);

        var $render = Lampa.Activity.active().activity.render();

        $register.on('hover:long', function () {
            var menu = [
                {
                    title: Lampa.Lang.translate('rename'),
                    action: 'rename'
                },
                {
                    title: Lampa.Lang.translate('settings_remove'),
                    action: 'remove'
                }
            ]

            var controllerName = Lampa.Controller.enabled().name;

            Lampa.Select.show({
                title: Lampa.Lang.translate('title_action'),
                items: menu,
                onBack: function () {
                    Lampa.Controller.toggle(controllerName);
                    Lampa.Controller.toggle('content');
                },
                onSelect: function (item) {
                    switch (item.action) {
                        case 'remove': {
                            try {
                                customFavorite.removeType(type.name);
                                $register.remove();

                                Lampa.Controller.toggle(controllerName);
                                Lampa.Controller.toggle('content');
                            } finally {
                                break;
                            }
                        }
                        case 'rename': {
                            var inputOptions = {
                                title: Lampa.Lang.translate('filter_set_name'),
                                value: type.name,
                                free: true,
                                nosave: true
                            };

                            Lampa.Input.edit(inputOptions, function (value) {
                                if (value === '' || type.name == value || value === 'card') {
                                    Lampa.Controller.toggle('content');
                                    Lampa.Noty.show(Lampa.Lang.translate('invalid_name'));
                                    return;
                                };

                                try {
                                    customFavorite.renameType(type.name, value);
                                    $register.find('.register__name').text(value);
                                    type.name = value;
                                } finally {
                                    Lampa.Controller.toggle(controllerName);
                                    Lampa.Controller.collectionFocus($register, $render);
                                }
                            });

                            break;
                        }
                    }
                }
            });
        });

        $register.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                component: 'favorite',
                title: type.name,
                type: type.uid,
                page: 1,
            });
        });

        $('.register:first', $render).after($register);
        return $register;
    }

    FavoritePageService.prototype.refresh = function (type) {
        var activity = Lampa.Activity.active();

        if (activity.component === 'bookmarks') {
            $('.register__counter.custom-type-' + type.uid).text(type.counter || 0);
        };
    }

    FavoritePageService.prototype.renderAddButton = function () {
        var self = this;

        var $register = Lampa.Template.js('register').addClass('selector').addClass('new-custom-type');
        $register.find('.register__counter').html('<img src="./img/icons/add.svg"/>');

        $('.register:first').before($register);

        $register.on('hover:enter', function () {
            var inputOptions = {
                title: Lampa.Lang.translate('filter_set_name'),
                value: '',
                free: true,
                nosave: true
            };

            Lampa.Input.edit(inputOptions, function (value) {
                if (value === '' || value === 'card') {
                    Lampa.Controller.toggle('content');
                    Lampa.Noty.show(Lampa.Lang.translate('invalid_name'));
                    return;
                };

                try {
                    var type = customFavorite.createType(value);
                    self.renderCustomFavoriteButton(type);
                } finally {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    }

    FavoritePageService.prototype.renderLines = function () {
        var object = Lampa.Activity.active();
        var favorite = customFavorite.getFavorite();
        var mediaTypes = ['movies', 'tv'];

        customFavorite.getTypesWithoutSystem(favorite).reverse().forEach(function (typeName) {
            var typeUid = favorite.customTypes[typeName];
            var typeList = favorite[typeUid] || [];

            var typeCards = favorite.customTypes.card.filter(function (card) { return typeList.indexOf(card.id) !== -1 });
            var lineItems = Lampa.Arrays.clone(typeCards.slice(0, 20));

            var i = 0;
            mediaTypes.forEach(function (m) {
                var filter = Lampa.Utils.filterCardsByType(typeCards, m);

                if (filter.length) {
                    Lampa.Arrays.insert(lineItems, i, {
                        cardClass: function cardClass() {
                            return new CustomFavoriteFolder(filter, {
                                title: typeName,
                                category: typeUid,
                                media: m
                            });
                        }
                    });
                    i++;
                }
            });

            lineItems = lineItems.slice(0, 20);
            lineItems.forEach(function(item) {
                item.ready = false;
            });

            if (lineItems.length > 0) {
                object.activity.component().append({
                    title: typeName,
                    results: lineItems,
                    type: typeUid
                });
            }
        });
    }

    var favoritePageSvc = new FavoritePageService();

    function CardFavoriteService() {
        this.extendContextMenu = function (object) {
            var self = this;

            var bookmarkMenuItem = $('body > .selectbox').find('.selectbox-item__title').filter(function () {
                return $(this).text() === Lampa.Lang.translate('title_book');
            });

            customFavorite.getTypes().forEach(function (customCategory) {
                var $menuItem = $('<div class="selectbox-item selector"><div class="selectbox-item__title">' + customCategory + '</div><div class="selectbox-item__checkbox"></div></div>');
                $menuItem.insertBefore(bookmarkMenuItem.parent());
                $menuItem.on('hover:enter', function () {
                    var category = $(this).find('.selectbox-item__title').text();
                    var type = customFavorite.toggleCard(category, object.data);
                    $(this).toggleClass('selectbox-item--checked');

                    setTimeout(function () {
                        if (object.card) {
                            self.refreshCustomFavoriteIcon(object);
                        } else {
                            self.refreshBookmarkIcon();
                        }
                    }, 0);

                    favoritePageSvc.refresh(type);
                });

                if (customFavorite.getTypeList(customCategory).indexOf(object.data.id) >= 0) {
                    $menuItem.addClass('selectbox-item--checked');
                }
            });

            Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));

            setTimeout(function () {
                var $menuItems = $('body > .selectbox').find('.selector');
                if ($menuItems.length > 0) {
                    Lampa.Controller.focus($menuItems.get(0));
                    Navigator.focus($menuItems.get(0));
                }
            }, 10);
        };

        this.refreshCustomFavoriteIcon = function (object) {
            var customFavCards = customFavorite.getCards();

            var $iconHolder = $('.card__icons-inner', object.card);

            var id = object.data.id;
            var anyFavorite = customFavCards.indexOf(id) >= 0;

            var $starIcon = $('.icon--star', $iconHolder);
            var hasIcon = $starIcon.length !== 0;
            var hasHiddenIcon = hasIcon && $starIcon.hasClass('hide');

            if (anyFavorite) {
                if (!hasIcon) {
                    $iconHolder.prepend(Lampa.Template.get('custom-fav-icon'));
                } else if (hasHiddenIcon) {
                    $starIcon.removeClass('hide');
                }
            } else {
                if (hasIcon && !hasHiddenIcon) {
                    $starIcon.addClass('hide');
                }
            }
        }

        this.refreshBookmarkIcon = function () {
            var active = Lampa.Activity.active();

            if (active.component !== 'full') {
                return;
            }

            var card = active.card;
            var anyCustomFavorite = customFavorite.getCards().indexOf(card.id) !== -1;

            var favStates = anyCustomFavorite ? {} : Lampa.Favorite.check(card);
            var anyFavorite = anyCustomFavorite || Object.keys(favStates).filter(function (favType) {
                return favType !== 'history' && favType !== 'any';
            }).some(function (favType) {
                return !!favStates[favType];
            });

            var $svg = $(".button--book svg path", active.activity.render());

            if (anyFavorite) {
                $svg.attr('fill', 'currentColor');
            } else {
                $svg.attr('fill', 'transparent');
            };
        }
    }

    var cardFavoriteSvc = new CardFavoriteService();

    function start() {
        if (window.custom_favorites) {
            return;
        }

        window.custom_favorites = true;

        Lampa.Storage.listener.follow('change', function(event) {
            if (event.name == 'lampac_sync_favorite' && event.value == 0) {
                Lampa.Storage.set(STORAGE_KEY, '{}', true);
                Lampa.Storage.set(STORAGE_SYNC_KEY, 0, true);

                customFavorite.init({});
            }
        });

        HOST = Lampa.Storage.get('custom_favorite_host', '') || HOST;
        new SyncService().start();

        ensureListenerExtensions(function () {
            Lampa.Listener.follow('card', function (event) {
                if (event.type !== 'build') {
                    return;
                }

                var originalFavorite = event.object.favorite;
                event.object.favorite = function () {
                    originalFavorite.apply(this, arguments);
                    cardFavoriteSvc.refreshCustomFavoriteIcon(event.object);
                }

                var originalOnMenu = event.object.onMenu;
                event.object.onMenu = function () {
                    originalOnMenu.apply(this, arguments);
                    cardFavoriteSvc.extendContextMenu(event.object);
                }
            });
        });

        var favoriteGet = Lampa.Favorite.get;

        Lampa.Favorite.get = function (params) {
            if (!params || !params.type) {
                return favoriteGet.apply(this, arguments);
            }

            var favorite = customFavorite.getFavorite();

            if (favorite &&
                favorite.hasOwnProperty(params.type) &&
                Array.isArray(favorite[params.type]) &&
                customFavorite.hasTypeId(favorite, params.type)) {

                var cardIds = favorite[params.type];
                var customTypeCards = favorite.customTypes.card;

                var filtered = [];
                for (var i = 0; i < customTypeCards.length; i++) {
                    var favCard = customTypeCards[i];
                    if (cardIds.indexOf(favCard.id) !== -1) {
                        filtered.push(favCard);
                    }
                }
                
                return filtered;
            }

            return favoriteGet.apply(this, arguments);
        };

        Lampa.Lang.add({
            rename: {
                en: 'Rename',
                uk: 'Змінити ім’я',
                ru: 'Изменить имя'
            },
            invalid_name: {
                en: 'Invalid name',
                uk: 'Некоректне ім’я',
                ru: 'Некорректное имя'
            }
        });
        Lampa.Template.add('custom-fav-icon', '<div class="card__icon icon--star"><svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.6162 7.10981L15.8464 7.55198L16.3381 7.63428L22.2841 8.62965C22.8678 8.72736 23.0999 9.44167 22.6851 9.86381L18.4598 14.1641L18.1104 14.5196L18.184 15.0127L19.0748 20.9752C19.1622 21.5606 18.5546 22.002 18.025 21.738L12.6295 19.0483L12.1833 18.8259L11.7372 19.0483L6.34171 21.738C5.81206 22.002 5.20443 21.5606 5.29187 20.9752L6.18264 15.0127L6.25629 14.5196L5.9069 14.1641L1.68155 9.86381C1.26677 9.44167 1.49886 8.72736 2.08255 8.62965L8.02855 7.63428L8.52022 7.55198L8.75043 7.10981L11.5345 1.76241C11.8078 1.23748 12.5589 1.23748 12.8322 1.76241L15.6162 7.10981Z" stroke="currentColor" stroke-width="2.2"></path></svg></div>');

        $('<style>').prop('type', 'text/css').html(
            '.card__icon { position: relative; } ' +
            '.icon--star svg { position: absolute; height: 60%; width: 60%; top: 50%; left: 50%; transform: translate(-50%, -50%) }' +
            '.new-custom-type .register__counter { display:flex; justify-content:center; align-items:center }' +
            '.new-custom-type .register__counter img { height:2.2em; padding:0.4em; }' +
            '.register.custom-type { background-image: url("https://levende.github.io/lampa-plugins/assets/tap.svg"); background-repeat: no-repeat; background-position: 90% 90%; background-size: 20%; }'
        ).appendTo('head');

        Lampa.Listener.follow('full', function (event) {
            if (event.type == 'complite') {
                var active = Lampa.Activity.active();
                cardFavoriteSvc.refreshBookmarkIcon();

                var $btnBook = $(".button--book", active.activity.render());
                $btnBook.on('hover:enter', function () {
                    cardFavoriteSvc.extendContextMenu({ data: active.card });
                });
            }
        });

        Lampa.Storage.listener.follow('change', function (event) {
            if (event.name !== 'activity') {
                return;
            }

            if (Lampa.Activity.active().component === 'bookmarks') {
                if ($('.new-custom-type').length !== 0) {
                    return;
                }

                favoritePageSvc.renderAddButton();
                var favorite = customFavorite.getFavorite();

                favoritePageSvc.renderLines();

                customFavorite.getTypesWithoutSystem(favorite).reverse().forEach(function (typeName) {
                    var typeUid = favorite.customTypes[typeName];
                    var typeList = favorite[typeUid] || [];
                    var typeCounter = typeList.length;

                    favoritePageSvc.renderCustomFavoriteButton({
                        name: typeName,
                        uid: typeUid,
                        counter: typeCounter
                    });
                });

                Lampa.Activity.active().activity.toggle();
            }
        });
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }
})();
        }
    }
    if (window.appready) { start(); } else { var done = false; Lampa.Listener.follow('app', function(e) { if (done) return; done = true; start(); }); }
})();
/* Explicit device lists adapter. Keeps account/Trakt stores separate; no account import/export. */
(function(){
    'use strict';
    if(window.DeviceBookmarks)return;
    var ready=false,bypass=false,intent=null,revision=0,sourceOpen=false;
    var types=['book','like','wath','look','viewed','scheduled','continued','thrown'];
    function data(){var value=Lampa.Storage.get('favorite',{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
    function list(type){var source=data(),ids=Array.isArray(source[type])?source[type]:[],cards=Array.isArray(source.card)?source.card:[];return ids.map(function(id){return cards.find(function(c){return String(c.id)===String(id);});}).filter(Boolean);}
    function count(){return types.reduce(function(n,type){return n+list(type).length;},0);}
    function has(card){return list('book').some(function(c){return String(c.id)===String(card.id);});}
    function toggle(card){
        if(!card||card.id==null)throw new Error('Device bookmark requires media ID');
        var copy=JSON.parse(JSON.stringify(data())),ids=Array.isArray(copy.book)?copy.book:[],index=ids.findIndex(function(id){return String(id)===String(card.id);});
        if(index>=0)ids.splice(index,1);else ids.unshift(card.id);copy.book=ids;
        if(!Array.isArray(copy.card))copy.card=[];
        if(index<0&&!copy.card.some(function(c){return String(c.id)===String(card.id);}))copy.card.push(Lampa.Utils.clearCard(JSON.parse(JSON.stringify(card))));
        Lampa.Storage.set('favorite',copy);Lampa.Favorite.read(true);
        // Do not emit Favorite.add/remove: native account queue would interpret them as remote writes.
        return index<0;
    }
    function open(type,page){Lampa.Activity.push({component:'device_bookmarks',title:'Списки на пристрої',type:type||'',page:page||1});}
    function View(object){
        var component=Lampa.Maker.make('Main',object),builtRevision=revision,refreshTimer=null;
        component.use({onCreate:function(){
            var rows=[],page=Math.max(1,Number(object.page)||1);
            (object.type?[object.type]:types).forEach(function(type){
                var cards=list(type);if(!cards.length)return;
                var shown=cards.slice((page-1)*20,page*20).map(function(original){var card=JSON.parse(JSON.stringify(original));card.params={emit:{onEnter:function(){Lampa.Router.call('full',card);},onFocus:function(){Lampa.Background.change(Lampa.Utils.cardImgBackground(card));}}};return card;});
                rows.push({title:Lampa.Lang.translate('title_'+type)+' · на пристрої',type:type,results:shown,total_pages:page<Math.ceil(cards.length/20)?2:1,params:{emit:{onMore:function(){open(type,page+1);}}}});
            });
            if(rows.length)component.build(rows);else component.empty();
        },onStart:function(){if(builtRevision!==revision&&!refreshTimer)refreshTimer=setTimeout(function(){refreshTimer=null;var active=Lampa.Activity.active();if(active&&active.activity.component===component)Lampa.Activity.replace({component:'device_bookmarks',title:'Списки на пристрої',type:object.type||'',page:object.page||1});},0);},onDestroy:function(){clearTimeout(refreshTimer);}});return component;
    }
    function onMenu(event){
        if(!event||event.type!=='action'||event.action!=='favorite'||bypass||!count())return;
        event.abort();var target=event.target;
        function show(){sourceOpen=true;Lampa.Select.show({title:'Вибране · джерело списків',items:[{title:'На цьому пристрої',subtitle:'Локальні списки Lampa · '+count()+' записів',device:true},{title:'Обліковий запис і власні списки',subtitle:'Чинний інтерфейс Lampa / Custom Favorites'}],onBack:function(){sourceOpen=false;Lampa.Controller.toggle('menu');},onSelect:function(item){sourceOpen=false;if(item.device)open();else{bypass=true;try{$(target).trigger('hover:enter');}finally{bypass=false;}}}});}
        if(Lampa.ParentalControl&&typeof Lampa.ParentalControl.personal==='function')Lampa.ParentalControl.personal('bookmarks',show,false,true);else show();
    }
    function onEnter(event){
        var target=event.target&&event.target.closest&&event.target.closest('.button--book');if(!target)return;
        var active=Lampa.Activity.active();intent=active&&active.component==='full'?{time:Date.now(),id:active.id}:null;
    }
    function onSelect(event){
        var active=Lampa.Activity.active();if(!intent||Date.now()-intent.time>500||!active||active.component!=='full'||String(active.id)!==String(intent.id))return;
        intent=null;var root=event.html&&(event.html[0]||event.html),first=root&&root.querySelector('.selectbox-item');if(!first||root.querySelector('[data-device-bookmark]'))return;
        var movie=active.activity.component.props&&active.activity.component.props.get('movie')||active.card;if(!movie)return;
        var item=$('<div class="selectbox-item selector" data-device-bookmark="1"><div class="selectbox-item__title"></div><div class="selectbox-item__checkbox"></div></div>');
        item.find('.selectbox-item__title').text('Закладки · на пристрої');item.toggleClass('selectbox-item--checked',has(movie));
        item.on('hover:enter',function(){toggle(movie);Lampa.Select.close();Lampa.Controller.toggle('full_start');});first.parentNode.insertBefore(item[0],first);
    }
    function clearIntent(){intent=null;sourceOpen=false;}
    function onStorage(event){if(event&&event.name==='favorite')revision++;}
    function init(){
        if(ready||!Lampa.Maker)return;ready=true;Lampa.Component.add('device_bookmarks',View);document.addEventListener('hover:enter',onEnter,true);Lampa.Listener.follow('menu',onMenu);Lampa.Select.listener.follow('fullshow',onSelect);Lampa.Select.listener.follow('hide',clearIntent);Lampa.Storage.listener.follow('change',onStorage);
    }
    window.DeviceBookmarks={version:'1.0.0',open:open,has:has,toggle:toggle,destroy:function(){document.removeEventListener('hover:enter',onEnter,true);Lampa.Listener.remove('menu',onMenu);Lampa.Select.listener.remove('fullshow',onSelect);Lampa.Select.listener.remove('hide',clearIntent);Lampa.Storage.listener.remove('change',onStorage);if(sourceOpen){Lampa.Select.close();Lampa.Controller.toggle('menu');}document.querySelectorAll('[data-device-bookmark]').forEach(function(n){$(n).off('hover:enter').remove();});Lampa.Listener.remove('app',onReady);delete window.DeviceBookmarks;}};
    function onReady(event){if(event.type==='ready')init();}
    if(window.appready)init();else Lampa.Listener.follow('app',onReady);
})();
