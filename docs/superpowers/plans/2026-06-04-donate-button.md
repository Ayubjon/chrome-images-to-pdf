# Donate Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в попап ненавязчивую полоску «Поддержать разработчика», открывающую Binance Pay ссылку; полоска скрыта, пока URL не задан. Версия → 1.2.0.

**Architecture:** Новый чистый модуль `src/lib/donate.js` с `isConfiguredDonateUrl(url)` (под тестом) решает, показывать ли полоску. В `popup.js` — константа `DONATE_URL` (одна строка для замены) и `setupDonate()`, который при заданном URL показывает полоску и проставляет `href`. Подпись локализована через существующий механизм `data-i18n`.

**Tech Stack:** Chrome MV3, чистые HTML/CSS/JS (ES-модули), Chrome i18n. Тесты — `node --test tests/*.test.js`.

**Соглашения:** рабочая директория — корень `images-to-pdf/`; комментарии на русском.

**Файлы:**
- Create: `src/lib/donate.js`, `tests/donate.test.js`
- Modify: `_locales/en/messages.json`, `_locales/ru/messages.json` (добавить ключ `support`)
- Modify: `src/popup.html` (полоска доната), `src/popup.css` (стиль), `src/popup.js` (константа + setupDonate), `manifest.json` (версия 1.2.0)

---

### Task 1: Модуль donate.js (TDD)

**Files:**
- Create: `src/lib/donate.js`
- Test: `tests/donate.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/donate.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredDonateUrl } from '../src/lib/donate.js';

test('заглушка не считается настроенным URL', () => {
  assert.equal(isConfiguredDonateUrl('BINANCE_PAY_URL_HERE'), false);
});

test('пустая строка и пробелы — не настроено', () => {
  assert.equal(isConfiguredDonateUrl(''), false);
  assert.equal(isConfiguredDonateUrl('   '), false);
});

test('реальный URL — настроено', () => {
  assert.equal(isConfiguredDonateUrl('https://app.binance.com/pay/abc'), true);
});

test('не строка — не настроено', () => {
  assert.equal(isConfiguredDonateUrl(undefined), false);
  assert.equal(isConfiguredDonateUrl(null), false);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test tests/donate.test.js`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать минимально**

Создать `src/lib/donate.js`:
```js
// Проверка, задан ли реальный URL доната (а не заглушка по умолчанию).
// Чистая функция — тестируется в Node.

const PLACEHOLDER = 'BINANCE_PAY_URL_HERE';

/**
 * @param {string} url значение константы DONATE_URL
 * @returns {boolean} true, если это настоящий URL (не заглушка и не пусто)
 */
export function isConfiguredDonateUrl(url) {
  return typeof url === 'string' && url.trim() !== '' && url !== PLACEHOLDER;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test tests/donate.test.js`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add src/lib/donate.js tests/donate.test.js
git commit -m "feat: isConfiguredDonateUrl — задан ли URL доната"
```

---

### Task 2: i18n — ключ support

**Files:**
- Modify (целиком): `_locales/en/messages.json`
- Modify (целиком): `_locales/ru/messages.json`

- [ ] **Step 1: Перезаписать `_locales/en/messages.json`**

```json
{
  "extName": { "message": "Images to PDF" },
  "extDescription": { "message": "Collect images from a page and save the selected ones to a single PDF." },
  "appTitle": { "message": "Images → PDF" },
  "showAll": { "message": "show all" },
  "selectAll": { "message": "Select all" },
  "deselectAll": { "message": "Deselect all" },
  "exportPdf": { "message": "Export PDF" },
  "support": { "message": "Support the developer ☕" },
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

- [ ] **Step 2: Перезаписать `_locales/ru/messages.json`**

```json
{
  "extName": { "message": "Картинки в PDF" },
  "extDescription": { "message": "Собрать картинки со страницы и сохранить выбранные в один PDF." },
  "appTitle": { "message": "Images → PDF" },
  "showAll": { "message": "показать все" },
  "selectAll": { "message": "Выбрать все" },
  "deselectAll": { "message": "Снять все" },
  "exportPdf": { "message": "Сохранить PDF" },
  "support": { "message": "Поддержать разработчика ☕" },
  "foundImages": { "message": "Найдено картинок: $count$", "placeholders": { "count": { "content": "$1" } } },
  "noImages": { "message": "Картинки не найдены." },
  "pageNotSupported": { "message": "Эта страница не поддерживается. Откройте обычный сайт (http/https)." },
  "readError": { "message": "Не удалось прочитать страницу: $error$", "placeholders": { "error": { "content": "$1" } } },
  "permissionDenied": { "message": "Доступ к сайтам картинок не выдан." },
  "downloading": { "message": "Скачиваю картинок: $count$…", "placeholders": { "count": { "content": "$1" } } },
  "buildingPdf": { "message": "Собираю PDF…" },
  "noneAdded": { "message": "Не удалось добавить ни одной картинки." },
  "doneAdded": { "message": "Готово: добавлено $added$ из $total$", "placeholders": { "added": { "content": "$1" }, "total": { "content": "$2" } } },
  "failedSuffix": { "message": ", не удалось $count$", "placeholders": { "count": { "content": "$1" } } }
}
```

- [ ] **Step 3: Проверить валидность и совпадение ключей**

Run:
```bash
python3 -c "
import json
en=json.load(open('_locales/en/messages.json')); ru=json.load(open('_locales/ru/messages.json'))
assert 'support' in en and 'support' in ru
assert set(en)==set(ru), set(en)^set(ru)
print('OK: support есть, ключи совпадают')
"
```
Expected: `OK: support есть, ключи совпадают`

- [ ] **Step 4: Commit**

```bash
git add _locales/
git commit -m "feat: i18n-ключ support (en, ru)"
```

---

### Task 3: Разметка полоски доната

**Files:**
- Modify: `src/popup.html`

- [ ] **Step 1: Добавить полоску доната после `</footer>`**

Найти в `src/popup.html` блок:
```html
      <button id="export" type="button" class="export" disabled>
        <span id="exportLabel">Export PDF (0)</span>
      </button>
    </footer>

    <!-- jsPDF как классический скрипт: кладёт window.jspdf -->
```
Заменить на (добавлена полоска `donateBar`, скрытая по умолчанию):
```html
      <button id="export" type="button" class="export" disabled>
        <span id="exportLabel">Export PDF (0)</span>
      </button>
    </footer>

    <div id="donateBar" class="donate" hidden>
      <a id="donateLink" href="#" target="_blank" rel="noopener" data-i18n="support">Support the developer ☕</a>
    </div>

    <!-- jsPDF как классический скрипт: кладёт window.jspdf -->
```

- [ ] **Step 2: Commit**

```bash
git add src/popup.html
git commit -m "feat: разметка полоски доната (скрыта по умолчанию)"
```

---

### Task 4: Стиль полоски доната

**Files:**
- Modify: `src/popup.css`

- [ ] **Step 1: Добавить стиль `.donate` в конец `src/popup.css`**

Дописать в конец файла:
```css
.donate {
  padding: 8px 12px;
  border-top: 1px solid #eee;
  text-align: center;
}
.donate a {
  font-size: 12px;
  color: #888;
  text-decoration: none;
}
.donate a:hover { color: #2d7ff9; text-decoration: underline; }
```

- [ ] **Step 2: Commit**

```bash
git add src/popup.css
git commit -m "style: оформление полоски доната"
```

---

### Task 5: Логика доната в popup.js

**Files:**
- Modify: `src/popup.js`

- [ ] **Step 1: Добавить импорт и константу URL**

Найти строку:
```js
import { distinctOrigins } from './lib/origins.js';
```
Заменить на:
```js
import { distinctOrigins } from './lib/origins.js';
import { isConfiguredDonateUrl } from './lib/donate.js';

// 👉 Впиши сюда свою Binance Pay «Pay Me» ссылку (замени заглушку одной строкой):
const DONATE_URL = 'BINANCE_PAY_URL_HERE';
```

- [ ] **Step 2: Добавить ссылки на элементы полоски**

Найти строку:
```js
const showAllEl = document.getElementById('showAll');
```
Заменить на:
```js
const showAllEl = document.getElementById('showAll');
const donateBar = document.getElementById('donateBar');
const donateLink = document.getElementById('donateLink');
```

- [ ] **Step 3: Добавить функцию setupDonate**

Найти функцию `applyStaticI18n` целиком:
```js
// Подставляет локализованные тексты во все элементы с data-i18n.
function applyStaticI18n() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const msg = t(el.dataset.i18n);
    if (msg) el.textContent = msg;
  }
}
```
Сразу после неё добавить:
```js

// Показывает полоску доната только если задан реальный URL (не заглушка).
function setupDonate() {
  if (isConfiguredDonateUrl(DONATE_URL)) {
    donateLink.href = DONATE_URL;
    donateBar.hidden = false;
  }
}
```

- [ ] **Step 4: Вызвать setupDonate на старте**

Найти в конце файла:
```js
// Старт.
applyStaticI18n();
updateExportButton();
loadImages();
```
Заменить на:
```js
// Старт.
applyStaticI18n();
updateExportButton();
setupDonate();
loadImages();
```

- [ ] **Step 5: Проверить синтаксис**

Run: `node --check src/popup.js`
Expected: нет вывода, код выхода 0.

- [ ] **Step 6: Commit**

```bash
git add src/popup.js
git commit -m "feat: показ полоски доната при заданном DONATE_URL"
```

---

### Task 6: Бамп версии до 1.2.0

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Поднять версию**

Найти строку:
```json
  "version": "1.1.0",
```
Заменить на:
```json
  "version": "1.2.0",
```

- [ ] **Step 2: Проверить валидность JSON**

Run: `python3 -m json.tool manifest.json > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "chore: версия 1.2.0"
```

---

### Task 7: Финальная проверка

**Files:** нет новых.

- [ ] **Step 1: Все юнит-тесты**

Run: `node --test tests/*.test.js`
Expected: PASS — 20 тестов (16 прежних + 4 из donate).

- [ ] **Step 2: Синтаксис JS**

Run: `for f in src/content.js src/background.js src/popup.js src/lib/donate.js; do node --check "$f" && echo "OK: $f"; done`
Expected: четыре строки `OK:`.

- [ ] **Step 3: Валидность JSON**

Run: `for f in manifest.json _locales/en/messages.json _locales/ru/messages.json; do python3 -m json.tool "$f" > /dev/null && echo "OK: $f"; done`
Expected: три строки `OK:`.

- [ ] **Step 4: Сборка ZIP (donate.js должен попасть в архив)**

Run: `bash tools/package.sh`
Expected: в списке есть `src/lib/donate.js`; версия в манифесте 1.2.0.

- [ ] **Step 5: Ручной ре-тест (выполняет пользователь)**

1. Перезагрузить расширение на `chrome://extensions`.
2. Со **заглушкой** `DONATE_URL` → полоски доната внизу **нет**.
3. Вписать реальную Binance Pay ссылку в `DONATE_URL` (`src/popup.js`), перезагрузить → внизу появилась полоска «☕ Поддержать разработчика»; клик открывает ссылку в новой вкладке.
4. Подпись соответствует локали браузера (ru/en).

Expected: поведение совпадает с описанием.

- [ ] **Step 6: Зафиксировать (если были правки)**

```bash
git add -A
git commit -m "fix: правки по итогам ре-теста"
```
Если правок не было — коммит не нужен.

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** UI/полоска (Tasks 3, 4); поведение/открытие URL (Task 3 — `<a target=_blank>`); конфиг-константа + скрытие при заглушке (Tasks 1, 5); чистая функция `isConfiguredDonateUrl` под тестом (Task 1); i18n-ключ `support` (Task 2); версия 1.2.0 (Task 6); тестирование юнит + ручное (Tasks 1, 7). Пробелов нет.
- **Плейсхолдеры:** нет — везде готовый код/контент и конкретные команды. (`BINANCE_PAY_URL_HERE` — намеренная, документированная заглушка значения, а не пропуск в плане.)
- **Согласованность имён:** `isConfiguredDonateUrl`, `DONATE_URL`, `donateBar`, `donateLink`, ключ `support` (с `data-i18n="support"`), id `donateBar`/`donateLink` совпадают между `donate.js`, `popup.html`, `popup.css`, `popup.js` и `_locales/*`.
