import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, CheckCircle2, AlertTriangle, Building2, Mail } from 'lucide-react';
import api from '../services/api';

/**
 * Slide-Over / Modal Component for Agent 3: Automated Collection Follow-Up
 * 
 * Called by:
 * - CompanyList.jsx
 */
export const CollectionReminderModal = ({ company, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState(null);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/collections/generate/${company.id}`);
        setDraft(res.data.data);
      } catch (err) {
        console.error('Error fetching collection reminder draft:', err);
        setError('Failed to generate collection follow-up email draft.');
      } finally {
        setLoading(false);
      }
    };
    if (company?.id) fetchDraft();
  }, [company]);

  const handleSendReminder = async () => {
    try {
      setSending(true);
      await api.post('/collections/send', {
        companyId: company.id,
        draftPayload: draft
      });
      setSentSuccess(true);
    } catch (err) {
      console.error('Error sending collection email:', err);
      alert('Failed to send collection reminder email.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '24px',
        cursor: 'pointer'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '680px',
          cursor: 'default',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} color="#a5b4fc" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>
                Agent 3: Automated Collection Follow-Up
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#c7d2fe', margin: '2px 0 0 0' }}>
                AI-drafted payment reminder notice for {company.company_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Sparkles size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#6366f1' }} />
              <p style={{ fontWeight: '600' }}>Agent 3 is analyzing loan schedule and drafting email...</p>
            </div>
          ) : sentSuccess ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Collection Reminder Sent!
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '6px' }}>
                The payment notice has been logged to audit compliance and dispatched to <strong>{draft?.recipient_email}</strong>.
              </p>
              <button
                onClick={onClose}
                style={{
                  marginTop: '24px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          ) : draft ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Overdue Summary Card */}
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#dc2626' }}>
                    Urgency: {draft.urgency_level}
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#991b1b', marginTop: '2px' }}>
                    Overdue: ₹{parseFloat(draft.overdue_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.825rem', color: '#7f1d1d', fontWeight: '600' }}>
                  <div>{draft.overdue_days} Days Past Due</div>
                  <div>Facility: {draft.loan_number}</div>
                </div>
              </div>

              {/* Recipient Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Recipient Name</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{draft.recipient_name}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Recipient Email</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{draft.recipient_email}</div>
                </div>
              </div>

              {/* Email Subject Line */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                  Email Subject
                </label>
                <input
                  type="text"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#0f172a'
                  }}
                />
              </div>

              {/* Email Body Textarea */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'block' }}>
                  AI Drafted Email Body
                </label>
                <textarea
                  rows={8}
                  value={draft.email_body}
                  onChange={(e) => setDraft({ ...draft, email_body: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    color: '#1e293b',
                    lineHeight: '1.5'
                  }}
                />
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        {draft && !sentSuccess && (
          <div style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '16px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendReminder}
              disabled={sending}
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Send size={16} />
              <span>{sending ? 'Sending Notice...' : 'Dispatch Reminder Email'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
