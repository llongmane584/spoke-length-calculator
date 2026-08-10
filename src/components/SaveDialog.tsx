import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { InitialDataAlert } from './InitialDataAlert'
import { btnGhost, btnPrimary } from '../styles'

/**
 * 一覧に出すのに必要なぶんだけ。App の SavedCalculation はこれを満たす上位互換で、
 * 保存の中身 (inputs) はこのダイアログには要らない。
 */
export interface SavedCalculationItem {
  id: number
  name: string
  timestamp: string
  results: { left: number; right: number }
}

interface SaveDialogProps {
  isOpen: boolean
  onClose: () => void
  name: string
  onNameChange: (name: string) => void
  onSave: () => void
  savedCalculations: SavedCalculationItem[]
  /** 起動時に保存データを読み切れなかったときだけ渡す。 */
  loadFailure?: 'warning' | 'error'
  onLoad: (id: number) => void
  onDelete: (id: number) => void
  leftLabel: string
  rightLabel: string
}

const formatLength = (value: number | null): string =>
  value !== null ? `${value.toFixed(1)}mm` : '-'

/**
 * 保存に関する全機能をここに集約する (#102)。計算名を付けて保存することと、
 * 保存済みを読み込む・削除することは同じ引き出しの中身なので、常設の区画を
 * 2 つに分けず 1 枚のダイアログにまとめている。
 */
export const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  onClose,
  name,
  onNameChange,
  onSave,
  savedCalculations,
  loadFailure,
  onLoad,
  onDelete,
  leftLabel,
  rightLabel,
}) => {
  const { t } = useTranslation()
  const nameInputRef = useRef<HTMLInputElement>(null)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('dialog.save.title')}
      widthClass="max-w-lg"
      initialFocusRef={nameInputRef}
    >
      <div className="space-y-6">
        {/* form にしておくと、名前を打った流れのまま Enter で保存できる */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
          className="space-y-3"
        >
          <div>
            <label htmlFor="calculationName" className="mb-1 block text-sm font-medium text-fg-muted">
              {t('results.calculationName')}
            </label>
            <input
              ref={nameInputRef}
              id="calculationName"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t('results.namePlaceholder')}
              className="w-full min-h-11 rounded-md border border-line-strong bg-surface px-3 py-2 text-fg transition-colors placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            {t('buttons.save')}
          </button>
        </form>

        <div className="space-y-3 border-t border-line pt-5">
          <h3 className="text-base font-semibold text-fg">{t('results.savedCalculations')}</h3>

          {loadFailure !== undefined && (
            <InitialDataAlert message={t('alerts.savedDataLoadFailed')} severity={loadFailure} />
          )}

          {savedCalculations.length === 0 ? (
            <p className="py-2 text-sm text-fg-subtle">{t('dialog.save.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {savedCalculations.map((calc) => (
                <li
                  key={calc.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{calc.name}</p>
                    <p className="text-xs tabular-nums text-fg-subtle">{calc.timestamp}</p>
                    <p className="text-sm tabular-nums text-fg-muted">
                      {leftLabel}: {formatLength(calc.results.left)} / {rightLabel}: {formatLength(calc.results.right)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onLoad(calc.id)}
                      className={`${btnGhost} text-sm text-accent-ink hover:text-accent`}
                    >
                      {t('buttons.load')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(calc.id)}
                      aria-label={t('dialog.confirm')}
                      className={`${btnGhost} text-danger-ink hover:text-danger`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
