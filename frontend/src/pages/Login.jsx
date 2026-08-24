import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

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
      setErrorMsg(err.response?.data?.message || 'Invalid credentials. Please check your email and password.');
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
      background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #eef2ff 100%)',
      padding: '24px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Decorative ambient blurred background shapes */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-5%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      {/* Main Login Card */}
      <div style={{
        width: '460px',
        maxWidth: '100%',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '40px 36px',
        boxShadow: '0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02)',
        position: 'relative',
        zIndex: 1
      }}>
        
        {/* Favicon Logo at the Middle Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            position: 'relative'
          }}>
            <img
              src="/FinanceFlow AI Logo-favicon.png"
              alt="FinanceFlow AI Logo"
              style={{
                width: '84px',
                height: '84px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 16px rgba(79, 70, 229, 0.25))'
              }}
            />
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            FinanceFlow <span style={{ color: '#4f46e5' }}>AI</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500', marginTop: '6px' }}>
            Agentic Financial Operations & Repayment Platform
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '0.825rem',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
              Work Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@financeflow.com"
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                  padding: '11px 14px 11px 40px',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                  padding: '11px 14px 11px 40px',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '6px',
              width: '100%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In to FinanceFlow'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Quick Demo Switcher */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Demo Accounts
            </span>
            <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Sparkles size={11} /> 1-Click
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('accountant@financeflow.com')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 8px',
                fontSize: '0.725rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Accountant
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('manager@financeflow.com')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 8px',
                fontSize: '0.725rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@financeflow.com')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 8px',
                fontSize: '0.725rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Admin
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
