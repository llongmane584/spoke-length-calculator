import { useEffect, useState, type RefObject } from 'react';

/**
 * 要素がビューポートに少しでも掛かっているかを返す。
 *
 * スクロール量ではなく交差状態で判定するので、ヘッダー高さのような
 * レイアウト定数を呼び出し側が抱えずに済む。
 *
 * 初期値は true —— observer の初回コールバックが届く前に呼び出し側が
 * 「見えていない」と誤判定して、一瞬だけ要素を出してしまうのを防ぐ。
 */
export const useIsVisible = (ref: RefObject<Element | null>): boolean => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
};
