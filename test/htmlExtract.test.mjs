import test from 'node:test';
import assert from 'node:assert/strict';
import { bestBytescaleUrlFromHtml } from '../dist/api/htmlExtract.js';

test('bestBytescaleUrlFromHtml returns best from escaped bytescale URLs', () => {
  const html = '\\"https:\\/\\/bytescale.mobbin.com/v1/abc/mobbin.com/prod/file.webp?enc=123\\"';
  const url = bestBytescaleUrlFromHtml(html);
  assert.equal(url, 'https://bytescale.mobbin.com/v1/abc/mobbin.com/prod/file.webp?enc=123');
});

test('bestBytescaleUrlFromHtml prefers srcset-like when present', () => {
  const html = 'https:\\/\\/bytescale.mobbin.com/v1/a/mobbin.com/prod/file.webp?enc=1 1920w https:\\/\\/bytescale.mobbin.com/v1/b/mobbin.com/prod/file.webp?enc=2 3840w';
  const url = bestBytescaleUrlFromHtml(html);
  assert.equal(url, 'https://bytescale.mobbin.com/v1/b/mobbin.com/prod/file.webp?enc=2');
});

test('bestBytescaleUrlFromHtml skips non-screen assets', () => {
  const html = [
    'https://bytescale.mobbin.com/image/static/logo.png',
    'https://bytescale.mobbin.com/v1/a/mobbin.com/prod/file.webp?enc=ok',
  ].join(' ');

  const url = bestBytescaleUrlFromHtml(html);
  assert.equal(url, 'https://bytescale.mobbin.com/v1/a/mobbin.com/prod/file.webp?enc=ok');
});
