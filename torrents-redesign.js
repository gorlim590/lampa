/* Deprecated URL alias. Install ui/torrent-cinema.js instead; no UI lives here. */
(function(){
    'use strict';
    if(window.LampaTorrentCinema||typeof document==='undefined'||document.querySelector('script[data-torrent-cinema]'))return;
    var current=document.currentScript&&document.currentScript.src;if(!/^https?:\/\//i.test(current||''))current='';
    var url=new URL('ui/torrent-cinema.js',current||'https://gorlim590.github.io/lampa/torrents-redesign.js');
    var version=current&&new URL(current).searchParams.get('v');url.search='';if(version)url.searchParams.set('v',version);
    var script=document.createElement('script');script.src=url.href;script.setAttribute('data-torrent-cinema','');script.onerror=function(){script.remove();};document.head.appendChild(script);
})();
