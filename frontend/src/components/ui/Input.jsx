import React from 'react';

export default function Input({
  label = null,
  id,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error = null,
  helperText = null,
  icon: Icon = null,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-app-text mb-1.5">
          {label}
          {required && <span className="text-app-error ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
            {renderIcon()}
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`block w-full rounded-lg border text-sm transition-colors py-2 px-3
            ${Icon ? 'pl-9' : 'pl-3'}
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-app-text'}
            ${error ? 'border-app-error focus:ring-app-error focus:border-app-error' : 'border-app-border focus:ring-2 focus:ring-app-primary/20 focus:border-app-primary'}
            placeholder:text-gray-400 focus:outline-none`}
          {...props}
        />
      </div>

      {error ? (
        <p className="mt-1 text-xs text-app-error">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-app-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
