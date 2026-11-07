import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../../art/icons';
import { audio } from '../../audio/audio';

/**
 * Dialog with a ribbon title. Traps nothing fancy: it focuses itself on open,
 * closes on Escape (when closable) and returns focus afterwards.
 */
export function Modal({
  title,
  children,
  onClose,
  tone = 'purple',
  wide,
  className = '',
}: {
  title?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  tone?: 'purple' | 'red' | 'green' | 'orange';
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    // keep focus on an autoFocus'd button inside the dialog; otherwise focus the dialog itself
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
    return () => prev?.focus?.();
  }, []);
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ffn-modal-backdrop" role="presentation">
      <div
        ref={ref}
        className={`ffn-modal ${wide ? 'is-wide' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {title && (
          <div className={`ffn-ribbon ffn-ribbon-${tone}`} id={titleId}>
            <span>{title}</span>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            className="ffn-modal-close"
            aria-label="Close"
            onClick={() => {
              audio.play('click');
              onClose();
            }}
          >
            <CloseIcon />
          </button>
        )}
        <div className="ffn-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel} tone={danger ? 'red' : 'purple'} className="ffn-confirm">
      <p className="ffn-modal-text">{message}</p>
      <div className="ffn-modal-actions">
        <button type="button" className="ffn-btn ffn-btn-cream ffn-btn-md" onClick={onCancel}>
          <span className="ffn-btn-label">{cancelLabel}</span>
        </button>
        <button type="button" className={`ffn-btn ${danger ? 'ffn-btn-red' : 'ffn-btn-green'} ffn-btn-md`} onClick={onConfirm}>
          <span className="ffn-btn-label">{confirmLabel}</span>
        </button>
      </div>
    </Modal>
  );
}
