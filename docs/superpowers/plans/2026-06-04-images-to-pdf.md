# Images-to-PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Расширение Chrome (MV3), которое собирает `<img>` с текущей страницы, даёт выбрать нужные в сетке попапа и сохраняет их в один PDF (одна картинка на страницу).

**Architecture:** Попап внедряет `content.js` по требованию (`chrome.scripting`), запрашивает у него список картинок сообщением, рисует сетку с галочками. На Export попап шлёт выбранные URL сервис-воркеру (`background.js`), который качает байты в обход CORS (`host_permissions`) и возвращает их как data-URL. Попап нормализует каждую картинку через canvas в JPEG и собирает PDF библиотекой jsPDF, затем инициирует скачивание. Вся чистая логика (фильтр/дедуп, мат. вписывания, имя файла, base64) вынесена в модули `src/lib/*.js` и покрыта юнит-тестами.

**Tech Stack:** Chrome Manifest V3, чистые HTML/CSS/JS (ES-модули, без сборки/npm), jsPDF 2.5.1 (UMD, локально). Тесты — встроенный раннер Node (`node --test`, нужен Node 18+; в проекте Node 23). Иконки генерируются скриптом на Python 3 (без зависимостей).

**Соглашения:**
- В шагах для краткости показан только заголовок коммита.
- Рабочая директория всех команд — корень проекта `images-to-pdf/`.
- Комментарии в коде — на русском (учебный проект).

**Интерфейсы (единые имена во всех задачах):**
- `prepareImages(images, {minSize, showAll})` → отфильтрованный массив; `dedupeImages(images)` → без дублей. Файл `src/lib/images.js`.
- `fitRect(imgW, imgH, areaW, areaH)` → `{w, h}`. Файл `src/lib/pdf-layout.js`.
- `pdfFilename(hostname, isoDate)` → строка `images-<host>-<date>.pdf`. Файл `src/lib/filename.js`.
- `arrayBufferToBase64(buffer)` → base64-строка. Файл `src/lib/base64.js`.
- Сообщение попап→content: `{type: 'GET_IMAGES'}` → ответ `{images: [{src, width, height, alt}]}`.
- Сообщение попап→background: `{type: 'FETCH_IMAGES', urls}` → ответ `[{url, ok, dataUrl?, error?}]`.
- Флаг защиты от повторного внедрения: `window.__imagesToPdfInjected`.

**Карта файлов:**
- `manifest.json` — конфиг MV3.
- `package.json` — только чтобы Node трактовал `.js` как ESM и для `node --test`.
- `src/content.js` — сбор `<img>` + ответ на сообщение (классический скрипт, внедряется по требованию).
- `src/background.js` — сервис-воркер (ES-модуль): качает байты, кодирует в base64.
- `src/popup.html` / `src/popup.css` / `src/popup.js` — интерфейс попапа и вся оркестровка (ES-модуль).
- `src/lib/images.js`, `src/lib/pdf-layout.js`, `src/lib/filename.js`, `src/lib/base64.js` — чистая логика (тестируется).
- `lib/jspdf.umd.min.js` — библиотека локально.
- `icons/icon16.png`, `icon48.png`, `icon128.png` — иконки.
- `tools/make-icons.py` — генератор иконок.
- `tests/*.test.js` — юнит-тесты чистой логики.
- `README.md` — установка, использование, чек-лист тестирования.

---

### Task 1: Тулинг и вендоринг jsPDF

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `lib/jspdf.umd.min.js` (скачивается)

- [ ] **Step 1: Создать `package.json`**

```json
{
  "name": "images-to-pdf",
  "private": true,
  "type": "module",
  "version": "1.0.0",
  "description": "Chrome MV3 расширение: картинки со страницы в один PDF",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: Создать `.gitignore`**

```gitignore
.DS_Store
node_modules/
*.log
```

- [ ] **Step 3: Скачать jsPDF локально**

Run:
```bash
curl -fsSL -o lib/jspdf.umd.min.js https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js
```
Expected: файл создан без ошибок.

- [ ] **Step 4: Проверить, что jsPDF скачался корректно**

Run:
```bash
test -s lib/jspdf.umd.min.js && grep -q "jsPDF" lib/jspdf.umd.min.js && wc -c < lib/jspdf.umd.min.js
```
Expected: команда печатает размер (~300000+ байт) и завершается с кодом 0. Если файл пуст или нет строки `jsPDF` — сеть недоступна; скачать файл вручную с https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js и положить в `lib/`.

- [ ] **Step 5: Проверить версию Node (нужен 18+)**

Run: `node --version`
Expected: `v18.x` или выше.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore lib/jspdf.umd.min.js
git commit -m "chore: тулинг проекта и вендоринг jsPDF 2.5.1"
```

---

### Task 2: manifest.json

**Files:**
- Create: `manifest.json`

> Примечание: расширение НЕ загружаем в Chrome до Task 13 — часть файлов, на которые ссылается манифест, появится в следующих задачах.

- [ ] **Step 1: Создать `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Images to PDF",
  "version": "1.0.0",
  "description": "Собрать картинки с текущей страницы и сохранить выбранные в один PDF.",
  "permissions": ["activeTab", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup.html",
    "default_title": "Images to PDF"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 2: Проверить, что это валидный JSON**

Run: `python3 -m json.tool manifest.json > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "feat: манифест MV3 (попап, сервис-воркер, разрешения)"
```

---

### Task 3: Логика подготовки картинок (TDD)

**Files:**
- Create: `src/lib/images.js`
- Test: `tests/images.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/images.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeImages, prepareImages } from '../src/lib/images.js';

test('dedupeImages убирает повторяющиеся src, сохраняя порядок', () => {
  const input = [
    { src: 'a', width: 100, height: 100 },
    { src: 'a', width: 100, height: 100 },
    { src: 'b', width: 50, height: 50 },
  ];
  const out = dedupeImages(input);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((i) => i.src), ['a', 'b']);
});

test('prepareImages отсеивает картинки меньше minSize по любой стороне', () => {
  const input = [
    { src: 'big', width: 200, height: 200 },
    { src: 'wide-but-low', width: 200, height: 10 },
    { src: 'small', width: 10, height: 10 },
  ];
  const out = prepareImages(input, { minSize: 64, showAll: false });
  assert.deepEqual(out.map((i) => i.src), ['big']);
});

test('prepareImages с showAll возвращает всё (после дедупа)', () => {
  const input = [
    { src: 'big', width: 200, height: 200 },
    { src: 'small', width: 10, height: 10 },
    { src: 'small', width: 10, height: 10 },
  ];
  const out = prepareImages(input, { minSize: 64, showAll: true });
  assert.equal(out.length, 2);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test tests/images.test.js`
Expected: FAIL — `Cannot find module '.../src/lib/images.js'`.

- [ ] **Step 3: Реализовать минимально**

Создать `src/lib/images.js`:
```js
// Подготовка списка картинок: дедуп по src и фильтр по минимальному размеру.
// Чистые функции без DOM/chrome.* — чтобы покрыть юнит-тестами в Node.

/**
 * Убирает картинки с повторяющимся src, оставляя первую. Порядок сохраняется.
 * @param {Array<{src:string,width:number,height:number,alt?:string}>} images
 * @returns {Array}
 */
export function dedupeImages(images) {
  const seen = new Set();
  const result = [];
  for (const img of images) {
    if (seen.has(img.src)) continue;
    seen.add(img.src);
    result.push(img);
  }
  return result;
}

/**
 * Дедуп + фильтр по минимальному размеру (если не showAll).
 * Картинка проходит, только если обе стороны >= minSize.
 * @param {Array} images сырой список со страницы
 * @param {{minSize:number, showAll:boolean}} opts
 * @returns {Array}
 */
export function prepareImages(images, { minSize, showAll }) {
  const unique = dedupeImages(images);
  if (showAll) return unique;
  return unique.filter((img) => img.width >= minSize && img.height >= minSize);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test tests/images.test.js`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.js tests/images.test.js
git commit -m "feat: фильтр и дедуп списка картинок"
```

---

### Task 4: Мат. вписывания картинки в страницу PDF (TDD)

**Files:**
- Create: `src/lib/pdf-layout.js`
- Test: `tests/pdf-layout.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/pdf-layout.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitRect } from '../src/lib/pdf-layout.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('широкая картинка ограничена шириной области', () => {
  const { w, h } = fitRect(1000, 500, 190, 277);
  assert.ok(near(w, 190), `w=${w}`);
  assert.ok(near(h, 95), `h=${h}`);
});

test('высокая картинка ограничена высотой области', () => {
  const { w, h } = fitRect(500, 1000, 190, 277);
  assert.ok(near(h, 277), `h=${h}`);
  assert.ok(near(w, 138.5), `w=${w}`);
});

test('квадрат в квадратной области занимает её целиком', () => {
  const { w, h } = fitRect(300, 300, 200, 200);
  assert.ok(near(w, 200) && near(h, 200));
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test tests/pdf-layout.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать минимально**

Создать `src/lib/pdf-layout.js`:
```js
// Вписывание картинки в прямоугольную область с сохранением пропорций.
// Чистая функция — тестируется в Node.

/**
 * Масштабирует картинку, чтобы она целиком влезла в область area,
 * сохраняя пропорции. Единицы area и результата одинаковы (у нас мм);
 * у картинки важно лишь соотношение сторон.
 * @param {number} imgW ширина картинки
 * @param {number} imgH высота картинки
 * @param {number} areaW ширина доступной области
 * @param {number} areaH высота доступной области
 * @returns {{w:number, h:number}} размеры картинки в единицах области
 */
export function fitRect(imgW, imgH, areaW, areaH) {
  const scale = Math.min(areaW / imgW, areaH / imgH);
  return { w: imgW * scale, h: imgH * scale };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test tests/pdf-layout.test.js`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf-layout.js tests/pdf-layout.test.js
git commit -m "feat: расчёт вписывания картинки в страницу PDF"
```

---

### Task 5: Имя PDF-файла (TDD)

**Files:**
- Create: `src/lib/filename.js`
- Test: `tests/filename.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/filename.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pdfFilename } from '../src/lib/filename.js';

test('убирает ведущее www. и подставляет дату', () => {
  assert.equal(
    pdfFilename('www.example.com', '2026-06-04'),
    'images-example.com-2026-06-04.pdf'
  );
});

test('заменяет небезопасные для имени файла символы на _', () => {
  assert.equal(
    pdfFilename('a/b:c', '2026-06-04'),
    'images-a_b_c-2026-06-04.pdf'
  );
});

test('пустой hostname заменяется на page', () => {
  assert.equal(pdfFilename('', '2026-06-04'), 'images-page-2026-06-04.pdf');
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test tests/filename.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать минимально**

Создать `src/lib/filename.js`:
```js
// Формирование имени PDF-файла из домена страницы и даты.

/**
 * Чистит hostname: убирает ведущее www. и небезопасные символы.
 * @param {string} hostname например "www.example.com"
 * @returns {string} например "example.com"
 */
function cleanHost(hostname) {
  return (hostname || 'page')
    .replace(/^www\./, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Имя файла вида images-<сайт>-<дата>.pdf
 * @param {string} hostname домен страницы
 * @param {string} isoDate дата в формате YYYY-MM-DD
 * @returns {string}
 */
export function pdfFilename(hostname, isoDate) {
  return `images-${cleanHost(hostname)}-${isoDate}.pdf`;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test tests/filename.test.js`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/lib/filename.js tests/filename.test.js
git commit -m "feat: генерация имени PDF-файла"
```

---

### Task 6: Кодирование ArrayBuffer в base64 (TDD)

**Files:**
- Create: `src/lib/base64.js`
- Test: `tests/base64.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/base64.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrayBufferToBase64 } from '../src/lib/base64.js';

test('кодирует короткую строку', () => {
  const buf = new TextEncoder().encode('hi').buffer;
  assert.equal(arrayBufferToBase64(buf), 'aGk=');
});

test('корректно кодирует большой буфер (проверка обработки кусками)', () => {
  const n = 100000;
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[i] = i % 256;
  // эталон: побайтовая бинарная строка через btoa
  let binary = '';
  for (let i = 0; i < n; i++) binary += String.fromCharCode(arr[i]);
  assert.equal(arrayBufferToBase64(arr.buffer), btoa(binary));
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test tests/base64.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать минимально**

Создать `src/lib/base64.js`:
```js
// Кодирование бинарных данных (ArrayBuffer) в base64.
// Используется в сервис-воркере после fetch картинки.
// btoa доступен и в браузере, и в Node 16+, поэтому функция тестируется в Node.

/**
 * Преобразует ArrayBuffer в base64-строку. Обрабатывает данные кусками,
 * чтобы не переполнить стек на больших картинках: String.fromCharCode(...arr)
 * с огромным массивом аргументов падает.
 * @param {ArrayBuffer} buffer
 * @returns {string} base64 без префикса "data:"
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32768 — безопасный размер для apply
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test tests/base64.test.js`
Expected: PASS (2 теста).

- [ ] **Step 5: Прогнать ВСЕ юнит-тесты разом**

Run: `node --test tests/`
Expected: PASS (все 11 тестов из четырёх файлов).

- [ ] **Step 6: Commit**

```bash
git add src/lib/base64.js tests/base64.test.js
git commit -m "feat: кодирование ArrayBuffer в base64 кусками"
```

---

### Task 7: content.js — сбор картинок со страницы

**Files:**
- Create: `src/content.js`

> Это классический скрипт, внедряемый по требованию через `chrome.scripting.executeScript`. Автоматически в Node/браузере вне расширения не запускается; здесь проверяем только синтаксис, поведение — в Task 13.

- [ ] **Step 1: Создать `src/content.js`**

```js
// Content script: внедряется в активную вкладку по требованию из попапа.
// Собирает все загруженные <img> и по запросу отдаёт их попапу сообщением.
// Защита от повторного внедрения: при повторном открытии попапа слушатель
// не вешается второй раз (иначе будет несколько ответов на одно сообщение).

if (!window.__imagesToPdfInjected) {
  window.__imagesToPdfInjected = true;

  // Собирает загруженные <img>, возвращает упрощённые данные.
  // naturalWidth > 0 отсекает ещё не загруженные/битые картинки.
  function collectImages() {
    return Array.from(document.images)
      .map((img) => ({
        // currentSrc учитывает srcset/<picture>; запасной вариант — src.
        src: img.currentSrc || img.src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        alt: img.alt || '',
      }))
      .filter((img) => img.src && img.width > 0 && img.height > 0);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'GET_IMAGES') {
      sendResponse({ images: collectImages() });
    }
    // ответ синхронный — возвращать true не нужно
  });
}
```

- [ ] **Step 2: Проверить синтаксис**

Run: `node --check src/content.js`
Expected: нет вывода, код выхода 0.

- [ ] **Step 3: Commit**

```bash
git add src/content.js
git commit -m "feat: content script собирает <img> со страницы"
```

---

### Task 8: background.js — сервис-воркер качает картинки

**Files:**
- Create: `src/background.js`

- [ ] **Step 1: Создать `src/background.js`**

```js
// Сервис-воркер: по запросу попапа качает картинки по их URL и возвращает
// как data-URL. Сервис-воркер расширения с host_permissions делает
// кросс-доменные fetch в обход CORS — поэтому качаем здесь, а не в попапе.

import { arrayBufferToBase64 } from './lib/base64.js';

// Качает одну картинку. Никогда не бросает — возвращает объект с ok:false.
async function fetchOne(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return { url, ok: false, error: `HTTP ${resp.status}` };
    }
    const type = resp.headers.get('content-type') || 'image/jpeg';
    const buf = await resp.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    return { url, ok: true, dataUrl: `data:${type};base64,${base64}` };
  } catch (e) {
    return { url, ok: false, error: String(e && e.message ? e.message : e) };
  }
}

// Качает все картинки параллельно, сохраняя порядок.
async function fetchAll(urls) {
  return Promise.all(urls.map(fetchOne));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'FETCH_IMAGES') {
    fetchAll(message.urls).then(sendResponse);
    return true; // ответ придёт асинхронно — держим канал открытым
  }
});
```

- [ ] **Step 2: Проверить синтаксис**

Run: `node --check src/background.js`
Expected: нет вывода, код выхода 0.

- [ ] **Step 3: Commit**

```bash
git add src/background.js
git commit -m "feat: сервис-воркер качает картинки в обход CORS"
```

---

### Task 9: popup.html и popup.css

**Files:**
- Create: `src/popup.html`
- Create: `src/popup.css`

- [ ] **Step 1: Создать `src/popup.html`**

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <header>
      <h1>Images → PDF</h1>
      <label class="show-all">
        <input type="checkbox" id="showAll" /> показать все
      </label>
    </header>

    <div id="status" class="status"></div>
    <div id="grid" class="grid"></div>

    <footer>
      <div class="controls">
        <button id="selectAll" type="button">Выбрать все</button>
        <button id="deselectAll" type="button">Снять все</button>
      </div>
      <button id="export" type="button" class="export" disabled>
        Export PDF (<span id="count">0</span>)
      </button>
    </footer>

    <!-- jsPDF как классический скрипт: кладёт window.jspdf -->
    <script src="../lib/jspdf.umd.min.js"></script>
    <!-- наша логика — ES-модуль -->
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Создать `src/popup.css`**

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
  grid-template-columns: repeat(3, 1fr);
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
  background: #fafafa;
}
.cell.selected { border-color: #2d7ff9; }
.cell img { width: 100%; height: 100%; object-fit: contain; display: block; }
.cell input { position: absolute; top: 6px; left: 6px; width: 16px; height: 16px; }
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

- [ ] **Step 3: Проверить, что файлы созданы**

Run: `test -f src/popup.html && test -f src/popup.css && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add src/popup.html src/popup.css
git commit -m "feat: разметка и стили попапа"
```

---

### Task 10: popup.js — оркестровка и сборка PDF

**Files:**
- Create: `src/popup.js`

- [ ] **Step 1: Создать `src/popup.js`**

```js
// Главная логика попапа: получить картинки из активной вкладки, показать сетку,
// дать выбрать и собрать PDF из выбранных.

import { prepareImages } from './lib/images.js';
import { fitRect } from './lib/pdf-layout.js';
import { pdfFilename } from './lib/filename.js';

const MIN_SIZE = 64;        // порог фильтра мелочи (px)
const PAGE_W = 210;         // A4 ширина, мм
const PAGE_H = 297;         // A4 высота, мм
const MARGIN = 10;          // поля, мм
const AREA_W = PAGE_W - MARGIN * 2;
const AREA_H = PAGE_H - MARGIN * 2;

const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const exportBtn = document.getElementById('export');
const showAllEl = document.getElementById('showAll');

let rawImages = [];         // всё, что прислал content.js
const selected = new Set(); // выбранные src

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

function updateExportButton() {
  countEl.textContent = String(selected.size);
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
    setStatus('Картинки не найдены.');
    updateExportButton();
    return;
  }
  setStatus(`Найдено картинок: ${images.length}`);
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

    // Клик по ячейке переключает выбор. Если кликнули прямо по чекбоксу —
    // он уже переключился сам, повторно не трогаем.
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
    setStatus('Эта страница не поддерживается. Откройте обычный сайт (http/https).', true);
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
    setStatus('Не удалось прочитать страницу: ' + (e.message || e), true);
  }
}

// Конвертирует data-URL любого формата в JPEG через canvas.
// Нормализует формат для jsPDF и убирает проблему tainted canvas.
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
    image.onerror = () => reject(new Error('не удалось декодировать картинку'));
    image.src = dataUrl;
  });
}

// Собирает PDF из выбранных картинок и скачивает его.
async function exportPdf() {
  const urls = Array.from(selected);
  exportBtn.disabled = true;
  setStatus(`Скачиваю картинок: ${urls.length}…`);

  // 1. Сервис-воркер качает байты (в обход CORS).
  const fetched = await chrome.runtime.sendMessage({ type: 'FETCH_IMAGES', urls });

  // 2. Собираем PDF.
  setStatus('Собираю PDF…');
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
    setStatus('Не удалось добавить ни одной картинки.', true);
    exportBtn.disabled = false;
    return;
  }

  // 3. Имя файла из домена активной вкладки и сегодняшней даты.
  const tab = await getActiveTab();
  let host = 'page';
  try { host = new URL(tab.url).hostname; } catch (e) { /* оставляем page */ }
  const isoDate = new Date().toISOString().slice(0, 10);
  doc.save(pdfFilename(host, isoDate));

  setStatus(
    `Готово: добавлено ${added} из ${urls.length}` + (failed ? `, не удалось ${failed}` : '')
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
loadImages();
```

- [ ] **Step 2: Проверить синтаксис**

Run: `node --check src/popup.js`
Expected: нет вывода, код выхода 0.

- [ ] **Step 3: Commit**

```bash
git add src/popup.js
git commit -m "feat: оркестровка попапа и сборка PDF через jsPDF"
```

---

### Task 11: Иконки расширения

**Files:**
- Create: `tools/make-icons.py`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`

- [ ] **Step 1: Создать генератор `tools/make-icons.py`**

```python
#!/usr/bin/env python3
"""Генерирует простые иконки (красный фон + белая «страница») без зависимостей."""
import os
import struct
import zlib


def write_png(path, size, pixels):
    """pixels — список (r,g,b) длиной size*size, по строкам."""
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data
                + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))

    raw = bytearray()
    idx = 0
    for _y in range(size):
        raw.append(0)  # фильтр строки = 0
        for _x in range(size):
            r, g, b = pixels[idx]
            idx += 1
            raw += bytes((r, g, b))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-бит RGB
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def make_pixels(size):
    bg = (214, 69, 61)        # красный
    page = (255, 255, 255)    # белая «страница»
    inset = max(2, size // 4)
    out = []
    for y in range(size):
        for x in range(size):
            if inset <= x < size - inset and inset <= y < size - inset:
                out.append(page)
            else:
                out.append(bg)
    return out


def main():
    os.makedirs("icons", exist_ok=True)
    for s in (16, 48, 128):
        write_png(f"icons/icon{s}.png", s, make_pixels(s))
        print(f"icons/icon{s}.png")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Сгенерировать иконки**

Run: `python3 tools/make-icons.py`
Expected: печатает три пути.

- [ ] **Step 3: Проверить, что это валидные PNG нужных размеров**

Run: `file icons/icon16.png icons/icon48.png icons/icon128.png`
Expected: каждая строка содержит `PNG image data` и размеры `16 x 16`, `48 x 48`, `128 x 128` соответственно.

- [ ] **Step 4: Commit**

```bash
git add tools/make-icons.py icons/icon16.png icons/icon48.png icons/icon128.png
git commit -m "feat: генерация иконок расширения"
```

---

### Task 12: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Создать `README.md`**

````markdown
# Images to PDF — расширение Chrome

Собирает картинки (`<img>`) с текущей страницы, даёт выбрать нужные в сетке
и сохраняет их в один PDF — каждая картинка на отдельной странице A4.

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
5. Нажми **Export PDF** — файл `images-<сайт>-<дата>.pdf` скачается.

## Как устроено

- `src/popup.*` — интерфейс и оркестровка; собирает PDF библиотекой jsPDF.
- `src/content.js` — внедряется в страницу по требованию, собирает `<img>`.
- `src/background.js` — сервис-воркер, качает байты картинок в обход CORS
  (поэтому в манифесте `host_permissions: <all_urls>`).
- `src/lib/*.js` — чистая логика (фильтр, вписывание, имя файла, base64), под тестами.

> Разрешение `<all_urls>` широкое — оно нужно, чтобы качать картинки с любых
> CDN. Для публикации в Chrome Web Store его стоит сузить или вынести в
> опциональные разрешения.

## Разработка и тесты

Юнит-тесты чистой логики (нужен Node 18+):

```bash
node --test tests/
```

Иконки при необходимости перегенерировать:

```bash
python3 tools/make-icons.py
```

## Ручной чек-лист (проверка в браузере)

Основные сценарии:
1. Фотогалерея (много больших фото) — все картинки видны, экспорт корректный.
2. Новостная статья (текст + 2–3 картинки) — мелочь скрыта, нужное на месте.
3. Страница с кучей иконок — фильтр < 64px работает, тумблер «показать все» работает.

Edge-кейсы:
4. Страница без картинок → «Картинки не найдены».
5. `chrome://extensions` → «Эта страница не поддерживается».
6. Картинка с битой ссылкой / 403 → пропущена, в статусе «не удалось K».
7. «Снять все» → кнопка Export неактивна.

Проверка результата: открой PDF, убедись, что число страниц равно числу
выбранных картинок и пропорции сохранены.
````

- [ ] **Step 2: Проверить, что файл создан**

Run: `test -f README.md && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README с установкой, использованием и чек-листом"
```

---

### Task 13: Загрузка в Chrome и ручная проверка по чек-листу

**Files:** нет новых; правки по итогам проверки — в соответствующих файлах.

> Это интеграционная проверка — единственный способ протестировать связку
> попап ↔ content ↔ сервис-воркер. Выполняется человеком в браузере.

- [ ] **Step 1: Финальная проверка дерева проекта**

Run:
```bash
ls manifest.json package.json README.md \
   src/content.js src/background.js src/popup.html src/popup.css src/popup.js \
   src/lib/images.js src/lib/pdf-layout.js src/lib/filename.js src/lib/base64.js \
   lib/jspdf.umd.min.js icons/icon16.png icons/icon48.png icons/icon128.png
```
Expected: все файлы перечислены без ошибок.

- [ ] **Step 2: Прогнать все юнит-тесты**

Run: `node --test tests/`
Expected: PASS (все тесты зелёные).

- [ ] **Step 3: Загрузить расширение**

Открыть `chrome://extensions` → включить «Режим разработчика» → «Загрузить распакованное расширение» → выбрать папку `images-to-pdf/`.
Expected: расширение появилось без ошибок; у карточки нет красной кнопки «Ошибки»; сервис-воркер в статусе «активен/неактивен» без ошибок.

- [ ] **Step 4: Сценарий 1 — фотогалерея**

Открыть страницу с множеством крупных фото (например, любую фотоленту) → нажать иконку.
Expected: сетка показывает крупные картинки; «Выбрать все» → счётчик растёт; Export → скачивается PDF; в PDF число страниц = числу выбранных, пропорции сохранены.

- [ ] **Step 5: Сценарий 2 — статья с мелкими иконками**

Открыть новостную статью → нажать иконку.
Expected: мелкие иконки скрыты; включить «показать все» → иконки появляются; снять «показать все» → снова скрыты.

- [ ] **Step 6: Edge-кейсы**

Проверить по очереди:
- Страница без картинок → статус «Картинки не найдены».
- `chrome://extensions` → статус «Эта страница не поддерживается».
- «Снять все» → кнопка Export неактивна (disabled).
Expected: поведение совпадает с описанием.

- [ ] **Step 7: Зафиксировать результат**

Если всё прошло — изменений в коде нет. Если что-то чинили — закоммитить:
```bash
git add -A
git commit -m "fix: правки по итогам ручной проверки"
```
Если правок не было, коммит не нужен — расширение готово.

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** сценарий (Tasks 7–13), сетка с галочками (Task 10), фильтр <64px + «показать все» (Tasks 3, 10), дедуп (Task 3), сервис-воркер/CORS (Task 8), A4 одна картинка/страница (Tasks 4, 10), имя файла (Tasks 5, 10), jsPDF локально (Task 1), обработка ошибок: нет картинок / chrome:// / CORS-403 / снять все (Tasks 10, 13), внедрение content.js по требованию (Tasks 7, 10), `host_permissions` (Task 2), чек-лист тестирования (Tasks 12, 13), вне рамок v1 — не реализуется (ок). Пробелов нет.
- **Плейсхолдеры:** нет — каждый шаг с готовым кодом и конкретной командой.
- **Согласованность типов:** имена и сигнатуры (`prepareImages`, `fitRect`, `pdfFilename`, `arrayBufferToBase64`, типы сообщений `GET_IMAGES`/`FETCH_IMAGES`, флаг `__imagesToPdfInjected`, пути файлов) совпадают между задачами, где определяются и где используются.
