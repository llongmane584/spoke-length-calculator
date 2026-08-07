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
      className="inline-flex items-center justify-center p-2 -m-2 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors"
    >
      <HelpCircle className="w-4 h-4" aria-hidden="true" />
    </button>
  )
}
