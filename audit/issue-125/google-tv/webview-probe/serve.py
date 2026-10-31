"""Controlled Android WebView fixture; production helpers unchanged, API transport mocked."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse, hashlib, json
root = Path(__file__).resolve().parents[4]
assets = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=18766)
parser.add_argument('--output', default='/tmp/issue125-webview-events.jsonl')
args = parser.parse_args()
def scripts():
    original = (root / 'trakt/trakt.js').read_text()
    hook = (assets / 'hook.js').read_text()
    modified = original.replace('  if (!window.plugin_trakt_ready) {', hook + '\n  if (!window.plugin_trakt_ready) {', 1)
    return original.encode(), modified.encode()
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/trakt-instrumented.js': body = scripts()[1]; kind = 'application/javascript'
        elif path == '/metadata':
            a,b = scripts();body = json.dumps({'source_sha256':hashlib.sha256(a).hexdigest(),'served_sha256':hashlib.sha256(b).hexdigest(),'instrumentation':'hook.js; API transport mocked; startup suppressed'}).encode();kind='application/json'
        elif path == '/': body=(assets/'index.html').read_bytes();kind='text/html; charset=utf-8'
        else: self.send_error(404);return
        self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def do_POST(self):
        if urlsplit(self.path).path != '/events': self.send_error(404);return
        body=self.rfile.read(min(int(self.headers.get('Content-Length','0')),65536))
        json.loads(body)
        with open(args.output,'ab') as f:f.write(body+b'\n')
        self.send_response(204);self.end_headers()
HTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
