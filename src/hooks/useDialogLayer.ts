import { useEffect, useRef, useState, type RefObject } from 'react';

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
 * @param onClose Escape で呼ぶもの。呼び出し側で useCallback しておくと、
 *   毎レンダリングで登録し直さずに済む。
 * @param initialFocusRef 開いた直後にフォーカスする要素。空のときは本体へ移す。
 */
export const useDialogLayer = (
  isOpen: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
): DialogLayer => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const token = Symbol('dialog');
    openDialogs.push(token);
    setDepth(openDialogs.length - 1);

    const focusTarget = initialFocusRef?.current ?? dialogRef.current;
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      // 最前面でなければ何もしない。下の 1 枚が上の 1 枚の代わりに反応しないため
      if (openDialogs[openDialogs.length - 1] !== token) return;

      if (event.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose, initialFocusRef]);

  return { dialogRef, zIndex: BASE_Z + depth * Z_STEP };
};
