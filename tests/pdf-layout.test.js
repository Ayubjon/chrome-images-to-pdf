import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitRect } from '../src/lib/pdf-layout.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('a wide image is constrained by the area width', () => {
  const { w, h } = fitRect(1000, 500, 190, 277);
  assert.ok(near(w, 190), `w=${w}`);
  assert.ok(near(h, 95), `h=${h}`);
});

test('a tall image is constrained by the area height', () => {
  const { w, h } = fitRect(500, 1000, 190, 277);
  assert.ok(near(h, 277), `h=${h}`);
  assert.ok(near(w, 138.5), `w=${w}`);
});

test('a square fills a square area completely', () => {
  const { w, h } = fitRect(300, 300, 200, 200);
  assert.ok(near(w, 200) && near(h, 200));
});
