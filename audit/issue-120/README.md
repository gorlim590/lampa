# Issue #120 acceptance evidence

Product/test source revision: `4e5f594e0135597aa396441b04c1c5aa00994474`, based on main `901eef3`. Subsequent evidence commits do not change the tested product sources. Draft PR #124; not merged or deployed.

142 targeted tests PASS. Repository syntax/manifest/URL checks, canonical artifact freshness and diff checks PASS.

| Scenario | Cold requests | Peak concurrent | First result | Settled | Warm extra requests |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3 endpoints, deterministic fake clock | 3 | 3 | 20 ms simulated | 20 ms simulated | 0 |
| 6 endpoints, deterministic fake clock | 6 | 4 | 20 ms simulated | 20 ms simulated | 0 |
| 17 endpoints, deterministic fake clock | 17 | 4 | 20 ms simulated | 20 ms simulated | 0 |
| Actual Lampa standalone, HTTP fixtures | 6 | 4 | 279 ms | 2031 ms | not separately timed |
| Actual Lampa Hybrid, HTTP fixtures | 6 | 4 | 277 ms | 2026 ms | not separately timed |

Both browser scenarios PASS: fast results before slow first endpoint; one HTTP503; three responding endpoints share a BTIH; three final distinct torrents; native controller row focus retained; Info expansion/Back; native row OK → Files template/modal using fixture transport → Back returns to overlay; D-pad; final Back closes overlay. Each actual row is asserted to carry the requested fixture's exact raw release title. No live parser response or playback is claimed.

- [Standalone report](browser-standalone.json), [screenshot](standalone.png)
- [Hybrid report](browser-hybrid.json), [screenshot](hybrid.png)

Reports contain only numbered synthetic sources, source hashes/byte sizes, safe state codes and counts. Exact changed JS is routed or evaluated in the existing authorized Lampa tab. Local source hashes identify the artifact, not an old published main file. Shadow Web Storage isolates configuration/account writes; routes/preloads are removed and the original URL restored in finally. Browser/profile/context remain running.

An earlier Hybrid harness attempt clicked the previous activity before the fixture Details runtime attached and opened native torrents instead of the overlay. It is not acceptance evidence. The harness now waits for the exact active fixture ID and its attached `sh-has-streams` owner; final reports above are fresh successful runs after that correction.

NOT TESTED: real endpoint credentials/health/CORS, live TorrServer, downloads/playback, physical Google TV. Browser matrix uses six endpoints; 3/17 endpoint counts and cache/migration/timeout cases are deterministic unit coverage. See [implementation and rollback](../../docs/issue-120-multi-parser.md).
