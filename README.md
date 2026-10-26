# lampa — плагіни

Цей репозиторій зібраний як колекція Lampa-плагінів, розділених за функціональністю, а не за авторами або legacy-структурою third-party.

## Швидкий старт: loader.js

Найпростіше підключити лише один файл — `loader.js`. Він вантажить плагіни по черзі у правильному порядку (Trakt → Trakt+ → torrent aliases → Interface+ → YDesign → Average Rating (пункт «OMDB & MDBList» в меню «Інтерфейс») → Cardify+ → переклад), не зупиняється на помилці окремого плагіна й додає `?v=` до URL, щоб ТВ не тримав старий кеш.

- Змінити список: `window.LAMPA_PLUGINS_LIST = ['ui/design-optimized.js', ...]` до підключення loader або `Lampa.Storage` ключ `gl_loader_plugins` (шляхи через кому).
- Скинути кеш після оновлення: змінити `window.LAMPA_PLUGINS_VERSION`.
- Інша адреса репозиторію (дзеркало): `window.LAMPA_PLUGINS_BASE`.
- Не підключай окремо ті самі плагіни ще раз — глобальні guard-и захищають від подвійної ініціалізації, але зайве навантаження лишається.

## TMDB-ключ

Плагіни більше не містять вшитих запасних TMDB-ключів: використовується ключ самої Lampa (`Lampa.TMDB.key()`) або ключ, який користувач вказав у налаштуваннях Interface+. Рейтинги OMDb/MDBList у YDesign працюють лише після введення власних ключів у його налаштуваннях.

## Основні категорії

- trakt/ — Trakt, синхронізація, watchlist і social metadata
- ui/ — інтерфейс, стилізація карток, кнопок і статусів
- filters/ — фільтри, сортування, приховування контенту
- info/ та media/ — інформаційні блоки, метадані, рейтинги, профілі й студії
- providers/ — TMDB/network integrations, провайдери, трекінг
- community/ — плагіни спільноти, категорії та імпорти
- localization/ — локалізація/переклад

## Каталог плагінів

### UI
- ui/interface-plus.js
- ui/cardify-plus.js
- ui/design-optimized.js
- ui/poster-status.js
- ui/tv-status.js
- ui/buttons-plus.js
- ui/menu-hide.js
- ui/series-progress-fix.js
- ui/cardify.js

### Filters
- filters/trash-filter.js
- filters/content-hider.js
- filters/hide-content.js
- filters/search-sanitizer.js
- filters/source-sort.js
- filters/anti-dmca.js
- filters/lampac-source-filter.js

### Media / Info
- info/seasons-info.js
- media/seasons-info.js
- media/average-rating.js
- media/custom-favorites.js
- media/studio-picks.js

### Trakt / Providers
- trakt/trakt.js
- trakt/trakt-plus.js
- trakt/community-watches.js
- providers/tmdb-networks.js
- providers/tracks-probe.js
- providers/ts-tracks.js
- providers/bandera-online.js
- providers/parsers.js
- providers/torrent-search.js — обмежений пошук за перевіреними UA/EN/romaji/original/RU назвами; без зміни мови UI
- providers/tryzub-tv.js

### Community
- community/community-watches.js
- community/hikka.js
- community/imdb-trailers.js
- community/new-category.js
- community/lparty.js
- community/vinyl.js

## Рекомендований порядок і сумісність UI

Плагіни підключаються через `loader.js` або вручну в налаштуваннях Lampa. Loader послідовно виконує свій список; ручні та додаткові підключення можуть змінювати фактичний порядок. Використовуй цей порядок як базову конфігурацію:

1. trakt/trakt.js — базовий Trakt.
2. trakt/trakt-plus.js — надбудова, яка прямо вимагає базовий Trakt раніше.
3. ui/interface-plus.js — додаткові параметри інтерфейсу.
4. ui/design-optimized.js (YDesign) — основний візуальний шар карток і бейджів; завантажувати після Interface+, щоб стилі YDesign застосовувалися поверх.
5. Додаткові плагіни лише за потреби.

| Плагін | Що врахувати |
| --- | --- |
| YDesign + Interface+ | Можна тестувати разом, але обидва мають функції рейтингів і статусів. Якщо бачиш дублікати на картках/деталях, вимкни в Interface+ показ рейтингу на картках і/або статусів; залиш їх у YDesign як основному візуальному шарі. |
| Cardify+ (ui/cardify-plus.js) | Перебудовує екран деталей і використовує власний клас .cardify. Підключай після основних UI-плагінів і перевіряй екран деталей та керування пультом. |
| Cardify (ui/cardify.js) | Альтернативна реалізація Cardify з іншого джерела. Не підключай одночасно з Cardify+, доки не перевіриш, що обидва не перезаписують розмітку/стилі екрана деталей. |
| Poster Status (ui/poster-status.js) | Додає власні статусні елементи на картки. Перевіряй окремо від YDesign, якщо статуси дублюються або перекривають постер. |
| TV Status (ui/tv-status.js) | Перефарбовує статус серіалу на сторінці деталей. Це окрема вузька функція; не потрібна, якщо вона вже коректно реалізована обраним UI-плагіном. |
| Average Rating (media/average-rating.js) | Додає додаткові рейтингові дані. Якщо з’являються повторні рядки рейтингів, перевір його разом із рейтингами YDesign та Cardify+. |

### Як тестувати комбінації

Після зміни порядку перезапусти Lampa і перевір: головну сторінку, картки фільмів/серіалів/аніме, екран деталей, статуси, рядки рейтингів і навігацію пультом. Якщо щось зламалось, вимикай по одному плагіну — так можна знайти джерело конфлікту. Ці рекомендації базуються на перетині коду й селекторів; вони не замінюють тестування на конкретному TV/TV Box.

## Де лежить код плагінів

Увесь код плагінів лежить у файлах відповідних категорій (ui/, filters/, media/, providers/, community/, trakt/, localization/). Окремої папки third-party/ більше немає, а файли в категоріях — це самі плагіни, а не завантажувачі. Оновлювати код треба саме там.

Сумісні точки входу для старих налаштувань (одна реалізація, другий файл лише підтягує її):

- info/seasons-info.js → media/seasons-info.js. З коду прибрано перевірку «скрипт завантажено з адреси з ko31k», бо після перенесення вона вимкнула б плагін.
- filters/content-hider.js → filters/hide-content.js. Глобальний guard захищає від повторної ініціалізації, але достатньо підключити один із двох.

media/custom-favorites.js містить обидві збірки (для Lampa з app_digital >= 300 і старіших) і вибирають потрібну під час запуску. Розширення подій картки (listener-extensions) вбудоване в media/custom-favorites.js.

plugins.json у корені — список плагінів із адресами на файли в категоріях. Автори та ліцензії — у NOTICE.md та licenses/.

> Старі URL виду `.../lampa/third-party/...` більше не працюють. Якщо Lampa на якомусь пристрої ще підключає плагіни за такими адресами, замінюй їх на шляхи з plugins.json.


## Оновлення карток і торентів

- TraktTV+: «Подібні (Trakt)» розміщено після колекції та перед рекомендаціями TMDB, із кнопкою «Ще». Окрема кнопка вгорі доступна як альтернатива при вимкненому рядку.
- На головній додано «Популярні корейські дорами» з Trakt: тільки ігрові серіали Південної Кореї корейською мовою; аніме та інші країни виключено.
- YDesign показує українську текстову назву над роком, оцінками й жанрами незалежно від логотипа та завантажує позначки видимих карток у фоні. Дані колекцій кешуються; одночасні запити до тієї самої колекції об'єднуються. «Продовження» також враховує перегляд попередніх частин у Trakt.
- Попередні додані оформлення торентів із Interface+ прибрано. Новий окремий плагін [Torrents Cinema](TORRENTS-REDESIGN.md) — кінематографічна сторінка без окремого постера, адаптивний акцент, компактні рядки та керування пультом. Підключається одним URL [torrents-redesign.js](https://gorlim590.github.io/lampa/torrents-redesign.js), не входить до loader.
- Посилання UA Comments у каталозі замінене на HTTPS-дзеркало тієї самої реалізації. Доступність окремих сайтів і проксі впливає на кількість коментарів.

## Пошук аніме та дорам — Issue #16

`providers/torrent-search.js` входить до стандартного loader і керованого `plugins.json`. Після основного запиту він перевіряє релевантність та за потреби виконує до двох послідовних alias-запитів. Локальні translations/alternative_titles мають пріоритет; додаткові метадані читаються лише за потреби. [Алгоритм, приклади, тести й обмеження](docs/issue-16-torrent-search.md). Для власного `gl_loader_plugins`/окремих URL додайте цей модуль один раз перед Torrents Cinema/Hybrid; інші налаштування не змінюються.

## Робота з AI coding agents

Почніть із [AGENTS.md](AGENTS.md). [Архітектура](docs/ARCHITECTURE.md), [цільові перевірки](docs/TESTING.md) та [сумісність](docs/PLUGIN_COMPATIBILITY.md) замінюють повторний повний аудит. Три спеціалізовані Skills розміщені в `.agents/skills/`; Claude Code отримує спільні правила через `CLAUDE.md`. Історичні звіти прив’язані до своїх SHA й не доводять поточний стан іншої гілки.
