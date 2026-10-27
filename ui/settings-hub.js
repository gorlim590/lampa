/* Settings navigation/index only. Native owners retain values and business handlers. */
(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    // #79's single UI entrypoint mounts this internal functional adapter explicitly.
    else if (root && !root.LampaSettingsHub) root.LampaSettingsHub = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    var ROOT = 'settings_hub', PAGE = 'settings_hub_page', installed = false, active = false, teardown = null;
    var categories = [
        ['profiles', 'Профілі та облікові записи'], ['home', 'Головна сторінка та рекомендації'],
        ['appearance', 'Зовнішній вигляд'], ['playback', 'Відтворення та плеєр'],
        ['torrents', 'Торренти та джерела'], ['trakt', 'Trakt та синхронізація'],
        ['language', 'Мова й контент'], ['screensaver', 'Екранна заставка й сповіщення'],
        ['plugins', 'Плагіни та інтеграції'], ['system', 'Система та діагностика']
    ];
    var owners = {ydesign:'ui/design-optimized.js', interface_mod_new:'ui/interface-plus.js', cardify:'ui/cardify-plus.js',
        trakt:'trakt/trakt.js', trakt_plus:'trakt/trakt-plus.js', home_history:'plugins-to-enable/home-history.js',
        torrents_cinema:'torrents-redesign.js', screensaver_plus:'ui/screensaver-plus.js',
        omdb_config_ui:'media/average-rating.js', omdb_ratings_select:'media/average-rating.js',
        ytranslate:'localization/translate.js', menu_filter:'ui/menu-hide.js'};
    function clean(value) { return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/ig, '[приховано]').slice(0, 220) : ''; }
    function category(component, key) {
        var s = (component + ':' + key).toLowerCase();
        if (/screensaver|ssplus|alert|notification/.test(s)) return 'screensaver';
        if (/trakt/.test(s)) return 'trakt';
        if (/home|recommend|row_|new_category|addcategory|ncinfo/.test(s)) return 'home';
        if (/parser|torrent|jackett|prowlarr|jacred|^server:/.test(s)) return 'torrents';
        if (/player|playback|subtitle|audio|video|stream|resume/.test(s)) return 'playback';
        if (/lang|translate|ua_|country|content_hiding|voice|dorama|^tmdb:/.test(s)) return 'language';
        if (/account|profile|avatar|signin|logout|^cub:/.test(s)) return 'profiles';
        if (/extension|plugin|bwa|bandera|uacom|comments/.test(s)) return 'plugins';
        if (/interface|ydesign|cardify|omdb|rating|poster|style|animation|theme|menu_filter/.test(s)) return 'appearance';
        return 'system';
    }
    function fields(html) {
        var result = [], starts = [], tags = /<div\b[^>]*>/ig, match;
        while ((match = tags.exec(html))) {
            var cls = match[0].match(/class=["']([^"']*)["']/i);
            if (cls && cls[1].split(/\s+/).indexOf('settings-param') !== -1) starts.push(match.index);
        }
        starts.forEach(function (start, index) {
            var part = html.slice(start, starts[index + 1] || html.length), tag = part.match(/^<div\b[^>]*>/i)[0];
            var key = tag.match(/data-name=["']([^"']+)["']/i), type = tag.match(/data-type=["']([^"']+)["']/i);
            var name = part.match(/class=["']settings-param__name["'][^>]*>([\s\S]*?)<\/div>/i);
            result.push({key:key ? key[1] : '', type:type ? type[1] : 'static', label:clean(name && name[1])});
        });
        return result;
    }
    function createRegistry(L, folders) {
        var rows = [], gaps = [], started = Date.now(), params = L.SettingsApi.allParams(), comps = L.SettingsApi.allComponents(), ids = {};
        Object.keys(comps).concat(Object.keys(params)).forEach(function (id) { ids[id] = true; });
        (folders || []).forEach(function (folder) { ids[folder.id] = true; });
        Object.keys(ids).forEach(function (component) {
            if (component === ROOT || component === PAGE) return;
            var title = clean((comps[component] || {}).name) || component, before = rows.length, panelAvailable = true;
            function add(p, index, origin) {
                if (p.type === 'title' || p.type === 'space') return;
                var key = p.key || '', id = component + ':' + (key || '@' + origin + index);
                var row={id:id, component:component, key:key, label:p.label || title + ' · ' + (index + 1),
                    owner:owners[component] || (/^ydesign_/.test(component) ? owners.ydesign : 'Панель: '+title), category:category(component,key),
                    registration:origin, ordinal:index, storageKeys:key && /^(select|input|trigger|toggle)$/.test(p.type)?[key]:[], persistence:'native-owner', scope:'unverified', status:'unverified', issue:73,
                    explanation:'Не перевірено: реєстрація не підтверджує дію, збереження чи підтримку пристроєм.'};
                if(component==='omdb_config_ui' && /^(omdb_api_key_set|mdblist_api_key_set|simkl_api_key_set|mal_api_key_set|mal_cors_proxies_set)$/.test(key) && !(L.AverageRating && L.AverageRating.settingsPrivacyVersion>=1)) {
                    row.status='blocked';row.explanation='Потрібне оновлення плагіна рейтингів: стара панель показує приватні значення відкритим текстом. #73';
                }
                if(component==='omdb_config_ui' && key==='omdb_rating_size') {
                    row.status='partial';row.explanation='XS, S і M мають однаковий мінімальний розмір 1,25 em для телевізора. Більші розміри працюють окремо. #73';
                }
                if(p.backLoop){row.status='broken';row.explanation='Підтверджено в коді: ця довідка перевизначає Back і повторно відкриває себе. Скористайтеся стандартними налаштуваннями до виправлення власника. #73';}
                rows.push(row);
            }
            try {
                var html = L.Template.get('settings_' + component, {}, true);
                if (typeof html === 'string') fields(html).forEach(function (p, i) { add(p,i,'template'); });
                else { gaps.push(component);panelAvailable=false; }
            } catch (e) { gaps.push(component);panelAvailable=false; }
            (params[component] || []).forEach(function (def, i) {
                var p=def.param || {}, code=typeof def.onRender==='function'?Function.prototype.toString.call(def.onRender):'';
                add({key:p.name,type:p.type,label:clean((def.field || {}).name),backLoop:component==='addCategory' && p.name==='ncInfo' && /controller\.back\s*=/.test(code) && /Settings\.create\(['"]ncInfo['"]\)/.test(code)},i,'SettingsApi');
            });
            rows.slice(before).forEach(function(row){row.panelAvailable=panelAvailable;if(!panelAvailable && row.status==='unverified'){row.status='blocked';row.explanation='Панель ще не зареєстрована власником. Спочатку відкрийте його стандартний розділ налаштувань. #73';}});
            if(rows.length===before && (folders || []).some(function(f){return f.id===component;}))rows.push({id:component+':folder',component:component,key:'',label:title,owner:'Штатна панель або інтеграція',category:category(component,''),route:'folder',status:'unverified',issue:73,explanation:'Не перевірено: спеціальний маршрут відкривається оригінальною кнопкою Lampa.'});
        });
        var counts = {};
        rows.forEach(function(row){counts[row.id]=(counts[row.id] || 0)+1;});
        rows.forEach(function(row,index){row.instanceId=row.id+'@'+(row.registration || 'folder')+':'+(row.ordinal===undefined?index:row.ordinal);row.identityVerified=!!row.key && counts[row.id]===1;});
        return {rows:rows, gaps:gaps, metrics:{records:rows.length, buildMs:Date.now()-started, preferenceReads:0, preferenceWrites:0, serviceProbes:0},
            select:function (group, query) {
                var q = clean(query).toLowerCase();
                return rows.filter(function (r) { return (group === 'all' || group === 'unverified' && r.status === 'unverified' || group === 'problems' && ['broken','partial','blocked'].indexOf(r.status) !== -1 || r.category === group) && (!q || (r.label+' '+r.owner+' '+r.key).toLowerCase().indexOf(q) !== -1); });
            }};
    }
    function owns(name) { return installed && (name === ROOT || name === PAGE || active); }
    function destroy() { if(teardown){var cleanup=teardown;teardown=null;cleanup();}installed=false;active=false;openPrimary=null;consumeNativeMainBypass=null; }
    var openPrimary = null, consumeNativeMainBypass = null;
    function install(L, $, doc) {
        if (installed || !L || !$ || !L.Template || !L.SettingsApi || !L.SettingsApi.allParams || !L.SettingsApi.allComponents || !L.SettingsApi.removeParams || !L.SettingsApi.removeComponent || !L.Settings || !L.Settings.main || !L.Settings.listener || !L.Settings.listener.remove) return false;
        installed = true;
        var registry, group = 'all', query = '', page = 0, returning = false, focusId = '', rootFocus = '', limit = 24, nativeMainBypass = false;
        var metrics = {opens:0, builds:0, renderedRows:0, maxRenderedRows:0, listeners:2, timers:0, observers:0};
        function openNativeMain() {
            nativeMainBypass=true;
            try { L.Controller.toggle('settings'); }
            finally { nativeMainBypass=false; }
        }
        consumeNativeMainBypass = function () {
            if(!nativeMainBypass)return false;
            nativeMainBypass=false;
            return true;
        };
        function folders() {
            return L.Settings.main().render().find('.settings-folder[data-component]').toArray().filter(function (n) { return n.getAttribute('data-component') !== ROOT && n.style.display !== 'none' && !n.classList.contains('hide') && !n.classList.contains('hidden'); });
        }
        function rebuild() {
            registry=createRegistry(L,folders().map(function(n){return {id:n.getAttribute('data-component')};}));metrics.builds++;
        }
        function focus(key) {
            var body=L.Settings.render().find('.settings__body'), target=body.find('[data-name]').filter(function(){return this.getAttribute('data-name')===key;}).first();
            if(target.length){L.Controller.collectionFocus(target[0],body);target.trigger('hover:focus');}
        }
        function leave(skipBack) {
            var enabled=L.Controller.enabled();
            if(!skipBack && !returning && enabled.name==='settings_component' && enabled.controller && enabled.controller.back) {
                returning=true;try{enabled.controller.back();}finally{returning=false;}
            }
            L.Settings.main().render().detach();
        }
        function nativePage(name, back, skipBack) { leave(skipBack); active=true; L.Settings.create(name,{onBack:function(){if(!returning){returning=true;try{back();}finally{returning=false;}}}}); }
        function button(component, key, label, description, action) {
            L.SettingsApi.addParam({component:component,param:{name:key,type:'button'},field:{name:clean(label),description:clean(description)},onRender:function(item){item.on('hover:enter.settingsHub',action);}});
        }
        function mark() {
            doc.body.classList.add('settings-hub-active');
            var root=L.Settings.render()[0];root.setAttribute('data-settings-hub-version','73-preview-1');
            root.setAttribute('data-settings-hub-metrics',JSON.stringify(metrics));
        }
        function openRoot(fromNativeMain) { nativePage(ROOT,function(){active=false;doc.body.classList.remove('settings-hub-active');openNativeMain();},fromNativeMain); if(rootFocus)focus(rootFocus); }
        openPrimary = function () {
            if (!installed || active) return false;
            try { openRoot(true); return active; }
            catch (error) {
                active=false;doc.body.classList.remove('settings-hub-active');
                try { openNativeMain(); } catch (fallbackError) { /* Native main is the best available fallback. */ }
                return false;
            }
        };
        function openOwner(row) {
            if(row.status==='broken'){L.Noty.show(row.explanation);return;}
            if(row.component==='omdb_config_ui' && !(L.AverageRating && L.AverageRating.settingsPrivacyVersion>=1)){L.Noty.show('Спершу оновіть плагін рейтингів: стара панель може показати приватні ключі. #73');return;}
            if(row.route==='folder'){
                var original=folders().filter(function(n){return n.getAttribute('data-component')===row.component;})[0];
                if(original){leave();active=false;doc.body.classList.remove('settings-hub-active');$(original).trigger('hover:enter');}
                return;
            }
            if(row.panelAvailable===false){L.Noty.show(row.explanation);return;}
            focusId=row.instanceId;nativePage(row.component,showList);
            var body=L.Settings.render().find('.settings__body'),nodes=body.find('.settings-param.selector'),exact=nodes.filter(function(){return row.key && this.getAttribute('data-name')===row.key;});
            if(!exact.length)exact=nodes.filter(function(){return $(this).find('.settings-param__name').text().trim()===row.label;});
            if(exact.length===1){L.Controller.collectionFocus(exact[0],body);exact.trigger('hover:focus');}
        }
        function showList() {
            if(!registry)rebuild();
            var filtered=registry.select(group,query),total=Math.ceil(filtered.length/limit);
            page=Math.max(0,Math.min(page,Math.max(0,total-1)));L.SettingsApi.removeParams(PAGE);
            button(PAGE,'hub_back','До категорій','Повернутися до Центру налаштувань',openRoot);
            button(PAGE,'hub_search','Пошук налаштувань',query || 'Назва, плагін або ключ параметра',function(){L.Input.edit({title:'Пошук налаштувань',value:query,free:true,nosave:true},function(value){query=clean(value);page=0;showList();});});
            filtered.slice(page*limit,(page+1)*limit).forEach(function(row,index){
                button(PAGE,'hub_item_'+index,row.label,row.owner+' · '+row.explanation,function(){openOwner(row);});
            });
            if(!filtered.length)button(PAGE,'hub_empty',group==='problems'?'Підтверджених проблем у цьому реєстрі немає':'Параметрів не знайдено','Це не означає, що неперевірені параметри працюють.',function(){});
            if(page>0)button(PAGE,'hub_previous','Попередня сторінка',(page+1)+' / '+total,function(){page--;focusId='';showList();focus('hub_previous');});
            if(page+1<total)button(PAGE,'hub_next','Наступна сторінка',(page+1)+' / '+total,function(){page++;focusId='';showList();focus('hub_next');});
            metrics.renderedRows=Math.min(limit,filtered.length-page*limit);metrics.maxRenderedRows=Math.max(metrics.maxRenderedRows,metrics.renderedRows);
            nativePage(PAGE,openRoot);
            var index=filtered.slice(page*limit,(page+1)*limit).map(function(r){return r.instanceId;}).indexOf(focusId);if(index>=0)focus('hub_item_'+index);
        }
        function choose(id) { rootFocus='hub_category_'+id;group=id;page=0;query='';focusId='';rebuild();showList(); }
        L.SettingsApi.addComponent({component:ROOT,name:'Центр налаштувань',icon:'<span aria-hidden="true">⚙</span>'});
        // Native template/params route only: no second top-level folder.
        L.Template.add('settings_'+PAGE,'<div></div>');
        categories.forEach(function(c){button(ROOT,'hub_category_'+c[0],c[1],'Чинні параметри та панелі їхніх плагінів',function(){choose(c[0]);});});
        button(ROOT,'hub_problems','Проблемні налаштування','Лише підтверджені помилки й обмеження; неперевірені — окремо.',function(){choose('problems');});
        button(ROOT,'hub_unverified','Не перевірено','Параметри без підтвердження ефекту та збереження.',function(){choose('unverified');});
        button(ROOT,'hub_all','Усі налаштування та пошук','Оригінальні обробники й значення збережено.',function(){choose('all');});
        button(ROOT,'hub_native','Стандартні налаштування','Повернутися до штатного інтерфейсу Lampa.',function(){leave();active=false;doc.body.classList.remove('settings-hub-active');openNativeMain();});
        // No stylesheet, theme bootstrap or visual controller: those belong to #79.
        function onOpen(e){
            if(e.name===ROOT){active=true;metrics.opens++;rebuild();mark();}
            else if(e.name===PAGE || active && e.name!=='main')mark();
            else if(e.name==='main'){active=false;doc.body.classList.remove('settings-hub-active');}
        }
        function onClose(){active=false;registry=null;doc.body.classList.remove('settings-hub-active');}
        L.Settings.listener.follow('open',onOpen);
        L.Settings.listener.follow('close',onClose);
        teardown=function(){
            L.Settings.listener.remove('open',onOpen);L.Settings.listener.remove('close',onClose);
            if(active){leave();active=false;doc.body.classList.remove('settings-hub-active');openNativeMain();}
            L.SettingsApi.removeComponent(ROOT);L.SettingsApi.removeParams(PAGE);
            L.Settings.main().render().find('[data-component="'+ROOT+'"]').remove();
            registry=null;
            openPrimary=null;
            consumeNativeMainBypass=null;
        };
        return true;
    }
    return {contractVersion:1,categories:categories,category:category,fields:fields,createRegistry:createRegistry,owns:owns,openPrimary:function(){return openPrimary ? openPrimary() : false;},consumeNativeMainBypass:function(){return consumeNativeMainBypass ? consumeNativeMainBypass() : false;},install:install,destroy:destroy};
});
