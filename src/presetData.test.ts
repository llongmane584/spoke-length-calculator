import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { HUB_FIELDS, RIM_FIELDS, buildPartPresets } from './partPresets.ts';

// 全体プリセット (ハブ+リムの組み合わせ) と部品プリセットは同じ数値を重複して持つ。
// 参照方式に作り替えて重複そのものを無くす手もあったが、動いている 6 ファイルの
// スキーマ移行に見合わないと判断した。代わりに、ずれたら落ちるテストをここに置く。
//
// 対応付けはファイル名の規約でとる:
//   presets/{ハブ}_{リム}_{Front|Rear}.json
//     -> presets/hubs/{ハブ}_{Front|Rear}.json + presets/rims/{リム}.json

const presetsUrl = new URL('./presets/', import.meta.url);
const hubsUrl = new URL('./presets/hubs/', import.meta.url);
const rimsUrl = new URL('./presets/rims/', import.meta.url);

const readJsonDir = async (dirUrl: URL): Promise<Record<string, unknown>> => {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const fileNames = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort();

  const modules: Record<string, unknown> = {};

  for (const fileName of fileNames) {
    modules[fileName] = JSON.parse(await readFile(new URL(fileName, dirUrl), 'utf8')) as unknown;
  }

  return modules;
};

const readInputs = (fileName: string, module: unknown): Record<string, string> => {
  assert.ok(
    typeof module === 'object' && module !== null && 'inputs' in module,
    `${fileName}: "inputs" が無い`,
  );

  const { inputs } = module as { inputs: unknown };

  assert.ok(
    typeof inputs === 'object' && inputs !== null,
    `${fileName}: "inputs" がオブジェクトでない`,
  );

  return inputs as Record<string, string>;
};

const loadParts = async () => {
  const hubs = buildPartPresets(await readJsonDir(hubsUrl), HUB_FIELDS, true);
  const rims = buildPartPresets(await readJsonDir(rimsUrl), RIM_FIELDS, false);

  return { hubs, rims };
};

test('part presets all pass validation', async () => {
  const { hubs, rims } = await loadParts();

  assert.deepEqual(hubs.errors, []);
  assert.deepEqual(rims.errors, []);
  assert.ok(hubs.options.length > 0, 'ハブ部品が 1 件も読めていない');
  assert.ok(rims.options.length > 0, 'リム部品が 1 件も読めていない');
});

test('every wheel preset agrees with the hub and rim parts it is named after', async () => {
  const wheels = await readJsonDir(presetsUrl);
  const { hubs, rims } = await loadParts();

  assert.ok(Object.keys(wheels).length > 0, '全体プリセットが 1 件も読めていない');

  for (const [fileName, module] of Object.entries(wheels)) {
    const id = fileName.replace(/\.json$/, '');
    const tokens = id.split('_');

    assert.equal(
      tokens.length,
      3,
      `${fileName}: ファイル名は {ハブ}_{リム}_{Front|Rear} の 3 トークンでなければならない`,
    );

    const [hubToken, rimToken, position] = tokens;
    const hubId = `${hubToken}_${position}`;
    const hub = hubs.options.find(option => option.id === hubId);
    const rim = rims.options.find(option => option.id === rimToken);

    assert.ok(hub, `${fileName}: 対応する部品 hubs/${hubId}.json が無い`);
    assert.ok(rim, `${fileName}: 対応する部品 rims/${rimToken}.json が無い`);

    const inputs = readInputs(fileName, module);

    for (const field of HUB_FIELDS) {
      assert.equal(
        Number(inputs[field]),
        Number(hub.fields[field]),
        `${fileName}: ${field} が hubs/${hubId}.json と食い違う`,
      );
    }

    for (const field of RIM_FIELDS) {
      assert.equal(
        Number(inputs[field]),
        Number(rim.fields[field]),
        `${fileName}: ${field} が rims/${rimToken}.json と食い違う`,
      );
    }
  }
});

// プリセットの select は「今の入力値に一致する定義」を表示する。同じ数値の定義が
// 2 つあると先に見つかった方だけが表示され、もう一方は永久に選べないように見える。
test('no two presets share the same numbers', async () => {
  const wheels = await readJsonDir(presetsUrl);
  const { hubs, rims } = await loadParts();

  const assertUnique = (label: string, entries: { id: string; key: string }[]) => {
    const seen = new Map<string, string>();

    for (const entry of entries) {
      const previous = seen.get(entry.key);
      assert.equal(previous, undefined, `${label}: ${previous} と ${entry.id} の数値が完全に同じ`);
      seen.set(entry.key, entry.id);
    }
  };

  const toKey = (fields: Record<string, string>, names: readonly string[]): string => (
    names.map(name => String(Number(fields[name]))).join('/')
  );

  assertUnique('全体プリセット', Object.entries(wheels).map(([fileName, module]) => ({
    id: fileName,
    key: toKey(readInputs(fileName, module), [...HUB_FIELDS, ...RIM_FIELDS]),
  })));

  // ハブは position を鍵に含めない —— 一致判定は入力欄の値だけを見るので、
  // 前後が違っても数値が同じなら select 上では見分けがつかない。
  assertUnique('ハブ部品', hubs.options.map(option => ({
    id: option.id,
    key: toKey(option.fields, HUB_FIELDS),
  })));

  assertUnique('リム部品', rims.options.map(option => ({
    id: option.id,
    key: toKey(option.fields, RIM_FIELDS),
  })));
});

// 部品を presets/ 直下に置くと、全体プリセット用の import.meta.glob('./presets/*.json')
// が拾ってしまい、計算できないプリセットとしてエラーバナーが出っぱなしになる。
// 件数は固定しない —— 全体プリセットが増えてもこのテストは通ってほしい。
test('src/presets holds only whole-wheel presets at its top level', async () => {
  const entries = await readdir(presetsUrl, { withFileTypes: true });
  const wheels = await readJsonDir(presetsUrl);

  const directories = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  assert.deepEqual(directories, ['hubs', 'rims']);
  assert.ok(Object.keys(wheels).length > 0, '全体プリセットが 1 件も読めていない');

  for (const [fileName, module] of Object.entries(wheels)) {
    const inputs = readInputs(fileName, module);

    for (const field of [...HUB_FIELDS, ...RIM_FIELDS]) {
      assert.ok(
        inputs[field] !== undefined,
        `${fileName}: ${field} が無い。部品プリセットは presets/hubs か presets/rims に置く`,
      );
    }
  }
});
