import { useTranslation } from 'react-i18next'
import { entriesForYear, newestChangelogYear } from '../changelog'
import { ChangelogEntryList, ChangelogYearNav } from '../components/ChangelogSections'
import { PageShell } from '../components/PageShell'

// すべての更新履歴。まず出すのは履歴のいちばん新しい年で、他の年は下のリンクから。
// 時計は見ない —— 年が明けてまだその年のリリースが無いとき、当年で引くと空になる。
export function ChangelogAllPage() {
  const { t } = useTranslation()
  const year = newestChangelogYear()

  return (
    <PageShell
      title={t('pages.changelog.allTitle')}
      back={{ to: '/changelog', label: t('pages.changelog.backToChangelog') }}
    >
      <p className="text-xs font-medium text-fg-subtle">{t('pages.changelog.yearTitle', { year })}</p>
      <ChangelogEntryList entries={entriesForYear(year)} />
      <ChangelogYearNav currentYear={year} />
    </PageShell>
  )
}
