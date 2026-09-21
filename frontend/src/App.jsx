import React, { useState, useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CasesPage from './pages/CasesPage';
import EvidencePage from './pages/EvidencePage';
import CustodyPage from './pages/CustodyPage';
import ForensicAnalysisPage from './pages/ForensicAnalysisPage';
import AnalyticsDbmsPage from './pages/AnalyticsDbmsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UserManagementPage from './pages/UserManagementPage';

import { authService } from './services/authService';
import { caseService } from './services/caseService';
import { evidenceService } from './services/evidenceService';
import { custodyService } from './services/custodyService';

import {
  INITIAL_USERS,
  INITIAL_CASES,
  INITIAL_EVIDENCE,
  INITIAL_CUSTODY,
  INITIAL_ANALYSES,
  INITIAL_STALE_ALERTS,
  INITIAL_AUDIT_LOGS,
} from './services/placeholderData';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  // Navigation State
  const [activePage, setActivePage] = useState('dashboard');

  // Application Data State
  const [users, setUsers] = useState(INITIAL_USERS);
  const [cases, setCases] = useState(INITIAL_CASES);
  const [evidence, setEvidence] = useState(INITIAL_EVIDENCE);
  const [custody, setCustody] = useState(INITIAL_CUSTODY);
  const [analyses, setAnalyses] = useState(INITIAL_ANALYSES);
  const [staleAlerts] = useState(INITIAL_STALE_ALERTS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Listen for session expiry from API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    window.addEventListener('dfems_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('dfems_auth_expired', handleAuthExpired);
  }, []);

  // Restore profile if token exists but user profile is not hydrated
  useEffect(() => {
    if (isAuthenticated && !currentUser) {
      authService.fetchProfile().then((user) => {
        if (user) {
          setCurrentUser(user);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }).catch(() => {
        setIsAuthenticated(false);
        setCurrentUser(null);
      });
    }
  }, [isAuthenticated, currentUser]);

  // Sync cases & evidence from Oracle when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      caseService.getCases().then((data) => {
        if (data && data.length > 0) setCases(data);
      }).catch(() => {});

      evidenceService.getEvidence().then((data) => {
        if (data && data.length > 0) setEvidence(data);
      }).catch(() => {});

      custodyService.getCustody().then((data) => {
        if (data && data.length > 0) setCustody(data);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  // Login Handler
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActivePage('dashboard');
  };

  // Logout Handler
  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // State Mutators with Audit Trail Logging
  const handleAddCase = (newCase) => {
    setCases((prev) => [newCase, ...prev]);
    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser?.username || 'user',
      role: currentUser?.role || 'Investigator',
      eventType: 'CASE_REGISTERED',
      ip: '127.0.0.1',
      details: `Created Case #${newCase.id} titled "${newCase.title}" (${newCase.crimeType})`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleAddEvidence = (newEvidence) => {
    setEvidence((prev) => [newEvidence, ...prev]);

    // Automatically append initial chain of custody event
    const initialCustodyEvent = {
      id: custody.length + 1,
      evidenceId: newEvidence.id,
      evidenceDesc: newEvidence.description,
      caseTitle: newEvidence.caseTitle || `Case #${newEvidence.caseId}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'Seized and intake logged',
      actor: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'Investigator',
    };
    setCustody((prev) => [initialCustodyEvent, ...prev]);

    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser?.username || 'user',
      role: currentUser?.role || 'Investigator',
      eventType: 'EVIDENCE_SEIZED',
      ip: '127.0.0.1',
      details: `Intake logged for Evidence #${newEvidence.id} (${newEvidence.description}) with SHA-256 fingerprint`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleAddCustodyEvent = (newEvent) => {
    setCustody((prev) => [newEvent, ...prev]);

    // If this transfer changed evidence lifecycle status, update evidence table
    if (newEvent.newStatus) {
      setEvidence((prev) =>
        prev.map((e) =>
          e.id === newEvent.evidenceId ? { ...e, status: newEvent.newStatus } : e
        )
      );
    }

    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser?.username || 'user',
      role: currentUser?.role || 'Evidence Custodian',
      eventType: 'CUSTODY_TRANSFERRED',
      ip: '127.0.0.1',
      details: `Transferred Evidence #${newEvent.evidenceId} - "${newEvent.action}"`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleAddAnalysis = (newAnalysis) => {
    setAnalyses((prev) => [newAnalysis, ...prev]);

    // Automatically reflect 'Under Analysis' in evidence state
    setEvidence((prev) =>
      prev.map((e) =>
        e.id === newAnalysis.evidenceId ? { ...e, status: 'Under Analysis' } : e
      )
    );

    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser?.username || 'user',
      role: currentUser?.role || 'Forensic Examiner',
      eventType: 'ANALYSIS_LOGGED',
      ip: '127.0.0.1',
      details: `Examination findings filed for Evidence #${newAnalysis.evidenceId}`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleAddUser = (newUser) => {
    setUsers((prev) => [newUser, ...prev]);
    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser?.username || 'admin',
      role: currentUser?.role || 'Admin',
      eventType: 'USER_PROVISIONED',
      ip: '127.0.0.1',
      details: `Provisioned ${newUser.role} credentials for ${newUser.firstName} ${newUser.lastName}`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  // If not authenticated, show professional Login Gateway
  if (!isAuthenticated || !currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {activePage === 'dashboard' && (
        <DashboardPage
          cases={cases}
          evidence={evidence}
          custody={custody}
          staleAlerts={staleAlerts}
          onNavigate={setActivePage}
        />
      )}

      {activePage === 'cases' && (
        <CasesPage
          cases={cases}
          users={users}
          currentUser={currentUser}
          onAddCase={handleAddCase}
        />
      )}

      {activePage === 'evidence' && (
        <EvidencePage
          evidence={evidence}
          cases={cases}
          currentUser={currentUser}
          onAddEvidence={handleAddEvidence}
        />
      )}

      {activePage === 'custody' && (
        <CustodyPage
          custody={custody}
          evidence={evidence}
          currentUser={currentUser}
          onAddCustodyEvent={handleAddCustodyEvent}
        />
      )}

      {activePage === 'analysis' && (
        <ForensicAnalysisPage
          analyses={analyses}
          evidence={evidence}
          users={users}
          onAddAnalysis={handleAddAnalysis}
        />
      )}

      {activePage === 'analytics' && (
        <AnalyticsDbmsPage />
      )}

      {activePage === 'reports' && (
        <ReportsPage
          cases={cases}
          evidence={evidence}
          custody={custody}
          analyses={analyses}
          currentUser={currentUser}
        />
      )}

      {activePage === 'audit' && (
        <AuditLogsPage
          auditLogs={auditLogs}
          currentUser={currentUser}
        />
      )}

      {activePage === 'users' && (
        <UserManagementPage
          users={users}
          onAddUser={handleAddUser}
        />
      )}
    </AppLayout>
  );
}
