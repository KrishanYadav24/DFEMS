import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({
  activePage,
  onNavigate,
  currentUser,
  onRoleChange,
  children,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-app-bg text-app-text">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        currentUser={currentUser}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          activePage={activePage}
          onToggleMobile={() => setIsMobileOpen((prev) => !prev)}
          currentUser={currentUser}
          onRoleChange={onRoleChange}
        />

        <main className="flex-1 p-4 sm:p-7 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
