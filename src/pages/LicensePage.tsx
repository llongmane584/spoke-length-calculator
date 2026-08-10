import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/PageShell'
import { link } from '../styles'
// ルートの LICENSE をそのまま読む。写しを持つと本体と食い違ったときに気づけない。
// Tailwind は source(none) + 明示 @source なのでこの文字列は走査されない —— 中に
// クラス名を書いても効かないが、法律文なので元から関係がない。
import licenseText from '../../LICENSE?raw'

// Lucide の ISC 表記。public/ に置いた静的ファイルで、thirdPartyNotices.test.ts が
// node_modules の原本とバイト一致していることを見張っている。base が
// /spoke-length-calculator/ のサブパス配信なので BASE_URL 経由で組む。
const thirdPartyNoticesUrl = `${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.txt`

export function LicensePage() {
  const { t } = useTranslation()

  return (
    <PageShell title={t('pages.license.title')}>
      <p className="text-sm leading-relaxed text-fg-muted">{t('pages.license.intro')}</p>
      {/* whitespace-pre-wrap で折り返す。MIT 本文は 80 桁で折られていて、そのままでは
          360px に収まらない。pre の等幅は Tailwind の preflight が既に与えている。
          枠は border-line —— line-strong は操作できる要素の枠 (WCAG 1.4.11) の色 */}
      <pre className="whitespace-pre-wrap rounded-md border border-line bg-sunken p-4 text-xs leading-relaxed text-fg-muted">
        {licenseText}
      </pre>
      <p className="text-sm leading-relaxed text-fg-muted">
        <a href={thirdPartyNoticesUrl} className={link}>
          {t('pages.license.thirdParty')}
        </a>
      </p>
    </PageShell>
  )
}
