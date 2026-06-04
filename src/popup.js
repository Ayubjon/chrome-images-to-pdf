// Главная логика попапа: получить картинки из активной вкладки, показать сетку,
// дать выбрать и собрать PDF из выбранных.

import { prepareImages } from './lib/images.js';
import { fitRect } from './lib/pdf-layout.js';
import { pdfFilename } from './lib/filename.js';
import { distinctOrigins } from './lib/origins.js';
import { isConfiguredDonateValue } from './lib/donate.js';

// 👉 Адрес для приёма донатов USDT (сеть Ethereum / ERC-20):
const DONATE_ADDRESS = '0xad39bdf2df0b8dd6991150fcea0a156150ed19b8';

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
const donateBar = document.getElementById('donateBar');
const donateAddress = document.getElementById('donateAddress');
const donateCopy = document.getElementById('donateCopy');

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

// Показывает полоску доната только если задан реальный адрес (не заглушка),
// выводит адрес и вешает копирование в буфер.
function setupDonate() {
  if (!isConfiguredDonateValue(DONATE_ADDRESS)) return;
  donateAddress.textContent = DONATE_ADDRESS;
  donateBar.hidden = false;
  donateCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(DONATE_ADDRESS);
    } catch (e) {
      // запасной вариант: выделить адрес для ручного копирования
      const range = document.createRange();
      range.selectNodeContents(donateAddress);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const original = t('copy');
    donateCopy.textContent = t('copied');
    setTimeout(() => { donateCopy.textContent = original; }, 1500);
  });
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
setupDonate();
loadImages();
