// ============================================================
// playbook.ts — Deterministic SOP Playbook domain types
// ============================================================

export type PlaybookStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED' | 'SKIPPED';
export type PlaybookStepStatus = 'pending' | 'completed' | 'skipped';

export interface PlaybookStep {
  id: number;
  step_number?: number;
  title?: string;
  label?: string;
  description?: string;
  desc?: string;
  required?: boolean;
  guardrail?: string;
  status?: PlaybookStepStatus;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
}

export interface Playbook {
  playbook_id?: string;
  id?: string | number;
  title: string;
  trigger_reason?: string;
  trigger?: string;
  severity?: string;
  estimatedDuration?: string;
  description?: string;
  evidence?: Record<string, unknown>;
  steps: PlaybookStep[];
  status?: PlaybookStatus;
  safe_to_allocate?: boolean;
  requires_manual_review?: boolean;
  requires_escalation?: boolean;
  progress?: PlaybookProgress;
}

export type StandardPlaybook = Playbook;

export interface PlaybookProgress {
  total_steps: number;
  completed_steps: number;
  percentage: number;
  all_required_complete: boolean;
}
