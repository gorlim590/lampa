/* Dynamic, metadata-backed season model shared by the overlay and its search context. */
function createCinemaSeasons() {
    function integer(value) { return value !== null && value !== undefined && value !== '' && isFinite(Number(value)) && Math.floor(Number(value)) === Number(value); }
    function episodic(movie,kind) {
        movie=movie||{};
        var type=String(movie.media_type||movie.method||movie.type||kind||'').toLowerCase();
        return /^(tv|series|show|anime-series|anime_series)$/.test(type) || (!!movie.original_name && type!=='movie');
    }
    function list(movie,kind,now) {
        if(!episodic(movie,kind)||!Array.isArray(movie.seasons))return null;
        now=now||new Date();var seen=Object.create(null);
        return movie.seasons.filter(function(item){var n=item&&Number(item.season_number),date=item&&String(item.air_date||'');if(!item||!integer(item.season_number)||n<=0||seen[n]||!/^\d{4}-\d\d-\d\d$/.test(date)||new Date(date+'T00:00:00Z')>now)return false;seen[n]=true;return true;})
            .map(function(item){return {number:Number(item.season_number),name:String(item.name||''),air_date:String(item.air_date||''),episode_count:integer(item.episode_count)?Number(item.episode_count):null,raw:item};})
            .sort(function(a,b){return a.number-b.number;});
    }
    function identity(movie,account,profile) { return JSON.stringify([String(account||''),String(profile||''),String(movie&&movie.source||'tmdb'),String(movie&&movie.id||''),String(movie&&(movie.media_type||movie.method)||'tv')]); }
    function storageKey(movie,account,profile){return 'lampa_tc_season_v1:'+identity(movie,account,profile);}
    function persisted(movie,account,profile,storage){try{var n=Number(storage.getItem(storageKey(movie,account,profile)));return Number.isInteger(n)&&n>0?n:null;}catch(e){return null;}}
    function save(movie,number,account,profile,storage){try{storage.setItem(storageKey(movie,account,profile),String(number));return true;}catch(e){return false;}}
    function choose(movie,seasons,nativeSeason,last,now){
        seasons=seasons||list(movie);var valid=function(n){return Number.isInteger(Number(n))&&seasons.some(function(s){return s.number===Number(n);});};
        if(valid(nativeSeason))return Number(nativeSeason);
        if(valid(last))return Number(last);
        now=now||new Date();var aired=seasons.filter(function(s){return /^\d{4}-\d\d-\d\d$/.test(s.air_date)&&new Date(s.air_date+'T23:59:59Z')<=now;});
        return aired.length?aired[aired.length-1].number:seasons.length?seasons[0].number:null;
    }
    function seasonQuery(title,number,style){
        title=String(title||'').trim();number=Number(number);if(!title||!Number.isInteger(number)||number<1)return '';
        var padded=String(number).padStart(2,'0');
        var suffix=style==='short'?'S'+number:style==='english'?'Season '+number:style==='english-padded'?'Season '+padded:style==='uk'?'Сезон '+number:style==='uk-postfix'?number+' сезон':'S'+padded;
        return title+' '+suffix;
    }
    function coverage(raw,source){
        raw=String(raw||'');source=source||{};var nums=[],range=null,episode=false,explicit=false,m;
        var episodeRx=/\bS(\d{1,3})E\d{1,4}(?:\s*[-–]\s*(?:S(\d{1,3}))?E?\d{1,4})?/gi;
        while((m=episodeRx.exec(raw))){var n=Number(m[1]);if(nums.indexOf(n)<0)nums.push(n);episode=true;explicit=true;}
        var packRx=/\bS(\d{1,3})\s*[-–]\s*S?(\d{1,3})\b|\bSeasons?\s*(\d{1,3})\s*[-–]\s*(?:Seasons?\s*)?(\d{1,3})\b|Сезони?\s*(\d{1,3})\s*[-–]\s*(?:Сезони?\s*)?(\d{1,3})/giu;
        m=packRx.exec(raw);
        if(m){var a=Number(m[1]||m[3]||m[5]),b=Number(m[2]||m[4]||m[6]);if(a>0&&b>=a){range=[a,b];explicit=true;}}
        if(!range&&!episode){m=/\b(\d{1,3})x\d{1,4}\b/i.exec(raw);if(m&&Number(m[1])>0){nums.push(Number(m[1]));episode=true;explicit=true;}}
        if(!range&&!episode){m=/\b(?:S|Season\s*|Сезон\s*|Сезон\s*)(\d{1,3})(?!\d)|(?:^|[^\d])(\d{1,3})\s*сезон\b/iu.exec(raw);if(m){var single=Number(m[1]||m[2]);if(single>0){nums.push(single);explicit=true;}}}
        var collection=/\b(?:complete\s+series|complete\s+collection|complete\s+show|all\s+seasons|full\s+series|box[ .-]?set|collection|anthology)\b|повн(?:ий|а)\s+(?:серіал|колекці)|усі\s+сезони/iu.test(raw);
        var sourceSeason=source.Season!=null?source.Season:source.season;
        if(!explicit&&integer(sourceSeason)&&Number(sourceSeason)>0){nums.push(Number(sourceSeason));explicit=true;}
        nums=nums.filter(function(n,i,a){return Number.isInteger(n)&&n>0&&a.indexOf(n)===i;}).sort(function(x,y){return x-y;});
        if(range){for(var s=range[0];s<=range[1];s++)nums.push(s);nums=nums.filter(function(n,i,a){return a.indexOf(n)===i;}).sort(function(x,y){return x-y;});}
        if(range||collection)return {kind:'collection',seasons:nums,range:range,verified:!!(range||nums.length),episode:episode};
        if(nums.length)return {kind:'season',seasons:nums,range:null,verified:true,episode:episode};
        return {kind:'unknown',seasons:[],range:null,verified:false,episode:false};
    }
    function classify(raw,source,selected){var c=coverage(raw,source),n=Number(selected),contains=c.seasons.indexOf(n)>=0;return {kind:c.kind,coverage:c,contains:contains,label:c.kind==='collection'?(c.verified?(contains?'Містить S'+String(n).padStart(2,'0'):'Не містить S'+String(n).padStart(2,'0')):'Склад сезонів не підтверджено'):c.kind==='unknown'?'Склад сезонів не підтверджено':''};}
    return {episodic:episodic,list:list,identity:identity,storageKey:storageKey,persisted:persisted,save:save,choose:choose,seasonQuery:seasonQuery,coverage:coverage,classify:classify};
}
