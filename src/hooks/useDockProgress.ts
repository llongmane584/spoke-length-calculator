import { useLayoutEffect, useState, type RefObject } from 'react';

// 量子化の刻み。連続値をそのまま state に入れるとフレームごとに再描画が走る。
// 0.02 なら帯 1 つぶんの通過 (約 170px) 全体で最大 50 回。残る段差は
// 呼び出し側の短い transition が均す。
// 端点にきっちり落ちることも保証する —— 0.004 が残ると「本来の姿に戻り
// きらない帯」ができ、ドック解除の瞬間に僅かなずれとして見える。
const STEP = 0.02;

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
 * 画面下端にドックしている度合いを 0..1 で返す。
 *   1 … 帯の居場所がまだ折り返しの下 (ドック中 = 簡易表示)
 *   0 … 帯の居場所が画面内に収まった (本来の姿)
 *
 * 測るのは帯そのものではなく `slotTopRef` —— 帯は position: sticky なので
 * getBoundingClientRect() が「引き上げられた後」の位置を返し、自分の位置から
 * 自分の状態を決められない。帯の直前にある要素 (入力セクション) の下端が
 * 帯の本来の上端なので、そちらを測ると sticky の影響を受けない。
 *
 * `distance` には帯の本来の高さを渡す。これにより progress が 0 になる瞬間と
 * sticky がドックを解除する瞬間 (帯の本来の下端が画面内に入る瞬間) が一致し、
 * 姿が戻りきると同時に帯が流れの中へ着地する。
 */
export const useDockProgress = (
  slotTopRef: RefObject<Element | null>,
  distance: number,
): number => {
  const [progress, setProgress] = useState(1);

  useLayoutEffect(() => {
    const element = slotTopRef.current;

    if (element === null || distance <= 0) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;

      // 帯の本来の上端。ここから distance ぶん下が本来の下端になる
      const slotTop = element.getBoundingClientRect().bottom;
      const overflow = slotTop - getViewportBottom() + distance;

      setProgress(Math.round(clamp01(overflow / distance) / STEP) * STEP);
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
  }, [slotTopRef, distance]);

  return progress;
};
