import React from 'react';
import { Menu, Database, Shield, ChevronRight, UserCircle2, LogOut } from 'lucide-react';

export default function Topbar({
  onToggleMobile,
  activePage,
  currentUser,
  onLogout,
}) {
  const pageTitles = {
    dashboard: 'Operational Dashboard',
    cases: 'Case Management & Assignments',
    evidence: 'Evidence Vault & Registry',
    custody: 'Chain of Custody Ledger',
    analysis: 'Forensic Lab Examination',
    analytics: 'Oracle DBMS Live Query Console',
    reports: 'Court-Admissible PDF Reports',
    audit: 'System Security & Audit Logs',
    users: 'User & Access Administration',
  };

  const displayName = currentUser?.firstName && currentUser?.lastName
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : (currentUser?.username || 'User');

  return (
    <header className="h-16 bg-app-surface border-b border-app-border sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8">
      {/* Left: Mobile trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobile}
          className="md:hidden p-1.5 rounded-lg text-app-muted hover:bg-gray-100 hover:text-app-text"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-app-muted">
          <span className="font-medium text-gray-500">DFEMS</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-app-text">
            {pageTitles[activePage] || activePage}
          </span>
        </div>
      </div>

      {/* Right: Status badges, Real user info, Logout button */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Oracle DB Connection Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
          <Database className="w-3 h-3 text-emerald-600" />
          <span>Oracle 26ai: <span className="font-mono font-semibold">FREEPDB1</span></span>
        </div>

        {/* User Identity & Role Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-gray-50 border border-gray-200">
          <UserCircle2 className="w-5 h-5 text-gray-600" />
          <div className="text-left">
            <div className="text-xs font-semibold text-gray-900 leading-tight">
              {displayName}
            </div>
            <div className="text-[10px] text-gray-500 font-medium leading-none flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-blue-600" />
              <span>{currentUser?.role || 'User'}</span>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Log out of DFEMS"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
