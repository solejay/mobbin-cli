import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeName } from '../dist/utils/fsSafe.js';

test('sanitizeName returns fallback for empty input', () => {
  const name = sanitizeName('   ', 'Unknown');
  assert.equal(name, 'Unknown');
});

test('sanitizeName strips invalid filesystem characters', () => {
  const name = sanitizeName('A/B\\C:D*E?F"G<H>I|');
  assert.equal(name, 'A-B-C-D-E-F-G-H-I-');
});
