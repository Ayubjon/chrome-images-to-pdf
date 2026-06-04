// Уникальные origin'ы (match-паттерны) из списка URL картинок.
// Нужны, чтобы точечно запросить host-разрешения только к доменам выбранных
// картинок. Чистая функция — тестируется в Node.

/**
 * @param {string[]} urls список URL картинок
 * @returns {string[]} уникальные match-паттерны вида "https://host/*" (без порта).
 *   data:-URL и нераспознанные URL пропускаются.
 */
export function distinctOrigins(urls) {
  const patterns = new Set();
  for (const u of urls) {
    if (typeof u !== 'string' || u.startsWith('data:')) continue;
    try {
      const url = new URL(u);
      // hostname без порта: порт в match-паттернах недопустим
      patterns.add(`${url.protocol}//${url.hostname}/*`);
    } catch (e) {
      // кривой URL — пропускаем
    }
  }
  return Array.from(patterns);
}
