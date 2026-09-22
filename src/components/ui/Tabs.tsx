/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'orange' | 'dark' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'dark',
  className = '',
}) => {
  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        let activeClass = 'bg-slate-900 text-white shadow-xs';
        let inactiveClass = 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-100';

        if (variant === 'orange') {
          activeClass = 'bg-orange-600 text-white shadow-xs';
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              isActive ? activeClass : inactiveClass
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? variant === 'orange'
                      ? 'bg-orange-700 text-orange-100'
                      : 'bg-slate-800 text-slate-200'
                    : 'bg-slate-50 text-slate-400 border border-slate-100'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
