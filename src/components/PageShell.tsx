import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

// 情報ページの共通枠。戻る道と見出しと、遷移したときの読み上げ位置の面倒を見る。
//
// 見出しが h2 なのは、ヘッダーのアプリ名が全ルートで h1 のまま残るため。ページごとに
// h1 を立てると 1 画面に h1 が 2 つ並ぶ。

/** 戻り先の道具立て。矢印付きの控えめな行で、本文中のリンク (styles.ts の link) とは別物。 */
const backLink =
  'inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm text-fg-muted ' +
  'transition-colors hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

interface PageShellProps {
  title: string
  children: ReactNode
  /** 「計算機に戻る」以外の戻り先。更新履歴の下の階層で使う。 */
  back?: { to: string; label: string }
}

export function PageShell({ title, children, back }: PageShellProps) {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // ハッシュが変わっただけではスクロール位置も読み上げ位置も動かないので、自分で移す。
  // マウント時の一度でよい —— ページごとに別のコンポーネントなので、遷移すれば必ず
  // 新しくマウントされる。
  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [])

  // 履歴に残る名前と、タブに出る名前。deps に t を入れるのは言語を切り替えたときに
  // 追従させるため。計算機にいるときのぶんは App が持つ (両方が書くと、子の効果が
  // 先に走る React の順番でページの見出しがアプリ名に上書きされる)。
  useEffect(() => {
    document.title = `${title} · ${t('title')}`
  }, [title, t])

  const target = back ?? { to: '/', label: t('pages.backToApp') }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link to={target.to} className={backLink}>
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          {target.label}
        </Link>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight text-fg focus:outline-none sm:text-2xl"
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}
