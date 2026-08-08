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
 * 測るのは帯そのものではなく `slotTopRef` —— 帯は position: sticky なので
 * getBoundingClientRect() が「引き上げられた後」の位置を返し、自分の位置から
 * 自分の状態を決められない。帯の直前にある要素 (入力セクション) の下端が
 * 帯の本来の上端なので、そちらを測ると sticky の影響を受けない。
 *
 * `fullHeight` は帯の本来の高さ。食み出し量をこれを基準に出すので、progress が 0 に
 * なる瞬間と sticky がドックを解除する瞬間 (帯の本来の下端が画面内に入る瞬間) が一致し、
 * 姿が戻りきると同時に帯が流れの中へ着地する。
 * `morphSpan` はその食み出し量を 0..1 に写すときの分母 = 変形が完了するまでの
 * スクロール距離。fullHeight より短くすれば変形は速くなるが、帯の高さの変化量
 * (fullHeight - 簡易表示の高さ) を下回ってはならない —— 下回ると帯は隙間が広がるより
 * 速く縮み、変形の途中で sticky から解放されて画面下端を離れてしまう。
 */
export const useDockMorph = (
  slotTopRef: RefObject<Element | null>,
  scopeRef: RefObject<HTMLElement | null>,
  fullHeight: number,
  morphSpan: number,
): void => {
  useLayoutEffect(() => {
    const element = slotTopRef.current;
    const scope = scopeRef.current;

    if (element === null || scope === null || morphSpan <= 0) {
      return;
    }

    let frame = 0;
    let docked: boolean | null = null;

    const update = () => {
      frame = 0;

      // 帯の本来の上端。ここから fullHeight ぶん下が本来の下端になる
      const slotTop = element.getBoundingClientRect().bottom;
      const overflow = slotTop - getViewportBottom() + fullHeight;
      const progress = clamp01(overflow / morphSpan);

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
    // プリセット読み込み、フォントの遅延適用。
    // 観測するのは帯より上にある slot 要素だけ —— documentElement を観測すると
    // 帯自身の伸縮でも発火し、無駄な往復になる。
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
  }, [slotTopRef, scopeRef, fullHeight, morphSpan]);
};
