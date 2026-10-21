(function(){
'use strict';

var STORAGE_PARSERS='ps_list_combo_v0.9',
    STORAGE_PRI_ACT='bat_url_two',
    STORAGE_SEC_ACT='ps_active_sec_v0.9',
    NO_PARSER='no_parser',
    PROXY_PREFIX='https://parserbridge.lampame.v6.rocks/',
    STORAGE_RAW_PRI='bat_raw_primary_url_v1',
    STORAGE_RAW_SEC='bat_raw_secondary_url_v1',
    STORAGE_RAW_PROW='bat_raw_prowlarr_url_v1',
    STORAGE_PROTOS='bat_work_protos_v1';

var DEFAULT_PARSERS=[
    {base:'lampa_ua',shortName:'LampaUA Jackett',name:'LampaUA Jackett (toloka, mazepa, etc.)',url:'https://jackettua.mooo.com',displayUrl:'https://jackettua.mooo.com',settings:{key:'ua',parser_torrent_type:'jackett'}},
    {base:'lampa_ua_2',shortName:'LampaUA',name:'LampaUA (toloka, mazepa, etc.)',url:'lampaua.mooo.com',displayUrl:'lampaua.mooo.com',settings:{key:'1',parser_torrent_type:'jackett'}},
    {base:'spawnum_duckdns_org_49117',shortName:'Spawn (1)',name:'SpawnUA (toloka, mazepa only)',url:'http://spawnum.duckdns.org:49117',displayUrl:'http://spawnum.duckdns.org:49117',settings:{key:'2',parser_torrent_type:'jackett'}},
    {base:'spawnum_duckdns_org_59117',shortName:'Spawn (2)',name:'SpawnUA (toloka, mazepa, etc.)',url:'http://spawnum.duckdns.org:59117',displayUrl:'http://spawnum.duckdns.org:59117',settings:{key:'2',parser_torrent_type:'jackett'}},
    {base:'jac_red',shortName:'Jac.red',name:'Jac.red',url:'Jac.red',displayUrl:'Jac.red',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'jacred_pro',shortName:'Jacred.pro',name:'Jacred.pro',url:'jacred.pro',displayUrl:'jacred.pro',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'jac_black',shortName:'Jac.black',name:'Jac.black',url:'jac.black',displayUrl:'jac.black',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'jac_red_ru',shortName:'Jac-red.ru',name:'Jac-red.ru',url:'jac-red.ru',displayUrl:'jac-red.ru',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'jac_stull',shortName:'Jac.Stull',name:'Jac.stull',url:'jac.stull.xyz',displayUrl:'jac.stull.xyz',settings:{key:'1',parser_torrent_type:'jackett'}},
    {base:'jr_maxvol',shortName:'Jr.Maxvol',name:'Jr.Maxvol.pro',url:'jr.maxvol.pro',displayUrl:'jr.maxvol.pro',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'maxvol_pro',shortName:'Jac.Maxvol',name:'Jac.Maxvol.pro',url:'jac.maxvol.pro',displayUrl:'jac.maxvol.pro',settings:{key:'1',parser_torrent_type:'jackett'}},
    {base:'no_name',shortName:'NoName',name:'NoName',url:'http://87.120.84.218:9117',displayUrl:'http://87.120.84.218:9117',settings:{key:'333',parser_torrent_type:'jackett'}},
    {base:'407_xyz',shortName:'407-Xyz',name:'407-Xyz',url:'12.307407.xyz',displayUrl:'12.307407.xyz',settings:{key:'12307407',parser_torrent_type:'jackett'}},
    {base:'alco1',shortName:'alcoV1',name:'Alpac v1',url:'https://alpacv1filt.pubgpityx.workers.dev/',displayUrl:'https://alpacv1filt.pubgpityx.workers.dev/',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'alco2',shortName:'alcoV2',name:'Alpac v2',url:'https://tv.alcopa.cc/api/v2.0/indexers/all/results?title=',displayUrl:'https://tv.alcopa.cc',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'nmjc',shortName:'nmjc',name:'NMJC',url:'nmjc.duckdns.org',displayUrl:'nmjc.duckdns.org',settings:{key:'',parser_torrent_type:'jackett'}},
    {base:'lampaapp',shortName:'lampaapp',name:'LampaApp',url:'lampa.app',displayUrl:'lampa.app',settings:{key:'1',parser_torrent_type:'jackett'}}    
];

/* ============================================================
   WORKING PROTOCOL CONTROLLER
   ============================================================ */
function getWorkingProto(base){
    return Lampa.Storage.get(STORAGE_PROTOS, {})[base] || '';
}

function setWorkingProto(base, proto){
    if(!base || !proto) return;
    var p = Lampa.Storage.get(STORAGE_PROTOS, {});
    p[base] = proto;
    Lampa.Storage.set(STORAGE_PROTOS, p);
}

function clearWorkingProto(base){
    if(!base) return;
    var p = Lampa.Storage.get(STORAGE_PROTOS, {});
    if(p[base]){
        delete p[base];
        Lampa.Storage.set(STORAGE_PROTOS, p);
    }
}

function clearAllWorkingProtos(){
    Lampa.Storage.set(STORAGE_PROTOS, {});
}

/* ============================================================
   URL PIPELINE RESOLVER
   ============================================================ */
function getProto(){ return window.location.protocol==='https:'?'https://':'http://'; }
function stripProxy(url){ return url ? String(url).replace(PROXY_PREFIX,'').trim() : ''; }
function normalizeUrl(url){ return stripProxy(url||'').replace(/^https?:\/\//i,'').replace(/\/$/,'').trim().toLowerCase(); }

function extractBareUrl(url){
    return stripProxy(url||'').trim().replace(/^https?:\/\//i,'');
}
function extractExplicitProto(url){
    var m = stripProxy(url||'').trim().match(/^(https?:\/\/)/i);
    return m ? m[1].toLowerCase() : '';
}

function resolveBaseUrl(parser){
    if(!parser) return '';
    var raw = stripProxy(parser.url || '').trim();
    var bare = extractBareUrl(raw);
    
    var savedProto = getWorkingProto(parser.base);
    if(savedProto) return savedProto + bare;
    
    var explicitProto = extractExplicitProto(raw);
    if(explicitProto) return explicitProto + bare;
    
    return getProto() + bare;
}

function applyProxyToResolved(resolvedUrl, targetType){
    if(!resolvedUrl) return '';
    var isEnabled = Lampa.Storage.get('parser_use_proxy', false);
    isEnabled = (isEnabled === true || isEnabled === 'true');
    var currentTarget = Lampa.Storage.get('parser_proxy_target', 'both');

    if (isEnabled && (currentTarget === 'both' || currentTarget === targetType)) {
        return PROXY_PREFIX + resolvedUrl;
    }
    return resolvedUrl;
}

function getFinalParserUrl(parser, targetType){
    return applyProxyToResolved(resolveBaseUrl(parser), targetType);
}

/* ============================================================
   PARSERS STORAGE
   ============================================================ */
function getParsers(){
    var s=Lampa.Storage.get(STORAGE_PARSERS,false);
    if(typeof s==='string'){ try{ s=JSON.parse(s); }catch(e){} }
    return s&&Array.isArray(s)&&s.length ? s : JSON.parse(JSON.stringify(DEFAULT_PARSERS));
}
function saveParsers(list){ Lampa.Storage.set(STORAGE_PARSERS,list); }
function getSelectedBase(){ return Lampa.Storage.get(STORAGE_PRI_ACT,NO_PARSER); }
function getParserByBase(base){
    var list=getParsers();
    for(var i=0;i<list.length;i++){ if(list[i].base===base) return list[i]; }
    return null;
}
function setRawUrl(key,url){ Lampa.Storage.set(key,stripProxy(url||'')); }

/* ============================================================
   SETTINGS UI & LAMPA SYNC
   ============================================================ */
function updateStandardFieldsUI(){
    setTimeout(function(){
        var pri=getParserByBase(getSelectedBase());
        var secList=getParsers();
        var secIdx=parseInt(Lampa.Storage.get(STORAGE_SEC_ACT,'-1'),10);
        var sec= (!isNaN(secIdx) && secIdx>=0 && secIdx<secList.length) ? secList[secIdx] : null;

        var j1 = pri ? getFinalParserUrl(pri, 'primary') : ''; 
        var p1 = (pri && pri.settings && pri.settings.parser_torrent_type === 'prowlarr') ? j1 : '';
        var j2 = sec ? getFinalParserUrl(sec, 'secondary') : '';

        $('div[data-name="jackett_url"] .settings-param__value').text(j1);
        $('div[data-name="jackett_url_two"] .settings-param__value').text(j2);
        $('div[data-name="prowlarr_url"] .settings-param__value').text(p1);
    },50);
}

function refreshExistingUrls(){
    applySelectedParser(getSelectedBase());
    var secIdx = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT, '-1'), 10);
    applySecondaryParser(isNaN(secIdx) ? -1 : secIdx);
    updateStandardFieldsUI();
}

/* ============================================================
   LANGUAGE
   ============================================================ */
function translate(){
    Lampa.Lang.add({
        bat_parser: { en:'Parsers catalog', uk:'Каталог парсерів', zh:'解析器目录' },
        bat_parser_description: { en:'Click to select a parser from', uk:'Натисніть для вибору парсера з', zh:'点击从目录中选择解析器' },
        bat_parser_current: { en:'Current selection:', uk:'Поточний вибір:', zh:'当前选择：' },
        bat_parser_none: { en:'Not selected', uk:'Не вибрано', zh:'未选择' },
        bat_parser_selected_label: { en:'Selected:', uk:'Обрано:', zh:'已选择：' },
        bat_check_parsers: { en:'Check parsers', uk:'Перевірити парсери', zh:'检查解析器' },
        bat_check_search: { en:'Check search', uk:'Перевірити пошук', zh:'检查搜索' },
        bat_update_merge: { en:'Update (keep custom)', uk:'Оновити (зберегти власні)', zh:'更新（保留自定义）' },
        bat_update_reset: { en:'Reset to default', uk:'Скинути до стандартних', zh:'重置为默认' },
        bat_check_done: { en:'Check completed', uk:'Готово', zh:'完成' },
        bat_status_checking_server: { en:'Checking server…', uk:'Перевірка сервера…', zh:'检查服务器…' },
        bat_status_server_ok: { en:'Server available', uk:'Сервер доступний', zh:'服务器可用' },
        bat_status_auth_error: { en: 'Auth error', uk: 'Помилка ключа', zh: '密钥错误' },
        bat_status_server_warn: { en:'Server responds (restrictions)', uk:'Сервер відповідає (обмеження)', zh:'服务器有响应（受限）' },
        bat_status_server_bad: { en:'Server unavailable', uk:'Сервер недоступний', zh:'服务器不可用' },
        bat_status_unknown: { en:'Unchecked', uk:'Не перевірено', zh:'未检查' },
        bat_status_checking_search: { en:'Checking search…', uk:'Перевірка пошуку…', zh:'检查搜索…' },
        bat_status_search_ok: { en:'Search works', uk:'Пошук працює', zh:'搜索可用' },
        bat_status_search_bad: { en:'Search does not work', uk:'Пошук не працює', zh:'搜索不可用' },
        bat_parser_proxy: { en:'Enable proxy', uk:'Включити проксі', zh:'启用代理' },
        bat_parser_proxy_desc: { en:'Adds a proxy before the parser URL', uk:'Додає проксі перед адресою парсера', zh:'在解析器URL前添加代理' },
        bat_parser_proxy_target: { en:'Proxy target', uk:'Для якого парсера (проксі)', zh:'代理目标' },
        bat_parser_proxy_target_desc: { en:'Select which parser will use the proxy', uk:'Оберіть, до якої адреси додавати проксі', zh:'选择使用代理的解析器' }
    });
}

/* ============================================================
   NOTIFICATIONS / MESSAGES (BELL FALLBACK)
   ============================================================ */
function showMessage(msg){
    var text = msg || Lampa.Lang.translate('bat_check_done');
    try{
        if(window.Lampa && Lampa.Bell && typeof Lampa.Bell.push === 'function'){
            Lampa.Bell.push({text: text});
            return;
        }
        if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function'){
            Lampa.Noty.show(text);
            return;
        }
        if(window.Lampa && Lampa.Toast && typeof Lampa.Toast.show === 'function'){
            Lampa.Toast.show(text);
            return;
        }
    }catch(e){}
    alert(text);
}

var COLOR_OK='#1aff00', COLOR_BAD='#ff2e36', COLOR_WARN='#f3d900', COLOR_AUTH='#ff9900', COLOR_UNKNOWN='#8c8c8c';
var cache={
    data:{}, ttlHealth:30000, ttlSearch:900000,
    get:function(k){
        var v=this.data[k];
        return v&&Date.now()<v.expiresAt ? v : null;
    },
    set:function(k,v,t){
        this.data[k]={ value:v, expiresAt:Date.now()+t };
    }
};

/* ============================================================
   SMART AUTO-SWITCHING (PARSER USE LINK)
   ============================================================ */
function updateParserUseLink() {
    var priBase = getSelectedBase();
    var secIdx = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT, '-1'), 10);
    if(isNaN(secIdx)) secIdx = -1;

    var hasPri = (priBase && priBase !== NO_PARSER);
    var hasSec = (secIdx !== -1);

    if (hasPri && hasSec) {
        Lampa.Storage.set('parser_use_link', 'both');
    } else if (!hasPri && hasSec) {
        Lampa.Storage.set('parser_use_link', 'two');
    } else {
        Lampa.Storage.set('parser_use_link', 'one');
    }
}

/* ============================================================
   APPLY PRIMARY
   ============================================================ */
function applySelectedParser(base){
    if(!base||base===NO_PARSER) {
        setRawUrl(STORAGE_RAW_PRI, '');
        setRawUrl(STORAGE_RAW_PROW, '');
        Lampa.Storage.set('jackett_url', '');
        Lampa.Storage.set('jackett_key', '');
        Lampa.Storage.set('prowlarr_url', '');
        Lampa.Storage.set('prowlarr_key', '');
        updateParserUseLink();
        updateStandardFieldsUI();
        return true; 
    }

    var p=getParserByBase(base);
    if(!p||!p.settings) return false;
    
    var type=p.settings.parser_torrent_type||'jackett',
        finalUrl = getFinalParserUrl(p, 'primary'); 

    if(type==='prowlarr'){
        setRawUrl(STORAGE_RAW_PROW, stripProxy(p.url)); 
        Lampa.Storage.set('prowlarr_url', finalUrl);
        Lampa.Storage.set('prowlarr_key', p.settings.key||'');
    }else{
        setRawUrl(STORAGE_RAW_PRI, stripProxy(p.url));
        Lampa.Storage.set('jackett_url', finalUrl);
        Lampa.Storage.set('jackett_key', p.settings.key||'');
    }
    Lampa.Storage.set('parser_torrent_type', type);
    updateParserUseLink();
    updateStandardFieldsUI();
    return true;
}

function updateSelectedLabelInSettings(){
    var p=getParserByBase(getSelectedBase()),
        name = p ? p.name : Lampa.Lang.translate('bat_parser_none');
    $('.bat-parser-selected').text(Lampa.Lang.translate('bat_parser_selected_label')+' '+name);
}

/* ============================================================
   AJAX & PROTOCOL DISCOVERY
   ============================================================ */
function ajaxTryUrls(candidates, targetType){
    return new Promise(function(resolve){
        var idx=0;
        function attempt(){
            if(idx>=candidates.length){ resolve({ok:false, networkError:true}); return; }
            
            var cand = candidates[idx++];
            var fetchUrl = applyProxyToResolved(cand, targetType);
            var candProto = extractExplicitProto(cand) || 'https://';

            $.ajax({
                url: fetchUrl, method: 'GET', timeout: 5000,
                success: function(data, textStatus, xhr){ 
                    if(xhr && xhr.status===401) resolve({ok:false, authError:true, workingProto:candProto});
                    else resolve({ok:true, data:data, workingProto:candProto}); 
                },
                error: function(xhr){
                    var status = xhr && typeof xhr.status==='number' ? xhr.status : 0;
                    if(status===200) resolve({ok:true, workingProto:candProto}); 
                    else if(status===401) resolve({ok:false, authError:true, workingProto:candProto});
                    else if(status > 0) resolve({ok:false, networkError:false, workingProto:candProto}); 
                    else attempt(); 
                }
            });
        }
        attempt();
    });
}

function getCandidatesForCheck(parser, pathSuffix){
    var bare = extractBareUrl(parser.url);
    var savedProto = getWorkingProto(parser.base);
    var explicitProto = extractExplicitProto(parser.url);
    
    var primaryProto = savedProto || explicitProto || 'https://';
    var secondaryProto = primaryProto === 'https://' ? 'http://' : 'https://';
    
    return [
        primaryProto + bare + pathSuffix,
        secondaryProto + bare + pathSuffix
    ];
}

function getProxyCacheState(){
    var isEnabled = Lampa.Storage.get('parser_use_proxy', false);
    isEnabled = (isEnabled === true || isEnabled === 'true');
    var target = Lampa.Storage.get('parser_proxy_target', 'both');
    return isEnabled ? ('proxy_on_' + target) : 'proxy_off';
}

/* ============================================================
   HEALTH CHECK
   ============================================================ */
function runHealthChecks(parsers){
    var map={};
    var proxyState = getProxyCacheState();
    
    return Promise.all(parsers.map(function(parser){
        return new Promise(function(resolve){
            var key=encodeURIComponent((parser.settings&&parser.settings.key)||''),
                type=(parser.settings&&parser.settings.parser_torrent_type)||'jackett',
                pathSuffix= type==='prowlarr' ? '/api/v1/health?apikey='+key : '/api/v2.0/indexers/status:healthy/results?apikey='+key;
            
            var candidates = getCandidatesForCheck(parser, pathSuffix);
            var cacheKey='health::'+parser.base+'::'+proxyState+'::'+candidates.join('|');
            var cached=cache.get(cacheKey);
            
            if(cached){ map[parser.base]=cached.value; resolve(); return; }

            ajaxTryUrls(candidates, 'primary').then(function(res){
                if(res.workingProto){
                    var currentSaved = getWorkingProto(parser.base);
                    if(currentSaved !== res.workingProto) setWorkingProto(parser.base, res.workingProto);
                }

                var val;
                if(res.ok) val = {color:COLOR_OK,labelKey:'bat_status_server_ok'};
                else if(res.authError) val = {color:COLOR_AUTH,labelKey:'bat_status_auth_error'};
                else if(res.networkError) val = {color:COLOR_BAD,labelKey:'bat_status_server_bad'};
                else val = {color:COLOR_WARN,labelKey:'bat_status_server_warn'};
                
                map[parser.base]=val;
                cache.set(cacheKey,val,cache.ttlHealth);
                resolve();
            });
        });
    })).then(function(){ return map; });
}

/* ============================================================
   SEARCH CHECK
   ============================================================ */
function runDeepSearchChecks(parsers){
    var map={}, SAFE_QUERIES=['1080p','bluray','x264','2022'],
        query=SAFE_QUERIES[Math.floor(Math.random()*SAFE_QUERIES.length)];
    
    var proxyState = getProxyCacheState();

    return Promise.all(parsers.map(function(parser){
        return new Promise(function(resolve){
            var key=encodeURIComponent((parser.settings&&parser.settings.key)||''),
                type=(parser.settings&&parser.settings.parser_torrent_type)||'jackett';
                
            var pathSuffix = type==='prowlarr' 
                ? '/api/v1/search?apikey='+key+'&query='+encodeURIComponent(query)
                : '/api/v2.0/indexers/all/results?apikey='+key+'&Query='+encodeURIComponent(query)+'&Category=2000';
            
            var candidates = getCandidatesForCheck(parser, pathSuffix);
            var cacheKey='search::'+parser.base+'::'+proxyState+'::'+candidates.join('|');
            var cached=cache.get(cacheKey);
            
            if(cached){ map[parser.base]=cached.value; resolve(); return; }

            ajaxTryUrls(candidates, 'primary').then(function(res){
                if(res.workingProto){
                    var currentSaved = getWorkingProto(parser.base);
                    if(currentSaved !== res.workingProto) setWorkingProto(parser.base, res.workingProto);
                }

                var val = res.ok ? {color:COLOR_OK,labelKey:'bat_status_search_ok'} : {color:COLOR_BAD,labelKey:'bat_status_search_bad'};
                map[parser.base]=val;
                cache.set(cacheKey,val,cache.ttlSearch);
                resolve();
            });
        });
    })).then(function(){ return map; });
}

/* ============================================================
   MODAL STYLE
   ============================================================ */
function injectStyleOnce(){
    if(window.__bat_parser_modal_style__) return;
    window.__bat_parser_modal_style__=true;
    var css=".bat-parser-modal{display:flex;flex-direction:column;gap:1em}.bat-parser-modal__head{display:flex;align-items:center;justify-content:space-between;gap:1em}.bat-parser-modal__current-label{font-size:.9em;opacity:.7}.bat-parser-modal__current-value{font-size:1.1em}.bat-parser-modal__list{display:flex;flex-direction:column;gap:.6em}.bat-parser-modal__item{display:flex;align-items:center;justify-content:space-between;gap:1em;padding:.8em 1em;border-radius:.7em;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}.bat-parser-modal__item.is-selected,.bat-parser-modal__item.focus{border-color:#fff}.bat-parser-modal__left{display:flex;align-items:center;gap:.65em;min-width:0}.bat-parser-modal__dot{width:.55em;height:.55em;border-radius:50%;background:"+COLOR_UNKNOWN+";box-shadow:0 0 .6em rgba(0,0,0,.35);flex:0 0 auto}.bat-parser-modal__name{font-size:1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bat-parser-modal__status{font-size:.85em;opacity:.75;text-align:right;flex:0 0 auto}.bat-parser-modal__actions{display:flex;flex-direction:column;gap:.6em}.bat-parser-modal__actions-row{display:flex;gap:.6em;width:100%}.bat-parser-modal__action{flex:1;text-align:center;padding:.55em .9em;border-radius:.6em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}.bat-parser-modal__action.focus{border-color:#fff}"+
    ".bat-parser-compact-item{padding:.35em 1em!important; min-height:initial!important;}"+
    ".bat-parser-compact-item .select__title{font-size:.92em!important;}"+
    ".bat-parser-compact-item .select__subtitle{font-size:.72em!important; margin-top:.1em!important; opacity:.65!important;}";
    var style=document.createElement('style');
    style.type='text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}

/* ============================================================
   COMPACT UI HELPER (SAFE INJECTION)
   ============================================================ */
function makeMenuCompact(){
    setTimeout(function(){
        var menus = $('.select');
        if(menus.length) {
            menus.last().find('.select__item').addClass('bat-parser-compact-item');
        } else {
            $('.modal').last().find('.select__item').addClass('bat-parser-compact-item');
        }
    }, 30);
}

/* ============================================================
   MODAL ITEMS
   ============================================================ */
function buildParserItem(base,name){
    var item=$("<div class='bat-parser-modal__item selector' data-base='"+base+"'><div class='bat-parser-modal__left'><span class='bat-parser-modal__dot'></span><div class='bat-parser-modal__name'></div></div><div class='bat-parser-modal__status'></div></div>");
    item.find('.bat-parser-modal__name').text(name);
    item.find('.bat-parser-modal__status').text(Lampa.Lang.translate('bat_status_unknown'));
    return item;
}

function setItemStatus(item,color,labelKey){
    item.find('.bat-parser-modal__dot').css('background-color',color);
    item.find('.bat-parser-modal__status').text(Lampa.Lang.translate(labelKey));
}

function applySelection(list,base){
    list.find('.bat-parser-modal__item').removeClass('is-selected');
    list.find("[data-base='"+base+"']").addClass('is-selected');
}

function updateCurrentLabel(wrapper,base){
    var p=getParserByBase(base);
    wrapper.find('.bat-parser-modal__current-value').text(p ? p.name : Lampa.Lang.translate('bat_parser_none'));
}

/* ============================================================
   PRIMARY PARSER MODAL
   ============================================================ */
function openParserModal(){
    injectStyleOnce();
    var selected=getSelectedBase(), listData=getParsers();
    var modal=$("<div class='bat-parser-modal'><div class='bat-parser-modal__head'><div class='bat-parser-modal__current'><div class='bat-parser-modal__current-label'></div><div class='bat-parser-modal__current-value'></div></div></div><div class='bat-parser-modal__list'></div><div class='bat-parser-modal__actions'></div></div>");
    
    modal.find('.bat-parser-modal__current-label').text(Lampa.Lang.translate('bat_parser_current'));
    updateCurrentLabel(modal,selected);

    var list=modal.find('.bat-parser-modal__list');

    var noneItem=buildParserItem(NO_PARSER,Lampa.Lang.translate('bat_parser_none'));
    noneItem.on('hover:enter',function(){
        Lampa.Storage.set(STORAGE_PRI_ACT,NO_PARSER);
        applySelection(list,NO_PARSER);
        updateCurrentLabel(modal,NO_PARSER);
        updateSelectedLabelInSettings();
        refreshExistingUrls();
    });
    list.append(noneItem);

    listData.forEach(function(p){
        var item=buildParserItem(p.base,p.name);
        item.on('hover:enter',function(){
            Lampa.Storage.set(STORAGE_PRI_ACT,p.base);
            applySelectedParser(p.base);
            applySelection(list,p.base);
            updateCurrentLabel(modal,p.base);
            updateSelectedLabelInSettings();
            refreshExistingUrls();
        });
        list.append(item);
    });
    applySelection(list,selected);

    var actions=modal.find('.bat-parser-modal__actions');
    var row1=$("<div class='bat-parser-modal__actions-row'></div>");
    var row2=$("<div class='bat-parser-modal__actions-row'></div>");

    var btnHealth=$("<div class='bat-parser-modal__action selector'></div>").text(Lampa.Lang.translate('bat_check_parsers'));
    var btnSearch=$("<div class='bat-parser-modal__action selector'></div>").text(Lampa.Lang.translate('bat_check_search'));
    var btnUpdateMerge=$("<div class='bat-parser-modal__action selector'></div>").text(Lampa.Lang.translate('bat_update_merge'));
    var btnReset=$("<div class='bat-parser-modal__action selector'></div>").text(Lampa.Lang.translate('bat_update_reset'));
    
    row1.append(btnHealth).append(btnSearch);
    row2.append(btnUpdateMerge).append(btnReset);
    actions.append(row1).append(row2);

    function applyMapToList(statusMap){
        list.find('.bat-parser-modal__item').each(function(){
            var it=$(this), base=it.data('base');
            if(base===NO_PARSER){ setItemStatus(it,COLOR_UNKNOWN,'bat_status_unknown'); return; }
            var st=statusMap[base];
            setItemStatus(it, st?st.color:COLOR_UNKNOWN, st?st.labelKey:'bat_status_unknown');
        });
    }

    function runHealthUI(){
        list.find('.bat-parser-modal__item').each(function(){
            var it=$(this);
            if(it.data('base')===NO_PARSER) setItemStatus(it,COLOR_UNKNOWN,'bat_status_unknown');
            else setItemStatus(it,COLOR_WARN,'bat_status_checking_server');
        });
        return runHealthChecks(listData).then(function(map){ 
            applyMapToList(map); 
            refreshExistingUrls(); 
            showMessage('Перевірку доступності завершено!'); 
        });
    }

    function runSearchUI(){
        list.find('.bat-parser-modal__item').each(function(){
            var it=$(this);
            if(it.data('base')!==NO_PARSER) setItemStatus(it,COLOR_WARN,'bat_status_checking_search');
        });
        return runDeepSearchChecks(listData).then(function(map){ 
            applyMapToList(map); 
            refreshExistingUrls();
            showMessage('Перевірку пошуку завершено'); 
        });
    }

    // Безпечні події (без click)
    btnHealth.on('hover:enter', runHealthUI);
    btnSearch.on('hover:enter', runSearchUI);
    
    btnUpdateMerge.on('hover:enter', function(){
        var current = getParsers();
        var custom = current.filter(function(p){ return p.base.indexOf('base_') === 0; });
        var fresh = JSON.parse(JSON.stringify(DEFAULT_PARSERS));
        saveParsers(fresh.concat(custom));
        showMessage('Список оновлено (власні збережено)');
        Lampa.Modal.close();
        setTimeout(openParserModal, 150);
    });

    btnReset.on('hover:enter', function(){
        var fresh = JSON.parse(JSON.stringify(DEFAULT_PARSERS));
        saveParsers(fresh);
        clearAllWorkingProtos(); 
        
        if (!getParserByBase(getSelectedBase())) {
            Lampa.Storage.set(STORAGE_PRI_ACT, NO_PARSER);
            applySelectedParser(NO_PARSER);
        }
        Lampa.Storage.set(STORAGE_SEC_ACT, String(-1)); 
        applySecondaryParser(-1);
        
        showMessage('Скинуто до стандартних');
        Lampa.Modal.close();
        setTimeout(openParserModal, 150);
    });

    Lampa.Modal.open({
        title:Lampa.Lang.translate('bat_parser'), html:modal, size:'medium', scroll_to_center:true,
        select:list.find('.bat-parser-modal__item').first(),
        onBack:function(){ Lampa.Modal.close(); Lampa.Controller.toggle('settings_component'); }
    });

    runHealthUI();
}

/* ============================================================
   PRIMARY SETTINGS
   ============================================================ */
function initPrimarySettings(){
    applySelectedParser(getSelectedBase());
    var initialSecIdx = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT, '-1'), 10);
    applySecondaryParser(isNaN(initialSecIdx) ? -1 : initialSecIdx);

    Lampa.SettingsApi.addParam({
        component:'parser',
        param:{ name:'bat_parser_manage', type:'button' },
        field:{
            name:Lampa.Lang.translate('bat_parser'),
            description:Lampa.Lang.translate('bat_parser_description')+" "+getParsers().length+"<div class='bat-parser-selected' style='margin-top:.35em;opacity:.85'></div>"
        },
        onChange:openParserModal,
        onRender:function(item){
            setTimeout(function(){
                if(Lampa.Storage.field('parser_use')) item.show();
                else item.hide();
                $('.settings-param__name',item).css('color',COLOR_WARN);
                updateSelectedLabelInSettings();
                var parserUse=$('div[data-name="parser_use"]').first();
                if(parserUse.length) item.insertAfter(parserUse);
            });
        }
    });

    Lampa.SettingsApi.addParam({
        component:'parser',
        param:{ name:'parser_use_proxy', type:'trigger', default:false },
        field:{ name:Lampa.Lang.translate('bat_parser_proxy'), description:Lampa.Lang.translate('bat_parser_proxy_desc') },
        onChange:function(){ refreshExistingUrls(); Lampa.Settings.update(); },
        onRender:function(item){
            setTimeout(function(){
                if(Lampa.Storage.field('parser_use')) item.show();
                else item.hide();
                var manageBtn=$('div[data-name="bat_parser_manage"]').first();
                if(manageBtn.length) item.insertAfter(manageBtn);
            },10);
        }
    });

    Lampa.SettingsApi.addParam({
        component:'parser',
        param:{
            name:'parser_proxy_target', type:'select',
            values:{ primary:'Тільки для основного', secondary:'Тільки для додаткового', both:'Для обох (Основний + Додатковий)' },
            default:'both'
        },
        field:{ name:Lampa.Lang.translate('bat_parser_proxy_target'), description:Lampa.Lang.translate('bat_parser_proxy_target_desc') },
        onChange:function(){ refreshExistingUrls(); Lampa.Settings.update(); },
        onRender:function(item){
            setTimeout(function(){
                var proxyVal=Lampa.Storage.get('parser_use_proxy',false), isProxyOn=(proxyVal===true || proxyVal==='true');
                if(Lampa.Storage.field('parser_use') && isProxyOn) item.show();
                else item.hide();
                var proxyBtn=$('div[data-name="parser_use_proxy"]').first();
                if(proxyBtn.length) item.insertAfter(proxyBtn);
            },10);
        }
    });

    setTimeout(updateStandardFieldsUI,100);
}

/* ============================================================
   SECONDARY PARSER
   ============================================================ */
function applySecondaryParser(idx){
    idx = parseInt(idx, 10);
    if(isNaN(idx) || idx === -1) {
        setRawUrl(STORAGE_RAW_SEC, '');
        Lampa.Storage.set('jackett_url_two', '');
        Lampa.Storage.set('jackett_key_two', '');
        updateParserUseLink();
        updateStandardFieldsUI();
        return;
    }

    var list=getParsers(), p=list[idx];
    if(!p) return;
    
    var finalUrl = getFinalParserUrl(p, 'secondary');

    setRawUrl(STORAGE_RAW_SEC, stripProxy(p.url));
    Lampa.Storage.set('jackett_url_two',finalUrl);
    Lampa.Storage.set('jackett_key_two',(p.settings&&p.settings.key)||'');
    updateParserUseLink();
    updateStandardFieldsUI();
}

function activeShortName(){
    var secIdx = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT, '-1'), 10);
    if(isNaN(secIdx) || secIdx === -1) return Lampa.Lang.translate('bat_parser_none');

    var list=getParsers();
    if(secIdx >= 0 && secIdx < list.length){
        return list[secIdx].shortName||list[secIdx].name;
    }
    return 'Ручне нал.';
}

function reloadTorrents(){
    var a=Lampa.Activity.active();
    if(!a || a.component!=='torrents') return;
    Lampa.Activity.replace({ component:'torrents', url:a.url, title:a.title, search:a.search, search_one:a.search_one, search_two:a.search_two, movie:a.movie, page:1, params:a.params });
}

/* ============================================================
   SECONDARY BUTTON
   ============================================================ */
var ICON='<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:1.4em;height:1.4em;min-width:1.4em;min-height:1.4em;vertical-align:middle;fill:currentColor;flex-shrink:0"><use xlink:href="#sprite-folder"></use></svg>';

function buildSecondaryButton(){
    var btn=$('<div class="simple-button simple-button--filter selector filter--parser">'+ICON+'<div class="ps-name">'+activeShortName()+'</div></div>');
    btn.on('hover:enter click', function(){ openSecondarySelectMenu(btn); });
    return btn;
}

function updateBtnName(btn){ btn.find('.ps-name').text(activeShortName()); }
function tryInjectSecondaryButton(torrentFilter){
    if(torrentFilter.find('.filter--parser').length) return;
    var btn=buildSecondaryButton(), search=torrentFilter.find('.filter--search');
    if(search.length) btn.insertAfter(search);
    else{
        var sort=torrentFilter.find('.filter--sort');
        if(sort.length) btn.insertBefore(sort);
        else torrentFilter.prepend(btn);
    }
}

/* ============================================================
   SECONDARY SELECT MENU
   ============================================================ */
function openSecondarySelectMenu(btn){
    injectStyleOnce(); 
    var list=getParsers();
    
    var active = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT, '-1'), 10);
    if(isNaN(active) || active >= list.length) {
        active = -1;
        Lampa.Storage.set(STORAGE_SEC_ACT, String(-1)); 
    }
    
    var enabled=Lampa.Controller.enabled().name;
    var items = [];
    
    items.push({
        title: Lampa.Lang.translate('bat_parser_none'),
        selected: active === -1,
        myIdx: -1
    });

    list.forEach(function(p, i){
        var sub=getFinalParserUrl(p, 'secondary');
        if(p.settings && p.settings.key) sub+='  |  apikey: '+p.settings.key;
        var dotHtml='<span class="sec-dot" data-base="'+p.base+'" style="display:inline-block;width:.55em;height:.55em;border-radius:50%;background-color:'+COLOR_WARN+';margin-right:.6em;box-shadow:0 0 .6em rgba(0,0,0,.35);vertical-align:middle;"></span>';
        items.push({ title: dotHtml + p.name, subtitle: sub, selected: i === active, myIdx:i });
    });

    items.push({ title: 'Керування парсерами…', manage:true });

    Lampa.Select.show({
        title:'Вибір додаткового парсера', items:items,
        onSelect:function(item){
            if(item.manage){ openManageMenu(btn,enabled); }
            else{
                Lampa.Storage.set(STORAGE_SEC_ACT, String(item.myIdx)); 
                applySecondaryParser(item.myIdx);
                updateBtnName(btn);
                if(item.myIdx !== -1) showMessage('Парсер: '+activeShortName());
                Lampa.Controller.toggle(enabled);
                reloadTorrents();
            }
        },
        onBack:function(){ Lampa.Controller.toggle(enabled); }
    });

    makeMenuCompact(); // Компактний вигляд меню

    runHealthChecks(list).then(function(map){
        list.forEach(function(p){
            var st=map[p.base], color=st ? st.color : COLOR_UNKNOWN;
            $('.sec-dot[data-base="'+p.base+'"]').css('background-color',color);
        });
    });
}

/* ============================================================
   MANAGE MENU
   ============================================================ */
function openManageMenu(btn,enabled){
    injectStyleOnce();
    var list=getParsers();
    var items=list.map(function(p,i){
        var sub=getFinalParserUrl(p, 'secondary');
        if(p.settings && p.settings.key) sub+='  |  apikey: '+p.settings.key;
        return{ title: p.name, subtitle:sub, myIdx:i };
    });

    items.push({ title: '+ Додати парсер', add:true });
    items.push({ title: 'Скинути за замовчуванням', reset:true });

    Lampa.Select.show({
        title:'Керування парсерами', items:items,
        onSelect:function(item){
            if(item.add){
                inputDialog('Повна назва','',function(name){
                    if(!name) return;
                    setTimeout(function(){
                        inputDialog('Коротка назва (для кнопки)',name,function(shortName){
                            setTimeout(function(){
                                inputDialog('URL (з протоколом або без нього)','',function(url){
                                    setTimeout(function(){
                                        inputDialog('API-ключ (або залиште порожнім)','',function(key){
                                            var l=getParsers(), savedUrl=stripProxy(url||'').trim();
                                            var newBase = 'base_'+Date.now();
                                            clearWorkingProto(newBase); 
                                            l.push({
                                                base:newBase,
                                                name:name.trim(), shortName:(shortName||name).trim(),
                                                url:savedUrl, displayUrl:savedUrl,
                                                settings:{ key:(key||'').trim(), parser_torrent_type:'jackett' }
                                            });
                                            saveParsers(l);
                                            showMessage('Додано: '+name.trim());
                                            Lampa.Controller.toggle(enabled);
                                        });
                                    },350);
                                });
                            },350);
                        });
                    },350);
                });
            }
            else if(item.reset){
                saveParsers(JSON.parse(JSON.stringify(DEFAULT_PARSERS)));
                clearAllWorkingProtos();
                Lampa.Storage.set(STORAGE_SEC_ACT, String(-1)); 
                applySecondaryParser(-1);
                updateBtnName(btn);
                showMessage('Список відновлено');
                Lampa.Controller.toggle(enabled);
            }
            else{ editMenu(item.myIdx,btn,enabled); }
        },
        onBack:function(){ Lampa.Controller.toggle(enabled); }
    });

    makeMenuCompact(); // Компактний вигляд меню
}

/* ============================================================
   EDIT PARSER
   ============================================================ */
function editMenu(idx,btn,enabled){
    var list=getParsers(), p=list[idx];
    Lampa.Select.show({
        title:p.name,
        items:[
            {title:'Змінити URL',action:'url'},
            {title:'Змінити API-ключ',action:'apikey'},
            {title:'Перейменувати',action:'rename'},
            {title:'Видалити',action:'delete'}
        ],
        onSelect:function(item){
            if(item.action==='delete'){
                clearWorkingProto(list[idx].base);
                list.splice(idx,1); 
                saveParsers(list); 

                var priBase = getSelectedBase();
                if (priBase === p.base) { 
                    Lampa.Storage.set(STORAGE_PRI_ACT, NO_PARSER);
                    applySelectedParser(NO_PARSER);
                }
                var currentSec = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT, '-1'), 10);
                if (currentSec === idx) {
                     Lampa.Storage.set(STORAGE_SEC_ACT, String(-1)); 
                     applySecondaryParser(-1);
                } else if (currentSec > idx) {
                     Lampa.Storage.set(STORAGE_SEC_ACT, String(currentSec - 1)); 
                }

                updateBtnName(btn);
                showMessage('Видалено'); 
                Lampa.Controller.toggle(enabled);
            }
            else if(item.action==='url'){
                inputDialog('Новий URL (з протоколом або без нього)',stripProxy(p.url),function(val){
                    var savedUrl=stripProxy(val||'').trim();
                    list[idx].url=savedUrl; list[idx].displayUrl=savedUrl; 
                    clearWorkingProto(list[idx].base); 
                    saveParsers(list);
                    
                    var currentSec = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT, '-1'), 10);
                    if(currentSec === idx) applySecondaryParser(idx);
                    if(getSelectedBase()===list[idx].base) applySelectedParser(list[idx].base);
                    updateBtnName(btn); updateStandardFieldsUI();
                    showMessage('URL оновлено'); Lampa.Controller.toggle(enabled);
                });
            }
            else if(item.action==='apikey'){
                inputDialog('API-ключ',(p.settings&&p.settings.key)||'',function(val){
                    if(!list[idx].settings) list[idx].settings={};
                    list[idx].settings.key=(val||'').trim(); saveParsers(list); updateBtnName(btn);
                    showMessage('API-ключ оновлено'); Lampa.Controller.toggle(enabled);
                });
            }
            else if(item.action==='rename'){
                inputDialog('Нова повна назва',p.name,function(nameVal){
                    if(!nameVal) return;
                    setTimeout(function(){
                        inputDialog('Нова коротка назва',p.shortName||nameVal,function(shortVal){
                            list[idx].name=nameVal.trim(); list[idx].shortName=(shortVal||nameVal).trim();
                            saveParsers(list); updateBtnName(btn);
                            showMessage('Перейменовано'); Lampa.Controller.toggle(enabled);
                        });
                    },350);
                });
            }
        },
        onBack:function(){ Lampa.Controller.toggle(enabled); }
    });
}

/* ============================================================
   INPUT
   ============================================================ */
function inputDialog(title,value,cb){
    if(Lampa.Input && typeof Lampa.Input.edit==='function'){
        Lampa.Input.edit({ title:title, value:value||'', free:true, nosave:true },function(new_val){ cb(new_val); });
    }else{
        var res=prompt(title,value||'');
        if(res!==null) cb(res);
    }
}

/* ============================================================
   SECONDARY OBSERVER
   ============================================================ */
var secondaryObserver=null;
function startSecondaryObserver(){
    if(secondaryObserver) return;
    secondaryObserver=new MutationObserver(function(){
        var activity=Lampa.Activity.active();
        if(activity && activity.component!=='torrents') return;
        var el=$('.torrent-filter');
        if(el.length && !el.find('.filter--parser').length){ tryInjectSecondaryButton(el); }
    });
    secondaryObserver.observe(document.body,{ childList:true, subtree:true });
}
function stopSecondaryObserver(){
    if(secondaryObserver){ secondaryObserver.disconnect(); secondaryObserver=null; }
}

/* ============================================================
   SECONDARY PLUGIN
   ============================================================ */
function initSecondaryPlugin(){
    var isFixingUrl=false;
    
    Lampa.Storage.listener.follow('change', function(e){
        if(!isFixingUrl && (e.name==='jackett_url' || e.name==='jackett_url_two' || e.name==='prowlarr_url')){
            if(e.value){
                var expectedUrl = '';
                var p = null;
                
                if(e.name === 'jackett_url') {
                    p = getParserByBase(getSelectedBase());
                    if(p && p.settings.parser_torrent_type !== 'prowlarr') expectedUrl = getFinalParserUrl(p, 'primary');
                } else if (e.name === 'prowlarr_url') {
                    p = getParserByBase(getSelectedBase());
                    if(p && p.settings.parser_torrent_type === 'prowlarr') expectedUrl = getFinalParserUrl(p, 'primary');
                } else if (e.name === 'jackett_url_two') {
                    var secIdx = parseInt(Lampa.Storage.get(STORAGE_SEC_ACT,'-1'), 10);
                    var secList = getParsers();
                    if(!isNaN(secIdx) && secIdx >= 0 && secIdx < secList.length) {
                        expectedUrl = getFinalParserUrl(secList[secIdx], 'secondary');
                    }
                }

                if(expectedUrl && e.value !== expectedUrl) {
                    isFixingUrl = true;
                    Lampa.Storage.set(e.name, expectedUrl);
                    setTimeout(function(){ isFixingUrl = false; }, 150);
                }
            }
        }
        
        if(e.name==='activity'){
            var activity=Lampa.Activity.active();
            if(activity && activity.component==='torrents'){
                startSecondaryObserver();
                setTimeout(function(){ var el=$('.torrent-filter'); if(el.length) tryInjectSecondaryButton(el); },100);
                setTimeout(function(){ var el=$('.torrent-filter'); if(el.length) tryInjectSecondaryButton(el); },800);
            }else{ stopSecondaryObserver(); }
        }
    });

    var activity=Lampa.Activity.active();
    if(activity && activity.component==='torrents'){
        startSecondaryObserver();
        var el=$('.torrent-filter');
        if(el.length) tryInjectSecondaryButton(el);
    }
}

/* ============================================================
   INIT
   ============================================================ */
function initAll(){
    Lampa.Lang.add=Lampa.Lang.add||function(){};
    translate();
    initPrimarySettings();
    initSecondaryPlugin();
    console.log('[CombinedParserPlugin V28 - Safe Polish & Bell] Loaded successfully');
}

if(!window.plugin_combined_parser_ready){
    window.plugin_combined_parser_ready=true;
    if(window.appready || (window.Lampa && window.Lampa.Storage)){ initAll(); }
    else{
        document.addEventListener('lampa:ready', initAll);
        if(window.Lampa && window.Lampa.Listener){
            Lampa.Listener.follow('app', function(e){ if(e.type==='ready') initAll(); });
        }
    }
}

})();
