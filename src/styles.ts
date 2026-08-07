// 共有するスタイル文字列。コンポーネントではなく定数だけを置く。
// eslint.config.js の reactRefresh.configs.vite はコンポーネントと非コンポーネントの
// 混在 export を警告するので、専用モジュールに分けている。
//
// 色は必ずセマンティックトークン (bg-surface, text-fg, border-line …) で書くこと。
// パレット直参照 (bg-slate-800 など) と dark: は使わない —— 色の決定は
// src/index.css のトークン層に集約されている。

const btnBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-subtle';

/** 主要動作。1 画面に 1 つを原則とする。 */
export const btnPrimary = `${btnBase} bg-accent text-on-accent hover:bg-accent-hover`;

/** 副次動作。塗りではなくアウトラインにして、primary との階層を保つ。 */
export const btnSecondary = `${btnBase} border border-line-strong bg-surface text-fg hover:bg-sunken`;

/** アイコンボタンや控えめなリンク的操作。 */
export const btnGhost =
  'inline-flex min-h-9 min-w-9 items-center justify-center gap-2 rounded-md px-2 font-medium transition-colors ' +
  'text-fg-muted hover:bg-sunken hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** 破壊的動作。 */
export const btnDanger = `${btnBase} bg-danger text-on-danger hover:brightness-110`;

// appearance-none はドロップダウンのポップアップまでは変えられない。
// ポップアップ側は index.css の base 層にある color-scheme が担当する。
// pr-9 は重ねる ChevronDown のぶんの余白。
export const nativeSelect =
  'w-full min-h-11 appearance-none rounded-md border border-line-strong bg-surface py-2 pl-3 pr-9 text-fg ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** ネイティブ select に重ねる ChevronDown 用。pointer-events-none が無いとクリックを食う。 */
export const selectChevron =
  'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle';
