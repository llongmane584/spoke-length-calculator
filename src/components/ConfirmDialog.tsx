import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
}

export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message }: ConfirmDialogProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
      >
        <h2 id="dialog-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {title}
        </h2>
        <p id="dialog-message" className="text-slate-600 dark:text-slate-300 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('dialog.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
          >
            {t('dialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
