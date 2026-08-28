// ============================================================
// loan.ts — Loan Accounts & Repayment Schedule types
// ============================================================

export type LoanStatus = 'active' | 'closed' | 'defaulted' | 'npa' | 'restructured' | string;
export type MilestoneStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived' | string;

export interface ScheduleMilestone {
  id: number;
  loan_account_id?: number;
  loan_id?: number;
  installment_number?: number;
  milestone_name?: string;
  due_date: string;
  principal_due?: number;
  interest_due?: number;
  total_due?: number;
  scheduled_amount?: number;
  paid_amount?: number;
  amount_paid?: number;
  outstanding?: number;
  remaining_amount?: number;
  status: MilestoneStatus;
  days_overdue?: number;
  paid_date?: string;
  transaction_id?: string;
}

export type LoanSchedule = ScheduleMilestone;

export interface RepaymentSchedule {
  id: number;
  loan_account_id: number;
  company_id: number;
  schedule_type?: string;
  total_sanctioned?: number;
  total_repaid?: number;
  total_outstanding?: number;
  milestones?: ScheduleMilestone[];
  created_at: string;
}

export interface LoanAccount {
  id: number;
  company_id: number;
  company_name?: string;
  loan_reference?: string;
  loan_number?: string;
  loan_type?: string;
  sanctioned_amount?: number;
  disbursed_amount?: number;
  principal_amount?: number | string;
  outstanding_amount?: number;
  interest_rate: number | string;
  tenure_months: number | string;
  start_date: string;
  maturity_date?: string;
  status: LoanStatus;
  risk_grade?: string;
  schedules?: ScheduleMilestone[];
  created_at?: string;
  updated_at?: string;
}

export type Loan = LoanAccount;
