// Checks whether a real donation address is set (not the default placeholder).
// Pure function — unit-tested in Node.

const PLACEHOLDER = 'YOUR_USDT_ADDRESS_HERE';

/**
 * @param {string} value the DONATE_ADDRESS constant value
 * @returns {boolean} true if it's a real address (not the placeholder and not empty)
 */
export function isConfiguredDonateValue(value) {
  return typeof value === 'string' && value.trim() !== '' && value !== PLACEHOLDER;
}
