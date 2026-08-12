# 自転車スポーク長計算機

## デモページ
GitHub pages: https://llongmane584.github.io/the-spoke-calculator/

[English](README.md)

- 自転車のホイール組み立てに必要なスポーク長を(可能な限り)正確に計算するWebアプリケーションです。
- ニップルは 12mm を前提としています。厳密にやりたい場合、リムの内側厚みとニップル長さを考慮する必要があるので、その辺を気にする人は改造してください。
- このツールを使って計算した結果でうまくいかない場合は作者に苦情を入れず、ご自身で改善を行ってください。
- 各パラメータは、[Hope Pro 5](https://www.hopetech.com/products/hubs/mountain-bike/pro-5-110mm-boost-front/)の仕様ドキュメントで入力できるものを元に決めました。

## 開発について

このプロジェクトのコードの大部分を [Claude Code](https://claude.ai/code) で作成しました。

## 機能

- **スポーク長の精密計算**: 余弦定理(平面)とピタゴラスの定理(立体)を組み合わせたありふれた計算式を使用。
  左右のスポーク長は入力に応じて即座に更新される（計算ボタンはない）
- **プリセット機能**: 作者所有の部品から入力欄を埋められる。各見出しの横のチップで選択する
  - ホイール単位: Hope Pro 5 CL + Nextie Premium 29x36、Hope Pro 5 IS6 + Nextie Premium 29x36、
    Hope Pro 5 IS6 + Stan's Flow MK4 29in の 3 組を、それぞれフロント / リアで（計 6 件）
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
- **入力値の検証と警告**: 各欄は入力しながら範囲を検証する。リムオフセットについては、その値が左右差を
  縮めるどころか広げてしまうとき、および左右のフランジ距離が等しく向きを決められないとき（この場合
  オフセットは計算に適用しない）に警告を出す
- **入力欄のヘルプ**: ラベル横の (?) からその寸法の説明を開く。ERD・フランジ距離・スポーク穴径・
  組み方には SVG の図解つき
- **計算結果の帯のドッキング**: 本来の居場所がまだ画面の外にある間、結果の帯は画面下端に貼り付いて
  数値だけの姿に縮み、そこまでスクロールすると本来の姿に戻る
- **アクションバー**: 共有 / 保存 / JSON 出力 / JSON 入力 / 比較を結果の下の 1 行に集約。計算名の入力欄も
  保存済みの一覧も比較そのものも、このボタンの先のダイアログが持つ
- **計算結果の保存機能**: ローカルストレージに名前を付けて保存
- **保存データの管理**: 保存した計算結果の一覧表示・読み込み・削除（保存と同じダイアログの中）
- **JSONエクスポート/インポート**: 計算データのバックアップと共有
- **URLで条件を共有**: 現在の入力条件を URL にして共有（受け取った側は同じ条件で起動）
- **ホイール比較**: 今のホイールとこれから組むホイールを、プリセット・保存済み・現在の入力から選ぶ。
  再利用できる本数（±1mm）、余る本数、左右それぞれ買い足す本数を出す。再利用の判定は長さだけで、
  スポークの太さや疲労は見ていない
- **日本語 / English**: ドロワーから切り替え、選択は記憶する（既定は英語）
- **ライト / ダークテーマ**: 初回は OS の設定に従い、以降はドロワーの切替を記憶する
- **メニュードロワー**: 右上のハンバーガーから「このアプリについて」「使い方」「ライセンス」
  「更新履歴」へ。言語とテーマの切替もここにある。デスクトップは右サイドドロワー、
  スマートフォンは全画面カバーで、最下部にバージョン番号を表示
- **ホーム画面に追加できる**: manifest とアイコンを同梱しているので、追加するとスタンドアロン表示で
  起動する。Service Worker は持たないのでオフラインでは動かない
- **レスポンシブデザイン**: スマートフォンからデスクトップまで対応

## 技術スタック

- **React 19** + **TypeScript**: UIフレームワーク
- **Vite**: 高速な開発サーバーとビルドツール
- **Tailwind CSS v4**: ユーティリティファーストのCSSフレームワーク。設定は `src/index.css` に CSS-first で置く
- **Lucide React**: アイコンライブラリ
- **react-i18next**（+ **i18next**）: 日英の多言語対応。翻訳は `src/locales/` の JSON で管理
- **React Router v8**: 情報ページのルーティング。ハッシュルーター (`#/about`) を使うので
  GitHub Pages に 404 フォールバックを足さずに直リンクとリロードが動く。共有 URL は
  `#/?v=1&…` の形でルート配下の search に載る（ルーター導入前の `#v=1&…` も読める）

## セットアップ

```bash
# 依存関係のインストール（lefthook の git hook もここで入る）
pnpm install

# 開発サーバーの起動
pnpm dev

# プロダクションビルド
pnpm build

# ビルドのプレビュー
pnpm preview

# コード品質チェック
pnpm lint

# ユニットテスト（node --test。ブラウザは使わない）
pnpm test
```

### OGP 画像の再生成

`public/og-image-4.png` は SNS 共有用のカード画像 (1200×630)。ビルドで生成せずコミットして
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
   - そこまでスクロールするまで、結果の帯は画面下端にドックしたままになります

3. **結果の保存**
   - 結果の下のアクションバーの「保存」からダイアログを開き、名前を付けて保存します
   - 同じダイアログに保存済みの一覧があり、後から読み込みや削除ができます

4. **条件の共有**
   - アクションバーの「共有」で、今の入力条件を載せた URL を作成
   - 共有機能に対応した端末では OS の共有画面、それ以外ではクリップボードへコピー
   - 受け取った URL を開くと同じ入力条件で起動（読めない URL のときは通常の初期状態）
   - 共有するのは入力条件だけで、計算結果や保存データは URL に含みません

5. **ホイールの比較**
   - アクションバーの「比較」で、今持っているホイールとこれから組むホイールを並べます
   - どちらもプリセット・保存済み・現在の入力から選べるので、試算のために保存する必要はありません
   - 再利用できる本数・余る本数・左右それぞれ買い足す本数が出ます

6. **データの管理**
   - JSONファイルとしてエクスポート
   - JSONファイルからインポート
   - 保存済みデータの削除

## プロジェクト構造

```
/the-spoke-calculator/
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
├── public/                        # そのままサイト直下に置かれる静的ファイル
│   ├── calculator.svg             # ファビコン
│   ├── icons/                     # ホーム画面用アイコン (192 / 512 / maskable / apple-touch)
│   ├── manifest.webmanifest       # Web App Manifest
│   ├── og-image-4.png             # SNS 共有用カード画像 (1200×630)
│   └── THIRD_PARTY_NOTICES.txt    # Lucide の ISC 表記。ライセンスページから開く
├── og/                            # 共有カードのソース。ビルド対象ではない
│   ├── og-card.html               # カード本体。再生成の手順は冒頭のコメント
│   └── serve.mjs                  # 再生成に使う依存ゼロの静的サーバー
├── .github/
│   └── workflows/deploy.yml       # main への push で GitHub Pages へビルド & デプロイ
├── dist/                          # ビルド出力
├── index.html                     # HTML エントリ。メタタグとテーマ / 言語の先読みスクリプト
├── AGENTS.md                      # AI アシスタント向け指示
├── CLAUDE.md                      # AI アシスタント向け指示
├── README.md                      # 英語ドキュメント
├── README_ja.md                   # 日本語ドキュメント
├── LICENSE                        # MIT License。ライセンスページにもそのまま出す
├── package.json                   # 依存関係と設定
├── pnpm-lock.yaml                 # ロックファイル
├── pnpm-workspace.yaml            # pnpm のビルド許可リスト
├── lefthook.yml                   # pre-commit フック (ESLint / tsc)
├── vite.config.ts                 # Vite 設定
├── tsconfig.json                  # TypeScript 設定
├── tsconfig.app.json              # アプリ用 TypeScript 設定
├── tsconfig.node.json             # Node 用 TypeScript 設定
└── eslint.config.js               # ESLint 設定
```

## 開発上の注意

- TypeScriptは厳格モードで動作
- ESLintでコード品質を管理
- `pnpm test` は `node --test` で走り、バンドラーも DOM も使わない。そのため対象モジュール
  (`rimOffset.ts` / `shareLink.ts` / `changelog.ts` / `partPresets.ts`) は Vite と DOM に依存させない。
  データの検証も兼ねており、バージョンと更新履歴、`en.json` と `ja.json`、全体プリセットとハブ / リム部品、
  同梱の Lucide 表記と `node_modules` の原本の一致を見張る
- `pnpm install` で lefthook が入る。pre-commit で staged な `.ts`/`.tsx` に ESLint、
  プロジェクト全体に `tsc -b` が走る
- `main` への push で GitHub Pages へビルド & デプロイされる
- データはブラウザのlocalStorageに保存（保存した計算結果・言語・テーマ）

## ライセンス

[MIT License](LICENSE)

アイコンは Lucide を ISC License で使用しています。表記は
[`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt) として同梱し、アプリのライセンスページから開けます。
