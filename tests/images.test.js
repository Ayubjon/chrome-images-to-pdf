import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeImages, prepareImages } from '../src/lib/images.js';

test('dedupeImages removes duplicate src, preserving order', () => {
  const input = [
    { src: 'a', width: 100, height: 100 },
    { src: 'a', width: 100, height: 100 },
    { src: 'b', width: 50, height: 50 },
  ];
  const out = dedupeImages(input);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((i) => i.src), ['a', 'b']);
});

test('prepareImages drops images smaller than minSize on either side', () => {
  const input = [
    { src: 'big', width: 200, height: 200 },
    { src: 'wide-but-low', width: 200, height: 10 },
    { src: 'small', width: 10, height: 10 },
  ];
  const out = prepareImages(input, { minSize: 64, showAll: false });
  assert.deepEqual(out.map((i) => i.src), ['big']);
});

test('prepareImages with showAll returns everything (after dedupe)', () => {
  const input = [
    { src: 'big', width: 200, height: 200 },
    { src: 'small', width: 10, height: 10 },
    { src: 'small', width: 10, height: 10 },
  ];
  const out = prepareImages(input, { minSize: 64, showAll: true });
  assert.equal(out.length, 2);
});
