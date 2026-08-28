import api from './api';
import type { AxiosResponse } from 'axios';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ContextPayload {
  recordType?: string;
  recordId?: number | string;
  [key: string]: unknown;
}

interface Proposal {
  id: string | number;
  action: string;
  description: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  created_at: string;
}

/**
 * Service: AI Operational Copilot API Client (Phase 7)
 */

export const sendMessage = (
  message: string,
  conversationHistory: ConversationMessage[] = [],
  contextPayload: ContextPayload = {}
): Promise<AxiosResponse> =>
  api.post('/assistant/chat', { message, conversationHistory, contextPayload });

export const getActiveProposals = (): Promise<AxiosResponse<{ success: boolean; data: Proposal[] }>> =>
  api.get('/assistant/proposals');

export const confirmProposal = (
  proposalId: number | string,
  idempotencyKey: string | null = null
): Promise<AxiosResponse> => {
  const key = idempotencyKey ?? `IDEMP-ACT-${proposalId}-${Date.now()}`;
  return api.post(`/assistant/proposals/${proposalId}/confirm`, {}, {
    headers: { 'Idempotency-Key': key },
  });
};

export const dismissProposal = (proposalId: number | string): Promise<AxiosResponse> =>
  api.post(`/assistant/proposals/${proposalId}/dismiss`);

export const wakeContext = (recordType: string, recordId: number | string): Promise<AxiosResponse> =>
  api.get(`/assistant/wake/${recordType}/${recordId}`);
