import type { CSSProperties } from 'react';
import { Filter } from 'lucide-react';

interface FilterBarProps {
  statusFilter?: string;
  setStatusFilter?: (value: string) => void;
  priorityFilter?: string;
  setPriorityFilter?: (value: string) => void;
  onApplyFilter?: () => void;
}

/**
 * Table Top Filter Bar Component
 * Provides Status dropdown, Priority dropdown, and Filter button.
 *
 * Called by:
 * - RecentCasesTable.tsx
 */
export const FilterBar = ({
  statusFilter = '',
  setStatusFilter,
  priorityFilter = '',
  setPriorityFilter,
  onApplyFilter,
}: FilterBarProps) => {
  const selectStyle: CSSProperties = {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '0.825rem',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Status Dropdown */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter?.(e.target.value)}
        style={selectStyle}
      >
        <option value="">All Statuses</option>
        <option value="pending_review">Pending Review</option>
        <option value="resolved">Resolved</option>
        <option value="ai_processing">AI Processing</option>
        <option value="rejected">Rejected</option>
      </select>

      {/* Priority Dropdown */}
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter?.(e.target.value)}
        style={selectStyle}
      >
        <option value="">All Priorities</option>
        <option value="high">High Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="low">Low Priority</option>
      </select>

      {/* Filter Button */}
      <button
        onClick={onApplyFilter}
        style={{
          background: '#6366f1',
          color: '#ffffff',
          border: 'none',
          padding: '8px 18px',
          borderRadius: '10px',
          fontSize: '0.825rem',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
        }}
      >
        <Filter size={14} />
        <span>Filter</span>
      </button>
    </div>
  );
};
