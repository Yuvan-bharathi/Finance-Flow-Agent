import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cpu, ShieldCheck, Lock, Mail } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('accountant@financeflow.com');
  const [password, setPassword] = useState('Password123!');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top left, #1e1b4b 0%, #0b0f17 60%)',
      padding: '20px'
    }}>
      <div className="glass-card animate-fade-in" style={{ width: '440px', padding: '36px' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 24px rgba(99, 102, 241, 0.4)',
            marginBottom: '16px'
          }}>
            <Cpu size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff' }}>
            FinanceFlow <span style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '6px' }}>
            Agentic Repayment & Financial Operations Platform
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af' }}>Email Address</label>
            <div style={{ position: 'relative', marginTop: '4px' }}>
              <Mail size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '10px 12px 10px 38px', borderRadius: '10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af' }}>Password</label>
            <div style={{ position: 'relative', marginTop: '4px' }}>
              <Lock size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '10px 12px 10px 38px', borderRadius: '10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }}>
            <ShieldCheck size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In to FinanceFlow'}</span>
          </button>
        </form>

        {/* Seed Role Shortcuts */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '10px' }}>
            Quick Demo Accounts (Password: Password123!)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={() => handleQuickFill('accountant@financeflow.com')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'center' }}>
              Senior Accountant
            </button>
            <button onClick={() => handleQuickFill('manager@financeflow.com')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'center' }}>
              Finance Manager
            </button>
            <button onClick={() => handleQuickFill('admin@financeflow.com')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'center' }}>
              System Admin
            </button>
            <button onClick={() => handleQuickFill('viewer@financeflow.com')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'center' }}>
              Audit Viewer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
