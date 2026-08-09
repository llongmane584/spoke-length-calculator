# 自転車スポーク長計算機

## デモページ
GitHub pages: https://llongmane584.github.io/spoke-length-calculator/

[English](README.md)

- 自転車のホイール組み立てに必要なスポーク長を(可能な限り)正確に計算するWebアプリケーションです。
- ERD は標準的な 12mm ニップルを前提とした値として扱います。厳密にやりたい場合、リムの内側厚みとニップル長さを考慮する必要があるので、その辺を気にする人は改造してください。
- このツールを使って計算した結果でうまくいかない場合は作者に苦情を入れず、ご自身で改善を行ってください。
- 各パラメータは、[Hope Pro 5](https://www.hopetech.com/products/hubs/mountain-bike/pro-5-110mm-boost-front/)の仕様ドキュメントで入力できるものを元に決めました。

## 開発について

このプロジェクトのコードの大部分を [Claude Code](https://claude.ai/code) で作成しました。

## 機能

- **スポーク長の精密計算**: 余弦定理(平面)とピタゴラスの定理(立体)を組み合わせたありふれた計算式を使用
- **プリセット機能**: 作者所有の部品から入力欄を埋められる。各見出しの横のチップで選択する
  - ホイール単位: Hope Pro 5 CL / IS6 のハブ × Nextie Premium 2936 / Stan's Flow MK4（フロント/リア）
  - ハブ単体・リム単体: それぞれ個別に選べるので、まだ組んだことのない組み合わせも試算できる
  - チップは今の入力値を映す —— ホイールを選べばハブ・リムのチップも自動で点き、
    値を手で書き換えると一致しなくなったチップが自動で消える
- **豊富な入力パラメータ**:
  - ERD（有効リム径）
  - リムオフセット（左右の実効フランジ距離差を縮める方向へ自動適用）
  - 左右ハブフランジのPCD（ピッチ円直径）
  - 左右フランジ間距離
  - スポーク穴径
  - スポーク本数（24、28、32、36本）
  - 左右それぞれの組み方（0〜4クロス）
- **計算結果の保存機能**: ローカルストレージに名前を付けて保存
- **保存データの管理**: 保存した計算結果の一覧表示・削除
- **JSONエクスポート/インポート**: 計算データのバックアップと共有
- **レスポンシブデザイン**: スマートフォンからデスクトップまで対応

## 技術スタック

- **React 19** + **TypeScript**: UIフレームワーク
- **Vite**: 高速な開発サーバーとビルドツール
- **Tailwind CSS v4**: ユーティリティファーストのCSSフレームワーク。設定は `src/index.css` に CSS-first で置く
- **Lucide React**: アイコンライブラリ

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# プロダクションビルド
pnpm build

# ビルドのプレビュー
pnpm preview

# コード品質チェック
pnpm lint
```

### OGP 画像の再生成

`public/og-image.png` は SNS 共有用のカード画像 (1200×630)。ビルドで生成せずコミットして
いるので、カードのデザインを変えたときだけ再生成すればよい。ソースは
[`og/og-card.html`](og/og-card.html) で、正確なコマンド列はそのファイル冒頭のコメントにある。
グローバルの `playwright-cli` と、依存ゼロの静的サーバー [`og/serve.mjs`](og/serve.mjs) を使う。

再生成したら、1200×630 ちょうどであること、300KB 未満であること、文字が代替書体では
なく Inter で描かれていることを確認する。

## 使い方

1. **基本情報の入力**
   - **プリセット**（オプション）: 「入力値」見出しの横のチップでホイールごと、
     「リム」「ハブ」見出しの横のチップでその区画だけを埋められる
   - リムとハブの各種寸法を入力
   - スポーク本数と組み方を選択

2. **計算結果の確認**
   - 入力すると左右それぞれのスポーク長が即座に更新されます（計算ボタンはありません）

3. **結果の保存**
   - 計算結果に名前を付けて保存できます
   - 保存したデータは後から呼び出し可能

4. **データの管理**
   - JSONファイルとしてエクスポート
   - JSONファイルからインポート
   - 保存済みデータの削除

## プロジェクト構造

```
/spoke-length-calculator/
├── src/
│   ├── App.tsx                    # メインアプリケーションコンポーネント
│   ├── main.tsx                   # エントリーポイント
│   ├── index.css                  # Tailwind v4 エントリ + デザイントークン
│   ├── styles.ts                  # ボタン / select の共通クラス文字列
│   ├── i18n.ts                    # 多言語化設定
│   ├── rimOffset.ts               # リムオフセットのロジック
│   ├── rimOffset.test.ts          # リムオフセットの単体テスト
│   ├── partPresets.ts             # ハブ / リム部品プリセットの読み込みと一致判定
│   ├── presetData.test.ts         # 全体プリセットと部品の数値がずれていないか検証
│   ├── spokeCompare.ts            # ホイール比較のロジック
│   ├── vite-env.d.ts              # Vite 環境型定義
│   ├── assets/                    # 静的アセット
│   │   └── react.svg
│   ├── components/                # 再利用可能なコンポーネント
│   │   ├── CompareWheels.tsx      # ホイール比較パネル
│   │   ├── ConfirmDialog.tsx      # 確認ダイアログ
│   │   ├── HelpButton.tsx         # インラインヘルプの起動ボタン
│   │   ├── HelpModal.tsx          # SVG 図解つきヘルプモーダル
│   │   ├── PresetSelect.tsx       # プリセット選択 (CSS customizable select)
│   │   ├── SegmentedControl.tsx   # セグメントコントロール
│   │   └── Toast.tsx              # トースト通知コンポーネント
│   ├── contexts/                  # React コンテキスト
│   │   ├── ThemeContext.tsx       # テーマコンテキストの実装
│   │   ├── themeContextValue.ts
│   │   ├── ToastContext.tsx       # トーストコンテキストの実装
│   │   └── ToastContextDefinition.ts
│   ├── hooks/                     # カスタムフック
│   │   ├── useTheme.ts            # テーマフック
│   │   └── useToast.ts            # トーストフック
│   ├── locales/                   # 翻訳ファイル
│   │   ├── en.json                # 英語翻訳
│   │   └── ja.json                # 日本語翻訳
│   └── presets/                   # プリセットデータ
│       ├── *.json                 # ホイール単位: {ハブ}_{リム}_{Front|Rear}.json (6 ファイル)
│       ├── hubs/                  # ハブ単体: {ハブ}_{Front|Rear}.json (4 ファイル)
│       └── rims/                  # リム単体: {リム}.json (2 ファイル)
├── public/                        # 静的ファイル
│   └── calculator.svg
├── dist/                          # ビルド出力
├── AGENTS.md                      # AI アシスタント向け指示
├── CLAUDE.md                      # AI アシスタント向け指示
├── README.md                      # 英語ドキュメント
├── README_ja.md                   # 日本語ドキュメント
├── package.json                   # 依存関係と設定
├── pnpm-lock.yaml                 # ロックファイル
├── vite.config.ts                 # Vite 設定
├── tsconfig.json                  # TypeScript 設定
├── tsconfig.app.json              # アプリ用 TypeScript 設定
├── tsconfig.node.json             # Node 用 TypeScript 設定
└── eslint.config.js               # ESLint 設定
```

## 開発上の注意

- TypeScriptは厳格モードで動作
- ESLintでコード品質を管理
- データはブラウザのlocalStorageに保存

## ライセンス

[MIT License](LICENSE)
