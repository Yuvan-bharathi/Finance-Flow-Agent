import React from 'react';
import { Search, Bell, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Clean White Enterprise Top Header Component
 * 
 * Called by:
 * - Dashboard.jsx
 * 
 * @param {string} searchQuery - Search query text.
 * @param {Function} setSearchQuery - Setter function for search query.
 */
export const Header = ({ searchQuery = '', setSearchQuery }) => {
  const { user } = useAuth();
  const userName = (user && user.name && user.name.trim()) ? user.name : 'Senior Accountant';

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '20px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
    }}>
      
      {/* Left Greeting */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
          Welcome back, {userName}! 👋
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
          Here's what's happening with your reconciliations today.
        </p>
      </div>

      {/* Right Controls Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Search Input Box */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by sender, reference, or TXN ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            style={{
              width: '320px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              padding: '10px 14px 10px 40px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />
        </div>

        {/* Date Range Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '8px 14px',
          borderRadius: '12px',
          fontSize: '0.825rem',
          fontWeight: '600',
          color: '#334155',
          cursor: 'pointer'
        }}>
          <Calendar size={16} color="#6366f1" />
          <span>May 20 – May 27, 2025</span>
          <ChevronDown size={14} color="#94a3b8" />
        </div>

        {/* Notification Bell */}
        <div style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <Bell size={18} color="#475569" />
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '0.65rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff'
          }}>
            8
          </span>
        </div>

        {/* User Profile Avatar Dropdown */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px',
          cursor: 'pointer'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: '#4f46e5',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {userName ? userName.split(' ').map(n => n[0]).join('') : 'SA'}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>{userName}</div>
            <div style={{ fontSize: '0.675rem', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' }}>
              {user ? user.role_name : 'ACCOUNTANT'}
            </div>
          </div>
          <ChevronDown size={14} color="#94a3b8" />
        </div>

      </div>

    </header>
  );
};
