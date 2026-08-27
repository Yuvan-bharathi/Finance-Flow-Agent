import type { ComponentType } from 'react';
import { Zap, CreditCard, Building2, FileSpreadsheet, History } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  badge?: string;
}

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const menuItems: MenuItem[] = [
  { id: 'reconciliations', label: 'Action Center AI', icon: Zap },
  { id: 'payments', label: 'Payment Ingestion', icon: CreditCard },
  { id: 'companies', label: 'Borrowing Companies', icon: Building2 },
  { id: 'loans', label: 'Loans & Schedules', icon: FileSpreadsheet },
  { id: 'audit-logs', label: 'Audit Compliance', icon: History },
];

export const Sidebar = ({ activeTab = 'reconciliations', setActiveTab }: SidebarProps) => {
  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      background: 'rgba(17, 24, 39, 0.6)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ padding: '0 12px 12px 12px', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Financial Operations
      </div>

      {menuItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab?.(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)' : 'transparent',
              color: isActive ? '#ffffff' : '#9ca3af',
              fontWeight: isActive ? '600' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon size={18} color={isActive ? '#818cf8' : '#9ca3af'} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
};
