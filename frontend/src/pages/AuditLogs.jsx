import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { History, ShieldCheck, User, Code, X, Eye, FileText, Globe } from 'lucide-react';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-logs');
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History color="#d97706" size={26} />
          Immutable Compliance Audit Trail
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
          Regulatory audit logs recording user approvals, rejections, manual overrides, and IP metadata. Click any log row to inspect JSON snapshot diffs.
        </p>
      </div>

      {/* Audit Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Timestamp</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Action & Entity</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>User & Role</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Audit Snapshot Payload</th>
              <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading audit logs...</td></tr>
            ) : logs.map(log => (
              <tr
                key={log.id}
                onClick={() => setSelectedLog(log)}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>

                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: '700', color: '#6366f1' }}>{log.action}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Entity: {log.entity_type} #{log.entity_id}</div>
                </td>

                <td style={{ padding: '16px 20px' }}>
                  <div style={{ color: '#0f172a', fontWeight: '600' }}>{log.user_name || 'System'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '700' }}>{log.role_name}</div>
                </td>

                <td style={{ padding: '16px 20px' }}>
                  <pre style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.725rem',
                    color: '#059669',
                    maxWidth: '320px',
                    overflowX: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    margin: 0,
                    fontWeight: '600'
                  }}>
                    {JSON.stringify(log.new_values)}
                  </pre>
                </td>

                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#4f46e5',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Eye size={14} />
                    <span>Inspect</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Audit Log Drawer */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '560px',
            maxWidth: '100vw',
            background: '#ffffff',
            height: '100%',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column'
          }} className="animate-fade-in">
            
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>Audit Entry #{selectedLog.id}</h2>
                <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '700' }}>Action: {selectedLog.action}</div>
              </div>
              <button onClick={() => setSelectedLog(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Event Meta Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                <div><strong style={{ color: '#475569' }}>Timestamp:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{new Date(selectedLog.created_at).toLocaleString()}</span></div>
                <div><strong style={{ color: '#475569' }}>Executed By:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedLog.user_name || 'System Auto-Engine'}</span> ({selectedLog.role_name})</div>
                <div><strong style={{ color: '#475569' }}>Target Entity:</strong> <span style={{ color: '#2563eb', fontWeight: '600' }}>{selectedLog.entity_type} #{selectedLog.entity_id}</span></div>
                <div><strong style={{ color: '#475569' }}>IP Metadata:</strong> <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{selectedLog.ip_address || '127.0.0.1'}</code></div>
              </div>

              {/* Old Values JSON */}
              {selectedLog.old_values && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#dc2626', marginBottom: '6px' }}>Before State (Old Values)</div>
                  <pre style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '10px', fontSize: '0.775rem', color: '#991b1b', overflowX: 'auto', margin: 0, fontWeight: '600' }}>
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Values JSON */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#059669', marginBottom: '6px' }}>After State (New Audit Snapshot)</div>
                <pre style={{ background: '#d1fae5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '10px', fontSize: '0.775rem', color: '#065f46', overflowX: 'auto', margin: 0, fontWeight: '600' }}>
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
