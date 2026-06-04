# Chrome Web Store — материалы листинга

## Название
Images to PDF

## Краткое описание (≤132 символов)
Collect images from any web page and save the ones you pick into a single clean PDF — one image per page.

## Категория
Productivity

## Полное описание
Images to PDF lets you turn the pictures on any web page into a single PDF in
two clicks.

Open the extension on a page, and it shows a grid of all the images it found.
Tick the ones you want, press Export, and you get a clean PDF with one image per
A4 page, scaled to fit and centered.

Features:
• Thumbnail grid with one-click select all / deselect all
• Small icons (under 64×64) hidden by default — toggle "show all" to see them
• Everything runs locally in your browser — your images never go to any server
• Asks for access only to the sites hosting the images you actually export

Great for saving photo galleries, product images, comics, or reference shots as
a single shareable PDF.

## Single purpose (для дашборда)
The extension has one purpose: collect images from the current web page and
export the user-selected ones into a single PDF file.

## Обоснование разрешений (для дашборда)
- **activeTab** — read the current page only when the user opens the popup, to
  list its images.
- **scripting** — inject the small content script that gathers the page's
  `<img>` elements on demand.
- **optional host permissions (`<all_urls>`, requested at export time)** —
  needed to download the bytes of the images the user selected so they can be
  embedded in the PDF; requested only for the specific domains of those images.

## Чек-лист скриншотов (1280×800 PNG, минимум 1, лучше 3–5)
1. Попап открыт поверх страницы — сетка превью картинок.
2. Несколько картинок выбрано (синие рамки), на кнопке виден счётчик.
3. Готовый PDF открыт в просмотрщике.

Как снять: открой расширение на странице с картинками, сделай скриншот окна
(на macOS — Shift+Cmd+4, затем пробел и клик по окну), при необходимости
приведи к 1280×800.

## URL политики конфиденциальности
Нужен ПУБЛИЧНЫЙ адрес. Репозиторий приватный, поэтому варианты:
- сделать репозиторий публичным и дать ссылку на `PRIVACY.md`;
- или опубликовать текст `PRIVACY.md` как публичный GitHub Gist;
- или включить GitHub Pages и разместить страницу.

Вставь полученный URL в поле «Privacy policy» в дашборде.
