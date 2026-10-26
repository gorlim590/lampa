/* Opt-in, bounded startup diagnostics. No preference/account reads or writes. */
(function () {
    'use strict';
    if (window.LampaStartupProbe) return;
    var perf=window.performance, started=perf.now(), json=document.createElement('script');
    json.id='lampa-startup-probe';json.type='application/json';document.documentElement.appendChild(json);
    var report={schema:1,probeStartMs:started,firstUsableMs:null,firstHybridPaintMs:null,hybridAlreadyPresent:false,hybridTransitions:0,dpad:[],snapshots:[],limitations:['Browser observation, not physical Google TV','HTTP cache is not cleared; cold network state is not guaranteed','Native subscription counts only; browser DOM listener totals are unavailable']};
    var observer,frame=0,stopped=false,lastHybrid=null,remaining=8,pendingKey=null,deadline;
    function time(){return Math.round(perf.now()*10)/10;}
    function hybrid(){return !!document.body && document.body.classList.contains('stremio-hybrid') && !!document.getElementById('stremio-hybrid-style') && !!getComputedStyle(document.body).getPropertyValue('--sh-bg').trim();}
    report.hybridAlreadyPresent=hybrid();
    function count(sub){var n=0;Object.keys(sub&&sub._listeners||{}).forEach(function(k){var a=sub._listeners[k];if(Array.isArray(a))n+=a.length;});return n;}
    function snapshot(){
        var L=window.Lampa||{},api={app:L.Listener,settings:L.Settings&&L.Settings.listener,storage:L.Storage&&L.Storage.listener,controller:L.Controller&&L.Controller.listener,params:L.Params&&L.Params.listener};
        var counts={};Object.keys(api).forEach(function(k){counts[k]=count(api[k]);});
        return {atMs:time(),nodes:document.querySelectorAll('*').length,styles:document.querySelectorAll('style,link[rel="stylesheet"]').length,hybridStyles:document.querySelectorAll('#stremio-hybrid-style').length,hubStyles:document.querySelectorAll('#lampa-settings-hub-style').length,profileButtons:document.querySelectorAll('.sh-head-more').length,nativeSubscriptions:counts};
    }
    function publish(){
        report.paint=perf.getEntriesByType('paint').map(function(p){return {name:p.name,atMs:Math.round(p.startTime*10)/10};});
        var nav=perf.getEntriesByType('navigation')[0];report.navigation=nav?{type:nav.type,domContentLoadedMs:nav.domContentLoadedEventEnd,loadMs:nav.loadEventEnd}:null;
        report.uiResources=perf.getEntriesByType('resource').filter(function(r){return /\/lampa\/(?:loader\.js|ui\/(?:stremio-hybrid|lampa-ui|settings-hub|design-optimized|interface-plus|cardify-plus)\.(?:js|css))/.test(r.name);}).map(function(r){return {path:new URL(r.name).pathname,startMs:Math.round(r.startTime*10)/10,endMs:Math.round(r.responseEnd*10)/10};});
        report.current=snapshot();json.textContent=JSON.stringify(report);
    }
    function focus(){return document.querySelector('.focus');}
    function inspect(){
        frame=0;if(stopped)return;
        var on=hybrid();if(lastHybrid!==null && lastHybrid!==on)report.hybridTransitions++;lastHybrid=on;
        if(on && !report.hybridAlreadyPresent && report.firstHybridPaintMs===null)requestAnimationFrame(function(){if(!stopped && hybrid()){report.firstHybridPaintMs=time();publish();}});
        var welcome=document.querySelector('.welcome'),card=document.querySelector('.activity--active .card.selector'),head=document.querySelector('.head');
        if(report.firstUsableMs===null && window.appready && card && head && head.getClientRects().length && (!welcome || !welcome.getClientRects().length || getComputedStyle(welcome).display==='none'))report.firstUsableMs=time();
        if(pendingKey && focus() && focus()!==pendingKey.before){report.dpad.push({atMs:pendingKey.at,focusResponseMs:Math.round((perf.now()-pendingKey.start)*10)/10});pendingKey=null;}
        publish();
        if(report.firstUsableMs!==null && on && observer){observer.disconnect();observer=null;}
    }
    function queue(){if(!frame && !stopped)frame=requestAnimationFrame(inspect);}
    function onKey(e){
        if(!/^Arrow|^Enter$|^Escape$|^Backspace$/.test(e.key)||stopped)return;
        pendingKey={before:focus(),start:perf.now(),at:time()};
        requestAnimationFrame(function(){requestAnimationFrame(function(){inspect();if(report.snapshots.length<8)report.snapshots.push(snapshot());publish();if(--remaining<=0)stop();});});
    }
    function stop(){if(stopped)return;publish();stopped=true;if(observer)observer.disconnect();if(frame)cancelAnimationFrame(frame);clearTimeout(deadline);document.removeEventListener('keydown',onKey,true);report.stopped=true;json.textContent=JSON.stringify(report);}
    window.LampaStartupProbe={stop:stop};
    observer=new MutationObserver(function(records){if(records.some(function(r){return r.target!==json && !json.contains(r.target);} ))queue();});
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('keydown',onKey,true);deadline=setTimeout(stop,60000);inspect();
})();
