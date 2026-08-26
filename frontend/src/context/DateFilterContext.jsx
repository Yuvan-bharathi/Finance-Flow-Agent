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
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      // start and end are today
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
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start.setDate(end.getDate() - 6);
      break;
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
    case 'today':
      return 'Today';
    case '7d':
      return `${formatShort(startDate)} – ${formatShort(endDate)}`;
    case 'this_month':
      return 'This Month';
    case '30d':
      return 'Last 30 Days';
    case 'ytd':
      return 'Year-to-Date (YTD)';
    case 'custom':
      return `${formatShort(startDate)} – ${formatShort(endDate)}`;
    default:
      return `${formatShort(startDate)} – ${formatShort(endDate)}`;
  }
};

export const DateFilterProvider = ({ children }) => {
  const [activePreset, setActivePreset] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ff_date_preset');
      return saved || '7d';
    } catch {
      return '7d';
    }
  });

  const [dateRange, setDateRange] = useState(() => {
    try {
      const savedStart = sessionStorage.getItem('ff_date_start');
      const savedEnd = sessionStorage.getItem('ff_date_end');
      if (savedStart && savedEnd) {
        return { startDate: savedStart, endDate: savedEnd };
      }
    } catch {}
    return calculateDateBounds('7d');
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
