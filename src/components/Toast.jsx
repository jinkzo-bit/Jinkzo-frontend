import React from 'react';
import { useCartStore } from '../store/cartStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useCartStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => {
        let bgColor = 'bg-surface border-green-500';
        let Icon = CheckCircle2;
        let iconColor = 'text-green-500';

        if (toast.type === 'error') {
          bgColor = 'bg-surface border-red-500';
          Icon = AlertCircle;
          iconColor = 'text-red-500';
        } else if (toast.type === 'info') {
          bgColor = 'bg-surface border-blue-500';
          Icon = Info;
          iconColor = 'text-blue-500';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-xl shadow-lg border-l-4 transition-all duration-300 transform translate-x-0 animate-slide-in ${bgColor} glass`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
            <p className="text-sm font-medium text-main flex-grow">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}
