import api from './api';
import type { NotificationAlert, AlertFilterParams, EscalationScanResult } from '../types/notification';
import type { AxiosResponse } from 'axios';

/**
 * Service: Notification & Escalation API Client (Agent 6)
 */

export const triggerEscalationScan = (): Promise<AxiosResponse<{ success: boolean; data: EscalationScanResult }>> =>
  api.post('/notifications/escalate');

export const getAlerts = (params: AlertFilterParams = {}): Promise<AxiosResponse<{ success: boolean; data: NotificationAlert[] }>> => {
  const query = new URLSearchParams();
  if (params.status)   query.set('status', params.status);
  if (params.severity) query.set('severity', params.severity);
  if (params.limit)    query.set('limit', String(params.limit));
  return api.get(`/notifications/alerts?${query.toString()}`);
};

export const approveAlert = (alertId: number): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.put(`/notifications/alerts/${alertId}/approve`);

export const dismissAlert = (alertId: number): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.put(`/notifications/alerts/${alertId}/dismiss`);

export const batchApproveAlerts = (alertIds: number[] = []): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post('/notifications/alerts/batch-approve', { alertIds });

export const batchDismissAlerts = (alertIds: number[] = []): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.post('/notifications/alerts/batch-dismiss', { alertIds });
