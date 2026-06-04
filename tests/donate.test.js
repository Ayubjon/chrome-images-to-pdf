import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredDonateValue } from '../src/lib/donate.js';

test('заглушка-адрес не считается настроенной', () => {
  assert.equal(isConfiguredDonateValue('YOUR_USDT_ADDRESS_HERE'), false);
});

test('пустая строка и пробелы — не настроено', () => {
  assert.equal(isConfiguredDonateValue(''), false);
  assert.equal(isConfiguredDonateValue('   '), false);
});

test('реальный адрес — настроено', () => {
  assert.equal(isConfiguredDonateValue('TXYZ1234567890realtronaddress'), true);
});

test('не строка — не настроено', () => {
  assert.equal(isConfiguredDonateValue(undefined), false);
  assert.equal(isConfiguredDonateValue(null), false);
});
