import React from 'react';

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 focus:ring-blue-500',
    secondary: 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 hover:-translate-y-0.5 focus:ring-blue-500',
    outline: 'border border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-blue-300 hover:-translate-y-0.5 focus:ring-blue-500',
    ghost: 'text-gray-900 hover:bg-gray-100/80 focus:ring-blue-500',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5 focus:ring-red-500',
    glass: 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 focus:ring-white/50',
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2.5 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : children}
    </button>
  );
};

export default Button;