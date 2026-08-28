// ============================================================
// company.ts — Borrowing Companies domain types
// ============================================================

export type CompanyStatus = 'active' | 'inactive' | 'watchlist' | 'defaulted' | 'blacklisted' | string;
export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CompanyContact {
  id?: number;
  name?: string;
  contact_name?: string;
  email?: string;
  contact_email?: string;
  phone?: string;
  contact_phone?: string;
  designation?: string;
  is_primary?: boolean;
}

export interface CompanyFacility {
  id: number;
  facility_type?: string;
  sanctioned_amount?: number;
  outstanding_amount?: number;
  interest_rate?: number;
  tenure_months?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface BorrowingCompany {
  id: number;
  name?: string;
  company_name?: string;
  cin?: string;
  pan?: string;
  gstin?: string;
  registration_number?: string;
  tax_identifier?: string;
  bank_account_number?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  industry?: string;
  status: CompanyStatus;
  risk_grade?: RiskGrade;
  credit_score?: number;
  total_exposure?: number;
  outstanding_amount?: number;
  overdue_amount?: number;
  contacts?: CompanyContact[];
  facilities?: CompanyFacility[];
  created_at?: string;
  updated_at?: string;
}

export type Company = BorrowingCompany;
