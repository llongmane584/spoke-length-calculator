import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { HelpTopic } from './HelpModal'

interface HelpButtonProps {
  topic: HelpTopic
  onOpen: (topic: HelpTopic) => void
}

export function HelpButton({ topic, onOpen }: HelpButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      aria-label={t(`input.help.${topic}.ariaLabel`)}
      className="inline-flex items-center justify-center p-2 -m-2 text-fg-subtle hover:text-accent-ink rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus transition-colors"
    >
      <HelpCircle className="w-4 h-4" aria-hidden="true" />
    </button>
  )
}
