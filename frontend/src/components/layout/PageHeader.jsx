import React from 'react';

export default function PageHeader({
  title,
  subtitle = null,
  actions = null,
  badge = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-app-text">{title}</h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-app-muted mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
