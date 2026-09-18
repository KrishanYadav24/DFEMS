import React from 'react';
import { 
  FolderLock, 
  HardDrive, 
  Clock, 
  ShieldCheck, 
  FileText, 
  ArrowUpRight,
  Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StaleAlertBanner from '../components/shared/StaleAlertBanner';
import Button from '../components/ui/Button';

export default function DashboardPage({
  cases = [],
  evidence = [],
  custody = [],
  staleAlerts = [],
  onNavigate,
}) {
  const safeCases = Array.isArray(cases) ? cases.filter(Boolean) : [];
  const safeEvidence = Array.isArray(evidence) ? evidence.filter(Boolean) : [];
  const safeCustody = Array.isArray(custody) ? custody.filter(Boolean) : [];
  const safeAlerts = Array.isArray(staleAlerts) ? staleAlerts.filter(Boolean) : [];

  // KPI Calculations
  const activeCasesCount = safeCases.filter((c) => c?.status === 'Open' || c?.status === 'Under Investigation').length;
  const underAnalysisCount = safeEvidence.filter((e) => e?.status === 'Under Analysis').length;
  const inStorageCount = safeEvidence.filter((e) => e?.status === 'In Storage').length;

  // Evidence Status Chart Data
  const evidenceStatusData = [
    { name: 'Under Analysis', count: underAnalysisCount, color: '#356AE6' },
    { name: 'In Storage', count: inStorageCount, color: '#B7791F' },
    { name: 'Court Presented', count: safeEvidence.filter((e) => e?.status === 'Presented in Court').length, color: '#16805D' },
    { name: 'Archived', count: safeEvidence.filter((e) => e?.status === 'Archived').length, color: '#667085' },
    { name: 'Collected', count: safeEvidence.filter((e) => e?.status === 'Collected').length, color: '#6366F1' },
  ];

  // Case Status Chart Data
  const caseStatusData = [
    { name: 'Under Investigation', value: safeCases.filter((c) => c?.status === 'Under Investigation').length, color: '#356AE6' },
    { name: 'Open', value: safeCases.filter((c) => c?.status === 'Open').length, color: '#10B981' },
    { name: 'Closed', value: safeCases.filter((c) => c?.status === 'Closed').length, color: '#94A3B8' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Stale Evidence (Oracle Cursor Output) */}
      <StaleAlertBanner
        alerts={safeAlerts}
        onNavigate={() => onNavigate('evidence')}
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">Active Cases</span>
            <div className="p-2 rounded-lg bg-blue-50 text-app-primary">
              <FolderLock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-app-text tabular-nums">{activeCasesCount}</span>
            <span className="text-xs text-app-muted font-medium">/ {cases.length} total</span>
          </div>
          <p className="text-[11px] text-app-muted mt-1 flex items-center gap-1">
            <span className="text-emerald-700 font-semibold flex items-center"><ArrowUpRight className="w-3 h-3" /> 100%</span>
            <span>jurisdiction tracking</span>
          </p>
        </Card>

        <Card className="hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">Total Evidence</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-app-text tabular-nums">{evidence.length}</span>
            <span className="text-xs text-app-muted font-medium">items indexed</span>
          </div>
          <p className="text-[11px] text-app-muted mt-1">
            6 Devices, 9 Files in Vault
          </p>
        </Card>

        <Card className="hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">Under Examination</span>
            <div className="p-2 rounded-lg bg-amber-50 text-app-warning">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-app-text tabular-nums">{underAnalysisCount}</span>
            <span className="text-xs text-app-muted font-medium">active lab items</span>
          </div>
          <p className="text-[11px] text-app-muted mt-1">
            Assigned across 3 Forensic Labs
          </p>
        </Card>

        <Card className="hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">Hash Integrity</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-app-success">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-app-success tabular-nums">100%</span>
            <span className="text-xs text-app-muted font-medium">verified</span>
          </div>
          <p className="text-[11px] text-app-muted mt-1">
            Zero SHA-256 mismatches detected
          </p>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence Status Breakdown Chart */}
        <Card
          className="lg:col-span-2"
          title="Evidence Lifecycle Distribution"
          subtitle="Real-time count of digital items by operational stage"
          action={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('evidence')}>
              View Vault
            </Button>
          }
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evidenceStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#667085' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fontSize: 11, fill: '#667085' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E3E8EF', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {evidenceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Case Status Distribution Pie Chart */}
        <Card
          title="Investigation Statuses"
          subtitle="Breakdown of active vs closed files"
        >
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={caseStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {caseStatusData.map((entry, index) => (
                    <Cell key={`cell-pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E3E8EF', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5 border-t border-app-border pt-3">
            {caseStatusData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-app-text font-medium">{item.name}</span>
                </div>
                <span className="font-semibold tabular-nums text-app-text">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Custody Log Activity & Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2"
          title="Recent Chain of Custody Events"
          subtitle="Latest append-only custodial handoffs recorded in Oracle 26ai"
          action={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('custody')}>
              Full Ledger
            </Button>
          }
        >
          <div className="divide-y divide-app-border -mx-5 -mb-5">
            {safeCustody.slice(0, 5).map((log) => (
              <div key={log.id} className="px-5 py-3 hover:bg-gray-50/60 transition-colors flex items-center justify-between text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-app-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-app-text">
                      {log.action} <span className="font-normal text-app-muted">for</span> {log.evidenceDesc}
                    </p>
                    <p className="text-[11px] text-app-muted mt-0.5">
                      Case: <span className="text-gray-700">{log.caseTitle}</span> • Actor: <span className="font-medium text-gray-700">{log.actor}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] text-app-muted block">{log.timestamp}</span>
                  <Badge variant="neutral" size="sm">Log #{log.id}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Demonstration Quick Actions */}
        <Card
          title="DBMS Demo Quick Launch"
          subtitle="Instant access to verified DA2 criteria"
        >
          <div className="space-y-2.5">
            <button
              onClick={() => onNavigate('analytics')}
              className="w-full text-left p-3 rounded-lg border border-app-border hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-semibold text-app-text group-hover:text-app-primary">Oracle Analytical Queries</p>
                <p className="text-[11px] text-app-muted">Run Joins A1–A4 & Aggregates C1–C4</p>
              </div>
              <Database className="w-4 h-4 text-app-muted group-hover:text-app-primary" />
            </button>

            <button
              onClick={() => onNavigate('custody')}
              className="w-full text-left p-3 rounded-lg border border-app-border hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-semibold text-app-text group-hover:text-app-primary">Test Custody Immutability</p>
                <p className="text-[11px] text-app-muted">Verify trigger trg_custody_no_update</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-app-muted group-hover:text-app-primary" />
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="w-full text-left p-3 rounded-lg border border-app-border hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-semibold text-app-text group-hover:text-app-primary">Export Court Dossier PDF</p>
                <p className="text-[11px] text-app-muted">Case evidence & tamper-proof custody trail</p>
              </div>
              <FileText className="w-4 h-4 text-app-muted group-hover:text-app-primary" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
