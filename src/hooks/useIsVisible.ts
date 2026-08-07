import { useEffect, useState, type RefObject } from 'react';

/**
 * 要素がビューポートに見えているかを返す。
 *
 * スクロール量ではなく交差状態で判定するので、ヘッダー高さのような
 * レイアウト定数を呼び出し側が抱えずに済む。
 *
 * 初期値は true —— observer の初回コールバックが届く前に呼び出し側が
 * 「見えていない」と誤判定して、一瞬だけ要素を出してしまうのを防ぐ。
 *
 * @param visibleRatio 「見えている」と見なす交差比の下限。既定の 0 は
 *   「少しでも掛かっていれば見えている」。要素の全体が入っていることを
 *   求めるなら 1 ではなく 0.99 のように 1 を僅かに下回る値を渡すこと ——
 *   端数のあるレイアウトでは比が 1 に届かず、閾値 1 が発火しない。
 */
export const useIsVisible = (
  ref: RefObject<Element | null>,
  visibleRatio = 0,
): boolean => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // isIntersecting も見る —— visibleRatio が 0 のとき比較だけでは常に真になる
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= visibleRatio);
      },
      // 0 も入れておく。要素が完全に外へ出る瞬間を取り逃がさないため
      { threshold: [...new Set([0, visibleRatio])] },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, visibleRatio]);

  return isVisible;
};
