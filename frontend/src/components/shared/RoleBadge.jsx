import React from 'react';
import Badge from '../ui/Badge';

export default function RoleBadge({ role }) {
  const roleMap = {
    'Admin': { variant: 'danger', label: 'Administrator' },
    'Investigator': { variant: 'primary', label: 'Investigator' },
    'Forensic Examiner': { variant: 'info', label: 'Forensic Examiner' },
    'Evidence Custodian': { variant: 'warning', label: 'Evidence Custodian' },
    'Legal Reviewer': { variant: 'neutral', label: 'Legal Reviewer' },
    'Auditor': { variant: 'success', label: 'Compliance Auditor' },
  };

  const current = roleMap[role] || { variant: 'neutral', label: role || 'Unknown' };

  return (
    <Badge variant={current.variant} size="sm">
      {current.label}
    </Badge>
  );
}
