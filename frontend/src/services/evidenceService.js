import api from './api';

function mapEvidence(row) {
  if (!row) return null;
  return {
    id: row.EVIDENCE_ID ?? row.id,
    description: row.DESCRIPTION ?? row.description,
    collectionDate: row.COLLECTION_DATE ?? row.collectionDate,
    status: row.STATUS ?? row.status,
    hash: row.HASH_VALUE ?? row.hash ?? '',
    caseId: row.CASE_ID ?? row.caseId,
    caseTitle: row.CASE_TITLE ?? row.caseTitle ?? `Case #${row.CASE_ID || row.caseId}`,
    type: row.EVIDENCE_TYPE ?? row.type ?? 'General',
    serial: row.SERIAL_NUMBER ?? row.serial ?? null,
    fileName: row.FILE_NAME ?? row.fileName ?? null,
    fileSize: row.FILE_SIZE ?? row.fileSize ?? null,
    mimeType: row.MIME_TYPE ?? row.mimeType ?? null,
    integrityStatus: 'VERIFIED',
    custodyTrail: (row.custodyTrail || []).map((c) => ({
      id: c.CUSTODY_ID ?? c.Custody_ID ?? c.id,
      action: c.ACTION ?? c.Action ?? c.action,
      actor: c.ACTOR ?? c.Actor ?? c.actor ?? 'Custodian',
      actorRole: c.ACTOR_ROLE ?? c.Actor_Role ?? c.actorRole,
      timestamp: c.TIMESTAMP_AT ?? c.Timestamp_At ?? c.timestamp,
    })),
  };
}

export const evidenceService = {
  /**
   * Fetches evidence with optional filters (caseId, status, type, search).
   */
  async getEvidence(params = {}) {
    const response = await api.get('/evidence', { params });
    const list = response.data?.data || [];
    return list.map(mapEvidence).filter(Boolean);
  },

  /**
   * Fetches single evidence item by ID including device/file metadata and chain of custody logs.
   */
  async getEvidenceById(id) {
    const response = await api.get(`/evidence/${id}`);
    const data = response.data?.data || null;
    return mapEvidence(data);
  },

  /**
   * Registers new evidence in Oracle (atomic intake).
   */
  async registerEvidence(evidenceData) {
    const response = await api.post('/evidence', {
      description: evidenceData.description,
      caseId: evidenceData.caseId,
      evidenceType: evidenceData.type || evidenceData.evidenceType || 'General',
      serialNumber: evidenceData.serial || evidenceData.serialNumber || null,
      fileName: evidenceData.fileName || null,
      fileSize: evidenceData.fileSize || null,
      mimeType: evidenceData.mimeType || null,
      hashValue: evidenceData.hash || evidenceData.hashValue,
    });
    return response.data?.data || null;
  },

  /**
   * Uploads raw evidence file (computes SHA-256 byte hash, seals in vault).
   */
  async uploadEvidence(formData) {
    const response = await api.post('/evidence/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.data || null;
  },

  /**
   * Downloads physical evidence file from secure vault.
   */
  async downloadEvidenceFile(id, fileName = 'evidence_file') {
    const response = await api.get(`/evidence/${id}/file`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Re-verifies physical file on disk by recomputing SHA-256 from actual bytes
   * and executing Oracle function fn_verify_hash.
   */
  async verifyEvidenceFile(id) {
    const response = await api.post(`/evidence/${id}/verify-file`);
    return response.data?.data || null;
  },

  /**
   * Updates permitted evidence metadata (description, status).
   */
  async updateEvidence(id, updateData) {
    const response = await api.put(`/evidence/${id}`, {
      description: updateData.description,
      status: updateData.status,
    });
    return response.data?.data || null;
  },

  /**
   * Cryptographically verifies evidence hash using Oracle PL/SQL function fn_verify_hash.
   */
  async verifyHash(id, providedHash) {
    const response = await api.post(`/evidence/${id}/verify-hash`, { providedHash });
    return response.data?.data || null;
  },
};
