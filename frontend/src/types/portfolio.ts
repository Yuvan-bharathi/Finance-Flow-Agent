// ============================================================
// portfolio.ts — Agent 5 Portfolio Analytics types
// ============================================================

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DelinquencyBand {
  band: string;           // e.g. "0-30 days", "31-60 days"
  count: number;
  amount: number;
  percentage: number;
}

export interface PortfolioMetrics {
  total_portfolio_value: number;
  total_outstanding: number;
  total_overdue: number;
  npa_amount: number;
  npa_percentage: number;
  collection_efficiency: number;
  active_loan_count: number;
  defaulted_loan_count: number;
  delinquency_bands: DelinquencyBand[];
}

export interface PortfolioSnapshot {
  id: number;
  health_score: number;
  health_grade: HealthGrade;
  ai_interpretation: string;
  metrics: PortfolioMetrics;
  risk_flags?: string[];
  recommendations?: string[];
  created_at: string;
}
