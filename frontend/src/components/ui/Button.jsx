import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon = null,
  iconPosition = 'left',
  onClick,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-4 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-app-primary text-white hover:bg-app-primaryHover focus:ring-app-primary shadow-sm',
    secondary: 'bg-white text-app-text border border-app-border hover:bg-gray-50 focus:ring-app-primary shadow-sm',
    danger: 'bg-app-error text-white hover:bg-red-700 focus:ring-app-error shadow-sm',
    warning: 'bg-app-warning text-white hover:bg-amber-700 focus:ring-app-warning shadow-sm',
    ghost: 'text-app-muted hover:text-app-text hover:bg-gray-100 focus:ring-gray-300',
    outline: 'border border-app-primary text-app-primary hover:bg-blue-50 focus:ring-app-primary',
  };

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    return <Icon className="w-4 h-4" />;
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : iconPosition === 'left' ? (
        renderIcon()
      ) : null}

      {children != null && <span>{children}</span>}

      {!loading && iconPosition === 'right' ? (
        renderIcon()
      ) : null}
    </button>
  );
}
