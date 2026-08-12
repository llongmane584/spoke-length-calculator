import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useDialogLayer } from '../hooks/useDialogLayer'
import { btnGhost, btnIcon } from '../styles'

// 退場を待ってよいか。動きを減らす設定では index.css が transition: none にするので、
// transitionend が発火しない —— 待つと消えかけのノードが DOM に残り続ける。
// CSS の 160ms を JS 側にも書いてタイマーで保険を掛ける手は採らない。二重管理を作るより
// 発火しない条件そのものを見るほうが正確 —— ただし「条件は 1 つ」ではない (#131)。
// 下の 2 つがあり、ここが見るのは 1 つ目:
//   1. reduced-motion —— transition ごと無いので変化が起きない
//   2. 起点と終点が同値で transition が始まらない —— 'entering' のまま閉じる経路。
//      下の phase の分岐が受け持つ
// 入場が CSS アニメーションだった間は 3 つ目 (アニメーションが opacity を握っていて
// 退場の transition が始まらない) があり、そこが #131 だった。入場も transition へ
// 戻したので条件ごと消えている。
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 描画上の段階。呼び出し側の意思 (isOpen) とは別に、CSS へ渡す見た目の状態を持つ。
 * 入場と退場を 1 つの状態機械にまとめるためのもので、どちらの向きも transition 1 本で
 * 動く —— 途中で向きが変われば、その場の opacity から折り返す。
 *
 * - null … DOM に居ない
 * - 'entering' … マウント直後の 1 度だけ描く起点 (opacity 0)。次のコミットで 'open' へ
 * - 'open' … 開いている / 開きに向かっている
 * - 'exiting' … 閉じに向かっている。transitionend で null へ落ちる
 */
type Phase = 'entering' | 'open' | 'exiting'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** 下端に固定する操作列。省略すると footer 自体を描かない。 */
  footer?: ReactNode
  /** ダイアログの最大幅。 */
  widthClass?: string
  /** 操作列の寄せ。道具立てを並べるだけの列は 'start'。 */
  footerAlign?: 'start' | 'end'
  /** 見出し行の × を出すか。去就を footer のボタンで決めるものは false。 */
  showClose?: boolean
  /** 操作列の上の区切り線を出すか。中身が既に枠を持っていて二重線になるものは false。 */
  showFooterDivider?: boolean
  /** 開いた直後にフォーカスする要素。省略時は × ボタン、それも無ければ本体。 */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** 中身の説明文の id。渡すと aria-describedby でダイアログに結び付ける。 */
  descriptionId?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClass = 'max-w-lg',
  footerAlign = 'end',
  showClose = true,
  showFooterDivider = true,
  initialFocusRef,
  descriptionId,
}: ModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // 入場の起点を確定させるために読む。dialogRef は中のパネル用なので流用しない ——
  // opacity を持つのは一番外の scrim。
  const scrimRef = useRef<HTMLDivElement>(null)
  // 落としどころの既定は見出しの ×。showClose が false のときは current が null なので、
  // フックがそのまま本体へ落とす。
  // 選ぶのは ref オブジェクトであって .current ではない —— 渡した ref の中身が null でも
  // × には戻らず本体へ落ちる。現在の呼び出し側は × を出さないときだけ null になるので
  // 差は出ないが、null になり得る ref を渡すときはここを踏まえること。
  const { dialogRef, zIndex } = useDialogLayer(isOpen, onClose, initialFocusRef ?? closeButtonRef)

  // 閉じた瞬間に消すとフェードアウトを描く相手が居なくなるので、退場のあいだだけ
  // 自分の判断で DOM に残る。呼び出し側は 5 つとも常時この JSX を置いて isOpen で
  // 制御しているので (CalculatorPage.tsx)、遅らせても親の契約は変わらない。
  //
  // ドロワーのように常時マウントはしない —— children が居座り、JSON の textarea や
  // 比較の選択、保存ダイアログの入力が閉じても生き続ける。ドロワーがそれで済むのは
  // 中身が静的なリンク列だから。
  //
  // レンダリング中に state を直すのは React の「props の変化に合わせて state を調整する」
  // 形。effect を挟まないので StrictMode の二度がけでも辻褄が合う。
  //
  // 初期値を 'open' にしないのは HelpModal のため。あちらは一度も開いていない間 null を
  // 返すので、初回だけ Modal が isOpen=true でマウントされる —— ここで起点を飛ばすと
  // その 1 回だけ入場フェードが出ない。
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [phase, setPhase] = useState<Phase | null>(isOpen ? 'entering' : null)

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      // 退場の途中で開き直したときは既に描かれている。起点は要らず、その場から 1 へ折り返す。
      setPhase(phase === null ? 'entering' : 'open')
    } else {
      // 'entering' のまま閉じられたら動かす差が無く、transitionend も来ないので即落とす。
      setPhase(phase === 'open' && !prefersReducedMotion() ? 'exiting' : null)
    }
  }

  // 起点を描いた次のコミットで開きへ返す。paint の前に走るので、opacity 0 の 1 フレームが
  // 画面に出ることはない。
  useLayoutEffect(() => {
    if (phase !== 'entering') return
    // 読むこと自体が仕事。マウントと data-state の変更が 1 度のスタイル計算にまとまると
    // 起点が生まれず、transition が始まらないまま opacity 1 でいきなり出る。
    // @starting-style は使えない —— WebKit には「後から DOM に追加された要素には効かない」
    // 穴があり (mdn/browser-compat-data#25643)、開くたびにマウントするここは真正面から当たる。
    scrimRef.current?.getBoundingClientRect()
    setPhase('open')
  }, [phase])

  if (phase === null) return null

  return (
    <div
      ref={scrimRef}
      style={{ zIndex }}
      // 退場中は誰にも触らせない。消えかけの scrim がクリックを拾うと、閉じた直後の
      // 一押しが下の要素ではなく onClose に吸われる。読み上げからも外す。
      // zIndex は useDialogLayer の depth が最後の値のまま残るので、重なっていた
      // 1 枚は下の 1 枚の上で消えていく。
      className={`modal-motion fixed inset-0 flex items-center justify-center bg-scrim p-4 ${
        isOpen ? '' : 'pointer-events-none'
      }`}
      // data-state だけが phase を見る。aria-hidden / inert / pointer-events は isOpen の
      // ままにする —— 'entering' の 1 フレームで inert になると、useDialogLayer が入れる
      // 初期フォーカスが弾かれる。
      data-state={phase === 'open' ? 'open' : 'closed'}
      aria-hidden={!isOpen}
      inert={!isOpen}
      onClick={onClose}
      onTransitionEnd={(event) => {
        // 中身のボタンは transition-colors を持っている (styles.ts)。自分自身の
        // opacity 以外は退場の合図ではない。
        if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return
        if (phase === 'exiting') setPhase(null)
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`flex max-h-[90vh] w-full ${widthClass} flex-col rounded-xl border border-line bg-surface shadow-lg focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
          <h2 id={titleId} className="text-lg font-semibold text-fg sm:text-xl">
            {title}
          </h2>
          {showClose && (
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label={t('buttons.close')}
              className={`${btnGhost} -mt-1 -mr-2`}
            >
              <X className={btnIcon} aria-hidden="true" />
            </button>
          )}
        </div>
        {/* 中身がはみ出すぶんはここが送る。flex-col なのは JSON の textarea のように
            flex-1 で残りを埋めたい子がいるため */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
        {/* 操作列。縦積みにはしない —— 削除確認のように破壊的動作を含む列で順序が
            反転すると、以前は右端にあったボタンが親指の下に来る。
            入りきらないぶんは折り返して右へ寄せる。
            既定が右寄せなのは去就を決めるボタンを親指側に置くため。中身に対する
            道具立てを並べるだけの列 (JSON 出力のコピー/ダウンロード) は左に寄せる。
            線を伏せたときは上 padding も落とす —— 本文側が pb-5 を持っているので、
            線だけ消すと 2 つぶんの padding が積まれた死んだ帯が残る */}
        {footer !== undefined && (
          <div
            className={`flex flex-wrap items-center gap-3 p-5 sm:p-6 ${
              showFooterDivider ? 'border-t border-line' : 'pt-0 sm:pt-0'
            } ${footerAlign === 'start' ? 'justify-start' : 'justify-end'}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
