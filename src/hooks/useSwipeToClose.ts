import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

// 画面の左右の端から、この幅ぶんは受け取らない。
//
// ドロワーは右から出るので、閉じる向きは右向き —— iOS Safari の戻るジェスチャーと
// Android のジェスチャーナビ (戻る) が左端から始める向きと同じもの。狭い画面では
// パネルが全幅なので「パネルの左端」がそのまま「画面の左端」になり、素直に実装すると
// OS と取り合いになる。
//
// 取り合いに勝とうとはしない。OS が先にタッチを持っていく領域では最初から降りる ——
// 端から始めたスワイプは今までどおり「戻る」で、そこから少し内側に入れば閉じる操作になる。
// 32px は Android のジェスチャー領域 (既定 20dp、設定で 40dp 前後まで広がる) と
// iOS の認識域 (20pt 前後) の両方を覆う値。
const EDGE_GUARD_PX = 32;

// 向きが決まったと見なす移動量。これ未満のうちは縦か横か判じない
const SLOP_PX = 8;

// パネル幅に対して、ここまで引いたら離した時点で閉じる
const CLOSE_RATIO = 0.25;

// 浅くても速く投げたら閉じる (px/ms)
const CLOSE_VELOCITY = 0.5;

// 最後に動いてからこれ以上経っていたら、指は止まっていたと見て速度を 0 に落とす。
// 引っ張ったまま迷って離したときに、途中の勢いで閉じてしまわないため
const STALE_MS = 100;

type Axis = 'pending' | 'x';

interface SwipeHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * ドロワーのパネルを、開いてきた向きの逆 (右) へスワイプして閉じる。
 *
 * 動かすのは開閉と同じ `translateX` 1 本だけ。指の位置をそのまま transform に
 * 書き写すので、AGENTS.md「ドロワーのモーション再発防止」が禁じる scale / opacity /
 * overshoot は入り込まない。左へは引かない —— 開いた位置より奥に行き先が無い。
 *
 * 値は state に入れず DOM へ直接書く。state だと指の 1 フレームごとに React が走る
 * (useDockMorph.ts と同じ理由)。
 *
 * 受けるのはタッチとペンだけ。マウスは見ない —— デスクトップのクリックやテキスト選択に
 * 一切触れないため。
 *
 * 横のジェスチャーをブラウザに渡さないための `touch-action` は CSS 側が持つ
 * (`src/index.css` の `.drawer-panel-motion, .drawer-panel-motion *`)。片方だけでは
 * 成立しない —— あれが無いと Chromium が横スワイプをオーバースクロール操作として
 * 横取りし、ここのドラッグは pointercancel で切られる。
 *
 * @param panelRef 動かすパネル。`.drawer-panel-motion` が付いている要素
 * @param isOpen 開いているか。閉じている間は何も受けない
 * @param onClose 閉じきると判定したときに呼ぶもの
 */
export const useSwipeToClose = (
  panelRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
): SwipeHandlers => {
  // 追っているポインタ。null は「誰も追っていない」
  const pointerIdRef = useRef<number | null>(null);
  const axisRef = useRef<Axis>('pending');
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);

  // useDialogLayer と同じ理由で ref 経由。閉じる先は「そのとき最新の onClose」であって、
  // ハンドラを作り直す理由ではない
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // 掴んだ跡を消して CSS へ返す。閉じるときも戻すときも通る道
  const release = useCallback((): void => {
    pointerIdRef.current = null;
    axisRef.current = 'pending';

    const panel = panelRef.current;

    if (panel === null) return;

    panel.removeAttribute('data-dragging');
    panel.style.transform = '';
  }, [panelRef]);

  // 掴んだままドロワーが外から閉じられたとき (Escape / リンク遷移) の掃除。
  // インラインの transform を残すと、次に開いたときに途中の位置から出てくる
  useEffect(() => {
    if (isOpen) return;

    release();
  }, [isOpen, release]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    if (!isOpen || pointerIdRef.current !== null) return;
    if (event.pointerType === 'mouse' || !event.isPrimary) return;

    // OS のエッジジェスチャーとは競わない (冒頭の EDGE_GUARD_PX を参照)
    if (event.clientX < EDGE_GUARD_PX || event.clientX > window.innerWidth - EDGE_GUARD_PX) {
      return;
    }

    // 言語切替の select はポップアップを開くのが仕事で、そこは dismissOpenPicker の担当。
    // 掴むと選べなくなる
    if (event.target instanceof Element && event.target.closest('select') !== null) return;

    pointerIdRef.current = event.pointerId;
    axisRef.current = 'pending';
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    lastXRef.current = event.clientX;
    lastTimeRef.current = event.timeStamp;
    velocityRef.current = 0;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.pointerId !== pointerIdRef.current) return;

    const panel = panelRef.current;

    if (panel === null) return;

    if (axisRef.current === 'pending') {
      const rawX = event.clientX - startXRef.current;
      const rawY = event.clientY - startYRef.current;

      if (Math.abs(rawX) < SLOP_PX && Math.abs(rawY) < SLOP_PX) return;

      // 縦が勝ったら、このポインタは以後見ない。メニューの列は縦に送るものなので、
      // 迷ったときはスクロールに譲る (同値も縦扱い)
      if (Math.abs(rawY) >= Math.abs(rawX)) {
        pointerIdRef.current = null;
        return;
      }

      axisRef.current = 'x';
      // 判定に使った slop のぶん起点を引き直す。そのままだと掴んだ瞬間にパネルが
      // SLOP_PX ぶん飛ぶ
      startXRef.current = event.clientX;
      // 掴む。以後 pointerup / pointercancel は指が枠の外へ出ても必ずここへ来る
      panel.setPointerCapture(event.pointerId);
      panel.dataset.dragging = 'true';
    }

    const elapsed = event.timeStamp - lastTimeRef.current;

    if (elapsed > 0) {
      velocityRef.current = (event.clientX - lastXRef.current) / elapsed;
      lastXRef.current = event.clientX;
      lastTimeRef.current = event.timeStamp;
    }

    panel.style.transform = `translateX(${Math.max(0, event.clientX - startXRef.current)}px)`;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.pointerId !== pointerIdRef.current) return;

    const panel = panelRef.current;

    if (axisRef.current !== 'x' || panel === null) {
      release();
      return;
    }

    const distance = Math.max(0, event.clientX - startXRef.current);
    // しきい値の分母。レイアウトを読むのはここだけ
    const width = panel.offsetWidth;
    const velocity = event.timeStamp - lastTimeRef.current > STALE_MS ? 0 : velocityRef.current;
    const shouldClose = distance > width * CLOSE_RATIO || velocity > CLOSE_VELOCITY;

    // 閉じるほうを先に伝える。この時点ではインラインの transform がまだ効いている
    // (インラインはクラスより強い) ので、data-state が closed に変わっても見た目は動かない。
    // その後に release() でインラインを外すと、指を離した位置から閉じた位置までが
    // transition 1 本で繋がる —— 先に外すと 0 へ向かう遷移を張ってから閉じることになる。
    if (shouldClose) onCloseRef.current();

    release();
  };

  // OS にジェスチャーを持っていかれた / 指が 2 本になった等。閉じずに元の位置へ戻す。
  // デッドゾーンをすり抜けて始まったスワイプの受け皿でもある
  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.pointerId !== pointerIdRef.current) return;

    release();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
};
