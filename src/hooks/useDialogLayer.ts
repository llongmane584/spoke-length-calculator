import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

// 画面を覆うもの (ダイアログ / ドロワー) が共通で要る作法。Modal.tsx から出したもので、
// 新しい規則は足していない —— メニューのドロワーは Modal と形が違う (右寄せ・全高) ので
// 見た目は共有できないが、下の 4 つを 3 度目に書き写すのは避けたかった。
//
// - 重ね順 … 後から開いたものを上に出す。DOM の並び順に賭けない —— 並びは JSX の
//   都合で変わるが、どちらが上かは「どちらを後に開いたか」で決まるべきもの。
// - Escape … 一番上の 1 枚だけが閉じる。document の keydown は登録順に走るので、
//   自分が最前面かを見ないと、下に隠れている 1 枚まで一緒に閉じてしまう。
// - Tab … 開いている間はフォーカスを中に閉じる。
// - 初期フォーカス … 開いた直後に中の要素へ移す。
//
// 実体は開いている間だけ積まれる token の配列。閉じるときに自分のぶんだけ抜く。
const openDialogs: symbol[] = [];

const BASE_Z = 50;
const Z_STEP = 10;

interface DialogLayer {
  /** 覆う本体に付ける ref。Tab の輪もフォーカスの落としどころもこの中で決まる。 */
  dialogRef: RefObject<HTMLDivElement | null>;
  /** 一番外側の要素に style で渡す重ね順。 */
  zIndex: number;
}

/**
 * @param isOpen 開いているか。閉じている間は何も登録しない。
 * @param onClose Escape で呼ぶもの。毎レンダリングで別の関数を渡してよい ——
 *   下の ref 経由で読むので、識別子が変わっても登録はやり直さない。
 * @param initialFocusRef 開いた直後にフォーカスする要素。空のときは本体へ移す。
 */
export const useDialogLayer = (
  isOpen: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
): DialogLayer => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [depth, setDepth] = useState(0);

  // Escape が呼ぶものは「そのとき最新の onClose」であって、効果が依存する値ではない。
  // deps に置くと呼び出し側にメモ化を強いる上に、親が再レンダリングするたびに
  // 購読を張り直して初期フォーカスまでやり直す。ref に載せて依存から外す
  // (React の "Separating Events from Effects" が言う非 reactive な値)。
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // 重ね順の登録と Escape / Tab の購読。同じ token を見るので 1 つの効果にまとめる。
  //
  // useLayoutEffect なのは zIndex が下の depth から決まるため。paint 後に走る
  // useEffect だと、2 枚目が開いた最初の 1 フレームだけ depth 0 (= 1 枚目と同じ
  // z-index) で描かれ、勝敗が DOM の並び順に落ちる —— 冒頭で賭けないと書いたもの。
  useLayoutEffect(() => {
    if (!isOpen) return;

    const token = Symbol('dialog');
    openDialogs.push(token);
    setDepth(openDialogs.length - 1);

    const handleKeyDown = (event: KeyboardEvent) => {
      // 最前面でなければ何もしない。下の 1 枚が上の 1 枚の代わりに反応しないため
      if (openDialogs[openDialogs.length - 1] !== token) return;

      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || dialogRef.current === null) return;

      // disabled を除くのが要点。保存ボタンは結果が無い間 disabled なので、
      // 含めると Tab が「フォーカスできない要素」へ送られて輪が途切れる
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      openDialogs.splice(openDialogs.indexOf(token), 1);
    };
  }, [isOpen]);

  // フォーカスの出入り。開いた瞬間に中へ移し、閉じたら開く前の場所へ返す。
  // 上と分けてあるのは、購読の張り直しに引きずられて、利用者が中で選んだ場所から
  // フォーカスを奪い返さないため。
  useEffect(() => {
    if (!isOpen) return;

    // 返す先として意味があるものだけ覚える。
    // body を覚えないのが要点 —— body.focus() は「どこも選んでいない状態」に戻す
    // 呼び出しなので、覚えて返すと自分が今入れたフォーカスを剥がすことになる。
    // StrictMode の二度がけ (setup → cleanup → setup) では、それで剥がれた状態を
    // 2 度目の setup が「前の場所」として覚え直し、開いた瞬間の行き先が消える。
    // 自分の中の要素も覚えない —— 閉じるときには外れているので返す先にならない。
    const active = document.activeElement;
    const previouslyFocused =
      active instanceof HTMLElement &&
      active !== document.body &&
      dialogRef.current?.contains(active) !== true
        ? active
        : null;

    const focusTarget = initialFocusRef?.current ?? dialogRef.current;
    // 開いた直後のパネルは transform 中なので、ブラウザにクリップ領域を
    // 自動スクロールさせると、スライド位置と競合して停止位置がずれる。
    focusTarget?.focus({ preventScroll: true });

    return () => {
      // 返さないと行き先が body になり、続きの Tab がページの先頭からやり直しになる。
      // 重なっている 1 枚を閉じたときは下の 1 枚の中へ戻るので、輪も途切れない。
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [isOpen, initialFocusRef]);

  return { dialogRef, zIndex: BASE_Z + depth * Z_STEP };
};
