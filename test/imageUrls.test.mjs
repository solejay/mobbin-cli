import test from 'node:test';
import assert from 'node:assert/strict';
import { isHighConfidenceImageUrl, pickBestImageUrl } from '../dist/api/imageUrls.js';

test('pickBestImageUrl prefers bytescale enc URLs over weaker candidates', () => {
  const url = pickBestImageUrl([
    'https://xyz.supabase.co/storage/v1/object/public/path/file.png',
    'https://bytescale.mobbin.com/v1/a/mobbin.com/prod/file.webp?enc=abc',
  ]);

  assert.equal(url, 'https://bytescale.mobbin.com/v1/a/mobbin.com/prod/file.webp?enc=abc');
});

test('pickBestImageUrl returns undefined for empty candidates', () => {
  const url = pickBestImageUrl([undefined, null]);
  assert.equal(url, undefined);
});

test('isHighConfidenceImageUrl recognizes expected bytescale forms', () => {
  assert.equal(
    isHighConfidenceImageUrl('https://bytescale.mobbin.com/v1/a/mobbin.com/prod/file.webp?enc=1'),
    true,
  );
  assert.equal(isHighConfidenceImageUrl('https://xyz.supabase.co/storage/v1/object/public/path.png'), false);
});
