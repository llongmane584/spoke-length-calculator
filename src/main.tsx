import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { routedShareFragment } from './shareLink'

// #118 より前に配った共有 URL は `#v=1&...` の形をしている。ハッシュルーターから見ると
// これはパスなので、そのままではどのルートにも当たらず「見つかりません」に落ちる。
// ルーターが URL を読む前に一度だけ書き換えて、計算機に着地させる。
//
// replaceState を使うのは navigation を起こさないため。中身は落とさないので、
// 書き換えたあとの URL を再読み込みしても共有内容は残る。
//
// import は本文より先に評価されるので、計算機が読み込み時に走らせる loadSharedInputs は
// この書き換えより前に fragment を見る。それでも困らないのは shareLink の読み取りが
// 新旧どちらの形も受けるから —— ここは「ルーターを `/` に着地させる」ためだけの処理で、
// 共有内容の復元には関わらない。
const routed = routedShareFragment(window.location.hash)

if (routed !== null) {
  window.history.replaceState(null, '', routed)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
