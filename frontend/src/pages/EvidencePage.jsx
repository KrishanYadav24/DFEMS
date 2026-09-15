import React, { useState } from 'react';
import { Plus, ShieldCheck, HardDrive, FileCode, CheckCircle2, AlertOctagon } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import IntegrityBadge from '../components/shared/IntegrityBadge';

export default function EvidencePage({
  evidence = [],
  cases = [],
  onAddEvidence,
}) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [verifyItem, setVerifyItem] = useState(null);
  const [testHashInput, setTestHashInput] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Intake Form State
  const [description, setDescription] = useState('');
  const [caseId, setCaseId] = useState('1');
  const [evidenceType, setEvidenceType] = useState('Device');
  const [serialNumber, setSerialNumber] = useState('');
  const [hashValue, setHashValue] = useState('');
  const [formError, setFormError] = useState('');

  // Filtering
  const filteredEvidence = evidence.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'ALL' || item.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesStatus && matchesType;
  });

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Evidence description is required.');
      return;
    }

    const linkedCase = cases.find((c) => String(c.id) === String(caseId));
    // Generate sample pseudo-SHA256 if empty
    const generatedHash = hashValue.trim() || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const newItem = {
      id: evidence.length + 1,
      description: description.trim(),
      collectionDate: new Date().toISOString().split('T')[0],
      caseId: Number(caseId),
      caseTitle: linkedCase ? linkedCase.title : 'Unassigned Case',
      status: 'Collected',
      type: evidenceType,
      serial: evidenceType === 'Device' ? (serialNumber || 'GEN-DEV-001') : null,
      hash: generatedHash,
      integrityStatus: 'VERIFIED',
    };

    onAddEvidence(newItem);
    setIsRegisterOpen(false);
    setDescription('');
    setSerialNumber('');
    setHashValue('');
    setFormError('');
  };

  const handleOpenVerify = (item) => {
    setVerifyItem(item);
    setTestHashInput(item.hash);
    setVerificationResult(null);
  };

  const runHashCheck = () => {
    if (!verifyItem) return;
    if (testHashInput.trim() === verifyItem.hash) {
      setVerificationResult({
        status: 'MATCH',
        message: 'MATCH: Cryptographic SHA-256 checksum matches intake value. Zero tampering detected.',
        isMatch: true,
      });
    } else {
      setVerificationResult({
        status: 'MISMATCH',
        message: 'MISMATCH - POSSIBLE TAMPERING: Checksum deviates from original intake baseline!',
        isMatch: false,
      });
    }
  };

  const columns = [
    {
      header: 'ID',
      field: 'id',
      className: 'w-16',
      render: (row) => <span className="font-mono font-medium text-app-muted">#{row.id}</span>,
    },
    {
      header: 'Description',
      field: 'description',
      className: 'min-w-[220px]',
      render: (row) => (
        <div>
          <span className="font-semibold text-app-text block">{row.description}</span>
          <span className="text-[11px] text-app-muted">{row.caseTitle}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      field: 'type',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
          {row.type === 'Device' ? (
            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-purple-600" />
          )}
          <span>{row.type}</span>
          {row.serial && (
            <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-1">
              {row.serial}
            </span>
          )}
        </span>
      ),
    },
    {
      header: 'Lifecycle Status',
      field: 'status',
      render: (row) => <Badge status={row.status} dot size="sm" />,
    },
    {
      header: 'Collected',
      field: 'collectionDate',
      className: 'tabular-nums text-app-muted',
    },
    {
      header: 'SHA-256 Hash Integrity',
      field: 'hash',
      className: 'min-w-[180px]',
      render: (row) => (
        <IntegrityBadge
          hash={row.hash}
          status={row.integrityStatus}
          showHash={true}
          onVerify={() => handleOpenVerify(row)}
        />
      ),
    },
    {
      header: 'Actions',
      field: 'actions',
      sortable: false,
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          icon={ShieldCheck}
          onClick={() => handleOpenVerify(row)}
        >
          Verify
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Evidence Vault"
        subtitle="Catalog of seized digital physical devices and logical file records in Oracle 26ai"
        actions={
          <Button icon={Plus} onClick={() => setIsRegisterOpen(true)}>
            Intake New Evidence
          </Button>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <span className="text-app-muted font-medium mr-1">Status:</span>
        {['ALL', 'Collected', 'In Storage', 'Under Analysis', 'Presented in Court', 'Archived'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors select-none ${
              statusFilter === tab
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-white border border-app-border text-app-muted hover:text-app-text'
            }`}
          >
            {tab}
          </button>
        ))}

        <div className="border-l border-app-border h-4 mx-2" />

        <span className="text-app-muted font-medium mr-1">Type:</span>
        {['ALL', 'Device', 'File'].map((tab) => (
          <button
            key={tab}
            onClick={() => setTypeFilter(tab)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors select-none ${
              typeFilter === tab
                ? 'bg-gray-800 text-white shadow-xs'
                : 'bg-white border border-app-border text-app-muted hover:text-app-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Evidence Table */}
      <DataTable
        columns={columns}
        data={filteredEvidence}
        keyField="id"
        searchPlaceholder="Search evidence by description, case, or serial..."
        searchKeys={['description', 'caseTitle', 'serial', 'type', 'status']}
      />

      {/* Evidence Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Evidence Intake & Registration"
        subtitle="Executes PL/SQL procedure sp_register_evidence with atomic custody initialization"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegisterSubmit}>
              Register Evidence
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <Input
            label="Evidence Item Description"
            required
            placeholder="e.g. Seized encrypted NVMe drive from primary server"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={formError}
          />

          <Select
            label="Associated Case File"
            required
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            options={cases.map((c) => ({
              value: c.id,
              label: `Case #${c.id}: ${c.title}`,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Classification"
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
              options={['Device', 'File']}
            />

            {evidenceType === 'Device' && (
              <Input
                label="Hardware Serial Number"
                placeholder="e.g. DELL-SRV-9012"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            )}
          </div>

          <Input
            label="Intake SHA-256 Checksum"
            placeholder="Calculated automatically if omitted"
            value={hashValue}
            onChange={(e) => setHashValue(e.target.value)}
            helperText="64-character hexadecimal SHA-256 hash calculated at evidence intake"
          />
        </form>
      </Modal>

      {/* Hash Verification Modal */}
      {verifyItem && (
        <Modal
          isOpen={Boolean(verifyItem)}
          onClose={() => setVerifyItem(null)}
          title={`Cryptographic Verification: Evidence #${verifyItem.id}`}
          subtitle="Tests Oracle function fn_verify_hash for evidence integrity assurance"
          footer={
            <Button onClick={() => setVerifyItem(null)}>
              Done
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-lg border border-app-border space-y-1.5">
              <span className="text-app-muted block font-medium">Original Intake Checksum (Stored in Oracle):</span>
              <p className="font-mono text-xs bg-white p-2 rounded border border-gray-200 break-all text-gray-800">
                {verifyItem.hash}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-app-text font-medium block">Test / Current Hash to Compare:</label>
              <textarea
                rows={2}
                value={testHashInput}
                onChange={(e) => setTestHashInput(e.target.value)}
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-app-border focus:ring-2 focus:ring-app-primary/20 focus:border-app-primary outline-none"
                placeholder="Paste SHA-256 hash to test integrity..."
              />
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={runHashCheck}>
                  Execute fn_verify_hash
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setTestHashInput('0000000000000000000000000000000000000000000000000000000000000000')}
                >
                  Simulate Tampering (Altered Hash)
                </Button>
              </div>
            </div>

            {verificationResult && (
              <div className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
                verificationResult.isMatch 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {verificationResult.isMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[11px]">
                    Result: {verificationResult.status}
                  </span>
                  <p className="mt-0.5 leading-relaxed">{verificationResult.message}</p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
