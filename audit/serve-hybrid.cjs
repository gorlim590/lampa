'use strict';
// Local desktop preview only. Exposes exactly one public JS asset on loopback.
const http=require('http'),fs=require('fs'),path=require('path');
const file=path.resolve(__dirname,'../ui/stremio-hybrid.js');
const server=http.createServer((req,res)=>{
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Private-Network':'true','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'});return res.end();}
 if(!['GET','HEAD'].includes(req.method)||req.url.split('?')[0]!=='/stremio-hybrid.js'){res.writeHead(404,headers);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(503,headers);return res.end();}res.writeHead(200,{...headers,'Content-Type':'application/javascript; charset=utf-8','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);});
});
server.on('error',e=>{console.error(e.message);process.exit(1);});
server.listen(8766,'127.0.0.1',()=>console.log('Hybrid preview: http://127.0.0.1:8766/stremio-hybrid.js (loopback only)'));
