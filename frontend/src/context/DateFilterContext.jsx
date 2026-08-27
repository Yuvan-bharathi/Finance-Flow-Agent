import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Context: Global Date Range Filter Context
 *
 * Purpose:
 * Provides a unified temporal filtering state across all FinanceFlow AI pages
 * (Payments, Action Center, Loans, Reports & Analytics, Audit Compliance).
 * Persists selected preset or custom dates in sessionStorage.
 */

const DateFilterContext = createContext(null);

/**
 * Calculates start and end date strings (YYYY-MM-DD) based on preset identifier.
 */
export const calculateDateBounds = (preset) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'all':
      return { startDate: '', endDate: '' };
    case 'today':
      break;
    case '7d':
      start.setDate(end.getDate() - 6);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '30d':
      start.setDate(end.getDate() - 29);
      break;
    case '2026':
      return { startDate: '2026-01-01', endDate: '2026-12-31' };
    case '2025':
      return { startDate: '2025-01-01', endDate: '2025-12-31' };
    case 'ytd':
    case 'this_year':
      start = new Date(currentYear, 0, 1);
      return { startDate: `${currentYear}-01-01`, endDate: `${currentYear}-12-31` };
    default:
      return { startDate: '', endDate: '' };
  }

  const format = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: format(start),
    endDate: format(end)
  };
};

export const formatDisplayLabel = (preset, startDate, endDate) => {
  const formatShort = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  switch (preset) {
    case 'all':
      return 'All Time';
    case 'today':
      return 'Today';
    case '7d':
      return `Last 7 Days (${formatShort(startDate)} – ${formatShort(endDate)})`;
    case 'this_month':
      return 'This Month';
    case '30d':
      return 'Last 30 Days';
    case '2026':
      return 'FY 2026';
    case '2025':
      return 'FY 2025';
    case 'ytd':
    case 'this_year':
      return 'Year-to-Date (YTD)';
    case 'custom':
      return `${formatShort(startDate)} – ${formatShort(endDate)}`;
    default:
      return startDate && endDate ? `${formatShort(startDate)} – ${formatShort(endDate)}` : 'All Time';
  }
};

export const DateFilterProvider = ({ children }) => {
  const [activePreset, setActivePreset] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ff_date_preset');
      return saved || 'all';
    } catch {
      return 'all';
    }
  });

  const [dateRange, setDateRange] = useState(() => {
    try {
      const savedStart = sessionStorage.getItem('ff_date_start');
      const savedEnd = sessionStorage.getItem('ff_date_end');
      if (savedStart !== null && savedEnd !== null) {
        return { startDate: savedStart, endDate: savedEnd };
      }
    } catch {}
    return calculateDateBounds('all');
  });

  const setPreset = (preset) => {
    setActivePreset(preset);
    sessionStorage.setItem('ff_date_preset', preset);
    if (preset !== 'custom') {
      const bounds = calculateDateBounds(preset);
      setDateRange(bounds);
      sessionStorage.setItem('ff_date_start', bounds.startDate);
      sessionStorage.setItem('ff_date_end', bounds.endDate);
    }
  };

  const setCustomRange = (start, end) => {
    setActivePreset('custom');
    setDateRange({ startDate: start, endDate: end });
    sessionStorage.setItem('ff_date_preset', 'custom');
    sessionStorage.setItem('ff_date_start', start);
    sessionStorage.setItem('ff_date_end', end);
  };

  const formattedDisplay = formatDisplayLabel(activePreset, dateRange.startDate, dateRange.endDate);

  return (
    <DateFilterContext.Provider value={{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      activePreset,
      formattedDisplay,
      setPreset,
      setCustomRange
    }}>
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (!context) {
    const fallbackBounds = calculateDateBounds('7d');
    return {
      startDate: fallbackBounds.startDate,
      endDate: fallbackBounds.endDate,
      activePreset: '7d',
      formattedDisplay: 'Last 7 Days',
      setPreset: () => {},
      setCustomRange: () => {}
    };
  }
  return context;
};

export default DateFilterContext;
