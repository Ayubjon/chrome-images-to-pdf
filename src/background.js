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
