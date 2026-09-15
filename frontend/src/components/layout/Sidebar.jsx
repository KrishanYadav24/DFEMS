import React from 'react';
import { 
  LayoutDashboard, 
  FolderLock, 
  HardDrive, 
  Link2, 
  Microscope, 
  Database, 
  FileText, 
  ShieldAlert, 
  Users, 
  X,
  Server
} from 'lucide-react';

export default function Sidebar({
  activePage,
  onNavigate,
  currentUser,
  isMobileOpen,
  onCloseMobile,
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Investigator', 'Forensic Examiner', 'Evidence Custodian', 'Legal Reviewer', 'Auditor'] },
    { id: 'cases', label: 'Cases & Assignments', icon: FolderLock, roles: ['Admin', 'Investigator', 'Legal Reviewer'] },
    { id: 'evidence', label: 'Evidence Vault', icon: HardDrive, roles: ['Admin', 'Investigator', 'Forensic Examiner', 'Evidence Custodian', 'Legal Reviewer'] },
    { id: 'custody', label: 'Chain of Custody', icon: Link2, roles: ['Admin', 'Investigator', 'Forensic Examiner', 'Evidence Custodian', 'Legal Reviewer', 'Auditor'] },
    { id: 'analysis', label: 'Forensic Lab', icon: Microscope, roles: ['Admin', 'Forensic Examiner'] },
    { id: 'analytics', label: 'DBMS Demo Console', icon: Database, roles: ['Admin', 'Investigator', 'Forensic Examiner', 'Auditor'], badge: 'SQL' },
    { id: 'reports', label: 'Court Reports & PDF', icon: FileText, roles: ['Admin', 'Investigator', 'Legal Reviewer', 'Auditor'] },
    { id: 'audit', label: 'System Audit Logs', icon: ShieldAlert, roles: ['Admin', 'Auditor'] },
    { id: 'users', label: 'User Directory', icon: Users, roles: ['Admin'] },
  ];

  // Filter items by role
  const userRole = currentUser?.role || 'Admin';
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  const content = (
    <div className="flex flex-col h-full bg-app-sidebar text-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-app-primary flex items-center justify-center font-bold text-base shadow-sm">
            DF
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">DFEMS</h1>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-medium">Forensic Vault</p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Database Target Indicator */}
      <div className="px-5 py-3 border-b border-gray-800/80 bg-gray-950/40">
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate">Oracle 26ai: <span className="text-gray-300 font-mono">FREEPDB1</span></span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Core Workflows
        </div>

        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-app-primary text-white shadow-xs'
                  : 'text-gray-300 hover:bg-app-sidebarHover hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-200">
            {currentUser?.firstName?.[0] || 'U'}{currentUser?.lastName?.[0] || ''}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-[11px] text-gray-400 truncate capitalize">
              {currentUser?.role || 'Guest'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed 248px) */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 border-r border-gray-800 z-30">
        {content}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
