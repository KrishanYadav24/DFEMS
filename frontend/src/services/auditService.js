import api from './api';

export const auditService = {
  async getAuditLogs(params = {}) {
    const response = await api.get('/audit-logs', { params });
    const rawData = response.data?.data || [];
    const pagination = response.data?.meta || {};

    const items = rawData.map((log) => ({
      id: log.LOG_ID || log.id,
      timestamp: log.TIMESTAMP_AT || log.timestamp,
      actor: log.USERNAME || log.actor || 'System',
      role: log.ROLE || log.role || 'Officer',
      eventType: log.ACTION || log.eventType || 'SYSTEM_EVENT',
      ip: log.IP_ADDRESS || log.ip || '127.0.0.1',
      details: log.DETAILS || log.details || '',
      entityName: log.ENTITY_NAME || null,
      entityId: log.ENTITY_ID || null,
      status: (log.ACTION && (log.ACTION.includes('FAILED') || log.ACTION.includes('DENIED'))) ? 'DENIED' : 'SUCCESS',
    }));

    return {
      items,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 50,
        total: pagination.total || items.length,
        totalPages: pagination.totalPages || 1,
      },
    };
  },

  async logEvent(eventData) {
    const response = await api.post('/audit-logs', eventData);
    return response.data;
  },
};
