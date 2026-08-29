import { useState, useRef, useEffect } from 'react';
import { Search, Calendar, ChevronDown, LogOut, Mail, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDateFilter } from '../../context/DateFilterContext';
import type { DatePreset } from '../../types/common';

interface HeaderProps {
  activeTab?: string;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export interface PageHeaderInfo {
  title: string;
  subtitle: string;
  isDashboard?: boolean;
}

export const PAGE_HEADER_CONFIG: Record<string, PageHeaderInfo> = {
  reconciliations: {
    title: '',
    subtitle: "Here's what's happening with your reconciliations today.",
    isDashboard: true,
  },
  dashboard: {
    title: '',
    subtitle: "Here's what's happening with your reconciliations today.",
    isDashboard: true,
  },
  payments: {
    title: 'Payment Manual Ingestion Engine',
    subtitle: 'Simulate bank deposits and trigger AI investigation.',
  },
  agents: {
    title: 'AI Agent Control & Orchestrator',
    subtitle: 'Monitor autonomous agent operations, real-time pipeline execution, and model performance metrics.',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Real-time alerts, escalation notices, and automated system activity logs.',
  },
  reports: {
    title: 'Reports & Analytics',
    subtitle: 'Monitor reconciliation, collection, portfolio, and AI performance.',
  },
  companies: {
    title: 'Borrowing Companies',
    subtitle: 'Manage borrower profiles, loan facilities, and repayment status.',
  },
  loans: {
    title: 'Loans & Schedules',
    subtitle: 'Track active loan facilities, repayment schedules, interest rates, and waterfall allocation rules.',
  },
  'audit-logs': {
    title: 'Audit Compliance',
    subtitle: 'Immutable audit trail of all AI decisions, manual approvals, and system transactions.',
  },
  documents: {
    title: 'Documents',
    subtitle: 'Manage loan agreements, payment proofs, invoices, and ERP documents.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage system configurations, integration keys, notification thresholds, and security preferences.',
  },
};

const ROLE_LABELS: Record<string, string> = {
  owner:              'Owner',
  super_admin:        'Super Admin',
  admin:              'Admin',
  senior_accountant:  'Senior Accountant',
  accountant:         'Accountant',
  manager:            'Manager',
  viewer:             'Viewer',
};

const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'today',      label: 'Today' },
  { id: '7d',         label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: '30d',        label: 'Last 30 Days' },
  { id: 'ytd',        label: 'Year-to-Date' },
];

export const Header = ({ activeTab, searchQuery = '', setSearchQuery }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { startDate, endDate, activePreset, formattedDisplay, setPreset, setCustomRange } = useDateFilter();

  const [dateOpen, setDateOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName = user?.name?.trim() ? user.name : (user?.email ?? 'User');
  const userRole = (user as unknown as Record<string, string>)?.role_name ?? user?.role ?? 'accountant';
  const formattedRole = ROLE_LABELS[userRole.toLowerCase()] ?? userRole.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = userName ? userName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\//, '').trim().toLowerCase() : '';
  const resolvedTab = activeTab || currentPath || 'reconciliations';
  const pageHeader = PAGE_HEADER_CONFIG[resolvedTab] || PAGE_HEADER_CONFIG['reconciliations'];

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) setDateOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [startDate, endDate]);

  return (
    <header className="dashboard-header header-content" style={{
      background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '18px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
    }}>
      {/* Left Heading / Title */}
      <div>
        {pageHeader.isDashboard ? (
          <>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2, margin: 0 }}>
              Welcome back, {userName}! 👋
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', margin: 0 }}>
              {pageHeader.subtitle}
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2, margin: 0 }}>
              {pageHeader.title}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', margin: 0 }}>
              {pageHeader.subtitle}
            </p>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="header-controls-wrap" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>

        {/* LIVE Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '5px 12px', fontSize: '0.72rem', fontWeight: '800', color: '#15803d' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
          <span>LIVE</span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="header-search-box"
            placeholder="Search by sender, reference, or TXN ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            style={{ width: '300px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', padding: '10px 14px 10px 40px', borderRadius: '12px', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s ease' }}
          />
        </div>

        {/* Date Range Dropdown */}
        <div ref={dateDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDateOpen(prev => !prev)}
            title="Change Global Date Filter"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: dateOpen ? '#ede9fe' : '#f8fafc', border: `1.5px solid ${dateOpen ? '#6366f1' : '#e2e8f0'}`, padding: '8px 14px', borderRadius: '12px', fontSize: '0.825rem', fontWeight: '700', color: dateOpen ? '#4338ca' : '#334155', cursor: 'pointer', transition: 'all 0.18s ease' }}
          >
            <Calendar size={16} color="#6366f1" />
            <span>{formattedDisplay}</span>
            <ChevronDown size={14} color="#6366f1" style={{ transform: dateOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>

          {dateOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', width: '320px', padding: '16px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Quick Presets</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {DATE_PRESETS.map(preset => (
                    <button key={preset.id} onClick={() => { setPreset(preset.id); setDateOpen(false); }}
                      style={{ padding: '7px 10px', borderRadius: '8px', border: activePreset === preset.id ? '1.5px solid #6366f1' : '1px solid #e2e8f0', background: activePreset === preset.id ? '#eef2ff' : '#ffffff', color: activePreset === preset.id ? '#4f46e5' : '#334155', fontWeight: '700', fontSize: '0.775rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease' }}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Custom Range</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
                    <span>From:</span>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.775rem' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
                    <span>To:</span>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.775rem' }} />
                  </div>
                  <button onClick={() => { if (customStart && customEnd) { setCustomRange(customStart, customEnd); setDateOpen(false); } }}
                    style={{ marginTop: '4px', padding: '8px', borderRadius: '8px', background: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Apply Custom Filter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button onClick={() => setDropdownOpen(prev => !prev)} title={`${userName} — click for profile`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: dropdownOpen ? '#ede9fe' : '#f5f3ff', border: `1.5px solid ${dropdownOpen ? '#8b5cf6' : '#ddd6fe'}`, borderRadius: '50px', padding: '5px 10px 5px 5px', cursor: 'pointer', transition: 'all 0.18s ease' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#ffffff', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initials}
            </div>
            <ChevronDown size={13} color="#7c3aed" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>

          {dropdownOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', minWidth: '240px', overflow: 'hidden', zIndex: 1000 }}>
              <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#ffffff', fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
                    <div style={{ fontSize: '0.71rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={11} color="#94a3b8" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email ?? '—'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ede9fe', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: '700', color: '#6d28d9' }}>
                    <Shield size={11} />{formattedRole}
                  </span>
                </div>
              </div>
              <div style={{ padding: '8px' }}>
                <button onClick={() => { void logout(); setDropdownOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s ease', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
