import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertOctagon, X } from 'lucide-react';

export default function Alert({
  type = 'info',
  title = null,
  children,
  onDismiss = null,
  className = '',
}) {
  const configs = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: Info,
      iconColor: 'text-app-primary',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: AlertOctagon,
      iconColor: 'text-app-error',
    },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 ${config.bg} ${className}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 text-xs">
        {title && <h5 className="font-semibold text-sm mb-1">{title}</h5>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
