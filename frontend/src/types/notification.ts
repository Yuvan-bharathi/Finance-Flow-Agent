// ============================================================
// notification.ts — Agent 6 Notification & Escalation types
// ============================================================

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
export type AlertStatus = 'pending' | 'approved' | 'dismissed' | string;

export interface NotificationAlert {
  id: number;
  case_id?: number;
  payment_id?: number;
  company_name?: string;
  loan_account_id?: number;
  severity: AlertSeverity;
  status: AlertStatus;
  subject?: string;
  title?: string;
  message?: string;
  channel?: string;
  sla_breach_date?: string;
  days_overdue?: number;
  outstanding_amount?: number | string;
  notification_status?: string;
  escalation_level?: string;
  recommended_recipient?: string;
  contact_name?: string;
  contact_email?: string;
  overdue_days?: number;
  ai_reasoning?: string;
  message_draft?: string;
  recommended_action?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  dismissed_at?: string;
  actioned_by?: string;
}

export type EnrichedAlert = NotificationAlert;

export interface AlertFilterParams {
  status?: AlertStatus;
  severity?: AlertSeverity;
  limit?: number;
}

export interface EscalationScanResult {
  alerts_created: number;
  alerts: NotificationAlert[];
}

export interface BatchActionPayload {
  alertIds: number[];
}
