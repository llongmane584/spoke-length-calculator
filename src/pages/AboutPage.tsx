import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/PageShell'

export function AboutPage() {
  const { t } = useTranslation()

  return (
    <PageShell title={t('pages.about.title')}>
      {/* 段落の切れ目は本文中の \n\n。input.help.*.description と同じ持ち方 */}
      <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
        {t('pages.about.body')}
      </p>
    </PageShell>
  )
}
