import { AlertOctagon, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import type { ReconciliationCase } from '../../types/reconciliation';

interface CaseSelectPayload {
  id: number;
  payment_id?: number;
  amount?: number;
  sender_name?: string;
  transaction_id?: string;
  status?: string;
}

interface AttentionRequiredSectionProps {
  cases?: ReconciliationCase[];
  onSelectCase?: (payload: CaseSelectPayload) => void;
  onViewAll?: () => void;
}

/**
 * Attention Required Operational Triage Component
 * Displays high-priority cases and Agent 7 anomaly detections requiring immediate human review.
 */
export const AttentionRequiredSection = ({ cases = [], onSelectCase, onViewAll }: AttentionRequiredSectionProps) => {
  if (!cases || cases.length === 0) {
    return (
      <div style={{
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
        padding: '20px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#ecfdf5', color: '#059669', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>All Operational Queues Clear</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>No high-severity payment anomalies or SLA escalation breaches pending.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
      padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff',
            width: '28px', height: '28px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(220,38,38,0.25)',
          }}>
            <AlertOctagon size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>⚠️ Attention Required</h3>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>High-severity anomaly investigations and urgent SLA cases</span>
          </div>
        </div>
        <button onClick={onViewAll} style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>View All Cases</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Case Cards 2x2 Grid (4 cards total) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
        {cases.slice(0, 4).map((item, idx) => {
          const isHigh = item.severity === 'HIGH' || item.severity === 'CRITICAL';
          const caseNum = item.id ?? (item as unknown as { case_id?: number }).case_id ?? item.payment_id ?? (idx + 1);
          const paymentNum = item.payment_id ?? caseNum;
          const rawTags = item.anomaly_types ?? (item as unknown as { anomaly_type?: string }).anomaly_type ?? [];
          const tags: string[] = Array.isArray(rawTags)
            ? rawTags
            : [String(rawTags) || 'ANOMALY'];
          const primaryAnomaly = tags.length > 0 ? tags[0] : 'PAYMENT ANOMALY';

          const playbookTitle = (item.playbook as { title?: string; estimatedDuration?: string } | undefined)?.title;
          const playbookDuration = (item.playbook as { title?: string; estimatedDuration?: string } | undefined)?.estimatedDuration;

          return (
            <div key={item.id || idx} style={{
              background: '#fafbfc',
              border: `1.5px solid ${isHigh ? '#fecaca' : '#fed7aa'}`,
              borderRadius: '12px', padding: '14px 16px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px',
              transition: 'all 0.15s ease',
            }}>
              {/* Top Row: Severity + Case ID + Amount */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      background: isHigh ? '#fee2e2' : '#ffedd5',
                      color: isHigh ? '#991b1b' : '#9a3412',
                      fontSize: '0.65rem', fontWeight: '900', padding: '2px 6px',
                      borderRadius: '4px', textTransform: 'uppercase',
                    }}>
                      {item.severity ?? item.priority ?? 'HIGH'}
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Case #{caseNum}</strong>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Payment #{paymentNum}</span>
                    <span>•</span>
                    <code style={{
                      color: '#4338ca', background: '#e0e7ff', padding: '1px 5px',
                      borderRadius: '3px', maxWidth: '140px', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block',
                    }}>
                      {item.transaction_id || `TXN-${paymentNum}`}
                    </code>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>
                    ₹{Number(item.amount ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>{item.sender_name || 'Counterparty'}</div>
                </div>
              </div>

              {/* Middle Row: Single Primary Agent 7 Anomaly Result */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748b', fontWeight: '700' }}>Agent 7 Anomaly:</span>
                  <span style={{
                    background: '#fee2e2', color: '#991b1b', fontSize: '0.68rem',
                    fontWeight: '800', padding: '2px 8px', borderRadius: '4px',
                    whiteSpace: 'nowrap', textTransform: 'uppercase',
                  }}>
                    {String(primaryAnomaly).replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Compact Playbook Indicator */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f5f3ff', border: '1px solid #ddd6fe',
                  borderRadius: '6px', padding: '4px 8px', fontSize: '0.68rem', marginTop: '2px',
                }}>
                  <span style={{ color: '#6d28d9', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📖</span>
                    <span>{playbookTitle ?? 'Duplicate Payment Verification & Hold'}</span>
                  </span>
                  <span style={{ color: '#7c3aed', fontWeight: '700', fontSize: '0.65rem' }}>
                    {playbookDuration ?? '3-5 min'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectCase?.({
                  id: caseNum,
                  payment_id: paymentNum,
                  amount: item.amount,
                  sender_name: item.sender_name,
                  transaction_id: item.transaction_id,
                  status: item.status,
                })}
                style={{
                  background: isHigh ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#ffffff', border: 'none', borderRadius: '8px',
                  padding: '8px 14px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)', transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <span>Review Case #{caseNum}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
