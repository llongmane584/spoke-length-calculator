import { TriangleAlert } from 'lucide-react'

interface InitialDataAlertProps {
  message: string
  severity: 'warning' | 'error'
}

/** 起動時のデータ読み込みが部分的に失敗したことを伝える帯。 */
export const InitialDataAlert: React.FC<InitialDataAlertProps> = ({ message, severity }) => (
  <div
    role="alert"
    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
      severity === 'error'
        ? 'border-danger-line bg-danger-soft text-danger-ink'
        : 'border-warn-line bg-warn-soft text-warn-ink'
    }`}
  >
    <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{message}</span>
  </div>
)
