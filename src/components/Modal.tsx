import { useId, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useDialogLayer } from '../hooks/useDialogLayer'
import { btnGhost, btnIcon } from '../styles'

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
}: ModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // 落としどころの既定は見出しの ×。showClose が false のときは current が null なので、
  // フックがそのまま本体へ落とす (以前ここに書いていた三段の ?? と同じ順序)。
  const { dialogRef, zIndex } = useDialogLayer(isOpen, onClose, initialFocusRef ?? closeButtonRef)

  if (!isOpen) return null

  return (
    <div
      style={{ zIndex }}
      className="fixed inset-0 flex items-center justify-center bg-scrim p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
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
