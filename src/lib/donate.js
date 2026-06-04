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
