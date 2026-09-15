import React, { useState } from 'react';
import { ArrowRightLeft, ShieldAlert, AlertOctagon } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';

export default function CustodyPage({
  custody = [],
  evidence = [],
  currentUser,
  onAddCustodyEvent,
}) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('ALL');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [simulatedError, setSimulatedError] = useState(null);

  // Transfer Form State
  const [targetEvidenceId, setTargetEvidenceId] = useState('1');
  const [newStatus, setNewStatus] = useState('In Storage');
  const [reason, setReason] = useState('Returned from initial triage');

  const filteredLogs = custody.filter((log) => {
    if (selectedEvidenceId === 'ALL') return true;
    return String(log.evidenceId) === String(selectedEvidenceId);
  });

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    const item = evidence.find((ev) => String(ev.id) === String(targetEvidenceId));

    const newLog = {
      id: custody.length + 1,
      evidenceId: Number(targetEvidenceId),
      evidenceDesc: item ? item.description : 'Unknown Evidence',
      caseTitle: item ? item.caseTitle : 'General Case',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: `Transfer reason: ${reason}`,
      actor: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Custodian',
    };

    onAddCustodyEvent(newLog, targetEvidenceId, newStatus);
    setIsTransferOpen(false);
    setReason('');
  };

  const handleSimulateDelete = () => {
    setSimulatedError({
      title: 'ORA-20002: Chain of Custody Deletion Prohibited',
      message: 'Trigger trg_custody_no_delete intercepted DELETE request on CHAIN_OF_CUSTODY. Append-only ledger integrity preserved.',
    });
  };

  const handleSimulateUpdate = () => {
    setSimulatedError({
      title: 'ORA-20001: Chain of Custody Alteration Prohibited',
      message: 'Trigger trg_custody_no_update intercepted UPDATE request on CHAIN_OF_CUSTODY. Historical entries are legally immutable.',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chain of Custody Ledger"
        subtitle="Cryptographically sealed, append-only custodial transfer history in Oracle 26ai"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={ShieldAlert}
              onClick={handleSimulateDelete}
            >
              Test DELETE Block (trg_custody_no_delete)
            </Button>
            <Button
              variant="secondary"
              icon={ShieldAlert}
              onClick={handleSimulateUpdate}
            >
              Test UPDATE Block (trg_custody_no_update)
            </Button>
            <Button
              icon={ArrowRightLeft}
              onClick={() => setIsTransferOpen(true)}
            >
              Transfer Custody
            </Button>
          </div>
        }
      />

      {/* Append-Only Notice Banner */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 flex items-start gap-3 text-xs text-blue-900">
        <ShieldAlert className="w-5 h-5 text-app-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Court Admissibility & Trigger Enforced Immutability</p>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            All records below reside in <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">CHAIN_OF_CUSTODY</code>. 
            Under DA2 rules, triggers <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">trg_custody_no_update</code> and <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">trg_custody_no_delete</code> raise custom exceptions on any unauthorized alteration.
          </p>
        </div>
      </div>

      {/* Simulated Trigger Error Feedback Modal / Alert */}
      {simulatedError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-app-error shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-app-error">{simulatedError.title}</p>
              <p className="mt-0.5 text-rose-800">{simulatedError.message}</p>
            </div>
          </div>
          <button
            onClick={() => setSimulatedError(null)}
            className="text-xs text-rose-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Timeline Card */}
      <Card
        title="Chronological Custody Timeline"
        subtitle="View continuous lifecycle custody transfers by item"
        action={
          <div className="w-64">
            <select
              value={selectedEvidenceId}
              onChange={(e) => setSelectedEvidenceId(e.target.value)}
              className="w-full text-xs bg-white border border-app-border rounded-lg p-2 text-app-text focus:ring-2 focus:ring-app-primary/20 outline-none"
            >
              <option value="ALL">All Evidence Items ({evidence.length})</option>
              {evidence.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  Evidence #{ev.id}: {ev.description}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-app-border">
          {filteredLogs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-app-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-app-primary" />
              </div>

              {/* Event Content Box */}
              <div className="bg-gray-50/80 p-4 rounded-xl border border-app-border hover:border-blue-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-app-text">{log.action}</span>
                    <Badge variant="primary" size="sm">Evidence #{log.evidenceId}</Badge>
                  </div>
                  <span className="font-mono text-xs text-app-muted tabular-nums">
                    {log.timestamp}
                  </span>
                </div>

                <div className="pt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-app-muted block">Item:</span>
                    <span className="font-semibold text-gray-800">{log.evidenceDesc}</span>
                  </div>
                  <div>
                    <span className="text-app-muted block">Case Reference:</span>
                    <span className="text-gray-700">{log.caseTitle}</span>
                  </div>
                  <div>
                    <span className="text-app-muted block">Responsible Custodian:</span>
                    <span className="font-semibold text-app-primary">{log.actor}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Transfer Custody Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Evidence Custody"
        subtitle="Executes PL/SQL procedure sp_transfer_custody with transaction boundary protection"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTransferOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransferSubmit}>
              Execute Custody Transfer
            </Button>
          </>
        }
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Select
            label="Target Evidence Item"
            required
            value={targetEvidenceId}
            onChange={(e) => setTargetEvidenceId(e.target.value)}
            options={evidence.map((ev) => ({
              value: ev.id,
              label: `Evidence #${ev.id}: ${ev.description} (${ev.status})`,
            }))}
          />

          <Select
            label="New Lifecycle Status"
            required
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              'In Storage',
              'Under Analysis',
              'Presented in Court',
              'Archived',
              'Disposed',
            ]}
          />

          <Input
            label="Transfer Reason / Custodial Justification"
            required
            placeholder="e.g. Transferred to lab examiner for forensic imaging"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            helperText="Captured in CHAIN_OF_CUSTODY.Action via sp_transfer_custody"
          />
        </form>
      </Modal>
    </div>
  );
}
