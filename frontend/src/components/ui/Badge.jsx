import React from 'react';

export default function Badge({
  children,
  variant = 'neutral',
  status = null,
  size = 'md',
  dot = false,
  className = '',
}) {
  // If specific forensic/legal status provided, map automatically
  let mappedVariant = variant;
  if (status) {
    const s = String(status).toLowerCase();
    if (['collected', 'open'].includes(s)) mappedVariant = 'info';
    else if (['in storage', 'under analysis', 'under investigation'].includes(s)) mappedVariant = 'warning';
    else if (['presented in court', 'closed'].includes(s)) mappedVariant = 'success';
    else if (['archived', 'disposed', 'inactive'].includes(s)) mappedVariant = 'neutral';
    else if (['tampered', 'mismatch', 'error', 'suspended'].includes(s)) mappedVariant = 'danger';
    else if (['match', 'active'].includes(s)) mappedVariant = 'success';
  }

  const variantStyles = {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const dotColors = {
    neutral: 'bg-gray-400',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    primary: 'bg-indigo-500',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${variantStyles[mappedVariant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[mappedVariant]}`} />
      )}
      {children || status}
    </span>
  );
}
