import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const noticeUrl = new URL('../public/THIRD_PARTY_NOTICES.txt', import.meta.url);
const lucideLicenseUrl = new URL(
  '../node_modules/lucide-react/LICENSE',
  import.meta.url,
);

test('keeps the distributed Lucide notice in sync with the installed license', async () => {
  const [notice, lucideLicense] = await Promise.all([
    readFile(noticeUrl),
    readFile(lucideLicenseUrl),
  ]);

  assert.deepEqual(notice, lucideLicense);
});
