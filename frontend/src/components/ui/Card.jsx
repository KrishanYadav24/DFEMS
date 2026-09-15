import React from 'react';

export default function Card({
  children,
  className = '',
  title = null,
  subtitle = null,
  action = null,
  footer = null,
  padding = true,
}) {
  return (
    <div className={`bg-app-surface rounded-xl border border-app-border shadow-card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-app-text">{title}</h3>}
            {subtitle && <p className="text-xs text-app-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      
      <div className={padding ? 'p-5' : ''}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3.5 bg-gray-50/70 border-t border-app-border text-xs text-app-muted flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}
