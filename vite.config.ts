import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages はリポジトリ名のサブパスで配信するので、ビルド成果物の base はそこに合わせる。
  // `/` でよいのは開発サーバーだけ。
  //
  // preview を isPreview で拾うのは、`vite preview` の command が 'build' ではなく 'serve' で
  // 来るため (Vite は preview の設定を resolveConfig(inlineConfig, 'serve', …, true) で解決する)。
  // command だけで分けると、preview サーバーは `/` で配信する一方、配信する dist/index.html は
  // `/the-spoke-calculator/assets/*` を指したままになり、アプリが起動しない (#140)。
  base: command === 'build' || isPreview ? '/the-spoke-calculator/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    strictPort: true,
  },
  // Tailwind v4 は @tailwindcss/vite 経由で Lightning CSS を使うため PostCSS を必要としない。
  // 明示的に空にしておかないと、Vite が親ディレクトリを遡って postcss.config を探し、
  // 見つけた設定（例: git worktree を親リポジトリ配下に置いた場合の v3 用設定）で
  // ビルドが壊れる。
  css: { postcss: { plugins: [] } },
}))
