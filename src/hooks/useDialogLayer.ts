import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

// 画面を覆うもの (ダイアログ / ドロワー) が共通で要る作法。Modal.tsx から出したもので、
// 新しい規則は足していない —— メニューのドロワーは Modal と形が違う (右寄せ・全高) ので
// 見た目は共有できないが、下の 5 つを 3 度目に書き写すのは避けたかった。
//
// - 重ね順 … 後から開いたものを上に出す。DOM の並び順に賭けない —— 並びは JSX の
//   都合で変わるが、どちらが上かは「どちらを後に開いたか」で決まるべきもの。
// - Escape … 一番上の 1 枚だけが閉じる。document の keydown は登録順に走るので、
//   自分が最前面かを見ないと、下に隠れている 1 枚まで一緒に閉じてしまう。
// - Tab … 開いている間はフォーカスを中に閉じる。
// - 初期フォーカス … 開いた直後に中の要素へ移す。
// - 背景のスクロール … 覆っている間は裏のページを送らせない (下の lock)。
//
// 実体は開いている間だけ積まれる token の配列。閉じるときに自分のぶんだけ抜く。
const openDialogs: symbol[] = [];

const BASE_Z = 50;
const Z_STEP = 10;

// 背景のスクロール止め。覆っている間は裏のページを動かさない ——
// 覆うものが「見えているだけ」なら、ホイールもスワイプも裏へ素通りする。
//
// ここが受け持つのはホイール / トラックパッド / キーボード (Space・PageDown・矢印)。
// iOS のタッチは root の overflow: hidden を取りこぼすので (WebKit #153852)、そちらは
// 覆う要素自身を overscroll-behavior: contain のスクロールコンテナにして止める
// (Modal.tsx と AppDrawer.tsx の一番外側)。保険の重ね掛けではなく担当が違う。
//
// position: fixed で body を流れから外す iOS 定番の手は採らない —— レイアウトを
// 変えずに止まる overflow: hidden と違い、結果帯の position: sticky と噛み合わない。
//
// ただし overflow: hidden が止めるのは利用者の操作だけで、プログラム的なスクロールは
// 素通りする。Android のソフトキーボードはフォーカス中の入力を見せるために
// スクロール可能な祖先をすべて送るので、覆っている間にルートだけが動かされる ——
// scrim は position: fixed なので見た目は変わらず、閉じて overflow を戻した瞬間に
// ずれが出る (#160)。iOS で起きないのは、あちらのキーボードがビジュアルビューポートを
// パンするだけでルートのスクロール位置に触らないため。
// なので位置を控えて、解除するときに戻す (下の restoreScroll)。
//
// 数えるのは開いている枚数。真偽値だと、保存ダイアログの上の削除確認を閉じた時点で
// 背景が動き出す。
let lockCount = 0;
let unlock: (() => void) | null = null;

const lockBackgroundScroll = (restoreScroll: boolean): void => {
  lockCount += 1;

  if (lockCount > 1) return;

  const root = document.documentElement;
  // スクロールバーが占めていた幅。overflow: hidden で消えると、そのぶん背景が右へ
  // 広がって、開いた瞬間に裏のページ全体がずれる。重ね型のスクロールバー
  // (macOS の既定、タッチ端末) では 0 になるので、そのときは何も足さない。
  const scrollbarWidth = window.innerWidth - root.clientWidth;
  const previousOverflow = root.style.overflow;
  const previousPaddingRight = root.style.paddingRight;
  const previousScrollY = window.scrollY;

  root.style.overflow = 'hidden';

  if (scrollbarWidth > 0) {
    root.style.paddingRight = `${scrollbarWidth}px`;
  }

  unlock = () => {
    // 戻すのは overflow を戻すより先。まだ覆っているうちに動かすので、位置が飛ぶ
    // ところは誰の目にも入らない。overflow: hidden の間もプログラム的スクロールは
    // 効くので、先に戻せないということもない。
    //
    // キーボードがまだ出ていて画面が縮んでいても行き先は切り詰められない ——
    // 縮んでいる間はスクロールできる幅が広がるほうなので、控えた位置は必ずその中にある。
    if (restoreScroll && window.scrollY !== previousScrollY) {
      window.scrollTo(0, previousScrollY);
    }

    root.style.overflow = previousOverflow;
    root.style.paddingRight = previousPaddingRight;
  };
};

const unlockBackgroundScroll = (): void => {
  lockCount -= 1;

  if (lockCount > 0) return;

  unlock?.();
  unlock = null;
};

interface DialogLayerOptions {
  /**
   * 閉じるときにルートのスクロール位置を開く前へ戻すか。既定は戻す。
   *
   * リンクで遷移するもの (ドロワー) だけ false にする —— 遷移先で PageShell が
   * window.scrollTo(0, 0) を呼ぶので、戻すとその後から前のページの位置へ引き戻し、
   * 遷移先のページを途中から見せることになる。ドロワーはキーボードを呼ぶ入力欄を
   * 持たないので、そもそも戻す必要がない。
   */
  restoreScroll?: boolean;
}

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
 * @param options 既定から外すぶんだけ渡す。中身は DialogLayerOptions を参照。
 */
export const useDialogLayer = (
  isOpen: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
  { restoreScroll = true }: DialogLayerOptions = {},
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
    lockBackgroundScroll(restoreScroll);

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
      unlockBackgroundScroll();
    };
  }, [isOpen, restoreScroll]);

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
