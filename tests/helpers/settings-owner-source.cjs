'use strict';

function matchingBrace(source, open) {
 let depth=0,quote='',escape=false,lineComment=false,blockComment=false;
 for(let i=open;i<source.length;i++){
  const c=source[i],n=source[i+1];
  if(lineComment){if(c==='\n')lineComment=false;continue;}
  if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++;}continue;}
  if(quote){if(escape){escape=false;continue;}if(c==='\\'){escape=true;continue;}if(c===quote)quote='';continue;}
  if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
  if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c==='{')depth++;
  else if(c==='}'&&--depth===0)return i;
 }
 throw new Error('Unbalanced source block');
}

function extractFunction(source,name,options={}){
 const marker='function '+name+'(';const start=options.last?source.lastIndexOf(marker):source.indexOf(marker);
 if(start<0)throw new Error('Missing owner function '+name);
 const open=source.indexOf('{',start+marker.length),end=matchingBrace(source,open);
 return source.slice(start,end+1);
}

function extractParamRegistration(source,name){
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=new RegExp('(?:name\\s*:\\s*[\'\\"]'+escaped+'[\'\\"]|[\'\\"]name[\'\\"]\\s*:\\s*[\'\\"]'+escaped+'[\'\\"])').exec(source);
 if(!match)throw new Error('Missing registered setting '+name);
 const at=match.index;let start=source.lastIndexOf('Lampa.SettingsApi.addParam(',at);
 if(start<0)start=source.lastIndexOf('add({',at);
 if(start<0)throw new Error('Missing addParam owner call for '+name);
 const open=source.indexOf('{',start),end=matchingBrace(source,open);
 return source.slice(start,end+1);
}

module.exports={extractFunction,extractParamRegistration};
