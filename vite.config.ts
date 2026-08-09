import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/spoke-length-calculator/',
  plugins: [react(), tailwindcss()],
  // Tailwind v4 は @tailwindcss/vite 経由で Lightning CSS を使うため PostCSS を必要としない。
  // 明示的に空にしておかないと、Vite が親ディレクトリを遡って postcss.config を探し、
  // 見つけた設定（例: git worktree を親リポジトリ配下に置いた場合の v3 用設定）で
  // ビルドが壊れる。
  css: { postcss: { plugins: [] } },
}))