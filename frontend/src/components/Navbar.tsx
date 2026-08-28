import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ChevronDown, Mail, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="glass-card" style={{
      borderRadius: 0,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      padding: '14px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'rgba(11, 15, 23, 0.92)',
      backdropFilter: 'blur(16px)',
    }}>
      {/* Brand Logo & Platform Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: '#ffffff', border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', overflow: 'hidden',
        }}>
          <img src="/FinanceFlow AI Logo-favicon.png" alt="FinanceFlow AI"
            style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', lineHeight: 1.1 }}>
            FinanceFlow <span style={{ color: '#818cf8' }}>AI</span>
          </h2>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '500' }}>
            Agentic Financial Operations
          </p>
        </div>
      </div>

      {/* Profile Icon */}
      {user && (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            title={`${user.name} — click for profile`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: dropdownOpen ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: '50px',
              padding: '5px 12px 5px 5px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0,
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <ChevronDown size={14} color="#9ca3af" style={{
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }} />
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: 'rgba(15, 20, 35, 0.98)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '16px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              minWidth: '250px', overflow: 'hidden', zIndex: 1000,
            }}>
              {/* User Identity */}
              <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', fontWeight: '800', fontSize: '1.2rem', flexShrink: 0,
                  }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '700', color: '#f3f4f6', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: '#6b7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={11} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '6px', padding: '3px 10px',
                    fontSize: '0.7rem', fontWeight: '700', color: '#a5b4fc',
                  }}>
                    <Shield size={11} />
                    {(user as unknown as Record<string, string>)?.role_name || user.role || 'User'}
                  </span>
                </div>
              </div>

              {/* Sign Out */}
              <div style={{ padding: '8px' }}>
                <button
                  onClick={() => { void logout(); setDropdownOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    background: 'transparent', border: 'none',
                    color: '#f87171', fontSize: '0.85rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'background 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
