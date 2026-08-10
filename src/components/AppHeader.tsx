import type { RefObject } from 'react'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { btnGhost, btnIcon } from '../styles'

interface AppHeaderProps {
  isMenuOpen: boolean
  onOpenMenu: () => void
  /** ハンバーガー本体。閉じたときフォーカスを戻すのでシェルが持つ。 */
  menuButtonRef: RefObject<HTMLButtonElement | null>
}

// タイトルとハンバーガーだけの 1 行。言語とテーマはドロワーへ移したので (#118)、
// 320px でも折り返さずに収まる —— タイトルは text-2xl で 200px 前後、
// ハンバーガーは 36 の枠なので、間の gap-3 を足しても余る。
export function AppHeader({ isMenuOpen, onOpenMenu, menuButtonRef }: AppHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="mb-8 flex items-center justify-between gap-3 border-b border-line pb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        {/* 情報ページから計算機へ戻る道。下線は引かない —— 見出しに下線を足すと
            本文中のリンクより強く目に入る。hover の色変化で押せることは伝わる */}
        <Link
          to="/"
          className="rounded-sm transition-colors hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t('title')}
        </Link>
      </h1>
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onOpenMenu}
        className={btnGhost}
        title={t('menu.title')}
        aria-label={t('menu.title')}
        aria-haspopup="dialog"
        aria-expanded={isMenuOpen}
      >
        <Menu className={btnIcon} aria-hidden="true" />
      </button>
    </header>
  )
}
