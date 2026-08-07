// og-card.html をレンダリングするためだけの静的サーバー (Node 標準モジュールのみ)。
//
// playwright-cli は file: プロトコルへのアクセスを塞いでいるため、カードを撮るには
// HTTP で配信する必要がある。リポジトリルートをそのまま出すことで、og-card.html の
// 相対パス (../public/calculator.svg) がブラウザ側でも素直に解決される。
//
// vite の dev サーバーでは代用できない: vite は public/ の中身を base 直下に出すので、
// ../public/... というパスが 404 になる。
//
// 使い方は og/og-card.html 冒頭のコメントを参照。
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, join, relative, resolve } from 'node:path'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PORT = 8787
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const fail = (res, status, message, detail) => {
  // 握り潰さない。ブラウザ側とターミナル側の両方に理由を出す。
  // 静かに空白がレンダリングされた PNG をコミットするのが一番まずい。
  console.error(`${status} ${message}${detail ? ` — ${detail}` : ''}`)
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' })
  res.end(`${status} ${message}\n${detail ?? ''}`)
}

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  const file = resolve(join(ROOT, urlPath))

  // ルート外への脱出を拒否する。ローカル専用とはいえ、リポジトリ外のファイルを
  // 配る理由はない。
  const rel = relative(ROOT, file)
  if (rel.startsWith('..')) return fail(res, 403, 'outside repository root', urlPath)

  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch (err) {
    fail(res, 404, 'not found', `${urlPath} -> ${err.message}`)
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT}`)
  console.log(`open http://127.0.0.1:${PORT}/og/og-card.html`)
})
