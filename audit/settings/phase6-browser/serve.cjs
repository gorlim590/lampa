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
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const branchSha = git(['rev-parse', 'HEAD']);
const relativeAssets = [...new Set([...files.values()].map(filename => path.relative(root, filename)))];
const committedHashes = new Map();
for (const relative of relativeAssets) {
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Asset escaped checkout');
    const status = git(['status', '--porcelain', '--untracked-files=all', '--', relative]);
    if (status) throw new Error('Refusing dirty served asset: ' + relative);
    const committed = execFileSync('git', ['show', branchSha + ':' + relative], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    const working = fs.readFileSync(path.join(root, relative));
    if (!committed.equals(working)) throw new Error('Working asset differs from commit: ' + relative);
    committedHashes.set(relative, sha(committed));
}
function currentCheckoutMismatch(onlyRelative) {
    try {
        if (git(['rev-parse', 'HEAD']) !== branchSha) return ['HEAD'];
        const assets = onlyRelative ? [onlyRelative] : relativeAssets;
        const dirty = git(['status', '--porcelain', '--untracked-files=all', '--', ...assets]);
        if (dirty) return ['dirty allowlisted asset'];
        return assets.filter(relative => {
            const current = fs.readFileSync(path.join(root, relative));
            return sha(current) !== committedHashes.get(relative);
        });
    } catch { return ['checkout verification failed']; }
}
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
    const filename = files.get(pathname);
    const mismatch = currentCheckoutMismatch(filename ? path.relative(root, filename) : undefined);
    if (mismatch.length) {
        const body = Buffer.from(JSON.stringify({ ok: false, branchSha, stale: true, mismatch }));
        res.writeHead(409, { ...headers, 'Content-Type': 'application/json', 'Content-Length': body.length });
        return res.end(req.method === 'HEAD' ? undefined : body);
    }
    if (pathname === '/health') {
        const body = Buffer.from(JSON.stringify({ ok: true, branchSha, allowedAssets: files.size }));
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json', 'Content-Length': body.length });
        return res.end(req.method === 'HEAD' ? undefined : body);
    }
    if (!filename) { res.writeHead(404, headers); return res.end(); }
    fs.readFile(filename, (error, data) => {
        if (error) { res.writeHead(503, headers); return res.end(); }
        const relative = path.relative(root, filename);
        if (sha(data) !== committedHashes.get(relative) || currentCheckoutMismatch(relative).length) {
            res.writeHead(409, { ...headers, 'X-Phase6-Source-SHA': branchSha });
            return res.end();
        }
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
