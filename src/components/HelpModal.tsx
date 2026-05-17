import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export type HelpTopic =
  | 'erd'
  | 'pcd'
  | 'flangeDistance'
  | 'spokeHoleDiameter'
  | 'crossings'

interface HelpModalProps {
  topic: HelpTopic | null
  onClose: () => void
}

const ACCENT = '#3b82f6'

function ArrowDefs() {
  return (
    <defs>
      <marker id="hm-arr-start" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={ACCENT} />
      </marker>
      <marker id="hm-arr-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={ACCENT} />
      </marker>
    </defs>
  )
}

function ErdDiagram() {
  const { t } = useTranslation()

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-slate-700 dark:text-slate-200" aria-hidden="true">
      <ArrowDefs />
      <circle cx="160" cy="100" r="82" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="160" cy="100" r="58" fill="none" stroke={ACCENT} strokeWidth="2" strokeDasharray="5 4" />
      <line x1="102" y1="100" x2="218" y2="100" stroke={ACCENT} strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="160" y="94" textAnchor="middle" fontSize="13" fill={ACCENT} fontWeight="600">ERD</text>
      <circle cx="160" cy="42" r="3" fill={ACCENT} />
      <text x="160" y="32" textAnchor="middle" fontSize="10" fill="currentColor">{t('input.help.erd.diagram.nippleSeat')}</text>
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
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-slate-700 dark:text-slate-200" aria-hidden="true">
      <ArrowDefs />
      <circle cx={cx} cy={cy} r="78" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={flangeR} fill="none" stroke={ACCENT} strokeWidth="2" strokeDasharray="4 3" />
      {holes.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={holeR} fill="none" stroke="currentColor" strokeWidth="1.5" />
      ))}
      <circle cx={cx} cy={cy} r="3" fill="currentColor" />
      <line x1={cx - flangeR} y1={cy} x2={cx + flangeR} y2={cy} stroke={ACCENT} strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13" fill={ACCENT} fontWeight="600">PCD</text>
    </svg>
  )
}

function FlangeDistanceDiagram() {
  const { t } = useTranslation()

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-slate-700 dark:text-slate-200" aria-hidden="true">
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
      {/* centerline */}
      <line x1="160" y1="40" x2="160" y2="170" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1" opacity="0.6" />
      <text x="160" y="35" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">{t('input.help.flangeDistance.diagram.hubCenter')}</text>
      {/* left arrow */}
      <line x1="160" y1="160" x2="120" y2="160" stroke={ACCENT} strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="140" y="175" textAnchor="middle" fontSize="11" fill={ACCENT} fontWeight="600">FD [L]</text>
      {/* right arrow */}
      <line x1="160" y1="160" x2="200" y2="160" stroke={ACCENT} strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="180" y="175" textAnchor="middle" fontSize="11" fill={ACCENT} fontWeight="600">FD [R]</text>
    </svg>
  )
}

function SpokeHoleDiameterDiagram() {
  const { t } = useTranslation()

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-slate-700 dark:text-slate-200" aria-hidden="true">
      <ArrowDefs />
      {/* flange edge hint */}
      <path d="M 30 100 Q 160 30 290 100" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* enlarged hole */}
      <circle cx="160" cy="110" r="42" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {/* spoke line passing through hole edge */}
      <line x1="60" y1="180" x2="260" y2="40" stroke="currentColor" strokeWidth="2" />
      {/* diameter arrow */}
      <line x1="118" y1="110" x2="202" y2="110" stroke={ACCENT} strokeWidth="1.5" markerStart="url(#hm-arr-start)" markerEnd="url(#hm-arr-end)" />
      <text x="160" y="104" textAnchor="middle" fontSize="11" fill={ACCENT} fontWeight="600">{t('input.help.spokeHoleDiameter.diagram.holeDiameter')}</text>
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
    <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto text-slate-700 dark:text-slate-200" aria-hidden="true">
      {/* radial */}
      <circle cx={cx1} cy={cy} r={rimR} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={cx1} cy={cy} r={hubR} fill="none" stroke="currentColor" strokeWidth="2" />
      {radial(cx1).map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="currentColor" strokeWidth="1.3" />
      ))}
      <text x={cx1} y={185} textAnchor="middle" fontSize="11" fill={ACCENT} fontWeight="600">{t('input.help.crossings.diagram.radial')}</text>
      {/* 2-cross */}
      <circle cx={cx2} cy={cy} r={rimR} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={cx2} cy={cy} r={hubR} fill="none" stroke="currentColor" strokeWidth="2" />
      {cross2(cx2).map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="currentColor" strokeWidth="1.3" />
      ))}
      <text x={cx2} y={185} textAnchor="middle" fontSize="11" fill={ACCENT} fontWeight="600">{t('input.help.crossings.diagram.twoCross')}</text>
    </svg>
  )
}

const DIAGRAMS: Record<HelpTopic, () => React.ReactElement> = {
  erd: ErdDiagram,
  pcd: PcdDiagram,
  flangeDistance: FlangeDistanceDiagram,
  spokeHoleDiameter: SpokeHoleDiameterDiagram,
  crossings: CrossingsDiagram,
}

export function HelpModal({ topic, onClose }: HelpModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!topic) return

    closeButtonRef.current?.focus()

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
    }
  }, [topic, onClose])

  if (!topic) return null

  const Diagram = DIAGRAMS[topic]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        aria-describedby="help-dialog-description"
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-2">
          <h2 id="help-dialog-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t(`input.help.${topic}.title`)}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={t('buttons.close')}
            className="-mt-1 -mr-2 p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 flex justify-center bg-slate-50 dark:bg-slate-900/40 mx-6 rounded-md py-4">
          <Diagram />
        </div>
        <p
          id="help-dialog-description"
          className="px-6 pt-4 pb-6 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed"
        >
          {t(`input.help.${topic}.description`)}
        </p>
      </div>
    </div>
  )
}
