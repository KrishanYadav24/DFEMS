import React from 'react';
import { Menu, Database, Shield, ChevronRight, UserCircle2 } from 'lucide-react';

export default function Topbar({
  onToggleMobile,
  activePage,
  currentUser,
  onRoleChange,
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

  const roles = [
    'Admin',
    'Investigator',
    'Forensic Examiner',
    'Evidence Custodian',
    'Legal Reviewer',
    'Auditor',
  ];

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

      {/* Right: Status badges, Demo role switcher, Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Development Placeholder Banner (Honesty Requirement) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] text-blue-800 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>Frontend Foundation Mode (Phase 1)</span>
        </div>

        {/* Oracle DB Connection Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
          <Database className="w-3 h-3 text-emerald-600" />
          <span>Oracle 26ai: <span className="font-mono font-semibold">dfems_user</span></span>
        </div>

        {/* Live Demo Role Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
          <Shield className="w-3.5 h-3.5 text-app-muted shrink-0" />
          <span className="text-[11px] font-medium text-app-muted hidden sm:inline">Role:</span>
          <select
            value={currentUser?.role || 'Admin'}
            onChange={(e) => onRoleChange(e.target.value)}
            className="text-xs font-semibold bg-transparent border-none text-app-text focus:outline-none cursor-pointer pr-1"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-app-border">
          <UserCircle2 className="w-7 h-7 text-gray-400" />
        </div>
      </div>
    </header>
  );
}
