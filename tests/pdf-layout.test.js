import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitRect } from '../src/lib/pdf-layout.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('широкая картинка ограничена шириной области', () => {
  const { w, h } = fitRect(1000, 500, 190, 277);
  assert.ok(near(w, 190), `w=${w}`);
  assert.ok(near(h, 95), `h=${h}`);
});

test('высокая картинка ограничена высотой области', () => {
  const { w, h } = fitRect(500, 1000, 190, 277);
  assert.ok(near(h, 277), `h=${h}`);
  assert.ok(near(w, 138.5), `w=${w}`);
});

test('квадрат в квадратной области занимает её целиком', () => {
  const { w, h } = fitRect(300, 300, 200, 200);
  assert.ok(near(w, 200) && near(h, 200));
});
