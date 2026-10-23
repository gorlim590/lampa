# Stremio × Lampa — прогрес

## Етап 1: середовище (2026-10-22)
- Робоча директорія доступна; кореневий `.git` — read-only заглушка, не Git-клон. Буде використано окремий локальний репозиторій доставки.
- XDG_SESSION_TYPE=x11, DISPLAY=:0; wmctrl і xdotool: Cannot open display. Нові скриншоти вікна Stremio — BLOCKED. Безпеку X11 не змінювали. Є наданий раніше stremio-reference/test.png: це весь робочий стіл, частково закритий терміналом; лише допоміжний референс, не нова перевірка.
- CDP активної Lampa доступний через наявний harness; Chromium не закривали й не створювали.
- Підготовлено audit/stremio-hybrid-20261022/browser.cjs, розширено audit/active-session.cjs режимом hybrid. Старий harness збережено у backups/stremio-hybrid-20261022.
- Наступне: резервування сховища, аудит фактичного DOM і UI-плагінів, окрема гілка, реалізація основи.
- Коміт: ще немає, етап інспекції триває.
- Повторна перевірка: X11 і всі відсутні екрани Stremio при доступі з повної локальної сесії.

## Етап 2: X11 та референси — PASS
- X11 доступний, Stremio 0x06600004; CDP доступний, наявна вкладка Siaivo component=main.
- Збережено 7 фактичних скриншотів Stremio в stremio-reference/; аналіз у ANALYSIS.md. Облікові дані та налаштування не змінено, відео не запускалося.
- Перевірено YDesign, Interface+, Cardify+ та DOM активної Lampa. Тема зберігатиме картки YDesign, Trakt і всі категорії; нові data-запити не потрібні.
- Окремий Git-репозиторій: audit/stremio-hybrid-20261022/repository; гілка design/stremio-hybrid-x11. Корінь workspace не є Git-репозиторієм.
- Наступне: ізольована тема, Home і перевірка в активному Chromium.
- Коміт етапу: див. git log (docs: record live Stremio references).

## Етап 3: основа та Home — PASS
- Створено ui/stremio-hybrid.js: CSS під класом body.stremio-hybrid, захист повторного завантаження, перемикач Інтерфейс → Stremio × Lampa, API setEnabled/destroy. Без нових запитів, таймерів, MutationObserver чи обробників на картках.
- Home: видима вузька бічна навігація, статичний фон, шість збагачених вертикальних карток, узгоджені відступи; фокус scale(1.035)/160ms, reduced-motion, без додаткового blur.
- Тести: PASS 720p/1080p/4K геометрія, ArrowRight/ArrowDown, OK відкриває full, Back повертає main. PASS 5 циклів вимкнення/увімкнення: ті самі DOM-картки, 71 елемент метаданих до/після, один style. Нових pageerror: 0.
- Скриншоти та machine-readable звіт: audit/hybrid-results/. Фізичний Google TV і довготривале використання — BLOCKED (не перевірено).
- Виявлено: пункт «Фільтр» відкриває штатну панель пошуку, а не безпосередньо сітку. Наступне: виконати пошук та оформити його справжні контролери.
- Коміт етапу: feat: add isolated Stremio hybrid theme and verified Home.

## Етап 4: Discover, фокус, TV — PASS із зазначеними межами
- Оформлено штатні selectbox/панелі та сітку mapping--grid; Discover використовує «Фільтр» → «Розпочати пошук», без декоративних фільтрів або дублювання пошукової логіки.
- PASS: меню жанрів відкриває реальні значення, пошук відкриває category_full, шість колонок і метадані на 720p/1080p/4K. PASS Right/Down, вертикальне прокручування з видимим фокусом, розгортання sidebar із підписами.
- PASS reduced-motion (transition=0s), один style, нових pageerror=0. Тема не додає мережевих запитів, таймерів, observer або обробників на картках. Наявний lazy rendering та кеш YDesign не змінено.
- Звіт: audit/hybrid-results/p1-report.json. Фізичний пульт, GPU/пам'ять Google TV та тривала сесія — BLOCKED.
- Візуальна відмінність свідома: Lampa зберігає збагачені високі картки та панель фільтрів; правий preview Stremio й три dropdown зверху не копіювалися.
- Коміт: feat: style native Discover grid and verify remote navigation.
- Наступне: чиста повторна ініціалізація, перевірка перемикача налаштувань, документація доставки. Код зараз застосований у поточній вкладці через CDP; публікації немає.

## Етап 5: чистий запуск, налаштування та доставка — PASS
- Виправлено callback перемикача: SettingsApi onChange читає фактичний Storage, без повторного запису неправильного значення. PASS UI вимкнення/увімкнення після reload та один пункт налаштувань.
- PASS незмінність тих самих DOM-карток: 23 рейтинги, 38 жанрових бейджів, 10 UA до/після. PASS повне видалення CSS, повернення hidden sidebar, destroy/reinit, горизонтальний скролінг. Звіти final-report.json і lifecycle-report.json.
- Попередня спроба перевіряла метадані надто рано (до асинхронного YDesign); остаточний тест чекає активні рейтинги. Під час reload було повідомлення про сторонній wtch.ch/m; його не змінювали.
- Порівняння Home/Discover при 1717×1050 збережено. Фінальна вкладка Home відновлена на 1920×1080; Chromium залишено відкритим, профіль/cookies/авторизації не очищено.
- README-stremio-hybrid.md містить обмеження, результати, інструкції запуску/відкату/продовження. audit/preview-hybrid.cjs повторно застосовує тему після reload без закриття браузера.
- Тема застосована локально; постійного URL та публікації немає. Після reload потрібен preview-скрипт. P2 повний редизайн деталей відкладено; відкриття деталей/Back перевірено. Фізичний TV і тривала продуктивність — BLOCKED.
- Коміти: 1bdc8a1 (референси), f533000 (Home), 28a836c (Discover). Фінальний коміт: fix: verify reversible theme settings and document local delivery (hash у git log).
- Наступний крок: фізичний Google TV, перевірка довгих назв/читабельності та профілювання; публікація лише після окремого дозволу. Push/merge не виконувалися.

## Продовження, етап 6: стабільність життєвого циклу — PASS
- Продовжено чисту гілку design/stremio-hybrid-x11 після d4d2d8a. X11/Stremio та CDP/Lampa доступні; повторний повний аудит не виконувався.
- Ініціалізація 1.1.0 використовує штатний Lampa.Listener app/ready; pending listener видаляється після ready або destroy, немає залежності від jQuery для завантаження теми. Параметр налаштувань перевіряється в реєстрі SettingsApi, без додаткового глобального прапорця. Враховано false/0 у збереженому значенні.
- PASS unit перевірки до appready без jQuery, скасування очікування, повторного завантаження, 10 destroy/reinit, одного налаштування й callback. PASS 20 destroy/reinit у справжньому Chromium: один style, один параметр, app listeners 32→32, activity listeners 12→12. +20 DOM script tags належать тестовим ін'єкціям, а не темі.
- Файли: ui/stremio-hybrid.js, audit/hybrid-v2/lifecycle-unit.cjs, stability.cjs/json.
- Відомі незавершені задачі: постійне локальне підключення через штатні Розширення; деталі (довга назва/контраст опису), налаштування, фінальна матриця та інструкція TV. Фізичний TV і довга сесія залишаються BLOCKED.
- Коміт етапу: fix: make hybrid initialization lifecycle safe before app ready (hash у git log).

## Продовження, етап 7: деталі фільмів/серіалів і налаштування — PASS
- Оновлено CSS деталей зі збереженням Cardify+: повна назва без ellipsis, темний фон і контрастна панель опису, стримані округлі кнопки й видимий фокус. Рейтинги, кольорові жанри/тривалість/сезони, прогрес серій та всі провайдерні/Trakt кнопки залишаються штатними. Відтворення та зміни списків Trakt не запускалися.
- Стилізовано заголовки, описи та фокус налаштувань; збережено native SettingsApi. Прибрано stagger-анімації кнопок, використовуються короткі transform/opacity переходи; reduced-motion охоплює меню, кнопки й панелі.
- PASS: фільм із довгою назвою та серіал на 720p/1080p/4K — назви вміщуються, опис не перетинає назву, кнопка у фокусі повністю видима. PASS фокус дій, Back до Home, один перемикач і справжнє UI вимкнення/увімкнення. 12 перевірок, нових pageerror=0.
- Файли: ui/stremio-hybrid.js, audit/hybrid-v2/details-test.cjs, details-report.json, movie/series-{1280,1920,3840}.png, settings-*.png. Вимірювання після resize чекають 800ms на штатний debounce Lampa; ранні проміжні розміри не використовуються як остаточний результат.
- Наступне: штатне підключення локального URL і reload без ін'єкцій, остаточна регресія та інструкція TV. Коміт: feat: finish readable movie and series details with themed settings.

## Продовження, етап 8: native підключення, фінальна регресія, пакет — збережено з BLOCKED
- Локальний сервер audit/serve-hybrid.cjs на 127.0.0.1:8766 віддає виключно ui/stremio-hybrid.js. Через штатні Розширення додано тільки цей URL. PASS native-load.json: HTTP 200 після reload, тема 1.1.0, один style і один параметр; жодного addScriptTag/перехоплення запитів після reload. Сервер потрібно знову запускати після його зупинки/перезапуску ПК; автозапуск ОС не змінено.
- PASS regression.json: 16 перевірок Home/Discover 720p/1080p/4K, стрілки, sidebar, reduced-motion, активні YDesign/Interface+/Cardify+/Trakt+, ті самі вузли/метадані, зелені галочки й затемнення. Після 30 toggle DOM counters 7246→7246, event listeners 2601→2601, heap +7812 bytes після GC; це desktop-зразок, не TV-гарантія.
- Нативні reload перевіряють збережений enabled/disabled стан; окремий reload-report.json. Виявлено, що appready/прапорець YDesign можуть з'явитися до готової Activity; тест чекає Activity. Відновлення URL із settings/select overlay може залишити порожній Home до нової навігації — для чистого сценарію тест закриває налаштування і використовує Home URL. Код ядра й чужі налаштування не змінювалися.
- README-stremio-hybrid.md оновлено: локальне підключення/відкат, інструкція TV після дозволеної публікації, фактичні тести та межі. Пакет release/stremio-hybrid містить JS, інструкцію та SHA256SUMS. Скриншоти й звіти audit/hybrid-v2, нові референси stremio-reference/continued-*.png.
- Завершені коміти: 6cee99a (lifecycle), 47279a0 (деталі/налаштування). Фінальний коміт етапу: test: verify native reload and package hybrid theme for TV review.
- Нових великих змін не починати: візуальний етап завершено, приймання чистого запуску НЕ завершено. Залишилося BLOCKED: фізичний Google TV/пульт/довга сесія; публікація та фактичне встановлення TV потребують окремого дозволу. Стиль Discover використовує справжню панель Lampa, не три dropdown Stremio. Відтворення й записи в Trakt не тестувалися. Push/merge не виконувалися.

### Фінальний блокер чистого запуску — BLOCKED
- Сам плагін після reload присутній: version 1.1.0, enabled=true, один style й один параметр. Ін'єкцій після native reload не було.
- Проте фінальна Activity main залишилася activity--load, cards=0; очікування метаданих закінчилося timeout. Звичайний Home URL, закриття панелей і одна нова native Activity не відновили дані у відведений час. Повторні reload припинено.
- Контроль: StremioHybrid.setEnabled(false) прибрав CSS, native loading та cards=0 залишилися; потім власний enabled повернуто true. Причину не встановлено. Lampa.Listener.send копіює список callbacks перед dispatch — видалення pending listener безпечне.
- Звіти audit/hybrid-v2/reload-report.json, home-reload-blocker.json та final-state.png. Не заявляти повне PASS для clean-load або disabled persistence; попередні успішні native-load/regression/details звіти залишаються фактичними.
- Наступна сесія: почати з діагностики завислого native main (помилки/запити без секретів), не переробляти тему і не повторювати всі скриншоти. Після усунення повторити native enabled/disabled reload, тоді фізичний TV. Публікацію відкладено. Ліміт бережеться: нові великі зміни не починалися.

## Пауза за запитом користувача
- Розробку й діагностику зупинено. Нічого не публікувати та не продовжувати до нового запиту.
- Поточна гілка: design/stremio-hybrid-x11. Завершені коміти продовження: 6cee99a (безпечний lifecycle), 47279a0 (деталі й налаштування), dc6f899 (пакет, native підключення, звіти та блокер).
- Тема 1.1.0 збережена в ui/stremio-hybrid.js, синхронній копії Git-репозиторію та release/stremio-hybrid/. README, SHA256SUMS, скриншоти й звіти збережено. Native extension localhost:8766 додано; локальний preview-сервер залишено запущеним, автозапуск ОС не створювався. Chromium і Stremio не закривалися.
- Готово: візуальна тема Home/Discover, sidebar, фокус/reduced-motion, деталі фільмів/серіалів, налаштування, перевірки сумісності/DOM/lifecycle у Chromium. Дані карток і функції плагінів збережені. Успішні матриці: details-report.json та regression.json.
- НЕ готово: на фінальному reload native Home завис у activity--load, cards=0; це залишилося й без CSS. Причина не встановлена. Повне приймання чистого запуску BLOCKED. Не називати збірку повністю стабільною або перевіреною на TV.
- Після дозволу продовжити: 1) діагностика native Home loading без читання секретів; 2) після усунення — enabled/disabled native reload без ін'єкцій; 3) фізичний Google TV/пульт/довга сесія; 4) публікація тільки після окремого підтвердження. Не повторювати аудит Stremio й завершені візуальні тести без нової причини.
- Push/merge не виконувалися. Джерело пам'яті для наступної сесії: цей файл, README-stremio-hybrid.md та Git log у audit/stremio-hybrid-20261022/repository.

## Відновлення після 77a1d0d: етап 9 — native clean-load PASS
- Пауза знята новим запитом resume. Перевірено гілку design/stremio-hybrid-x11, чистий робочий стан, CDP і локальний сервер HTTP 200. Завершений візуальний аудит не повторювався, код теми 1.1.0 не змінювався.
- Поточний стан перед діагностикою вже був іншим (працював Trakt recommendations). Звичайна native навігація до main завантажила 28 карток, loading=false, нових pageerror=0, pending=0. Агреговані origins/статуси у audit/hybrid-v3/diagnose.json; жодних headers, URL-параметрів чи тіл відповідей не збережено.
- PASS native-reload.json: звичайний чистий Home, reload з enabled=false (11.0s, 28 карток, style=0, один параметр), enabled=true (10.5s, 28 карток, style=1), метадані після запуску (22 рейтинги). Без ін'єкцій/перехоплення відповідей/очищення сховища. Запис звіту поетапний; готовність Activity/даних перевіряється окремо від appready.
- PASS settings-reload.json: один UI-перемикач, reload із відкритими налаштуваннями завантажив Home, Right після повернення працює, один native extension/style/параметр. Загалом 7 нових перевірок PASS. Збережено home-native.png і home-after-settings.png.
- Актуальний критерій чистого завантаження прийнято. Історичний BLOCKED не стерто: його причина не доведена й невідомий баг ядра не оголошується виправленим. При повторенні потрібно фіксувати часову шкалу та знеособлені помилки до навігації/reload; не додавати сліпих retries у тему.
- README та release-інструкція оновлюються відповідно до актуальних результатів. Публікації, push/merge та змін профілю/авторизацій немає. Сервер preview лишається loopback-only, тема enabled=true, Chromium не закривається.
- Наступне: фізичний Google TV/реальний пульт/довга сесія (не перевірені), окремо дозволена публікація й підключення TV. Візуальні деталі, картки та успішні матриці попередніх етапів не переробляти без причини.
- Коміт етапу: test: accept native reload after resuming paused hybrid work (hash у git log).

## Phase 2 / P0 — верхня панель, пошук і навігація: PASS
- Продовжено гілку після 88c89ee; резервні копії ui/README/прогресу — backups/hybrid-phase2. Реальний Stremio доступний через X11; новий phase2-current.png показує актуальні проблеми його віддаленого каталогу Failed to fetch, збережені референси лишаються джерелом композиції.
- Тема 2.0.0: центрована native кнопка пошуку як поле-підказка; «Меню» використовує Lampa.Select та оригінальні native action nodes. Сповіщення/профіль/налаштування/fullscreen/Trakt збережено; невідомі дії без надійної назви не приховуються. Час/дата доступні в меню. Бічна панель темніша, неактивні іконки приглушені, поточний Home підсвічено.
- Виправлено фокус після закриття native Search: оригінальний механізм повертав у контент; тимчасовий Search.close listener повертає до поля, лише якщо пошук відкрито ним. На disable/destroy listeners, кнопка й CSS-маркери очищуються.
- PASS 9 перевірок: геометрія 720p/1080p/4K, склад меню, Back до More, native Settings через переміщену дію, Search Back, disable/reenable. Нових pageerror=0. Скриншоти і p0-report.json в audit/hybrid-phase2.
- Наступне P1: композиція деталей із постером; P2: функціональний двопанельний Settings; P3/P4/P5: пошук/каталог, змінні та регресія.
- Коміт: feat: add compact native header menu and full search field.

## Phase 2 / P1 — композиція деталей із native постером: PASS
- Відкрито фактичні деталі The Kid у Stremio (phase2-movie.png); відео й налаштування не запускалися/не змінювалися. Новий серіальний каталог Stremio частково недоступний; попередні series-details.png використано повторно.
- CSS показує вже наявний native poster, формує композицію poster/metadata/description, зберігає backdrop, усі кнопки/рейтинги/жанри/Trakt та native епізоди. Немає нового постера, запитів чи копій бізнес-логіки. Кнопки можуть переноситися рядками замість приховування.
- PASS 12 перевірок: фільм і серіал у 720p/1080p/4K з видимим постером, повною назвою, без перетину опису, видимою кнопкою фокусу; навігація дій і Back; один settings toggle й відкат. Нових pageerror=0. audit/hybrid-phase2/details-report.json, movie/series-*.png.
- Наступне P2: native SettingsApi у двопанельній оболонці, зі збереженням callback/Back та без дублювання параметрів.
- Коміт: feat: recompose native movie and series details around existing poster.

## Phase 2 / P2 — функціональні двопанельні налаштування: PASS
- Окремий full-screen Settings: 29 категорій із native Main ліворуч, оригінальні параметри SettingsApi праворуч. Категорії викликають вихідні folder callbacks; параметри/значення не копіюються. Native main detach зберігає handlers; перед зміною категорії виконується штатний Back для очищення component/scroll.
- Власний один controller slot sh_settings_nav: Up/Down/OK, Right до параметрів, Left назад, Back через категорії до head. Controller API не має remove, тому disable замінює цей slot маленьким native fallback без посилань на DOM. Rail/capture handlers/rAF/settings listeners видаляються. Нові категорії плагінів підхоплюються зі списку.
- PASS 14 перевірок: усі категорії, 720p/1080p/4K, Left/Right/OK, категорія Interface+, 12 перемикань категорій без приросту update_scroll/open/close listeners, native language picker та Back без зміни мови, theme disable/reenable в Settings і повний Back. Звіт p2-report.json, screenshots p2-*.png. Нових pageerror=0.
- Перевірено native стек шарів: збережено core z-index Settings=20, тому language/select/modal лишаються зверху. Native HoverSwitcher вимикає pointer-events після клавіш; stress маршрутизації категорій використовують DOM click events, TV-переходи — справжні клавіші CDP. Фізичні пульт/миша не заявляються перевіреними.
- Наступне P3: реальний пошук/результати та порожні стани; P4/P5: змінні, додаткові екрани, clean reload і lifecycle stress.
- Коміт: feat: build functional split settings with native parameter components.

## Phase 2 / P3 — пошук, native сітка та порожні стани: PASS
- Стилізовано справжній Search: поле, джерела TMDB/TraktTV, результати, loading/empty, native фільтри. Збережено групи фільмів/серіалів і сторонні джерела.
- Для TMDB додано по одній дії «Сітка результатів» у native рядки фільмів/серіалів. Вона викликає той самий штатний category_full/search/movie або search/tv з page=1; native Sources.select закриває пошук і зберігає історію штатно. Немає окремих запитів/бекенду або підроблених фільтрів. Для сторонніх джерел їхній контракт навігації не змінюється.
- PASS 8 перевірок p3-report.json: «Дюна» повертає movies/series, 16 рейтингів/6 UA/2 watched; поле 720p/1080p/4K; native Controller Down/Right до дії сітки; Enter відкриває першу сторінку grid; реальний пустий запит показує «На ваш запит нічого не знайдено». Нових pageerror=0.
- PASS anime-report.json: «Тоторо» — native animation card (genre id 16), три жанрові бейджі. Пошук підтримує текстове введення; Controller-навігація перевірена окремо від введення в system keyboard. Фізичний TV не тестувався.
- Search sources/finded subscriptions і тимчасові grid actions прибираються при Search.close/disable/destroy, у т.ч. неактивні кешовані roots. Додаткових polling/observer немає.
- Наступне P4/P5: завершити спільні змінні й допоміжні вікна, native reload, stress очищення й пакет 2.0.0.
- Коміт: feat: unify native search and route results into the native catalog grid.

## Phase 2 / P4 — спільні токени та допоміжні екрани: PASS
- Кольори поверхонь/фокусу/тексту, радіуси, відступи й швидкість переходів винесені у --sh-*; native language, modal, notice, select, loading використовують спільну палітру. CSS ізольовано класом теми; blur/backdrop-filter не додано.
- PASS p4-report.json: спільні токени, фактичний native Modal, native language picker без зміни мови, reduced-motion. Скриншоти p4-modal.png/p4-language.png. node --check PASS.
- Наступне P5: lifecycle стрес, штатне завантаження 2.0.0 без ін’єкцій, оновлення пакета/інструкції. Фізичний Google TV лишається неперевіреним.
- Коміт: style: unify design tokens and native auxiliary screens.

## Phase 2 / P5 — регресія, lifecycle та native load 2.0.0: PASS (desktop)
- native-reload.json: 3 PASS без addScriptTag/interception — disabled reload 7.8s, enabled 6.3s, Home 28 карток/23 рейтинги; style 0/1, один параметр. settings-reload.json: 4 PASS — reload із відкритими Settings, Home, Right, один localhost extension/style/параметр. Нових pageerror=0.
- lifecycle.json: 6 PASS. 30 toggle: після GC DOM nodes 3538→3538, listeners 1025→1025. 10 destroy/reinit і duplicate load — без накопичення. Вісім Settings route/exit: update_scroll 0→0; Search open/close subscriptions незмінні, тимчасові дії прибираються. Вихідні card/header nodes збережено.
- regression.json: 17 PASS + 1 BLOCKED hardware. Home/Discover 720p/1080p/4K, Right/Down і видимий фокус/рамка, sidebar, reduced-motion, усі активні UI-плагіни, metadata/UA/зелена галочка/затемнення. P0 повторно 9 PASS; P2 повторно 14 PASS з чистими overlays. Знімки p2-settings-* оновлено: попередній проміжний тест залишав Search/Exit відкритими.
- Виправлено некоректний alpha suffix після CSS var у focus ring: окремий --sh-ring, перевірено computed box-shadow. Спільний --sh-speed використано й для auxiliary controls.
- Тестові виправлення: чекати готову Activity, а не лише appready; Params listener може бути ще не ініціалізований; перед сценарієм закривати попередні native overlays. Ядро/профіль/чужі налаштування не змінювалися.
- BLOCKED: фізичний Google TV, реальний пульт, апаратне профілювання/довга сесія. Playback/серверні записи Trakt не виконувалися; кожен параметр кожного плагіна не змінювався. Частина Stremio catalog fetch недоступна, референси збережено.
- Наступне: синхронізувати README, пакет 2.0.0 та SHA256; остаточна контрольна точка. Push/merge/публікації немає.
- Коміт: test: verify phase two native loading and bounded UI lifecycle.

## Phase 2 — фінальний пакет 2.0.0 та точка продовження
- Завершені локальні коміти: 0586b7c P0, 5798c20 P1, 46ada59 P2, 9eda6e2 P3, 0498d69 P4, 1e33ff8 P5. Фінальний пакет: docs: package phase two hybrid theme and installation guide (hash — git log).
- README-stremio-hybrid.md переписано для 2.0.0: фактичні UI-зміни, native підключення, керування/відкат, обсяг listeners/DOM, інструкція TV та межі перевірок. release/stremio-hybrid синхронізовано з ui/stremio-hybrid.js, SHA256SUMS оновлено.
- Скриншоти/сценарії/JSON: audit/hybrid-phase2; acceptance-summary.json підсумовує звіти. COMPARISON.md містить пари знімків і відмінності від реального Stremio; попередні референси не видалялись.
- Стан: тема enabled=true, один native localhost extension/style/параметр, Home доступний. Chromium та Stremio не закриті, localStorage/cookies не очищувались, плагіни/облікові дані збережені. Сервер 127.0.0.1:8766 лишається локальним preview без автозапуску.
- Доступні етапи Phase 2 завершено й збережено. Наступне: реальний Google TV Streamer 4K/пульт/довга сесія, перевірка усіх потрібних провайдерів і plugin dialogs на пристрої; тільки потім окремо дозволена HTTPS-публікація та встановлення. Desktop 4K не підтверджує апаратну продуктивність TV.
- Не починати аудит заново. За повторного native Home loading зібрати часову шкалу/знеособлені помилки, не додавати сліпі retries. Історична причина невідома; актуальні reload PASS. Push/merge/публікації не виконувалися.

## Movie-only Stremio-first 2.1.0 — завершено (desktop)
- Продовжено поточну гілку після 176bbd4; резервні копії JS/README/прогресу в backups/movie-stremio-first. Інші сторінки не перероблялися.
- Реальний X11 Stremio: The Kid, wheel/Tab, жанр Drama → Discover → Tenzing → Show. Актуальні знімки та 2 side-by-side порівняння: audit/movie-stremio-first/comparison-1.png / comparison-2.png. Той самий Tenzing у Lampa, однакова ширина вихідних знімків 1920; різні кадри native slideshow/локалізована назва зазначені як відмінності.
- Перевірено активні Cardify+/Interface+/YDesign за фактичними script URLs і вихідним кодом; SHA256 й власники DOM — ANALYSIS.md. Cardify примусово переносив опис у right absolute wrapper; Interface+ додає кольорові spans та відкладено міняє кнопки.
- Нова композиція лише full/movie: без великого постера й правої description card, один стек title → компактні native дані → опис → primary та єдиний ряд secondary actions. Native description/status nodes переміщені зі збереженням parents/nextSibling; дані/кнопки не клонуються, їхні handlers лишаються. Незалежний fallback для стандартного native Full template при прямому reload до готовності Cardify.
- Вирішено реальні конфлікти: native hover:focus не bubbles (один capture handler на рядок); Interface+ може залишати FullStart.last на від’єднаній кнопці (відновлюється тільки невалідний фокус). Опис повністю доступний через OK у native Modal; Back повертає фокус. Власний Modal і handlers очищуються при disable/destroy.
- PASS report.json: 13 перевірок — native reload 2.1.0 без ін’єкцій, коротка назва 720p/1080p/4K, ArrowRight/caption, native favorites OK/Back без запису, torrent flow/Back без запуску відео, відкат DOM/CSS, 12 toggle, ті самі metadata/action nodes, reduced-motion. Movie subtree 79→79, full listeners 23→23, activity 9→9, style=1.
- PASS reopen-report.json: 7 — Home без movie scope, чотири Cardify open/Back без дублювання опису/primary/style/own listeners, native Down до нижнього контенту, фінальний Tenzing із Cardify.
- PASS final-validation.json: 7 — повний synopsis OK/Back, disable з Modal, довга назва Spider-Man у 720p/1080p/4K (кнопки в viewport), серіал method=tv з попереднім постером та без movie classes. Нових pageerror=0 у трьох завершених матрицях.
- Короткі одноразові RAF + 180/650ms потрібні для відкладених змін Interface+, скасовуються на переході/disable/destroy; немає MutationObserver/polling. Activity destroy звільняє запис адаптера. Cardify налаштування/чужі handlers не змінювалися.
- README і release/stremio-hybrid синхронізовано на 2.1.0, SHA256SUMS оновлено. Тема enabled=true, фінальна вкладка — Tenzing/Cardify; сервер preview loopback-only, браузер/Stremio не закриті. LocalStorage/cookies/профіль не очищувались. Без push/merge/публікації.
- Межі: фізичний Google TV, реальний пульт і довга сесія BLOCKED; online/trailer playback та записи Trakt/обраного не виконувалися. Збережено оригінальні дії/рейтинги/жанри/UA/status. Stremio Tenzing показує No streams were found; streams pane не підроблялася. Авторський logo-title не додавався, замість нього localized Lampa title. Праві потоки Stremio замінені native діями Lampa; актори/детальні ряди Lampa залишені нижче.
- Коміт етапу: feat: rebuild movie details as a Stremio-first composition (фактичний hash — git log). Наступне: візуальний відгук користувача/фізичний Google TV; не починати аудит або редизайн інших екранів без нового завдання.

## Embedded torrents / audit checkpoint
- Початок після d063d36, гілка design/stremio-hybrid-x11 чиста; backup JS/README/progress у backups/embedded-torrents.
- Реальний Stremio Hope має Torrentio sources: актуальні current/hope-hover/hope-scrolled.png у stremio-reference/streams. Відео не запускалося. Досліджено справжні quality/provider/title/seeds/size/tracker/language rows і scroll.
- Виявлено native Lampa torrents Component з повним Parser/Filter/Torrent/TorrServer/20-row pager. Active TorrentsRedesign 1.1.0; локальна 1.2 audit копія не замінюється. DEPENDENCIES.md описує власників і маршрути. Старий controller не видаляти: Search/history/series/plugins та global clarification залежать від нього.
- Baseline Tenzing: Full 1146ms / 22 XHR-Fetch / 537 DOM; standalone sources 419ms / 3 XHR-Fetch / 732 DOM / 20 rows. Це один desktop-зразок із поточними кешами; не доказ TV speedup. baseline.json і standalone-before.png збережено.
- Наступне: child native component із власним scoped Controller, lazy activation, bounded window/cache, cleanup до наступної Activity; реальні й контрольовані тести.
- Коміт: docs: map native torrent dependencies and capture baseline.

## Embedded native sources 2.2 — functional checkpoint
- Native torrents Component mounted lazily inside movie Full; native parser, filter/sort, torrent handlers and TorrServer preserved. 40 connected rows maximum; bounded native pager, 4-entry TTL cache (5min results/1min empty), cancellation before next Activity/parser. Old page remains compatible fallback.
- real-report.json: 14 PASS; controlled-report.json: 10 PASS, errors=[] in both. Real 31 sources; 720/1080/4K; native filter/sort, controlled OK/back, cache reopen. Controlled 400/3/0/error/slow responses; loading Back; 10 child cycles with stable listener counts; disable pending work/reenable. No playback.
- Desktop sample: movie 1376ms/23 XHR-Fetch/544 DOM; sources 197ms/2 XHR-Fetch/891 DOM. Combined DOM is larger than old standalone 732; no general speedup claim. Lazy cache/windowing bounded; physical Google TV and actual player return BLOCKED.
- Current user feedback: shrink sources, remove separate details/cast button, natural Down to lower content, language flags, highlight useful sources; fix rapid/choppy Cardify backdrop. Next checkpoint will address these rather than treating current visual layout as final.
- Files: ui/stremio-hybrid.js, audit/embedded-torrents tests/reports/screenshots. Commit: feat: embed lazy native movie torrent sources.

## Embedded sources — compact layout and navigation checkpoint
- Pane 30vw→25vw, removed Details/cast button; panel scrolls with hero. Native Down reaches lower content; final source Down also returns there. Fixed Full.active index when returning to hero after lower rows.
- Audio flags preserve native language/voice labels. Seeded/UA hints preserve native sort. Cardify opacity !important conflict fixed: observed 800ms fade with intermediate computed opacity; callback interval 25s, disable restores original 8s, reenable repaces. No Cardify storage writes; no extra perpetual timer.
- Latest tests: real 14 PASS, controlled 11 PASS, refinement 12 PASS, switch 3 PASS; errors=[] throughout. Controlled two actual movie routes prove no late results bleed; native playback intercepted only. Physical TV/player/TorrServer transfer still BLOCKED.
- Screenshots: compact-{1280,1920,3840}.png, lower-content-final, backdrop-crossfade, comparison-1/2. Fresh X11 references compact-reference/top; scrot requires DECIMAL Window ID 106954756 (hex input captured desktop; incorrect new file overwritten before commit).
- New user clarification: native row visuals still wrong; use actual torrents-redesign.js card renderer/style, logo-derived colors, movie logo with Ukrainian + original text underneath. This is NEXT work; compact native rows are a functional checkpoint, not final acceptance.
- Commit: feat: compact embedded sources and smooth movie backdrops.

## Movie cinema sources + branding 2.3.0 — final local checkpoint
- User refinements completed: native row appearance replaced by adapted TorrentsRedesign view (inspected 1.1/1.2 sources); installed public parseTitle/score/palette reused. Full release title retained for year/season verification. Quality tile, codec/tracker, flags, true size/seeds/peers/bitrate. No duplicate playback buttons or new search engine. TorrentsRedesign files/registration untouched.
- Same quality tabs and Sort / Filters-and-sources controls use native filter APIs/Select. Custom right-panel skin copied/adapted from torrents-redesign.js; nested menus styled too. Fixed 42px menu collapse caused by absolute content inside zero-height native Select root, and preserved responsive media rules. Own fullshow/hide listeners and tokens clean up; disable while menu open restores full_start.
- Full-height rail occupies 25vw flush with right/bottom edges; source frame/background not clipped by outer native scroll mask. Transparent movie header/search/menu. Scope remains movies; series/Search/history/advanced clarification retain old native torrent Activity fallback.
- One hero wrapper separates source selectors from FullStart collection and is removed reversibly. Down reaches native details/cast/recommendations; final source Down returns there. No Details/cast button. Subtitle chip removed per user; raw filename unchanged. Native metadata/action/rating/UA/Trakt nodes preserved.
- Real TMDB logo + Ukrainian/original-English captions. Non-English original uses available English translation; Parasite exercised successfully. Logo palette → poster → backdrop, tiny canvas/cache; inspected public palette helper reused. Tenzing/Parasite logos monochrome: actual poster palettes used. Cardify image response reused, no credential/settings reads/writes; image CORS uses normal anonymous requests, no browser-security changes.
- Final reports: real 14 PASS, controlled 11 PASS, refinement 12 PASS, switch 3 PASS, branding 19 PASS, language 2 PASS, fallback 2 PASS = 63 PASS; errors=[] throughout. These include native 2.3 load without injection, 720/1080/4K, source/filter/quality/OK-spy/Back, cache, 400/3/0/error/slow fixtures, 40 connected rows, stable child listener counts, cross-movie late-response protection, backdrop 25s/800ms and rollback. Playback never actually started.
- Current desktop sample Full1468ms/17 XHR-Fetch/482 DOM; sources705ms/2 requests/935 DOM/12 rows. Prior baseline had31 sources, so no direct speedup claim. Combined DOM remains larger than old standalone. Bounded window/cache and lazy search are validated; physical Google TV/real remote, prolonged heap profiling, real player return/TorrServer transfer remain BLOCKED.
- Some reloads showed Lampa notification about unavailable remote wctch.ch/m plugin; it was not modified, and complete compatibility with that unavailable plugin is not claimed. Other active design/card/rating controls retained.
- Artifacts: cinema-brand-{1280,1920,3840}/final.png; cinema-sort-menu / sort-{1280,3840}; cinema-filters-menu, cinema-filter-options; parasite-bilingual; cinema-comparison-1/2; reports and scripts in audit/embedded-torrents. Reference compact-reference/top.png is actual Stremio window 106954756. Earlier screenshots/checkpoints retained.
- README and release/stremio-hybrid package updated to2.3.0 with SHA256. Commit: feat: match torrent cinema cards and menus inside movie details (actual hash: git log). No push/merge/publication. Chromium/profile/storage intact; own preview extension remains configured.
- Continue from this checkpoint, not a new audit. Next: user visual feedback; physical Google TV/remote/playback test; only separately authorized HTTPS publication. If changing upstream TorrentsRedesign API/version, recheck view adapter, flags, filter menus and monochrome-logo fallback.

## Save-and-publish checkpoint requested by user
- Additional fallback-report: 2 PASS, errors=[]; native standalone TorrentsRedesign route opens and Back/reopen retains exactly one cinema view and full filename per row. Older global decorator can run first: adapter now reapplies full title and removes subtitle chip without duplicating controls.
- User explicitly authorized GitHub push of commits from this chat. Publish current design/stremio-hybrid-x11 branch, no merge to main. Final commit hash and push outcome are in git log / final response.
- Stop new implementation here. Resume from 2.3 checkpoint and existing reports; remaining hardware/player checks above stay BLOCKED.

## Full integration / Stage0 checkpoint (2026-10-23)
- Resumed00990ff on existing design/stremio-hybrid-x11; clean tree; actual Git checkout is partial theme/audit package, upstream source snapshots are separate. CDP Hybrid2.3/TorrentsRedesign1.1 and X11 access PASS.
- Active scripts/extensions/settings categories mapped without query strings or auth storage; classification/dependency report in audit/full-integration-20261023/AUDIT.md, state/classification/sources.json. No plugins removed. CommunityWatches confirmed direct managed source, new-category supplies real categories, UA Comments external source identified with license pending. Prior63PASS retained.
- Prior GitHub publication BLOCKED: HTTPS missing authentication; SSH host key verification failed. No workaround or retry loop.
- Next critical step: expand existing details adapter toTV/animation, restore native series metadata, diagnose Dune broken icon; then embed filter search and Files. Trakt architecture remains deferred.
- Commit: docs: map active integration dependencies and outstanding causes.

## Full integration / Stage1 shared details 2.4.0
- Existing adapter expanded to movie/tv (including animation); media-aware branding, translations, cache identity and deferred native anime parser dispatch. No duplicate search engine or playback logic.
- Interface+ selected a Trakt details node as general metadata; owner selector now excludes .trakt, and Hybrid reversibly consolidates existing loaded blocks. Seasons/episodes/known next date/runtime preserved, no invented averages.
- Dune broken image is remote Oscar SVG, count6 is real awards count. Owner AverageRating now uses local SVG + per-image error fallback; Hybrid repairs old loaded owner compatibly and restores source on disable.
- Files: ui/stremio-hybrid.js, ui/interface-plus.js, media/average-rating.js, README/package, audit/full-integration-20261023 details/rating tests and screenshots. Backup under backups/full-integration-20261023.
- Tests: details-report 26 PASS/errors=[]; extracted owner renderer 2 PASS (initial assertion erroneously included renderer whitespace, corrected to trim). Screenshots three media ×720/1080/4K. No playback. Physical TV, player return/TorrServer and prolonged memory test BLOCKED.
- Owner files are prepared locally, not published/reloaded as full plugins; Hybrid compatibility is what was tested with currently installed owners. No push/merge.
- Next: ordinary source clarification search inline; remove advanced-route toolbar; scoped Files view and verified episode ratings, then Home/favorites. Old core APIs retained pending verified callers.
- Commit: feat: share media details and repair metadata ownership (git log records hash).

## Stage2a inline clarification 2.5.0
- Removed own advanced-route overflow button. Native Filter clarification (including alternatives and keyboard/global callback) now restarts only embedded native component; no Activity.replace/push for ordinary search. Cache includes clarification/global flags; retry retains query.
- Native Filter destroyed after submit/cancel; disabling during open keyboard calls its native Back, then releases detached filter. Core torrent Activity/API untouched for unverified callers.
- inline-search-report: 10 PASS/errors=[], real native alternative menu choice and keyboard Back/disable; global callback controlled. No playback. Screenshots inline-search-menu/results.png. Existing owner fixes unchanged.
- Next: Files view/verified episode ratings; parser picker if supported; best-choice semantics (currently release badge, not standalone mode); then Home/favorites. Physical TV/TorrServer/player remain BLOCKED.
- Commit: fix: keep native source clarification inside media details.

## Stage2b Files presentation 2.5.1
- Scoped native Files modal skin adapted from inspected TorrentsRedesign1.2. Preserves native serial/file templates, Timeline, handlers and modal controller; title/file-count summary, palette, safe cleanup on close/disable/child destroy.
- Episode score from already loaded params.seasons only, explicitly labelled TMDB. Requires one matching season+episode with ID; missing/multi-episode files omitted. No series score reuse, new API requests, key reads or extra observers. Local1.2 IMDb loader not active in installed1.1; real IMDb restoration remains pending, not falsely claimed.
- files-report: 11 PASS/errors=[], controlled native templates/metadata/OK spy; 720/1080/4K, native Down/OK/Back, repeated open, disable preserving native four rows. First draft CSS extraction was empty (earlier @media boundary); corrected scoped extraction and full fixed root before final checks. Real TorrServer/player BLOCKED, never played a random release.
- Follow-up shared metadata: mark rich block even when already correct owner node; rebuild only own supplemental fields during bounded passes so late native metadata cannot duplicate counts. Repeated details-report26PASS/errors=[].
- Source audit: “Найкращий вибір” is currently a badge on ranked real releases, NOT a separate supported selector option. No fabricated mode inserted. Native sorting remains authoritative; always-first best option cannot be claimed without new defined mode. Old Activity retained for unverified search/history/plugin routes and playback dependencies.
- Files: ui/stremio-hybrid.js, README/package, files/detail reports/screenshots. Next: real Files/TorrServer and parser selection; Home profile/continue row, favorites, then remaining requested architecture. Critical real-player checks stay BLOCKED; do not remove core controller.
- Commit: feat: style native file selection with verified episode metadata.

## Stage5 managed CommunityWatches disable
- Explicit user-requested extension disabled via native plugins registry; only exact owned community/community-watches.js and upstream lampame CommunityWatches path targeted. Status backup preserved; no scripts, row preferences, lists, caches or unrelated extensions deleted.
- community-report: 3 PASS after real reload: status0 persisted, neither target script loaded, other four Trakt Home rows still displayed. Six owned CommunityWatches row registrations therefore absent in new runtime. No separate upstream script was active.
- config/disabled-plugins.json records policy, not an automatic loader. Existing installation changed locally; another TV installation must disable its matching extension. Source/loader not republished. Helper and backup permit reversal.
- Home profiling began separately: baseline first rows4131ms; 1801 DOM at15s, sanitized request paths/counts in home-baseline.json. No speedup claimed. Current native history/candidates counts both0; do not create empty continuation row or alter history for tests.
- Next: native continuation-order adapter with controlled late-row test; remaining Home bottlenecks, Favorites, settings/header/Screensaver, UA license and Trakt architecture pending.
- Commit: chore: disable managed CommunityWatches with reversible status backup.

## Stage3a native Home continuation order 2.6.0
- One Main.use/unuse extension reorders existing native rows + DOM together; nonempty continuation third, first two remaining rows stable, current row identity retained. Late rows coalesce once per animation frame, no permanent observer/timer. Exact same media-type/ID duplicate datasets excluded from focus and restored on disable; distinct provider datasets preserved pending explicit merge rules. History untouched.
- home-order-report10PASS/errors=[]: real empty state, temporary late native rows, ordering/DOM/nav identity, exact duplicates, disable/reenable, eight toggles (one hook), real reload and CommunityWatches remains off. Controlled test rows removed by reload, not saved to history. Initial hook-count assertion accidentally counted native Items module too; tagged own module and verified explicitly.
- Home profile baseline first4131ms/DOM1801 at15s, after profile in home-after.json. Warm/cold requests differ, so no general performance improvement claim. Large rating/UA/torrent background traffic and native partNext all-batch barrier remain optimization targets, no global queue rewrite yet.
- Next unverified: different-provider continuation union, actual nonempty user history after restart, Home timing bottlenecks/card alignment; Favorites, header/settings, Screensaver+, UA license, Trakt-first still pending. Core player/TorrServer routes retained.
- Commit: feat: keep continuation third in native Home navigation.

## Stage9 compact profile header 2.6.1
- Native clock/date returned, no new timer; reversible move into actions group. Profile icon replaces overflow, retains secondary native actions/settings/notifications plus navigation/Back. Theme-only redundant logo/back visuals hidden. Search/profile subtle translucent background consistent on all theme pages.
- Native Interface settings adds one URL-only avatar field. HTTP(S), no URL credentials/data payloads; error fallback to profile SVG, no image stored in localStorage. Avatar tests temporarily override only own storage getter, no avatar preference written.
- header-report11PASS/errors=[]:720/1080/4K including positive Y bounds, menu/functions/Back, native settings field, image decode/error, movie/Home background consistency, disable/reenable. First draft absolute anchoring clipped profile; moved native clock into flex group, restored exact prior parent on disable. Test corrected nonexistent Settings.close call to actual native controller Back, and waits for settings field readiness.
- Home after sample93ms/DOM1942 is warm-cache, incomparable with baseline4131ms/1801; no speedup claim. Critical remaining: real Files/TorrServer/player, parser switcher private APIs, best-choice semantics, Home bottlenecks/card alignment, Favorite cycle; then full settings/Screensaver/UA license/Trakt architecture. Nothing published.
- Commit: feat: restore clock and add reversible profile header.

## Stage7 Screensaver+ native ownership 2.1.0
- Confirmed owner patched nonexistent S.start; installed Lampa exposes show/resetTimer. New owner wraps the actual methods while enabled/configured, clears only internal native idle timer, and restores original methods/timer behavior when disabled/destroyed. Native enabled flag and Android/system saver untouched.
- Pending start generation prevents delayed source response reopening after user input/stop. Capture handlers and idle/warm/patch/widget timers now tracked; destroy releases them, own CSS/settings definitions, native wrappers and video DOM. Existing MP4, clock/weather/widgets preserved.
- screensaver-report13PASS/errors=[]: native show→only MP4, three exit cycles, pending cancellation, reversible enable/disable, actual listener count reduction on destroy, clean reload. No setting values changed: getter override used only transiently for disable test and restored finally. Original baseline exit3ms; latest samples26.1/1.3/26.6ms. Latency complaint not reproduced, no speedup claim or hardware FPS claim.
- Testing used existing Chromium reload with exact owner script response fulfilled from inspected local ui/screensaver-plus.js; route removed afterward. Current runtime has tested owner, BUT next normal reload still downloads published old owner until delivery is authorized. No hidden persistent injection/extension URL changes. Native fake fixture baseline cleaned; MP4 preview only, no torrent playback.
- Files: ui/screensaver-plus.js, backup original owner, screensaver-before/report/tests. Next: publish only after remaining integration checks and explicit permission; Home bottlenecks/Favorites/full settings/UA license/Trakt-first remain pending.
- Commit: fix: own native Lampa screensaver lifecycle reversibly.

## Combined owner verification and continuation checkpoint
- owners-report9PASS/errors=[]: inspected local Interface+/AverageRating/Screensaver responses loaded by normal existing-tab reload; one script node/settings init per owner, movie438631/tv1396/anime1429, owner Oscar6 works with Hybrid disabled, native non-Trakt metadata correct, eight toggles leave one style/profile/clock/pane, CommunityWatches stays absent. Response routes removed afterward; local patches are not published.
- Network observation: Screensaver URL requested twice in combined test while only one script node/init exists. Request resource types not captured, do not claim duplicate initialization or a proven cause; investigate validation fetch versus script load in later request audit if relevant.
- Latest aggregate: details26 + owner-renderer2 + inline-search10 + Files11 + Community3 + Home-order10 + header11 + Screensaver13 + combinedowners9 =95PASS. Earlier63PASS historical reports retained, not counted again. Controlled fixtures and blocked real-device/player scenarios documented distinctly.
- Commits this run: d811017 audit;07a0139 shared details;d9f77a3 inline query;ca8603c Files;9ea5af1 CommunityWatches;9876726 Home order;11de4f3 header;148d561 Screensaver. Final docs/test checkpoint follows (git log).
- Full next-step map, constraints and delivery caveats: audit/full-integration-20261023/CONTINUE.md. All larger remaining stages explicitly pending, not marked complete. No push/merge, credentials read, browser/profile reset, history/list writes or random torrent playback.
- Final commit: test: verify combined owners and preserve integration checkpoint.

## Follow-up: scoped parser selection / Hybrid2.7.0
- Confirmed current provider source differs from snapshot only by final newline; no repeated full audit. Added ParserProviders1.0.0 mount API in owned providers/parsers.js. Embedded menus show primary/secondary names only, reusing private applySelectedParser/applySecondaryParser; no endpoints/keys shown or exported, no health probes triggered by this menu. Existing standalone/settings mechanisms retained.
- Hybrid mounts one scoped native filter--parser, destroys binding with child, and coalesces native settings writes into one refresh after provider transaction. Active selection/Back does not search. Primary/secondary changes stay on same Full. Fixed missing toolbar for synchronous parser/cache results by syncing rows/tools after child.initialize.
- parsers-report12PASS/errors=[]: actual Select/button navigation, controlled parser configuration in memory (real credentials/preferences untouched), primary+secondary apply once, unchanged choice0requests, off option, nested Back,720/1080/4K bounds, disable/reenable. Screenshots parser-menu/parser-{1280,1920,3840}.png. Initial test assumptions about restored Trakt view and synchronous toolbar exposed/fixed; final report passes.
- Tests fulfill only inspected local provider script via normal existing-tab reload and remove route afterward. API1.0 remains in current runtime until normal reload, but owner file not published. Without owner API Hybrid omits unsupported picker, retaining settings path. Actual network parser/backend changes still require real scenario verification; no playback.
- Files: ui/stremio-hybrid.js, providers/parsers.js, backup originals, audit/integration-followup-20261023 reports/tests/screenshots, README/release. Next: active v3 Favorites reproduction and reversible tests; do not mistake legacy v2 component() call for active bug.
- Commit: feat: switch native parsers within embedded media sources.

## Follow-up: recover explicit device Favorites without cloud merge
- Root cause established read-only: account-resolved Favorite lists empty while device favorite contains2book/45wath(«Пізніше»)/100history/132cards. Native account read-update callback completed but stayed empty. Prior notes saying history empty refer ONLY to account-resolved API, not device history. No auth/settings fix guessed, no mass synchronization.
- Owned media/custom-favorites.js keeps original v3/v2 implementations and adds DeviceBookmarks1.0.0 adapter. Native menu action API offers explicit device vs account/custom list source, retaining native parental callback when exposed. Device view uses existing Maker Main/Line/Card,20-entry paging; original account/custom route retained. Native Full favorites menu gets one clearly labelled local bookmark action, no duplicate button/data copy.
- Device toggle updates existing local favorite.book and existing card metadata, invokes Favorite.read(true), never native Favorite.add/remove account queue or Trakt Watchlist. Cached device view refreshes once after Back when local revision changed, timer cleaned on destroy. One document intent listener + native menu/Select/Storage listeners, no observers/permanent timers.
- favorites-report26PASS/errors=[]: real movie438631/series1396/anime1429 add→normal reload→native device card→remove→Back; explicit checked state,720/1080/4K; original account route; addon cleanup; original local data exactly preserved after targeted test cleanup. Eight observed Watchlist requests were GET reads,0remote mutation requests. First harness counted GET as writes; corrected by method+path, no remote mutation occurred.
- favorites-navigation-report8PASS/errors=[]: native Right/OK/Back,20+20+5 pages of existing45-entry list via native More, Back to prior page, theme off/on. Preflight existing device rows visible without writes. Backup of actual user lists is private-backups/integration-followup-20261023/favorite-before.json (mode0600), intentionally OUTSIDE Git checkout; do not copy/commit it. Cleanup touched only test-owned additions, preserved all original data.
- Files: media/custom-favorites.js (new owned copy+small adapter), backups original source; audit/integration-followup-20261023 favorites tests/reports/screenshots; README. Owner still not published; normal reload requires local delivery or eventual authorized publication. Next: make local preview delivery survive ordinary reload, then remaining Home/settings/UA/Trakt work.
- Commit: fix: expose device favorites separately from empty account lists.

## Follow-up: persistent local owner delivery
- Existing loopback server extended from one JS route to explicit7-public-JS whitelist, same127.0.0.1:8766 binding/CORS behavior; no system/network/Chromium security changes. Unknown paths, __proto__, private backup paths return404. Original server backed up; process now running via normal node audit/serve-hybrid.cjs (not a system service).
- preview-loader preserves original plugin order/custom list handling and substitutes only Interface+/AverageRating owner URLs. Native plugins registry replaces4already-enabled owned URLs (loader/parsers/Custom Favorites/Screensaver), leaves32entries/statuses/other plugins intact. Original public URLs saved, use audit/use-local-preview.cjs restore to reverse; no duplicate extension added, no publication. Local preview addresses belong only to this desktop testing profile, not physical TV.
- delivery-report20PASS/errors=[] WITHOUT Playwright routing or bootstrap injection: exact7asset hashes, private/unknown404, two normal reloads/all owner versions/single initialization, CommunityWatches off, original2device bookmarks accessible, local Full action, native real Dune20visible sources+provider menu, local Oscar fallback. Desktop sample Full389ms/source1205ms; no comparable cold baseline or TV speed claim.
- Resolved prior duplicate-fetch uncertainty: owner requests now recorded by resourceType; each direct extension has1script +1xhr metadata/validation fetch per reload, but1script node/init. No evidence of duplicated execution; nested Interface/ratings only script loads.
- Files: audit/serve-hybrid.cjs, audit/preview-loader.js, audit/use-local-preview.cjs, public URL backup, delivery tests/report/screenshot, README. Private user list backup remains outside Git and is not served. Next: Home history-source ambiguity/slow batches/card alignment, settings/UA licensing and Trakt-first, real TorrServer/TV checks. Local owner delivery caveat from prior checkpoint is resolved for this running desktop server only.
- Commit: feat: persist inspected owner fixes through local preview reloads.

## Follow-up: UA Comments local ownership 1.0.0 — stable bounded checkpoint
- Latest user instruction supersedes publication permission: DO NOT push/merge/main publish. Finish current UA work, run only focused necessary checks, save remaining original15-stage plan for next session. No automatic5-hour resume scheduled.
- Identified original author Ярослав / @Yaroslav_Films, credited original http://lampalampa.free.nf/uacoments.js, active MIT mirror marv2on/lampa-plugins-sync/sync/Yaroslav/uacoments.js. Exact pinned snapshot91258bytes/Git blob869619491257aa70e4ebff14e2365a46ad67a2b2, root MIT Copyright2026marv2on, original author+mirror attribution retained in vendor/ua-comments/NOTICE.md/LICENSE. Snapshot is reference only; load media/ua-comments.js once.
- Local derivative retains existing settings, five source parsers/matching, proxy/fallback behavior and native comment viewer. Adds single-init guard, page-owned cancellable AJAX/timers, stale-callback protection, page-scoped/coalesced observer, five-minute/eight-entry successful cache (only datasets<=1000comments),40-card pagination with full viewer list, no backdrop blur, scoped Hybrid styling. Empty/error results remain retryable, not cached. Correct short JSON responses no longer fail minimum-text-length heuristic; author names escaped.
- Persistent preview expanded whitelist7→8 and replaces only the existing active UA extension URL, not a duplicate; registry remains32entries, CommunityWatches off, no preference/list/auth reset. Original public URL appended to existing backup. Local source survives ordinary reload; GitHub is unchanged. Restore4/apply4 was verified before UA addition; restore5 not repeated by request.
- smoke-report13PASS/errors=[]: normal local delivery,65 controlled KinoStrain-shaped comments→40+25 paging, actual item OK/viewer counter, native viewer controller Back, repeat-movie0newrequests, abort/late-callback isolation, empty/error/cache behavior, repeated script one style/listener, no blur, dispose cleanup, final normal reload without fixtures. Controlled source responses and Storage.get override were transient and restored; no preferences written or random playback. Native keyboard Escape/full remote matrix is not certified; viewer Back check invokes its native controller explicitly. Full five-provider live coverage,720/1080/4K UA matrix, long heap and physical TV remain BLOCKED/deferred, not claimed complete.
- Test harness corrections: waited for style/app-ready rather than API declaration; used actual Controller.back API instead of nonexistent enabled().back. Early fixture ID exposed real short-JSON heuristic; final run fixed. No full regression rerun because user requested conserving resources.
- Files: media/ua-comments.js; vendor/ua-comments snapshot/license/notice; audit/ua-comments-20261023 reproducible builder/smoke/report/screenshot; audit/serve-hybrid.cjs/use-local-preview.cjs; preview URL backup; README/release package; CONTINUE.md updated with all15 stages. Syntax checks PASS and pinned snapshot hash confirmed.
- Remaining/next: real controlled Files/TorrServer/parser/player routes; Home account/device history ambiguity and slow batches/card metadata; settings/category/source menu audit; UA live checks when useful; then separate Trakt-first architecture. Exact map at audit/full-integration-20261023/CONTINUE.md. Earlier parser12/favorites26/navigation8/delivery20 reports retained, not rerun. Physical TV performance unverified. Private actual-list backup remains OUTSIDE Git.
- Commit: feat: vendor UA Comments with scoped lifecycle and bounded rendering (see git log for SHA).

## Saved handoff after UA stage
- Stable implementation commit: `5b43e06`. Previous follow-up commits: `08674e5`, `c50a711`, `992137d`. All remain local on `design/stremio-hybrid-x11`; no push/merge/main changes were performed.
- Focused UA report:13PASS/errors=[], remaining live/device/full-matrix checks explicitly deferred. Existing browser remains open; local eight-route preview remains running. Continue with `audit/full-integration-20261023/CONTINUE.md`, not a fresh audit.
- No new large stage started after the user requested saving resources. Next session should read this checkpoint and verify branch/log/worktree once.


## Publication integration — 2026-10-23
- User explicitly authorized publication of all local work to main. Earlier no-publication notes are historical and superseded for this delivery only. No new Issue #8 work is included.
- Original Hybrid branch: 41 commits through eb41cb607b132e57bf0070ea128e076b29ce0458. Its independent history is merged into the full repository, preserving main-only files and Trakt+ 3.2.0 from Issue #7.
- Six overlapping owner files resolved using tested Hybrid owners: average-rating, custom-favorites, parsers, torrents-redesign, Interface+, Screensaver+. YDesign remains byte-for-byte unchanged from main. torrents-redesign matches existing PR #4 source.
- Combined checks: 52 Trakt mocked regressions PASS; repository syntax/link checks PASS (58 JavaScript files, 430 source URLs before delivery-document changes). Immutable audit/backups/vendor retain original bytes via scoped .gitattributes; active UA derivative whitespace normalized and reproducible builder verified.
- Managed manifest: UA Comments uses this repository HTTPS copy; CommunityWatches status 0. Existing browser registry/preferences remain untouched. Hybrid stays opt-in via its own plugin URL.
- Exact original history is transported as a verified Git bundle on a temporary publishing branch; archive transport/workflow must not enter main. Final GitHub merge/CI references are recorded separately in audit/PUBLICATION-20261023.md.
- Known deferred work remains in audit/full-integration-20261023/CONTINUE.md: controlled TorrServer/player/File scenarios, live parser/provider cases, Home profiling, category/settings audit, Trakt-first architecture, physical TV performance. Do not claim these complete.


## Published-history checkpoint / PR #24
- All 41 original Hybrid commits now exist on GitHub at design/stremio-hybrid-x11, exact head eb41cb607b132e57bf0070ea128e076b29ce0458. Checksum-verified import succeeded: https://github.com/gorlim590/lampa/actions/runs/39919432388 . Temporary archive branch/workflow was deleted after the successful push and is excluded from main.
- Integration PR: https://github.com/gorlim590/lampa/pull/24 . User authorized merge after CI; its current PR state and checks are the source of truth for final publication status. Trakt fix PR #23 is already merged as c68cd3b0dceb6fb6a9b37d1b576ade2a88ca289a, with main CI/Pages successful.
- Final focused checks:52 Trakt unit,16 existing-CDP browser,65 torrent offline and23 state checks PASS. Browser JavaScript errors=[]; no real Trakt writes or user preference changes. Syntax/link validation PASS (58 JS /436 URLs before this checkpoint); whitespace PASS. YDesign unchanged, API true/false/null preserved.
- Published plugins remain reversible/opt-in as documented. Deferred live/TorrServer/physical TV work and the remaining roadmap are NOT complete; continue from audit/full-integration-20261023/CONTINUE.md. Issue #7 remains open; Issue #8 not started.

## Issue #7 follow-up: account isolation and activity integrity
- Based on current main a33f4b1, separate fix/issue-7-account-isolation; PR #23 implementation retained, not repeated. Only #7 and its native GET transport boundary are in scope; no YDesign/#8 changes.
- Reproduced ownerless-cache and incomplete-activity bugs on mocks before implementation (34 failing cases in first41 new regressions; existing52 passed).
- Implemented authenticated owner-bound cache v7, credential-generation guards/cancellation for background/manual/lazy progress, same-owner verified hydration after restart/rotation, owner-scoped auto-sync success metadata and strict initial/final activity timestamps. Local lists/history/progress/provenance are retained without deletion.
- 98 unit/regression checks PASS at implementation checkpoint. Native GET optional options preserve old callers while integrity reads bypass native cache/in-flight dedup. Loader cache tag advanced; plugin order unchanged.
- Details/contract/limits: docs/issue-7-account-isolation.md. Browser checks and final exact SHA/results follow in the Draft PR and audit/issue-7-account. No merge authorized for this follow-up; Issue #7 must remain open. No other Issue begins automatically.

### Issue #7 account/integrity final checkpoint
- Authenticated identity reuses the already supported native /users/me endpoint; UUID preferred, verified slug fallback. Local implementation commits ec333f1 /8321ffe, harness source-proof correction e70cd08. Source tested by CDP: e70cd0828da4fd548049076dcb6565a573aee9a5.
- Final results:99 unit regressions PASS;23 existing-CDP runtime checks PASS,0FAIL, exceptions=[]; exact source SHA256/header commit checked for loader/TraktTV/Trakt+/unchanged YDesign. Normal profile delivery/methods restored; real local values preserved. No real Trakt mutation, storage reset, browser close or physical-TV claim.
- Initial browser source check was corrected for this profile's preview-loader alias; final full focused run passed. Tests/limits/screenshots at audit/issue-7-account/RESULTS.md and browser-report.json; root causes at docs/issue-7-account-isolation.md.
- Next authorized step: publish this isolated branch as a Draft PR, verify GitHub CI and add a detailed #7 report. Do not merge main or close #7. Further action after review requires the user's decision; no next Issue is started.

### Issue #7 published Draft / wait for review
- Draft PR #27: https://github.com/gorlim590/lampa/pull/27 . Feature implementation/evidence head ad620c43ee9243fcc4bca1ca2e6e0a6d354f112a; exact CDP source tested e70cd0828da4fd548049076dcb6565a573aee9a5. All4 original logical commits preserved on fix/issue-7-account-isolation.
- GitHub CI Node20: https://github.com/gorlim590/lampa/actions/runs/39938617150 —99 tests PASS,0FAIL; syntax/link/whitespace PASS. Browser:23PASS,0FAIL,exceptions=[]; source SHA256/commit headers confirmed. Evidence/runtime deployment is temporary and restored, not a main installation.
- Actions transport token could not push a CI-workflow change (permission boundary). The already authorized GitHub connector published the verified exact feature commit instead; temporary archive branch was subsequently deleted by its dedicated verified cleanup job. No main merge/push, issue close or real-account mutation occurred.
- READY FOR REVIEW for #7 account/snapshot integrity. Stop here and wait for user's decision. Outstanding: real account/backend/954-vs911 and physical Google TV acceptance; YDesign's separate #8 UI rules were not changed.

### Issue #7 final harness cleanup /24 runtime checks
- Post-test inspection caught a legacy harness cleanup defect: it removed the hash but retained component=issue7_fixture in the query URL. Normal scripts/methods had already been restored; the remaining test Activity is now explicitly removed by navigating back to a real original route (Main if the starting route was itself an older fixture).
- Repeated full focused browser run:24PASS/0FAIL, exceptions=[]; final24th check confirms real native Activity and no fixture globals/query. Exact runtime source commit07b5b5baf8ea8259a4336a0ed53e9c489bdb2170; all4 source SHA256/header matches confirmed. Production source is unchanged from the previous verified run.
- Draft #27 remains the only feature PR; CI for07b5b5b is green: https://github.com/gorlim590/lampa/actions/runs/39938901975 .99 unit checks unchanged. Final cleanup/evidence update follows on this same branch; no main merge or other Issue work.

## Issue #8 — baseline and retired card modes
- New isolated branch fix/issue-8-ydesign-vertical from current main fcc148f88257daab6ce56681c51ecc7903274d94. No open PR conflicts. Read #8/#7/#22/#9 and comments; prior5119195 audit is historical, #7 fixes are already in main. No AGENTS.md found in applicable ancestors/repository. Issue #7 description will not be modified.
- Controlled existing-CDP baseline captured before product edits: audit/issue-8/baseline.json/png,1280x720, vertical/full-effects/Hybrid-on,3 native cards, synthetic storage/Trakt/metadata. Deliberate local watched95% conflicts with Trakt false; baseline incorrectly marks3 cards. UA error objects incorrectly produce3 badges (only1 fixture actually supported). One body-wide observer and active400ms interval remain on Home. Settled3.48s sample:45 attributed queries,13 timer callbacks,3 TMDB/3UA requests,114 active-view elements; ready1020ms and long-task/heap samples are single desktop observations, not a speed/FPS claim. Unsettled diagnostic retained separately, not the comparison baseline.
- Removed horizontal render/settings/defaults/CSS and description-only metadata requests; vertical is unconditional. Legacy orientation values migrate without resetting other preferences; remaining old orientation strings are migration-only. Removed screen-background functions/state/focus retries/CSS/default/settings. Internal poster colors/gradients remain. Hybrid's obsolete horizontal width/description selector removed; horizontal rows/hero/details retained.
- Targeted unit4PASS, JS syntax and diff whitespace PASS. Next: authoritative account/type/ID presentation cache, UA strict schema/dedup, metadata key mismatch/in-flight guards, then scoped series lifecycle/Hybrid shell ownership and full runtime matrix. No Draft/main merge yet.

### Issue #8 — authoritative presentation and first-open metadata
- YDesign now consumes only TraktPlus.watchedStatus with verified owner/session/mediaType/TMDB ID. Bounded presentation cache (3 accounts ×1500 records) retains last confirmed true/false during pending/error and restart after identity verification; no local watched fallback. Unknown/unmapped/unverified owner stays unknown. Delayed persistence guards session, older confirmations cannot override newer data, and all dim/check/classes now remove together after confirmed false.
- Minimum compatible Trakt+3.2.2 API extension adds owner/session/content identity metadata and owner-change/verified-identity events; existing sync/completion truth unchanged. Issue #7 description untouched. Loader cache tag advanced; order retained. Legacy Trakt+ without owner context safely yields unknown.
- UA: directly observed public WH movie/TV responses use {play:HTTPS URL}; new strict typed response parser, version/media/ID key, bounded TTL and in-flight dedup ignore legacy id-only values/errors instead of false positives. Full #22 localization work remains out of scope.
- Corrected extCacheKey v6 vs actual v7 mismatch to one v8 key, shared in-flight details, malformed-response rejection, memory TTL checks and stale/disconnected render guards. Description-only English requests removed; rebuilt poster layers can no longer reuse a detached prior-image flag.
-151 unit checks PASS (50 YDesign +101 Trakt, including2 metadata-contract regressions); JS syntax/diff checks PASS. Next: scoped episode lifecycle, Hybrid-owned shell and full browser matrix/profiling. No main merge.

### Issue #8 — paused by user; resumable lifecycle/ownership checkpoint
- Worktree `/home/gostrimchik/lampa-testing/audit/issue-8-ydesign`, branch `fix/issue-8-ydesign-vertical`, baseline main fcc148f. Earlier local5435b97/f58d52f retained; current commit saves all further work/evidence. LOCAL ONLY; no PR/merge/close.
- Scoped episode lifecycle/cleanup, idempotent timeline writes, Hybrid shell CSS ownership/reduced-motion, restored shared mark styles, guarded init/font, coalesced settings/mark updates and bounded Home warmup implemented.161 unit checks PASS, repository58JS/449URLs PASS, diff check PASS.
- Browser last run19PASS/1FAIL, exceptions=[]: only failure source coverage due Hybrid delivery alias. Alias fixed in harness, rerun pending. Exact YDesign body hash matches saved source; browser header still parent f58d52f. Final cleanup independently verified native Main/no fixture globals.
- Before/after fixture route methodology differs; no speed/FPS claim. Full isolated mode/load-order/episode/provider/reload/browser checks and publication remain unfinished. Physical Google TV untested.
- **Resume from `audit/issue-8/CONTINUE.md`** for exact commands, evidence, risks, missing tests and safe Draft publication path; no repeat broad audit. Do not continue until user resumes.

### Issue #8 — resumed with agreed reduced validation scope
- Read the updated opening section of #8. main remains fcc148f; no open PR conflicts. Existing results retained without a repeated audit.
- Full load-order/multi-screen/profile matrix is no longer required.161 focused tests and repository checks PASS at resumption. Existing harness now supports --final: exact source alias proof, short card/Hybrid smoke plus3 episode Activity transitions and resource cleanup; no additional detailed profiling. Final browser run follows this commit.

### Issue #8 — focused runtime caught first-open rating dependency
- First reduced final run:25PASS/1FAIL, exceptions=[]; exact source proof now covers Hybrid alias correctly.3 episode mounts/Back exits had exactly1 active observer/interval mounted and0 on Home; synthetic OK/timeline70%/reset PASS.
- Failure reproduced: card-ready preceded remote rating-icon preload, leaving first-open values temporarily empty. Removed the icon preload gate/timers; values now render immediately and failed logos become readable labels.3 targeted regressions added;164 total tests PASS; repository/diff checks PASS.
- Final focused runtime rerun is justified by this functional fix; no new baseline/profile/full matrix. Initial report preserved at audit/issue-8/final-before-rating-fix.json.

### Issue #8 — reduced final acceptance complete; publish Draft next
- Exact product source1e0ae2423d7eeb95acd87ef97757979f39b89923:164 unit regressions PASS; repository syntax/links and diff checks PASS; final existing-CDP26PASS/0FAIL, exceptions=[]; SHA256/header verified for all3 product plugins including Hybrid alias.
- Native cards/movie-TV-anime metadata/strict UA, no Ambient, Hybrid on/off/reduced-motion, migration, Trakt truth/unknown/account/error behaviors PASS on fixtures.3 synthetic provider episode Activity round trips:1timer/1observer mounted,0/0 after native Back; progress70%/reset/OK and focus retained. Native Main/no fixture globals restored.
- No new baseline/profile/full load-order matrix per updated #8 scope. Reuse earlier viewport evidence; no speed/FPS claim. Physical TV/live provider/player/authenticated backend NOT tested. Limits in docs/issue-8-ydesign.md.
- Source/evidence saved; remaining authorized workflow: publish isolated branch/Draft PR, add CI YDesign regressions, check CI and report #8 with only verified boxes. No main merge/Issue close/next Issue.
