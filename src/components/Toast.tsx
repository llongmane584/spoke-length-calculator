import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { ghostIconBox } from '../styles';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const { t } = useTranslation();
  const closeLabel = t('buttons.close');

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };

  // success がアクセントの blue ではなく ok (emerald) ロールなのは意図的。
  // blue を「アクセント」専用に残すのが単一アクセント設計の要点。
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-ok-soft border-ok-line text-ok-ink';
      case 'error':
        return 'bg-danger-soft border-danger-line text-danger-ink';
      case 'warning':
        return 'bg-warn-soft border-warn-line text-warn-ink';
      case 'info':
        return 'bg-sunken border-line text-fg';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-md transition-all duration-300 ${getStyles()}`}
    >
      <div className="shrink-0">{getIcon()}</div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      {/* btnGhost ではなく寸法だけの ghostIconBox に自前の色を足す。btnGhost の
          text-fg-muted / hover:bg-sunken / outline-focus は、色付きの soft 背景に
          載るこの × では全部間違いになる —— × は行の text-ok-ink などを継承し、
          フォーカスリングも outline-current で背景に追従させている。
          -m-2.5 は 36 のタップ領域をレイアウト上 16 に戻すぶん (36 − 10×2)。
          行の高さも本文との間隔も変わらない。
          glyph が btnIcon (20px) ではなく 16px なのは、本文と同じ行に収める
          ためで、px-3 の行を押し広げない (#110) */}
      <button
        onClick={() => onRemove(toast.id)}
        aria-label={closeLabel}
        className={`${ghostIconBox} -m-2.5 shrink-0 rounded-md hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;