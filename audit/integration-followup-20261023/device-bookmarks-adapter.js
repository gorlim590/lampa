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
