import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/PageShell'

// 手順は番号ではなく名前で持つ。input.help.<topic> と同じ書き方にして、順番を
// 入れ替えても翻訳キーが動かないようにする。
const STEPS = ['input', 'result', 'save', 'share', 'manage'] as const

export function UsagePage() {
  const { t } = useTranslation()

  return (
    <PageShell title={t('pages.usage.title')}>
      <p className="text-sm leading-relaxed text-fg-muted">{t('pages.usage.intro')}</p>
      <ol className="space-y-5">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3">
            {/* 番号は ol が読み上げるので、見た目のぶんは読み上げから外す */}
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold tabular-nums text-accent-ink"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-fg">
                {t(`pages.usage.steps.${step}.title`)}
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                {t(`pages.usage.steps.${step}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </PageShell>
  )
}
