// ============================================================
// anomaly.ts — Agent 7 Anomaly Detection domain types
// ============================================================

export type AnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR';
export type AnomalyType =
  | 'DUPLICATE_PAYMENT'
  | 'AMOUNT_ANOMALY'
  | 'OVERPAYMENT'
  | 'UNALLOCATED_DEPOSIT'
  | 'UNKNOWN_PAYER'
  | 'SLA_BREACH'
  | 'WATERFALL_ANOMALY'
  | string;

export type AnomalyStatus = 'flagged' | 'reviewed' | 'dismissed' | 'escalated' | 'cleared' | 'pending' | string;

export interface AnomalyRecord {
  id: number;
  payment_id: number;
  case_id?: number;
  transaction_id?: string;
  company_name?: string;
  anomaly_type?: AnomalyType;
  anomaly_types?: string[] | string;
  severity: AnomalySeverity;
  anomaly_score: number;
  description?: string;
  evidence?: Record<string, unknown> | string;
  status: AnomalyStatus;
  recommended_action?: string;
  recommendation?: string;
  explanation?: string;
  safe_to_allocate?: boolean;
  requires_manual_review?: boolean;
  score_breakdown?: Record<string, unknown> | string;
  amount?: number;
  sender_account?: string;
  isLive?: boolean;
  dismiss_reason?: string;
  dismissed_by?: string;
  dismissed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface AnomalyCheck {
  payment_id: number;
  case_id?: number;
  anomalies: AnomalyRecord[];
  overall_score: number;
  highest_severity: AnomalySeverity;
  requires_review: boolean;
}

export interface AnomalyListParams {
  status?: AnomalyStatus;
  severity?: AnomalySeverity;
  page?: number;
  limit?: number;
}
