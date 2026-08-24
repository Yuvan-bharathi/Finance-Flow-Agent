import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, X, MessageSquare, Zap, Shield, ChevronRight, Bell, CheckCircle2 } from 'lucide-react';

export const AiAssistantModal = ({ isOpen, onClose }) => {
  const [notifyEmail, setNotifyEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        cursor: 'pointer'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '580px',
          maxWidth: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.1)',
          position: 'relative',
          cursor: 'default'
        }}
      >
        {/* Header Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #9333ea 100%)',
          padding: '32px 32px 28px',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <X size={18} />
          </button>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.725rem',
            fontWeight: '800',
            letterSpacing: '0.05em',
            marginBottom: '14px'
          }}>
            <Sparkles size={14} />
            <span>FEATURE ROADMAP • V2.0</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#ffffff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              flexShrink: 0
            }}>
              <Bot size={34} color="#4f46e5" />
            </div>

            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', lineHeight: 1.1 }}>
                FinanceFlow AI Co-Pilot
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#e0e7ff', marginTop: '4px', opacity: 0.9 }}>
                Interactive Conversational Assistant & Natural Language Co-Pilot
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '28px' }}>
          
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              fontSize: '0.775rem',
              fontWeight: '800',
              marginBottom: '10px'
            }}>
              🚀 COMING SOON IN NEXT RELEASE
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
              Conversational Financial Intelligence
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
              The AI Assistant is currently in final staging. Soon you will be able to query portfolio risks, draft payment reminders, and analyze bank statements using plain conversational prompts!
            </p>
          </div>

          {/* Planned Features List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              {
                icon: MessageSquare,
                title: 'Natural Language Portfolio Queries',
                desc: 'Ask questions like "Which companies owe repayments > ₹50,000 this week?"'
              },
              {
                icon: Zap,
                title: 'Instant Action Triggers',
                desc: 'Command AI to trigger reconciliation runs or draft collection emails.'
              },
              {
                icon: Shield,
                title: 'Human-in-the-Loop Governance',
                desc: 'All AI Assistant actions follow strict role permission boundaries.'
              }
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '12px 14px',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>{feat.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{feat.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Email Notification Form */}
          {submitted ? (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: '700',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>You're on the VIP list! We will notify you when AI Assistant launches.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                required
                placeholder="Enter work email to get launch invite..."
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                style={{
                  flex: 1,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                <Bell size={14} />
                <span>Notify Me</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
