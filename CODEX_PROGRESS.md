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
