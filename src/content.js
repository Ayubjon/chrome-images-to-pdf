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
