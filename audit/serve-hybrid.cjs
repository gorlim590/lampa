'use strict';
// Local desktop preview only. Explicit public source whitelist, loopback binding unchanged.
const http=require('http'),fs=require('fs'),path=require('path');
const assets={'/media/ua-comments.js':'media/ua-comments.js','/stremio-hybrid.js':'ui/stremio-hybrid.js','/providers/parsers.js':'providers/parsers.js','/media/custom-favorites.js':'media/custom-favorites.js','/ui/screensaver-plus.js':'ui/screensaver-plus.js','/ui/interface-plus.js':'ui/interface-plus.js','/media/average-rating.js':'media/average-rating.js','/preview-loader.js':'audit/preview-loader.js'};
const server=http.createServer((req,res)=>{
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Private-Network':'true','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'});return res.end();}
 const resource=req.url.split('?')[0],asset=Object.prototype.hasOwnProperty.call(assets,resource)?assets[resource]:null;
 if(!['GET','HEAD'].includes(req.method)||!asset){res.writeHead(404,headers);return res.end();}
 fs.readFile(path.resolve(__dirname,'..',asset),(err,data)=>{if(err){res.writeHead(503,headers);return res.end();}res.writeHead(200,{...headers,'Content-Type':'application/javascript; charset=utf-8','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);});
});
server.on('error',e=>{console.error(e.message);process.exit(1);});
server.listen(8766,'127.0.0.1',()=>console.log('Hybrid preview: http://127.0.0.1:8766/stremio-hybrid.js (loopback only)'));
