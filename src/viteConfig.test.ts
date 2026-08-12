import assert from 'node:assert/strict';
import test from 'node:test';

import type { ConfigEnv, UserConfig } from 'vite';

import viteConfig from '../vite.config.ts';

// #140: `vite preview` はビルド成果物を配信するのに command が 'serve' で来る。base を
// command だけで決めていたため preview サーバーが `/` で配信し、`/the-spoke-calculator/`
// を指す dist/index.html と食い違ってアプリが起動しなかった。
//
// ビルドもサーバー起動もせずに三通りの base を固定できるよう、設定関数をそのまま呼ぶ。
// defineConfig は関数をそのまま返すので、ここで受けているのは vite.config.ts の関数そのもの。
const resolveBase = (env: ConfigEnv): unknown => {
  assert.ok(typeof viteConfig === 'function', 'vite.config.ts should export a config function');

  const config = viteConfig(env) as UserConfig;

  return config.base;
};

test('serves the dev server from the root', () => {
  assert.equal(resolveBase({ command: 'serve', mode: 'development', isPreview: false }), '/');
});

test('builds against the GitHub Pages sub-path', () => {
  assert.equal(
    resolveBase({ command: 'build', mode: 'production', isPreview: false }),
    '/the-spoke-calculator/',
  );
});

// preview は command === 'serve' なので、dev と同じ枝に落ちないことがこのテストの要点。
test('previews the build against the same sub-path the build wrote into', () => {
  assert.equal(
    resolveBase({ command: 'serve', mode: 'production', isPreview: true }),
    '/the-spoke-calculator/',
  );
});
