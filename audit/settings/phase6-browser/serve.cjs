'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const preview = path.join(__dirname, 'preview-loader.js');
const manifest = path.join(__dirname, 'manifest.json');
const assetPaths = [
    'ui/stremio-hybrid.js', 'ui/settings-hub.js', 'ui/torrent-overlay.js',
    'trakt/trakt.js', 'trakt/trakt-plus.js', 'ui/interface-plus.js', 'ui/design-optimized.js',
    'media/average-rating.js', 'ui/cardify-plus.js', 'plugins-to-enable/home-history.js',
    'torrents-redesign.js', 'providers/parsers.js', 'localization/translate.js',
    'ui/screensaver-plus.js', 'community/new-category.js'
];
const files = new Map([
    ['/preview-loader.js', preview], ['/manifest.json', manifest],
    ['/stremio-hybrid.js', path.join(root, 'ui/stremio-hybrid.js')],
    ['/settings-hub.js', path.join(root, 'ui/settings-hub.js')],
    ['/torrent-overlay.js', path.join(root, 'ui/torrent-overlay.js')],
    ...assetPaths.map(name => ['/' + name, path.join(root, name)])
]);
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const branchSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'X-Phase6-SHA256, X-Phase6-Source-SHA',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
};

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end(); }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, headers); return res.end(); }
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (pathname === '/health') {
        const body = Buffer.from(JSON.stringify({ ok: true, branchSha, allowedAssets: files.size }));
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json', 'Content-Length': body.length });
        return res.end(req.method === 'HEAD' ? undefined : body);
    }
    const filename = files.get(pathname);
    if (!filename) { res.writeHead(404, headers); return res.end(); }
    fs.readFile(filename, (error, data) => {
        if (error) { res.writeHead(503, headers); return res.end(); }
        res.writeHead(200, {
            ...headers,
            'Content-Type': pathname.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/javascript; charset=utf-8',
            'Content-Length': data.length,
            'X-Phase6-SHA256': sha(data),
            'X-Phase6-Source-SHA': branchSha
        });
        res.end(req.method === 'HEAD' ? undefined : data);
    });
});
server.on('error', error => { console.error('Phase 6 loopback server failed:', error.code || error.name); process.exitCode = 1; });
server.listen(8766, '127.0.0.1', () => console.log(JSON.stringify({ ready: true, port: 8766, branchSha, assetCount: files.size })));
