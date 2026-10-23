# Movie-only Stremio-first redesign

## Реальний референс

X11 `0x06600004`, актуальні знімки stremio-current.png (The Kid), stremio-tenzing-details.png. Навігація: wheel/Tab на деталях The Kid; жанр Drama відкрив справжній Discover; вибір Tenzing → Show відкрив деталі другого фільму. Відтворення, бібліотека й налаштування Stremio не змінювалися. Tenzing показує No streams were found — це обмеження провайдерів, а не макет потоків.

На 1920 px: заголовок зліва близько x60/y170; метадані y310; жанри/актори/режисер вертикально нижче; summary у тій самій лівій зоні, не в правій картці. Постера на деталях немає. Backdrop займає екран; темніє під текстом і внизу. Дії Trailer/списки/переглянуте/share — компактний нижній ряд. Праворуч — реальні потоки/їхній empty state. Для короткого Tenzing прокрутка лівої зони не змінила положення блоків; це не перевірка довгого Stremio synopsis.

## Власники DOM і конфлікти

Активні публічні source URLs взято зі script tags існуючої вкладки, збережено в active-*.js. Cardify+: SHA256 934cc71a1e95781b4daa1f1f39aa495ae88cc83a3bcd27bdd9f489cf65abc6bb. Interface+: be2067dcdedcfa8e45399f688013e0b16b9eecad069a9c526634f5aaae984726. YDesign: d6e718d335b92e9d8d2dbc27e26343eb7cacd0f21cfd3286ede2a98a644f6422.

- Core Lampa: Full/FullStart controller, button events, providers, Scroll, title/details/ratings placeholders, native full description, recommendation/cast rows. Вони не переписуються.
- Cardify+: замінює full_start_new template, додає cardify__left/right-box, backdrop overlay; full/complite переносить оригінальний опис у custom-ghost-main з inline absolute/right/width40vw і pointer-events:none; own IntersectionObserver стежить за title і очищується на destroy. Це джерело правої панелі й 80vh старої композиції.
- Interface+: формує original title та кольорові metadata spans, icon-only button modes, відкладено впорядковує/клонує деякі дії. Його власна логіка залишається; адаптер не викликає її повторно та сам нічого не клонує.
- Rating plugins: асинхронний omdb-mdb-yarik-rate/custom-rating, числові дані й іконки. Trakt/провайдери додають справжні native buttons.
- YDesign: картки та їхні рейтинги/жанри/UA/переглянуте, зокрема в нижніх рядах. Їхня структура не змінюється.
- Hybrid 2.0: показував постер і зберігав Cardify right-description, створюючи враження попередньої Lampa. Movie-only 2.1 замінює саме ці композиційні правила; серіали й інші сторінки зберігають 2.0.

Native reload виявив порядок завантаження: інколи Full уже створено зі стандартного шаблону до реєстрації шаблону Cardify+. Адаптер підтримує і cardify__left, і native full-start-new__right. Reload не залежить від того, який шаблон встиг застосуватися.

## Адаптер і відкат

Тільки active component=full, method=movie. Додає movie scope classes, переміщує оригінальний description wrapper та status box у спільну колонку; зберігає parent/nextSibling для кожного переміщення. CSS order задає title → head/ratings/details/status → description → buttons. Великий постер прихований як у референсі; його вузол не видалено. Немає дубльованих даних або кнопок.

Першу доступну дію в наявному порядку виділено як primary; всі інші — однакові компактні прямокутники. Native order/editor збережено. Ряд не переноситься; за великої кількості дій прокручується горизонтально, hover:focus підводить кнопку в межі рядка. Текст активної другорядної дії показує CSS caption. Додаткового меню/дублікатів не створено, жодна доступна дія не приховується.

Один full listener і capture focus handler (native hover:focus не bubbles) на рядок. Для відкладеної роботи Interface+ — RAF і лише два одноразові проходи 180/650ms; не polling/MutationObserver. Черга скасовується при переході/disable/destroy. Activity destroy звільняє record; disable відновлює DOM, прибирає класи/title/caption і handlers. Cardify settings/storage не змінюються.

## Порівняння й ітерації

1. lampa-before.png: великий постер, кольорові плашки, окрема description card справа. iteration1: єдина колонка й backdrop, але кнопки успадкували великий font-size Lampa; status лишався кольоровим, відступ зліва завеликий.
2. iteration2: зменшені кнопки з фіксованою висотою, title ближче до верхнього/лівого краю, caption для remote. Наступне уточнення: нейтральний nested status і native-template fallback. movie-1920.png — фінальний вигляд, comparison-*.html/png — пари однакової ширини.

Компроміси: український текст та більший TV-friendly synopsis; збережена навігація Lampa й native нижні ряди замість правої Stremio streams pane. Авторські logo-title Stremio не генеруються й не завантажуються окремо; використано реальну локалізовану назву Lampa. Ширший набір metadata й кнопок збережений, але його масштаб другорядний до назви/backdrop.

## Виправлення після реальної взаємодії

- Native hover:focus створено з bubbles=false; один capture listener на рядку потрібен замість jQuery bubbling delegation. Caption і горизонтальне підведення фокусу перевірено справжнім CDP ArrowRight.
- Interface+ може залишати FullStart.last на від’єднаному вузлі після власного reorder. Лише коли фокус/last невалідний, адаптер відновлює штатну collection та last на першій чинній кнопці. Жоден controller або button handler не замінюється.
- Перший DOM stress вимірював увесь документ і бачив +1 вузол від сторонньої асинхронної роботи. Завершений тест вимірює саме movie subtree плюс app/activity listener counts та кількість styles; ті самі оригінальні action/metadata nodes перевіряються окремо. Повторна ізольована census показала лише заміну одного style і More-вузла з його SVG — по стільки ж додано/видалено.

Повний native synopsis доступний через OK у Modal Lampa з початкового текстового вузла; Back відновлює фокус опису, disable закриває лише власний Modal. Один capture enter handler також видаляється при відкаті. Жодних записів у Trakt/обране або запуску відео під час перевірок не було.
