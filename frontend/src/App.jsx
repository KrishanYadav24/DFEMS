import React, { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CasesPage from './pages/CasesPage';
import EvidencePage from './pages/EvidencePage';
import CustodyPage from './pages/CustodyPage';
import ForensicAnalysisPage from './pages/ForensicAnalysisPage';
import AnalyticsDbmsPage from './pages/AnalyticsDbmsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UserManagementPage from './pages/UserManagementPage';

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
  // Navigation & Role State
  const [activePage, setActivePage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState({
    id: 9,
    firstName: 'Vikram',
    lastName: 'Shah',
    username: 'vikram.shah',
    role: 'Admin',
  });

  // Central Application State
  const [users, setUsers] = useState(INITIAL_USERS);
  const [cases, setCases] = useState(INITIAL_CASES);
  const [evidence, setEvidence] = useState(INITIAL_EVIDENCE);
  const [custody, setCustody] = useState(INITIAL_CUSTODY);
  const [analyses, setAnalyses] = useState(INITIAL_ANALYSES);
  const [staleAlerts] = useState(INITIAL_STALE_ALERTS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Role Switcher Handler
  const handleRoleChange = (newRole) => {
    // Select an appropriate sample user for that role
    const matchedUser = users.find((u) => u.role === newRole) || {
      id: 99,
      firstName: 'Demo',
      lastName: newRole,
      username: `demo.${newRole.toLowerCase().replace(/\s+/g, '_')}`,
      role: newRole,
    };

    setCurrentUser({
      ...matchedUser,
      role: newRole,
    });

    // Log the role elevation/switch into immutable audit trail
    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.username,
      role: newRole,
      eventType: 'ROLE_SWITCHED',
      ip: '127.0.0.1 (Demo Session)',
      details: `Active role profile switched to ${newRole} for demonstration inspection`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  // State Mutators with Audit Trail Logging
  const handleAddCase = (newCase) => {
    setCases((prev) => [newCase, ...prev]);
    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.username,
      role: currentUser.role,
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
      actor: `${currentUser.firstName} ${currentUser.lastName}`,
    };
    setCustody((prev) => [initialCustodyEvent, ...prev]);

    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.username,
      role: currentUser.role,
      eventType: 'EVIDENCE_REGISTERED',
      ip: '127.0.0.1',
      details: `Intake registered for Evidence #${newEvidence.id} (${newEvidence.type}) with SHA-256 digest ${newEvidence.hash.substring(0, 16)}...`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleAddCustodyEvent = (newEvent) => {
    setCustody((prev) => [newEvent, ...prev]);

    // Update status in evidence table
    setEvidence((prev) =>
      prev.map((e) =>
        e.id === newEvent.evidenceId ? { ...e, status: newEvent.action } : e
      )
    );

    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.username,
      role: currentUser.role,
      eventType: 'CUSTODY_TRANSFER',
      ip: '127.0.0.1',
      details: `Chain of custody transfer: EV-${newEvent.evidenceId} -> ${newEvent.action} by ${newEvent.actor}`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleAddAnalysis = (newAnalysis) => {
    setAnalyses((prev) => [newAnalysis, ...prev]);

    // Update evidence status to Under Analysis
    setEvidence((prev) =>
      prev.map((e) =>
        e.id === newAnalysis.evidenceId ? { ...e, status: 'Under Analysis' } : e
      )
    );

    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.username,
      role: currentUser.role,
      eventType: 'ANALYSIS_RECORDED',
      ip: '127.0.0.1',
      details: `Examiner findings recorded for EV-${newAnalysis.evidenceId} by ${newAnalysis.analyst} (${newAnalysis.cert})`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const handleAddUser = (newUser) => {
    setUsers((prev) => [...prev, newUser]);
    const auditEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.username,
      role: currentUser.role,
      eventType: 'USER_PERMISSION_MODIFIED',
      ip: '127.0.0.1',
      details: `Authorized new personnel ${newUser.firstName} ${newUser.lastName} with role ${newUser.role}`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      currentUser={currentUser}
      onRoleChange={handleRoleChange}
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
          onAddCase={handleAddCase}
        />
      )}

      {activePage === 'evidence' && (
        <EvidencePage
          evidence={evidence}
          cases={cases}
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
        />
      )}

      {activePage === 'audit' && (
        <AuditLogsPage
          auditLogs={auditLogs}
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
