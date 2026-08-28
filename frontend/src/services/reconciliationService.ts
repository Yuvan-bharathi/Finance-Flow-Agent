import api from './api';
import type {
  ReconciliationCase,
  DashboardStats,
  AIRecommendation,
  WaterfallPreview,
} from '../types/reconciliation';
import type { Playbook } from '../types/playbook';

/**
 * Service: Reconciliation API Service
 * Purpose: Centralized API communication for reconciliation cases, analytics, and settlement endpoints.
 */

export const getCases = async (
  status: string | null = null,
  priority: string | null = null
): Promise<ReconciliationCase[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/reconciliations/cases${queryString}`);
  return (response.data?.data as ReconciliationCase[]) || [];
};

export const getStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/reconciliations/stats');
  return (response.data?.data as DashboardStats) || ({} as DashboardStats);
};

export const getCaseById = async (caseId: number): Promise<ReconciliationCase | null> => {
  const response = await api.get(`/reconciliations/cases/${caseId}`);
  return (response.data?.data as ReconciliationCase) || null;
};

export const analyzeCase = async (caseId: number): Promise<AIRecommendation | null> => {
  const response = await api.post(`/reconciliations/analyze/${caseId}`);
  return (response.data?.data as AIRecommendation) || null;
};

export const approveRecommendation = async (
  recommendationId: number,
  notes: string | null = null,
  caseId: number | null = null
): Promise<WaterfallPreview | null> => {
  const response = await api.post('/reconciliations/approve', { recommendationId, caseId, notes });
  return (response.data?.data as WaterfallPreview) || null;
};

export const rejectRecommendation = async (
  recommendationId: number,
  reason: string,
  caseId: number | null = null
): Promise<unknown> => {
  const response = await api.post('/reconciliations/reject', { recommendationId, caseId, reason });
  return response.data?.data ?? null;
};

export const overrideRecommendation = async (overridePayload: {
  caseId: number;
  repayment_schedule_id: number;
  allocated_amount: number;
  override_reason: string;
}): Promise<unknown> => {
  const response = await api.post('/reconciliations/override', overridePayload);
  return response.data?.data ?? null;
};

export const getCasePlaybook = async (caseId: number): Promise<Playbook | null> => {
  const response = await api.get(`/reconciliations/cases/${caseId}/playbook`);
  return (response.data?.data as Playbook) || null;
};

export const updatePlaybookStep = async (
  caseId: number,
  stepId: number,
  completed: boolean,
  notes: string | null = null
): Promise<Playbook | null> => {
  const response = await api.post(`/reconciliations/cases/${caseId}/playbook/step`, {
    stepId,
    completed,
    notes,
  });
  return (response.data?.data as Playbook) || null;
};

export const updatePlaybookStatus = async (caseId: number, status: string): Promise<Playbook | null> => {
  const response = await api.post(`/reconciliations/cases/${caseId}/playbook/status`, { status });
  return (response.data?.data as Playbook) || null;
};

export const getStandardPlaybooks = async (): Promise<Playbook[]> => {
  const response = await api.get('/reconciliations/playbooks/standard');
  return (response.data?.data as Playbook[]) || [];
};
