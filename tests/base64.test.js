import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrayBufferToBase64 } from '../src/lib/base64.js';

test('кодирует короткую строку', () => {
  const buf = new TextEncoder().encode('hi').buffer;
  assert.equal(arrayBufferToBase64(buf), 'aGk=');
});

test('корректно кодирует большой буфер (проверка обработки кусками)', () => {
  const n = 100000;
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[i] = i % 256;
  // эталон: побайтовая бинарная строка через btoa
  let binary = '';
  for (let i = 0; i < n; i++) binary += String.fromCharCode(arr[i]);
  assert.equal(arrayBufferToBase64(arr.buffer), btoa(binary));
});
