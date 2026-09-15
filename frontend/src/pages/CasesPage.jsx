import React, { useState } from 'react';
import { Plus, Eye, MapPin } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

export default function CasesPage({
  cases = [],
  users = [],
  onAddCase,
}) {
  const [selectedCase, setSelectedCase] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State for new case
  const [title, setTitle] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [assignedTo, setAssignedTo] = useState('1');
  const [location, setLocation] = useState('12 MG Road, Bengaluru');
  const [formError, setFormError] = useState('');

  const investigators = users.filter((u) => u.role === 'Investigator');

  // Filter cases by tab
  const filteredCases = cases.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Case Title is required.');
      return;
    }
    const leadInv = users.find((u) => String(u.id) === String(assignedTo));
    const newCase = {
      id: cases.length + 1,
      title: title.trim(),
      status: 'Open',
      createdBy: 'Vikram Shah',
      assignedTo: leadInv ? `${leadInv.firstName} ${leadInv.lastName}` : 'Unassigned',
      location: location,
      crimeType: crimeType || 'General Digital Crime',
      evidenceCount: 0,
      dateOpened: new Date().toISOString().split('T')[0],
    };

    onAddCase(newCase);
    setIsCreateOpen(false);
    setTitle('');
    setCrimeType('');
    setFormError('');
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
        <span className="font-medium text-gray-800">{row.assignedTo}</span>
      ),
    },
    {
      header: 'Location',
      field: 'location',
      render: (row) => (
        <span className="text-app-muted flex items-center gap-1 text-[11px]">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[150px]">{row.location}</span>
        </span>
      ),
    },
    {
      header: 'Evidence Items',
      field: 'evidenceCount',
      className: 'text-center',
      render: (row) => (
        <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 font-semibold tabular-nums text-gray-700">
          {row.evidenceCount}
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
        <Button
          size="sm"
          variant="ghost"
          icon={Eye}
          onClick={() => setSelectedCase(row)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Case Management"
        subtitle="Active digital forensic criminal investigations and officer assignments"
        actions={
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Register New Case
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
        {['ALL', 'Open', 'Under Investigation', 'Closed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors select-none ${
              statusFilter === tab
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-white border border-app-border text-app-muted hover:text-app-text'
            }`}
          >
            {tab === 'ALL' ? 'All Cases' : tab} ({
              tab === 'ALL' 
                ? cases.length 
                : cases.filter((c) => c.status.toLowerCase() === tab.toLowerCase()).length
            })
          </button>
        ))}
      </div>

      {/* Cases Data Table */}
      <DataTable
        columns={columns}
        data={filteredCases}
        keyField="id"
        searchPlaceholder="Search cases by title, investigator, or crime..."
        searchKeys={['title', 'assignedTo', 'crimeType', 'location']}
      />

      {/* Create Case Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register Investigative Case"
        subtitle="Creates a master case record in CASE_TABLE with foreign keys in Oracle 26ai"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit}>
              Create Case
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Case Title"
            required
            placeholder="e.g. Corporate Data Breach - TechCorp Pvt Ltd"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={formError}
          />

          <Input
            label="Crime Type / Category"
            placeholder="e.g. Data Exfiltration, Ransomware, Financial Fraud"
            value={crimeType}
            onChange={(e) => setCrimeType(e.target.value)}
          />

          <Select
            label="Lead Assigned Investigator"
            required
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            options={investigators.map((inv) => ({
              value: inv.id,
              label: `${inv.firstName} ${inv.lastName} (${inv.badge})`,
            }))}
          />

          <Select
            label="Incident Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            options={[
              '12 MG Road, Bengaluru',
              '45 Anna Salai, Chennai',
              '78 Park Street, Kolkata',
              '22 Marine Drive, Mumbai',
              '9 Sector 17, Chandigarh',
            ]}
          />
        </form>
      </Modal>

      {/* Case Details Modal */}
      {selectedCase && (
        <Modal
          isOpen={Boolean(selectedCase)}
          onClose={() => setSelectedCase(null)}
          title={`Case #${selectedCase.id}: ${selectedCase.title}`}
          subtitle="Case dossier and jurisdictional parameters"
          footer={
            <Button onClick={() => setSelectedCase(null)}>
              Close
            </Button>
          }
        >
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
                <span className="font-semibold text-app-text mt-1 block">{selectedCase.assignedTo}</span>
              </div>
              <div>
                <span className="text-app-muted block">Date Opened</span>
                <span className="font-semibold text-app-text mt-1 block">{selectedCase.dateOpened}</span>
              </div>
            </div>

            <div>
              <span className="text-app-muted block mb-1 font-medium">Incident Location:</span>
              <p className="text-sm font-medium text-gray-800 bg-white p-2.5 rounded border border-app-border flex items-center gap-2">
                <MapPin className="w-4 h-4 text-app-primary" />
                {selectedCase.location}
              </p>
            </div>

            <div>
              <span className="text-app-muted block mb-1 font-medium">Evidence Count:</span>
              <p className="text-xs text-gray-700">
                This case currently contains <strong className="text-app-text">{selectedCase.evidenceCount}</strong> registered items in the evidence vault.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
