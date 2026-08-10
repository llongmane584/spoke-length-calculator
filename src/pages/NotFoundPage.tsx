import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/PageShell'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <PageShell title={t('pages.notFound.title')}>
      <p className="text-sm leading-relaxed text-fg-muted">{t('pages.notFound.body')}</p>
    </PageShell>
  )
}
