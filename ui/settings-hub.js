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
        trakt:'trakt/trakt.js', trakt_plus:'trakt/trakt-plus.js', home_history:'plugins-to-enable/home-policy.js',
        torrents_cinema:'torrents-redesign.js', screensaver_plus:'ui/screensaver-plus.js',
        omdb_config_ui:'media/average-rating.js', omdb_ratings_select:'media/average-rating.js',
        ytranslate:'localization/translate.js', menu_filter:'ui/menu-hide.js'};
    var visiblePreferences = {
        ydesign_row_continue:1, ydesign_row_week:1, ydesign_theme:1, ydesign_grid_items_v:1,
        ydesign_focus_fx:1, ydesign_style:1, ydesign_v_show_ua:1, ydesign_v_show_age:1,
        ydesign_v_show_genres:1, ydesign_v_show_slogan:1, ydesign_v_show_year:1,
        ydesign_v_show_seasons:1, ydesign_v_show_add_title:1
    };
    function hasVisiblePreference(key) { return !!visiblePreferences[key] || /^ydesign_v_(title_size|add_title_size|slogan_size|badge_size|year_size|age_size|seasons_size|ua_size|genres_size|rating_size|cards|align_logo|align_add_title|align_badges|align_slogan)$/.test(key); }
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
                // Only expose a fixed allowlist of non-sensitive presentation preferences in Hub summaries.
                if(origin==='SettingsApi' && hasVisiblePreference(key))row.visiblePreference={type:p.type,defaultValue:p.default,values:p.values};
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
                add({key:p.name,type:p.type,label:clean((def.field || {}).name),default:p.default,values:p.values,backLoop:component==='addCategory' && p.name==='ncInfo' && /controller\.back\s*=/.test(code) && /Settings\.create\(['"]ncInfo['"]\)/.test(code)},i,'SettingsApi');
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
                return rows.filter(function (r) { return (group === 'all' || group === 'unverified' && r.status === 'unverified' || group === 'problems' && ['broken','partial','blocked'].indexOf(r.status) !== -1 || r.category === group) && (!q || (r.label+' '+r.owner+' '+r.component+' '+r.key).toLowerCase().indexOf(q) !== -1); });
            }};
    }
    function owns(name) { return installed && (name === ROOT || name === PAGE || active); }
    function destroy() { if(teardown){var cleanup=teardown;teardown=null;cleanup();}installed=false;active=false;openPrimary=null;consumeNativeMainBypass=null; }
    var openPrimary = null, consumeNativeMainBypass = null;
    function install(L, $, doc) {
        if (installed || !L || !$ || !L.Template || !L.SettingsApi || !L.SettingsApi.allParams || !L.SettingsApi.allComponents || !L.SettingsApi.removeParams || !L.SettingsApi.removeComponent || !L.Settings || !L.Settings.main || !L.Settings.listener || !L.Settings.listener.remove) return false;
        installed = true;
        var registry, group = 'all', query = '', page = 0, returning = false, focusId = '', rootFocus = '', headingIndices={}, limit = 24, nativeMainBypass = false;
        var metrics = {opens:0, builds:0, renderedRows:0, maxRenderedRows:0, listeners:2, timers:0, observers:0};
        function openNativeMain() {
            restoreConsolidatedFolders();
            nativeMainBypass=true;
            try { L.Controller.toggle('settings'); }
            finally { nativeMainBypass=false; }
        }
        function recoverNative(message) {
            active=false;restoreConsolidatedFolders();doc.body.classList.remove('settings-hub-active');
            try { openNativeMain(); } catch (error) { /* Leave the native Settings controller as the available fallback. */ }
            if(message && L.Noty && L.Noty.show)L.Noty.show(message);
        }
        consumeNativeMainBypass = function () {
            if(!nativeMainBypass)return false;
            nativeMainBypass=false;
            return true;
        };
        var consolidatedFolders=[];
        function allFolders() {
            return L.Settings.main().render().find('.settings-folder[data-component]').toArray().filter(function (n) { return n.getAttribute('data-component') !== ROOT; });
        }
        function isConsolidated(node) { return consolidatedFolders.some(function (entry) { return entry.node===node; }); }
        function folders() {
            return allFolders().filter(function (n) { return isConsolidated(n) || n.style.display !== 'none' && !n.classList.contains('hide') && !n.classList.contains('hidden'); });
        }
        function restoreConsolidatedFolders() {
            consolidatedFolders.forEach(function(entry){if(entry.node.getAttribute('data-settings-hub-consolidated')==='true')entry.node.removeAttribute('data-settings-hub-consolidated');});
            consolidatedFolders=[];
        }
        function consolidateFolders() {
            if(!active || !registry)return;
            allFolders().forEach(function(node){
                var component=node.getAttribute('data-component');
                if(isConsolidated(node) || node.getAttribute('data-settings-hub-consolidated')!==null || !(owners[component] || /^ydesign_/.test(component)))return;
                if(node.style.display==='none' || node.classList.contains('hide') || node.classList.contains('hidden'))return;
                var rows=registry.rows.filter(function(row){return row.component===component;});
                var ownerParams=L.SettingsApi.allParams()[component]||[],registered=!!L.SettingsApi.allComponents()[component] || ownerParams.length>0;
                var directRoute=registered && rows.length>0 && rows.every(function(row){return row.route!=='folder' && row.panelAvailable!==false && row.status!=='broken' && row.status!=='blocked';});
                if(directRoute){node.setAttribute('data-settings-hub-consolidated','true');consolidatedFolders.push({node:node});}
            });
        }
        function rebuild() {
            registry=createRegistry(L,folders().map(function(n){return {id:n.getAttribute('data-component')};}));metrics.builds++;
            if(active)consolidateFolders();
        }
        function uniqueRows(rows) {
            var result=[],byId={},rank={unverified:1,partial:2,blocked:3,broken:4};
            rows.forEach(function(row){
                var id=row.key?row.component+':'+row.key:row.instanceId,existing=byId[id];
                if(!existing){var copy={};Object.keys(row).forEach(function(key){copy[key]=row[key];});copy.duplicateRegistrations=1;byId[id]=copy;result.push(copy);return;}
                existing.duplicateRegistrations++;
                if((rank[row.status]||0)>(rank[existing.status]||0) || row.status===existing.status && row.registration==='SettingsApi') {
                    var count=existing.duplicateRegistrations;Object.keys(existing).forEach(function(key){delete existing[key];});Object.keys(row).forEach(function(key){existing[key]=row[key];});existing.duplicateRegistrations=count;
                }
            });
            return result;
        }
        function selectedRows(groupId,term) { return uniqueRows(registry.select(groupId,term)); }
        var categoryDescriptions = {
            profiles:'Профілі та облікові записи', home:'Рекомендації й порядок рядків головної',
            appearance:'Тема, картки, бейджі та фокус', playback:'Плеєр, субтитри й відтворення',
            torrents:'Джерела та пошук торентів', trakt:'Синхронізація й обліковий запис Trakt',
            language:'Мова та доступність контенту', screensaver:'Заставка та сповіщення',
            plugins:'Підключені розширення', system:'Діагностика та системні опції'
        };
        function optionCount(count) {
            var tail=count%100,unit=count%10;
            return count+' '+(unit===1 && tail!==11?'опція':unit>=2 && unit<=4 && (tail<12 || tail>14)?'опції':'опцій');
        }
        function categoryTitle(id) { var entry=categories.filter(function(item){return item[0]===id;})[0];return entry?entry[1]:'Інші налаштування'; }
        function statusTitle(row) {
            if(row.status==='broken')return 'Підтверджена помилка';
            if(row.status==='blocked' || row.panelAvailable===false)return 'Потрібна інтеграція';
            if(row.status==='partial')return 'Часткова підтримка';
            if(row.status==='unsupported')return 'Не підтримується';
            return 'Власник доступний · ефект не перевірено';
        }
        function statusClass(row) {
            if(row.status==='broken')return 'settings-hub-status-broken';
            if(row.status==='blocked' || row.panelAvailable===false)return 'settings-hub-status-unavailable';
            if(row.status==='partial')return 'settings-hub-status-partial';
            return 'settings-hub-status-unverified';
        }
        function currentSummary(row) {
            if(row.component==='home_history' && (row.key==='home_history_edit_order' || row.key==='home_history_reset_order')) {
                try {
                    var history=typeof window!=='undefined' && window.LampaHomeHistory;
                    var policy=history && typeof history.policy==='function' && history.policy();
                    if(policy && typeof policy.hasCustomOrder==='function')return 'Порядок рядків: '+(policy.hasCustomOrder()?'налаштовано':'типовий');
                } catch (e) { /* Keep the native owner as the only source of saved Home order state. */ }
            }
            if(!row.visiblePreference || !L.Storage || typeof L.Storage.get!=='function')return '';
            try {
                var value=L.Storage.get(row.key);
                if(value===undefined || value===null || value==='' || value==='undefined')value=row.visiblePreference.defaultValue;
                if(value===undefined)return '';
                if(row.visiblePreference.type==='trigger') {
                    var enabled=value===true || value===1 || value==='1' || value==='true';
                    return 'Зараз: '+(enabled?'увімкнено':'вимкнено');
                }
                var options=row.visiblePreference.values;
                if(options && Object.prototype.hasOwnProperty.call(options,String(value)))value=options[String(value)];
                else if(options)return 'Зараз: невідоме значення';
                return 'Зараз: '+clean(String(value));
            } catch (e) { return ''; }
        }
        function editSearch() {
            L.Input.edit({title:'Пошук налаштувань',value:query,free:true,nosave:true},function(value){query=clean(value);group='all';page=0;focusId='';showList();});
        }
        function renderRoot() {
            L.SettingsApi.removeParams(ROOT);
            headingIndices[ROOT]=0;
            heading(ROOT,'Налаштування','settings-hub-section-heading');
            heading(ROOT,'Розділи','settings-hub-section-kicker');
            categories.forEach(function(c){
                var count=uniqueRows(registry.rows.filter(function(row){return row.category===c[0] && row.panelAvailable!==false && row.status!=='broken' && row.status!=='blocked';})).length;
                var available=count?categoryDescriptions[c[0]]+' · '+optionCount(count):'Інтеграцію не підключено';
                var key='hub_category_'+c[0],selected=key===rootFocus;
                button(ROOT,key,c[1],available,function(){choose(c[0]);},'settings-hub-category settings-hub-category-'+c[0]+(selected?' settings-hub-category-selected':''));
            });
            heading(ROOT,'Інструменти','settings-hub-section-kicker');
            button(ROOT,'hub_search','Пошук налаштувань',query?'Змінити пошуковий запит':'За назвою, плагіном або ключем',function(){rootFocus='hub_search';editSearch();},'settings-hub-action');
            if(selectedRows('problems','').length)button(ROOT,'hub_problems','Проблемні налаштування','Підтверджені проблеми й обмеження',function(){choose('problems','hub_problems');},'settings-hub-action');
            if(selectedRows('unverified','').length)button(ROOT,'hub_unverified','Не перевірено','Параметри без підтвердження ефекту',function(){choose('unverified','hub_unverified');},'settings-hub-action');
            button(ROOT,'hub_all','Усі налаштування','Повний список зареєстрованих власників',function(){choose('all','hub_all');},'settings-hub-action');
            button(ROOT,'hub_native','Стандартні налаштування','Відкрити повне меню Lampa',function(){leave();active=false;doc.body.classList.remove('settings-hub-active');openNativeMain();},'settings-hub-action settings-hub-native');
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
        function nativePage(name, back, skipBack) { leave(skipBack); active=true; if(name===ROOT){rebuild();consolidateFolders();renderRoot();} L.Settings.create(name,{onBack:function(){if(!returning){returning=true;try{back();}finally{returning=false;}}}}); }
        function heading(component,label,className) {
            var name='hub_heading_'+component+'_'+(headingIndices[component]=(headingIndices[component]||0)+1);
            L.SettingsApi.addParam({component:component,param:{name:name,type:'title'},field:{name:clean(label)},onRender:function(item){if(className && typeof item.addClass==='function')item.addClass(className);}});
        }
        function button(component, key, label, description, action, className) {
            L.SettingsApi.addParam({component:component,param:{name:key,type:'button'},field:{name:clean(label),description:clean(description)},onRender:function(item){if(className && typeof item.addClass==='function')item.addClass(className);item.on('hover:enter.settingsHub',action);}});
        }
        function mark(view) {
            doc.body.classList.add('settings-hub-active');
            var root=L.Settings.render()[0];root.setAttribute('data-settings-hub-version','73-preview-1');
            root.setAttribute('data-settings-hub-view',view||'owner');
            root.setAttribute('data-settings-hub-selected',group);
            root.setAttribute('data-settings-hub-metrics',JSON.stringify(metrics));
        }
        function openRoot(fromNativeMain) { nativePage(ROOT,function(){active=false;doc.body.classList.remove('settings-hub-active');openNativeMain();},fromNativeMain); if(rootFocus)focus(rootFocus); }
        openPrimary = function () {
            if (!installed || active) return false;
            try { openRoot(true); return active; }
            catch (error) {
                recoverNative('Не вдалося відкрити Центр налаштувань. Відкрийте потрібний розділ у стандартних налаштуваннях.');
                return false;
            }
        };
        function openOwner(row) {
            if(row.status==='broken'){L.Noty.show(row.explanation);return;}
            if(row.component==='omdb_config_ui' && !(L.AverageRating && L.AverageRating.settingsPrivacyVersion>=1)){L.Noty.show('Спершу оновіть плагін рейтингів: стара панель може показати приватні ключі. #73');return;}
            if(row.route==='folder'){
                var original=allFolders().filter(function(n){return n.getAttribute('data-component')===row.component;})[0];
                if(original){leave();active=false;restoreConsolidatedFolders();doc.body.classList.remove('settings-hub-active');$(original).trigger('hover:enter');}
                return;
            }
            if(row.panelAvailable===false){L.Noty.show(row.explanation);return;}
            try {
                focusId=row.instanceId;nativePage(row.component,showList);
                var body=L.Settings.render().find('.settings__body'),nodes=body.find('.settings-param.selector'),exact=nodes.filter(function(){return row.key && this.getAttribute('data-name')===row.key;});
                if(!exact.length)exact=nodes.filter(function(){return $(this).find('.settings-param__name').text().trim()===row.label;});
                if(exact.length===1){L.Controller.collectionFocus(exact[0],body);exact.trigger('hover:focus');}
            } catch (error) { recoverNative('Не вдалося відкрити панель власника. Скористайтеся стандартними налаштуваннями.'); }
        }
        function showList() {
            if(!registry)rebuild();
            var filtered=selectedRows(group,query),total=Math.ceil(filtered.length/limit);
            page=Math.max(0,Math.min(page,Math.max(0,total-1)));L.SettingsApi.removeParams(PAGE);
            headingIndices[PAGE]=0;
            var title=query?'Результати пошуку':group==='all'?'Усі налаштування':group==='problems'?'Проблемні налаштування':group==='unverified'?'Не перевірено':categoryTitle(group);
            heading(PAGE,title,'settings-hub-page-heading');
            button(PAGE,'hub_back','Назад до розділів','Повернутися до категорій',openRoot,'settings-hub-action');
            button(PAGE,'hub_search','Пошук налаштувань',query?'Змінити пошуковий запит':'За назвою, плагіном або ключем',editSearch,'settings-hub-action');
            filtered.slice(page*limit,(page+1)*limit).forEach(function(row,index){
                var value=currentSummary(row),context=(value?value+' · ':'')+categoryTitle(row.category)+' · '+row.owner+' · '+statusTitle(row)+(row.duplicateRegistrations>1?' · '+row.duplicateRegistrations+' реєстрації':'')+(['broken','partial','blocked'].indexOf(row.status)!==-1?' · '+row.explanation:'');
                button(PAGE,'hub_item_'+index,row.label,context,function(){openOwner(row);},'settings-hub-setting '+statusClass(row)+(value?' settings-hub-has-value':''));
            });
            if(!filtered.length) {
                var emptyCategory=!query && group!=='all' && group!=='unverified' && group!=='problems';
                button(PAGE,'hub_empty',query?'За цим запитом нічого не знайдено':group==='problems'?'Підтверджених проблем не знайдено':'У цій категорії немає зареєстрованих опцій',emptyCategory?'Необхідний власник може бути вимкнений або не встановлений. Усі штатні розділи залишаються доступними в стандартних налаштуваннях.':'Змініть запит або поверніться до категорій. Поточні значення й приватні дані не шукаються.',function(){});
                if(emptyCategory)button(PAGE,'hub_empty_native','Відкрити стандартні налаштування','Показати всі штатні та сторонні розділи Lampa.',function(){leave();active=false;restoreConsolidatedFolders();doc.body.classList.remove('settings-hub-active');openNativeMain();});
            }
            if(page>0)button(PAGE,'hub_previous','Попередня сторінка',(page+1)+' / '+total,function(){page--;focusId='';showList();focus('hub_previous');});
            if(page+1<total)button(PAGE,'hub_next','Наступна сторінка',(page+1)+' / '+total,function(){page++;focusId='';showList();focus('hub_next');});
            metrics.renderedRows=Math.min(limit,filtered.length-page*limit);metrics.maxRenderedRows=Math.max(metrics.maxRenderedRows,metrics.renderedRows);
            nativePage(PAGE,openRoot);
            var index=filtered.slice(page*limit,(page+1)*limit).map(function(r){return r.instanceId;}).indexOf(focusId);if(index>=0)focus('hub_item_'+index);
        }
        function choose(id,focusKey) { rootFocus=focusKey||'hub_category_'+id;group=id;page=0;query='';focusId='';rebuild();showList(); }
        L.SettingsApi.addComponent({component:ROOT,name:'Центр налаштувань',icon:'<span aria-hidden="true">⚙</span>'});
        // Native template/params route only: no second top-level folder.
        L.Template.add('settings_'+PAGE,'<div></div>');
        rebuild();renderRoot();
        // No stylesheet, theme bootstrap or visual controller: those belong to #79.
        function onOpen(e){
            if(e.name===ROOT){active=true;metrics.opens++;rebuild();mark('landing');}
            else if(e.name===PAGE)mark(query?'search':group);
            else if(active && e.name!=='main')mark('owner');
            else if(e.name==='main'){active=false;restoreConsolidatedFolders();doc.body.classList.remove('settings-hub-active');}
        }
        function onClose(){active=false;restoreConsolidatedFolders();registry=null;doc.body.classList.remove('settings-hub-active');}
        L.Settings.listener.follow('open',onOpen);
        L.Settings.listener.follow('close',onClose);
        teardown=function(){
            L.Settings.listener.remove('open',onOpen);L.Settings.listener.remove('close',onClose);
            if(active){leave();active=false;restoreConsolidatedFolders();doc.body.classList.remove('settings-hub-active');openNativeMain();}
            else restoreConsolidatedFolders();
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
