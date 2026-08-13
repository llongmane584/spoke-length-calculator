import { useLayoutEffect, type RefObject } from 'react';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// レイアウトビューポートではなくビジュアルビューポートの下端を見る。
// iOS でソフトキーボードが開くと innerHeight は変わらないので、
// それを使うと「隠れている帯を見えている」と誤判定する。
const getViewportBottom = (): number => {
  const viewport = window.visualViewport;

  return viewport !== null && viewport !== undefined
    ? viewport.offsetTop + viewport.height
    : window.innerHeight;
};

/**
 * 画面下端にドックしている度合いを、CSS カスタムプロパティ `--dock` (0..1) として
 * `scopeRef` の要素に書き込む。
 *   1 … 帯の居場所がまだ折り返しの下 (ドック中 = 簡易表示)
 *   0 … 帯の居場所が画面内に収まった (本来の姿)
 * ドック中は `data-docked` 属性も立てる。pointer-events は数値で表せないため。
 *
 * 値を返さず DOM に直接書くのが要点。state に入れるとスクロールのフレームごとに
 * React の再描画が走る。書き込み先では補間を calc() で行うので、React が置くのは
 * 初回の style 文字列だけになり、スクロール中の再描画は 0 回になる。連続値のまま
 * 扱えるので量子化も CSS トランジションも要らず、変形はスクロールに 1:1 で追従する。
 *
 * 測るのは帯そのものではない —— 帯は position: sticky なので
 * getBoundingClientRect() が「引き上げられた後」の位置を返し、自分の位置から
 * 自分の状態を決められない。代わりに帯を挟む 2 つの要素を測る:
 *   `slotTopRef` … 帯の直前にある要素 (入力セクション)。その下端が帯の本来の上端
 *   `slotEndRef` … 帯の直後にあるスペーサー。sticky ではないので流れの中に留まり、
 *                  その下端は「帯が縮んでいなければ下端があるはずの位置」に一致する
 * スペーサーの高さは帯が縮んだぶんを埋めるので、2 つの下端の差は --dock によらず
 * 帯の本来の高さになる。
 *
 * 本来の下端を定数ではなく実測にしているのは、帯の実高が定数と食い違いうるため
 * (#155)。ブラウザの最小フォントサイズ設定は下限に引っかかる文字だけを持ち上げるし、
 * 翻訳が伸びて見出しが 2 行になれば見出しの箱も想定を超える。実測なら着地位置は
 * どちらの場合も自動的に合う。progress が 0 になる瞬間と sticky がドックを解除する
 * 瞬間 (帯の本来の下端が画面内に入る瞬間) が一致し、姿が戻りきると同時に帯が
 * 流れの中へ着地する。
 *
 * `morphRatio` は食み出し量を 0..1 に写すときの分母を、実測した本来の高さから
 * 出すための無次元比 = 変形が完了するまでのスクロール距離 / 本来の高さ。
 * 帯の高さの変化量 (本来の高さ - 簡易表示の高さ) の割合を下回ってはならない ——
 * 下回ると帯は隙間が広がるより速く縮み、変形の途中で sticky から解放されて
 * 画面下端を離れてしまう。
 */
export const useDockMorph = (
  slotTopRef: RefObject<Element | null>,
  scopeRef: RefObject<HTMLElement | null>,
  slotEndRef: RefObject<Element | null>,
  morphRatio: number,
): void => {
  useLayoutEffect(() => {
    const element = slotTopRef.current;
    const scope = scopeRef.current;
    const slotEnd = slotEndRef.current;

    if (element === null || scope === null || slotEnd === null || morphRatio <= 0) {
      return;
    }

    let frame = 0;
    let docked: boolean | null = null;

    const update = () => {
      frame = 0;

      // 帯の本来の上端と下端。差が帯の本来の高さで、そこから変形距離を出す。
      // 伏せられている間 (App の hidden) はどちらも 0 になり、morphSpan も 0 に
      // なる。ゼロ除算を避けるためだけの分岐ではなく、レイアウトを持たない間は
      // ドックしていないと決めるための分岐
      const slotTop = element.getBoundingClientRect().bottom;
      const slotBottom = slotEnd.getBoundingClientRect().bottom;
      const morphSpan = (slotBottom - slotTop) * morphRatio;
      const progress = morphSpan > 0 ? clamp01((slotBottom - getViewportBottom()) / morphSpan) : 0;

      scope.style.setProperty('--dock', progress.toFixed(4));

      // 属性の変更はセレクタの再マッチを伴うので、変わった瞬間だけ触る。
      // 解除は removeAttribute でなければならない —— [data-docked] は属性の
      // 存在で一致するので、'false' を入れると着地後もドック中の扱いが残り、
      // 帯とその下のコントロールが永久にタップできなくなる。
      const isDocked = progress > 0;

      if (isDocked !== docked) {
        docked = isDocked;

        if (isDocked) {
          scope.setAttribute('data-docked', '');
        } else {
          scope.removeAttribute('data-docked');
        }
      }
    };

    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };

    update(); // 初回だけ同期。first paint の前に確定させる

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);

    // スクロール以外でも帯の居場所は動く: バリデーションエラー行の出現・消滅、
    // プリセット読み込み、フォントの遅延適用、ブラウザの文字サイズ設定の変更。
    // 観測するのは帯より上にある slot 要素だけ —— スペーサーを観測すると、
    // --dock を書く → スペーサーが伸縮する → また発火する、の往復になる。
    // 上の要素はこちらの書き込みで動かないので、その循環が起きない。
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(element);

    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      resizeObserver.disconnect();
    };
  }, [slotTopRef, scopeRef, slotEndRef, morphRatio]);
};
