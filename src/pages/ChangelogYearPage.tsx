import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { entriesForYear } from '../changelog'
import { ChangelogEntryList, ChangelogYearNav } from '../components/ChangelogSections'
import { PageShell } from '../components/PageShell'

// 年別の更新履歴。知らない年は黙って別の年へ流さず、無いことをそのまま伝える ——
// 「それらしく」他の年を出すと、利用者は求めた年を見たつもりで別の年を読む。
export function ChangelogYearPage() {
  const { t } = useTranslation()
  const { year = '' } = useParams()
  const entries = entriesForYear(year)

  return (
    <PageShell
      title={t('pages.changelog.yearTitle', { year })}
      back={{ to: '/changelog/all', label: t('pages.changelog.allTitle') }}
    >
      {entries.length > 0 ? (
        <ChangelogEntryList entries={entries} />
      ) : (
        <p className="text-sm leading-relaxed text-fg-muted">{t('pages.changelog.empty')}</p>
      )}
      <ChangelogYearNav currentYear={year} />
    </PageShell>
  )
}
