import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// 翻訳キーの欠落は i18next が黙って fallbackLng ('en-GB') へ落として埋めるので、
// ja で英文が出ていても画面は「動いている」ように見える。CLAUDE.md が禁じる
// 偽フォールバックそのものなので、両ファイルの形が同じことをここで縛る。
//
// 値の中身は見ない —— 訳文の良し悪しは人が読むもので、テストが決めることではない。

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readLocale = async (name: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(`./locales/${name}.json`, import.meta.url), 'utf8'));

/** リーフまでのキーパスを 'a.b.c' の形で全部並べる。 */
const keyPaths = (value: unknown, prefix = ''): string[] => {
  if (!isRecord(value)) {
    return [prefix];
  }

  return Object.keys(value)
    .sort()
    .flatMap(key => keyPaths(value[key], prefix === '' ? key : `${prefix}.${key}`));
};

test('holds the same key paths in every language', async () => {
  const [en, ja] = await Promise.all([readLocale('en'), readLocale('ja')]);

  assert.deepEqual(keyPaths(ja), keyPaths(en));
});

test('holds a string at every leaf', async () => {
  for (const name of ['en', 'ja']) {
    const locale = await readLocale(name);
    const walk = (value: unknown, path: string): void => {
      if (isRecord(value)) {
        for (const [key, child] of Object.entries(value)) {
          walk(child, path === '' ? key : `${path}.${key}`);
        }
        return;
      }

      assert.equal(typeof value, 'string', `${name}.json: ${path} must be a string`);
    };

    walk(locale, '');
  }
});
