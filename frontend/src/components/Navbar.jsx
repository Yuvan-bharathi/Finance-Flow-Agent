import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User, Cpu } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="glass-card" style={{
      borderRadius: 0,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'rgba(11, 15, 23, 0.85)'
    }}>
      {/* Brand Logo & Platform Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
        }}>
          <Cpu size={24} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', lineHeight: 1.1 }}>
            FinanceFlow <span style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '500' }}>
            Agentic Repayment & Financial Operations Platform
          </p>
        </div>
      </div>

      {/* User Session Profile & Controls */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              fontWeight: '700'
            }}>
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f3f4f6' }}>{user.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  {user.role_name}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{user.email}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={logout}
            className="btn-secondary"
            title="Logout of FinanceFlow AI"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};
