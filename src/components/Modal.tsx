import { useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useDialogLayer } from '../hooks/useDialogLayer'
import { btnGhost, btnIcon } from '../styles'

// 退場を待ってよいか。動きを減らす設定では index.css が transition: none にするので、
// transitionend が発火しない —— 待つと消えかけのノードが DOM に残り続ける。
// CSS の 160ms を JS 側にも書いてタイマーで保険を掛ける手は採らない。発火しない条件が
// これ 1 つに特定できている以上、二重管理を作るより条件そのものを見るほうが正確。
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [isExiting, setIsExiting] = useState(false)

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    // 閉じ始めたら退場へ。退場の途中で開き直されたら (!isOpen が false) 打ち切る。
    setIsExiting(!isOpen && !prefersReducedMotion())
  }

  if (!isOpen && !isExiting) return null

  return (
    <div
      style={{ zIndex }}
      // 退場中は誰にも触らせない。消えかけの scrim がクリックを拾うと、閉じた直後の
      // 一押しが下の要素ではなく onClose に吸われる。読み上げからも外す。
      // zIndex は useDialogLayer の depth が最後の値のまま残るので、重なっていた
      // 1 枚は下の 1 枚の上で消えていく。
      className={`modal-motion fixed inset-0 flex items-center justify-center bg-scrim p-4 ${
        isOpen ? '' : 'pointer-events-none'
      }`}
      data-state={isOpen ? 'open' : 'closed'}
      aria-hidden={!isOpen}
      inert={!isOpen}
      onClick={onClose}
      onTransitionEnd={(event) => {
        // 中身のボタンは transition-colors を持っている (styles.ts)。自分自身の
        // opacity 以外は退場の合図ではない。
        if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return
        if (!isOpen) setIsExiting(false)
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
