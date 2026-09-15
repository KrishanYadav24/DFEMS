import React, { useState, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import RoleBadge from '../components/shared/RoleBadge';
import Alert from '../components/ui/Alert';
import { 
  UserPlus, 
  Search, 
  ShieldCheck, 
  BadgeCheck, 
  Building
} from 'lucide-react';

export default function UserManagementPage({ users = [], onAddUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // New user form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
    role: 'Investigator',
    badge: '',
    cert: '',
    lab: '',
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const matchesSearch = 
        fullName.includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.badge && u.badge.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.phone && u.phone.includes(searchTerm));
      
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.username) {
      alert('Please fill in required fields (First Name, Last Name, Username).');
      return;
    }

    const newUser = {
      id: users.length + 1,
      ...formData,
      status: 'Active',
    };

    if (onAddUser) {
      onAddUser(newUser);
    }

    setActionNotice(`User "${newUser.firstName} ${newUser.lastName}" registered with role ${newUser.role}. Stored in local state (Phase 1).`);
    setIsAddUserModalOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      username: '',
      role: 'Investigator',
      badge: '',
      cert: '',
      lab: '',
    });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const columns = [
    {
      header: 'Officer / Examiner Name',
      accessor: 'name',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-dfems-primary">
            {u.firstName[0]}{u.lastName[0]}
          </div>
          <div>
            <div className="font-semibold text-xs text-dfems-text-primary">
              {u.firstName} {u.lastName}
            </div>
            <div className="text-[11px] text-dfems-text-secondary font-mono">
              @{u.username}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Security Role',
      accessor: 'role',
      sortable: true,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      header: 'Badge / Credentials',
      accessor: 'badge',
      render: (u) => (
        <div className="text-xs">
          {u.badge && (
            <div className="font-mono text-slate-800 font-medium flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
              {u.badge}
            </div>
          )}
          {u.cert && (
            <div className="text-[11px] text-emerald-700 font-medium">
              {u.cert}
            </div>
          )}
          {!u.badge && !u.cert && (
            <span className="text-dfems-text-secondary text-[11px] italic">System Authorized</span>
          )}
        </div>
      ),
    },
    {
      header: 'Affiliated Lab / Unit',
      accessor: 'lab',
      render: (u) => (
        <div className="text-xs text-dfems-text-secondary">
          {u.lab ? (
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {u.lab}
            </span>
          ) : (
            <span className="italic text-[11px]">Field / Administrative HQ</span>
          )}
        </div>
      ),
    },
    {
      header: 'Contact Phone',
      accessor: 'phone',
      render: (u) => (
        <span className="font-mono text-xs text-slate-600">
          {u.phone || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Account Status',
      accessor: 'status',
      sortable: true,
      render: (u) => (
        <Badge variant={u.status === 'Active' ? 'success' : 'neutral'} size="sm">
          {u.status}
        </Badge>
      ),
    },
    {
      header: 'Action',
      accessor: 'actions',
      render: (u) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedUser(u)}
        >
          View Record
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personnel & Role-Based Access Control"
        subtitle="Manage authorized investigators, certified forensic examiners, auditors, and system administrators"
        breadcrumbs={[
          { label: 'DFEMS', href: '#' },
          { label: 'User Management' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => setIsPermissionsModalOpen(true)}
            >
              Role Permission Matrix
            </Button>
            <Button
              variant="primary"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsAddUserModalOpen(true)}
            >
              Add Authorized User
            </Button>
          </div>
        }
      />

      {actionNotice && (
        <Alert
          variant="success"
          title="Personnel Record Created"
          dismissible
          onClose={() => setActionNotice(null)}
        >
          {actionNotice}
        </Alert>
      )}

      {/* Role Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-dfems-text-secondary font-medium uppercase">Investigators</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {users.filter((u) => u.role === 'Investigator').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Field seizure & case management</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="text-xs text-dfems-text-secondary font-medium uppercase">Forensic Analysts</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {users.filter((u) => u.role === 'Forensic Examiner').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Lab examiners (EnCE, GCFA, CCE)</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-dfems-text-secondary font-medium uppercase">Auditors</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {users.filter((u) => u.role === 'Auditor').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Chain of custody & tamper verification</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="text-xs text-dfems-text-secondary font-medium uppercase">Administrators</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {users.filter((u) => u.role === 'Admin').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Security policy & DB maintenance</div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search by name, username, badge ID, or phone number..."
            icon={<Search className="w-4 h-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Personnel Roles' },
              { value: 'Investigator', label: 'Investigator' },
              { value: 'Forensic Examiner', label: 'Forensic Examiner' },
              { value: 'Auditor', label: 'Auditor' },
              { value: 'Admin', label: 'Admin' },
            ]}
          />
        </div>
      </Card>

      {/* User Directory Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        keyField="id"
        emptyMessage="No personnel records found matching current query."
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Register New Authorized Personnel"
        size="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              placeholder="e.g. Anand"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name *"
              placeholder="e.g. Verma"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="System Username *"
              placeholder="e.g. anand.verma"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Input
              label="Official Contact Phone"
              placeholder="e.g. 9876500011"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Select
            label="Assigned System Role *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'Investigator', label: 'Investigator — Field & Intake' },
              { value: 'Forensic Examiner', label: 'Forensic Examiner — Lab & Findings' },
              { value: 'Auditor', label: 'Auditor — Compliance & Integrity' },
              { value: 'Admin', label: 'Admin — Full Governance' },
            ]}
          />

          {formData.role === 'Investigator' && (
            <Input
              label="Investigator Badge Number"
              placeholder="e.g. INV-1005"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
            />
          )}

          {formData.role === 'Forensic Examiner' && (
            <>
              <Input
                label="Professional Forensic Certification"
                placeholder="e.g. EnCE, GCFA, CCE, or ACE"
                value={formData.cert}
                onChange={(e) => setFormData({ ...formData, cert: e.target.value })}
              />
              <Input
                label="Assigned Forensic Laboratory"
                placeholder="e.g. Central Forensic Science Laboratory"
                value={formData.lab}
                onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
              />
            </>
          )}

          <div className="p-3 bg-slate-50 border border-dfems-border rounded text-xs text-dfems-text-secondary">
            Note: User authentication in DFEMS utilizes SHA-256 password salting and Oracle role permissions. New users will receive a temporary credential setup link.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Matrix Modal */}
      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        title="Role-Based Access Control (RBAC) Matrix"
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-dfems-text-secondary">
            DFEMS enforces least-privilege role boundaries in accordance with ISO/IEC 27037 digital forensics standards.
          </p>

          <div className="overflow-x-auto border border-dfems-border rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-dfems-border">
                <tr>
                  <th className="p-2.5">System Capability</th>
                  <th className="p-2.5 text-center">Investigator</th>
                  <th className="p-2.5 text-center">Forensic Examiner</th>
                  <th className="p-2.5 text-center">Auditor</th>
                  <th className="p-2.5 text-center">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dfems-border">
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Case Intake & Assignment</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-slate-400">Read-Only</td>
                  <td className="p-2.5 text-center text-slate-400">Read-Only</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Evidence Seizure & Registration</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-slate-400">Read-Only</td>
                  <td className="p-2.5 text-center text-slate-400">Read-Only</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Chain of Custody Handover Logging</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-slate-400">Read-Only</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Record Forensic Lab Analysis Findings</td>
                  <td className="p-2.5 text-center text-slate-400">NO</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-slate-400">Read-Only</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Cryptographic Hash Verification (fn_verify_hash)</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Court Dossier & Certificate Export</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-slate-400">NO</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Security Audit Logs & Telemetry Inspection</td>
                  <td className="p-2.5 text-center text-slate-400">NO</td>
                  <td className="p-2.5 text-center text-slate-400">NO</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">YES</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-900">Custody Record Alteration / Deletion</td>
                  <td className="p-2.5 text-center text-red-600 font-bold">BLOCKED</td>
                  <td className="p-2.5 text-center text-red-600 font-bold">BLOCKED</td>
                  <td className="p-2.5 text-center text-red-600 font-bold">BLOCKED</td>
                  <td className="p-2.5 text-center text-red-600 font-bold">BLOCKED</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsPermissionsModalOpen(false)}>
              Close Matrix
            </Button>
          </div>
        </div>
      </Modal>

      {/* User Record Modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Personnel Record Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-dfems-border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-dfems-primary font-bold text-lg flex items-center justify-center">
                {selectedUser.firstName[0]}{selectedUser.lastName[0]}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <div className="text-dfems-text-secondary font-mono">@{selectedUser.username}</div>
                <div className="mt-1"><RoleBadge role={selectedUser.role} /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-dfems-border rounded-lg">
              <div>
                <span className="text-[10px] text-dfems-text-secondary uppercase font-semibold">User ID</span>
                <p className="font-mono text-slate-800">USER-{selectedUser.id}</p>
              </div>
              <div>
                <span className="text-[10px] text-dfems-text-secondary uppercase font-semibold">Contact Phone</span>
                <p className="font-mono text-slate-800">{selectedUser.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-dfems-text-secondary uppercase font-semibold">Badge # / ID</span>
                <p className="font-mono text-slate-800">{selectedUser.badge || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-dfems-text-secondary uppercase font-semibold">Assigned Lab</span>
                <p className="text-slate-800">{selectedUser.lab || 'Field Operations'}</p>
              </div>
              {selectedUser.cert && (
                <div className="col-span-2">
                  <span className="text-[10px] text-dfems-text-secondary uppercase font-semibold">Forensic Certification</span>
                  <p className="font-medium text-emerald-800">{selectedUser.cert}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Close Record
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
