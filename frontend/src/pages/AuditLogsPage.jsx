import React, { useState, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { 
  Search, 
  Download, 
  Activity, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye
} from 'lucide-react';

export default function AuditLogsPage({ auditLogs = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch = 
        log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip.includes(searchTerm);
      
      const matchesEvent = eventFilter === 'ALL' || log.eventType === eventFilter;
      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [auditLogs, searchTerm, eventFilter, statusFilter]);

  // Statistics
  const totalEvents = auditLogs.length;
  const failedLogins = auditLogs.filter((l) => l.eventType === 'LOGIN_FAILED').length;
  const blockedTampers = auditLogs.filter((l) => l.status === 'BLOCKED').length;
  const hashVerifications = auditLogs.filter((l) => l.eventType === 'HASH_VERIFIED').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success" size="sm">SUCCESS</Badge>;
      case 'DENIED':
        return <Badge variant="danger" size="sm">DENIED</Badge>;
      case 'BLOCKED':
        return <Badge variant="danger" size="sm">BLOCKED BY TRIGGER</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getEventBadge = (eventType) => {
    if (eventType.includes('LOGIN')) return <Badge variant="outline" size="sm">{eventType}</Badge>;
    if (eventType.includes('TAMPER')) return <Badge variant="danger" size="sm">{eventType}</Badge>;
    if (eventType.includes('HASH')) return <Badge variant="success" size="sm">{eventType}</Badge>;
    if (eventType.includes('CUSTODY')) return <Badge variant="primary" size="sm">{eventType}</Badge>;
    return <Badge variant="secondary" size="sm">{eventType}</Badge>;
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-xs text-dfems-text-secondary whitespace-nowrap">
          {log.timestamp}
        </span>
      ),
    },
    {
      header: 'Event Classification',
      accessor: 'eventType',
      sortable: true,
      render: (log) => getEventBadge(log.eventType),
    },
    {
      header: 'Principal / Actor',
      accessor: 'actor',
      sortable: true,
      render: (log) => (
        <div>
          <div className="font-medium text-xs text-dfems-text-primary font-mono">{log.actor}</div>
          <div className="text-[11px] text-dfems-text-secondary">{log.role || 'System'}</div>
        </div>
      ),
    },
    {
      header: 'IP Address',
      accessor: 'ip',
      render: (log) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {log.ip}
        </span>
      ),
    },
    {
      header: 'Outcome',
      accessor: 'status',
      sortable: true,
      render: (log) => getStatusBadge(log.status),
    },
    {
      header: 'Audit Telemetry & Details',
      accessor: 'details',
      render: (log) => (
        <div className="text-xs text-dfems-text-secondary max-w-md truncate" title={log.details}>
          {log.details}
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: 'actions',
      render: (log) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => setSelectedLog(log)}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Audit & Access Logs"
        subtitle="Cryptographically verified access telemetry, trigger security enforcement, and authentication monitoring"
        breadcrumbs={[
          { label: 'DFEMS', href: '#' },
          { label: 'Security Audit' }
        ]}
        actions={
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `dfems_audit_telemetry_${Date.now()}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
          >
            Export Audit Stream
          </Button>
        }
      />

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-dfems-primary rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-dfems-text-primary">{totalEvents}</div>
            <div className="text-xs text-dfems-text-secondary font-medium">Total Logged Telemetry Events</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-dfems-error rounded-lg">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-dfems-text-primary">{failedLogins}</div>
            <div className="text-xs text-dfems-text-secondary font-medium">Failed Authentication Denials</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-dfems-text-primary">{blockedTampers}</div>
            <div className="text-xs text-dfems-text-secondary font-medium">Trigger-Blocked Tamper Attempts</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-dfems-success rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-dfems-text-primary">{hashVerifications}</div>
            <div className="text-xs text-dfems-text-secondary font-medium">Integrity Verifications Executed</div>
          </div>
        </Card>
      </div>

      {/* Filter and Query Bar */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search by actor, IP, event, details..."
            icon={<Search className="w-4 h-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Event Classifications' },
              { value: 'LOGIN_SUCCESS', label: 'LOGIN_SUCCESS' },
              { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED' },
              { value: 'EVIDENCE_ACCESSED', label: 'EVIDENCE_ACCESSED' },
              { value: 'HASH_VERIFIED', label: 'HASH_VERIFIED' },
              { value: 'CUSTODY_TRANSFER', label: 'CUSTODY_TRANSFER' },
              { value: 'TAMPER_PREVENTION_TRIGGERED', label: 'TAMPER_PREVENTION_TRIGGERED' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Outcome States' },
              { value: 'SUCCESS', label: 'SUCCESS' },
              { value: 'DENIED', label: 'DENIED' },
              { value: 'BLOCKED', label: 'BLOCKED' },
            ]}
          />
        </div>
      </Card>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        keyField="id"
        emptyMessage="No audit log events match the query filters."
      />

      {/* Audit Event Detail Inspection Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Telemetry Record Inspection"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-dfems-border">
              <div>
                <span className="text-dfems-text-secondary font-semibold uppercase text-[10px]">Event Log ID</span>
                <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">AUDIT-{selectedLog.id}</p>
              </div>
              <div>
                <span className="text-dfems-text-secondary font-semibold uppercase text-[10px]">Timestamp (UTC+5:30)</span>
                <p className="font-mono text-slate-800 mt-0.5">{selectedLog.timestamp}</p>
              </div>
              <div>
                <span className="text-dfems-text-secondary font-semibold uppercase text-[10px]">Principal / Actor</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedLog.actor} ({selectedLog.role})</p>
              </div>
              <div>
                <span className="text-dfems-text-secondary font-semibold uppercase text-[10px]">Client Origin IP</span>
                <p className="font-mono text-slate-800 mt-0.5">{selectedLog.ip}</p>
              </div>
              <div>
                <span className="text-dfems-text-secondary font-semibold uppercase text-[10px]">Outcome Classification</span>
                <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
              </div>
              <div>
                <span className="text-dfems-text-secondary font-semibold uppercase text-[10px]">Event Type</span>
                <div className="mt-1">{getEventBadge(selectedLog.eventType)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-dfems-text-secondary mb-1">
                Telemetry Payload & Event Context
              </h4>
              <div className="p-3 bg-slate-900 text-slate-100 rounded-md font-mono text-xs overflow-x-auto">
                <p className="text-emerald-400 mb-2"># Audit Event Verified by Oracle SYS_CONTEXT</p>
                <pre>{JSON.stringify({
                  event_id: selectedLog.id,
                  timestamp: selectedLog.timestamp,
                  actor: selectedLog.actor,
                  role: selectedLog.role,
                  origin_ip: selectedLog.ip,
                  event_type: selectedLog.eventType,
                  status: selectedLog.status,
                  details: selectedLog.details,
                  database_session: "dfems_user@FREEPDB1",
                  oracle_version: "Oracle AI Database 26ai Free",
                  tamper_immutable: true
                }, null, 2)}</pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Close Telemetry Inspection
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
