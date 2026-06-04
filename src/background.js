// Service worker: on request from the popup, downloads images by their URL and
// returns them as data URLs. An extension service worker with host_permissions
// makes cross-origin fetches bypassing CORS — so we download here, not in the popup.

import { arrayBufferToBase64 } from './lib/base64.js';

// Downloads one image. Never throws — returns an object with ok:false on failure.
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

// Downloads all images in parallel, preserving order.
async function fetchAll(urls) {
  return Promise.all(urls.map(fetchOne));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'FETCH_IMAGES') {
    fetchAll(message.urls).then(sendResponse);
    return true; // response is async — keep the channel open
  }
});
