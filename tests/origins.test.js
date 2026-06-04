import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distinctOrigins } from '../src/lib/origins.js';

test('unique origins in the form scheme://host/*', () => {
  const out = distinctOrigins([
    'https://a.com/1.jpg',
    'https://a.com/2.jpg',
    'http://b.org/x/y.png',
  ]);
  assert.deepEqual([...out].sort(), ['http://b.org/*', 'https://a.com/*']);
});

test('skips data: URLs', () => {
  const out = distinctOrigins(['data:image/png;base64,AAAA', 'https://a.com/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('ignores the port (match patterns disallow it)', () => {
  const out = distinctOrigins(['https://a.com:8443/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('skips malformed URLs', () => {
  const out = distinctOrigins(['not a url', 'https://a.com/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('empty input yields an empty array', () => {
  assert.deepEqual(distinctOrigins([]), []);
});
