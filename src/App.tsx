import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes, useLocation } from 'react-router'
import { AppDrawer } from './components/AppDrawer'
import { AppHeader } from './components/AppHeader'
import { AboutPage } from './pages/AboutPage'
import CalculatorPage from './pages/CalculatorPage'
import { ChangelogAllPage } from './pages/ChangelogAllPage'
import { ChangelogPage } from './pages/ChangelogPage'
import { ChangelogYearPage } from './pages/ChangelogYearPage'
import { LicensePage } from './pages/LicensePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UsagePage } from './pages/UsagePage'

// アプリの外枠。ヘッダーとドロワーを持ち、本体を計算機か情報ページのどちらかに切り替える。
export default function App() {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const isPageRoute = pathname !== '/'

  const openMenu = useCallback(() => setIsMenuOpen(true), [])

  // 閉じたらフォーカスをハンバーガーへ戻す。戻さないと行き先が body になり、
  // 続きの Tab がページの先頭からやり直しになる。
  // useDialogLayer も「開く前にフォーカスがあった要素」へ返すが、あちらは活性要素頼み
  // ——ボタンをクリックしてもフォーカスを与えないブラウザがあるので、行き先が確実に
  // 分かっているここでは ref で名指しする。
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  // html の lang を i18n に追従させる。index.html の先読みスクリプトが初期値を入れて
  // いるので、ここが見るのは切り替えたあと。
  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  // 情報ページの見出しは PageShell が document.title に入れる。ここが持つのは
  // 計算機にいるときの分だけ —— 両方が書くと、子の効果が先に走る React の順番で
  // ページの見出しが毎回アプリ名に上書きされる。
  useEffect(() => {
    if (isPageRoute) return

    document.title = t('title')
  }, [isPageRoute, t])

  return (
    <div className="min-h-screen bg-page text-fg transition-colors">
      {/* max-w-3xl は 798074c (#27) が外した幅制限を意図的に戻したもの。#27 が問題視
          したのは何も整理しない装飾的なシートだったが、計算機のシートは既存の
          FieldGroup セマンティクスと 1:1 で対応する機能的な区切り。旧 max-w-4xl より
          狭くし、モバイルは p-4 のままなので表示領域は失われない。 */}
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <AppHeader isMenuOpen={isMenuOpen} onOpenMenu={openMenu} menuButtonRef={menuButtonRef} />

        {/* 計算機はルート要素にしない。Routes はルート要素をアンマウントするので、
            情報ページを見て戻ってきたときに入力中の値が消えてしまう。マウントした
            まま hidden で伏せれば、約 40 個の useState を持ち上げずに済む。
            隠れている間 useDockMorph が測る寸法は 0 になるが、レイアウトを持たない
            ので害はなく、戻ったときに入力欄の ResizeObserver が発火して直る。 */}
        <div hidden={isPageRoute}>
          <CalculatorPage />
        </div>

        <Routes>
          <Route path="/" element={null} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/changelog/all" element={<ChangelogAllPage />} />
          <Route path="/changelog/:year" element={<ChangelogYearPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      <AppDrawer isOpen={isMenuOpen} onClose={closeMenu} />
    </div>
  )
}
