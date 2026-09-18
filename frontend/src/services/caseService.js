import api from './api';

function mapCase(row) {
  if (!row) return null;
  return {
    id: row.CASE_ID ?? row.id,
    title: row.TITLE ?? row.title,
    status: row.STATUS ?? row.status,
    crimeType: row.CRIME_TYPE ?? row.crimeType ?? 'General Digital Crime',
    dateOpened: row.DATE_OPENED ?? row.dateOpened,
    createdBy: row.CREATED_BY ?? row.createdBy,
    creatorName: row.CREATOR_NAME ?? row.CREATED_BY_NAME ?? row.creatorName,
    assignedToId: row.ASSIGNED_TO ?? row.assignedToId,
    assignedTo: row.ASSIGNED_INVESTIGATOR ?? row.ASSIGNED_TO_NAME ?? row.assignedTo ?? 'Unassigned',
    badgeNumber: row.BADGE_NUMBER ?? row.badgeNumber,
    location: row.LOCATION_ADDRESS ?? row.location ?? 'N/A',
    evidenceCount: Number(row.EVIDENCE_COUNT ?? row.evidenceCount ?? (row.evidence ? row.evidence.length : 0)),
    evidence: (row.evidence || []).map((e) => ({
      id: e.EVIDENCE_ID ?? e.id,
      description: e.DESCRIPTION ?? e.description,
      status: e.STATUS ?? e.status,
      hash: e.HASH_VALUE ?? e.hash,
      collectionDate: e.COLLECTION_DATE ?? e.collectionDate,
      type: e.EVIDENCE_TYPE ?? e.type ?? 'General',
      serial: e.SERIAL_NUMBER ?? e.serial,
      fileName: e.FILE_NAME ?? e.fileName,
    })),
  };
}

export const caseService = {
  /**
   * Fetches cases with optional status, search filter, and pagination.
   */
  async getCases(params = {}) {
    const response = await api.get('/cases', { params });
    const list = response.data?.data || [];
    return list.map(mapCase).filter(Boolean);
  },

  /**
   * Fetches single case details by ID including linked evidence.
   */
  async getCaseById(id) {
    const response = await api.get(`/cases/${id}`);
    const data = response.data?.data || null;
    return mapCase(data);
  },

  /**
   * Registers a new case in Oracle CASE_TABLE.
   */
  async createCase(caseData) {
    const response = await api.post('/cases', {
      title: caseData.title,
      crimeType: caseData.crimeType,
      assignedTo: caseData.assignedTo || null,
      locationAddress: caseData.location || caseData.locationAddress || null,
    });
    return response.data?.data || null;
  },

  /**
   * Updates permitted case details.
   */
  async updateCase(id, caseData) {
    const response = await api.put(`/cases/${id}`, {
      title: caseData.title,
      crimeType: caseData.crimeType,
      assignedTo: caseData.assignedTo || null,
      locationAddress: caseData.location || caseData.locationAddress || null,
      status: caseData.status,
    });
    return response.data?.data || null;
  },

  /**
   * Quick updates case status.
   */
  async updateCaseStatus(id, status) {
    const response = await api.put(`/cases/${id}/status`, { status });
    return response.data?.data || null;
  },
};
