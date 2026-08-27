import React, { useState, useEffect } from 'react';

/**
 * AnimatedCounter Component
 * Animates numerical values counting up from 0 to target on load.
 * Supports prefixes (like ₹, $), suffixes (like %, sec), decimal places, and locale formatting.
 * 
 * @param {number|string} value - The target numerical value
 * @param {number} duration - Animation duration in ms (default 1200ms)
 * @param {string} prefix - Optional prefix e.g. "₹"
 * @param {string} suffix - Optional suffix e.g. "%"
 * @param {number} decimals - Number of decimal places
 * @param {boolean} isRupees - If true, formats with Indian numbering format (lakhs/crores)
 */
export const AnimatedCounter = ({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  isRupees = false
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let rawNum = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : Number(value);
    if (isNaN(rawNum)) rawNum = 0;

    let startTimestamp = null;
    const startValue = 0;
    const endValue = rawNum;

    // Ease-out cubic function: 1 - Math.pow(1 - progress, 3)
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animFrame);
  }, [value, duration]);

  const formatNumber = (num) => {
    if (isRupees) {
      return num.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
    return decimals > 0
      ? num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(num).toLocaleString('en-US');
  };

  return (
    <span>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
};
