import { useLayoutEffect, useState, type RefObject } from 'react';

// 量子化の刻み。連続値をそのまま state に入れるとフレームごとに再描画が走る。
// 0.05 なら値グリッド (min-h-24 = 96px) の通過全体で最大 20 回。段差は
// 呼び出し側の短い transition (duration-100) が埋める。
// 端点にきっちり落ちることも保証する —— 0.004 が残ると「見えないバーが
// visible のまま残る」状態になる (useIsVisible が閾値 1 ではなく 0.99 を
// 使っていたのと同じ罠)。
const STEP = 0.05;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const measure = (element: Element): number => {
  const rect = element.getBoundingClientRect();

  if (rect.height === 0) {
    return 0;
  }

  // レイアウトビューポートではなくビジュアルビューポートの下端を見る。
  // iOS でソフトキーボードが開くと innerHeight は変わらないので、
  // それを使うと「見えていない帯を見えている」と誤判定する。
  const viewport = window.visualViewport;
  const viewportBottom = viewport !== null && viewport !== undefined
    ? viewport.offsetTop + viewport.height
    : window.innerHeight;

  // 帯より視界が狭い異常系 (横向きの小型端末) で 0 に落ちなくなるのを防ぐ
  const span = Math.min(rect.height, viewportBottom);
  const raw = (rect.bottom - viewportBottom) / span;

  return Math.round(clamp01(raw) / STEP) * STEP;
};

/**
 * 要素が「まだ画面下端より下に食み出している量」を 0..1 で返す。
 *   1 … 完全に折り返しの下 (未到達)。0 … 全部入りきった、または上へ抜けた。
 *
 * 上へ抜けた側も 0 になるのが要点 —— 下端固定の要素は、利用者が対象を
 * 通り過ぎた後もそこに居座ると下のボタン (保存・書き出し・比較パネル等) を
 * 覆ってしまう。単純な可視判定ではこの 2 つの「0」を区別できない。
 *
 * IntersectionObserver ではなく getBoundingClientRect() で測る理由:
 *   - 交差比は方向を持たない。下から入る 0.5 と上へ抜ける 0.5 が区別できない
 *   - 閾値を刻んでも iOS の慣性スクロール中はコールバックが間引かれる (#56)
 *   - useLayoutEffect で初期値をペイント前に確定できる
 *     (読み込み直後から出しておきたい要件に効く)
 */
export const useBelowFoldProgress = (ref: RefObject<Element | null>): number => {
  const [progress, setProgress] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      setProgress(measure(element));
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

    // スクロール以外でも帯は動く: バリデーションエラー行の出現・消滅、
    // プリセット読み込み、保存済みリストの増減、フォントの遅延適用
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.documentElement);
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
  }, [ref]);

  return progress;
};
