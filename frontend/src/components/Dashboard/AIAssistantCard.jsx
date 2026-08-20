import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * AI Assistant & Logged-In User Footer Card
 * Rendered at the bottom of the Left Sidebar.
 * 
 * Called by:
 * - Sidebar.jsx
 */
export const AIAssistantCard = () => {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
      
      {/* AI Assistant Card */}
      <div style={{
        background: 'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
        border: '1px solid #d8b4fe',
        borderRadius: '16px',
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#4c1d95' }}>AI Assistant</div>
            <div style={{ fontSize: '0.725rem', color: '#6b21a8' }}>Ask FinanceFlow AI</div>
          </div>
        </div>

        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7c3aed',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <ChevronRight size={16} />
        </div>
      </div>

      {/* Logged-In User Profile Card */}
      {user && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#6366f1',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'SA'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>{user.name}</div>
              <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{user.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.675rem', fontWeight: '600', color: '#10b981' }}>Online</span>
              </div>
            </div>
          </div>

          <ChevronRight size={16} color="#94a3b8" />
        </div>
      )}

    </div>
  );
};
