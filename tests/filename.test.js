import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pdfFilename } from '../src/lib/filename.js';

test('drops leading www. and inserts the date', () => {
  assert.equal(
    pdfFilename('www.example.com', '2026-06-04'),
    'images-example.com-2026-06-04.pdf'
  );
});

test('replaces unsafe filename characters with _', () => {
  assert.equal(
    pdfFilename('a/b:c', '2026-06-04'),
    'images-a_b_c-2026-06-04.pdf'
  );
});

test('empty hostname falls back to page', () => {
  assert.equal(pdfFilename('', '2026-06-04'), 'images-page-2026-06-04.pdf');
});
