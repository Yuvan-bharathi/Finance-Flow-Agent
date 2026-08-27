

interface ConfidenceBarProps {
  confidence?: number | null;
}

/**
 * Reusable AI Confidence Score Bar Component
 * - Green (90-100%), Blue (70-89%), Orange (50-69%), Red (<50%), '--' for Not Analyzed
 *
 * Called by:
 * - RecentCasesTable.tsx
 */
export const ConfidenceBar = ({ confidence = null }: ConfidenceBarProps) => {
  if (confidence === null || confidence === undefined || isNaN(confidence)) {
    return <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>--</span>;
  }

  const score = parseFloat(String(confidence));
  let barColor = '#10b981'; // Green >= 90%
  if (score < 50) barColor = '#ef4444';
  else if (score < 70) barColor = '#f59e0b';
  else if (score < 90) barColor = '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>
        {score.toFixed(1)}%
      </div>
      <div style={{
        height: '5px',
        width: '100%',
        background: '#e2e8f0',
        borderRadius: '999px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, score))}%`,
          background: barColor,
          borderRadius: '999px',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
};
