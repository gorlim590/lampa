# Контрольна точка: продовжити, не починати заново

Робочий каталог `/home/gostrimchik/lampa-testing` НЕ є коренем Git.
Чинний checkout: `audit/stremio-hybrid-20261022/repository`, гілка
`design/stremio-hybrid-x11`. Перевірити `git status --short --branch` і
`git log -6 --oneline` у цьому checkout. Root-файли використовує preview;
після змін синхронізувати лише потрібні product/docs/tests у checkout.

**Остання інструкція користувача:** завершити поточний UA Comments етап,
зберегти локально, не публікувати в main, не витрачати ресурс на повну
матрицю тестування. Попередній дозвіл push/merge відкликано.
Через приблизно 5 годин користувач планує продовжити; автоматичний запуск
або таймер відновлення не налаштований.

## Доставка, дані й обмеження

- Hybrid **2.7.0**, ParserProviders1.0.0, DeviceBookmarks1.0.0,
  Screensaver+2.1.0, локальний UAComments1.0.0.
- `node audit/serve-hybrid.cjs`: існуючий сервер тільки127.0.0.1:8766,
  явний whitelist8 публічних JS. Він уже працює; перевірити перед повторним
  запуском. Після перезапуску ПК запускати вручну. Системних служб немає.
- Звичайний reload поточної вкладки завантажує локальні виправлення без
  Playwright routing. П'ять активних записів registry замінено URLами preview:
  loader/parsers/Custom Favorites/Screensaver/UA Comments. Усього32 записи,
  CommunityWatches status0. Preview-loader замінює тільки Interface+/ratings,
  інші підплагіни зберігають оригінальні джерела й порядок.
- `node audit/use-local-preview.cjs restore` повертає тільки ці URL;
  `apply` застосовує локальну доставку. Backup:
  `backups/integration-followup-20261023/preview-plugin-urls.json`.
  Restore4/apply4 фактично перевірено ДО додавання UA; повний restore5 ще
  не перевірено. Не видавати localhost за опубліковані/доступні TV адреси.
- Chromium тільки поточний CDP9222, вкладка https://siaivo.isroot.in/.
  Не browser.close/newContext/launch, не очищати storage/cookies/profile,
  не читати токени/паролі, не запускати випадкові торренти.
- Фактичний backup користувацьких списків:
  `private-backups/integration-followup-20261023/favorite-before.json`,0600,
  **ПОЗА Git**, не додавати/не віддавати сервером. Відкат tests був точковим,
  початкові списки точно збережені. Решта backup JS/публічних URL не секретні.
- Stremio X11 референси й аудит збережені. Попередній window ID0x06600004
  (decimal106954756 для scrot). Без потреби аудит не повторювати.

## Поточні локальні коміти цього продовження

- `08674e5` scoped native parser switching, Hybrid2.7.0.
- `c50a711` explicit device Favorites, без merge з account/Trakt.
- `992137d` persistent local delivery for patched owners.
- `5b43e06` UA Comments: локальна копія/lifecycle/cache/pagination,13focusedPASS.
- Фінальний docs checkpoint: див. останній git log; робочий стан після нього чистий.

## Стан початкових 15 етапів

| Етап | Що вже зроблено / докази | Що залишилося |
|---|---|---|
| 0. Відновлення й залежності | AUDIT.md, класифікація/знімки source/runtime; поточна гілка збережена | Оновлювати лише змінені факти, не повторювати повний аудит |
| 1. Movie/TV/anime details | Спільна композиція, Cardify/Interface metadata, Oscar6 local SVG; details26 + owner2 + combined9PASS | Реальні мультфільми/нові візуальні побажання; не заявляти завершення всіх медіа |
| 2. Торренти й Files | Native search/clarification child на Full, custom tools, Files skin, однозначні TMDB episode scores; inline10/Files11/parser12PASS | Реальні parser/backend changes, global keyboard E2E, TorrServer/magnet/multifile/player return; IMDb loader1.2 не активний. «Найкращий вибір» зараз badge релізу, НЕ selector mode. Старий Activity/API лишається fallback для неперевірених маршрутів |
| 3. Home | Native continuation третім, late rows/identity/duplicate exact datasets; order10PASS | Account-resolved history порожня, але device history100: вирішити source ambiguity перед реальним continuation. Різні provider datasets не зливати навмання. Slow partNext batches/ratings traffic та card alignment ще не оптимізовані |
| 4. Trakt-first | Наявні Trakt ряди й авторизація збережені | Окремий великий етап ПІСЛЯ критичних маршрутів: офіційні API docs, capabilities/rate limits/cache/list order/catalog/filter fallbacks. Нічого масово не синхронізувати |
| 5. CommunityWatches | Status0 persisted, reload3PASS, інші Trakt ряди працюють | На іншому TV вимкнути окремо; config policy сам не завантажувач |
| 6. UA Comments | Локальна MIT копія pinned mirror, авторство/NOTICE/LICENSE; lifecycle/cache/page scope/40-card pagination/без blur; focused smoke report | Повна live перевірка всіх5 джерел/налаштувань, movie/TV/anime,720/1080/4K, довгий heap/remote navigation відкладені за проханням. Зовнішні APIs/proxies/icons лишилися. Див. audit/ua-comments-20261023 |
| 7. Screensaver+ | Actual native show/resetTimer ownership, destroy resources/cancel late start, rollback;13PASS | Фізичний TV/тривалі повторення. Затримка не відтворилася, speedup не доведено |
| 8. Settings/categories | Чинна functional Hybrid rail збережена | Повний option dependency audit і категоризація не зроблені. «Додати категорії» new-category має реальні provider rows, не видаляти наосліп |
| 9. Header/profile | Native дата/час без нового timer, URL avatar/fallback, transparent controls, reversible;11PASS | Реальний saved avatar/TV input після restart; решта source menus |
| 10. Усі меню/джерела | Основні theme menus/Files/tools узгоджені | BWA, t.me/mmssixxx, online sources й повна cross-page перевірка |
| 11. Favorites | Root cause: account списки порожні, device2book/45wath/100history/132cards. Explicit source selector+native Maker paging+local checkbox;26cycle/8navigationPASS,0remote writes | Визначити бажані правила local/account/Trakt sync окремо; НЕ робити автоматичне злиття. Різні сховища тепер доступні окремо |
| 12. Plugin cleanup | Активні owners визначено; лише явно дозволений CommunityWatches вимкнений | Повний повторний final audit після стабілізації; не видаляти невідомі plugins/metadata/settings |
| 13. TV optimization | Scoped resources, low-cost CSS, bounded UA DOM, native reuse/cache; desktop measurements retained | Немає доведеного Home speedup, FPS/heap на фізичному Google TV BLOCKED; тривале профілювання pending |
| 14. QA | Попередні95PASS; follow-up parser12 + favorites26 + navigation8 + delivery20, окремі звіти | Це fixtures+desktop, не повна гарантія. Фінальна матриця/real playback/TV відкладені; не повторювати пройдене без змін |
| 15. Автономність/checkpoints | Окремі local commits, root/checkout/release docs | Публікацію НЕ робити без нового дозволу; завершити лише наступний пріоритетний стабільний етап |

## Найближчий порядок продовження

1. Прочитати останній UA smoke-report і progress; перевірити branch/log/dirty.
   Не повторювати пройдену матрицю і не підміняти fixtures live-тестами у звітах.
2. Пріоритетні неперевірені критичні шляхи: реальні Files/TorrServer/parser
   і повернення player, коли є контрольоване джерело. Без нього BLOCKED,
   native fallback не видаляти.
3. Home: account/device continuation semantics, таргетоване profiling slow
   batches і нерівних metadata, без queue rewrite без замірів.
4. Settings/categories та source menus. UA live provider checks — за потреби
   без повторного licensing audit. Потім окремий Trakt-first stage.
5. Фізичний TV/публічна доставка лише коли реально доступні й дозволені.

Нових тестів заради кількості не додавати. Після логічного етапу — потрібні
перевірки, CODEX_PROGRESS, sync у checkout, локальний commit.
