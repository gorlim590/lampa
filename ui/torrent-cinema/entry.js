/* Public lifecycle. The build wraps all factories in one idempotent entry. */
var metadata=createCinemaMetadata(),view=createCinemaView(),seasons=createCinemaSeasons(),runtime=createCinemaRuntime(metadata,seasons);
var settingsRegistered=false,waitingOwner=null,waitingCallback=null,waitTimer=0,waitAttempts=0,enableOwner=null;
var api=Object.assign({},metadata,view,{seasonBrowser:seasons,version:'2.1.0',contractVersion:2,install:install,destroy:destroy,setEnabled:setEnabled,applySettings:applySettings,diagnostics:runtime.status});
// Legacy APIs point at the SAME owner, never a second initializer.
window.LampaTorrentCinema=window.TorrentsRedesign=window.LampaTorrentOverlay=api;
function ready(){return window.Lampa&&Lampa.Component&&Lampa.Activity&&Lampa.Controller&&Lampa.SettingsApi&&Lampa.Listener&&Lampa.Modal&&Lampa.Select;}
function clearWait(){if(waitTimer){clearTimeout(waitTimer);waitTimer=0;}if(waitingOwner){waitingOwner.remove('app',waitingCallback);waitingOwner=null;waitingCallback=null;}}
function applySettings(){if(!ready())return;if(metadata.enabled()){metadata.applyFileSettings();runtime.start();runtime.refresh();}else runtime.stop();}
function registerSettings(){
    if(settingsRegistered)return;settingsRegistered=true;
    Lampa.SettingsApi.addComponent({component:'torrents_cinema',name:'Torrent Cinema',icon:'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h18v16H3zm2 2v12h14V6zm5 2 6 4-6 4z"/></svg>'});
    function option(key,label,values,value){Lampa.SettingsApi.addParam({component:'torrents_cinema',param:{name:'torrents_cinema_'+key,type:values?'select':'trigger',values:values||undefined,default:value},field:{name:label},onChange:applySettings});}
    option('enabled','Torrent Cinema · накладка',null,true);
    option('quality','Бажана роздільна здатність',{'720':'720p','1080':'1080p','2160':'4K'},'1080');
    option('auto','Найкращий вибір (без автозапуску)',null,true);
    option('ua','Пріоритет українських доріжок',null,true);
    option('ua_audio','Пріоритет українського аудіо',null,true);
    option('ua_subs','Пріоритет українських субтитрів',null,true);
    option('tracker','Фільтр трекерів',{all:'Усі',toloka:'Толока',mazepa:'Мазепа',source:'Обраний трекер'},'all');
    option('sort','Сортування',{recommended:'Рекомендовані',quality:'Якість',seeders:'Сіди',size:'Розмір',date:'Дата',tracker:'Толока → Мазепа → інші'},'recommended');
    option('suspect','Пояснювати підозрілі збіги у деталях',null,true);
    option('dedupe','Приховувати підтверджені дублікати',null,false);
    option('episode_ratings','IMDb у файлах',null,true);
    option('metadata_cache','Кеш метаданих (6 годин)',null,true);
    option('parallel','Паралельні запити метаданих',{'1':'1','2':'2','4':'4'},'2');
    option('lazy','IMDb лише для видимих файлів',null,true);
    option('rating_budget','Денний ліміт OMDb',{'20':'20','50':'50','100':'100'},'50');
}
function onEnable(event){if(event&&event.name==='torrents_cinema_enabled')applySettings();}
function install(){
    if(!ready()){waitForNative();return;}
    clearWait();metadata.setStopped(false);registerSettings();
    if(!enableOwner&&Lampa.Storage.listener){enableOwner=Lampa.Storage.listener;enableOwner.follow('change',onEnable);}
    applySettings();
}
function setEnabled(value){metadata.setStopped(!value);if(value)install();else runtime.stop();}
function destroy(){clearWait();runtime.stop();metadata.destroy();if(enableOwner){enableOwner.remove('change',onEnable);enableOwner=null;}}
function waitForNative(){
    if(ready()){
        if(window.appready)return install();
        if(!waitingOwner){waitingOwner=Lampa.Listener;waitingCallback=function(event){if(event&&event.type==='ready')install();};waitingOwner.follow('app',waitingCallback);}
    }
    if(!waitTimer&&typeof document!=='undefined'&&document.addEventListener&&waitAttempts++<300)waitTimer=setTimeout(function(){waitTimer=0;waitForNative();},100);
}
waitForNative();
