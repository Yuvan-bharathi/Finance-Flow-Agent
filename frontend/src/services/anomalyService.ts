import api from './api';
import type { AnomalyRecord, AnomalyCheck, AnomalyListParams } from '../types/anomaly';

/**
 * Frontend Service: Financial Transaction Anomaly Detection (Agent 7)
 */

export const runAnomalyCheck = async (paymentId: number | string, caseId: number | string | null = null): Promise<AnomalyCheck> => {
  const { data } = await api.post(`/anomaly/check/${paymentId}`, { case_id: caseId });
  return data as AnomalyCheck;
};

export const getAnomalyReport = async (paymentId: number | string): Promise<AnomalyRecord[]> => {
  const { data } = await api.get(`/anomaly/report/${paymentId}`);
  return (data?.data as AnomalyRecord[]) || [];
};

export const getAnomalyList = async (params: AnomalyListParams = {}): Promise<{ data: AnomalyRecord[]; total: number }> => {
  const { data } = await api.get('/anomaly/list', { params: params as Record<string, unknown> });
  return data as { data: AnomalyRecord[]; total: number };
};

export const dismissAnomaly = async (anomalyId: number | string, dismissReason = ''): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.put(`/anomaly/${anomalyId}/dismiss`, { dismiss_reason: dismissReason });
  return data as { success: boolean; message: string };
};

export const escalateAnomaly = async (anomalyId: number | string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.put(`/anomaly/${anomalyId}/escalate`);
  return data as { success: boolean; message: string };
};
