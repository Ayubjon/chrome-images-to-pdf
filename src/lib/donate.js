// Проверка, задан ли реальный адрес доната (а не заглушка по умолчанию).
// Чистая функция — тестируется в Node.

const PLACEHOLDER = 'YOUR_USDT_TRC20_ADDRESS_HERE';

/**
 * @param {string} value значение константы DONATE_ADDRESS
 * @returns {boolean} true, если это настоящий адрес (не заглушка и не пусто)
 */
export function isConfiguredDonateValue(value) {
  return typeof value === 'string' && value.trim() !== '' && value !== PLACEHOLDER;
}
