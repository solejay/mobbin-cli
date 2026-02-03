import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cookieHeaderFromStorageState } from '../dist/auth/cookies.js';

test('cookieHeaderFromStorageState filters non-mobbin domains', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobbin-test-'));
  const file = path.join(dir, 'storageState.json');

  const state = {
    cookies: [
      { name: 'a', value: '1', domain: '.mobbin.com' },
      { name: 'b', value: '2', domain: 'mobbin.com' },
      { name: 'c', value: '3', domain: '.example.com' },
    ],
  };

  fs.writeFileSync(file, JSON.stringify(state), 'utf-8');

  const header = cookieHeaderFromStorageState(file);
  assert.equal(header, 'a=1; b=2');
});
