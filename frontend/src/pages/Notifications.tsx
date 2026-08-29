import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle,
  RefreshCw, Clock, Send, Filter, Zap,
  Check, X, ChevronDown, ChevronUp, AlertCircle, Bot,
  Mail, Copy, CheckSquare, Square, SendHorizontal,
  AlertOctagon,
} from 'lucide-react';
import {
  getAlerts,
  triggerEscalationScan,
  approveAlert,
  dismissAlert,
  batchApproveAlerts,
  batchDismissAlerts,
} from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import type { NotificationAlert } from '../types/notification';

export interface EnrichedAlert extends NotificationAlert {
  notification_status?: string;
  escalation_level?: string;
  recommended_recipient?: string;
  contact_name?: string;
  contact_email?: string;
  company_name?: string;
  outstanding_amount?: number | string;
  overdue_days?: number;
  ai_reasoning?: string;
  message_draft?: string;
  recommended_action?: string;
  subject?: string;
}

interface NotificationsProps {
  onAskAI?: (recordType: string, recordId: string | number, extra?: Record<string, unknown>) => void;
  onSelectCase?: (item: unknown) => void;
}

const formatAuditTimestamp = (dateStr?: string) => {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
};

const buildFormalNoticeDraft = (alert: EnrichedAlert) => {
  if (alert.message && alert.message.includes('Dear ')) {
    return alert.message;
  }
  if (alert.ai_reasoning && alert.ai_reasoning.includes('Dear ')) {
    return alert.ai_reasoning;
  }
  if (alert.message_draft && alert.message_draft.length > 60) {
    return alert.message_draft;
  }
  const recipient = alert.contact_name || 'Finance Representative';
  const company = alert.company_name || 'Borrower Account';
  const amount = Number(alert.outstanding_amount || 0).toLocaleString('en-IN');
  const days = alert.overdue_days || 0;
  const reason = alert.ai_reasoning || alert.message || 'Overdue loan balance has exceeded regulatory credit terms.';
  const protocol = alert.recommended_action || 'Remit overdue balance immediately to prevent credit restriction.';

  return `Dear ${recipient},\n\n` +
    `RE: IMMEDIATE FINANCIAL SETTLEMENT NOTICE — ${company.toUpperCase()}\n\n` +
    `Our records indicate an outstanding delinquent balance of ₹${amount} which is currently ${days} days past due.\n\n` +
    `Credit Assessment Summary:\n` +
    `• Audit Finding: ${reason}\n` +
    `• Recommended Protocol: ${protocol}\n\n` +
    `In accordance with loan facility governance, please arrange for immediate remittance or submit settlement confirmation to prevent legal escalation.\n\n` +
    `Sincerely,\n` +
    `FinanceFlow Credit Control & Operations Desk`;
};

/**
 * Page: Real-Time Notification & Escalation Center
 */
export const Notifications = ({ onAskAI }: NotificationsProps) => {
  const { user } = useAuth();

  const userRole = ((user as unknown as Record<string, string>)?.role_name || user?.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  const isViewer = userRole === 'viewer';
  const isAuthorized = ['owner', 'super_admin', 'admin', 'manager', 'senior_accountant'].includes(userRole);

  const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [categoryTab, setCategoryTab] = useState<'all' | 'escalation' | 'collection'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<Record<number, string | null>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<number>>(new Set());
  const [expandedAlertId, setExpandedAlertId] = useState<number | null>(null);
  const [copiedAlertId, setCopiedAlertId] = useState<number | null>(null);
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);
  const [dispatchErrorToast, setDispatchErrorToast] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      params.limit = 100;

      const res = await getAlerts(params);
      setAlerts((res.data?.data || []) as EnrichedAlert[]);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const isInternalEscalation = (alert: EnrichedAlert) => {
    if (alert.escalation_level === 'Borrower Contact' || alert.escalation_level === 'BORROWER_CONTACT') {
      return false;
    }
    const route = (alert.escalation_level || alert.recommended_recipient || '').toLowerCase();
    return route.includes('director') || route.includes('manager') || route.includes('officer') || route.includes('admin') || !alert.contact_email;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (categoryTab === 'escalation') return isInternalEscalation(alert);
    if (categoryTab === 'collection') return !isInternalEscalation(alert);
    return true;
  });

  const handleRunScan = async () => {
    if (isViewer || !isAuthorized) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role does not have permission to trigger escalation scans.' },
      }));
      return;
    }
    try {
      setScanning(true);
      setScanResult(null);
      const res = await triggerEscalationScan();
      const count = res.data?.data?.alerts_created || 0;
      setScanResult({
        success: true,
        message: `Agent 6 scan complete: ${count} new escalation alert${count === 1 ? '' : 's'} identified.`,
      });
      await fetchAlerts();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: message || 'Access denied for escalation scan.' },
        }));
      } else {
        setScanResult({
          success: false,
          message: `Escalation scan failed: ${message}`,
        });
      }
    } finally {
      setScanning(false);
    }
  };

  const handleApprove = async (alertOrId: EnrichedAlert | number) => {
    if (isViewer || !isAuthorized) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role is restricted and cannot approve escalation notices.' },
      }));
      return;
    }
    const alertId = typeof alertOrId === 'object' ? alertOrId.id : alertOrId;
    if (actionLoading[alertId] === 'approving') return;
    const alertObj = typeof alertOrId === 'object' ? alertOrId : alerts.find(a => a.id === alertId);

    try {
      setActionLoading(prev => ({ ...prev, [alertId]: 'approving' }));
      const response = await approveAlert(alertId);
      const resData = response.data as unknown as { success?: boolean; message?: string; data?: { email_delivery?: { success?: boolean; error?: string } } };

      if (resData.success === false || resData.data?.email_delivery?.success === false) {
        const errorText = resData.message || resData.data?.email_delivery?.error || 'Email dispatch failed. Notice remains pending.';
        setDispatchErrorToast(`❌ ${errorText}`);
        setTimeout(() => setDispatchErrorToast(null), 9000);
        return;
      }

      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, notification_status: 'approved' } : a));
      setSelectedAlertIds(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });

      const recipientText = alertObj?.contact_name || alertObj?.recommended_recipient || 'Recipient';
      const emailText = alertObj?.contact_email || 'finance@company.com';
      setDispatchToast(`⚡ Notice email approved & dispatched successfully to ${recipientText} (${emailText})!`);
      setTimeout(() => setDispatchToast(null), 7000);
    } catch (err: unknown) {
      console.error('Failed to approve alert:', err);
      const status = (err as { response?: { status?: number; data?: { message?: string; data?: { email_delivery?: { error?: string } } } } })?.response?.status;
      const errData = (err as { response?: { data?: { message?: string; data?: { email_delivery?: { error?: string } } } } })?.response?.data;

      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: errData?.message || 'Access denied: You do not have permission to approve escalation notices.' },
        }));
      } else {
        const errMsg = errData?.message || errData?.data?.email_delivery?.error || 'Email delivery failed. Notice remains pending.';
        setDispatchErrorToast(`❌ ${errMsg}`);
        setTimeout(() => setDispatchErrorToast(null), 9000);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [alertId]: null }));
    }
  };

  const handleDismiss = async (alertId: number) => {
    if (isViewer || !isAuthorized) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role is restricted and cannot dismiss escalation alerts.' },
      }));
      return;
    }
    try {
      setActionLoading(prev => ({ ...prev, [alertId]: 'dismissing' }));
      await dismissAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, notification_status: 'dismissed' } : a));
      setSelectedAlertIds(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
      if (expandedAlertId === alertId) setExpandedAlertId(null);
    } catch (err: unknown) {
      console.error('Failed to dismiss alert:', err);
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Access denied: You do not have permission to dismiss alerts.' },
        }));
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [alertId]: null }));
    }
  };

  const handleBatchApprove = async (targetAlertIds: number[] | null = null) => {
    if (isViewer || !isAuthorized) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role is restricted and cannot dispatch batch notices.' },
      }));
      return;
    }

    const idsToApprove = targetAlertIds || Array.from(selectedAlertIds);
    if (idsToApprove.length === 0) return;

    try {
      setBatchLoading(true);
      const res = await batchApproveAlerts(idsToApprove);
      const rawData = res.data as unknown as { success?: boolean; message?: string; data?: { count?: number; dispatched?: Array<{ alertId: number }>; failed?: Array<{ alertId: number; error: string }> } };
      const dispatchedList = rawData?.data?.dispatched || [];
      const dispatchedIds = dispatchedList.map(d => d.alertId);

      if (dispatchedIds.length > 0) {
        setAlerts(prev => prev.map(a => dispatchedIds.includes(a.id) ? { ...a, notification_status: 'approved' } : a));
      }
      setSelectedAlertIds(new Set());

      if (rawData.success !== false) {
        setDispatchToast(`🚀 Successfully approved & dispatched ${dispatchedIds.length} notices in batch!`);
        setTimeout(() => setDispatchToast(null), 8000);
      } else {
        const failCount = rawData?.data?.failed?.length || 0;
        setDispatchErrorToast(`⚠️ Dispatched ${dispatchedIds.length} notices, but ${failCount} failed due to email delivery errors.`);
        setTimeout(() => setDispatchErrorToast(null), 9000);
      }
    } catch (err: unknown) {
      console.error('Failed to batch approve alerts:', err);
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setDispatchErrorToast(`❌ Batch approve failed: ${errData?.message || 'Email delivery failure.'}`);
      setTimeout(() => setDispatchErrorToast(null), 9000);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDismiss = async () => {
    if (isViewer || !isAuthorized) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role is restricted and cannot dismiss batch alerts.' },
      }));
      return;
    }

    const idsToDismiss = Array.from(selectedAlertIds);
    if (idsToDismiss.length === 0) return;

    try {
      setBatchLoading(true);
      await batchDismissAlerts(idsToDismiss);
      setAlerts(prev => prev.map(a => idsToDismiss.includes(a.id) ? { ...a, notification_status: 'dismissed' } : a));
      setSelectedAlertIds(new Set());
    } catch (err) {
      console.error('Failed to batch dismiss alerts:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleSelectAlert = (alertId: number) => {
    setSelectedAlertIds(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
  };

  const pendingAlertList = filteredAlerts.filter(a => a.notification_status === 'pending');
  const allPendingSelected = pendingAlertList.length > 0 && pendingAlertList.every(a => selectedAlertIds.has(a.id));

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedAlertIds(new Set());
    } else {
      setSelectedAlertIds(new Set(pendingAlertList.map(a => a.id)));
    }
  };

  const handleCopyDraft = (text: string, alertId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedAlertId(alertId);
    setTimeout(() => setCopiedAlertId(null), 2500);
  };

  const totalAlerts = alerts.length;
  const pendingAlerts = alerts.filter(a => a.notification_status === 'pending').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
  const approvedAlerts = alerts.filter(a => a.notification_status === 'approved').length;

  const getSeverityBadge = (sev?: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'CRITICAL 🚨' };
      case 'HIGH':
        return { bg: '#ffedd5', color: '#9a3412', border: '#fdba74', label: 'HIGH ⚠️' };
      case 'MEDIUM':
        return { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'MEDIUM ⚡' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'LOW ℹ️' };
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#dcfce7', color: '#15803d', border: '#86efac', label: 'Approved & Dispatched' };
      case 'dismissed':
        return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: 'Dismissed' };
      default:
        return { bg: '#fef9c3', color: '#854d0e', border: '#fde047', label: 'Pending Review' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Category Tabs & Action Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ffffff',
          padding: '5px 8px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setCategoryTab('all')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              fontSize: '0.825rem', fontWeight: '700', cursor: 'pointer',
              background: categoryTab === 'all' ? '#0f172a' : 'transparent',
              color: categoryTab === 'all' ? '#ffffff' : '#64748b',
            }}
          >
            <span>All Dispatches</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({alerts.length})</span>
          </button>

          <button
            onClick={() => setCategoryTab('escalation')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              fontSize: '0.825rem', fontWeight: '700', cursor: 'pointer',
              background: categoryTab === 'escalation' ? '#4f46e5' : 'transparent',
              color: categoryTab === 'escalation' ? '#ffffff' : '#64748b',
            }}
          >
            <AlertOctagon size={15} />
            <span>Executive Escalations</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({alerts.filter(isInternalEscalation).length})</span>
          </button>

          <button
            onClick={() => setCategoryTab('collection')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              fontSize: '0.825rem', fontWeight: '700', cursor: 'pointer',
              background: categoryTab === 'collection' ? '#059669' : 'transparent',
              color: categoryTab === 'collection' ? '#ffffff' : '#64748b',
            }}
          >
            <Mail size={15} />
            <span>Borrower Follow-Up Notices</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({alerts.filter(a => !isInternalEscalation(a)).length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => void fetchAlerts()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => void handleRunScan()}
            disabled={scanning || isViewer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              background: isViewer ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: isViewer ? '#94a3b8' : '#ffffff',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: (scanning || isViewer) ? 'not-allowed' : 'pointer',
              boxShadow: isViewer ? 'none' : '0 2px 8px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Zap size={15} />
            {scanning ? 'Scanning SLAs...' : 'Run Escalation Scan'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {dispatchToast && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '12px',
          padding: '14px 20px',
          color: '#14532d',
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>{dispatchToast}</span>
          </div>
          <button onClick={() => setDispatchToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#14532d' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Toast */}
      {dispatchErrorToast && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%)',
          border: '1.5px solid #fca5a5',
          borderRadius: '12px',
          padding: '14px 20px',
          color: '#991b1b',
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>{dispatchErrorToast}</span>
          </div>
          <button onClick={() => setDispatchErrorToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Scan Result */}
      {scanResult && (
        <div style={{
          background: scanResult.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${scanResult.success ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '12px',
          padding: '12px 18px',
          color: scanResult.success ? '#166534' : '#991b1b',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {scanResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{scanResult.message}</span>
          </div>
          <button onClick={() => setScanResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Alerts Tracked
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {totalAlerts}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fef08a', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ca8a04', marginTop: '6px' }}>
            {pendingAlerts}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>
            Critical &amp; High Risk
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#dc2626', marginTop: '6px' }}>
            {criticalAlerts}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
            Escalations Dispatched
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
            {approvedAlerts}
          </div>
        </div>
      </div>

      {/* Filter & Batch Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        background: '#ffffff',
        padding: '14px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="#64748b" />
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Status:</span>
            {['all', 'pending', 'approved', 'dismissed'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  background: statusFilter === st ? '#4f46e5' : '#f8fafc',
                  color: statusFilter === st ? '#ffffff' : '#64748b',
                  border: `1px solid ${statusFilter === st ? '#4338ca' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Severity:</span>
            {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  background: severityFilter === sev ? '#0f172a' : '#f8fafc',
                  color: severityFilter === sev ? '#ffffff' : '#64748b',
                  border: `1px solid ${severityFilter === sev ? '#0f172a' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {sev === 'all' ? 'All Severities' : sev}
              </button>
            ))}
          </div>
        </div>

        {pendingAlertList.length > 0 && isAuthorized && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={toggleSelectAllPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#f8fafc', border: '1px solid #cbd5e1',
                borderRadius: '8px', padding: '6px 12px',
                fontSize: '0.75rem', fontWeight: '700', color: '#334155', cursor: 'pointer',
              }}
            >
              {allPendingSelected ? <CheckSquare size={14} color="#4f46e5" /> : <Square size={14} color="#94a3b8" />}
              <span>{allPendingSelected ? 'Deselect All' : `Select All (${pendingAlertList.length})`}</span>
            </button>

            {selectedAlertIds.size > 0 && (
              <>
                <button
                  onClick={() => void handleBatchApprove()}
                  disabled={batchLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff', border: 'none',
                    borderRadius: '8px', padding: '6px 14px',
                    fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  <Send size={13} />
                  <span>{batchLoading ? 'Dispatching...' : `Dispatch Selected (${selectedAlertIds.size})`}</span>
                </button>

                <button
                  onClick={() => void handleBatchDismiss()}
                  disabled={batchLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: '#ffffff', border: '1px solid #cbd5e1',
                    borderRadius: '8px', padding: '6px 10px',
                    fontSize: '0.75rem', fontWeight: '700', color: '#64748b', cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                  <span>Dismiss Selected</span>
                </button>
              </>
            )}

            <button
              onClick={() => void handleBatchApprove(pendingAlertList.map(a => a.id))}
              disabled={batchLoading}
              title="One-click dispatch for all pending notices"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#ffffff', border: 'none',
                borderRadius: '8px', padding: '6px 14px',
                fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
              }}
            >
              <SendHorizontal size={14} />
              <span>{batchLoading ? 'Sending Batch...' : `Batch Dispatch All (${pendingAlertList.length})`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Alert Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '40px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.85rem',
          }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#4f46e5' }} />
            Loading real-time communications ledger...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '40px',
            textAlign: 'center',
            color: '#64748b',
          }}>
            <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No Communications Found</div>
            <div style={{ fontSize: '0.8rem' }}>No records found under the selected category or filter.</div>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const sevBadge = getSeverityBadge(alert.severity);
            const stBadge = getStatusBadge(alert.notification_status);
            const isPending = alert.notification_status === 'pending';
            const isExpanded = expandedAlertId === alert.id;
            const isCopied = copiedAlertId === alert.id;
            const isSelected = selectedAlertIds.has(alert.id);
            const isInternal = isInternalEscalation(alert);

            const draftSubject = alert.subject || `[${alert.severity || 'URGENT'}] Official Repayment Settlement Notice — ${alert.company_name || 'Delinquent Facility'}`;
            const draftBody = buildFormalNoticeDraft(alert);

            return (
              <div
                key={alert.id}
                style={{
                  background: isSelected ? '#f0fdf4' : '#ffffff',
                  border: `1.5px solid ${isSelected ? '#86efac' : isExpanded ? '#6366f1' : alert.severity === 'CRITICAL' ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  padding: '18px 22px',
                  boxShadow: isExpanded ? '0 8px 24px rgba(99, 102, 241, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Top Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {isPending && isAuthorized && (
                      <div
                        onClick={() => toggleSelectAlert(alert.id)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '4px' }}
                        title="Select for batch dispatch"
                      >
                        {isSelected ? <CheckSquare size={18} color="#16a34a" /> : <Square size={18} color="#94a3b8" />}
                      </div>
                    )}

                    <span style={{
                      background: isInternal ? '#f5f3ff' : '#ecfdf5',
                      color: isInternal ? '#6366f1' : '#059669',
                      border: `1px solid ${isInternal ? '#c7d2fe' : '#a7f3d0'}`,
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {isInternal ? <AlertOctagon size={11} /> : <Mail size={11} />}
                      {isInternal ? 'EXECUTIVE ESCALATION' : 'BORROWER NOTICE'}
                    </span>

                    <span style={{
                      background: sevBadge.bg,
                      color: sevBadge.color,
                      border: `1px solid ${sevBadge.border}`,
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}>
                      {sevBadge.label}
                    </span>

                    <span style={{
                      background: stBadge.bg,
                      color: stBadge.color,
                      border: `1px solid ${stBadge.border}`,
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}>
                      {stBadge.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b' }}>
                    <Clock size={12} />
                    <span style={{ fontWeight: '600' }}>{formatAuditTimestamp(alert.created_at)}</span>
                  </div>
                </div>

                {/* Main Header & AI Reasoning */}
                <div
                  onClick={() => setExpandedAlertId(prev => prev === alert.id ? null : alert.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                      {alert.title || `SLA Breach: ${alert.company_name || 'Borrower'} — Alert #${alert.id}`}
                    </h4>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5',
                      background: '#f5f3ff', padding: '4px 10px', borderRadius: '8px',
                    }}>
                      <Mail size={13} />
                      <span>{isExpanded ? 'Hide Notice Draft' : 'View Notice Draft'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                    {alert.ai_reasoning || alert.message || `${alert.company_name || 'The borrower'} has exceeded SLA repayment terms by ${alert.overdue_days || 0} days with ₹${Number(alert.outstanding_amount || 0).toLocaleString('en-IN')} outstanding.`}
                  </p>
                </div>

                {/* Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Outstanding Exposure</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#b91c1c', marginTop: '2px' }}>
                      ₹{Number(alert.outstanding_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Delinquency Period</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '900', color: (alert.overdue_days ?? 0) > 60 ? '#b91c1c' : (alert.overdue_days ?? 0) > 30 ? '#d97706' : '#475569', marginTop: '2px' }}>
                      {alert.overdue_days || 0} Days Past Due
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                      {isInternal ? 'Escalation Target' : 'Borrower Contact'}
                    </div>
                    <div style={{ fontSize: '0.825rem', fontWeight: '800', color: isInternal ? '#4338ca' : '#0f172a', marginTop: '2px' }}>
                      👤 {alert.recommended_recipient || alert.contact_name || 'Finance Representative'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Dispatch Target Email</div>
                    <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>
                      {alert.contact_email || `${(alert.company_name || 'finance').toLowerCase().replace(/\s+/g, '')}@borrower.com`}
                    </div>
                  </div>
                </div>

                {/* Draft Preview */}
                {isExpanded && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} color="#4f46e5" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a' }}>
                          Drafted Notice Preview (Ready for Dispatch)
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyDraft(draftBody, alert.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: isCopied ? '#ecfdf5' : '#ffffff',
                          border: `1px solid ${isCopied ? '#a7f3d0' : '#cbd5e1'}`,
                          color: isCopied ? '#059669' : '#0f172a',
                          padding: '4px 12px', borderRadius: '6px',
                          fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                        }}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Draft'}</span>
                      </button>
                    </div>

                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      color: '#0f172a',
                    }}>
                      <div>
                        <strong style={{ color: '#475569' }}>To:</strong>{' '}
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>
                          {alert.contact_name || 'Borrower Representative'} &lt;{alert.contact_email || 'finance@company.com'}&gt;
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: '#475569' }}>Subject:</strong>{' '}
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>{draftSubject}</span>
                      </div>
                    </div>

                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '16px',
                      fontSize: '0.825rem',
                      lineHeight: '1.7',
                      color: '#0f172a',
                      fontWeight: '500',
                      whiteSpace: 'pre-line',
                    }}>
                      {draftBody}
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => onAskAI?.('notification_alert', alert.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <Bot size={13} />
                    Investigate with Copilot
                  </button>

                  {isPending && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => void handleDismiss(alert.id)}
                        disabled={Boolean(actionLoading[alert.id]) || !isAuthorized}
                        style={{
                          background: !isAuthorized ? '#f1f5f9' : '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: !isAuthorized ? '#cbd5e1' : '#64748b',
                          cursor: (actionLoading[alert.id] || !isAuthorized) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <X size={13} />
                        Dismiss
                      </button>

                      <button
                        onClick={() => void handleApprove(alert)}
                        disabled={Boolean(actionLoading[alert.id]) || !isAuthorized}
                        style={{
                          background: !isAuthorized ? '#e2e8f0' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: !isAuthorized ? '#94a3b8' : '#ffffff',
                          cursor: (actionLoading[alert.id] || !isAuthorized) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: !isAuthorized ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.25)',
                        }}
                      >
                        <Send size={13} />
                        {actionLoading[alert.id] === 'approving' ? 'Dispatching...' : (!isAuthorized ? 'Approve & Dispatch (Locked)' : 'Approve & Dispatch Email')}
                      </button>
                    </div>
                  )}

                  {!isPending && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700', color: alert.notification_status === 'approved' ? '#16a34a' : '#64748b' }}>
                      {alert.notification_status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span>{alert.notification_status === 'approved' ? 'Notice Dispatched' : 'Alert Dismissed'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
