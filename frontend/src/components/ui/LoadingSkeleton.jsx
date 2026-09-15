import React from 'react';

export default function LoadingSkeleton({
  lines = 4,
  height = 'h-4',
  className = '',
}) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`bg-gray-200 rounded ${height}`}
          style={{ width: `${Math.max(40, 100 - idx * 15)}%` }}
        />
      ))}
    </div>
  );
}
