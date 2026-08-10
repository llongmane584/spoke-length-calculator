import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, FileJson, FileUp, Save, Share2 } from 'lucide-react'
import { btnAction } from '../styles'

interface ActionBarProps {
  onShare: () => void
  onSave: () => void
  onExportJson: () => void
  onImportJson: () => void
  onCompare: () => void
  /** 有効な計算結果があるか。共有・JSON 出力はこれが false の間押せない。 */
  hasResults: boolean
  savedCount: number
}

/**
 * 計算結果の帯の直下に置く操作列。共有・保存・JSON 出力・JSON 入力・比較を
 * 1 行に収め、実際の入力欄や一覧はそれぞれのダイアログが持つ (#102)。
 *
 * 5 等分の grid。狭い画面ではアイコンだけになるが、ラベルは消さず sr-only で
 * 残すので読み上げ名は常にラベルそのもの。
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  onShare,
  onSave,
  onExportJson,
  onImportJson,
  onCompare,
  hasResults,
  savedCount,
}) => {
  const { t } = useTranslation()

  // 結果が無くて押せないボタンには、押せない理由を title で添える。
  // アイコンだけの見た目では disabled の色以外に手がかりが無いため
  const unavailable = hasResults ? undefined : t('alerts.performCalculationFirst')

  // 保存ダイアログは「保存する」場所であると同時に「保存済みを読む・消す」場所でもある。
  // 開ける条件を保存できるかどうかだけで決めると、保存済みがあるのに結果が無いとき
  // —— 件数バッジは出ているのにボタンは押せない、という手の届かない状態になる (#104)
  const canOpenSave = hasResults || savedCount > 0
  const saveTitle = hasResults
    ? t('buttons.save')
    : canOpenSave
      ? t('results.savedCalculations')
      : unavailable

  return (
    <div className="grid grid-cols-5 gap-2 border-t border-line p-4 sm:p-5">
      <button
        type="button"
        onClick={onShare}
        disabled={!hasResults}
        title={unavailable ?? t('buttons.share')}
        className={btnAction}
      >
        <Share2 aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className="sr-only sm:not-sr-only">{t('buttons.share')}</span>
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={!canOpenSave}
        title={saveTitle}
        className={btnAction}
      >
        <Save aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className="sr-only sm:not-sr-only">{t('buttons.save')}</span>
        {/* 保存済みの件数。一覧はダイアログの中に入って常時は見えないので、
            「何件あるか」だけは外に出しておく。読み上げ名には混ぜない */}
        {savedCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-accent px-1 text-[10px] leading-4 tabular-nums text-on-accent"
          >
            {savedCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onExportJson}
        disabled={!hasResults}
        title={unavailable ?? t('buttons.jsonExport')}
        className={btnAction}
      >
        <FileJson aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className="sr-only sm:not-sr-only">{t('buttons.jsonExport')}</span>
      </button>

      <button
        type="button"
        onClick={onImportJson}
        title={t('buttons.jsonImport')}
        className={btnAction}
      >
        <FileUp aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className="sr-only sm:not-sr-only">{t('buttons.jsonImport')}</span>
      </button>

      <button
        type="button"
        onClick={onCompare}
        title={t('compare.toggle')}
        className={btnAction}
      >
        <ArrowLeftRight aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className="sr-only sm:not-sr-only">{t('compare.short')}</span>
      </button>
    </div>
  )
}
