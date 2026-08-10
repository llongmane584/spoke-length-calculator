# 自転車スポーク長計算機

## デモページ
GitHub pages: https://llongmane584.github.io/spoke-length-calculator/

[English](README.md)

- 自転車のホイール組み立てに必要なスポーク長を(可能な限り)正確に計算するWebアプリケーションです。
- ニップルは 12mm を前提としています。厳密にやりたい場合、リムの内側厚みとニップル長さを考慮する必要があるので、その辺を気にする人は改造してください。
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
- **URLで条件を共有**: 現在の入力条件を URL にして共有（受け取った側は同じ条件で起動）
- **メニュードロワー**: 右上のハンバーガーから「このアプリについて」「使い方」「ライセンス」
  「更新履歴」へ。デスクトップは右サイドドロワー、スマートフォンは全画面カバーで、
  最下部にバージョン番号を表示
- **レスポンシブデザイン**: スマートフォンからデスクトップまで対応

## 技術スタック

- **React 19** + **TypeScript**: UIフレームワーク
- **Vite**: 高速な開発サーバーとビルドツール
- **Tailwind CSS v4**: ユーティリティファーストのCSSフレームワーク。設定は `src/index.css` に CSS-first で置く
- **Lucide React**: アイコンライブラリ
- **React Router**: 情報ページのルーティング。ハッシュルーター (`#/about`) を使うので
  GitHub Pages に 404 フォールバックを足さずに直リンクとリロードが動く。共有 URL は
  `#/?v=1&…` の形でルート配下の search に載る（ルーター導入前の `#v=1&…` も読める）

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

`public/og-image-2.png` は SNS 共有用のカード画像 (1200×630)。ビルドで生成せずコミットして
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

4. **条件の共有**
   - 「計算結果」見出しの右にある「共有」で、今の入力条件を載せた URL を作成
   - 共有機能に対応した端末では OS の共有画面、それ以外ではクリップボードへコピー
   - 受け取った URL を開くと同じ入力条件で起動（読めない URL のときは通常の初期状態）
   - 共有するのは入力条件だけで、計算結果や保存データは URL に含みません

5. **データの管理**
   - JSONファイルとしてエクスポート
   - JSONファイルからインポート
   - 保存済みデータの削除

## プロジェクト構造

```
/spoke-length-calculator/
├── src/
│   ├── App.tsx                    # シェル。ヘッダー / ルーティング / ドロワー
│   ├── main.tsx                   # エントリーポイント (HashRouter はここ)
│   ├── index.css                  # Tailwind v4 エントリ + デザイントークン
│   ├── styles.ts                  # ボタン / select / リンクの共通クラス文字列
│   ├── i18n.ts                    # 多言語化設定
│   ├── changelog.ts               # バージョン番号と更新履歴の骨組み
│   ├── changelog.test.ts          # バージョンと更新履歴の食い違いを検出
│   ├── locales.test.ts            # en.json と ja.json のキーが同じ形か検証
│   ├── rimOffset.ts               # リムオフセットのロジック
│   ├── rimOffset.test.ts          # リムオフセットの単体テスト
│   ├── partPresets.ts             # ハブ / リム部品プリセットの読み込みと一致判定
│   ├── presetData.test.ts         # 全体プリセットと部品の数値がずれていないか検証
│   ├── shareLink.ts               # 入力条件を URL fragment に載せる / 戻す
│   ├── shareLink.test.ts          # 共有 URL の単体テスト
│   ├── spokeCompare.ts            # ホイール比較のロジック
│   ├── thirdPartyNotices.test.ts  # 同梱の Lucide 表記が原本と一致しているか検証
│   ├── vite-env.d.ts              # Vite 環境型定義
│   ├── assets/                    # 静的アセット
│   │   └── react.svg
│   ├── pages/                     # ルート 1 つにコンポーネント 1 つ
│   │   ├── CalculatorPage.tsx     # 計算機本体
│   │   ├── AboutPage.tsx          # このアプリについて
│   │   ├── UsagePage.tsx          # 使い方
│   │   ├── LicensePage.tsx        # ルートの LICENSE をそのまま表示
│   │   ├── ChangelogPage.tsx      # 最新 1 件 + すべての更新履歴への導線
│   │   ├── ChangelogAllPage.tsx   # 最新の年 + 他の年へのリンク
│   │   ├── ChangelogYearPage.tsx  # 年別
│   │   └── NotFoundPage.tsx       # 知らないハッシュルート
│   ├── components/                # 再利用可能なコンポーネント
│   │   ├── AppHeader.tsx          # タイトル + ハンバーガー
│   │   ├── AppDrawer.tsx          # メニュードロワー (ナビ / 言語 / テーマ / バージョン)
│   │   ├── PageShell.tsx          # 情報ページの共通枠
│   │   ├── ChangelogSections.tsx  # 更新履歴のエントリ一覧と年ナビ
│   │   ├── ActionBar.tsx          # 計算結果の下のアクション列
│   │   ├── CompareWheels.tsx      # ホイール比較パネル
│   │   ├── ConfirmDialog.tsx      # 確認ダイアログ
│   │   ├── HelpButton.tsx         # インラインヘルプの起動ボタン
│   │   ├── HelpModal.tsx          # SVG 図解つきヘルプモーダル
│   │   ├── InitialDataAlert.tsx   # 警告 / エラーのバナー
│   │   ├── Modal.tsx              # 汎用ダイアログ (Tab トラップ / Escape / 重ね順)
│   │   ├── PresetSelect.tsx       # プリセット選択 (CSS customisable select)
│   │   ├── SaveDialog.tsx         # 計算結果の保存と管理
│   │   ├── SegmentedControl.tsx   # セグメントコントロール
│   │   ├── Toast.tsx              # トースト通知コンポーネント
│   │   └── icons/MtbHubIcon.tsx   # Lucide に合わせた自作アイコン
│   ├── contexts/                  # React コンテキスト
│   │   ├── ThemeContext.tsx       # テーマコンテキストの実装
│   │   ├── themeContextValue.ts
│   │   ├── ToastContext.tsx       # トーストコンテキストの実装
│   │   └── ToastContextDefinition.ts
│   ├── hooks/                     # カスタムフック
│   │   ├── useDialogLayer.ts      # オーバーレイの重ね順 / Escape / Tab トラップ
│   │   ├── useDockMorph.ts        # ドックする結果帯のための --dock 書き込み
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
