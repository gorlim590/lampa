# lampa — плагіни

Цей репозиторій зібраний як колекція Lampa-плагінів, розділених за функціональністю, а не за авторами або legacy-структурою `third-party`.

## Основні категорії

- `trakt/` — Trakt, синхронізація, watchlist і social metadata
- `ui/` — інтерфейс, стилізація карток, кнопок і статусів
- `filters/` — фільтри, сортування, приховування контенту
- `media/` — метадані, рейтинги, профілі, студії та серіони
- `providers/` — TMDB/network integrations, провайдери, трекінг
- `community/` — плагіни для спільноти, нових категорій, імпортів
- `localization/` — локалізація/переклад

## Унікальні назви плагінів

Усі назви файлiв зроблені короткими і описовими: вони вказують саме на функціональність, а не на автора або папку-оригінал.

### UI
- `ui/interface-plus.js`
- `ui/cardify-plus.js`
- `ui/design-optimized.js`
- `ui/poster-status.js`
- `ui/tv-status.js`
- `ui/cardify.js`

### Filters
- `filters/trash-filter.js`
- `filters/content-hider.js`
- `filters/search-sanitizer.js`
- `filters/source-sort.js`
- `filters/anti-dmca.js`
- `filters/lampac-source-filter.js`

### Media
- `media/seasons-info.js`
- `media/average-rating.js`
- `media/custom-favorites.js`
- `media/studio-picks.js`
- `media/profiles-plus.js`

### Providers
- `providers/tmdb-networks.js`
- `providers/tracks-probe.js`
- `providers/ts-tracks.js`
- `providers/bandera-online.js`
- `trakt/trakt.js`
- `trakt/trakt-plus.js`
- `trakt/community-watches.js`

### Community
- `community/community-watches.js`
- `community/hikka.js`
- `community/nightingale.js`
- `community/imdb-trailers.js`
- `community/new-category.js`
- `community/lparty.js`

## Legacy remark

`third-party/` зберігається лише як історичний mirror. Активна структура проекту — в функціональних каталогах вище. Усі статті/README у legacy-каталозі очищені від попередніх посилань на власників файлів.
