import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import {
  SHARE_FIELDS,
  SHARE_VERSION,
  buildShareFragment,
  buildShareUrl,
  hasShareFragment,
  parseShareFragment,
  routedShareFragment,
} from './shareLink.ts';

const sampleInputs: Record<string, string> = {
  erd: '601',
  rimOffset: '0',
  pitchCircleLeft: '58',
  pitchCircleRight: '58',
  flangeDistanceLeft: '35',
  flangeDistanceRight: '22.6',
  spokeHoleDiameter: '2.6',
  numberOfSpokes: '32',
  crossingsLeft: '3',
  crossingsRight: '3',
};

// SHARE_FIELDS が入力欄の全部を覆っていることの検査。App.tsx の Inputs 型は
// Vite 依存でここから読めないので、同じ 10 項目を持つ全体プリセットを物差しにする。
// 入力欄を足したときに共有 URL への追加を忘れると、ここで落ちる。
test('covers every input field that a wheel preset carries', async () => {
  const presetsUrl = new URL('./presets/', import.meta.url);
  const entries = await readdir(presetsUrl, { withFileTypes: true });
  const fileNames = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name);

  assert.ok(fileNames.length > 0, 'expected at least one wheel preset to compare against');

  for (const fileName of fileNames) {
    const preset = JSON.parse(await readFile(new URL(fileName, presetsUrl), 'utf8')) as {
      inputs: Record<string, unknown>;
    };

    assert.deepEqual(
      [...SHARE_FIELDS].sort(),
      Object.keys(preset.inputs).sort(),
      `share fields must match the input fields in ${fileName}`,
    );
  }
});

test('round-trips the input values through a fragment', () => {
  const fragment = buildShareFragment(sampleInputs);

  assert.deepEqual(parseShareFragment(fragment), sampleInputs);
});

test('puts the version first so the format is recognisable at a glance', () => {
  const fragment = buildShareFragment(sampleInputs);

  assert.equal(fragment.startsWith(`v=${SHARE_VERSION}&erd=601&`), true);
});

test('accepts a fragment with or without the leading hash', () => {
  const fragment = buildShareFragment(sampleInputs);

  assert.deepEqual(parseShareFragment(`#${fragment}`), parseShareFragment(fragment));
});

test('rejects a fragment from another format version', () => {
  const fragment = buildShareFragment(sampleInputs).replace(`v=${SHARE_VERSION}`, 'v=2');

  assert.equal(parseShareFragment(fragment), null);
});

test('rejects a fragment without a version', () => {
  const fragment = buildShareFragment(sampleInputs).replace(`v=${SHARE_VERSION}&`, '');

  assert.equal(parseShareFragment(fragment), null);
});

test('rejects a fragment missing any single input', () => {
  for (const field of SHARE_FIELDS) {
    const params = new URLSearchParams(buildShareFragment(sampleInputs));
    params.delete(field);

    assert.equal(parseShareFragment(params.toString()), null, `${field} should be required`);
  }
});

test('rejects an empty or unrelated fragment', () => {
  assert.equal(parseShareFragment(''), null);
  assert.equal(parseShareFragment('#'), null);
  assert.equal(parseShareFragment('#section-erd'), null);
});

// ハッシュルーターが同じ fragment を使うので、ルートを名乗るだけの fragment を
// 共有 URL と取り違えないことを固定しておく。取り違えると「共有リンクが読めません」の
// 警告がページを開くたびに出る。
test('rejects a fragment that only names a route', () => {
  for (const fragment of ['#/', '#/about', '#/changelog/2026', '#/?tab=1']) {
    assert.equal(parseShareFragment(fragment), null, `${fragment} is not a share link`);
    assert.equal(hasShareFragment(fragment), false, `${fragment} is not a share link`);
  }
});

test('reads the payload out of the route fragment it now writes', () => {
  const shared = buildShareUrl('https://llongmane584.github.io/the-spoke-calculator/', sampleInputs);
  const { hash } = new URL(shared);

  assert.equal(hash.startsWith('#/?'), true, `expected a routed fragment, got ${hash}`);
  assert.equal(hasShareFragment(hash), true);
  assert.deepEqual(parseShareFragment(hash), sampleInputs);
});

// #118 でルーターを入れる前に配った URL は `#v=1&...` の形をしている。読めなくなると
// 共有された側が黙って初期状態で起動するので、旧形式のまま読めることを固定しておく。
test('still reads a share fragment from before the router', () => {
  const legacy = `#${buildShareFragment(sampleInputs)}`;

  assert.equal(hasShareFragment(legacy), true);
  assert.deepEqual(parseShareFragment(legacy), sampleInputs);
});

test('moves a pre-router fragment onto the calculator route', () => {
  const legacy = `#${buildShareFragment(sampleInputs)}`;
  const routed = routedShareFragment(legacy);

  assert.notEqual(routed, null);
  assert.equal(routed?.startsWith('#/?'), true);
  assert.deepEqual(parseShareFragment(routed ?? ''), sampleInputs);
});

test('leaves a fragment alone when there is nothing to move', () => {
  // すでに新形式
  assert.equal(routedShareFragment(`#/?${buildShareFragment(sampleInputs)}`), null);
  // 共有 URL ではない
  assert.equal(routedShareFragment('#/about'), null);
  assert.equal(routedShareFragment('#section-erd'), null);
  assert.equal(routedShareFragment('#'), null);
  assert.equal(routedShareFragment(''), null);
});

test('ignores unknown parameters so added ones do not break older clients', () => {
  const fragment = `${buildShareFragment(sampleInputs)}&utm_source=chat`;

  assert.deepEqual(parseShareFragment(fragment), sampleInputs);
});

// 値の妥当性はここでは見ない (App 側の検証が担当する)。読み取り側が勝手に弾くと
// 判定規則が二重になるので、形が揃っていれば素通しすることを固定しておく。
test('passes malformed values through for the caller to validate', () => {
  const fragment = buildShareFragment({ ...sampleInputs, erd: 'not-a-number' });

  assert.deepEqual(parseShareFragment(fragment), { ...sampleInputs, erd: 'not-a-number' });
});

test('trims surrounding whitespace on both ends of the round trip', () => {
  assert.deepEqual(
    parseShareFragment(buildShareFragment({ ...sampleInputs, erd: ' 601 ' })),
    sampleInputs,
  );
});

test('refuses to build a link from incomplete inputs', () => {
  const incomplete: Record<string, string> = { ...sampleInputs };
  delete incomplete.erd;

  assert.throws(() => buildShareFragment(incomplete), /missing input "erd"/);
});

test('replaces only the fragment of the current URL', () => {
  const shared = buildShareUrl(
    'https://llongmane584.github.io/the-spoke-calculator/?lang=ja#stale',
    sampleInputs,
  );
  const url = new URL(shared);

  assert.equal(url.origin, 'https://llongmane584.github.io');
  assert.equal(url.pathname, '/the-spoke-calculator/');
  assert.equal(url.search, '?lang=ja');
  assert.equal(url.hash, `#/?${buildShareFragment(sampleInputs)}`);
  assert.deepEqual(parseShareFragment(url.hash), sampleInputs);
});

test('recognises a share fragment even when it cannot be parsed', () => {
  assert.equal(hasShareFragment(buildShareFragment(sampleInputs)), true);
  assert.equal(hasShareFragment('#v=1&erd=601'), true);
  assert.equal(hasShareFragment('#v=99'), true);
  assert.equal(hasShareFragment('#section-erd'), false);
  assert.equal(hasShareFragment('#'), false);
  assert.equal(hasShareFragment(''), false);
});
