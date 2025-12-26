import React from 'react';

const Card = ({
  children,
  title,
  subtitle,
  className = '',
  padding = true,
  hover = false,
  glass = true,
  animate = false,
  multiline,      // Extract to prevent passing to DOM
  jsx,           // Extract to prevent passing to DOM
  headerAction,  // Extract to prevent passing to DOM
  ...props       // Only spread safe props
}) => {
  const baseClasses = glass
    ? 'bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-lg'
    : 'bg-white rounded-lg border border-gray-200';

  const hoverClasses = hover
    ? 'hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer'
    : 'transition-shadow duration-300';

  const animateClasses = animate ? 'animate-scale-in' : '';

  return (
    <div
      className={`
        ${baseClasses}
        ${hoverClasses}
        ${animateClasses}
        ${padding ? 'p-6' : ''}
        ${className}
      `}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
            </div>
            {headerAction && (
              <div className="flex-shrink-0 ml-4">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;