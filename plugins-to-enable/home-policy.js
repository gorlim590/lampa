/* Internal helper for home-history.js. It installs no independent Home listeners. */
(function () {
    'use strict';
    if (window.createHomeHistoryPolicy) return;
    var CORE_BUILDERS = [{"id": "core:tmdb:builder-65740c249aa5", "kind": "recommendation", "signature": "function(call){if(['movie','tv'].indexOf(type)==-1)returncall();TMDB.get('person/popular',{},function(json){call();if(!json.results)return;json.results.sort(function(a,b){returna.popularity-b.popularity;});varfiltred=json.results.filter(function(p){returnp.known_for_department&&p.known_for;});varpersons=filtred.filter(function(p){return(p.known_for_department||'').toLowerCase()=='acting'&&p.known_for.length;}).slice(0,10);persons.forEach(function(person_data,index){varevent=functionevent(call_inner){person({only_credits:type,id:person_data.id},function(result){if(!result.credits)returncall_inner();varitems=(result.credits[type]||[]).filter(function(m){returnm.backdrop_path&&m.vote_count>20;});if(type=='tv')items=items.filter(function(m){return!(m.genre_ids.indexOf(10767)>=0||m.genre_ids.indexOf(10763)>=0);});items.sort(function(a,b){varda=a.release_date||a.first_air_date;vardb=b.release_date||b.first_air_date;if(db>da)return1;elseif(db<da)return-1;elsereturn0;});varsrc=person_data.profile_path?TMDB.img(person_data.profile_path,'w90_and_h90_face'):person_data.img||'./img/actor.svg';call_inner({title:person_data.name,icon_img:src,results:items.length>5?items.slice(0,20):[],params:{module:Helper$b.toggle(Helper$b.MASK.base,'Icon','More')}});});};parts.push(event);});Arrays.shuffleArrayFromIndex(parts,shift);},call,{life:60*24*3});}"}, {"id": "core:tmdb:builder-dd55f4e44543", "kind": "recommendation", "signature": "function(call){if(['movie','tv'].indexOf(type)==-1)returncall();call();TMDB.keywords[type].filter(function(keyword){returnfilter.indexOf(keyword.id)==-1;}).forEach(function(keyword){parts.push(partKeyword(keyword,type,req_params));});Arrays.shuffleArrayFromIndex(parts,shift);}"}, {"id": "core:tmdb:movie/now_playing", "kind": "recommendation", "signature": "function(call){get$e(nowPlaying('movie/now_playing'),params,function(json){json.title=Lang.translate('title_now_watch');call(json);},call,{life:day$4*2});}"}, {"id": "core:tmdb:trending/movie/day", "kind": "recommendation", "signature": "function(call){get$e('trending/movie/day',params,function(json){json.title=Lang.translate('title_trend_day');call(json);},call,{life:day$4*2});}"}, {"id": "core:tmdb:trending/movie/week", "kind": "recommendation", "signature": "function(call){get$e('trending/movie/week',params,function(json){json.title=Lang.translate('title_trend_week');call(json);},call,{life:day$4*3});}"}, {"id": "core:tmdb:movie/upcoming", "kind": "recommendation", "signature": "function(call){get$e('movie/upcoming',params,function(json){json.title=Lang.translate('title_upcoming');call(json);},call,{life:day$4*7});}"}, {"id": "core:tmdb:movie/popular", "kind": "recommendation", "signature": "function(call){get$e('movie/popular',params,function(json){json.title=Lang.translate('title_popular_movie');json.icon_svg=Template.string('icon_fire');json.icon_bgcolor='#fff';json.icon_color='#fd4518';json.params={module:Helper$b.toggle(Helper$b.MASK.base,'Icon')};call(json);},call,{life:day$4*3});}"}, {"id": "core:tmdb:trending/tv/week", "kind": "recommendation", "signature": "function(call){get$e('trending/tv/week',params,function(json){json.title=Lang.translate('title_popular_tv');json.icon_svg=Template.string('icon_fire');json.icon_bgcolor='#fff';json.icon_color='#fd4518';json.params={module:Helper$b.toggle(Helper$b.MASK.base,'Icon')};call(json);},call,{life:day$4*3});}"}, {"id": "core:tmdb:movie/top_rated", "kind": "recommendation", "signature": "function(call){get$e('movie/top_rated',params,function(json){json.title=Lang.translate('title_top_movie');json.icon_svg=Template.string('icon_top');json.icon_bgcolor='#e02129';json.params={module:Helper$b.toggle(Helper$b.MASK.base,'Icon')};call(json);},call,{life:day$4*7});}"}, {"id": "core:tmdb:tv/top_rated", "kind": "recommendation", "signature": "function(call){get$e('tv/top_rated',params,function(json){json.title=Lang.translate('title_top_tv');json.icon_svg=Template.string('icon_top');json.icon_bgcolor='#e02129';json.params={module:Helper$b.toggle(Helper$b.MASK.base,'Icon')};call(json);},call,{life:day$4*7});}"}, {"id": "core:tmdb:discover/movie?with_genres=", "kind": "recommendation", "signature": "functionevent(call){get$e('discover/movie?with_genres='+genre.id,params,function(json){json.title=Lang.translate(genre.title.replace(/[^a-z_]/g,''));call(json);},call,{life:day$4*7});}"}, {"id": "core:cub:?sort=now_playing", "kind": "recommendation", "signature": "function(call){get$9('?sort=now_playing',params,function(json){json.title=Lang.translate('title_now_watch');call(json);},call,{life:day$3*2});}"}, {"id": "core:cub:?sort=latest", "kind": "recommendation", "signature": "function(call){get$9('?sort=latest',params,function(json){json.title=Lang.translate('title_latest');call(json);},call,{life:day$3*2});}"}, {"id": "core:cub:top/fire/movie", "kind": "recommendation", "signature": "function(call){if(permit.child_small)returncall();get$9('top/fire/movie',params,function(json){json.title=Lang.translate('title_fire');json.icon_svg=Template.string('icon_fire');json.icon_bgcolor='#fff';json.icon_color='#fd4518';json.params={module:Helper$b.toggle(Helper$b.MASK.base,'Icon')};call(json);},call,{life:day$3*7});}"}, {"id": "core:cub:?cat=", "kind": "recommendation", "signature": "function(call){get$9('?cat='+params.url+'&sort=latest&uhd=true',params,function(json){json.title=Lang.translate('title_in_high_quality');json.results.forEach(function(card){card.params={style:{name:'wide'}};});json.params={items:{view:3}};call(json);},call,{life:day$3*3});}"}, {"id": "core:cub:top/hundred/movie", "kind": "recommendation", "signature": "function(call){if(permit.child_small)returncall();get$9('top/hundred/movie',params,function(json){json.title=Lang.translate('title_top_100')+'-'+Lang.translate('menu_movies');json.icon_svg=Template.string('icon_top');json.icon_bgcolor='#e02129';json.params={module:Helper$b.toggle(Helper$b.MASK.base,'Icon')};call(json);},call,{life:day$3*7});}"}, {"id": "core:cub:top/hundred/tv", "kind": "recommendation", "signature": "function(call){if(permit.child_small)returncall();get$9('top/hundred/tv',params,function(json){json.title=Lang.translate('title_top_100')+'-'+Lang.translate('menu_tv');json.icon_svg=Template.string('icon_top');json.icon_bgcolor='#e02129';json.params={module:Helper$b.toggle(Helper$b.MASK.base,'Icon')};call(json);},call,{life:day$3*7});}"}, {"id": "core:cub:builder-329afe2c458f", "kind": "recommendation", "signature": "function(call){if(permit.child)returncall();trailers('added',call);}"}, {"id": "core:cub:?sort=top&genre=", "kind": "recommendation", "signature": "functionevent(call){get$9('?sort=top&genre='+genre.id+(permit.child_small?',16':''),params,function(json){json.title=Lang.translate(genre.title.replace(/[^a-z_]/g,''));call(json);},call,{life:day$3*7});}"}, {"id": "core:native:init$19", "kind": "legacy-history", "signature": "function(call){//Смотриместьлиновыесерииспереводомif(media=='tv'||media=='anime'){varcub_notices=Notice$1.get('cub').items();cub_notices=cub_notices.filter(function(n){returnn.item.method=='tv-voice';});//Получаемизисториитолькотекарточкикоторыеестьвуведомленияхvarhistory=get$c({type:'history'}).filter(function(h){returncub_notices.find(function(n){returnn.item.card_id==h.id;});});//Фильтруемтолькотекарточкиукоторыхестьновыесерииvarnew_episode=history.map(function(h){varnoty=cub_notices.find(function(n){returnn.item.card_id==h.id;});varcard=Arrays.clone(h);card.params={module:Helper$9.toggle(Helper$9.MASK.base,'Subscribe')};card.subscribe={status:1,season:noty.item.season,episode:noty.item.episode,voice:noty.data.voice};card.viewed=Timeline$1.watchedEpisode(h,noty.item.season,noty.item.episode);returncard;});//Оставляемтолькотеукоторыхпросмотрменьше10%new_episode=new_episode.filter(function(n){returnn.viewed<10;});new_episode=new_episode.filter(function(e){varjpan=Utils$1.containsJapanese(e.original_name||e.name||'')||e.original_language=='ja';returnmedia=='anime'?jpan:!jpan;});if(new_episode.length){//Убираемизосновногоспискакарточкиукоторыхестьновыесерииresults=results.filter(function(r){return!new_episode.find(function(h){returnh.id==r.id;});});results=[].concat(new_episode,results);//Оставляемнеболее20карточекresults=results.slice(0,19);}}call({results:results,title:media=='tv'||media=='anime'?Lang.translate('title_continue'):Lang.translate('title_watched')});}"}, {"id": "core:native:add$2", "kind": "legacy-history", "signature": "function(call){call({results:results,title:Lang.translate('title_continue')});}"}, {"id": "core:native:add$2", "kind": "legacy-history", "signature": "function(call){vardone=functiondone(results){call({results:results,title:Lang.translate('title_continue')});};TimeTable.getMany(candidates.slice(0,pool_size$1)).then(function(found){done(build$1(candidates,found));}).catch(function(){done(Favorite.continues(media));});}"}]; // verified native builders
    function normalize(fn) { return String(fn).replace(/\s+/g, ''); }
    window.createHomeHistoryPolicy = function (L, owner) {
        var known = Object.create(null), cache = new WeakMap(), homeParts = new WeakSet(), records = new WeakMap();
        var inventory = Object.create(null), booted = false;
        CORE_BUILDERS.forEach(function (entry) { known[entry.signature] = entry; });
        function identify(fn) {
            if (cache.has(fn)) return cache.get(fn);
            var value = known[normalize(fn)] || null; cache.set(fn, value); return value;
        }
        function stableId(data) {
            var id = data && data.home_row_id;
            if (!id && data && data.home_history) id = 'home_history_' + data.home_history;
            if (!id && data && data.results && data.results[0] && data.results[0].ydesign_row === 'week') id = 'ydesign_week';
            return typeof id === 'string' && /^[a-zA-Z][\w.:-]{0,159}$/.test(id) ? id : null;
        }
        function annotate(data, meta) {
            if (!data || typeof data !== 'object') return data;
            if (!stableId(data) && meta && meta.id) data.home_row_id = meta.id;
            if (!data.home_row_origin && meta) data.home_row_origin = meta.origin;
            return data;
        }
        function prepare(parts) { homeParts.add(parts); }
        function filter(parts) {
            for (var i = parts.length - 1; i >= 0; i--) {
                if (typeof parts[i] !== 'function') continue;
                var core = identify(parts[i]);
                if (!core) continue;
                inventory[core.id] = { id: core.id, origin: 'core', action: 'hidden', kind: core.kind };
                parts.splice(i, 1);
            }
        }
        function wrap(callback, registered) {
            var core = identify(callback);
            if (core && (core.kind === 'legacy-history' || !registered)) { inventory[core.id] = { id: core.id, origin: 'core', action: 'hidden', kind: core.kind }; return null; }
            return function (done) {
                return callback(function (data) { return done(annotate(data)); });
            };
        }
        function register(row) {
            if (!row || typeof row.call !== 'function' || row._homeHistoryTagged) return;
            row._homeHistoryTagged = true;
            var original = row.call;
            row.call = function (params, screen) {
                var result = original.apply(this, arguments);
                if (screen !== 'main' || !result) return result;
                function decorate(fn) {
                    // Preserve native producer identity through a metadata-only wrapper.
                    var core = identify(fn); if (core && core.kind === 'legacy-history') return fn;
                    return function (done) { return fn(function (data) { done(annotate(data, { id: row.name, origin: 'registered-plugin' })); }); };
                }
                if (typeof result === 'function') return decorate(result);
                if (Array.isArray(result)) return result.map(function (item) { return typeof item === 'function' ? decorate(item) : annotate(item, { id: row.name, origin: 'registered-plugin' }); });
                return annotate(result, { id: row.name, origin: 'registered-plugin' });
            };
        }
        function key() { return 'home_history_order_v1:' + owner.scope(); }
        function saved() {
            var value = L.Storage.get(key(), null);
            if (!value || value.v !== 1 || !Array.isArray(value.ids)) return [];
            var used = Object.create(null);
            return value.ids.filter(function (id) { if (typeof id !== 'string' || !/^[a-zA-Z][\w.:-]{0,159}$/.test(id) || used[id]) return false; used[id] = true; return true; });
        }
        function component() { var a = L.Activity && L.Activity.active(); return a && a.component === 'main' && a.activity && a.activity.component; }
        function liveItems(comp) { return comp.items.filter(function (item) { var node = item.data && owner.node(item); return node && node.parentNode; }); }
        function apply(comp) {
            if (!comp || !Array.isArray(comp.items)) return;
            var items = liveItems(comp), record = records.get(comp);
            if (items.length !== comp.items.length) return; // Never drop detached/unknown native placeholders.
            if (!record) { record = { base: [], opaque: new WeakMap(), next: 0, last: '' }; records.set(comp, record); }
            function itemKey(item) {
                var id = stableId(item.data);
                if (!id) { if (!record.opaque.has(item)) record.opaque.set(item, '@opaque:' + (++record.next)); id = record.opaque.get(item); }
                if (record.base.indexOf(id) < 0) record.base.push(id);
                return id;
            }
            var ids = items.map(itemKey), order = saved(), signature = JSON.stringify([key(), order, ids]);
            if (record.last === signature) return;
            var selected = comp.items[comp.active], ranks = Object.create(null);
            (order.length ? order : record.base).forEach(function (id, index) { ranks[id] = index; });
            var entries = items.map(function (item, index) { return { item: item, id: ids[index], index: index }; });
            var sorted = entries.filter(function (entry) { return stableId(entry.item.data); });
            sorted.sort(function (a, b) {
                var ar = ranks[a.id], br = ranks[b.id];
                if (ar !== undefined || br !== undefined) return (ar === undefined ? Infinity : ar) - (br === undefined ? Infinity : br) || a.index - b.index;
                return a.id.localeCompare(b.id) || a.index - b.index;
            });
            if (!order.length) {
                var at = sorted.findIndex(function (r) { return r.id === 'home_history_resume'; });
                if (at >= 0) { var resume = sorted.splice(at, 1)[0]; sorted.splice(Math.min(2, sorted.length), 0, resume); }
            }
            var cursor = 0;
            var next = entries.map(function (r) { return stableId(r.item.data) ? sorted[cursor++].item : r.item; });
            next.forEach(function (item) {
                var id = stableId(item.data);
                inventory[id || itemKey(item)] = { id: id || null, origin: item.data.home_row_origin || (item.data.trakt_line ? 'trakt' : 'unknown-plugin'), action: 'kept', editable: !!id };
            });
            var nextSignature = JSON.stringify([key(), order, next.map(itemKey)]);
            if (next.every(function (item, i) { return comp.items[i] === item; })) { record.last = nextSignature; return; }
            // Keep object/controller/card state. Move only existing row nodes.
            var nodes = next.map(owner.node), parent = nodes[0] && nodes[0].parentNode;
            if (!parent || !nodes.every(function (node) { return node.parentNode === parent; })) return;
            {
                var current = Array.prototype.filter.call(parent.children, function (n) { return nodes.indexOf(n) >= 0; });
                var anchor = current.length ? current[current.length - 1].nextSibling : null;
                for (var i = nodes.length - 1; i >= 0; i--) { if (nodes[i].nextSibling !== anchor) parent.insertBefore(nodes[i], anchor); anchor = nodes[i]; }
            }
            record.last = nextSignature;
            comp.items = next; comp.active = Math.max(0, next.indexOf(selected));
            if (selected && next.indexOf(selected) >= 0 && L.Controller && L.Controller.own && L.Controller.own(selected) && comp.scroll && comp.scroll.update) comp.scroll.update(owner.node(selected));
        }
        function visible() {
            var comp = component(); if (!comp) return [];
            var counts = Object.create(null);
            var available = liveItems(comp).filter(function (item) { return item.data.results && item.data.results.length; });
            available.forEach(function (item) { var id = stableId(item.data); if (id) counts[id] = (counts[id] || 0) + 1; });
            return available.map(function (item) { var id = stableId(item.data); return { id: id, title: item.data.title || id || 'Рядок без ID', editable: !!id && counts[id] === 1 }; });
        }
        function saveVisible(ids, expectedScope) {
            if (expectedScope !== owner.scope()) return false;
            var before = saved(), available = visible().filter(function (r) { return r.editable; }).map(function (r) { return r.id; });
            if (ids.length !== available.length || ids.some(function (id, i) { return available.indexOf(id) < 0 || ids.indexOf(id) !== i; })) return false;
            var pending = ids.slice(), merged = before.map(function (id) { return available.indexOf(id) >= 0 ? pending.shift() : id; });
            merged = merged.concat(pending);
            if (JSON.stringify(before) === JSON.stringify(merged)) return true;
            L.Storage.set(key(), { v: 1, ids: merged }); var comp = component(); if (comp) apply(comp); return true;
        }
        function reset() {
            if (saved().length) L.Storage.set(key(), { v: 1, ids: [] });
            var comp = component(); if (comp) { var record = records.get(comp); if (record) record.last = ''; apply(comp); }
        }
        function editor() {
            var returnTo = L.Controller && L.Controller.enabled ? L.Controller.enabled().name : 'settings_component';
            var profile = owner.scope(), selectedId = null;
            function back() { if (L.Controller) L.Controller.toggle(returnTo); }
            function valid() { if (profile === owner.scope()) return true; L.Select.close(); back(); return false; }
            function list() {
                if (!valid()) return;
                var rows = visible();
                L.Select.show({ title: 'Порядок рядків Home', items: rows.map(function (r, i) { return { title: (i + 1) + '. ' + r.title, subtitle: r.editable ? '' : 'Потрібен стабільний ID від плагіна', id: r.id, editable: r.editable, selected: r.id === selectedId }; }).concat([{ title: 'Скинути порядок', reset: true }]),
                    onSelect: function (item) { if (item.reset) { reset(); list(); } else if (item.editable) { selectedId = item.id; actions(item.id); } else list(); }, onBack: back });
            }
            function move(id, position) {
                if (!valid()) return;
                var ids = visible().filter(function (r) { return r.editable; }).map(function (r) { return r.id; }), index = ids.indexOf(id);
                if (index < 0) return list(); ids.splice(index, 1); ids.splice(position, 0, id); saveVisible(ids, profile); actions(id);
            }
            function actions(id) {
                if (!valid()) return;
                var rows = visible().filter(function (r) { return r.editable; }), index = rows.findIndex(function (r) { return r.id === id; });
                if (index < 0) return list();
                var items = [];
                if (index > 0) items.push({ title: 'Перемістити вище', position: index - 1 });
                if (index + 1 < rows.length) items.push({ title: 'Перемістити нижче', position: index + 1 });
                items.push({ title: 'Вибрати позицію', choose: true }, { title: 'Готово', done: true });
                L.Select.show({ title: rows[index].title + ' · ' + (index + 1) + '/' + rows.length, items: items, onSelect: function (item) {
                    if (item.done) return list();
                    if (item.choose) return L.Select.show({ title: 'Позиція рядка', items: rows.map(function (r, i) { return { title: String(i + 1), position: i, selected: i === index }; }), onSelect: function (p) { move(id, p.position); }, onBack: function () { actions(id); } });
                    move(id, item.position);
                }, onBack: list });
            }
            list();
        }
        function install() {
            if (L.Api && typeof L.Api.partNext === 'function') {
                var next = L.Api.partNext;
                L.Api.partNext = function (parts) { if (homeParts.has(parts)) filter(parts); return next.apply(this, arguments); };
            }
            if (L.SettingsApi && L.SettingsApi.addComponent && L.SettingsApi.addParam) {
                L.SettingsApi.addComponent({ component: 'home_history', name: 'Головна сторінка' });
                L.SettingsApi.addParam({ component: 'home_history', param: { name: 'home_history_edit_order', type: 'button' }, field: { name: 'Порядок рядків Home', description: 'Виберіть рядок і перемістіть його пультом. Кожна підтверджена зміна зберігається.' }, onChange: editor });
                L.SettingsApi.addParam({ component: 'home_history', param: { name: 'home_history_reset_order', type: 'button' }, field: { name: 'Скинути порядок' }, onChange: reset });
            }
        }
        function bootstrap() {
            if (booted) return; booted = true;
            var active = L.Activity && L.Activity.active(), comp = component();
            // Existing untagged Home predates activation; rebuild once through the filtered pipeline.
            if (comp && comp.items && comp.items.some(function (item) { return !stableId(item.data); }) && L.Activity.replace) L.Activity.replace({ component: 'main', source: active.source || 'tmdb', page: 1 });
        }
        return { prepare: prepare, wrap: wrap, register: register, install: install, bootstrap: bootstrap, apply: apply, visible: visible, saveVisible: saveVisible, reset: reset, editor: editor,
            hasCustomOrder: function () { return saved().length > 0; },
            inventory: function () { return Object.keys(inventory).map(function (id) { return inventory[id]; }); }, classify: identify };
    };
})();
