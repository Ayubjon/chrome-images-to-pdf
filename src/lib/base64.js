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
