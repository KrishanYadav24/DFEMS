import React from 'react';

export default function Select({
  label = null,
  id,
  value,
  onChange,
  options = [],
  error = null,
  helperText = null,
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  className = '',
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-app-text mb-1.5">
          {label}
          {required && <span className="text-app-error ml-1">*</span>}
        </label>
      )}

      <select
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`block w-full rounded-lg border text-sm transition-colors py-2 px-3 bg-white text-app-text
          ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
          ${error ? 'border-app-error focus:ring-app-error focus:border-app-error' : 'border-app-border focus:ring-2 focus:ring-app-primary/20 focus:border-app-primary'}
          focus:outline-none`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>

      {error ? (
        <p className="mt-1 text-xs text-app-error">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-app-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
