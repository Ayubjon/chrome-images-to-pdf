import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distinctOrigins } from '../src/lib/origins.js';

test('уникальные origin в формате scheme://host/*', () => {
  const out = distinctOrigins([
    'https://a.com/1.jpg',
    'https://a.com/2.jpg',
    'http://b.org/x/y.png',
  ]);
  assert.deepEqual([...out].sort(), ['http://b.org/*', 'https://a.com/*']);
});

test('пропускает data: URL', () => {
  const out = distinctOrigins(['data:image/png;base64,AAAA', 'https://a.com/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('игнорирует порт (match-паттерны его не допускают)', () => {
  const out = distinctOrigins(['https://a.com:8443/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('пропускает кривые URL', () => {
  const out = distinctOrigins(['not a url', 'https://a.com/1.jpg']);
  assert.deepEqual(out, ['https://a.com/*']);
});

test('пустой вход даёт пустой массив', () => {
  assert.deepEqual(distinctOrigins([]), []);
});
