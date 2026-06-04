import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredDonateValue } from '../src/lib/donate.js';

test('the placeholder is not considered configured', () => {
  assert.equal(isConfiguredDonateValue('YOUR_USDT_ADDRESS_HERE'), false);
});

test('empty string and whitespace are not configured', () => {
  assert.equal(isConfiguredDonateValue(''), false);
  assert.equal(isConfiguredDonateValue('   '), false);
});

test('a real address is configured', () => {
  assert.equal(isConfiguredDonateValue('0xad39bdf2df0b8dd6991150fcea0a156150ed19b8'), true);
});

test('a non-string is not configured', () => {
  assert.equal(isConfiguredDonateValue(undefined), false);
  assert.equal(isConfiguredDonateValue(null), false);
});
