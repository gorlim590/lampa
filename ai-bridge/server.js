#!/usr/bin/env node
'use strict';

// Minimal authenticated bridge. No shell execution and no automatic repository writes.
// Node.js 20+, no third-party dependencies required.
const http = require('node:http');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || '';
const MAX_BODY = 256 * 1024;

if (BRIDGE_TOKEN.length < 32) {
    console.error('Set BRIDGE_TOKEN to a random secret of at least 32 characters.');
    process.exit(1);
}

function json(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });
    res.end(body);
}

function authorized(req) {
    const header = req.headers.authorization || '';
    const supplied = header.indexOf('Bearer ') === 0 ? header.slice(7) : '';
    const a = Buffer.from(supplied);
    const b = Buffer.from(BRIDGE_TOKEN);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (Buffer.byteLength(body) > MAX_BODY) {
                reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch (_) { reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 })); }
        });
        req.on('error', reject);
    });
}

let latestReport = null;
let latestReceivedAt = null;

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Max-Age': '600'
        });
        return res.end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, { ok: true, service: 'lampa-ai-bridge', version: '0.1.0' });
    }

    if (!authorized(req)) return json(res, 401, { error: 'Unauthorized' });

    if (req.method === 'POST' && url.pathname === '/api/diagnostics') {
        try {
            const report = await readBody(req);
            if (!report || report.schema !== 'lampa-ai-diagnostics/v1') {
                return json(res, 400, { error: 'Unsupported diagnostics schema' });
            }
            // Store only the latest report in memory. No persistent logs by default.
            latestReport = report;
            latestReceivedAt = new Date().toISOString();
            return json(res, 202, { accepted: true, receivedAt: latestReceivedAt });
        } catch (err) {
            return json(res, err.statusCode || 400, { error: err.message || 'Bad request' });
        }
    }

    if (req.method === 'GET' && url.pathname === '/api/diagnostics/latest') {
        return latestReport
            ? json(res, 200, { receivedAt: latestReceivedAt, report: latestReport })
            : json(res, 404, { error: 'No report received yet' });
    }

    return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
    console.log('Lampa AI Bridge listening on http://' + HOST + ':' + PORT);
    console.log('Bind to localhost behind HTTPS reverse proxy; do not expose directly to the internet.');
});
