import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Toast } from './Toast';
import { ToastContext, type ToastApi, type ToastItem, type ToastOptions } from './toastContext';

const Viewport = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[5]};
  right: ${({ theme }) => theme.spacing[5]};
  z-index: 1100;
  display: flex;
  flex-direction: column-reverse;
  gap: ${({ theme }) => theme.spacing[2]};
  pointer-events: none;

  @media (max-width: 640px) {
    left: ${({ theme }) => theme.spacing[3]};
    right: ${({ theme }) => theme.spacing[3]};
    bottom: ${({ theme }) => theme.spacing[3]};
    align-items: stretch;
  }
`;

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback((opts: ToastOptions) => {
    idRef.current += 1;
    const id = String(idRef.current);
    const tone = opts.tone ?? 'info';
    const durationMs = opts.durationMs ?? (opts.action ? 8000 : 4000);
    setToasts((prev) => [...prev, { id, tone, message: opts.message, action: opts.action, durationMs }]);
    if (durationMs > 0) {
      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (message, opts) => show({ ...opts, message, tone: 'success' }),
    error: (message, opts) => show({ ...opts, message, tone: 'error' }),
    info: (message, opts) => show({ ...opts, message, tone: 'info' }),
    dismiss,
  }), [show, dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <Viewport>
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </Viewport>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};
