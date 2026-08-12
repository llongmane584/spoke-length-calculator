import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'

export type HelpTopic =
  | 'erd'
  | 'rimOffset'
  | 'pcd'
  | 'flangeDistance'
  | 'spokeHoleDiameter'
  | 'crossings'

interface HelpModalProps {
  topic: HelpTopic | null
  onClose: () => void
}


function ArrowDefs() {
  return (
    <defs>
      <marker id="hm-arr-start" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-accent-ink" />
      </marker>
      <marker id="hm-arr-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-accent-ink" />
      </marker>
    </defs>
  )
}

function ErdDiagram() {
  const { t } = useTranslation()

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-fg-muted" aria-hidden="true">
      <ArrowDefs />
      <circle cx="160" cy="100" r="82" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="160" cy="100" r="58" fill="none" className="stroke-accent-ink" strokeWidth="2" strokeDasharray="5 4" />
      <line x1="102" y1="100" x2="218" y2="100" className="stroke-accent-ink" strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="160" y="94" textAnchor="middle" fontSize="13" className="fill-accent-ink" fontWeight="600">ERD</text>
      <circle cx="160" cy="42" r="3" className="fill-accent-ink" />
      <text x="160" y="32" textAnchor="middle" fontSize="10" fill="currentColor">{t('input.help.erd.diagram.nippleSeat')}</text>
    </svg>
  )
}

function RimOffsetDiagram() {
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-fg-muted" aria-hidden="true">
      <ArrowDefs />
      {/* hub and axle */}
      <line x1="45" y1="145" x2="275" y2="145" stroke="currentColor" strokeWidth="3" />
      <rect x="105" y="132" width="110" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="105" y1="105" x2="105" y2="170" stroke="currentColor" strokeWidth="3" />
      <line x1="215" y1="105" x2="215" y2="170" stroke="currentColor" strokeWidth="3" />
      {/* rim centre plane and offset nipple bed */}
      <path d="M 122 38 Q 160 22 198 38 L 188 72 Q 160 60 132 72 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="160" y1="18" x2="160" y2="176" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1" opacity="0.55" />
      <line x1="178" y1="34" x2="178" y2="82" className="stroke-accent-ink" strokeWidth="3" />
      <circle cx="178" cy="64" r="4" className="fill-accent-ink" />
      {/* spokes and offset measurement */}
      <line x1="105" y1="112" x2="178" y2="64" stroke="currentColor" strokeWidth="1.5" />
      <line x1="215" y1="112" x2="178" y2="64" stroke="currentColor" strokeWidth="1.5" />
      <line x1="160" y1="92" x2="178" y2="92" className="stroke-accent-ink" strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="169" y="108" textAnchor="middle" fontSize="11" className="fill-accent-ink" fontWeight="600">offset</text>
    </svg>
  )
}

function PcdDiagram() {
  const cx = 160
  const cy = 100
  const flangeR = 60
  const holeR = 5
  const holeCount = 8
  const holes = Array.from({ length: holeCount }, (_, i) => {
    const angle = (i / holeCount) * Math.PI * 2 - Math.PI / 2
    return { x: cx + flangeR * Math.cos(angle), y: cy + flangeR * Math.sin(angle) }
  })
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-fg-muted" aria-hidden="true">
      <ArrowDefs />
      <circle cx={cx} cy={cy} r="78" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={flangeR} fill="none" className="stroke-accent-ink" strokeWidth="2" strokeDasharray="4 3" />
      {holes.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={holeR} fill="none" stroke="currentColor" strokeWidth="1.5" />
      ))}
      <circle cx={cx} cy={cy} r="3" fill="currentColor" />
      <line x1={cx - flangeR} y1={cy} x2={cx + flangeR} y2={cy} className="stroke-accent-ink" strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13" className="fill-accent-ink" fontWeight="600">PCD</text>
    </svg>
  )
}

function FlangeDistanceDiagram() {
  const { t } = useTranslation()

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-fg-muted" aria-hidden="true">
      <ArrowDefs />
      {/* axle */}
      <line x1="40" y1="100" x2="280" y2="100" stroke="currentColor" strokeWidth="3" />
      {/* hub shell */}
      <rect x="110" y="88" width="100" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* left flange */}
      <line x1="120" y1="60" x2="120" y2="140" stroke="currentColor" strokeWidth="3" />
      <circle cx="120" cy="60" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="120" cy="140" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {/* right flange */}
      <line x1="200" y1="60" x2="200" y2="140" stroke="currentColor" strokeWidth="3" />
      <circle cx="200" cy="60" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="200" cy="140" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {/* centreline */}
      <line x1="160" y1="40" x2="160" y2="170" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1" opacity="0.6" />
      <text x="160" y="35" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">{t('input.help.flangeDistance.diagram.hubCenter')}</text>
      {/* left arrow */}
      <line x1="160" y1="160" x2="120" y2="160" className="stroke-accent-ink" strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="140" y="175" textAnchor="middle" fontSize="11" className="fill-accent-ink" fontWeight="600">FD [L]</text>
      {/* right arrow */}
      <line x1="160" y1="160" x2="200" y2="160" className="stroke-accent-ink" strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="180" y="175" textAnchor="middle" fontSize="11" className="fill-accent-ink" fontWeight="600">FD [R]</text>
    </svg>
  )
}

function SpokeHoleDiameterDiagram() {
  const { t } = useTranslation()

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-fg-muted" aria-hidden="true">
      <ArrowDefs />
      {/* flange edge hint */}
      <path d="M 30 100 Q 160 30 290 100" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* enlarged hole */}
      <circle cx="160" cy="110" r="42" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {/* spoke line passing through hole edge */}
      <line x1="60" y1="180" x2="260" y2="40" stroke="currentColor" strokeWidth="2" />
      {/* diameter arrow */}
      <line x1="118" y1="110" x2="202" y2="110" className="stroke-accent-ink" strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="160" y="104" textAnchor="middle" fontSize="11" className="fill-accent-ink" fontWeight="600">{t('input.help.spokeHoleDiameter.diagram.holeDiameter')}</text>
      <text x="160" y="172" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">{t('input.help.spokeHoleDiameter.diagram.spoke')}</text>
    </svg>
  )
}

function CrossingsDiagram() {
  const { t } = useTranslation()
  const cx1 = 90
  const cy = 100
  const cx2 = 230
  const hubR = 18
  const rimR = 70
  function radial(centerX: number) {
    const lines = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      lines.push({
        x1: centerX + hubR * Math.cos(a),
        y1: cy + hubR * Math.sin(a),
        x2: centerX + rimR * Math.cos(a),
        y2: cy + rimR * Math.sin(a),
      })
    }
    return lines
  }
  function cross2(centerX: number) {
    const lines = []
    const cross = 2
    for (let i = 0; i < 8; i++) {
      const aHub = (i / 8) * Math.PI * 2
      const aRim = aHub + (cross * Math.PI * 2) / 8
      lines.push({
        x1: centerX + hubR * Math.cos(aHub),
        y1: cy + hubR * Math.sin(aHub),
        x2: centerX + rimR * Math.cos(aRim),
        y2: cy + rimR * Math.sin(aRim),
      })
    }
    return lines
  }
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-fg-muted" aria-hidden="true">
      {/* radial */}
      <circle cx={cx1} cy={cy} r={rimR} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={cx1} cy={cy} r={hubR} fill="none" stroke="currentColor" strokeWidth="2" />
      {radial(cx1).map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="currentColor" strokeWidth="1.3" />
      ))}
      <text x={cx1} y={185} textAnchor="middle" fontSize="11" className="fill-accent-ink" fontWeight="600">{t('input.help.crossings.diagram.radial')}</text>
      {/* 2-cross */}
      <circle cx={cx2} cy={cy} r={rimR} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={cx2} cy={cy} r={hubR} fill="none" stroke="currentColor" strokeWidth="2" />
      {cross2(cx2).map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="currentColor" strokeWidth="1.3" />
      ))}
      <text x={cx2} y={185} textAnchor="middle" fontSize="11" className="fill-accent-ink" fontWeight="600">{t('input.help.crossings.diagram.twoCross')}</text>
    </svg>
  )
}

const DIAGRAMS: Record<HelpTopic, () => React.ReactElement> = {
  erd: ErdDiagram,
  rimOffset: RimOffsetDiagram,
  pcd: PcdDiagram,
  flangeDistance: FlangeDistanceDiagram,
  spokeHoleDiameter: SpokeHoleDiameterDiagram,
  crossings: CrossingsDiagram,
}

// 外枠・見出し行・× ボタン・Escape / Tab の輪・フォーカスの出入り・重ね順は
// すべて Modal (と、その下の useDialogLayer) が持つ。ここが持つのは中身だけ。
export function HelpModal({ topic, onClose }: HelpModalProps) {
  const { t } = useTranslation()
  const descriptionId = useId()

  // topic が開閉状態を兼ねているので、閉じた瞬間に見出しも図解も行き先を失う。
  // Modal は退場のあいだ中身を描き続けるから、そこに何を出すかをここが覚えておく。
  // 他のモーダルは表示するものが別の state に載っていて消えないので、この手当ては
  // ここだけに要る。
  const [shownTopic, setShownTopic] = useState(topic)

  if (topic !== null && topic !== shownTopic) setShownTopic(topic)

  // 一度も開いていないあいだは何も描かない。以降は Modal が isOpen で決める。
  if (shownTopic === null) return null

  const Diagram = DIAGRAMS[shownTopic]

  return (
    <Modal
      isOpen={topic !== null}
      onClose={onClose}
      title={t(`input.help.${shownTopic}.title`)}
      descriptionId={descriptionId}
    >
      {/* 左右の余白は Modal の本体が持つので、ここは箱の中の padding だけを持つ */}
      <div className="flex justify-center rounded-md border border-line bg-sunken px-6 py-4">
        <Diagram />
      </div>
      <p
        id={descriptionId}
        className="pt-4 text-sm text-fg-muted whitespace-pre-line leading-relaxed"
      >
        {t(`input.help.${shownTopic}.description`)}
      </p>
    </Modal>
  )
}
