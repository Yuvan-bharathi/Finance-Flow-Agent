import React, { useState } from 'react';
import { Sparkles, AlertCircle, Clock, CheckCircle2, DollarSign, ChevronRight, ChevronLeft, Bot, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: MobileDailyBriefing
 * 
 * Purpose:
 *   Mobile-first AI Daily Briefing and interactive Priority Review Workflow.
 *   Allows accountants/managers on mobile to step sequentially through high-priority items.
 */
export const MobileDailyBriefing = ({
  kpis = {},
  onInvestigateCase,
  onOpenAiCopilot
}) => {
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Mock priority items derived from real KPI context
  const priorityItems = [
    {
      id: 16,
      caseNumber: 'CASE-016',
      amount: '₹1,00,000',
      company: 'Apex Logistics Ltd',
      severity: 'Critical',
      issue: 'Transaction reference hash mismatch against bank statement feed.',
      recommendation: 'Cross-check UTR reference and investigate company payment history.'
    },
    {
      id: 28,
      caseNumber: 'CASE-028',
      amount: '₹50,000',
      company: 'CyberNet Systems',
      severity: 'High',
      issue: 'Multiple partial payments detected without invoice breakdown.',
      recommendation: 'Trigger Agent 2 for credit risk recalculation.'
    },
    {
      id: 42,
      caseNumber: 'CASE-042',
      amount: '₹2,50,000',
      company: 'Horizon Infra Corp',
      severity: 'Ready for Review',
      issue: '95% AI confidence match on automated bank ledger reconciliation.',
      recommendation: 'Ready for human accountant final confirmation.'
    }
  ];

  const currentItem = priorityItems[reviewIndex];

  const handleNext = () => {
    triggerHaptic('light');
    if (reviewIndex < priorityItems.length - 1) {
      setReviewIndex(reviewIndex + 1);
    } else {
      setIsReviewMode(false);
      setReviewIndex(0);
      triggerHaptic('success');
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (reviewIndex > 0) {
      setReviewIndex(reviewIndex - 1);
    }
  };

  const handleInvestigate = () => {
    triggerHaptic('light');
    if (onInvestigateCase && currentItem) {
      onInvestigateCase('case', currentItem.id);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              GOOD MORNING
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              FinanceFlow AI Daily Briefing
            </h3>
          </div>
        </div>
      </div>

      {!isReviewMode ? (
        <>
          {/* Attention Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px'
          }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '0.72rem', fontWeight: '700' }}>
                <AlertCircle size={14} />
                <span>Critical</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#991b1b', marginTop: '4px' }}>
                {kpis.critical_cases || 2} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>cases</span>
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', fontSize: '0.72rem', fontWeight: '700' }}>
                <Clock size={14} />
                <span>High Priority</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#92400e', marginTop: '4px' }}>
                {kpis.high_priority_borrowers || 3} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>borrowers</span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.72rem', fontWeight: '700' }}>
                <CheckCircle2 size={14} />
                <span>Ready for Approval</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                {kpis.ready_reconciliations || 4} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>items</span>
              </div>
            </div>

            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontSize: '0.72rem', fontWeight: '700' }}>
                <DollarSign size={14} />
                <span>Total Overdue</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#3730a3', marginTop: '4px' }}>
                ₹9.34L
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsReviewMode(true);
            }}
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: '700'
            }}
          >
            <span>Start Priority Review</span>
            <ArrowRight size={16} />
          </button>
        </>
      ) : (
        /* Sequential Priority Item Review Mode */
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              background: currentItem.severity === 'Critical' ? '#fee2e2' : '#fef3c7',
              color: currentItem.severity === 'Critical' ? '#991b1b' : '#92400e',
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase'
            }}>
              {currentItem.severity} • Item {reviewIndex + 1} of {priorityItems.length}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
              {currentItem.amount}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
              {currentItem.caseNumber} — {currentItem.company}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
              {currentItem.issue}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '0.78rem',
            color: '#334155'
          }}>
            <div style={{ fontWeight: '700', color: '#6366f1', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bot size={13} />
              <span>AI Recommendation</span>
            </div>
            {currentItem.recommendation}
          </div>

          {/* Workflow Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={handleInvestigate}
              style={{
                flex: 1,
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Bot size={14} />
              <span>Investigate</span>
            </button>

            <button
              onClick={handleNext}
              style={{
                flex: 1,
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>{reviewIndex === priorityItems.length - 1 ? 'Finish Review' : 'Next Item'}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDailyBriefing;
