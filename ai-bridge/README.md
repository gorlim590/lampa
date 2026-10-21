# Lampa AI Bridge (prototype)

This prototype is deliberately read-only: it receives a sanitized runtime report from the Lampa plugin and exposes the latest report to an authenticated operator. It does **not** execute shell commands, call AI providers, edit files, or create pull requests yet.

## Architecture

- `ai/diagnostics.js`: read-only collector for Google TV / Android TV. It records runtime errors and a small allowlist of plugin flags. It does not read local storage, Trakt credentials, or API keys.
- `ai-bridge/server.js`: Node.js 20+ HTTP service with bearer authentication, body-size limits, timing-safe token comparison, and in-memory report storage.
- Future phase: provider adapters for OpenAI, Anthropic, and Gemini; test runner; allowlisted patch generation and draft PR creation. Model credentials must live on the bridge, never in the TV plugin.

## Install on the VPS

1. Use Node.js 20+.
2. Generate a token, for example `openssl rand -hex 32`.
3. Run the service with environment variables; keep it bound to localhost behind an HTTPS reverse proxy.
4. Configure the plugin after it loads:

```js
LampaAIDiagnostics.configure({
  bridgeUrl: 'https://YOUR-BRIDGE-HOST',
  bridgeToken: 'YOUR_BRIDGE_TOKEN'
});
```

Do not put a real token in a public plugin file or commit it to GitHub. For an initial smoke test, open the TV's developer console if available and run:

```js
LampaAIDiagnostics.collect()
LampaAIDiagnostics.exportReport()
LampaAIDiagnostics.sendReport()
```

`exportReport()` returns JSON and attempts clipboard copy where supported. Clipboard support varies on Android TV.

## Endpoints

- `GET /health` — public health check.
- `POST /api/diagnostics` — bearer-authenticated report ingestion.
- `GET /api/diagnostics/latest` — bearer-authenticated retrieval of the latest report.

Reports are held in memory and disappear when the process restarts. Put the service behind HTTPS, configure firewall rules, and use a unique token. Do not expose the raw Node port to the internet.

## Current limitations

The prototype does not provide a UI button yet because Lampa settings APIs vary between builds and must be confirmed on the target app. It also does not claim to remotely control navigation or test rendering on the Google TV Streamer. Those require a separate Android/ADB test runner or a TV-side UI integration.

## Validation

Run `node --check ai-bridge/server.js` and `node --check ai/diagnostics.js`.
