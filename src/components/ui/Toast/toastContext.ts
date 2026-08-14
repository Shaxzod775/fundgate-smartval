import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  message: string;
  action?: ToastAction;
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
  durationMs: number;
}

export interface ToastApi {
  show: (opts: ToastOptions) => string;
  success: (message: string, opts?: Omit<ToastOptions, 'message' | 'tone'>) => string;
  error: (message: string, opts?: Omit<ToastOptions, 'message' | 'tone'>) => string;
  info: (message: string, opts?: Omit<ToastOptions, 'message' | 'tone'>) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
