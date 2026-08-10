# CLAUDE.md

## Project Overview

スポーク長計算Webアプリケーション。自転車ホイール組みに必要なスポーク長を計算する。

## MANDATORY Issue based development Workflow - YOU MUST FOLLOW THIS

Think in English, respond in Japanese.

### REQUIRED STEPS FOR ALL CODE CHANGES:
1. **Planning Phase**: Create improvement plan and discuss approach
2. **Documentation Phase**: IMPORTANT - Once approved, add detailed implementation plan as comment to the issue using `gh issue comment`
3. **Branching Phase**: Create appropriately named feature branch
4. **Implementation Phase**: Write code following project standards
5. **Testing Phase**: Validate functionality (This project uses `pnpm` to run lint and build)
6. **Integration Phase**: Commit, push, and create pull request for review (Link the related issue using `close:` when creating a PR)

### VIOLATION CONSEQUENCES:
- Changes will be rejected if workflow not followed
- Process must restart from planning phase

## Code Style Guidelines

- Source code line endings must always use LF (Unix-style).
- Do not add unnecessary trailing whitespace at the end of lines.
- Must avoid over-engineering
- A fake fallback that merely creates the illusion of successful completion is "swallowing an exception" and does not constitute a true fallback. Such fake fallbacks are strictly prohibited. Ensure thorough early notification of errors.
- コンソールに出るものは、エラーも警告も、重要度に関わらず解消する。
  「本番ビルドでは出ない」「SSR していないので出ない」「実害はない」は免罪符にならない ——
  開発ビルドだけの警告も対象。警告を無視することに慣れると、いずれ重大なエラーも見落とす。
  すぐに直せないものは、コードコメントで正当化せず issue として起票する。
  - 有害な記録の実例 (#120)。React の DOM ネスト警告について、`PresetSelect.tsx` に
    こう書いて放置していた —— 「なお React の DOM ネスト検証は `<select>` の子に
    `<button>` を許さず、開発ビルドで警告を 1 本出す（customizable select がまだ
    React 側に反映されていないため）。本番ビルドでは出ず、SSR もしていないので実害はない」。
    警告を消す手 (React の管理外で組み立てる) は実際にはあり、この記述は調査を打ち切らせる
    だけの有害な記録だった。同じ形の「実害はない」を二度と書かないこと

## Other Guidelines

- If a temporary directory is required, create a 'temp' or 'tmp' directory within the project and use that. Access outside the project is prohibited in principle. Additionally, ensure that any temporary directories within the project are added to the .ignore file.
- ALWAYS use `rg` (ripgrep) instead of `grep` for searching file contents. NEVER use `grep`.

## GitHub CLI Usage

- Use `gh issue view` directly without `--repo` option.
- Refer to `.git/config` ONLY IF basic repository information is absolutely necessary.

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
- playwright-cli が利用可能（ローカル環境のみ。グローバル npm 導入のためクラウド開発では使えない）
  - 例: `playwright-cli resize 1440 900 && playwright-cli screenshot --filename=desktop-1440.png`


## クソダサUIデザイン禁止

- クソダサいグラデーション禁止
- クソダサい青紫系配色禁止
- GitHub へのテキスト送信は、 ./tmp/ 以下に issue 番号のサブディレクトリに一時ファイルを生成し、 `--body-file` で行うこと
- オープンPRの修正の場合、新規ブランチを作成せず、新規Issueを起票しない
- 実装完了後、ブラウザーのコンソールにエラーも警告も出ていないことを確認する
  (Code Style Guidelines のコンソールの項を参照)