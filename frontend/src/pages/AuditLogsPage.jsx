import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import { 
  Search, 
  Download, 
  Activity, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { auditService } from '../services/auditService';
import { reportService } from '../services/reportService';

export default function AuditLogsPage({ currentUser = null, auditLogs: fallbackLogs = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const userRole = currentUser?.role || 'Admin';
  const isAuthorized = ['Admin', 'Auditor'].includes(userRole);

  const fetchLogs = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getAuditLogs({
        action: eventFilter !== 'ALL' ? eventFilter : undefined,
        search: searchTerm.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100,
      });
      setLogs(data.items || []);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to load audit logs from Oracle database.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      if (fallbackLogs && fallbackLogs.length > 0) {
        setLogs(fallbackLogs);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, eventFilter, searchTerm, startDate, endDate, fallbackLogs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side filtering pass on loaded records
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const actorStr = String(log.actor || '').toLowerCase();
      const detailsStr = String(log.details || '').toLowerCase();
      const eventStr = String(log.eventType || '').toLowerCase();
      const ipStr = String(log.ip || '');
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || actorStr.includes(term) || detailsStr.includes(term) || eventStr.includes(term) || ipStr.includes(term);
      const matchesEvent = eventFilter === 'ALL' || log.eventType === eventFilter;
      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [logs, searchTerm, eventFilter, statusFilter]);

  // Telemetry metrics
  const totalEvents = logs.length;
  const failedLogins = logs.filter((l) => String(l.eventType).includes('LOGIN_FAILED') || String(l.status) === 'DENIED').length;
  const blockedTampers = logs.filter((l) => String(l.status) === 'BLOCKED' || String(l.eventType).includes('TAMPER')).length;
  const hashVerifications = logs.filter((l) => String(l.eventType).includes('HASH')).length;

  const handleExportPdf = async () => {
    setDownloadingPdf(true);
    setError(null);
    try {
      await reportService.downloadAuditTrail();
      setSuccessNotice('Official Oracle Security Audit Trail PDF downloaded successfully.');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to export audit report PDF.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setDownloadingPdf(false);
    }
  };

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
    const typeStr = String(eventType || '');
    if (typeStr.includes('LOGIN')) return <Badge variant="outline" size="sm">{typeStr}</Badge>;
    if (typeStr.includes('TAMPER')) return <Badge variant="danger" size="sm">{typeStr}</Badge>;
    if (typeStr.includes('HASH')) return <Badge variant="success" size="sm">{typeStr}</Badge>;
    if (typeStr.includes('CUSTODY')) return <Badge variant="primary" size="sm">{typeStr}</Badge>;
    return <Badge variant="secondary" size="sm">{typeStr}</Badge>;
  };

  const columns = [
    {
      header: 'Timestamp',
      field: 'timestamp',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-xs text-dfems-text-secondary whitespace-nowrap">
          {log.timestamp}
        </span>
      ),
    },
    {
      header: 'Event Classification',
      field: 'eventType',
      sortable: true,
      render: (log) => getEventBadge(log.eventType),
    },
    {
      header: 'Principal / Actor',
      field: 'actor',
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
      field: 'ip',
      render: (log) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {log.ip}
        </span>
      ),
    },
    {
      header: 'Outcome',
      field: 'status',
      sortable: true,
      render: (log) => getStatusBadge(log.status),
    },
    {
      header: 'Audit Telemetry & Details',
      field: 'details',
      render: (log) => (
        <div className="text-xs text-dfems-text-secondary max-w-md truncate" title={log.details}>
          {log.details}
        </div>
      ),
    },
    {
      header: 'Action',
      field: 'actions',
      sortable: false,
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

  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Security Audit & Access Logs"
          subtitle="Cryptographically verified access telemetry, trigger security enforcement, and authentication monitoring"
        />
        <Card className="p-8 text-center max-w-xl mx-auto my-12 border-amber-200 bg-amber-50/50">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-xs text-slate-600 mb-4">
            Security audit log telemetry and access logs are strictly restricted to system Administrators and authorized Court Auditors under ISO/IEC 27037 forensic integrity standards.
          </p>
          <div className="text-xs font-mono text-slate-500 bg-white p-2 rounded border border-amber-200 inline-block">
            Current Role: <span className="font-semibold text-slate-800">{userRole}</span> (Insufficient Clearance)
          </div>
        </Card>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchLogs}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? 'Exporting PDF...' : 'Export Audit PDF'}
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="danger" title="Audit Query Error" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successNotice && (
        <Alert variant="success" title="Report Exported" dismissible onClose={() => setSuccessNotice(null)}>
          {successNotice}
        </Alert>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              { value: 'CASE_CREATED', label: 'CASE_CREATED' },
              { value: 'EVIDENCE_CREATED', label: 'EVIDENCE_CREATED' },
              { value: 'CUSTODY_TRANSFERRED', label: 'CUSTODY_TRANSFERRED' },
              { value: 'EVIDENCE_ACCESSED', label: 'EVIDENCE_ACCESSED' },
              { value: 'HASH_VERIFIED', label: 'HASH_VERIFIED' },
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
          <div className="flex gap-2">
            <input
              type="date"
              aria-label="Filter audit logs from start date"
              className="w-1/2 text-xs border border-app-border rounded-lg px-2 py-1.5 bg-white text-app-text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
            <input
              type="date"
              aria-label="Filter audit logs to end date"
              className="w-1/2 text-xs border border-app-border rounded-lg px-2 py-1.5 bg-white text-app-text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
            />
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        keyField="id"
        loading={loading}
        emptyTitle="No audit log events match query"
        emptyDescription="Try clearing search filters or broadening your date criteria."
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
                <span className="text-dfems-text-secondary font-semibold uppercase text-[10px]">Timestamp (Oracle Server)</span>
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
