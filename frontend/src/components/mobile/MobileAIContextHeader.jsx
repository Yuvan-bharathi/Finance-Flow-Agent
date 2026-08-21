import React from 'react';
import { Bot, Search, AlertTriangle, RefreshCw, FileText, Building2, CreditCard, Shield } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: MobileAIContextHeader
 * 
 * Purpose:
 *   Entity context header with One-Tap AI Action Shortcuts.
 *   Dispatches pre-configured prompts directly into the AI Copilot.
 */
export const MobileAIContextHeader = ({
  entityType = 'case', // 'case' | 'company' | 'loan' | 'payment'
  entityId = null,
  entityTitle = '',
  onTriggerPrompt
}) => {
  const handleShortcut = (promptText) => {
    triggerHaptic('light');
    if (onTriggerPrompt) {
      onTriggerPrompt(promptText);
    }
  };

  const getEntityIcon = () => {
    switch (entityType) {
      case 'company': return Building2;
      case 'payment': return CreditCard;
      case 'loan': return FileText;
      default: return Shield;
    }
  };

  const Icon = getEntityIcon();

  const getShortcuts = () => {
    switch (entityType) {
      case 'company':
        return [
          { label: 'Risk Analysis', prompt: `Analyze the repayment risk profile for ${entityTitle || 'this company'}.` },
          { label: 'Overdue Analysis', prompt: `What is the current overdue status and outstanding exposure for ${entityTitle || 'this company'}?` },
          { label: 'Repayment History', prompt: `Summarize the recent repayment history and payment consistency for ${entityTitle || 'this company'}.` },
          { label: 'Ask AI', prompt: `Provide a full operational summary for ${entityTitle || 'this company'}.` }
        ];
      case 'loan':
        return [
          { label: 'Payment Status', prompt: `Check the latest payment status for loan ${entityId || ''}.` },
          { label: 'Overdue Breakdown', prompt: `Provide overdue installment breakdown for loan ${entityId || ''}.` },
          { label: 'Schedule Details', prompt: `Show repayment schedule and upcoming milestones for loan ${entityId || ''}.` },
          { label: 'Ask AI', prompt: `Analyze health and risk for loan ${entityId || ''}.` }
        ];
      case 'payment':
        return [
          { label: 'Explain Match', prompt: `Explain the AI match confidence factors for payment ${entityId || ''}.` },
          { label: 'Investigate', prompt: `Investigate payment ${entityId || ''} against invoices and company ledger.` },
          { label: 'Overpayment Check', prompt: `Verify if payment ${entityId || ''} represents an overpayment or duplicate.` },
          { label: 'Ask AI', prompt: `Summarize findings for payment ${entityId || ''}.` }
        ];
      default:
        return [
          { label: 'Explain', prompt: `Explain the reconciliation mismatch for Case #${entityId || ''}.` },
          { label: 'Investigate', prompt: `Investigate all evidence, invoices, and bank statements for Case #${entityId || ''}.` },
          { label: 'Re-analyze', prompt: `Re-evaluate reconciliation confidence for Case #${entityId || ''}.` },
          { label: 'Escalate', prompt: `Assess whether Case #${entityId || ''} requires immediate management escalation.` }
        ];
    }
  };

  const shortcuts = getShortcuts();

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Context Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: '#e0e7ff',
          color: '#4338ca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' }}>
            Active Entity Context
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
            {entityTitle || `${entityType.toUpperCase()} #${entityId || 'Active'}`}
          </div>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {shortcuts.map((sc, i) => (
          <button
            key={i}
            onClick={() => handleShortcut(sc.prompt)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <Bot size={11} color="#6366f1" />
            <span>{sc.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileAIContextHeader;
