// Content script: injected into the active tab on demand from the popup.
// Collects all loaded <img> elements and returns them to the popup via a message.
// Guard against double injection: when the popup is reopened, the listener is
// not registered twice (otherwise one message would get several responses).

if (!window.__imagesToPdfInjected) {
  window.__imagesToPdfInjected = true;

  // Collects loaded <img> elements, returns simplified data.
  // naturalWidth > 0 filters out not-yet-loaded / broken images.
  function collectImages() {
    return Array.from(document.images)
      .map((img) => ({
        // currentSrc accounts for srcset/<picture>; src is the fallback.
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
    // synchronous response — returning true is not needed
  });
}
