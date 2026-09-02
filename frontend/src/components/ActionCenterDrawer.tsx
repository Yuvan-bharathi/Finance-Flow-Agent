import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Bot,
  BookOpen,
  CheckSquare,
  Square,
  Send,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../services/api';
import {
  analyzeCase,
  approveRecommendation,
  rejectRecommendation,
  overrideRecommendation,
  getCaseById,
  getCasePlaybook,
  updatePlaybookStep,
  updatePlaybookStatus,
} from '../services/reconciliationService';
import { StatusBadge } from './Dashboard/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { ReconciliationCase, AIRecommendation } from '../types/reconciliation';
import type { Company } from '../types/company';
import type { LoanAccount } from '../types/loan';

const formatAuditTimestamp = (dateStr?: string) => {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface WaterfallAllocation {
  schedule_id: number;
  installment_number: number;
  due_date: string;
  allocated_amount: number;
  projected_status: string;
  remaining_balance: number;
}

interface WaterfallPreview {
  allocations_count?: number;
  allocations?: WaterfallAllocation[];
  post_settlement_overdue_exposure?: number;
  unallocated_amount?: number;
}

export interface DrawerRecommendation {
  id?: number;
  case_id?: number;
  confidence_score?: number | string;
  reasoning?: string;
  company_name?: string;
  loan_number?: string;
  recommended_company_id?: number | string;
  recommended_loan_id?: number | string;
  recommended_schedule_id?: number | string;
  waterfall_preview?: WaterfallPreview;
  status?: string;
}

export interface EnrichedCase extends Omit<ReconciliationCase, 'recommendations'> {
  sender_account?: string;
  reference?: string;
  payment_date?: string;
  resolution_reason?: string;
  latest_recommendation?: DrawerRecommendation;
  recommendations?: (AIRecommendation | DrawerRecommendation)[];
}

interface PlaybookData {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  overallStatus?: string;
  safeToAllocate?: boolean;
  requiresAgent6Escalation?: boolean;
  completedStepsCount?: number;
  totalStepsCount?: number;
  steps?: Array<{
    id: number | string;
    label?: string;
    title?: string;
    desc?: string;
    description?: string;
    isCompleted?: boolean;
    isMandatory?: boolean;
    completedBy?: string;
    completedAt?: string;
  }>;
}

interface ActionCenterDrawerProps {
  caseItem: ReconciliationCase | EnrichedCase | null;
  onClose: () => void;
  onRefresh?: (optimisticUpdate?: { id: number; status: string }) => void;
  onAskAI?: (recordType: string, recordId: number) => void;
}

/**
 * Slide-over Action Center AI Review Drawer
 */
export const ActionCenterDrawer = ({
  caseItem,
  onClose,
  onRefresh,
  onAskAI,
}: ActionCenterDrawerProps) => {
  const { user } = useAuth();
  const isViewer = ((user as unknown as Record<string, string>)?.role_name || user?.role || '').toLowerCase() === 'viewer';

  const [activeCase, setActiveCase] = useState<EnrichedCase | null>(caseItem as EnrichedCase | null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const [overrideScheduleId, setOverrideScheduleId] = useState('');
  const [overrideAmount, setOverrideAmount] = useState<string | number>(caseItem?.amount || '');
  const [overrideReasonText, setOverrideReasonText] = useState('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);

  // Fetch companies and loans for manual override target selection
  useEffect(() => {
    if (showOverrideForm && companies.length === 0) {
      setLoadingLookups(true);
      void Promise.all([
        api.get('/companies').then(res => setCompanies((res.data?.data || []) as Company[])),
        api.get('/loans').then(res => setLoans((res.data?.data || []) as LoanAccount[])),
      ])
        .catch(err => console.warn('[ActionCenterDrawer] Failed to fetch companies/loans:', err))
        .finally(() => setLoadingLookups(false));
    }
  }, [showOverrideForm, companies.length]);

  // If activeCase has a company_id, preselect it
  useEffect(() => {
    if (caseItem?.company_id && !selectedCompanyId) {
      setSelectedCompanyId(String(caseItem.company_id));
    }
    if (caseItem?.amount) {
      setOverrideAmount(caseItem.amount);
    }
  }, [caseItem, selectedCompanyId]);

  const [loanSchedulesMap, setLoanSchedulesMap] = useState<Record<number, Array<{ id: number; loan_id: number; installment_number: number; due_date: string; scheduled_amount: number; paid_amount: number; status: string }>>>({});

  // Compute available loan repayment schedules for the chosen company
  useEffect(() => {
    if (!selectedCompanyId) return;
    const companyLoans = loans.filter(l => String(l.company_id) === String(selectedCompanyId));
    companyLoans.forEach(l => {
      if (!loanSchedulesMap[l.id]) {
        api.get(`/repayments/loan/${l.id}`)
          .then(res => {
            const list = (res.data?.data || []) as Array<{ id: number; loan_id: number; installment_number: number; due_date: string; scheduled_amount: number; paid_amount: number; status: string }>;
            setLoanSchedulesMap(prev => ({ ...prev, [l.id]: list }));
          })
          .catch(err => console.warn(`Failed to fetch schedules for loan ${l.id}:`, err));
      }
    });
  }, [selectedCompanyId, loans, loanSchedulesMap]);

  const availableSchedules = useMemo(() => {
    if (!selectedCompanyId) return [];
    const companyLoans = loans.filter(l => String(l.company_id) === String(selectedCompanyId));
    const schedList: Array<{
      id: number;
      loan_id: number;
      loan_ref?: string;
      installment_number?: number;
      due_date?: string;
      total_due?: number;
      scheduled_amount?: number;
      outstanding?: number;
    }> = [];

    companyLoans.forEach(l => {
      const realSchedules = loanSchedulesMap[l.id] || (Array.isArray(l.schedules) ? l.schedules : []);
      if (realSchedules.length > 0) {
        realSchedules.forEach(s => {
          const schedAmt = typeof s.scheduled_amount === 'number' ? s.scheduled_amount : parseFloat(String(s.scheduled_amount || 0));
          const paidAmt = typeof s.paid_amount === 'number' ? s.paid_amount : parseFloat(String(s.paid_amount || 0));
          const outstanding = Math.max(0, schedAmt - paidAmt);
          schedList.push({
            id: s.id,
            loan_id: l.id,
            loan_ref: l.loan_reference || l.loan_number || `LN-${l.id}`,
            installment_number: s.installment_number,
            due_date: s.due_date,
            total_due: outstanding || schedAmt,
            scheduled_amount: schedAmt,
            outstanding,
          });
        });
      } else {
        schedList.push({
          id: l.id,
          loan_id: l.id,
          loan_ref: l.loan_reference || l.loan_number || `LN-${l.id}`,
          installment_number: 1,
          due_date: l.start_date,
          total_due: typeof l.principal_amount === 'number' ? l.principal_amount : parseFloat(String(l.principal_amount || 0)),
        });
      }
    });
    return schedList;
  }, [selectedCompanyId, loans, loanSchedulesMap]);

  useEffect(() => {
    setActiveCase(caseItem as EnrichedCase | null);
    if (caseItem?.id) {
      getCaseById(caseItem.id)
        .then(fullCase => {
          if (fullCase) {
            setActiveCase(prev => ({ ...(prev || {}), ...(fullCase as EnrichedCase) }));
          }
        })
        .catch(err => console.warn('[ActionCenterDrawer] Failed to fetch full case details:', err));

      getCasePlaybook(caseItem.id)
        .then(pbData => {
          if (pbData) setPlaybook(pbData as unknown as PlaybookData);
        })
        .catch(err => console.warn('[ActionCenterDrawer] Playbook fetch skipped:', (err as Error).message));
    }
  }, [caseItem]);

  const handleTogglePlaybookStep = async (stepId: number | string, currentCompleted?: boolean) => {
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only.');
      return;
    }
    if (!caseItem) return;

    const targetCompleted = !currentCompleted;
    const numStepId = typeof stepId === 'number' ? stepId : parseInt(String(stepId), 10) || 1;

    // ⚡ Optimistic UI Update (0ms instant response without waiting for network)
    setPlaybook(prev => {
      if (!prev || !prev.steps) return prev;
      const updatedSteps = prev.steps.map(s => {
        if (s.id === stepId || s.id === numStepId || String(s.id) === String(stepId)) {
          return { ...s, isCompleted: targetCompleted };
        }
        return s;
      });
      const completedCount = updatedSteps.filter(s => s.isCompleted).length;
      return {
        ...prev,
        steps: updatedSteps,
        completedStepsCount: completedCount,
        overallStatus: completedCount === 0 ? 'NOT_STARTED' : 'IN_PROGRESS',
      };
    });

    try {
      const updatedPb = await updatePlaybookStep(caseItem.id, numStepId, targetCompleted);
      if (updatedPb) {
        setPlaybook(prev => ({
          ...(prev || {}),
          ...(updatedPb as unknown as PlaybookData),
        }));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update playbook step progress.');
      // Rollback on network failure
      setPlaybook(prev => {
        if (!prev || !prev.steps) return prev;
        return {
          ...prev,
          steps: prev.steps.map(s => {
            if (s.id === stepId || s.id === numStepId || String(s.id) === String(stepId)) {
              return { ...s, isCompleted: currentCompleted };
            }
            return s;
          }),
        };
      });
    }
  };

  const handleCompletePlaybookReview = async () => {
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only.');
      return;
    }
    if (!caseItem) return;
    try {
      setSubmitting(true);
      setPlaybook(prev => prev ? { ...prev, overallStatus: 'COMPLETED' } : null);
      const updatedPb = await updatePlaybookStatus(caseItem.id, 'COMPLETED');
      if (updatedPb) setPlaybook(updatedPb as unknown as PlaybookData);
      setSuccessMsg('Operational Playbook review marked as COMPLETED.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to mark playbook as completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalatePlaybook = async () => {
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only.');
      return;
    }
    if (!caseItem) return;
    try {
      setSubmitting(true);
      const updatedPb = await updatePlaybookStatus(caseItem.id, 'ESCALATED');
      if (updatedPb) setPlaybook(updatedPb as unknown as PlaybookData);
      setSuccessMsg('Case has been flagged and escalated to Agent 6 Notification Dispatcher.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to escalate playbook to Agent 6.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!caseItem) return null;

  const currentCase = activeCase || (caseItem as EnrichedCase);
  const normStatus = (currentCase.status || '').toLowerCase();
  const rec = (currentCase.latest_recommendation || (currentCase.recommendations && currentCase.recommendations[0])) as DrawerRecommendation | undefined;
  const confidenceScore = rec ? parseFloat(String(rec.confidence_score)) : null;
  const isAnalyzed = Boolean(rec || (normStatus !== 'new' && normStatus !== 'open'));
  const mandatorySteps = playbook?.steps?.filter(s => s.isMandatory !== false) || [];
  const mandatoryStepsCompleted = mandatorySteps.length > 0
    ? mandatorySteps.every(s => s.isCompleted)
    : true;
  const isPlaybookCompleted = playbook?.overallStatus === 'COMPLETED';
  const hasTargetLoan = Boolean(rec?.recommended_loan_id || rec?.recommended_schedule_id);

  const handleRunAnalysis = async () => {
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot trigger AI analysis.');
      return;
    }
    try {
      setAnalyzing(true);
      setErrorMsg('');
      const res = await analyzeCase(currentCase.id);
      setSuccessMsg('AI Payment Reconciliation Analysis completed successfully!');

      if (res) {
        const resObj = res as unknown as { case?: EnrichedCase; recommendation?: DrawerRecommendation };
        const updated: EnrichedCase = {
          ...(resObj.case || currentCase),
          status: 'pending_review',
          latest_recommendation: resObj.recommendation || resObj.case?.latest_recommendation || currentCase.latest_recommendation,
        };
        setActiveCase(updated);
      }

      onRefresh?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'AI Analysis failed.';
      setErrorMsg(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprove = async () => {
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot approve allocations.');
      return;
    }
    if (!hasTargetLoan) {
      setErrorMsg('⚠️ Cannot approve match: Target loan facility could not be identified by AI. Please use Override below to select a borrower and loan facility.');
      setShowOverrideForm(true);
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');

      const updatedCaseObj: EnrichedCase = { ...currentCase, status: 'resolved' };
      setActiveCase(updatedCaseObj);

      onRefresh?.({ id: currentCase.id, status: 'resolved' });

      if (rec?.id) {
        await approveRecommendation(rec.id, 'Approved by accountant via Action Center UI', currentCase?.id);
      }
      setSuccessMsg('Payment successfully allocated to ledger! Installment marked PAID.');

      setTimeout(() => {
        onRefresh?.();
        onClose();
      }, 400);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Approval failed.';
      setErrorMsg(msg);
      setActiveCase(currentCase);
      onRefresh?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot reject recommendations.');
      return;
    }
    if (!rejectReason.trim()) return;
    try {
      setSubmitting(true);
      setErrorMsg('');

      setActiveCase({ ...currentCase, status: 'open' });
      onRefresh?.({ id: currentCase.id, status: 'open' });

      if (rec?.id) {
        await rejectRecommendation(rec.id, rejectReason, currentCase?.id);
      }
      setSuccessMsg('Recommendation rejected. Case flagged for manual review.');

      setTimeout(() => {
        onRefresh?.();
        onClose();
      }, 400);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Rejection failed.';
      setErrorMsg(msg);
      setActiveCase(currentCase);
      onRefresh?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot perform manual overrides.');
      return;
    }
    if (!overrideScheduleId || !overrideAmount || !overrideReasonText.trim()) {
      setErrorMsg('Target Schedule ID, Amount, and Override Rationale are required.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');

      setActiveCase({ ...currentCase, status: 'resolved' });
      onRefresh?.({ id: currentCase.id, status: 'resolved' });

      await overrideRecommendation({
        caseId: caseItem.id,
        repayment_schedule_id: parseInt(overrideScheduleId, 10),
        allocated_amount: parseFloat(String(overrideAmount)),
        override_reason: overrideReasonText,
      });
      setSuccessMsg('Manual override completed! Ledger updated.');

      setTimeout(() => {
        onRefresh?.();
        onClose();
      }, 400);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Override failed.';
      setErrorMsg(msg);
      setActiveCase(currentCase);
      onRefresh?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '100vw',
          background: '#ffffff',
          height: '100%',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: 'default',
        }}
        className="drawer-panel animate-fade-in"
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Case #{caseItem.id} Details
              </h2>
              <StatusBadge status={caseItem.status} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'monospace', marginTop: '4px' }}>
              TXN ID: {caseItem.transaction_id}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => {
                onAskAI?.('reconciliation_case', caseItem.id);
              }}
              title="Ask AI Copilot to investigate and explain this case"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
              }}
            >
              <Bot size={13} />
              <span>Ask AI</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {successMsg && (
            <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#059669', padding: '14px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '14px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Deposit Evidence Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Incoming Bank Deposit Evidence
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Deposit Amount</span>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                  ₹{parseFloat(String(caseItem.amount)).toLocaleString('en-IN', {
                    maximumFractionDigits: parseFloat(String(caseItem.amount)) % 1 === 0 ? 0 : 2
                  })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Payment Date</span>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                  {(caseItem as EnrichedCase).payment_date || '—'}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.825rem' }}>
              <div>
                <strong style={{ color: '#475569' }}>Sender Name:</strong>{' '}
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{caseItem.sender_name || 'N/A'}</span>
              </div>
              <div>
                <strong style={{ color: '#475569' }}>Sender Account:</strong>{' '}
                <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#1e293b' }}>{(caseItem as EnrichedCase).sender_account || 'N/A'}</code>
              </div>
              <div>
                <strong style={{ color: '#475569' }}>Bank Narration:</strong>{' '}
                <span style={{ color: '#6366f1', fontWeight: '600' }}>{(caseItem as EnrichedCase).reference || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Operational Playbook - Exclusive to analysed payment transactions only */}
          {playbook && isAnalyzed && (
            <div style={{
              background: '#ffffff',
              border: `1.5px solid ${playbook.severity === 'CRITICAL' ? '#fca5a5' : playbook.severity === 'HIGH' ? '#fed7aa' : '#e2e8f0'}`,
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(99,102,241,0.25)',
                  }}>
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recommended Operational Playbook
                    </div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      {playbook.title}
                    </h3>
                  </div>
                </div>

                <span style={{
                  background: playbook.overallStatus === 'COMPLETED' ? '#dcfce7' : playbook.overallStatus === 'ESCALATED' ? '#fee2e2' : '#fef3c7',
                  color: playbook.overallStatus === 'COMPLETED' ? '#15803d' : playbook.overallStatus === 'ESCALATED' ? '#991b1b' : '#b45309',
                  border: `1px solid ${playbook.overallStatus === 'COMPLETED' ? '#bbf7d0' : playbook.overallStatus === 'ESCALATED' ? '#fecaca' : '#fde68a'}`,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                }}>
                  {playbook.overallStatus || playbook.status || 'ACTIVE'}
                </span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                <strong style={{ color: '#0f172a' }}>Why this playbook? </strong>
                {playbook.description}
              </div>

              {/* Step Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                {playbook.steps && playbook.steps.map(step => (
                  <div
                    key={step.id}
                    onClick={() => handleTogglePlaybookStep(step.id, step.isCompleted)}
                    style={{
                      background: step.isCompleted ? '#f0fdf4' : '#fafbfc',
                      border: `1px solid ${step.isCompleted ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      cursor: isViewer ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ marginTop: '2px', color: step.isCompleted ? '#16a34a' : '#94a3b8' }}>
                      {step.isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: step.isCompleted ? '#15803d' : '#1e293b' }}>
                          {step.label || step.title || `Step #${step.id}`}
                        </div>
                        {step.isMandatory !== false ? (
                          <span style={{ fontSize: '0.62rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                            REQUIRED
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.62rem', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>
                            OPTIONAL
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {step.desc || step.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Playbook Review Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={handleCompletePlaybookReview}
                  disabled={isViewer || !mandatoryStepsCompleted || isPlaybookCompleted || submitting}
                  title={
                    isPlaybookCompleted
                      ? 'Operational Playbook review is completed'
                      : (!mandatoryStepsCompleted
                          ? 'Please complete all required checkboxes before completing review'
                          : 'Complete Playbook Review')
                  }
                  style={{
                    flex: 1,
                    background: isPlaybookCompleted
                      ? '#d1fae5'
                      : (!mandatoryStepsCompleted || isViewer)
                        ? '#94a3b8'
                        : '#4f46e5',
                    color: isPlaybookCompleted ? '#065f46' : '#ffffff',
                    border: isPlaybookCompleted ? '1.5px solid #a7f3d0' : 'none',
                    borderRadius: '8px',
                    padding: '9px 14px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    cursor: (isPlaybookCompleted || !mandatoryStepsCompleted || isViewer || submitting) ? 'default' : 'pointer',
                    opacity: (!mandatoryStepsCompleted && !isPlaybookCompleted) ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle size={15} color={isPlaybookCompleted ? '#059669' : '#ffffff'} />
                  <span>
                    {isPlaybookCompleted
                      ? '✓ Review Completed'
                      : (!mandatoryStepsCompleted && mandatorySteps.length
                          ? `Complete Required Steps (${mandatorySteps.filter(s => s.isCompleted).length}/${mandatorySteps.length})`
                          : 'Complete Review')}
                  </span>
                </button>

                <button
                  onClick={handleEscalatePlaybook}
                  disabled={isViewer}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '9px 14px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    cursor: isViewer ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} />
                  <span>Escalate to Agent 6</span>
                </button>
              </div>
            </div>
          )}

          {/* AI Candidate Match */}
          {rec ? (
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%)',
              border: '1.5px solid #c084fc',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#7c3aed" />
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#4c1d95' }}>
                    Groq AI Candidate Match
                  </h3>
                </div>

                <div style={{
                  background: (confidenceScore ?? 0) >= 90 ? '#d1fae5' : (confidenceScore ?? 0) >= 70 ? '#dbeafe' : '#fef3c7',
                  border: `1px solid ${(confidenceScore ?? 0) >= 90 ? '#a7f3d0' : (confidenceScore ?? 0) >= 70 ? '#bfdbfe' : '#fcd34d'}`,
                  color: (confidenceScore ?? 0) >= 90 ? '#059669' : (confidenceScore ?? 0) >= 70 ? '#2563eb' : '#d97706',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                }}>
                  {confidenceScore}% Confidence
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b21a8', fontWeight: '700' }}>Matched Borrower:</span>
                  <strong style={{ color: '#0f172a' }}>{rec.company_name || `Company #${rec.recommended_company_id || 'N/A'}`}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b21a8', fontWeight: '700' }}>Matched Loan Facility:</span>
                  <strong style={{ color: '#4f46e5' }}>{rec.loan_number || `Loan #${rec.recommended_loan_id || 'N/A'}`}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b21a8', fontWeight: '700' }}>Total Payment Ingested:</span>
                  <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                    ₹{parseFloat(String(caseItem.amount)).toLocaleString('en-IN', {
                      maximumFractionDigits: parseFloat(String(caseItem.amount)) % 1 === 0 ? 0 : 2
                    })}
                  </strong>
                </div>
              </div>

              {/* Waterfall Preview */}
              {rec.waterfall_preview?.allocations && rec.waterfall_preview.allocations.length > 0 && (
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e9d5ff', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#4c1d95', textTransform: 'uppercase' }}>
                    🌊 Proposed Waterfall Allocation Plan
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#faf5ff', color: '#6b21a8', fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #e9d5ff' }}>
                        <th style={{ padding: '6px 8px', fontWeight: '800' }}>#</th>
                        <th style={{ padding: '6px 8px', fontWeight: '800' }}>Due Date</th>
                        <th style={{ padding: '6px 8px', fontWeight: '800' }}>Allocation</th>
                        <th style={{ padding: '6px 8px', fontWeight: '800', textAlign: 'right' }}>Result Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.waterfall_preview.allocations.map((alloc: WaterfallAllocation) => (
                        <tr key={alloc.schedule_id} style={{ borderBottom: '1px solid #f3e8ff' }}>
                          <td style={{ padding: '8px', fontWeight: '800', color: '#4c1d95' }}>#{alloc.installment_number}</td>
                          <td style={{ padding: '8px', color: '#334155' }}>{formatAuditTimestamp(alloc.due_date)}</td>
                          <td style={{ padding: '8px', fontWeight: '800', color: '#059669' }}>
                            ₹{alloc.allocated_amount.toLocaleString('en-IN', {
                              maximumFractionDigits: alloc.allocated_amount % 1 === 0 ? 0 : 2
                            })}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '800' }}>
                              ✓ FULLY PAID
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Reasoning */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  AI Evidence Reasoning Breakdown
                </div>
                <div style={{ fontSize: '0.825rem', color: '#334155', background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e9d5ff', lineHeight: 1.5 }}>
                  {rec.reasoning || 'AI agent matched bank deposit narration reference string directly with active loan contract.'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: normStatus === 'ai_failed' ? '#fff5f5' : '#f8fafc',
              border: normStatus === 'ai_failed' ? '1.5px solid #fca5a5' : '1.5px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}>
              <Sparkles size={32} color="#6366f1" />
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                Payment Received — Awaiting AI Analysis
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '360px' }}>
                Payment is registered in status <strong>NEW</strong>. Trigger Agent 1 to execute zero-token pre-checks and Groq LLM tool calling.
              </p>
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="btn-primary"
                style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Running Agent 1 Analysis…</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Trigger Groq AI Payment Analysis</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Action Settlement Controls */}
          {rec && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                Human-in-the-Loop Actions
              </div>

              {(normStatus === 'approved' || normStatus === 'resolved') && (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle size={20} color="#059669" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#065f46' }}>Settlement Finalized &amp; Allocated</div>
                      <div style={{ fontSize: '0.75rem', color: '#047857' }}>Payment is posted in the ledger. Invoice &amp; receipt ready for generation.</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      window.location.href = `/documents?caseId=${caseItem.id}&type=payment_receipt`;
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(79,70,229,0.25)',
                      marginTop: '4px'
                    }}
                  >
                    <FileSpreadsheet size={14} /> 🧾 Generate &amp; View Payment Receipt / Invoice
                  </button>
                </div>
              )}

              {normStatus === 'rejected' && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <XCircle size={20} color="#dc2626" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#991b1b' }}>Case Status: REJECTED</div>
                    <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>{(currentCase as EnrichedCase).resolution_reason || 'Rejected by accountant.'} You can re-approve or apply an override.</div>
                  </div>
                </div>
              )}

              {!showRejectForm && !showOverrideForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {!hasTargetLoan && isAnalyzed && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Unmapped Loan Facility:</strong> AI could not match this deposit to a borrower loan (Company #N/A, Loan #N/A). Please use <strong>Override</strong> to assign a loan, or <strong>Reject</strong>.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(normStatus !== 'approved' && normStatus !== 'resolved') && (
                      <button
                        onClick={handleApprove}
                        disabled={submitting || !hasTargetLoan || (Boolean(playbook && isAnalyzed && !mandatoryStepsCompleted))}
                        className="interactive-btn"
                        title={
                          !hasTargetLoan
                            ? 'Target loan facility could not be identified by AI. Please use Override to assign a loan.'
                            : (playbook && isAnalyzed && !mandatoryStepsCompleted
                                ? 'Please complete all required operational playbook checkboxes above before approving settlement'
                                : 'Approve Match & Execute Continuous Waterfall')
                        }
                        style={{
                          flex: 2,
                          background: (!hasTargetLoan || (playbook && isAnalyzed && !mandatoryStepsCompleted))
                            ? '#94a3b8'
                            : (submitting ? '#059669' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'),
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 18px',
                          borderRadius: '12px',
                          fontSize: '0.9rem',
                          fontWeight: '800',
                          cursor: (submitting || !hasTargetLoan || (Boolean(playbook && isAnalyzed && !mandatoryStepsCompleted))) ? 'not-allowed' : 'pointer',
                          opacity: (!hasTargetLoan || (playbook && isAnalyzed && !mandatoryStepsCompleted)) ? 0.6 : 1,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: (!hasTargetLoan || (playbook && isAnalyzed && !mandatoryStepsCompleted)) ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        {submitting ? (
                          <>
                            <RefreshCw size={18} className="animate-spin" />
                            <span>Allocating to Ledger...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            <span>
                              {!hasTargetLoan
                                ? 'No Loan Identified (Use Override)'
                                : (playbook && isAnalyzed && !mandatoryStepsCompleted
                                    ? 'Complete Required Steps to Approve'
                                    : 'Approve Match')}
                            </span>
                          </>
                        )}
                      </button>
                    )}

                  {normStatus !== 'rejected' && (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        background: '#ffffff',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {(normStatus === 'approved' || normStatus === 'resolved') ? 'Void / Reject' : 'Reject'}
                    </button>
                  )}

                  <button
                    onClick={() => setShowOverrideForm(true)}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Override
                  </button>
                </div>
              </div>
            )}

              {/* Reject Form */}
              {showRejectForm && (
                <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fee2e2', padding: '14px', borderRadius: '12px', border: '1px solid #fca5a5' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#dc2626' }}>Reject Recommendation &amp; Reverse Allocation</div>
                  <input
                    type="text"
                    required
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid #fca5a5', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" disabled={submitting} style={{ flex: 1, background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Confirm Reject</button>
                    <button type="button" onClick={() => setShowRejectForm(false)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              )}

              {/* Override Form */}
              {showOverrideForm && (
                <form onSubmit={handleOverride} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>Manual Accountant Override &amp; Company Allocation</div>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '6px' }}>HUMAN-IN-THE-LOOP</span>
                  </div>

                  {/* 1. Target Company Selector */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      <Building2 size={13} color="#4f46e5" />
                      1. Select Target Borrower Company
                    </label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        setOverrideScheduleId('');
                      }}
                      required
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}
                    >
                      <option value="">{loadingLookups ? 'Loading companies...' : '-- Choose Borrower Company --'}</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.company_name} ({c.pan || c.cin || c.registration_number || `ID #${c.id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Target Loan / Repayment Schedule Selector */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      <FileSpreadsheet size={13} color="#4f46e5" />
                      2. Select Target Loan Facility &amp; Repayment Schedule
                    </label>
                    <select
                      value={overrideScheduleId}
                      onChange={(e) => setOverrideScheduleId(e.target.value)}
                      required
                      disabled={!selectedCompanyId}
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}
                    >
                      <option value="">
                        {!selectedCompanyId
                          ? '-- Select Borrower Company First --'
                          : availableSchedules.length === 0
                          ? '-- No Active Loan Schedules Found --'
                          : '-- Choose Loan Schedule / Installment --'}
                      </option>
                      {availableSchedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.loan_ref} — EMI #{s.installment_number || 1} (Due: {s.due_date || 'Current'}, Balance: ₹{Number(s.total_due || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Allocated Amount */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      3. Allocated Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="Allocated Amount"
                      value={overrideAmount}
                      onChange={(e) => setOverrideAmount(e.target.value)}
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}
                    />
                  </div>

                  {/* 4. Rationale Text */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      4. Audit Rationale &amp; Investigation Notes
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Verified sender Apex Logistic is legal subsidiary of Apex Logistics Pvt Ltd"
                      value={overrideReasonText}
                      onChange={(e) => setOverrideReasonText(e.target.value)}
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        flex: 1,
                        background: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      {submitting ? 'Allocating...' : 'Apply Override & Settle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOverrideForm(false)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        padding: '9px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionCenterDrawer;
