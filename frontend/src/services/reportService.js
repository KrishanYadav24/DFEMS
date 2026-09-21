import api from './api';

function triggerBlobDownload(blob, defaultFilename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const reportService = {
  async downloadCaseDossier(caseId) {
    const response = await api.get(`/reports/case/${caseId}/dossier`, {
      responseType: 'blob',
    });
    triggerBlobDownload(response.data, `DFEMS_Case_${caseId}_Judicial_Dossier.pdf`);
  },

  async downloadCustodyCert(evidenceId) {
    const response = await api.get(`/reports/evidence/${evidenceId}/custody`, {
      responseType: 'blob',
    });
    triggerBlobDownload(response.data, `DFEMS_Evidence_${evidenceId}_Custody_Certificate.pdf`);
  },

  async downloadIntegrityAudit(caseId) {
    const response = await api.get(`/reports/case/${caseId}/integrity`, {
      responseType: 'blob',
    });
    triggerBlobDownload(response.data, `DFEMS_Case_${caseId}_Integrity_Audit.pdf`);
  },

  async downloadAuditTrail() {
    const response = await api.get('/reports/audit-trail', {
      responseType: 'blob',
    });
    triggerBlobDownload(response.data, 'DFEMS_System_Security_Audit_Trail.pdf');
  },
};
