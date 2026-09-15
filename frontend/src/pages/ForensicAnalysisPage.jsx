import React, { useState } from 'react';
import { Plus, Microscope, Award, Building2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';

export default function ForensicAnalysisPage({
  analyses = [],
  evidence = [],
  users = [],
  onAddAnalysis,
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [targetEvidenceId, setTargetEvidenceId] = useState('1');
  const [analystId, setAnalystId] = useState('5');
  const [findings, setFindings] = useState('');
  const [formError, setFormError] = useState('');

  const examiners = users.filter((u) => u.role === 'Forensic Examiner');

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!findings.trim()) {
      setFormError('Forensic findings cannot be empty.');
      return;
    }

    const item = evidence.find((ev) => String(ev.id) === String(targetEvidenceId));
    const examiner = users.find((u) => String(u.id) === String(analystId));

    const newAnalysis = {
      id: analyses.length + 1,
      evidenceId: Number(targetEvidenceId),
      evidenceDesc: item ? item.description : 'Unknown Evidence',
      analyst: examiner ? `${examiner.firstName} ${examiner.lastName}` : 'Examiner',
      cert: examiner ? examiner.cert : 'EnCE',
      lab: examiner ? examiner.lab : 'Central Forensic Science Laboratory',
      findings: findings.trim(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    onAddAnalysis(newAnalysis, targetEvidenceId);
    setIsAddOpen(false);
    setFindings('');
    setFormError('');
  };

  const columns = [
    {
      header: 'Analysis ID',
      field: 'id',
      className: 'w-24',
      render: (row) => <span className="font-mono font-medium text-app-muted">FA-#{row.id}</span>,
    },
    {
      header: 'Evidence Item',
      field: 'evidenceDesc',
      className: 'min-w-[200px]',
      render: (row) => (
        <div>
          <span className="font-semibold text-app-text block">{row.evidenceDesc}</span>
          <span className="text-[11px] text-app-muted">Evidence #{row.evidenceId}</span>
        </div>
      ),
    },
    {
      header: 'Forensic Findings',
      field: 'findings',
      className: 'min-w-[280px]',
      render: (row) => (
        <p className="text-xs text-gray-800 leading-relaxed font-normal bg-gray-50/60 p-2 rounded border border-gray-100">
          {row.findings}
        </p>
      ),
    },
    {
      header: 'Analyst & Credentials',
      field: 'analyst',
      render: (row) => (
        <div>
          <span className="font-medium text-app-text flex items-center gap-1.5">
            <Microscope className="w-3.5 h-3.5 text-app-primary" />
            {row.analyst}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1">
            <Award className="w-3 h-3 text-emerald-600" />
            {row.cert}
          </span>
        </div>
      ),
    },
    {
      header: 'Laboratory',
      field: 'lab',
      render: (row) => (
        <span className="text-app-muted flex items-center gap-1 text-[11px]">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[160px]">{row.lab}</span>
        </span>
      ),
    },
    {
      header: 'Timestamp',
      field: 'timestamp',
      className: 'tabular-nums text-app-muted font-mono text-[11px]',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Forensic Laboratory Examination"
        subtitle="Digital extractions, memory dump analyses, and examiner findings in Oracle 26ai"
        actions={
          <Button icon={Plus} onClick={() => setIsAddOpen(true)}>
            Log Examination Findings
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={analyses}
        keyField="id"
        searchPlaceholder="Search findings, analyst, or evidence..."
        searchKeys={['findings', 'analyst', 'evidenceDesc', 'lab']}
      />

      {/* Add Findings Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Forensic Examination Findings"
        subtitle="Executes PL/SQL procedure sp_add_analysis and updates evidence status to 'Under Analysis'"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit}>
              Commit Findings to Oracle
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Select
            label="Evidence Item Being Examined"
            required
            value={targetEvidenceId}
            onChange={(e) => setTargetEvidenceId(e.target.value)}
            options={evidence.map((ev) => ({
              value: ev.id,
              label: `Evidence #${ev.id}: ${ev.description} (${ev.status})`,
            }))}
          />

          <Select
            label="Certified Forensic Analyst"
            required
            value={analystId}
            onChange={(e) => setAnalystId(e.target.value)}
            options={examiners.map((ex) => ({
              value: ex.id,
              label: `${ex.firstName} ${ex.lastName} (${ex.cert})`,
            }))}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-app-text block">
              Forensic Findings & Technical Extraction Notes <span className="text-app-error">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="e.g. Memory dump shows ransomware process injection and C2 communication..."
              className="w-full text-xs p-3 rounded-lg border border-app-border focus:ring-2 focus:ring-app-primary/20 focus:border-app-primary outline-none"
            />
            {formError && <p className="text-xs text-app-error">{formError}</p>}
          </div>
        </form>
      </Modal>
    </div>
  );
}
