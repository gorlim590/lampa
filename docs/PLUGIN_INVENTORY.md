# Мої розширення Lampa — резервний перелік

> **Дата фіксації:** 28 жовтня 2026 р.  
> **Стан:** очікуваний результат після виконаних користувачем команд у консолі Lampa; **повторно не звірено з живою Lampa**.  
> **22 зареєстровані розширення:** 20 увімкнених, 2 вимкнених. Порядок відповідає останньому наданому списку за винятком трьох видалених записів.

Ця таблиця — **статичний знімок** бажаної конфігурації. Вона **не синхронізується автоматично** з налаштуваннями Lampa під час встановлення чи видалення розширень. Актуальний стан пристрою завжди визначається `Lampa.Storage.get('plugins', [])`. URL наведені без параметрів запиту (в них можуть бути персональні дані); це не приватний повний експорт.

| № | Назва в Lampa | URL встановлення (без параметрів запиту) | Статус | Призначення |
|---:|---|---|---|---|
| 1 | Bandera — онлайн | <https://lampame.github.io/main/bo.js> | Увімкнено | Онлайн-джерела Bandera |
| 2 | BWA — онлайн | <http://bwa.ad/rc> | Увімкнено | Онлайн-розширення BWA |
| 3 | LGBT | <https://cub.rip/plugin/lgbt> | Увімкнено | Стороннє розширення (потреба визначається користувачем) |
| 4 | Lampa — головний завантажувач | <https://gorlim590.github.io/lampa/loader.js> | Увімкнено | Автоматичне завантаження Hybrid, YDesign, Trakt та інших модулів |
| 5 | Торренти — система парсерів | <https://gorlim590.github.io/lampa/providers/parsers.js> | Увімкнено | Координатор торрент-парсерів |
| 6 | Обране — власні колекції | <https://gorlim590.github.io/lampa/media/custom-favorites.js> | Увімкнено | Кастомне обране |
| 7 | Коментарі — українські | <https://gorlim590.github.io/lampa/media/ua-comments.js> | Увімкнено | Українські коментарі |
| 8 | Заставка+ — відео, час і погода | <https://gorlim590.github.io/lampa/ui/screensaver-plus.js> | Увімкнено | Screensaver+ |
| 9 | Серіали — інформація про сезони | <https://gorlim590.github.io/lampa/media/seasons-info.js> | Увімкнено | Метадані сезонів |
| 10 | Інтерфейс — приховування меню | <https://gorlim590.github.io/lampa/ui/menu-hide.js> | Увімкнено | Приховування елементів інтерфейсу |
| 11 | TorrServer — аудіодоріжки | <https://gorlim590.github.io/lampa/providers/ts-tracks.js> | Увімкнено | Доріжки TorrServer |
| 12 | Каталог — платформи та студії | <https://gorlim590.github.io/lampa/providers/tmdb-networks.js> | Увімкнено | Категорії платформ і студій |
| 13 | Каталог — фільтр малопопулярного | <https://gorlim590.github.io/lampa/filters/trash-filter.js> | Увімкнено | Фільтрація результатів каталогу |
| 14 | Онлайн — сортування джерел | <https://gorlim590.github.io/lampa/filters/source-sort.js> | Увімкнено | Сортування онлайн-джерел |
| 15 | Онлайн — очищення результатів | <https://gorlim590.github.io/lampa/filters/search-sanitizer.js> | Увімкнено | Очищення онлайн-результатів |
| 16 | Онлайн — фільтр і пошук серій | <https://gorlim590.github.io/lampa/filters/lampac-source-filter.js> | Увімкнено | Пошук та порядок серій в онлайн-джерелах |
| 17 | Каталог — приховування контенту | <https://gorlim590.github.io/lampa/filters/hide-content.js> | Увімкнено | Фільтри та чорний список |
| 18 | TMDb — обробка блокувань | <https://gorlim590.github.io/lampa/filters/anti-dmca.js> | Увімкнено | Обробка заблокованих відповідей TMDb |
| 19 | Деталі — додаткові кнопки | <https://gorlim590.github.io/lampa/ui/buttons-plus.js> | Увімкнено | Додаткові кнопки Details |
| 20 | Головна — історія та продовження | <https://gorlim590.github.io/lampa/plugins-to-enable/home-history.js> | Увімкнено | Continue Watching та History |
| 21 | LParty | <https://nrsua.github.io/lampa-nrs/lparty.js> | Вимкнено | Опціональний LParty |
| 22 | Vinyl | <https://lampame.github.io/main/music.js> | Вимкнено | Опціональний музичний плагін |

## Свідомо видалені 28.10.2026

| Плагін | URL | Причина |
|---|---|---|
| Studio Picks | <https://gorlim590.github.io/lampa/media/studio-picks.js> | Не потрібні додаткові меню студій |
| IMDb Trailers | <https://gorlim590.github.io/lampa/community/imdb-trailers.js> | Не потрібний окремий каталог трейлерів |
| TV Status | <https://gorlim590.github.io/lampa/ui/tv-status.js> | Не потрібне окреме підфарбування статусів серіалів |

## Як відновити

1. У Lampa відкрий **Налаштування → Розширення** і додай URL з таблиці. Для вимкнених розширень після додавання встанови статус **Вимкнено**.
2. `loader.js` сам підключає Hybrid, Interface+, YDesign, Trakt Core/Plus, Torrent Search, Average Rating, Cardify+ і Translate (якщо конфігурацію loader не змінено). Їх відсутність у таблиці **не означає**, що їх треба додавати вдруге.
3. Не реєструй окремо внутрішні файли `ui/torrent-overlay.js` або `torrents-redesign.js`. Після прийняття Issue #117 перевір, чи потрібен окремий канонічний `ui/torrent-cinema.js`, і тоді онови цю таблицю.
4. Для **повного** відновлення особливих URL-параметрів, назв і порядку потрібна окрема приватна резервна копія з Lampa. Не публікуй у GitHub email, токени, cookie та URL із секретними параметрами.

## Оновлення списку

Після будь-яких змін у Lampa цю таблицю потрібно оновити вручну через GitHub або попросити ChatGPT синхронізувати її з новим **санітизованим** виводом `Lampa.Storage.get('plugins', [])`. Сам по собі Markdown-файл не відстежує зміни на телевізорі чи в браузері.
