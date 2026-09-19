import api from './api';

function mapCustody(row) {
  if (!row) return null;
  return {
    id: row.CUSTODY_ID ?? row.id,
    evidenceId: row.EVIDENCE_ID ?? row.evidenceId,
    evidenceDesc: row.EVIDENCE_DESC ?? row.evidenceDesc ?? 'Evidence Item',
    caseTitle: row.CASE_TITLE ?? row.caseTitle ?? 'General Case',
    action: row.ACTION ?? row.action,
    userId: row.USER_ID ?? row.userId,
    actor: row.ACTOR ?? row.actor ?? 'System Custodian',
    actorUsername: row.ACTOR_USERNAME ?? row.actorUsername ?? '',
    actorRole: row.ACTOR_ROLE ?? row.actorRole ?? '',
    timestamp: row.TIMESTAMP_AT ?? row.timestamp ?? new Date().toISOString().substring(0, 19).replace('T', ' '),
  };
}

export const custodyService = {
  /**
   * Fetches chain of custody ledger with optional evidenceId filter.
   */
  async getCustody(params = {}) {
    const response = await api.get('/custody', { params });
    const list = response.data?.data || [];
    return list.map(mapCustody).filter(Boolean);
  },

  /**
   * Fetches custody trail for a specific evidence item.
   */
  async getCustodyByEvidenceId(evidenceId) {
    const response = await api.get(`/custody/${evidenceId}`);
    const list = response.data?.data || [];
    return list.map(mapCustody).filter(Boolean);
  },

  /**
   * Executes custodial transfer via Oracle stored procedure sp_transfer_custody.
   */
  async transferCustody(transferData) {
    const response = await api.post('/custody/transfer', {
      evidenceId: transferData.evidenceId,
      newStatus: transferData.newStatus,
      toUserId: transferData.toUserId || null,
      location: transferData.location || '',
      purpose: transferData.purpose || transferData.reason || '',
    });
    return response.data?.data || null;
  },

  /**
   * Tests database trigger trg_custody_no_update.
   */
  async testTriggerUpdate() {
    const response = await api.post('/custody/test-update-trigger');
    return response.data;
  },

  /**
   * Tests database trigger trg_custody_no_delete.
   */
  async testTriggerDelete() {
    const response = await api.post('/custody/test-delete-trigger');
    return response.data;
  },
};
