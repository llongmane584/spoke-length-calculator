import { useId, useRef } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  History,
  Info,
  Moon,
  Scale,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { APP_VERSION } from '../changelog'
import { useDialogLayer } from '../hooks/useDialogLayer'
import { useTheme } from '../hooks/useTheme'
import {
  btnGhost,
  btnIcon,
  customizableSelect,
  dismissOpenPicker,
  menuRow,
  nativeSelect,
  selectChevron,
  supportsBaseSelect,
} from '../styles'

// 言語切替。プリセットとは性質が違う操作なので PresetSelect は使わないが、
// base-select の分岐だけは同じ規則で揃える —— プリセットのポップアップだけが新しくて
// 他が OS 標準のままだと、かえって古く見えるため。
// 選択肢が素のテキストだけなので、畳んだ状態はブラウザ生成のボタンで足りる。
const languageSelectClass = supportsBaseSelect
  ? `${customizableSelect} preset-select min-h-9 w-auto py-1 pr-2 text-sm`
  : `${nativeSelect} min-h-9 w-auto py-1 pr-8 text-sm`

const SECTIONS: readonly { path: string; labelKey: string; Icon: LucideIcon }[] = [
  { path: '/about', labelKey: 'pages.about.title', Icon: Info },
  { path: '/usage', labelKey: 'pages.usage.title', Icon: BookOpen },
  { path: '/license', labelKey: 'pages.license.title', Icon: Scale },
  { path: '/changelog', labelKey: 'pages.changelog.title', Icon: History },
]

interface AppDrawerProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * メニュードロワー。狭い画面では画面全体を覆い、`sm` 以上では描画領域の右端から出る。
 *
 * Modal は流用しない —— あちらは中央に置く小窓で、幅も高さの上限もその前提で決まって
 * いる。右寄せ・全高・左だけの枠はどの幅でも別物なので、共有できるのは見た目ではなく
 * 覆うときの作法だけ。それは useDialogLayer に出してある。
 *
 * 開閉のアニメーションは付けない。このリポジトリには @keyframes が 1 つも無く、
 * 既存のオーバーレイ (Modal / HelpModal) も transition-colors しか持たない。
 */
export function AppDrawer({ isOpen, onClose }: AppDrawerProps) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const titleId = useId()
  const languageId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { dialogRef, zIndex } = useDialogLayer(isOpen, onClose, closeButtonRef)

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    try {
      localStorage.setItem('preferredLanguage', lang)
    } catch (error) {
      console.error('Failed to save language preference:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ zIndex }} className="fixed inset-0" onClick={onClose}>
      <div className="mx-auto h-full w-full sm:max-w-3xl sm:px-6">
        {/* 配置ラッパー内で ml-auto にして描画領域の右端へ。狭い画面では w-full が効いて
            画面全部を覆うので、枠と角丸は sm 以上だけに置く —— 全画面のときに左枠が
            1 本走ると、画面の端に意味のない線が出る */}
        <div
          ref={dialogRef}
          tabIndex={-1}
          onClick={event => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="ml-auto flex h-full w-full flex-col bg-surface shadow-lg focus:outline-none sm:max-w-sm sm:border-l sm:border-line"
        >
          <div className="flex flex-none items-center justify-between gap-4 border-b border-line px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
            <h2 id={titleId} className="text-lg font-semibold text-fg sm:text-xl">
              {t('menu.title')}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label={t('menu.close')}
              className={`${btnGhost} -mr-1 sm:-mr-6`}
            >
              <X className={btnIcon} aria-hidden="true" />
            </button>
          </div>

          {/* 行が増えたときに送るのはここだけ。overscroll-contain は全画面のときに、
              端まで送った続きで裏の計算機が動いてしまうのを止める */}
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <ul className="-mx-3 flex flex-col gap-1">
              {SECTIONS.map(({ path, labelKey, Icon }) => {
                // 更新履歴は下に 2 階層 (/all と /:year) を持つので、前方一致でも見る
                const isCurrent = pathname === path || pathname.startsWith(`${path}/`)

                return (
                  <li key={path}>
                    <Link
                      to={path}
                      onClick={onClose}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`${menuRow} ${
                        isCurrent ? 'bg-accent-soft text-accent-ink' : 'text-fg hover:bg-sunken'
                      }`}
                    >
                      <Icon
                        className={`${btnIcon} ${isCurrent ? 'text-accent-ink' : 'text-accent'}`}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{t(labelKey)}</span>
                      <ChevronRight className={`${btnIcon} text-fg-subtle`} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* 送らない帯なので、言語の select を置いてもポップアップが枠に切られない */}
          <div className="flex-none space-y-3 border-t border-line p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={languageId} className="text-sm font-medium text-fg">
                {t('menu.language')}
              </label>
              <div className="relative">
                <select
                  id={languageId}
                  value={i18n.language}
                  onChange={event => handleLanguageChange(event.target.value)}
                  onPointerDown={supportsBaseSelect ? dismissOpenPicker : undefined}
                  className={languageSelectClass}
                >
                  <option value="en-GB">English</option>
                  <option value="ja">日本語</option>
                </select>
                {!supportsBaseSelect && (
                  <ChevronDown aria-hidden="true" className={`${selectChevron} right-2.5`} />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-fg">{t('menu.theme')}</span>
              <button
                type="button"
                onClick={toggleTheme}
                className={`${btnGhost} -mr-2`}
                title={t('theme.toggle')}
                aria-label={t('theme.toggle')}
              >
                {theme === 'dark' ? (
                  <Sun className={btnIcon} aria-hidden="true" />
                ) : (
                  <Moon className={btnIcon} aria-hidden="true" />
                )}
              </button>
            </div>

            <p className="text-xs tabular-nums text-fg-subtle">
              {t('menu.version', { version: APP_VERSION })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
