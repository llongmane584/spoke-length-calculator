# AGENTS.md

## Project Overview

スポーク長計算Webアプリケーション。自転車ホイール組みに必要なスポーク長を計算する。

## Key Conventions

- Tailwind CSS v4 でスタイリング。設定は JS ではなく `src/index.css` に置く (CSS-first)
  - 色は必ずセマンティックトークン (`bg-surface`, `text-fg`, `border-line`, `bg-accent` …) で書く。
    パレット直参照 (`bg-slate-800` など) と `dark:` は使わない —— ライト/ダークの
    切り替えは `src/index.css` の `@theme` と `.dark` が一手に引き受ける
  - `@theme inline` は使わない。値がビルド時に埋め込まれ `.dark` の上書きが無言で効かなくなる
  - ボタンと select の共通クラスは `src/styles.ts` を使う
  - `src/index.css` が大きいのは削除した `tailwind.config.js` の中身が移ったため。
    「CSS ファイルは最小限」はコンポーネント側に色を散らかさないという意味に読み替える
- react-i18next で日英多言語対応（翻訳キーは `src/locales/` の JSON で管理）
- ハブ・リムのプリセットデータは `src/presets/` に JSON でマニュアル管理
