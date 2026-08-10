import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { InitialDataAlert } from './InitialDataAlert'
import { btnGhost, btnIcon, btnSecondaryIcon, fieldLabel } from '../styles'

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
  /** 保存できるか (= 有効な計算結果があるか)。false の間は保存欄だけを閉ざす。 */
  canSave: boolean
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
 *
 * 開く条件は「保存できること」ではなく「保存できるか保存済みがあるか」。結果が
 * 無い状態で開いたときは保存欄だけを閉ざし、読み込み・削除はそのまま使える。
 */
export const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  onClose,
  name,
  onNameChange,
  onSave,
  canSave,
  savedCalculations,
  loadFailure,
  onLoad,
  onDelete,
  leftLabel,
  rightLabel,
}) => {
  const { t } = useTranslation()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const noResultsId = useId()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('dialog.save.title')}
      widthClass="max-w-lg"
      // 名前欄が disabled のときは Modal の既定 (× ボタン) に任せる ——
      // フォーカスできない要素を指すと開いた直後の行き先が消える
      initialFocusRef={canSave ? nameInputRef : undefined}
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
            <label htmlFor="calculationName" className={fieldLabel}>
              {t('results.calculationName')}
            </label>
            {/* 名前を書くことと保存することは一続きの動作なので 1 行に収める (#106)。
                items-* を付けないのは既定の stretch に任せるため —— 入力欄とボタンの
                高さが自動で揃う */}
            <div className="flex gap-2">
              <input
                ref={nameInputRef}
                id="calculationName"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={t('results.namePlaceholder')}
                disabled={!canSave}
                aria-describedby={canSave ? undefined : noResultsId}
                // min-w-0 が要る。input の既定の min-width は auto で、狭い画面では
                // 入力欄が縮まずボタンを枠の外へ押し出す
                className="min-w-0 flex-1 min-h-11 rounded-md border border-line-strong bg-surface px-3 py-2 text-fg transition-colors placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-subtle"
              />
              {/* ラベルは常に見えないので、ActionBar の sr-only ではなく aria-label で
                  名前を与える (Modal の × や下の削除ボタンと同じ扱い) */}
              <button
                type="submit"
                disabled={!canSave}
                aria-label={t('buttons.save')}
                title={t('buttons.save')}
                className={`${btnSecondaryIcon} shrink-0`}
              >
                <Save className={btnIcon} aria-hidden="true" />
              </button>
            </div>
          </div>
          {/* 保存できない理由はその場に出す。ボタンが淡いだけでは、なぜ押せないのかが
              分からない —— 押せてしまってトーストで断るのは一手遅い */}
          {!canSave && (
            <p id={noResultsId} className="text-sm text-fg-subtle">
              {t('alerts.performCalculationFirst')}
            </p>
          )}
        </form>

        {/* 区切り線は置かない。区画の切れ目は h3 の見出しが示しているので、
            線はもう一度同じことを言うだけ (#113)。間隔は外側の space-y-6 が持つ */}
        <div className="space-y-3">
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
                      <Trash2 className={btnIcon} aria-hidden="true" />
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
