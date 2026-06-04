# Store Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить расширение Images-to-PDF к публикации в Chrome Web Store: точечные host-разрешения по требованию, фикс отображения превью, локализация en+ru, сборка ZIP и тексты листинга. Версия → 1.1.0.

**Architecture:** `<all_urls>` переезжает из постоянных в `optional_host_permissions` и запрашивается в момент экспорта только для доменов выбранных картинок (новый чистый модуль `src/lib/origins.js`). Превью чинится в CSS (вынос `<img>` из потока + `min-height:0`). Все пользовательские строки выносятся в `_locales/{en,ru}/messages.json` и подставляются через `chrome.i18n`. ZIP собирается скриптом из рантайм-файлов.

**Tech Stack:** Chrome Manifest V3, чистые HTML/CSS/JS (ES-модули), Chrome i18n API, jsPDF 2.5.1. Тесты — `node --test tests/*.test.js` (Node 18+).

**Соглашения:**
- Все коммиты заканчиваются строкой `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (в шагах показан только заголовок).
- Рабочая директория всех команд — корень проекта `images-to-pdf/`.
- Комментарии в коде — на русском.

**Изменяемые/создаваемые файлы:**
- Create: `src/lib/origins.js`, `tests/origins.test.js`
- Create: `_locales/en/messages.json`, `_locales/ru/messages.json`
- Create: `tools/package.sh`, `PRIVACY.md`, `STORE-LISTING.md`
- Modify (целиком): `manifest.json`, `src/popup.css`, `src/popup.html`, `src/popup.js`, `.gitignore`, `README.md`

**Единые интерфейсы:**
- `distinctOrigins(urls)` → `string[]` match-паттернов `<scheme>://<hostname>/*` (без порта; `data:` и кривые URL пропускаются).
- i18n-ключи: `extName, extDescription, appTitle, showAll, selectAll, deselectAll, exportPdf, foundImages($count$), noImages, pageNotSupported, readError($error$), permissionDenied, downloading($count$), buildingPdf, noneAdded, doneAdded($added$,$total$), failedSuffix($count$)`.
- Хелпер в popup.js: `t(key, subs)` = `chrome.i18n.getMessage(key, subs)`; `applyStaticI18n()` подставляет тексты в элементы `[data-i18n]`.

---

### Task 1: Модуль origins.js (TDD)

**Files:**
- Create: `src/lib/origins.js`
- Test: `tests/origins.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/origins.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distinctOrigins } from '../src/lib/origins.js';

test('уникальные origin в формате scheme://host/*', () => {
  const out = distinctOrigins([
    'https://a.com/1.jpg',
    'https://a.com/2.jpg',
    'http://b.org/x/y.png',
  ]);
  assert.deepEqual([...out].sort(), ['http://b.org/*', 'https://a.com/*']);
});

test('пропускает data: URL', () => {
  const out = distinctOrigins(['data:image/png;base64,AAAA', 'https://a.com/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('игнорирует порт (match-паттерны его не допускают)', () => {
  const out = distinctOrigins(['https://a.com:8443/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('пропускает кривые URL', () => {
  const out = distinctOrigins(['not a url', 'https://a.com/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('пустой вход даёт пустой массив', () => {
  assert.deepEqual(distinctOrigins([]), []);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test tests/origins.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать минимально**

Создать `src/lib/origins.js`:
```js
// Уникальные origin'ы (match-паттерны) из списка URL картинок.
// Нужны, чтобы точечно запросить host-разрешения только к доменам выбранных
// картинок. Чистая функция — тестируется в Node.

/**
 * @param {string[]} urls список URL картинок
 * @returns {string[]} уникальные match-паттерны вида "https://host/*" (без порта).
 *   data:-URL и нераспознанные URL пропускаются.
 */
export function distinctOrigins(urls) {
  const patterns = new Set();
  for (const u of urls) {
    if (typeof u !== 'string' || u.startsWith('data:')) continue;
    try {
      const url = new URL(u);
      // hostname без порта: порт в match-паттернах недопустим
      patterns.add(`${url.protocol}//${url.hostname}/*`);
    } catch (e) {
      // кривой URL — пропускаем
    }
  }
  return Array.from(patterns);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test tests/origins.test.js`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/origins.js tests/origins.test.js
git commit -m "feat: distinctOrigins — match-паттерны доменов картинок"
```

---

### Task 2: Фикс превью (CSS)

**Files:**
- Modify (целиком): `src/popup.css`

- [ ] **Step 1: Перезаписать `src/popup.css`**

Полное содержимое файла (изменены `.grid`, `.cell`, `.cell img`):
```css
* { box-sizing: border-box; }
body {
  width: 420px;
  margin: 0;
  font: 14px/1.4 system-ui, -apple-system, sans-serif;
  color: #1a1a1a;
  background: #fff;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}
header h1 { font-size: 15px; margin: 0; }
.show-all { font-size: 12px; color: #555; cursor: pointer; }
.status { padding: 8px 12px; font-size: 13px; color: #666; min-height: 18px; }
.status.error { color: #c0392b; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
  padding: 12px;
  max-height: 360px;
  overflow-y: auto;
}
.cell {
  position: relative;
  border: 2px solid #e3e3e3;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1 / 1;
  min-height: 0;
  background: #fafafa;
}
.cell.selected { border-color: #2d7ff9; }
.cell img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cell input { position: absolute; top: 6px; left: 6px; width: 16px; height: 16px; z-index: 1; }
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #eee;
}
.controls { display: flex; gap: 6px; }
button {
  font: inherit;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f7f7f7;
  cursor: pointer;
}
button:hover { background: #efefef; }
.export { background: #2d7ff9; border-color: #2d7ff9; color: #fff; font-weight: 600; }
.export:disabled { background: #b9c7da; border-color: #b9c7da; cursor: default; }
```

> Ключевое: `.cell img` стал `position: absolute; inset: 0` (не управляет высотой ячейки), у `.cell` добавлен `min-height: 0`, у чекбокса `z-index: 1` (чтобы был поверх абсолютной картинки), сетка — `auto-fill, minmax(96px,1fr)`.

- [ ] **Step 2: Commit**

```bash
git add src/popup.css
git commit -m "fix: превью не схлопываются при многих картинках"
```

---

### Task 3: Локализация — каталоги _locales

**Files:**
- Create: `_locales/en/messages.json`
- Create: `_locales/ru/messages.json`

- [ ] **Step 1: Создать `_locales/en/messages.json`**

```json
{
  "extName": { "message": "Images to PDF" },
  "extDescription": { "message": "Collect images from a page and save the selected ones to a single PDF." },
  "appTitle": { "message": "Images → PDF" },
  "showAll": { "message": "show all" },
  "selectAll": { "message": "Select all" },
  "deselectAll": { "message": "Deselect all" },
  "exportPdf": { "message": "Export PDF" },
  "foundImages": { "message": "Found images: $count$", "placeholders": { "count": { "content": "$1" } } },
  "noImages": { "message": "No images found." },
  "pageNotSupported": { "message": "This page isn't supported. Open a regular http/https website." },
  "readError": { "message": "Couldn't read the page: $error$", "placeholders": { "error": { "content": "$1" } } },
  "permissionDenied": { "message": "Access to the image sites was not granted." },
  "downloading": { "message": "Downloading images: $count$…", "placeholders": { "count": { "content": "$1" } } },
  "buildingPdf": { "message": "Building PDF…" },
  "noneAdded": { "message": "Couldn't add any images." },
  "doneAdded": { "message": "Done: added $added$ of $total$", "placeholders": { "added": { "content": "$1" }, "total": { "content": "$2" } } },
  "failedSuffix": { "message": ", failed $count$", "placeholders": { "count": { "content": "$1" } } }
}
```

- [ ] **Step 2: Создать `_locales/ru/messages.json`**

```json
{
  "extName": { "message": "Картинки в PDF" },
  "extDescription": { "message": "Собрать картинки со страницы и сохранить выбранные в один PDF." },
  "appTitle": { "message": "Images → PDF" },
  "showAll": { "message": "показать все" },
  "selectAll": { "message": "Выбрать все" },
  "deselectAll": { "message": "Снять все" },
  "exportPdf": { "message": "Сохранить PDF" },
  "foundImages": { "message": "Найдено картинок: $count$", "placeholders": { "count": { "content": "$1" } } },
  "noImages": { "message": "Картинки не найдены." },
  "pageNotSupported": { "message": "Эта страница не поддерживается. Откройте обычный сайт (http/https).", "placeholders": {} },
  "readError": { "message": "Не удалось прочитать страницу: $error$", "placeholders": { "error": { "content": "$1" } } },
  "permissionDenied": { "message": "Доступ к сайтам картинок не выдан." },
  "downloading": { "message": "Скачиваю картинок: $count$…", "placeholders": { "count": { "content": "$1" } } },
  "buildingPdf": { "message": "Собираю PDF…" },
  "noneAdded": { "message": "Не удалось добавить ни одной картинки." },
  "doneAdded": { "message": "Готово: добавлено $added$ из $total$", "placeholders": { "added": { "content": "$1" }, "total": { "content": "$2" } } },
  "failedSuffix": { "message": ", не удалось $count$", "placeholders": { "count": { "content": "$1" } } }
}
```

- [ ] **Step 3: Проверить валидность JSON**

Run: `python3 -m json.tool _locales/en/messages.json > /dev/null && python3 -m json.tool _locales/ru/messages.json > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add _locales/
git commit -m "feat: локализация строк (en, ru)"
```

---

### Task 4: manifest.json — разрешения, локаль, версия

**Files:**
- Modify (целиком): `manifest.json`

- [ ] **Step 1: Перезаписать `manifest.json`**

```json
{
  "manifest_version": 3,
  "default_locale": "en",
  "name": "__MSG_extName__",
  "version": "1.1.0",
  "description": "__MSG_extDescription__",
  "permissions": ["activeTab", "scripting"],
  "optional_host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup.html",
    "default_title": "__MSG_extName__"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

> Изменения: добавлен `default_locale`, `name`/`description`/`default_title` через `__MSG_…__`, `host_permissions` → `optional_host_permissions`, версия `1.1.0`.

- [ ] **Step 2: Проверить валидность JSON**

Run: `python3 -m json.tool manifest.json > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "feat: опциональные host-разрешения, default_locale, v1.1.0"
```

---

### Task 5: popup.html — разметка под i18n

**Files:**
- Modify (целиком): `src/popup.html`

- [ ] **Step 1: Перезаписать `src/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <header>
      <h1 data-i18n="appTitle">Images → PDF</h1>
      <label class="show-all">
        <input type="checkbox" id="showAll" />
        <span data-i18n="showAll">show all</span>
      </label>
    </header>

    <div id="status" class="status"></div>
    <div id="grid" class="grid"></div>

    <footer>
      <div class="controls">
        <button id="selectAll" type="button" data-i18n="selectAll">Select all</button>
        <button id="deselectAll" type="button" data-i18n="deselectAll">Deselect all</button>
      </div>
      <button id="export" type="button" class="export" disabled>
        <span id="exportLabel">Export PDF (0)</span>
      </button>
    </footer>

    <!-- jsPDF как классический скрипт: кладёт window.jspdf -->
    <script src="../lib/jspdf.umd.min.js"></script>
    <!-- наша логика — ES-модуль -->
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

> Изменения: `data-i18n` на статических текстах; кнопка Export содержит `<span id="exportLabel">`, текст которой формирует JS.

- [ ] **Step 2: Commit**

```bash
git add src/popup.html
git commit -m "feat: разметка попапа под i18n"
```

---

### Task 6: popup.js — запрос разрешений + i18n

**Files:**
- Modify (целиком): `src/popup.js`

- [ ] **Step 1: Перезаписать `src/popup.js`**

```js
// Главная логика попапа: получить картинки из активной вкладки, показать сетку,
// дать выбрать и собрать PDF из выбранных.

import { prepareImages } from './lib/images.js';
import { fitRect } from './lib/pdf-layout.js';
import { pdfFilename } from './lib/filename.js';
import { distinctOrigins } from './lib/origins.js';

const MIN_SIZE = 64;        // порог фильтра мелочи (px)
const PAGE_W = 210;         // A4 ширина, мм
const PAGE_H = 297;         // A4 высота, мм
const MARGIN = 10;          // поля, мм
const AREA_W = PAGE_W - MARGIN * 2;
const AREA_H = PAGE_H - MARGIN * 2;

const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('export');
const exportLabelEl = document.getElementById('exportLabel');
const showAllEl = document.getElementById('showAll');

let rawImages = [];         // всё, что прислал content.js
const selected = new Set(); // выбранные src

// Короткий доступ к локализованной строке.
function t(key, subs) {
  return chrome.i18n.getMessage(key, subs);
}

// Подставляет локализованные тексты во все элементы с data-i18n.
function applyStaticI18n() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const msg = t(el.dataset.i18n);
    if (msg) el.textContent = msg;
  }
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

function updateExportButton() {
  exportLabelEl.textContent = `${t('exportPdf')} (${selected.size})`;
  exportBtn.disabled = selected.size === 0;
}

// Текущий отфильтрованный список (с учётом тумблера "показать все").
function visibleImages() {
  return prepareImages(rawImages, { minSize: MIN_SIZE, showAll: showAllEl.checked });
}

function renderGrid() {
  const images = visibleImages();
  gridEl.innerHTML = '';
  if (images.length === 0) {
    setStatus(t('noImages'));
    updateExportButton();
    return;
  }
  setStatus(t('foundImages', [String(images.length)]));
  for (const img of images) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (selected.has(img.src) ? ' selected' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(img.src);

    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = img.alt;
    thumb.loading = 'lazy';

    cell.appendChild(checkbox);
    cell.appendChild(thumb);

    cell.addEventListener('click', (e) => {
      if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
      if (checkbox.checked) selected.add(img.src);
      else selected.delete(img.src);
      cell.classList.toggle('selected', checkbox.checked);
      updateExportButton();
    });

    gridEl.appendChild(cell);
  }
  updateExportButton();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Внедряет content.js и запрашивает список картинок.
async function loadImages() {
  const tab = await getActiveTab();
  if (!tab || !tab.id || !/^https?:/.test(tab.url || '')) {
    setStatus(t('pageNotSupported'), true);
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content.js'],
    });
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'GET_IMAGES' });
    rawImages = (resp && resp.images) || [];
    renderGrid();
  } catch (e) {
    setStatus(t('readError', [String(e.message || e)]), true);
  }
}

// Конвертирует data-URL любого формата в JPEG через canvas.
function toJpegDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // белый фон под прозрачные PNG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      resolve({
        jpeg: canvas.toDataURL('image/jpeg', 0.92),
        w: image.naturalWidth,
        h: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error('decode failed'));
    image.src = dataUrl;
  });
}

// Собирает PDF из выбранных картинок и скачивает его.
async function exportPdf() {
  const urls = Array.from(selected);

  // Точечно просим доступ к доменам выбранных картинок.
  // ВАЖНО: до первого await, пока активен жест пользователя.
  const origins = distinctOrigins(urls);
  if (origins.length && !(await chrome.permissions.request({ origins }))) {
    setStatus(t('permissionDenied'), true);
    return;
  }

  exportBtn.disabled = true;
  setStatus(t('downloading', [String(urls.length)]));

  // Сервис-воркер качает байты (в обход CORS, по выданным разрешениям).
  const fetched = await chrome.runtime.sendMessage({ type: 'FETCH_IMAGES', urls });

  setStatus(t('buildingPdf'));
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let added = 0;
  let failed = 0;

  for (const item of fetched) {
    if (!item.ok) { failed++; continue; }
    try {
      const { jpeg, w, h } = await toJpegDataUrl(item.dataUrl);
      const rect = fitRect(w, h, AREA_W, AREA_H);
      const x = MARGIN + (AREA_W - rect.w) / 2;
      const y = MARGIN + (AREA_H - rect.h) / 2;
      if (added > 0) doc.addPage();
      doc.addImage(jpeg, 'JPEG', x, y, rect.w, rect.h);
      added++;
    } catch (e) {
      failed++;
    }
  }

  if (added === 0) {
    setStatus(t('noneAdded'), true);
    exportBtn.disabled = false;
    return;
  }

  const tab = await getActiveTab();
  let host = 'page';
  try { host = new URL(tab.url).hostname; } catch (e) { /* оставляем page */ }
  const isoDate = new Date().toISOString().slice(0, 10);
  doc.save(pdfFilename(host, isoDate));

  setStatus(
    t('doneAdded', [String(added), String(urls.length)]) +
    (failed ? t('failedSuffix', [String(failed)]) : '')
  );
  exportBtn.disabled = false;
}

document.getElementById('selectAll').addEventListener('click', () => {
  for (const img of visibleImages()) selected.add(img.src);
  renderGrid();
});
document.getElementById('deselectAll').addEventListener('click', () => {
  selected.clear();
  renderGrid();
});
showAllEl.addEventListener('change', renderGrid);
exportBtn.addEventListener('click', exportPdf);

// Старт.
applyStaticI18n();
updateExportButton();
loadImages();
```

> Изменения: импорт `distinctOrigins`; хелперы `t()` и `applyStaticI18n()`; кнопка через `exportLabelEl`; все строки через `t(...)`; в начале `exportPdf` — `chrome.permissions.request` по доменам (до первого await); запуск через `applyStaticI18n(); updateExportButton(); loadImages();`. На отказ в разрешении кнопка не блокировалась (disabled ставим только после выдачи).

- [ ] **Step 2: Проверить синтаксис**

Run: `node --check src/popup.js`
Expected: нет вывода, код выхода 0.

- [ ] **Step 3: Commit**

```bash
git add src/popup.js
git commit -m "feat: запрос host-разрешений по требованию + i18n в попапе"
```

---

### Task 7: Сборка ZIP

**Files:**
- Create: `tools/package.sh`
- Modify (целиком): `.gitignore`

- [ ] **Step 1: Создать `tools/package.sh`**

```bash
#!/usr/bin/env bash
# Собирает ZIP для загрузки в Chrome Web Store — только рантайм-файлы.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
zip -rq dist/images-to-pdf.zip \
  manifest.json src lib icons _locales \
  -x '*.DS_Store'
echo "Создан dist/images-to-pdf.zip"
unzip -l dist/images-to-pdf.zip
```

- [ ] **Step 2: Перезаписать `.gitignore`**

```gitignore
.DS_Store
node_modules/
*.log
dist/
```

- [ ] **Step 3: Собрать и проверить архив**

Run: `bash tools/package.sh`
Expected: вывод `unzip -l` содержит `manifest.json`, `src/...`, `lib/jspdf.umd.min.js`, `icons/...`, `_locales/...` и НЕ содержит `docs/`, `tests/`, `tools/`, `package.json`.

- [ ] **Step 4: Commit**

```bash
git add tools/package.sh .gitignore
git commit -m "build: скрипт сборки ZIP для Web Store"
```

---

### Task 8: PRIVACY.md

**Files:**
- Create: `PRIVACY.md`

- [ ] **Step 1: Создать `PRIVACY.md`**

```markdown
# Privacy Policy — Images to PDF

_Last updated: 2026-06-04_

Images to PDF does **not** collect, store, or transmit any personal data.

## What the extension does
All processing happens locally in your browser. When you click **Export PDF**,
the extension downloads the image files you selected — directly from the
websites that host them — solely to embed them into a PDF that is then saved to
your device.

## Data collection
- No personal data is collected.
- No analytics or tracking.
- No data is sent to the developer or any third-party server.
- The generated PDF is created on your device and is never uploaded.

## Permissions
- **activeTab / scripting** — read the list of images on the page you are
  viewing, only when you open the extension.
- **Host access (requested on demand)** — when you export, the extension asks
  for access to the specific websites that host the images you selected, so it
  can download them. Access is requested only at that moment and only for those
  sites.

## Contact
Questions or concerns: open an issue in the project repository.
```

- [ ] **Step 2: Commit**

```bash
git add PRIVACY.md
git commit -m "docs: политика конфиденциальности"
```

---

### Task 9: STORE-LISTING.md

**Files:**
- Create: `STORE-LISTING.md`

- [ ] **Step 1: Создать `STORE-LISTING.md`**

````markdown
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
  <img> elements on demand.
- **optional host permissions (<all_urls>, requested at export time)** — needed
  to download the bytes of the images the user selected so they can be embedded
  in the PDF; requested only for the specific domains of those images.

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
````

- [ ] **Step 2: Commit**

```bash
git add STORE-LISTING.md
git commit -m "docs: материалы для листинга в Web Store"
```

---

### Task 10: Обновить README

**Files:**
- Modify (целиком): `README.md`

- [ ] **Step 1: Перезаписать `README.md`**

````markdown
# Images to PDF — расширение Chrome

Собирает картинки (`<img>`) с текущей страницы, даёт выбрать нужные в сетке
и сохраняет их в один PDF — каждая картинка на отдельной странице A4.
Локализация: английский (по умолчанию) и русский.

## Установка (режим разработчика)

1. Открой `chrome://extensions`.
2. Включи **Режим разработчика** (переключатель справа сверху).
3. Нажми **Загрузить распакованное расширение** и выбери папку `images-to-pdf/`.
4. В панели появится иконка расширения.

## Использование

1. Открой любой сайт (http/https).
2. Нажми иконку расширения — в попапе появится сетка картинок.
3. По умолчанию мелочь (< 64×64 px) скрыта; включи «показать все», чтобы видеть всё.
4. Отметь нужные картинки (или «Выбрать все»).
5. Нажми **Export PDF**. При первом экспорте Chrome спросит доступ к доменам
   выбранных картинок — разреши, чтобы их можно было скачать. Файл
   `images-<сайт>-<дата>.pdf` скачается.

## Как устроено

- `src/popup.*` — интерфейс и оркестровка; собирает PDF библиотекой jsPDF.
- `src/content.js` — внедряется в страницу по требованию, собирает `<img>`.
- `src/background.js` — сервис-воркер, качает байты картинок в обход CORS.
- `src/lib/*.js` — чистая логика (фильтр, вписывание, имя файла, base64, origins).
- `_locales/{en,ru}/messages.json` — локализованные строки.

> Разрешения: расширение просит только `activeTab` + `scripting`. Доступ к
> доменам картинок (`optional_host_permissions`) запрашивается по требованию в
> момент экспорта — точечно к нужным сайтам.

## Разработка

Юнит-тесты чистой логики (нужен Node 18+):

```bash
node --test tests/*.test.js
```

Перегенерировать иконки:

```bash
python3 tools/make-icons.py
```

Собрать ZIP для Chrome Web Store (попадёт в `dist/images-to-pdf.zip`):

```bash
bash tools/package.sh
```

Тексты листинга и политика — в `STORE-LISTING.md` и `PRIVACY.md`.

## Ручной чек-лист (проверка в браузере)

1. При установке нет предупреждения «доступ ко всем сайтам».
2. Страница с многими картинками — превью видны нормальными плитками.
3. Export → запрос доступа к домену картинок → «Разрешить» → PDF.
4. Повторный экспорт на тот же домен — без повторного запроса.
5. «Отклонить» в запросе → мягкое сообщение, кнопка снова активна.
6. Страница без картинок → «Картинки не найдены»; `chrome://extensions` →
   «страница не поддерживается».
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README — разрешения по требованию, i18n, сборка"
```

---

### Task 11: Финальная проверка и загрузка

**Files:** нет новых; правки по итогам — в соответствующих файлах.

- [ ] **Step 1: Все юнит-тесты**

Run: `node --test tests/*.test.js`
Expected: PASS — 16 тестов (11 прежних + 5 из origins).

- [ ] **Step 2: Синтаксис JS-файлов**

Run: `for f in src/content.js src/background.js src/popup.js src/lib/origins.js; do node --check "$f" && echo "OK: $f"; done`
Expected: четыре строки `OK:`.

- [ ] **Step 3: Валидность всех JSON**

Run:
```bash
for f in manifest.json package.json _locales/en/messages.json _locales/ru/messages.json; do
  python3 -m json.tool "$f" > /dev/null && echo "OK: $f"
done
```
Expected: четыре строки `OK:`.

- [ ] **Step 4: Собрать ZIP и проверить состав**

Run: `bash tools/package.sh`
Expected: архив создан; в списке есть `manifest.json`, `_locales/`, `src/`, `lib/`, `icons/`; нет `docs/`, `tests/`, `tools/`.

- [ ] **Step 5: Ручной ре-тест в браузере (выполняет пользователь)**

1. `chrome://extensions` → перезагрузить расширение (или удалить и загрузить заново).
2. Убедиться, что при загрузке нет предупреждения «доступ ко всем сайтам».
3. Открыть страницу с ~180 картинками → превью видны нормальными плитками, сетка листается.
4. Выбрать пару картинок → **Export PDF** → появляется запрос доступа к домену(ам) → «Разрешить» → PDF скачивается, число страниц = числу выбранных.
5. Повторный экспорт на тот же домен → без повторного запроса.
6. В запросе нажать «Отклонить» → статус «Доступ … не выдан», кнопка активна.
7. Сменить язык браузера на английский (или на en-локали) → интерфейс на английском.

Expected: все пункты совпадают с описанием.

- [ ] **Step 6: Зафиксировать (если были правки)**

```bash
git add -A
git commit -m "fix: правки по итогам ре-теста"
```
Если правок не было — коммит не нужен; всё готово к загрузке в дашборд.

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** разрешения по требованию (Tasks 1, 4, 6); фикс превью (Task 2); i18n каталоги (Task 3), манифест-локаль (Task 4), разметка (Task 5), логика (Task 6); сборка ZIP + .gitignore (Task 7); PRIVACY (Task 8); STORE-LISTING + чек-лист скриншотов + вопрос хостинга политики (Task 9); README (Task 10); обработка ошибок (отказ в разрешении, только-data: — Task 6); тестирование юнит + ручное (Tasks 1, 11). Версия 1.1.0 (Task 4). Пробелов нет.
- **Плейсхолдеры:** нет — везде готовый код/контент и конкретные команды.
- **Согласованность типов/имён:** `distinctOrigins`, `t`, `applyStaticI18n`, `exportLabel`, набор i18n-ключей и плейсхолдеров (`$count$`, `$error$`, `$added$`, `$total$`) совпадают между `_locales/*`, `popup.html` и `popup.js`. Пути файлов согласованы (`src/lib/origins.js`, `_locales/...`).
