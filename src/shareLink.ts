// 入力条件を URL fragment に載せて共有するための純粋モジュール。
//
// rimOffset.ts / partPresets.ts と同じく Vite にも DOM の状態にも依存しないので、
// node --test から素で読める。window を触るのは呼び出し側 (App.tsx) の役目。
//
// fragment (`#...`) を使うのはサーバーに何も足さないため。クエリ文字列と違って
// 静的配信でもリクエストに乗らず、既存の GitHub Pages / PWA 構成のまま動く。

/**
 * 共有 URL の形式のバージョン。
 * 項目の増減や意味の変更をしたら上げること。読み取り側は完全一致でしか受け取らない
 * ので、古いアプリが新しい形式を「たまたま読めた項目だけ」で復元する事故が起きない。
 */
export const SHARE_VERSION = '1';

const VERSION_KEY = 'v';

/**
 * 共有する入力項目。App.tsx の Inputs のキーと一致していなければならない
 * (App 側で `readonly InputField[]` として受け直すので、ずれればコンパイルエラーになる)。
 *
 * キーは短縮せず入力欄の名前そのままにしてある。URL は長くなるが、対応表という
 * 二つ目の真実を持たずに済み、共有された URL を人が読んで中身を確かめられる。
 */
export const SHARE_FIELDS = [
  'erd',
  'rimOffset',
  'pitchCircleLeft',
  'pitchCircleRight',
  'flangeDistanceLeft',
  'flangeDistanceRight',
  'spokeHoleDiameter',
  'numberOfSpokes',
  'crossingsLeft',
  'crossingsRight',
] as const;

/**
 * 入力値を fragment の中身 (先頭の `#` は含まない) にする。
 *
 * 呼び出し側は「正しい計算結果が出ている入力値」しか渡さない約束だが、それでも
 * 欠けた項目は空文字で埋めずに例外にする —— 空文字入りの URL は共有された側で
 * 必ず検証に落ちるので、壊れたリンクを黙って配ることになる。
 */
export const buildShareFragment = (values: Record<string, string>): string => {
  const params = new URLSearchParams();

  params.set(VERSION_KEY, SHARE_VERSION);

  for (const field of SHARE_FIELDS) {
    const value = values[field] as string | undefined;

    if (value === undefined) {
      throw new Error(`Cannot build a share link: missing input "${field}"`);
    }

    params.set(field, value.trim());
  }

  return params.toString();
};

/**
 * 現在の URL の fragment だけを共有用に差し替える。
 * origin / pathname / search は保持する —— base が `/spoke-length-calculator/` の
 * サブパス配信なので、組み立て直すと配置場所を二重に持つことになる。
 */
export const buildShareUrl = (currentUrl: string, values: Record<string, string>): string => {
  const url = new URL(currentUrl);

  url.hash = buildShareFragment(values);

  return url.toString();
};

/**
 * 共有 URL の fragment を入力値に戻す。読めなければ null。
 *
 * ここが返すのは「形として揃っている文字列の組」までで、値が計算に使えるかどうかは
 * 見ない —— 数値の範囲や整合性は App 側の既存の検証 (normalizeInputs /
 * getCalculationState) が一手に引き受ける。ここで独自に判定すると規則が二重になる。
 *
 * 知らないパラメータは無視する。バージョンが一致している限り、余分なものが
 * 付いていても (SNS の計測パラメータなど) 復元できたほうがよい。
 */
export const parseShareFragment = (fragment: string): Record<string, string> | null => {
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;

  if (raw === '') {
    return null;
  }

  const params = new URLSearchParams(raw);

  if (params.get(VERSION_KEY) !== SHARE_VERSION) {
    return null;
  }

  const values: Record<string, string> = {};

  for (const field of SHARE_FIELDS) {
    const value = params.get(field);

    if (value === null) {
      return null;
    }

    values[field] = value.trim();
  }

  return values;
};

/**
 * fragment が共有 URL を名乗っているか。
 * 「不正なので初期状態で起動した」と伝えるべき場面と、fragment がそもそも
 * 共有と無関係な場面 (`#` 無し、ページ内リンクなど) を区別するために使う。
 */
export const hasShareFragment = (fragment: string): boolean => {
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;

  return raw !== '' && new URLSearchParams(raw).has(VERSION_KEY);
};
