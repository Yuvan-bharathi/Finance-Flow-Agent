import React, { useEffect, useState } from 'react';

interface Am5ConfidenceGaugeProps {
  score: number; // e.g. 97.2
  height?: number;
}

export const Am5ConfidenceGauge: React.FC<Am5ConfidenceGaugeProps> = ({ score = 97.2, height = 150 }) => {
  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const [dashOffset, setDashOffset] = useState<number>(236);

  // SVG Gauge calculations
  // Arc radius = 75, semi-circle length = PI * 75 ≈ 235.6
  const totalArc = 235.6;

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1400; // ms for silky smooth animation
    const targetScore = Math.min(100, Math.max(0, score));

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Quintic ease-out for ultra smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 5);
      const current = Math.round((ease * targetScore) * 10) / 10;

      setAnimatedScore(current);
      setDashOffset(totalArc - (totalArc * (current / 100)));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setAnimatedScore(targetScore);
        setDashOffset(totalArc - (totalArc * (targetScore / 100)));
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [score]);

  // Needle angle: 0% -> -90 deg (left), 100% -> +90 deg (right)
  const needleAngle = -90 + (animatedScore / 100) * 180;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: `${height}px`,
      padding: '4px 0 8px 0',
    }}>
      <div style={{ position: 'relative', width: '220px', height: '110px' }}>
        <svg
          width="220"
          height="110"
          viewBox="0 0 220 110"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>

            <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background Arc Track */}
          <path
            d="M 35 105 A 75 75 0 0 1 185 105"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Animated Gradient Active Arc */}
          <path
            d="M 35 105 A 75 75 0 0 1 185 105"
            fill="none"
            stroke="url(#confidenceGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={totalArc}
            strokeDashoffset={dashOffset}
            filter="url(#gaugeShadow)"
          />

          {/* Sleek Dynamic Needle */}
          <g transform={`translate(110, 105) rotate(${needleAngle})`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-74"
              stroke="#1e1b4b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Needle glowing tip bead */}
            <circle cx="0" cy="-74" r="4.5" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.5" />
            {/* Pivot pin */}
            <circle cx="0" cy="0" r="5" fill="#312e81" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* Center Score Display positioned inside the arc dome */}
          <text
            x="110"
            y="72"
            textAnchor="middle"
            fontSize="26"
            fontWeight="900"
            fill="#0f172a"
            style={{ letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif' }}
          >
            {animatedScore}%
          </text>
        </svg>
      </div>

      {/* Distinct Subtitle cleanly positioned below the entire gauge */}
      <div style={{
        marginTop: '8px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}>
        <span style={{
          fontSize: '0.74rem',
          fontWeight: '700',
          color: '#475569',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: '#f8fafc',
          padding: '3px 10px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
        }}>
          Avg. Match Confidence
        </span>
      </div>
    </div>
  );
};

export default Am5ConfidenceGauge;
