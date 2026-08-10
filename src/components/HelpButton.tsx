import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ghostIconBox } from '../styles'
import type { HelpTopic } from './HelpModal'

interface HelpButtonProps {
  topic: HelpTopic
  onOpen: (topic: HelpTopic) => void
}

export function HelpButton({ topic, onOpen }: HelpButtonProps) {
  const { t } = useTranslation()

  return (
    // 寸法は ghostIconBox に任せて 36 のタップ領域を作り、-m-2.5 でレイアウト上の
    // 占有を glyph と同じ 16 に戻す (36 − 10×2)。ラベル行の高さは変わらない。
    // rounded-full を btnGhost に後付けしないのはそのため —— rounded-md とどちらが
    // 効くかは生成 CSS の順序次第なので、角丸を持たない土台の上に自分で載せる。
    // glyph が btnIcon (20px) ではなく 16px なのは、ラベルの文字列に添える印で
    // あって単独の操作ボタンではないから。20px にするとラベルより重くなる (#110)
    <button
      type="button"
      onClick={() => onOpen(topic)}
      aria-label={t(`input.help.${topic}.ariaLabel`)}
      className={`${ghostIconBox} -m-2.5 rounded-full text-fg-subtle hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus transition-colors`}
    >
      <HelpCircle className="w-4 h-4" aria-hidden="true" />
    </button>
  )
}
