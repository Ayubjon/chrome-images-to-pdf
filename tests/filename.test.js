import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pdfFilename } from '../src/lib/filename.js';

test('убирает ведущее www. и подставляет дату', () => {
  assert.equal(
    pdfFilename('www.example.com', '2026-06-04'),
    'images-example.com-2026-06-04.pdf'
  );
});

test('заменяет небезопасные для имени файла символы на _', () => {
  assert.equal(
    pdfFilename('a/b:c', '2026-06-04'),
    'images-a_b_c-2026-06-04.pdf'
  );
});

test('пустой hostname заменяется на page', () => {
  assert.equal(pdfFilename('', '2026-06-04'), 'images-page-2026-06-04.pdf');
});
