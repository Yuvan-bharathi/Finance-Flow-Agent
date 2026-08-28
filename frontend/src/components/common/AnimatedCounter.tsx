import { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  isRupees?: boolean;
}

/**
 * AnimatedCounter Component
 * Animates numerical values counting up from 0 to target on load.
 * Supports prefixes (like ₹, $), suffixes (like %, sec), decimal places, and locale formatting.
 */
export const AnimatedCounter = ({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  isRupees = false,
}: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let rawNum = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : Number(value);
    if (isNaN(rawNum)) rawNum = 0;

    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = rawNum;

    const step = (timestamp: number) => {
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

  const formatNumber = (num: number): string => {
    if (isRupees) {
      return num.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
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
