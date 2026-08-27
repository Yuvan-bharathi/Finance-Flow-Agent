// ============================================================
// reconciliation.ts — Reconciliation case & payment domain types
// ============================================================

import type { Playbook, PlaybookStep as Step } from './playbook';

export type CaseStatus = 'open' | 'pending_review' | 'approved' | 'resolved' | 'rejected' | 'escalated';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ActionType = 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'ESCALATE' | 'HOLD';

export interface Payment {
  id: number;
  transaction_id: string;
  amount: number;
  sender_name: string;
  sender_account?: string;
  receiver_account?: string;
  payment_date: string;
  status: string;
  source?: string;
  notes?: string;
  created_at?: string;
}

export interface WaterfallAllocationItem {
  milestone_id: number;
  milestone_name: string;
  loan_account_id: number;
  allocated_amount: number;
  outstanding_before: number;
  outstanding_after: number;
  priority_order: number;
  is_fully_settled: boolean;
}

export interface WaterfallPreview {
  total_amount: number;
  allocations: WaterfallAllocationItem[];
  surplus?: number;
  deficit?: number;
}

export interface AIRecommendation {
  id: number;
  case_id: number;
  recommendation: string;
  confidence_score: number;
  action: ActionType;
  reasoning?: string;
  waterfall_preview?: WaterfallPreview;
  status: 'pending' | 'approved' | 'rejected' | 'overridden';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface ReconciliationCase {
  id: number;
  payment_id: number;
  transaction_id: string;
  amount: number;
  sender_name: string;
  status: CaseStatus;
  priority: Priority;
  anomaly_score?: number;
  anomaly_types?: string[];
  severity?: string;
  recommended_action?: string;
  has_recommendation?: boolean;
  recommendation_id?: number;
  company_id?: number;
  company_name?: string;
  payment_date?: string;
  ai_recommendation?: AIRecommendation;
  recommendations?: AIRecommendation[];
  created_at: string;
  playbook?: Playbook;
}

export type EnrichedCase = ReconciliationCase;
export type PlaybookStep = Step;
export type OperationalPlaybook = Playbook;

export interface DashboardKPIs {
  total_cases: number;
  new_cases: number;
  pending_review: number;
  resolved: number;
  ai_auto_processed: number;
  anomalies_detected: number;
  high_priority: number;
  total_amount: number;
  reconciled_amount: number;
}

export interface StatusBreakdown {
  status: CaseStatus;
  count: number;
}

export interface CaseOverTime {
  day: string;
  date: string;
  value: number;
}

export interface DashboardStats {
  kpis: DashboardKPIs;
  payment_summary: {
    total_processed: number;
    total_reconciled: number;
    period: string;
  };
  status_breakdown: StatusBreakdown[];
  ai_performance: AIPerformanceStats;
  anomalies_breakdown: AnomalyBreakdown;
  pipeline_health: PipelineHealthItem[];
  attention_required: ReconciliationCase[];
  cases_over_time: CaseOverTime[];
}

export interface AIPerformanceStats {
  success_rate: number;
  active_agents: number;
  system_status: string;
  processed: number;
  reconciled: number;
  anomalies: number;
  escalated: number;
  avg_latency: string;
  tokens_consumed: number;
}

export interface AnomalyBreakdown {
  total: number;
  requires_review: number;
  escalated: number;
  cleared: number;
}

export interface PipelineHealthItem {
  name: string;
  role: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  latency: string;
}
