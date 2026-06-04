// Main popup logic: get images from the active tab, show the grid,
// let the user pick, and build a PDF from the selected ones.

import { prepareImages } from './lib/images.js';
import { fitRect } from './lib/pdf-layout.js';
import { pdfFilename } from './lib/filename.js';
import { distinctOrigins } from './lib/origins.js';
import { isConfiguredDonateValue } from './lib/donate.js';

// 👉 Put your USDT donation address here (Ethereum / ERC-20 network):
const DONATE_ADDRESS = '0xad39bdf2df0b8dd6991150fcea0a156150ed19b8';

const MIN_SIZE = 64;        // small-image filter threshold (px)
const PAGE_W = 210;         // A4 width, mm
const PAGE_H = 297;         // A4 height, mm
const MARGIN = 10;          // margins, mm
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

let rawImages = [];         // everything content.js sent
const selected = new Set(); // selected src values

// Short access to a localized string.
function t(key, subs) {
  return chrome.i18n.getMessage(key, subs);
}

// Fills localized text into every element with data-i18n.
function applyStaticI18n() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const msg = t(el.dataset.i18n);
    if (msg) el.textContent = msg;
  }
}

// Shows the donation bar only if a real address is set (not the placeholder),
// fills in the address and wires up copy-to-clipboard.
function setupDonate() {
  if (!isConfiguredDonateValue(DONATE_ADDRESS)) return;
  donateAddress.textContent = DONATE_ADDRESS;
  donateBar.hidden = false;
  donateCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(DONATE_ADDRESS);
    } catch (e) {
      // fallback: select the address for manual copy
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

// Current filtered list (honoring the "show all" toggle).
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

    // Clicking the cell toggles selection. If the checkbox itself was clicked,
    // it already toggled — don't flip it again.
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

// Injects content.js and requests the image list.
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

// Converts a data URL of any format to JPEG via a canvas.
// Normalizes the format for jsPDF and avoids the tainted-canvas problem.
function toJpegDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // white background under transparent PNGs
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

// Builds a PDF from the selected images and downloads it.
async function exportPdf() {
  const urls = Array.from(selected);

  // Request access to the domains of the selected images, scoped narrowly.
  // IMPORTANT: before the first await, while the user gesture is still active.
  const origins = distinctOrigins(urls);
  if (origins.length && !(await chrome.permissions.request({ origins }))) {
    setStatus(t('permissionDenied'), true);
    return;
  }

  exportBtn.disabled = true;
  setStatus(t('downloading', [String(urls.length)]));

  // The service worker downloads the bytes (bypassing CORS, via granted permissions).
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
  try { host = new URL(tab.url).hostname; } catch (e) { /* keep "page" */ }
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

// Start.
applyStaticI18n();
updateExportButton();
setupDonate();
loadImages();
