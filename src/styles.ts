// 共有するスタイル文字列。コンポーネントでないものを置く。
// eslint.config.js の reactRefresh.configs.vite はコンポーネントと非コンポーネントの
// 混在 export を警告するので、専用モジュールに分けている。
//
// 色は必ずセマンティックトークン (bg-surface, text-fg, border-line …) で書くこと。
// パレット直参照 (bg-slate-800 など) と dark: は使わない —— 色の決定は
// src/index.css のトークン層に集約されている。

import type { PointerEvent } from 'react';

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
export const btnDanger = `${btnBase} bg-danger text-on-danger hover:bg-danger-hover`;

/**
 * CSS customizable select (`appearance: base-select`) が使えるか。
 * クラス文字列とマークアップの両方をこの 1 つの値で切り替える —— nativeSelect の
 * `appearance-none` は base-select を打ち消すので、CSS のカスケード順に賭けず
 * そもそも同じ要素に載せない。レンダリング中に変わらないのでモジュール定数でよい。
 */
export const supportsBaseSelect =
  typeof CSS !== 'undefined' && CSS.supports('appearance', 'base-select');

/**
 * 開いているピッカーを、トリガーの再タップで閉じるための保険。
 * customizable select を使う select には必ず onPointerDown で付けること
 * (スタイルではないがこのファイルに置く —— supportsBaseSelect の分岐と
 * 必ず対で使うもので、離すと片方だけ付け忘れる)。
 *
 * Chrome の customizable select は、開いた状態でトリガーを叩いたとき
 * タッチだと何も起きない (Chrome 151 で確認)。素の
 * `appearance: base-select` だけを持つ select でも再現するので、
 * このアプリの CSS・マークアップ・画面幅とは無関係なブラウザ側の穴。
 * ピッカーが画面を覆うモバイルでは「閉じる手段がない」——
 * 消すためだけに適当な項目を選ばされる —— という詰みとして出る。
 *
 * pointerdown の既定動作を止めるとポップオーバーの light-dismiss が走り、
 * トリガーを叩いても素直に閉じるようになる。
 *
 * ポインタの種類では分けない。閉じるという結果は変わらず、
 * 「マウスなら大丈夫」を前提にした分岐は入力手段が混ざる端末
 * (タッチ対応ノート PC など) で穴になる。
 *
 * option の上では止めないこと —— 止めると選択そのものが効かなくなる。
 * ピッカーの中身は select の子なので、イベントはここまで上がってくる。
 * optgroup の見出しとピッカーの余白も同じくここへ来る (前者は optgroup、
 * 後者は select が target) が、こちらは止めても閉じない —— light-dismiss は
 * ピッカーの外を叩いたときだけ走るため。実測で確認済み。
 */
export const dismissOpenPicker = (event: PointerEvent<HTMLSelectElement>) => {
  if ((event.target as Element).closest('option') !== null) return;
  if (event.currentTarget.matches(':open')) {
    event.preventDefault();
  }
};

const selectBase =
  'w-full min-h-11 rounded-md border border-line-strong bg-surface py-2 pl-3 text-fg ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// appearance-none はドロップダウンのポップアップまでは変えられない。
// ポップアップ側は index.css の base 層にある color-scheme が担当する。
// pr-9 は重ねる ChevronDown のぶんの余白。
export const nativeSelect = `${selectBase} appearance-none pr-9`;

/**
 * CSS customizable select (`appearance: base-select`) が使えるときの select。
 * ポップアップまで自前で描けるので、重ねる ChevronDown も appearance-none も要らない
 * —— むしろ appearance-none は base-select を打ち消すので入れてはいけない。
 * 実際の見た目は index.css の `@supports (appearance: base-select)` ブロックが持つ。
 */
export const customizableSelect = `${selectBase} pr-3`;

// 見出し行に添える chip 型の select。入力欄ではなく「ここを埋める材料を選ぶ」操作
// なので、フルワイドの枠付きフィールドにはしない。丸いピルにして一段引かせる。
//
// 幅は中身ではなく外側の枠が決める (w-full)。選んだプリセット名の長さでチップが
// 伸び縮みすると、見出し行に収まらなくなった瞬間に折り返して行数が変わり、
// 選択のたびにレイアウトが跳ねる。溢れた名前は省略記号に落とす。
const chipBase =
  'flex w-full min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-3 ' +
  'text-sm text-fg-muted transition-colors hover:bg-sunken hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export const nativeSelectChip = `${chipBase} appearance-none pr-8`;
export const customizableSelectChip = `${chipBase} pr-3`;

/** ネイティブ select に重ねる ChevronDown 用。pointer-events-none が無いとクリックを食う。 */
export const selectChevron =
  'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle';

/** グループを持たない単独の見出しラベル (保存名の入力欄など)。 */
export const sectionHeading = 'mb-3 flex items-center gap-2 text-sm font-semibold text-fg';

/** sectionHeading に添えるアイコン。 */
export const sectionHeadingIcon = 'h-4 w-4 shrink-0 text-accent';

/** グループの中に置くフィールドラベル。見出しと張り合わないよう一段弱くする。 */
export const fieldLabel = 'mb-1 block text-sm font-medium text-fg-muted';
