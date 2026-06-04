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
