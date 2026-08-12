import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// public/ の静的ファイルを素の node --test で検証する形は thirdPartyNotices.test.ts と同じ。
const manifestUrl = new URL('../public/manifest.webmanifest', import.meta.url);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// JSON.parse が投げれば、その時点でテストが落ちる (壊れた manifest の検知も兼ねる)。
const readManifest = async (): Promise<Record<string, unknown>> => {
  const parsed: unknown = JSON.parse(await readFile(manifestUrl, 'utf8'));

  assert.ok(isRecord(parsed), 'manifest.webmanifest should hold a JSON object');

  return parsed;
};

// #138: Chromium は manifest の orientation を WebAPK の Activity の screenOrientation へ
// 変換する。"any" は SCREEN_ORIENTATION_FULL_SENSOR になり、これはセンサー由来の回転を
// 強制する指定なので、ユーザーがデバイスに設定した自動回転ロックを無視する。orientation を
// 書かなければ UNSPECIFIED になり、OS の設定がそのまま効く。
//
// つまりこのキーは値を選ぶものではなく、書かないことに意味がある。JSON にはコメントを
// 書けず manifest 側に理由を残せないので、書き戻しはここで止める。portrait / landscape /
// natural も同じく OS の設定を上書きするため、値ではなくキーの不在を見る。
test('leaves the orientation unset so the device rotation lock wins', async () => {
  const manifest = await readManifest();

  assert.ok(
    !('orientation' in manifest),
    'manifest.webmanifest must not set orientation — any value overrides the OS rotation lock (#138)',
  );
});
