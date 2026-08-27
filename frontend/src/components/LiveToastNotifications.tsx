import { useState, useEffect } from 'react';
import { connectSocket } from '../services/socketService';
import { CreditCard, Zap, CheckCircle2, Shield, Mail, X, Activity } from 'lucide-react';

export interface ToastItem {
  id: number;
  type: 'payment' | 'started' | 'completed' | 'risk' | 'collection' | string;
  title: string;
  message: string;
  details?: unknown;
  time: string;
}

interface LiveToastNotificationsProps {
  onRealtimeUpdate?: (type?: string, details?: unknown) => void;
}

/**
 * Live Real-Time WebSocket Toast Notification Manager
 * Listens for instant server push events and renders floating enterprise toast notifications.
 */
export const LiveToastNotifications = ({ onRealtimeUpdate }: LiveToastNotificationsProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const socket = connectSocket();

    const addToast = (type: string, title: string, message: string, details: unknown = null) => {
      const id = Date.now() + Math.random();
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        details,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setToasts(prev => [newToast, ...prev].slice(0, 5)); // Keep max 5 recent toasts

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        removeToast(id);
      }, 6000);

      // Trigger callback for real-time dashboard data refresh
      if (onRealtimeUpdate) {
        onRealtimeUpdate(type, details);
      }
    };

    // 1. Payment Ingested Event
    const handlePaymentIngested = (data: { payment?: { amount?: number | string; sender_name?: string }; case?: { id?: number } }) => {
      const p = data.payment || {};
      addToast(
        'payment',
        '💳 New Bank Deposit Ingested',
        `Received ₹${parseFloat(String(p.amount || 0)).toLocaleString('en-IN')} from ${p.sender_name || 'Sender'}. Case #${data.case?.id} opened in state NEW.`,
        data
      );
    };

    // 2. Reconciliation Started Event
    const handleReconcileStarted = (data: { case_id?: number }) => {
      addToast(
        'started',
        '⚡ Agent 1 Execution Started',
        `Reconciliation pre-check and AI investigation initiated for Case #${data.case_id}.`,
        data
      );
    };

    // 3. Reconciliation Completed Event
    const handleReconcileCompleted = (data: { recommendation?: { confidence_score?: number | string }; case_id?: number }) => {
      const score = data.recommendation ? parseFloat(String(data.recommendation.confidence_score)).toFixed(0) : '90';
      addToast(
        'completed',
        '✅ Agent 1 Analysis Completed',
        `Case #${data.case_id} analyzed with ${score}% confidence! Candidate match generated.`,
        data
      );
    };

    // 4. Risk Assessment Completed Event
    const handleRiskCompleted = (data: { company_name?: string; risk_level?: string; risk_score?: number }) => {
      addToast(
        'risk',
        '🛡️ Agent 2 Risk Assessment',
        `Calculated risk profile for ${data.company_name}: Risk Level ${data.risk_level} (${data.risk_score}/100).`,
        data
      );
    };

    // 5. Collection Drafted Event
    const handleCollectionDrafted = (data: { urgency?: string; company_name?: string }) => {
      addToast(
        'collection',
        '✉️ Agent 3 Collection Notice',
        `Generated ${data.urgency || 'POLITE_REMINDER'} collection draft for ${data.company_name}.`,
        data
      );
    };

    socket.on('PAYMENT_INGESTED', handlePaymentIngested);
    socket.on('RECONCILIATION_STARTED', handleReconcileStarted);
    socket.on('RECONCILIATION_COMPLETED', handleReconcileCompleted);
    socket.on('RISK_ASSESSMENT_COMPLETED', handleRiskCompleted);
    socket.on('COLLECTION_DRAFTED', handleCollectionDrafted);

    return () => {
      socket.off('PAYMENT_INGESTED', handlePaymentIngested);
      socket.off('RECONCILIATION_STARTED', handleReconcileStarted);
      socket.off('RECONCILIATION_COMPLETED', handleReconcileCompleted);
      socket.off('RISK_ASSESSMENT_COMPLETED', handleRiskCompleted);
      socket.off('COLLECTION_DRAFTED', handleCollectionDrafted);
    };
  }, [onRealtimeUpdate]);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'payment': return <CreditCard size={18} color="#2563eb" />;
      case 'started': return <Zap size={18} color="#6366f1" className="animate-spin" />;
      case 'completed': return <CheckCircle2 size={18} color="#059669" />;
      case 'risk': return <Shield size={18} color="#d97706" />;
      case 'collection': return <Mail size={18} color="#7c3aed" />;
      default: return <Activity size={18} color="#4f46e5" />;
    }
  };

  const getToastBorder = (type: string) => {
    switch (type) {
      case 'payment': return '1px solid #bfdbfe';
      case 'started': return '1px solid #c7d2fe';
      case 'completed': return '1px solid #a7f3d0';
      case 'risk': return '1px solid #fde68a';
      case 'collection': return '1px solid #e9d5ff';
      default: return '1px solid #cbd5e1';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: '#ffffff',
            border: getToastBorder(toast.type),
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {getToastIcon(toast.type)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <h4 style={{ fontSize: '0.825rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {toast.title}
              </h4>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{toast.time}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0, lineHeight: 1.35 }}>
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
