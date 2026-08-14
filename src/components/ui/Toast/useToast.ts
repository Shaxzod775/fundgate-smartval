import { useContext } from 'react';
import { ToastContext, type ToastApi } from './toastContext';

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
