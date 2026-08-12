// og-image-*.png の「字面 (インク)」の範囲を測る (Node 標準モジュールのみ)。
//
// og-card.html はアイコンの高さを見出しの字面に合わせている。CSS のボックス高は
// getBoundingClientRect() で見られるが、字面は見られない —— 文字のインクは行ボックスの
// 中で上下に偏るため、ボックスを揃えても見た目は揃わない。そこを実測するためのもの。
//
// 使い方 (x 範囲はアイコンと見出しの左右端。ブラウザ側で調べてから渡す):
//
//   node og/ink.mjs public/og-image-4.png <アイコンX0> <アイコンX1> <見出しX0> <見出しX1>
//   node og/ink.mjs public/og-image-4.png 88 296 332 720
//
// アイコンと見出しの ink の y 範囲・高さが一致すれば、字面が揃っている。
// x 範囲を省くと既定値を使うが、アイコンの幅が変わると見出しの開始位置もずれるので、
// og-card.html を触ったあとは必ず実際の座標を渡すこと。範囲が重なると、隣の要素の
// インクを拾って嘘の値が出る。
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const decode = (path) => {
  const buf = readFileSync(path)
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`not a PNG: ${path}`)
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  const depth = buf[24]
  const colorType = buf[25]
  // playwright のスクリーンショットは 8bit RGBA 固定。他が来たら黙って進まない。
  if (depth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported PNG: depth=${depth} colorType=${colorType}`)
  }
  const ch = colorType === 6 ? 4 : 3

  const idat = []
  for (let off = 8; off < buf.length;) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len))
    off += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))

  // 行フィルタを解く (PNG spec 9.2)。
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? out[y * stride + i - ch] : 0
      const b = y > 0 ? out[(y - 1) * stride + i] : 0
      const c = i >= ch && y > 0 ? out[(y - 1) * stride + i - ch] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filter !== 0) throw new Error(`bad filter ${filter} on row ${y}`)
      out[y * stride + i] = v & 0xff
    }
  }
  return { w, h, ch, px: out }
}

// 背景 (0,0 の色) と目に見えて違う画素が占める y 範囲。閾値は薄いアンチエイリアスを
// 拾わない程度。
const inkRows = ({ w, h, ch, px }, x0, x1, yMax, threshold = 24) => {
  const bg = [px[0], px[1], px[2]]
  let top = null, bottom = null
  for (let y = 0; y < yMax; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * ch
      const d = Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2])
      if (d > threshold) { if (top === null) top = y; bottom = y; break }
    }
  }
  return { top, bottom, height: top === null ? 0 : bottom - top + 1 }
}

const path = process.argv[2]
if (!path) {
  console.error('usage: node og/ink.mjs <png> [iconX0 iconX1 titleX0 titleX1]')
  process.exit(1)
}
const img = decode(path)
// ロックアップより下 (.sub / .detail / .url / 下端の帯) を拾わないよう y を切る。
const YMAX = 380
const a = process.argv.slice(3).map(Number)
const regions = {
  icon: [a[0] ?? 88, a[1] ?? 296],
  title: [a[2] ?? 332, a[3] ?? 720],
}

console.log(`${path}  (${img.w}x${img.h})`)
const measured = {}
for (const [name, [x0, x1]] of Object.entries(regions)) {
  const r = inkRows(img, x0, x1, YMAX)
  measured[name] = r
  console.log(`  ${name.padEnd(6)} ink y ${r.top} – ${r.bottom}   高さ ${r.height}`)
}
const { icon, title } = measured
console.log(`  差 ${icon.height - title.height}px ` +
  `(上 ${title.top - icon.top} / 下 ${icon.bottom - title.bottom})`)
