import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Eye, 
  MapPin, 
  Edit3, 
  RefreshCw, 
  ShieldAlert,
  FileText
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
import { caseService } from '../services/caseService';

export default function CasesPage({
  cases: initialCases = [],
  users = [],
  currentUser = null,
  onAddCase,
}) {
  const [cases, setCases] = useState(initialCases);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState(null);

  // Form State for new / edit case
  const [formTitle, setFormTitle] = useState('');
  const [formCrimeType, setFormCrimeType] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState('Open');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // RBAC permission check
  const userRole = currentUser?.role || 'Investigator';
  const canCreate = ['Admin', 'Investigator'].includes(userRole);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await caseService.getCases({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setCases(data);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to load cases from Oracle database.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormTitle('');
    setFormCrimeType('Digital Data Theft');
    setFormAssignedTo('');
    setFormLocation('12 MG Road, Bengaluru');
    setFormStatus('Open');
    setFormError('');
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c) => {
    setEditingCase(c);
    setFormTitle(c.title || '');
    setFormCrimeType(c.crimeType || '');
    setFormAssignedTo(c.assignedToId ? String(c.assignedToId) : '');
    setFormLocation(c.location || '');
    setFormStatus(c.status || 'Open');
    setFormError('');
  };

  // View Details with linked evidence
  const handleViewDetails = async (caseRow) => {
    setSelectedCase(caseRow);
    setDetailsLoading(true);
    try {
      const detailed = await caseService.getCaseById(caseRow.id);
      if (detailed) {
        setSelectedCase(detailed);
      }
    } catch (err) {
      console.error('Error fetching detailed case data:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Case Title is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        title: formTitle.trim(),
        crimeType: formCrimeType.trim() || 'General Digital Crime',
        location: formLocation.trim() || 'Headquarters Forensic Lab',
        assignedTo: formAssignedTo || null,
      };

      const result = await caseService.createCase(payload);
      setSuccessMsg(`Case #${result.caseId} registered successfully in Oracle CASE_TABLE.`);
      setIsCreateOpen(false);
      await fetchCases();
      if (onAddCase) onAddCase(result);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Error registering case.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Case Title is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await caseService.updateCase(editingCase.id, {
        title: formTitle.trim(),
        crimeType: formCrimeType.trim(),
        location: formLocation.trim(),
        status: formStatus,
      });

      setSuccessMsg(`Case #${editingCase.id} updated successfully.`);
      setEditingCase(null);
      await fetchCases();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Error updating case.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change Confirmation Execution
  const handleConfirmStatusChange = async () => {
    if (!confirmStatusChange) return;
    const { caseId, newStatus } = confirmStatusChange;
    setSubmitting(true);
    try {
      await caseService.updateCaseStatus(caseId, newStatus);
      setSuccessMsg(`Case #${caseId} status updated to ${newStatus}.`);
      setConfirmStatusChange(null);
      await fetchCases();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update case status.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setConfirmStatusChange(null);
    } finally {
      setSubmitting(false);
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
      header: 'Case Title',
      field: 'title',
      className: 'min-w-[220px]',
      render: (row) => (
        <div>
          <span className="font-semibold text-app-text block">{row.title}</span>
          <span className="text-[11px] text-app-muted">{row.crimeType}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      field: 'status',
      render: (row) => <Badge status={row.status} dot size="sm" />,
    },
    {
      header: 'Lead Investigator',
      field: 'assignedTo',
      render: (row) => (
        <span className="font-medium text-gray-800">{row.assignedTo || 'Unassigned'}</span>
      ),
    },
    {
      header: 'Location',
      field: 'location',
      render: (row) => (
        <span className="text-app-muted flex items-center gap-1 text-[11px]">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[150px]">{row.location || 'N/A'}</span>
        </span>
      ),
    },
    {
      header: 'Evidence Items',
      field: 'evidenceCount',
      className: 'text-center',
      render: (row) => (
        <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 font-semibold tabular-nums text-gray-700">
          {row.evidenceCount ?? 0}
        </span>
      ),
    },
    {
      header: 'Date Opened',
      field: 'dateOpened',
      className: 'tabular-nums text-app-muted',
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
          {canCreate && (
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
        title="Case Management"
        subtitle="Active digital forensic criminal investigations and officer assignments"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchCases}
              disabled={loading}
            >
              Refresh
            </Button>
            {canCreate && (
              <Button icon={Plus} onClick={handleOpenCreate}>
                Register New Case
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
          title="Oracle Case Database Error"
          className="mb-4"
          onDismiss={() => setError(null)}
        >
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchCases} className="ml-4">
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
        {['ALL', 'Open', 'Under Investigation', 'Closed', 'Archived'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors select-none ${
              statusFilter === tab
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-white border border-app-border text-app-muted hover:text-app-text'
            }`}
          >
            {tab === 'ALL' ? 'All Cases' : tab}
          </button>
        ))}
      </div>

      {/* Cases Data Table or Loading */}
      {loading && cases.length === 0 ? (
        <div className="bg-white p-6 rounded-xl border border-app-border">
          <LoadingSkeleton lines={5} />
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-xl border border-app-border">
          <EmptyState
            title="No forensic cases found"
            description={
              statusFilter !== 'ALL'
                ? `No cases currently marked as '${statusFilter}'.`
                : 'No cases registered in Oracle CASE_TABLE yet.'
            }
            actionLabel={canCreate ? 'Register New Case' : null}
            onAction={canCreate ? handleOpenCreate : null}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={cases}
          keyField="id"
          searchPlaceholder="Search cases by title, investigator, or crime..."
          searchKeys={['title', 'assignedTo', 'crimeType', 'location']}
        />
      )}

      {/* Create Case Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register Investigative Case"
        subtitle="Creates a master case record in Oracle CASE_TABLE with bind variables and audit logging"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Case'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <Alert type="error" className="py-2 text-xs">
              {formError}
            </Alert>
          )}

          <Input
            label="Case Title"
            required
            placeholder="e.g. Corporate Data Breach - TechCorp Pvt Ltd"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          <Input
            label="Crime Type / Category"
            placeholder="e.g. Data Exfiltration, Ransomware, Financial Fraud"
            value={formCrimeType}
            onChange={(e) => setFormCrimeType(e.target.value)}
          />

          <Input
            label="Incident Location / Jurisdiction"
            placeholder="e.g. 12 MG Road, Bengaluru"
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
          />

          {users && users.length > 0 && (
            <Select
              label="Assigned Lead Officer (Optional)"
              value={formAssignedTo}
              onChange={(e) => setFormAssignedTo(e.target.value)}
              options={[
                { value: '', label: 'Unassigned (Self / Auto-allocated)' },
                ...users
                  .filter((u) => u.role === 'Investigator' || u.role === 'Admin')
                  .map((u) => ({
                    value: String(u.id),
                    label: `${u.firstName || u.username} ${u.lastName || ''} (${u.role})`,
                  })),
              ]}
            />
          )}
        </form>
      </Modal>

      {/* Edit Case Modal */}
      {editingCase && (
        <Modal
          isOpen={Boolean(editingCase)}
          onClose={() => setEditingCase(null)}
          title={`Edit Case #${editingCase.id}: ${editingCase.title}`}
          subtitle="Update permitted case attributes in Oracle database"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingCase(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formError && (
              <Alert type="error" className="py-2 text-xs">
                {formError}
              </Alert>
            )}

            <Input
              label="Case Title"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />

            <Input
              label="Crime Type"
              value={formCrimeType}
              onChange={(e) => setFormCrimeType(e.target.value)}
            />

            <Select
              label="Case Lifecycle Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              options={['Open', 'Under Investigation', 'Closed', 'Archived']}
            />

            <Input
              label="Incident Location"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
            />
          </form>
        </Modal>
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <Modal
          isOpen={Boolean(selectedCase)}
          onClose={() => setSelectedCase(null)}
          title={`Case #${selectedCase.id}: ${selectedCase.title}`}
          subtitle="Case dossier, jurisdictional metadata, and linked evidence items"
          footer={
            <Button onClick={() => setSelectedCase(null)}>
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
                  <Badge status={selectedCase.status} dot size="sm" className="mt-1" />
                </div>
                <div>
                  <span className="text-app-muted block">Crime Classification</span>
                  <span className="font-semibold text-app-text mt-1 block">{selectedCase.crimeType}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Lead Investigator</span>
                  <span className="font-semibold text-app-text mt-1 block">{selectedCase.assignedTo || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Date Opened</span>
                  <span className="font-semibold text-app-text mt-1 block">{selectedCase.dateOpened}</span>
                </div>
              </div>

              <div>
                <span className="text-app-muted block mb-1 font-medium">Incident Location:</span>
                <p className="text-xs font-medium text-gray-800 bg-white p-2.5 rounded border border-app-border flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-app-primary shrink-0" />
                  {selectedCase.location || 'N/A'}
                </p>
              </div>

              {/* Linked Evidence Section */}
              <div className="border-t border-app-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-app-text flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-app-primary" />
                    Linked Evidence Items ({selectedCase.evidence ? selectedCase.evidence.length : selectedCase.evidenceCount || 0})
                  </span>
                </div>

                {selectedCase.evidence && selectedCase.evidence.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {selectedCase.evidence.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-lg border border-app-border bg-white flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-medium text-gray-900 block truncate">
                            #{ev.id}: {ev.description}
                          </span>
                          <span className="text-[11px] text-app-muted flex items-center gap-2 mt-0.5">
                            <span>Type: {ev.type}</span>
                            {ev.serial && <span>Serial: {ev.serial}</span>}
                          </span>
                        </div>
                        <Badge status={ev.status} size="sm" dot />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-app-muted text-xs italic bg-gray-50 p-3 rounded border border-dashed border-gray-300 text-center">
                    No evidence items currently linked to this case.
                  </p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Confirmation Dialog for Status Change */}
      {confirmStatusChange && (
        <Modal
          isOpen={Boolean(confirmStatusChange)}
          onClose={() => setConfirmStatusChange(null)}
          title="Confirm Case Status Change"
          subtitle="Ensure forensic integrity before advancing investigation lifecycle"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmStatusChange(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirmStatusChange} disabled={submitting}>
                {submitting ? 'Updating...' : `Confirm ${confirmStatusChange.newStatus}`}
              </Button>
            </>
          }
        >
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Case Status Transition</p>
              <p className="mt-1">
                You are about to change the status of Case #{confirmStatusChange.caseId} to <strong>{confirmStatusChange.newStatus}</strong>.
                This action is audited in the Oracle AUDIT_LOG.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
