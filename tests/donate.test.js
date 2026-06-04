import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredDonateUrl } from '../src/lib/donate.js';

test('заглушка не считается настроенным URL', () => {
  assert.equal(isConfiguredDonateUrl('BINANCE_PAY_URL_HERE'), false);
});

test('пустая строка и пробелы — не настроено', () => {
  assert.equal(isConfiguredDonateUrl(''), false);
  assert.equal(isConfiguredDonateUrl('   '), false);
});

test('реальный URL — настроено', () => {
  assert.equal(isConfiguredDonateUrl('https://app.binance.com/pay/abc'), true);
});

test('не строка — не настроено', () => {
  assert.equal(isConfiguredDonateUrl(undefined), false);
  assert.equal(isConfiguredDonateUrl(null), false);
});
