import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { changelogYears, releaseKey, type ChangelogEntry } from '../changelog'

// 更新履歴の 3 枚 (/changelog, /changelog/all, /changelog/:year) が共有する 2 つの区画。

/** 年へ飛ぶピル。select の chip とは用途が違うので styles.ts には出さず、ここに置く。 */
const yearPill =
  'inline-flex min-h-9 items-center rounded-full border border-line px-3 text-sm tabular-nums ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

interface ChangelogEntryListProps {
  entries: readonly ChangelogEntry[]
}

export function ChangelogEntryList({ entries }: ChangelogEntryListProps) {
  const { t } = useTranslation()

  return (
    <ol className="space-y-6">
      {entries.map(entry => (
        <li key={entry.version} className="space-y-2">
          <div className="flex items-baseline gap-3">
            <h3 className="text-sm font-semibold tabular-nums text-fg">v{entry.version}</h3>
            {/* ISO の日付をそのまま出す。どちらの言語でも読めるので Intl を持ち込まない */}
            <time dateTime={entry.date} className="text-xs tabular-nums text-fg-subtle">
              {entry.date}
            </time>
          </div>
          {/* 1 行 1 項目。翻訳側は \n 区切りの 1 文字列で持つ —— locale の全リーフを
              文字列に揃えておくと、キーが欠けたときに配列を期待した .map が
              文字ごとに回るような黙った壊れ方をしない */}
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-fg-muted">
            {t(`pages.changelog.releases.${releaseKey(entry.version)}.notes`)
              .split('\n')
              .map((note, index) => (
                <li key={index}>{note}</li>
              ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

interface ChangelogYearNavProps {
  /** 今見ている年。ピルの現在地を示す。 */
  currentYear?: string
}

export function ChangelogYearNav({ currentYear }: ChangelogYearNavProps) {
  const { t } = useTranslation()
  const years = changelogYears()

  return (
    <nav className="space-y-2 border-t border-line pt-5">
      <h3 className="text-xs font-medium text-fg-subtle">{t('pages.changelog.yearsHeading')}</h3>
      <ul className="flex flex-wrap gap-2">
        {years.map(year => {
          const isCurrent = year === currentYear

          return (
            <li key={year}>
              <Link
                to={`/changelog/${year}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`${yearPill} ${
                  isCurrent
                    ? 'border-accent-line bg-accent-soft text-accent-ink'
                    : 'text-fg-muted hover:bg-sunken hover:text-fg'
                }`}
              >
                {year}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
