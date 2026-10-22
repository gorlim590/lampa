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
