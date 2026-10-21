# lampa — плагіни

Цей репозиторій зібраний як колекція Lampa-плагінів, розділених за функціональністю, а не за авторами або legacy-структурою third-party.

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
- media/profiles-plus.js

### Trakt / Providers
- trakt/trakt.js
- trakt/trakt-plus.js
- trakt/community-watches.js
- providers/tmdb-networks.js
- providers/tracks-probe.js
- providers/ts-tracks.js
- providers/bandera-online.js

### Community
- community/community-watches.js
- community/hikka.js
- community/nightingale.js
- community/imdb-trailers.js
- community/new-category.js
- community/lparty.js

## Рекомендований порядок і сумісність UI

Плагіни підключаються вручну в налаштуваннях Lampa; репозиторій не має єдиного runtime-завантажувача, який міг би примусово гарантувати порядок. Використовуй цей порядок як базову конфігурацію:

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

## Seasons Info

info/seasons-info.js і media/seasons-info.js залишені як сумісні точки входу для старих налаштувань. Обидві завантажують одну реалізацію third-party/ko31k/SeasonsInfo.js, тож логіку плагіна не потрібно підтримувати в двох копіях. Є глобальний guard, який запобігає повторній ініціалізації.

## Структура third-party

Гілка third-party — це не лише архів: частина плагінів у функціональних папках є завантажувачами файлів звідти. Перед перейменуванням або видаленням таких файлів перевіряй, чи є на них активні URL-посилання.
