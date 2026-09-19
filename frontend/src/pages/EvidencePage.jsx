import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  ShieldCheck, 
  HardDrive, 
  FileCode, 
  CheckCircle2, 
  AlertOctagon, 
  RefreshCw, 
  Eye, 
  Edit3, 
  Clock, 
  Hash,
  Download,
  FileUp
} from 'lucide-react';

import PageHeader from '../components/layout/PageHeader';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Alert from '../components/ui/Alert';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';
import IntegrityBadge from '../components/shared/IntegrityBadge';
import { evidenceService } from '../services/evidenceService';
import { caseService } from '../services/caseService';

export default function EvidencePage({
  evidence: initialEvidence = [],
  cases: propCases = [],
  currentUser = null,
  onAddEvidence,
}) {
  const [evidenceList, setEvidenceList] = useState(initialEvidence);
  const [casesList, setCasesList] = useState(propCases);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [verifyItem, setVerifyItem] = useState(null);
  const [testHashInput, setTestHashInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [fileVerifying, setFileVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);

  // Intake Form State
  const [desc, setDesc] = useState('');
  const [caseId, setCaseId] = useState('');
  const [evidenceType, setEvidenceType] = useState('Device');
  const [serialNumber, setSerialNumber] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('2048');
  const [mimeType, setMimeType] = useState('application/octet-stream');
  const [hashValue, setHashValue] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Metadata State
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('Collected');
  const [editError, setEditError] = useState('');

  // RBAC permissions
  const userRole = currentUser?.role || 'Investigator';
  const canIntake = ['Admin', 'Investigator'].includes(userRole);
  const canEdit = ['Admin', 'Investigator'].includes(userRole);

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evidenceService.getEvidence({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setEvidenceList(data);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to load evidence records from Oracle.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  // Load available cases for intake dropdown if not passed
  const fetchCasesForSelect = useCallback(async () => {
    try {
      const casesData = await caseService.getCases();
      setCasesList(casesData);
      if (casesData.length > 0 && !caseId) {
        setCaseId(String(casesData[0].id));
      }
    } catch (err) {
      console.error('Error loading cases for selection:', err);
    }
  }, [caseId]);

  useEffect(() => {
    fetchEvidence();
    fetchCasesForSelect();
  }, [fetchEvidence, fetchCasesForSelect]);

  // Open Intake Modal
  const handleOpenRegister = () => {
    setDesc('');
    if (casesList.length > 0) {
      setCaseId(String(casesList[0].id));
    }
    setEvidenceType('Device');
    setSerialNumber('');
    setFileName('');
    setFileSize('4096');
    setMimeType('application/octet-stream');
    setSelectedUploadFile(null);
    // Generate valid 64-char sample SHA-256
    const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setHashValue(randomHex);
    setFormError('');
    setIsRegisterOpen(true);
  };

  // Open Details Modal
  const handleViewDetails = async (item) => {
    setSelectedItem(item);
    setDetailsLoading(true);
    try {
      const detailed = await evidenceService.getEvidenceById(item.id);
      if (detailed) {
        setSelectedItem(detailed);
      }
    } catch (err) {
      console.error('Error fetching evidence details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditDesc(item.description || '');
    setEditStatus(item.status || 'Collected');
    setEditError('');
  };

  // Open Hash Verification Modal
  const handleOpenVerify = (item) => {
    setVerifyItem(item);
    setTestHashInput(item.hash || '');
    setVerificationResult(null);
  };

  // Submit Intake Form
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!desc.trim()) {
      setFormError('Evidence description is required.');
      return;
    }
    if (!caseId) {
      setFormError('An associated case must be selected.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      // 1. If physical file is provided, use uploadEvidence endpoint (computes SHA-256 byte hash on server)
      if (evidenceType === 'File' && selectedUploadFile) {
        const formData = new FormData();
        formData.append('file', selectedUploadFile);
        formData.append('description', desc.trim());
        formData.append('caseId', caseId);

        const result = await evidenceService.uploadEvidence(formData);
        setSuccessMsg(`Evidence File #${result.evidenceId} ("${result.fileName}") ingested, hashed with SHA-256, and sealed in vault.`);
        setIsRegisterOpen(false);
        await fetchEvidence();
        if (onAddEvidence) onAddEvidence(result);
        return;
      }

      // 2. Otherwise use JSON intake endpoint
      if (!hashValue || hashValue.trim().length !== 64) {
        setFormError('A valid 64-character hexadecimal SHA-256 hash is required.');
        setSubmitting(false);
        return;
      }

      const payload = {
        description: desc.trim(),
        caseId: parseInt(caseId, 10),
        type: evidenceType,
        serial: evidenceType === 'Device' ? serialNumber.trim() : null,
        fileName: evidenceType === 'File' ? fileName.trim() : null,
        fileSize: evidenceType === 'File' ? parseInt(fileSize, 10) : null,
        mimeType: evidenceType === 'File' ? mimeType.trim() : null,
        hash: hashValue.trim(),
      };

      const result = await evidenceService.registerEvidence(payload);
      setSuccessMsg(`Evidence #${result.evidenceId} registered and initial custody locked in Oracle.`);
      setIsRegisterOpen(false);
      await fetchEvidence();
      if (onAddEvidence) onAddEvidence(result);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Error executing evidence intake.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Metadata Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDesc.trim()) {
      setEditError('Description cannot be empty.');
      return;
    }

    setSubmitting(true);
    setEditError('');
    try {
      await evidenceService.updateEvidence(editingItem.id, {
        description: editDesc.trim(),
        status: editStatus,
      });

      setSuccessMsg(`Evidence #${editingItem.id} metadata updated successfully.`);
      setEditingItem(null);
      await fetchEvidence();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Error updating evidence metadata.';
      setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Cryptographic Hash Verification via Oracle fn_verify_hash
  const handleRunVerification = async () => {
    if (!verifyItem || !testHashInput) return;
    setVerifying(true);
    setVerificationResult(null);
    try {
      const response = await evidenceService.verifyHash(verifyItem.id, testHashInput.trim());
      setVerificationResult({
        status: response.status,
        outcome: response.outcome,
        isMatch: response.intact,
        message: response.message,
      });
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Verification execution failed in Oracle engine.';
      setVerificationResult({
        status: 'ERROR',
        outcome: 'ERROR',
        isMatch: false,
        message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
      });
    } finally {
      setVerifying(false);
    }
  };

  // Re-verify Stored Physical File directly from vault on disk
  const handleVerifyStoredFile = async () => {
    if (!verifyItem) return;
    setFileVerifying(true);
    setVerificationResult(null);
    try {
      const response = await evidenceService.verifyEvidenceFile(verifyItem.id);
      setVerificationResult({
        status: response.status,
        outcome: response.outcome,
        isMatch: response.intact,
        message: response.message,
        recomputedHash: response.recomputedHash,
      });
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Stored file verification failed.';
      setVerificationResult({
        status: 'ERROR',
        outcome: 'ERROR',
        isMatch: false,
        message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
      });
    } finally {
      setFileVerifying(false);
    }
  };

  // Download Physical Evidence File from Vault
  const handleDownloadFile = async (item) => {
    try {
      await evidenceService.downloadEvidenceFile(item.id, item.fileName || `evidence_${item.id}.bin`);
    } catch (err) {
      console.error('File download failed:', err);
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
          <span className="text-[11px] text-app-muted">{row.caseTitle || `Case #${row.caseId}`}</span>
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
          status={row.integrityStatus || 'VERIFIED'}
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
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            icon={Eye}
            onClick={() => handleViewDetails(row)}
          >
            Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={ShieldCheck}
            onClick={() => handleOpenVerify(row)}
          >
            Verify
          </Button>
          {(row.fileName || row.type === 'File') && (
            <Button
              size="sm"
              variant="ghost"
              icon={Download}
              onClick={() => handleDownloadFile(row)}
              title="Download Stored Evidence File"
            >
              File
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              icon={Edit3}
              onClick={() => handleOpenEdit(row)}
            >
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Evidence Vault"
        subtitle="Catalog of seized digital physical devices and logical file records in Oracle 26ai"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchEvidence}
              disabled={loading}
            >
              Refresh
            </Button>
            {canIntake && (
              <Button icon={Plus} onClick={handleOpenRegister}>
                Intake New Evidence
              </Button>
            )}
          </div>
        }
      />

      {/* Success Notification */}
      {successMsg && (
        <Alert
          type="success"
          className="mb-4"
          onDismiss={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          title="Oracle Evidence Vault Error"
          className="mb-4"
          onDismiss={() => setError(null)}
        >
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchEvidence} className="ml-4">
              Retry
            </Button>
          </div>
        </Alert>
      )}

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

      {/* Evidence Table or Loading */}
      {loading && evidenceList.length === 0 ? (
        <div className="bg-white p-6 rounded-xl border border-app-border">
          <LoadingSkeleton lines={5} />
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="bg-white rounded-xl border border-app-border">
          <EmptyState
            title="No evidence items found"
            description="No digital devices or logical files matching the current filter criteria."
            actionLabel={canIntake ? 'Intake New Evidence' : null}
            onAction={canIntake ? handleOpenRegister : null}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={evidenceList}
          keyField="id"
          searchPlaceholder="Search evidence by description, case, or serial..."
          searchKeys={['description', 'caseTitle', 'serial', 'type', 'status']}
        />
      )}

      {/* Evidence Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Evidence Intake & Registration"
        subtitle="Executes atomic transaction across EVIDENCE, DEVICE/FILE, and CHAIN_OF_CUSTODY in Oracle"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRegisterOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleRegisterSubmit} disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Evidence'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {formError && (
            <Alert type="error" className="py-2 text-xs">
              {formError}
            </Alert>
          )}

          <Input
            label="Evidence Item Description"
            required
            placeholder="e.g. Seized encrypted NVMe drive from primary server"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <Select
            label="Associated Case File"
            required
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            options={casesList.map((c) => ({
              value: String(c.id),
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

            {evidenceType === 'Device' ? (
              <Input
                label="Hardware Serial Number"
                placeholder="e.g. DELL-SRV-9012"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            ) : (
              <Input
                label="File Name"
                placeholder="e.g. memory_dump.raw"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            )}
          </div>

          {evidenceType === 'File' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text block">Physical Evidence File Upload</label>
              <div className="border-2 border-dashed border-app-border rounded-lg p-3 text-center hover:border-app-primary transition-colors bg-gray-50/50">
                <input
                  type="file"
                  id="evidence-file-input"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedUploadFile(f);
                      setFileName(f.name);
                      setFileSize(String(f.size));
                      setMimeType(f.type || 'application/octet-stream');
                    }
                  }}
                />
                <label htmlFor="evidence-file-input" className="cursor-pointer flex flex-col items-center gap-1">
                  <FileUp className="w-5 h-5 text-app-primary" />
                  <span className="text-xs font-semibold text-app-primary">
                    {selectedUploadFile ? selectedUploadFile.name : 'Choose physical evidence file to upload'}
                  </span>
                  <span className="text-[11px] text-app-muted">
                    {selectedUploadFile
                      ? `${(selectedUploadFile.size / 1024).toFixed(1)} KB — SHA-256 will be calculated directly from binary bytes by server`
                      : 'Binary file, memory dump, PCAP, disk image (up to 50MB)'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {selectedUploadFile ? (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Byte-Level SHA-256 Checksum Calculation</span>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  Upon submission, Express backend will stream raw binary bytes of <strong>{selectedUploadFile.name}</strong>, compute cryptographic SHA-256 fingerprint, seal file in isolated vault, and register intake digest into Oracle.
                </p>
              </div>
            </div>
          ) : (
            <Input
              label="Intake SHA-256 Checksum"
              required
              placeholder="64-character hexadecimal SHA-256 hash"
              value={hashValue}
              onChange={(e) => setHashValue(e.target.value)}
              helperText="Cryptographic digest calculated at the point of forensic seizure (immutable)"
            />
          )}
        </form>
      </Modal>

      {/* Edit Evidence Metadata Modal */}
      {editingItem && (
        <Modal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          title={`Edit Metadata: Evidence #${editingItem.id}`}
          subtitle="Update permitted metadata and lifecycle status (hash is legally immutable)"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingItem(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Metadata'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <Alert type="error" className="py-2 text-xs">
                {editError}
              </Alert>
            )}

            <Input
              label="Evidence Description"
              required
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />

            <Select
              label="Lifecycle Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              options={[
                'Collected',
                'In Storage',
                'Under Analysis',
                'Presented in Court',
                'Archived',
                'Disposed',
              ]}
            />

            <div className="p-3 bg-gray-50 rounded-lg border border-app-border text-xs">
              <span className="text-app-muted block font-medium mb-1">Stored SHA-256 Hash (Read-Only):</span>
              <p className="font-mono text-gray-700 bg-white p-2 rounded border border-gray-200 break-all">
                {editingItem.hash}
              </p>
              <span className="text-[11px] text-amber-700 mt-1 block">
                * Cryptographic fingerprints cannot be modified after initial intake.
              </span>
            </div>
          </form>
        </Modal>
      )}

      {/* Evidence Details Modal */}
      {selectedItem && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={`Evidence Dossier: #${selectedItem.id}`}
          subtitle={`Seized in connection with ${selectedItem.caseTitle || `Case #${selectedItem.caseId}`}`}
          footer={
            <Button onClick={() => setSelectedItem(null)}>
              Close
            </Button>
          }
        >
          {detailsLoading ? (
            <LoadingSkeleton lines={4} />
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-app-border">
                <div>
                  <span className="text-app-muted block">Status</span>
                  <Badge status={selectedItem.status} dot size="sm" className="mt-1" />
                </div>
                <div>
                  <span className="text-app-muted block">Classification</span>
                  <span className="font-semibold text-app-text mt-1 block">{selectedItem.type}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Collection Date</span>
                  <span className="font-semibold text-app-text mt-1 block">{selectedItem.collectionDate}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Associated Case</span>
                  <span className="font-semibold text-app-text mt-1 block">#{selectedItem.caseId}</span>
                </div>
              </div>

              <div>
                <span className="text-app-muted block mb-1 font-medium">Description:</span>
                <p className="text-xs text-gray-800 bg-white p-2.5 rounded border border-app-border">
                  {selectedItem.description}
                </p>
              </div>

              <div>
                <span className="text-app-muted block mb-1 font-medium flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-app-primary" />
                  Intake SHA-256 Hash Digest:
                </span>
                <p className="font-mono text-xs bg-white p-2.5 rounded border border-app-border break-all text-gray-800 font-medium">
                  {selectedItem.hash}
                </p>
              </div>

              {/* Chain of Custody Trail */}
              <div className="border-t border-app-border pt-3">
                <span className="font-semibold text-app-text flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-app-primary" />
                  Chain of Custody Events ({selectedItem.custodyTrail ? selectedItem.custodyTrail.length : 0})
                </span>

                {selectedItem.custodyTrail && selectedItem.custodyTrail.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedItem.custodyTrail.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-lg border border-app-border bg-white flex items-start justify-between"
                      >
                        <div>
                          <span className="font-medium text-gray-900 block">{c.action}</span>
                          <span className="text-[11px] text-app-muted block mt-0.5">
                            Handled by: <strong className="text-gray-700">{c.actor}</strong> ({c.actorRole || 'Custodian'})
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-gray-500 tabular-nums">
                          {c.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-app-muted text-xs italic bg-gray-50 p-2.5 rounded border border-dashed border-gray-300 text-center">
                    No transfer events recorded yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Hash Verification Modal */}
      {verifyItem && (
        <Modal
          isOpen={Boolean(verifyItem)}
          onClose={() => setVerifyItem(null)}
          title={`Cryptographic Verification: Evidence #${verifyItem.id}`}
          subtitle="Executes Oracle PL/SQL function fn_verify_hash for evidence integrity validation"
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

            {(verifyItem.fileName || verifyItem.type === 'File') && (
              <div className="p-3.5 bg-blue-50/70 rounded-lg border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-950 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-app-primary" />
                    Sealed Vault File: {verifyItem.fileName || 'evidence_file.bin'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Download}
                    onClick={() => handleDownloadFile(verifyItem)}
                  >
                    Download File
                  </Button>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Re-reads actual binary bytes from the isolated evidence vault on disk, recomputes the SHA-256 digest in Node.js, and compares against the stored intake hash in Oracle via PL/SQL function <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-semibold">fn_verify_hash</code>.
                </p>
                <Button
                  size="sm"
                  onClick={handleVerifyStoredFile}
                  disabled={fileVerifying}
                >
                  {fileVerifying ? 'Recomputing Hash from Disk...' : 'Re-verify Stored File Bytes (fn_verify_hash)'}
                </Button>
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-gray-200">
              <label className="text-app-text font-medium block">Manual Cryptographic Hash Check:</label>
              <textarea
                rows={2}
                value={testHashInput}
                onChange={(e) => setTestHashInput(e.target.value)}
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-app-border focus:ring-2 focus:ring-app-primary/20 focus:border-app-primary outline-none"
                placeholder="Paste external SHA-256 hash to test integrity..."
              />
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleRunVerification} disabled={verifying}>
                  {verifying ? 'Verifying in Oracle...' : 'Compare External Hash'}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setTestHashInput('0000000000000000000000000000000000000000000000000000000000000000')}
                  disabled={verifying}
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
                <div className="space-y-1 flex-1">
                  <span className="font-bold uppercase tracking-wider block text-[11px]">
                    Result: {verificationResult.status} ({verificationResult.outcome})
                  </span>
                  <p className="leading-relaxed">{verificationResult.message}</p>
                  {verificationResult.recomputedHash && (
                    <div className="mt-2 pt-2 border-t border-current/20 text-[11px] font-mono break-all">
                      <span className="font-bold block">Recomputed SHA-256 Digest:</span>
                      {verificationResult.recomputedHash}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
