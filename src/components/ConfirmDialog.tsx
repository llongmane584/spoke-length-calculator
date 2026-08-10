import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'
import { btnSecondary, btnDanger } from '../styles'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
}

/**
 * 去就は footer の 2 つで決めるので見出しの × は出さない。
 *
 * Modal に載せているのは重なりのため —— これは保存ダイアログの上に開く。
 * 重ね順と「Escape は最前面の 1 枚だけ」は Modal 側が引き受ける。
 */
export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message }: ConfirmDialogProps) {
  const { t } = useTranslation()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      widthClass="max-w-md"
      showClose={false}
      initialFocusRef={cancelButtonRef}
      footer={
        <>
          <button ref={cancelButtonRef} onClick={onCancel} className={btnSecondary}>
            {t('dialog.cancel')}
          </button>
          <button onClick={onConfirm} className={btnDanger}>
            {t('dialog.confirm')}
          </button>
        </>
      }
    >
      <p className="text-fg-muted">{message}</p>
    </Modal>
  )
}
