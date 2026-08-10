import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CHANGELOG } from '../changelog'
import { ChangelogEntryList } from '../components/ChangelogSections'
import { PageShell } from '../components/PageShell'
import { btnSecondary } from '../styles'

// 更新履歴の入口。直近の 1 件だけを見せて、続きは「すべての更新履歴」へ送る。
export function ChangelogPage() {
  const { t } = useTranslation()

  return (
    <PageShell title={t('pages.changelog.title')}>
      <div className="space-y-2">
        {/* 見出しにはしない —— すぐ下の v0.1.0 が h3 なので、ここに見出しを立てると
            同じ階層が 2 段続いて構造が嘘になる */}
        <p className="text-xs font-medium text-fg-subtle">{t('pages.changelog.latest')}</p>
        <ChangelogEntryList entries={CHANGELOG.slice(0, 1)} />
      </div>
      <Link to="/changelog/all" className={`${btnSecondary} w-full sm:w-auto`}>
        {t('pages.changelog.viewAll')}
      </Link>
    </PageShell>
  )
}
