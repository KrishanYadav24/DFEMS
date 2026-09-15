import React from 'react';

export default function TabGroup({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div className={`flex border-b border-app-border gap-6 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 select-none
              ${isActive ? 'text-app-primary' : 'text-app-muted hover:text-app-text'}
            `}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-app-primary' : 'bg-gray-100 text-app-muted'}`}>
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
