# AGENTS.md

## Project Overview

スポーク長計算Webアプリケーション。自転車ホイール組みに必要なスポーク長を計算する。

## Branching and Releases

- `dev` が統合ブランチ。機能追加も修正も PR は `dev` 宛てに出す。
- `main` は本番そのもの。push した瞬間 GitHub Pages へデプロイされる。
- リリース (version++ / タグ / GitHub Release / アプリ内更新履歴) は
  [`docs/RELEASE.md`](docs/RELEASE.md) の手順で行う。リリース作業では issue もブランチも立てない。

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

## その他

- ライブラリ管理は pnpm 
- テストサーバーもlintも pnpm を使う
- テストサーバー起動前に、人間が起動済みのテストサーバーがあるかどうか確認する
- playwright-cli が利用可能

## クソダサUIデザイン禁止

- クソダサいグラデーション禁止
- クソダサい青紫系配色禁止
- GitHub へのテキスト送信は、 ./tmp/ 以下に issue 番号のサブディレクトリに一時ファイルを生成し、 `--body-file` で行うこと
- オープンPRの修正の場合、新規ブランチを作成せず、新規Issueを起票しない
- 実装完了後、ブラウザーのコンソールにエラーが出ていないことを確認する

## ドロワーのモーション再発防止

- ドロワーの最終位置は PR 119 / commit `3f6a4c7` の描画領域を基準にする。画面全体を基準にしない。
- 表示中の transform は `overflow-clip` の領域内に閉じ、閉じたままフォーカスする要素には `focus({ preventScroll: true })` を使う。フォーカスによる自動横スクロールと transform を競合させない。
- 開閉は `translateX(100%)` ↔ `translateX(0)` の単純な単調スライドだけ。scale / opacity / overshoot easing / bounce は追加しない。
- `playwright-cli` で開閉中の clip ancestor の `scrollLeft` が 0 であること、パネル位置が単調に終点へ向かうことを確認する。
- 閉じるスワイプ (`useSwipeToClose`) は右向きだけ。左へは引かない (overshoot 禁止)。開始点が画面左右の端から 32px 以内のときは受けない —— 閉じる向きは iOS / Android の「戻る」ジェスチャーと同じ向きで、端は OS の領分だから。この制限を「不要」として外さないこと。
- パネルの `touch-action` は**子孫にも**掛ける (`src/index.css` の `.drawer-panel-motion, .drawer-panel-motion *`)。touch-action は継承せず、指が載った要素からの遡りはスクロールコンテナで止まるので、パネルにだけ書くと中の `nav` に触れた指には届かない。届かないと Chromium が横スワイプをオーバースクロール操作として扱い、ドラッグが `pointercancel` で切られた上に履歴を 1 つ戻る。
- ジェスチャーの検証を `dispatchEvent(new PointerEvent(...))` で済ませないこと。script が作ったイベントはブラウザのジェスチャー認識を通らないので、上の `pointercancel` と履歴戻りが**再現しない**。`playwright-cli run-code` から CDP の `Input.dispatchTouchEvent` を送って実タッチで確かめる。
