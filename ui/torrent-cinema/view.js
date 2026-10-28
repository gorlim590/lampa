/* Single scoped presentation owner; compatibility API retained. */
function createCinemaView() {
    function session() {
        // Only non-secret identifiers; credentials/URLs never become cache keys.
        var permit=Lampa.Account&&Lampa.Account.Permit,account=permit&&permit.account||{};
        return JSON.stringify([account.id||'',account.profile&&account.profile.id||'']);
    }
    function key(params,kind,epoch) {
        return JSON.stringify([session(),epoch,kind,params.movie.source||'tmdb',params.movie.id,
            params.search,params.search_one,params.search_two,!!params.global,!!params.clarification,
            params.season,params.episode,params.filter_season,params.filter_episode,Lampa.Storage.field('parser_torrent_type')]);
    }
    function pad(n){return String(n).padStart(2,'0');}
    function coverage(raw,source) {
        var matches=Array.from(raw.matchAll(/\bS(\d{1,2})E(\d{1,3})(?:[ ._]*[-–][ ._]*(?:S(\d{1,2}))?E?(\d{1,3}))?/gi));
        if(matches.length){return matches.map(function(m){return 'S'+pad(+m[1])+'E'+pad(+m[2])+(m[4]?(m[3]&&+m[3]!==+m[1]?'–S'+pad(+m[3])+'E'+pad(+m[4]):+m[4]>=+m[2]?'–E'+pad(+m[4]):''):'');}).filter(function(v,i,a){return a.indexOf(v)===i;}).join(' · ');}
        var m=/\b(\d{1,2})x(\d{1,3})\b/i.exec(raw);if(m)return 'S'+pad(+m[1])+'E'+pad(+m[2]);
        m=/\bS(\d{1,2})\s*[-–]\s*S(\d{1,2})\b/i.exec(raw);if(m&&+m[2]>=+m[1])return 'S'+pad(+m[1])+'–S'+pad(+m[2]);
        m=/(?:\bS|\bSeason[ ._]*|Сезон[ ._:]*)(\d{1,2})(?!\d)|(?:^|[^\d])(\d{1,2})\s*сезон/iu.exec(raw);
        var season=m?+(m[1]||m[2]):null;
        var episode=/\bE(\d{1,3})(?:\s*[-–]\s*E?(\d{1,3}))?\b/i.exec(raw)||/\[(\d{1,3})\s*[-–]\s*(\d{1,3})\]/.exec(raw)||/(?:^|[^\d])(\d{1,3})\s*[-–]\s*(\d{1,3})\s*(?:сері[яїй]|эпизод|episodes)/iu.exec(raw);
        if(episode)return (season==null?'':'S'+pad(season))+'E'+pad(+episode[1])+(episode[2]&&+episode[2]>=+episode[1]?'–E'+pad(+episode[2]):'');
        function coord(v,zero){return /^\d{1,3}$/.test(String(v))&&+v>=(zero?0:1)?+v:null;}
        if(season==null)season=coord(source.Season??source.season,true);
        var ep=coord(source.Episode??source.episode,false);
        return season!=null?'S'+pad(season)+(ep==null?'':'E'+pad(ep)):ep!=null?'E'+pad(ep):'епізоди не визначено';
    }
    function releaseView(source,movie,kind,context) {
        source=source||{};movie=movie||{};var api=window.TorrentsRedesign,raw=String(source.Title||source.Name||source.title||source.name||''),data=api&&api.normalizeRelease?api.normalizeRelease(source):null;
        var match=data&&api.releaseMatch?api.releaseMatch(data,movie,context||{}):null;
        // Full parser release names carry edition, voice and pack details needed on TV.
        // Keep relevance/ranking separate from display; never synthesize a replacement title.
        return {title:raw||'Назва релізу недоступна',raw:raw,release:data?data.parsed.name:'',identity:releaseIdentity(raw,source,kind,data),match:match,data:data};
    }
    function releaseIdentity(raw,source,kind,data) {
        source=source||{};raw=String(raw||'').trim();var clean=raw.replace(/[._]+/g,' ').replace(/\s+/g,' ').trim(),technical=/\b(?:2160p|1080p|720p|480p|4k|WEB[ .-]?DL|WEBRip|BDRemux|UHD[ .-]?BDRemux|Remux|BDRip|BluRay|BD[ .-]?Rip|HDRip|HDTV|DVDRip|HDR10?\+?|Dolby[ .-]?Vision|HEVC|AVC|x26[45]|H[ .]?26[45])\b/i.exec(clean),techAt=technical?technical.index:clean.length;
        var episode=/\bS\d{1,2}E\d{1,3}(?:\s*[-–]\s*(?:S\d{1,2})?E?\d{1,3})?/i.exec(clean),pack=/\bS\d{1,2}\s*[-–]\s*S\d{1,2}\b/i.exec(clean),season=/\b(?:Season|Сезон)\s*\d{1,2}\b|\bS\d{1,2}\b|\b\d{1,2}x\d{1,3}\b/iu.exec(clean),complete=/\bComplete\s+Season\s+(\d{1,2})\b|Повний\s+сезон\s+(\d{1,2})/iu.exec(clean);
        var cuts=[techAt];if(episode)cuts.push(episode.index);if(pack)cuts.push(pack.index);if(season)cuts.push(season.index);if(complete)cuts.push(complete.index);var years=Array.from(clean.matchAll(/\b(?:19|20)\d{2}\b/g)).filter(function(m){return m.index>0&&m.index<techAt;}),yearMatch=years.length?years[years.length-1]:null;
        if(yearMatch)cuts.push(yearMatch.index);var titleEnd=Math.min.apply(Math,cuts),name=clean.slice(0,titleEnd).replace(/[\s\-–—()[\]{}]+$/g,'').trim(),year=(data&&data.year)||null;
        if(!year&&yearMatch)year=Number(yearMatch[0]);if(!name)name=clean.slice(0,techAt).replace(/[\s\-–—()[\]{}]+$/g,'').trim();
        // Keep an honest raw fragment when the provider gives no parseable identity.
        if(!name)name=raw.slice(0,180).trim();
        var verified=coverage(raw,source),coverageValue=complete?'Complete Season '+(complete[1]||complete[2]):verified==='епізоди не визначено'?'':verified,releaseTypeMatch=/\b(UHD[ .-]?BDRemux|BDRemux|WEB[ .-]?DL|WEBRip|BluRay|BDRip|HDRip|HDTV|DVDRip|Remux)\b/i.exec(raw),releaseType=releaseTypeMatch?releaseTypeMatch[1].replace(/WEB[ .-]?DL/i,'WEB-DL').replace(/BDRemux/i,'Remux'):'';
        var flags=[];if(/\bHDR10\+/i.test(raw))flags.push('HDR10+');else if(/\bHDR10\b/i.test(raw))flags.push('HDR10');else if(/\bHDR\b/i.test(raw))flags.push('HDR');if(/\bDV\b|Dolby[ .-]?Vision/i.test(raw))flags.push('Dolby Vision');if(/\bIMAX\b/i.test(raw))flags.push('IMAX');
        var resolution=data&&data.parsed&&data.parsed.quality||'',codec=data&&data.parsed&&data.parsed.codec||'';
        return {name:name||'Назва релізу недоступна',year:year,coverage:kind==='tv'?coverageValue:'',resolution:resolution,releaseType:releaseType,flags:flags,codec:codec,raw:raw};
    }
    function decorate(row,source,movie,kind,context) {
        source=source||row._ctrSource||{Title:row.querySelector('.torrent-item__title')?.textContent||''};
        var view=releaseView(source,movie,kind,context),data=view.data,parsed=data&&data.parsed||{},name=row.querySelector('.ctr-name'),chips=row.querySelector('.ctr-chips');
        var signature=JSON.stringify([source,row._shVerifiedStudios||[],kind]);
        if(row._tcSignature===signature)return view;
        row._tcSignature=signature;
        row.title=view.raw;row.setAttribute('aria-label',view.title);
        var identity=view.identity||releaseIdentity(view.raw,source,kind,data);
        if(name)name.textContent=identity.name+(identity.year?' ('+identity.year+')':'');
        if(!chips)return view;
        chips.textContent='';var priority=document.createElement('div');priority.className='tc-priority-row';var secondary=document.createElement('div');secondary.className='tc-secondary-row';chips.appendChild(priority);chips.appendChild(secondary);
        function chip(label,cls,target){var n=document.createElement('span');n.className='ctr-chip '+(cls||'');n.textContent=label;(target||priority).appendChild(n);}
        if(kind==='tv'&&identity.coverage)chip(identity.coverage,'tc-coverage');
        var audio=parsed.audio||{},subs=parsed.subs||{};
        if(audio.ua)chip('🇺🇦 UA','tc-ua-badge');
        if(data&&data.tracker)chip(data.tracker,'tc-tracker-badge '+(/toloka/i.test(data.tracker)?'is-toloka':/mazepa/i.test(data.tracker)?'is-mazepa':''));
        if(identity.resolution)chip(identity.resolution==='2160'?'4K':identity.resolution+'p','tc-tech-badge tc-resolution',secondary);
        if(identity.releaseType)chip(identity.releaseType,'tc-tech-badge',secondary);
        if(identity.flags.length)chip(identity.flags.join(' · '),'tc-tech-badge',secondary);
        if(identity.codec)chip(identity.codec,'tc-tech-badge',secondary);
        var size=data&&data.bytes!=null?(data.bytes>=1073741824?(data.bytes/1073741824).toFixed(2)+' ГБ':(data.bytes/1048576).toFixed(1)+' МБ'):'';
        var metrics=row.querySelector('.ctr-metrics');if(metrics){metrics.textContent='';var health=document.createElement('div');health.className='tc-health';var seeds=document.createElement('span');seeds.className='tc-seeds'+(data&&data.seeds>0?' is-good':'');seeds.textContent=data&&data.seeds!=null?data.seeds+' сідів':'Сіди —';var peers=document.createElement('span');peers.className='ctr-peers';peers.textContent=data&&data.peers!=null?'▲ '+data.peers+' пірів':'▲ — пірів';health.appendChild(seeds);health.appendChild(peers);metrics.appendChild(health);var bytes=document.createElement('div');bytes.className='ctr-size';bytes.textContent=(size?'▦  ':'')+(size||'Розмір невідомий');metrics.appendChild(bytes);}
        var audioBlock=row.querySelector('.tc-audio');if(!audioBlock){audioBlock=document.createElement('div');audioBlock.className='tc-audio';row.querySelector('.ctr-row').insertBefore(audioBlock,row.querySelector('.ctr-metrics'));}
        audioBlock.textContent='';var audioLine=document.createElement('div');audioLine.className='tc-audio-label'+(audio.ua?' is-ua':'');audioLine.textContent='♫ '+(audio.languages&&audio.languages.length?audio.languages.join(' / '):'Аудіо не визначено');audioBlock.appendChild(audioLine);
        var voice=(row._shVerifiedStudios||[]).join(', ')||(parsed.voiceover!=='Невідомо'?parsed.voiceover:'');
        if(voice||parsed.voiceoverType){var v=document.createElement('div');v.className='tc-voice';v.setAttribute('data-ctr-role','studio');v.textContent=[parsed.voiceoverType,voice].filter(Boolean).join(' · ');audioBlock.appendChild(v);}
        if(subs.languages&&subs.languages.length){var sub=document.createElement('div');sub.className='tc-subtitles';sub.textContent='CC · '+subs.languages.join(' / ');audioBlock.appendChild(sub);}
        var audioChip=chips.querySelector('.is-audio');if(audioChip)audioChip.remove();
        if(!row.querySelector('.tc-play')){var play=document.createElement('span');play.className='tc-play';play.textContent='▶';play.setAttribute('aria-hidden','true');row.querySelector('.ctr-row').appendChild(play);}
        var quality=row.querySelector('.ctr-quality small');if(quality)quality.textContent=identity.flags.slice(0,2).join(' · ')||(parsed.quality==='2160'?'UHD':parsed.quality==='1080'?'FHD':parsed.quality==='720'?'HD':'');
        if(!row.querySelector('.tc-info')){
            var info=document.createElement('div');info.className='tc-info selector';info.textContent='i';info.setAttribute('role','button');info.setAttribute('aria-label','Інформація про реліз');info.setAttribute('aria-expanded','false');row.querySelector('.ctr-row').appendChild(info);
        }
        var details=row.querySelector('.tc-details');if(!details){details=document.createElement('div');details.className='tc-details';details.hidden=true;row.appendChild(details);}
        // textContent only: release titles and provider fields are untrusted text.
        details.textContent='';var raw=document.createElement('div');raw.className='tc-raw-title';raw.textContent=view.raw;details.appendChild(raw);
        var technical=document.createElement('div');technical.className='tc-technical';
        function section(cls,icon,title,lines){var box=document.createElement('section');box.className='tc-section '+cls;var head=document.createElement('div');head.className='tc-section-head';var glyph=document.createElement('span');glyph.className='tc-section-icon';glyph.setAttribute('aria-hidden','true');glyph.textContent=icon;var label=document.createElement('strong');label.textContent=title;head.appendChild(glyph);head.appendChild(label);box.appendChild(head);lines.filter(Boolean).forEach(function(value){var line=document.createElement('div');line.className='tc-section-line';line.textContent=value;box.appendChild(line);});technical.appendChild(box);}
        section('tc-video','▣','Відео',[(identity.resolution==='2160'?'2160p / 4K':identity.resolution?identity.resolution+'p':''),[identity.releaseType].concat(identity.flags,identity.codec).filter(Boolean).join(' · ')].filter(Boolean));
        section('tc-audio-section','◖','Аудіо',[(audio.languages&&audio.languages.length?audio.languages.join(' / '):'Мови не визначено'),(row._shVerifiedStudios||[]).join(', ')||(parsed.voiceover!=='Невідомо'?parsed.voiceover:'')].filter(Boolean));
        section('tc-subtitle-section','☷','Субтитри',[subs.languages&&subs.languages.length?subs.languages.join(' / '):'Не визначено']);
        var files=source.Files||source.files||[],fileCount=Array.isArray(files)?files.length:Number(source.FileCount||source.file_count)||0;
        section('tc-files-section','▤','Файли',[fileCount?fileCount+' файли':'Кількість не визначено',size?'Загалом · '+size:'',kind==='tv'?identity.coverage:''].filter(Boolean));
        if(view.match&&view.match.reasons&&window.TorrentsRedesign.flag('suspect',true)){var note=document.createElement('div');note.className='tc-match-note';note.textContent='Перевірте відповідність · '+view.match.reasons.join(' · ');details.appendChild(note);}
        details.appendChild(technical);
        return view;
    }
    function installStyle(){if(document.getElementById('torrent-cinema-style'))return;var node=document.createElement('style');node.id='torrent-cinema-style';node.textContent=CINEMA_CSS;document.head.appendChild(node);}
    function create(pane,page) {
        installStyle();var open=false,scrolls=[],origin=null;pane.dataset.state='closed';
        pane.classList.add('sh-torrent-overlay');pane.hidden=true;pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');document.body.appendChild(pane);page.classList.add('sh-overlay-mode');
        return {
            isOpen:function(){return open;},
            open:function(){
                if(open)return;open=true;pane.dataset.state='opening';
                origin=page.querySelector('.view--torrent.focus')||page.querySelector('.view--torrent:not(.hide)');
                scrolls=Array.from(page.querySelectorAll('.scroll')).concat(document.scrollingElement||[]).map(function(n){return {node:n,top:n.scrollTop,left:n.scrollLeft};});
                var styles=getComputedStyle(page);['--sm-accent','--sm-accent-rgb','--sm-accent2','--sm-accent2-rgb','--sm-accent-ink'].forEach(function(k){pane.style.setProperty(k,styles.getPropertyValue(k));});pane.hidden=false;
            },
            close:function(restore){if(!open)return;open=false;pane.dataset.state='closed';pane.hidden=true;if(restore){if(origin&&origin.isConnected)Lampa.Controller.collectionFocus(origin,page);scrolls.forEach(function(s){s.node.scrollTop=s.top;s.node.scrollLeft=s.left;});}},
            destroy:function(){open=false;pane.remove();page.classList.remove('sh-overlay-mode');scrolls=[];origin=null;}
        };
    }

return {installStyle:installStyle,create:create,key:key,session:session,releaseView:releaseView,releaseIdentity:releaseIdentity,coverage:coverage,decorate:decorate};
}
