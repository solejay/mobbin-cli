import test from 'node:test';
import assert from 'node:assert/strict';
import { bestImageUrlFromSrcSet } from '../dist/api/srcset.js';

test('bestImageUrlFromSrcSet returns fallback when srcset missing', () => {
  const url = bestImageUrlFromSrcSet(undefined, 'https://example.com/fallback.png');
  assert.equal(url, 'https://example.com/fallback.png');
});

test('bestImageUrlFromSrcSet chooses largest width', () => {
  const srcset = 'https://a.com/img1.png 1920w https://a.com/img2.png 3840w';
  const url = bestImageUrlFromSrcSet(srcset, 'https://example.com/fallback.png');
  assert.equal(url, 'https://a.com/img2.png');
});

test('bestImageUrlFromSrcSet ignores invalid tokens', () => {
  const srcset = 'https://a.com/img1.png 1920w https://a.com/img2.png foo';
  const url = bestImageUrlFromSrcSet(srcset, 'https://example.com/fallback.png');
  assert.equal(url, 'https://a.com/img1.png');
});
