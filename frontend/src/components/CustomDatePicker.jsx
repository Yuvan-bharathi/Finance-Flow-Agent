import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Custom Enterprise SaaS Date Picker aligned with FinanceFlow AI Emerald/Slate Theme.
 *
 * @param {string} value - Selected date string in 'YYYY-MM-DD'
 * @param {function} onChange - Callback receiving 'YYYY-MM-DD'
 * @param {string} label - Optional label above the input
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Required field flag
 * @param {string} minDate - Minimum selectable date 'YYYY-MM-DD'
 * @param {string} maxDate - Maximum selectable date 'YYYY-MM-DD'
 */
export const CustomDatePicker = ({
  value,
  onChange,
  label,
  placeholder = 'Select date...',
  required = false,
  minDate,
  maxDate,
  placement = 'top',
  style = {}
}) => {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [actualPlacement, setActualPlacement] = useState(placement);

  // Position calculation on open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (placement === 'auto') {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 350 && spaceAbove > 300) {
          setActualPlacement('top');
        } else {
          setActualPlacement('bottom');
        }
      } else {
        setActualPlacement(placement);
      }
    }
  }, [isOpen, placement]);

  // Parse initial date or default to current date
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(value);
  }, [value]);

  const today = useMemo(() => new Date(), []);

  // View state for navigating months inside the calendar
  const [viewDate, setViewDate] = useState(() => {
    return parsedDate ? new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [showYearMonthSelect, setShowYearMonthSelect] = useState(false);

  // Sync viewDate when value changes from external
  useEffect(() => {
    if (parsedDate) {
      setViewDate(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
    }
  }, [value]);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowYearMonthSelect(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      days.push({
        day: dayNum,
        month: currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true
      });
    }

    // Next month filler days (fill up to 42 cells or 35 cells)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        month: currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Format date as 'YYYY-MM-DD'
  const formatDateString = (year, month, day) => {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSelectDay = (dayObj) => {
    const dateStr = formatDateString(dayObj.year, dayObj.month, dayObj.day);
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e) => {
    e.stopPropagation();
    const dateStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
    onChange(dateStr);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Formatted display text (e.g. '05 Sep 2026')
  const formattedDisplayValue = useMemo(() => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return '';
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[parsedDate.getMonth()].slice(0, 3);
    const year = parsedDate.getFullYear();
    return `${day} ${month} ${year}`;
  }, [parsedDate]);

  // Year options for fast selection (range current - 5 to + 10)
  const yearOptions = useMemo(() => {
    const baseYear = today.getFullYear();
    const years = [];
    for (let y = baseYear - 5; y <= baseYear + 10; y++) {
      years.push(y);
    }
    return years;
  }, [today]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* ── Input Trigger ──────────────────────────────────────────────────── */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '10px',
          border: isOpen ? '1.5px solid #059669' : '1px solid #cbd5e1',
          background: '#ffffff',
          boxShadow: isOpen ? '0 0 0 3px rgba(5, 150, 105, 0.12)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontSize: '0.85rem',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarIcon size={16} color={isOpen ? '#059669' : '#64748b'} />
          <span style={{ color: value ? '#0f172a' : '#94a3b8', fontWeight: value ? '700' : '400' }}>
            {formattedDisplayValue || placeholder}
          </span>
        </div>

        {value && !required ? (
          <button
            type="button"
            onClick={handleClear}
            title="Clear date"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px'
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <div style={{ width: '14px' }} />
        )}
      </div>

      {/* ── Modern Custom Calendar Popover ─────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(actualPlacement === 'top'
              ? { bottom: 'calc(100% + 4px)', top: 'auto' }
              : { top: 'calc(100% + 4px)', bottom: 'auto' }),
            right: 0,
            zIndex: 1100,
            width: '275px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: actualPlacement === 'top'
              ? '0 -10px 25px rgba(15, 23, 42, 0.14), 0 -2px 6px rgba(0, 0, 0, 0.04)'
              : '0 12px 28px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(0, 0, 0, 0.04)',
            padding: '10px 12px',
            animation: 'fadeIn 0.12s ease-out'
          }}
        >
          {/* Header with Month/Year & Nav Arrows */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setShowYearMonthSelect(!showYearMonthSelect)}
              style={{
                background: showYearMonthSelect ? '#ecfdf5' : '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.78rem',
                fontWeight: '800',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Year & Month Selector Grid */}
          {showYearMonthSelect ? (
            <div style={{ padding: '4px 0', maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Select Month
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {MONTH_NAMES.map((mName, idx) => (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(currentYear, idx, 1));
                      setShowYearMonthSelect(false);
                    }}
                    style={{
                      background: idx === currentMonth ? '#059669' : '#f8fafc',
                      color: idx === currentMonth ? '#ffffff' : '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 2px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {mName.slice(0, 3)}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Select Year
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {yearOptions.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(y, currentMonth, 1));
                      setShowYearMonthSelect(false);
                    }}
                    style={{
                      background: y === currentYear ? '#059669' : '#f8fafc',
                      color: y === currentYear ? '#ffffff' : '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 2px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Day of Week Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '4px' }}>
                {DAYS_OF_WEEK.map((d, i) => (
                  <div key={i} style={{ fontSize: '0.68rem', fontWeight: '800', color: i === 0 || i === 6 ? '#94a3b8' : '#64748b', padding: '2px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {calendarDays.map((dayObj, idx) => {
                  const dayDateStr = formatDateString(dayObj.year, dayObj.month, dayObj.day);
                  const isSelected = value === dayDateStr;
                  const isToday =
                    today.getFullYear() === dayObj.year &&
                    today.getMonth() === dayObj.month &&
                    today.getDate() === dayObj.day;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDay(dayObj)}
                      style={{
                        height: '26px',
                        border: isToday && !isSelected ? '1.5px solid #059669' : 'none',
                        borderRadius: '6px',
                        background: isSelected
                          ? 'linear-gradient(135deg, #059669, #10b981)'
                          : 'transparent',
                        color: isSelected
                          ? '#ffffff'
                          : !dayObj.isCurrentMonth
                          ? '#cbd5e1'
                          : isToday
                          ? '#059669'
                          : '#1e293b',
                        fontWeight: isSelected || isToday ? '800' : '600',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.1s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(5, 150, 105, 0.25)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#ecfdf5';
                          e.currentTarget.style.color = '#047857';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = !dayObj.isCurrentMonth
                            ? '#cbd5e1'
                            : isToday
                            ? '#059669'
                            : '#1e293b';
                        }
                      }}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Footer Quick Action Buttons ─────────────────────────────────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handleSelectToday}
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer',
                padding: '3px 10px',
                borderRadius: '6px'
              }}
            >
              Today
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
export default CustomDatePicker;
