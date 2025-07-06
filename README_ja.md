# 自転車スポーク長計算機

[English](README.md)

- 自転車のホイール組み立てに必要なスポーク長を(可能な限り)正確に計算するWebアプリケーションです。
- 厳密にやりたい場合、リムの内側厚みとニップル長さを考慮する必要があるので、その辺を気にする人は改造してください。
- このツールを使って計算した結果でうまくいかない場合は作者に苦情を入れず、ご自身で改善を行ってください。
- 各パラメータは、[Hope Pro 5](https://www.hopetech.com/products/hubs/mountain-bike/pro-5-110mm-boost-front/)の仕様ドキュメントで入力できるものを元に決めました。

## 開発について

このプロジェクトのコードの大部分を [Claude Code](https://claude.ai/code) で作成しました。

## 機能

- **スポーク長の精密計算**: 余弦定理(平面)とピタゴラスの定理(立体)を組み合わせたありふれた計算式を使用
- **プリセット機能**: 作者所有のハブ/リムの組み合わせをプリセットとして選択可能
  - Hope Pro 5 IS6 + Nextie Premium 2936（フロント/リア）
- **豊富な入力パラメータ**:
  - ERD（有効リム径）
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
- **Tailwind CSS**: ユーティリティファーストのCSSフレームワーク
- **Lucide React**: アイコンライブラリ

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# ビルドのプレビュー
npm run preview

# コード品質チェック
npm run lint
```

## 使い方

1. **基本情報の入力**
   - **プリセット選択**: ハブ/リムの組み合わせから選択（オプション）
   - リムとハブの各種寸法を入力
   - スポーク本数と組み方を選択

2. **計算実行**
   - 「計算」ボタンをクリックすると、左右それぞれのスポーク長が表示されます

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
│   ├── index.css                  # グローバルスタイル
│   ├── i18n.ts                    # 国際化設定
│   ├── vite-env.d.ts              # Vite環境変数型定義
│   ├── assets/                    # 静的アセット
│   │   └── react.svg
│   ├── components/                # 再利用可能コンポーネント
│   │   └── Toast.tsx              # トースト通知コンポーネント
│   ├── contexts/                  # React Context
│   │   ├── ToastContext.tsx       # トーストコンテキスト実装
│   │   └── ToastContextDefinition.ts
│   ├── hooks/                     # カスタムReactフック
│   │   └── useToast.ts            # トーストフック
│   ├── locales/                   # 翻訳ファイル
│   │   ├── en.json                # 英語翻訳
│   │   └── ja.json                # 日本語翻訳
│   └── presets/                   # プリセットデータ
│       ├── Hope-Pro-5-IS6_Nextie-Premium-2936_Front.json
│       └── Hope-Pro-5-IS6_Nextie-Premium-2936_Rear.json
├── public/                        # 静的ファイル
│   └── calculator.svg
├── dist/                          # ビルド出力
├── CLAUDE.md                      # AI assistant instructions
├── README.md                      # 英語版ドキュメント
├── README_ja.md                   # 日本語版ドキュメント
├── package.json                   # 依存関係と設定
├── package-lock.json              # 依存関係ロックファイル
├── vite.config.ts                 # Vite設定
├── tsconfig.json                  # TypeScript設定
├── tsconfig.app.json              # アプリ固有TypeScript設定
├── tsconfig.node.json             # Node固有TypeScript設定
├── tailwind.config.js             # Tailwind CSS設定
├── postcss.config.cjs             # PostCSS設定
└── eslint.config.js               # ESLint設定
```

## 開発上の注意

- TypeScriptは厳格モードで動作
- ESLintでコード品質を管理
- データはブラウザのlocalStorageに保存

## ライセンス

[MIT License](LICENSE)
