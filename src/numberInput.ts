// 数値入力欄の純ロジック。Vite 非依存に保って node --test から読めるようにしてある
// (rimOffset.ts / shareLink.ts と同じ)。DOM も React も触らない。
//
// 数値欄はどれも下限が 0 以上なので、符号は扱わない —— マイナスは濾過で落とす。

const FULLWIDTH_ZERO = 0xff10;
const FULLWIDTH_NINE = 0xff19;
const HALFWIDTH_ZERO = 0x30;

/**
 * 1 文字を半角に寄せる。寄せ先を持たない文字はそのまま返す。
 *
 * type="number" をやめたことで、この欄でも日本語 IME が起動しうるようになった。
 * 全角で "２．５" と打たれても捨てずに拾う。IME が "." のキーに割り当てる字は
 * 全角ピリオド (．) と句点 (。) の 2 通りあるので、どちらも小数点として受ける。
 */
const toHalfWidth = (char: string): string => {
  const code = char.codePointAt(0);

  if (code !== undefined && code >= FULLWIDTH_ZERO && code <= FULLWIDTH_NINE) {
    return String.fromCharCode(code - FULLWIDTH_ZERO + HALFWIDTH_ZERO);
  }

  if (char === '．' || char === '。') {
    return '.';
  }

  return char;
};

/**
 * 入力文字列を数値欄が受けられる形に濾過する。
 *
 * 変更を丸ごと拒否するのではなく、不要な字を落とすだけにしてある —— 制御コンポーネントで
 * 変更を拒否すると、React が前回の値を書き戻した拍子にキャレットが末尾へ飛ぶ。
 *
 * 入力途中の "." や "2." は通す。ここで弾くと小数を打ち切れない。数値として妥当かどうかは
 * CalculatorPage の parseNumericField が別に見ている。
 */
export const sanitizeNumericText = (raw: string): string => {
  let sanitized = '';
  let hasDecimalPoint = false;

  for (const char of raw) {
    const halfWidth = toHalfWidth(char);

    if (halfWidth >= '0' && halfWidth <= '9') {
      sanitized += halfWidth;
      continue;
    }

    if (halfWidth === '.' && !hasDecimalPoint) {
      hasDecimalPoint = true;
      sanitized += '.';
    }
  }

  return sanitized;
};

/** step の刻みから小数桁数を得る。0.1 なら 1、1 なら 0。 */
const decimalPlacesOf = (step: number): number => {
  const text = String(step);
  const point = text.indexOf('.');

  return point === -1 ? 0 : text.length - point - 1;
};

const clamp = (value: number, min?: number, max?: number): number => {
  if (min !== undefined && value < min) {
    return min;
  }

  if (max !== undefined && value > max) {
    return max;
  }

  return value;
};

export interface NumericStepOptions {
  step: number;
  min?: number;
  max?: number;
}

/**
 * 表示中の文字列を 1 段ぶん増減した文字列を返す。矢印キーとステッパーの両方から使う。
 *
 * type="number" のときブラウザが持っていた増減を自前で持ち直すもの。
 */
export const stepNumericText = (
  current: string,
  direction: 1 | -1,
  { step, min, max }: NumericStepOptions,
): string => {
  const parsed = Number.parseFloat(current);

  // 空欄や入力途中 (".") からの増減は下限 (無ければ 0) へ着地させる。そこから更に
  // 1 段動かしても、下限を割ったぶんはクランプで戻って同じ値になる。
  if (!Number.isFinite(parsed)) {
    return formatNumericText(String(clamp(min ?? 0, min, max)), step);
  }

  // 刻みの格子には寄せない。1 刻みの欄も小数を受ける (フランジ距離 22.6 など) ので、
  // 格子へ丸めると + を 1 回押しただけで 22.6 が 23 になり、− で戻しても 22 にしか
  // ならない。押した回数ぶんだけ足し引きすれば往復で必ず元の値へ帰ってくる。
  //
  // 桁を落とすのは浮動小数の誤差を消すため (2.4 + 0.1 は 2.5000000000000004)。
  const next = Number((parsed + direction * step).toFixed(9));

  return formatNumericText(String(clamp(next, min, max)), step);
};

/**
 * その向きへまだ動かせるか。ステッパーの disabled に使う。
 *
 * 空欄からは下限へ着地させたいので、どちらの向きにも動かせる扱いにする。
 */
export const canStepNumericText = (
  current: string,
  direction: 1 | -1,
  { min, max }: NumericStepOptions,
): boolean => {
  const parsed = Number.parseFloat(current);

  if (!Number.isFinite(parsed)) {
    return true;
  }

  return direction === 1
    ? max === undefined || parsed < max
    : min === undefined || parsed > min;
};

/**
 * 欄を離れたときの桁揃え。0.1 刻みの欄を 1 桁に揃える (2 → 2.0)。
 *
 * 刻みが整数の欄は触らない。1 刻みだからといって整数しか入らないわけではなく、
 * フランジ距離や PCD は 22.6 のような値を普通に取る (decimalPattern はどの欄でも
 * 小数を通す)。step の桁で丸めると、欄を離れるたびに入力した精度が削られる。
 *
 * 数値として読めない文字列 ("" や "." など) も触らない —— 空欄は空欄のまま
 * 「未入力」としてバリデーションへ渡したい。
 */
export const formatNumericText = (current: string, step: number): string => {
  const decimals = decimalPlacesOf(step);

  if (decimals === 0) {
    return current;
  }

  const parsed = Number.parseFloat(current);

  if (!Number.isFinite(parsed)) {
    return current;
  }

  return parsed.toFixed(decimals);
};
