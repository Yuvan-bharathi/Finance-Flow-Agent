import React, { useState, useEffect, useCallback } from 'react';
import {
  BellRing, AlertTriangle, ShieldAlert, CheckCircle2, XCircle,
  RefreshCw, Clock, Send, Eye, Filter, ArrowUpRight, Zap,
  Check, X, ChevronRight, AlertCircle, Bot
} from 'lucide-react';
import {
  getAlerts,
  triggerEscalationScan,
  approveAlert,
  dismissAlert
} from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

/**
 * Page: Real-Time Notification & Escalation Center (Agent 6)
 *
 * Provides a command center for monitoring SLA breaches, critical unreconciled
 * cases, delinquent borrower escalation notices, and human-in-the-loop sign-offs.
 */
export const Notifications = ({ onAskAI, onSelectCase }) => {
  const { user } = useAuth();
  const isViewer = (user?.role_name || user?.role || '').toLowerCase() === 'viewer';

  const [alerts, setAlerts]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [scanning, setScanning]         = useState(false);
  const [scanResult, setScanResult]     = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | dismissed
  const [severityFilter, setSeverityFilter] = useState('all'); // all | CRITICAL | HIGH | MEDIUM | LOW
  const [actionLoading, setActionLoading]   = useState({}); // { [alertId]: 'approving' | 'dismissing' }

  // ─── Fetch Alerts from Backend ─────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      params.limit = 50;

      const res = await getAlerts(params);
      setAlerts(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ─── Trigger Manual Escalation Scan (Agent 6) ──────────────────────────────
  const handleRunScan = async () => {
    if (isViewer) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role (Viewer) is read-only and cannot trigger escalation scans.' }
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
        message: `Agent 6 scan complete: ${count} new escalation alert${count === 1 ? '' : 's'} identified.`
      });
      await fetchAlerts();
    } catch (err) {
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: err.response?.data?.message || 'Access denied for escalation scan.' }
        }));
      } else {
        setScanResult({
          success: false,
          message: `Escalation scan failed: ${err.message}`
        });
      }
    } finally {
      setScanning(false);
    }
  };

  // ─── Human Action: Approve Alert ───────────────────────────────────────────
  const handleApprove = async (alertId) => {
    if (isViewer) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role (Viewer) is read-only and cannot approve escalation notices.' }
      }));
      return;
    }
    try {
      setActionLoading(prev => ({ ...prev, [alertId]: 'approving' }));
      await approveAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, notification_status: 'approved' } : a));
    } catch (err) {
      console.error('Failed to approve alert:', err);
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: err.response?.data?.message || 'Access denied: You do not have permission to approve escalation notices.' }
        }));
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [alertId]: null }));
    }
  };

  // ─── Human Action: Dismiss Alert ───────────────────────────────────────────
  const handleDismiss = async (alertId) => {
    if (isViewer) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role (Viewer) is read-only and cannot dismiss escalation alerts.' }
      }));
      return;
    }
    try {
      setActionLoading(prev => ({ ...prev, [alertId]: 'dismissing' }));
      await dismissAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, notification_status: 'dismissed' } : a));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: err.response?.data?.message || 'Access denied: You do not have permission to dismiss alerts.' }
        }));
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [alertId]: null }));
    }
  };

  // ─── KPI Calculations ──────────────────────────────────────────────────────
  const totalAlerts    = alerts.length;
  const pendingAlerts  = alerts.filter(a => a.notification_status === 'pending').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
  const approvedAlerts = alerts.filter(a => a.notification_status === 'approved').length;

  const getSeverityBadge = (sev) => {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return { bg: '#dcfce7', color: '#15803d', border: '#86efac', label: 'Approved & Sent' };
      case 'dismissed':
        return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: 'Dismissed' };
      default:
        return { bg: '#fef9c3', color: '#854d0e', border: '#fde047', label: 'Pending Review' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Header & Action Bar ────────────────────────────────────────────── */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent: 'space-between',
        flexWrap:        'wrap',
        gap:             '16px',
        background:      '#ffffff',
        padding:         '20px 24px',
        borderRadius:    '16px',
        border:          '1px solid #e2e8f0',
        boxShadow:       '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width:          '44px',
            height:         '44px',
            borderRadius:   '12px',
            background:     'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            color:          '#ffffff',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            boxShadow:      '0 4px 12px rgba(99, 102, 241, 0.25)'
          }}>
            <BellRing size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Notification & Escalation Center
              </h2>
              <span style={{
                background:   '#e0e7ff',
                color:        '#4338ca',
                fontSize:     '0.68rem',
                fontWeight:   '700',
                padding:      '2px 8px',
                borderRadius: '12px'
              }}>
                Agent 6 Engine
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Real-time SLA breach surveillance, multi-tier risk escalations, and automated alerts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchAlerts}
            disabled={loading}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '6px',
              padding:      '8px 14px',
              borderRadius: '10px',
              border:       '1px solid #e2e8f0',
              background:   '#ffffff',
              color:        '#475569',
              fontSize:     '0.8rem',
              fontWeight:   '700',
              cursor:       'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '8px',
              padding:      '8px 18px',
              borderRadius: '10px',
              border:       'none',
              background:   'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color:        '#ffffff',
              fontSize:     '0.82rem',
              fontWeight:   '700',
              cursor:       'pointer',
              boxShadow:    '0 2px 8px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Zap size={15} />
            {scanning ? 'Scanning SLAs...' : 'Run Escalation Scan (Agent 6)'}
          </button>
        </div>
      </div>

      {/* ── Scan Notification Banner ───────────────────────────────────────── */}
      {scanResult && (
        <div style={{
          background:   scanResult.success ? '#f0fdf4' : '#fef2f2',
          border:       `1px solid ${scanResult.success ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '12px',
          padding:      '12px 18px',
          color:        scanResult.success ? '#166534' : '#991b1b',
          fontSize:     '0.82rem',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between'
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

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Alerts Tracked
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {totalAlerts}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Across all severity tiers
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fef08a', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ca8a04', marginTop: '6px' }}>
            {pendingAlerts}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a16207', marginTop: '4px' }}>
            Awaiting human confirmation
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>
            Critical & High Risk
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#dc2626', marginTop: '6px' }}>
            {criticalAlerts}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '4px' }}>
            Immediate attention required
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
            Escalations Dispatched
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
            {approvedAlerts}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '4px' }}>
            Approved and sent to managers
          </div>
        </div>

      </div>

      {/* ── Filter & Search Toolbar ────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        gap:            '12px',
        background:     '#ffffff',
        padding:        '12px 20px',
        borderRadius:   '12px',
        border:         '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="#64748b" />
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Status:</span>
          {['all', 'pending', 'approved', 'dismissed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                background:   statusFilter === st ? '#4f46e5' : '#f8fafc',
                color:        statusFilter === st ? '#ffffff' : '#64748b',
                border:       `1px solid ${statusFilter === st ? '#4338ca' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding:      '4px 10px',
                fontSize:     '0.72rem',
                fontWeight:   '700',
                cursor:       'pointer',
                textTransform: 'capitalize'
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
                background:   severityFilter === sev ? '#0f172a' : '#f8fafc',
                color:        severityFilter === sev ? '#ffffff' : '#64748b',
                border:       `1px solid ${severityFilter === sev ? '#0f172a' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding:      '4px 10px',
                fontSize:     '0.72rem',
                fontWeight:   '700',
                cursor:       'pointer'
              }}
            >
              {sev === 'all' ? 'All Severities' : sev}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert List Stream ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.85rem'
          }}>
            Loading Agent 6 escalation stream...
          </div>
        ) : alerts.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            color: '#64748b',
            border: '1px dashed #cbd5e1'
          }}>
            <ShieldAlert size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
              No Escalation Alerts Found
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              All reconciliation cases and repayment schedules are currently within SLA thresholds.
            </p>
          </div>
        ) : (
          alerts.map(alert => {
            const sevBadge = getSeverityBadge(alert.severity);
            const stBadge  = getStatusBadge(alert.notification_status);
            const isPending = alert.notification_status === 'pending';

            return (
              <div
                key={alert.id}
                style={{
                  background:   '#ffffff',
                  border:       `1px solid ${alert.severity === 'CRITICAL' ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  padding:      '18px 22px',
                  boxShadow:    '0 1px 3px rgba(0,0,0,0.02)',
                  display:      'flex',
                  flexDirection: 'column',
                  gap:          '12px',
                  transition:   'all 0.15s ease'
                }}
              >
                {/* Top Row: Severity, Title, Status & Timestamps */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      background:   sevBadge.bg,
                      color:        sevBadge.color,
                      border:       `1px solid ${sevBadge.border}`,
                      fontSize:     '0.68rem',
                      fontWeight:   '800',
                      padding:      '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {sevBadge.label}
                    </span>

                    <span style={{
                      background:   stBadge.bg,
                      color:        stBadge.color,
                      border:       `1px solid ${stBadge.border}`,
                      fontSize:     '0.68rem',
                      fontWeight:   '700',
                      padding:      '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {stBadge.label}
                    </span>

                    {alert.escalation_level && (
                      <span style={{
                        background:   '#f3e8ff',
                        color:        '#7e22ce',
                        fontSize:     '0.68rem',
                        fontWeight:   '700',
                        padding:      '2px 8px',
                        borderRadius: '6px'
                      }}>
                        Route: {alert.escalation_level.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <Clock size={12} />
                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Main Content & AI Narrative */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                    {alert.title || `SLA Breach: ${alert.company_name || 'Borrower'} — Alert #${alert.id}`}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                    {alert.ai_reasoning || alert.message || `${alert.company_name || 'The borrower'} has exceeded SLA repayment terms by ${alert.overdue_days || 0} days with ₹${Number(alert.outstanding_amount || 0).toLocaleString('en-IN')} outstanding.`}
                  </p>
                </div>

                {/* Real-Life Financial Context & Exposure Breakdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>OUTSTANDING EXPOSURE</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: '900', color: '#b91c1c' }}>
                      ₹{Number(alert.outstanding_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>DELINQUENCY PERIOD</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: '900', color: alert.overdue_days > 60 ? '#b91c1c' : alert.overdue_days > 30 ? '#d97706' : '#475569' }}>
                      {alert.overdue_days || 0} Days Past Due
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>ESCALATION ROUTE</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#4338ca' }}>
                      👤 {alert.recommended_recipient || 'Finance Manager'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>BORROWER CONTACT</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e293b' }}>
                      {alert.contact_name || 'Finance Dept'} <span style={{ color: '#64748b', fontWeight: '500' }}>({alert.contact_email || 'finance@company.com'})</span>
                    </div>
                  </div>
                </div>

                {/* AI Recommended Operational Protocol */}
                {alert.recommended_action && (
                  <div style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    color: '#1e40af',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px'
                  }}>
                    <Zap size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <strong>Recommended Protocol:</strong> {alert.recommended_action}
                    </div>
                  </div>
                )}

                {/* Bottom Action Buttons (Human-in-the-Loop) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                  
                  <button
                    onClick={() => onAskAI && onAskAI('notification_alert', alert.id)}
                    style={{
                      background:   'none',
                      border:       'none',
                      color:        '#6366f1',
                      fontSize:     '0.75rem',
                      fontWeight:   '700',
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '4px',
                      padding:      0
                    }}
                  >
                    <Bot size={13} />
                    Investigate with Copilot
                  </button>

                  {isPending && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        disabled={actionLoading[alert.id] || isViewer}
                        title={isViewer ? 'Viewer role is read-only — dismiss restricted' : 'Dismiss Alert'}
                        style={{
                          background:   isViewer ? '#f1f5f9' : '#ffffff',
                          border:       '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding:      '6px 12px',
                          fontSize:     '0.75rem',
                          fontWeight:   '700',
                          color:        isViewer ? '#cbd5e1' : '#64748b',
                          cursor:       (actionLoading[alert.id] || isViewer) ? 'not-allowed' : 'pointer',
                          display:      'flex',
                          alignItems:   'center',
                          gap:          '4px',
                          opacity:      isViewer ? 0.75 : 1
                        }}
                      >
                        <X size={13} />
                        Dismiss
                      </button>

                      <button
                        onClick={() => handleApprove(alert.id)}
                        disabled={actionLoading[alert.id] || isViewer}
                        title={isViewer ? 'Viewer role is read-only — approval restricted' : 'Approve & Dispatch Notice'}
                        style={{
                          background:   isViewer ? '#e2e8f0' : '#16a34a',
                          border:       'none',
                          borderRadius: '8px',
                          padding:      '6px 14px',
                          fontSize:     '0.75rem',
                          fontWeight:   '700',
                          color:        isViewer ? '#94a3b8' : '#ffffff',
                          cursor:       (actionLoading[alert.id] || isViewer) ? 'not-allowed' : 'pointer',
                          display:      'flex',
                          alignItems:   'center',
                          gap:          '4px',
                          boxShadow:    isViewer ? 'none' : '0 1px 4px rgba(22, 163, 74, 0.3)',
                          opacity:      isViewer ? 0.75 : 1
                        }}
                      >
                        <Check size={13} />
                        {actionLoading[alert.id] === 'approving' ? 'Approving...' : (isViewer ? 'Approve & Dispatch (Locked)' : 'Approve & Dispatch')}
                      </button>
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
