import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrayBufferToBase64 } from '../src/lib/base64.js';

test('encodes a short string', () => {
  const buf = new TextEncoder().encode('hi').buffer;
  assert.equal(arrayBufferToBase64(buf), 'aGk=');
});

test('correctly encodes a large buffer (chunking check)', () => {
  const n = 100000;
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[i] = i % 256;
  // reference: byte-by-byte binary string via btoa
  let binary = '';
  for (let i = 0; i < n; i++) binary += String.fromCharCode(arr[i]);
  assert.equal(arrayBufferToBase64(arr.buffer), btoa(binary));
});
