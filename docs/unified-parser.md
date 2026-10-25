# Unified Lampa Parser (VPS-only transport)

Plugin: `providers/unified-parser.js`. It replaces torrent **search transport** at `Lampa.Parser.get`, while retaining the native torrent list, torrent selection, and TorrServer playback. It does not use Jackett, Prowlarr, public JacRed, or TorrServer search as fallbacks.

## Set up

1. Publish the **existing** VPS `/api/search/unified` endpoint behind HTTPS (a reverse proxy is recommended). Confirm that it is reachable from Google TV, returns JSON, and permits cross-origin requests from your Lampa origin. Do not expose the current localhost listener `127.0.0.1:8765` as if it were directly reachable on the TV. Protect the API with appropriate access controls/rate limits; do not embed TMDB keys in client-side code.
2. In **Lampa → Extensions**, disable `providers/parsers.js` and `providers/torrent-search.js`. If using `loader.js`, replace its default list via `window.LAMPA_PLUGINS_LIST` or the stored `gl_loader_plugins` override so that these are not loaded. Otherwise competing wrappers will override or retry search.
3. Add the single extension URL from GitHub Pages for the file `providers/unified-parser.js` **only after this branch is merged or deployed**. While testing this branch, serve the branch file from a reachable URL instead.
4. Set the plugin's `unified_parser_url` value to your HTTPS server root (e.g. `https://parser.example.com`). The plugin appends `/api/search/unified`. The `unified_parser_language` default is `all` and optionally `uk`. When Settings API does not expose the input on older Lampa releases, preconfigure `window.LAMPA_UNIFIED_PARSER_URL` before loading or use `Lampa.Storage.set('unified_parser_url', 'https://parser.example.com')` in your own bootstrap.
5. Reload the Lampa app fully to avoid old cached parser wrappers.

## Request / response

- GET `/api/search/unified?q=...&type=...&language=...&limit=100&tmdb_id=...&tmdb_type=tv|movie`
- Content types: `movie`, `series`, `anime` (when TMDB genres show animation and original language is East Asian), or `all`.
- TMDB ID is included only for numeric IDs on TMDB/CUB cards; `tmdb_type` derives from card.
- Expects JSON with `results: []`; adapts title, magnet/download link, source, size, seeders, peers, infohash and available metadata to Lampa's native `Results: []` schema.
- Cached successful responses: 45 seconds, up to 20 entries. Network timeout 12 seconds. No network fallback to old providers, even on errors.
- If `q` or the HTTPS endpoint is unavailable, it does **not** silently use Jackett/Prowlarr.

## Validation and limitations

The backend has been independently smoke-tested in production on the VPS for `The Apothecary Diaries` (TMDB TV 220542) -> 6 Toloka releases, and plain searches for `Монолог травниці`, `The Order`, `Mobland`. Those checks **do not** verify this browser adapter or actual media playback. Test the plugin with the real response schema and TV network before disabling existing extensions permanently.

The backend response's `size` must be in bytes; otherwise normalize its units server-side. Rows without a magnet or download link cannot be played and are intentionally omitted. Preserve UA audio/subtitle fields when available. A page URL is metadata, not always a torrent download URL. Backend control over tracker order remains Toloka first, Mazepa second; this client does not reorder them.

**Do not merge solely on the existence of this file**. Verify public HTTPS, CORS, native component rendering, focus/selection, TorrServer playback and no additional active `Lampa.Parser.get` wrappers, then update the loader/manifest intentionally.
