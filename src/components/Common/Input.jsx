import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  variant = 'default',
  ...props
}, ref) => {
  const variants = {
    default: `
      border border-gray-200 bg-white/80 backdrop-blur-sm
      text-gray-900 placeholder:text-gray-400
      focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
    `,
    glass: `
      bg-white/10 border border-white/20
      text-white placeholder:text-white/60
      focus:ring-2 focus:ring-white/50 focus:border-white/40
    `,
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full rounded-xl px-4 py-2.5
          focus:outline-none transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${error ? 'border-red-500 focus:ring-red-500/20' : ''}
          ${className}
        `}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-2 text-sm ${error ? 'text-red-600' : 'text-gray-600'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;