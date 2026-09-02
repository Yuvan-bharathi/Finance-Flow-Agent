import React, { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface FloatingAiAssistantButtonProps {
  onClick: () => void;
}

/**
 * Floating AI Assistant FAB - fixed bottom-right corner
 * Opens the AiCopilotPanel when clicked.
 */
export const FloatingAiAssistantButton: React.FC<FloatingAiAssistantButtonProps> = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <>
      <style>{`
        @keyframes fabEntrance {
          0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
          70%  { opacity: 1; transform: scale(1.08) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fabPulseRing {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes fabSparkle {
          0%, 100% { opacity: 0.7; transform: rotate(0deg) scale(1); }
          50%       { opacity: 1;  transform: rotate(20deg) scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-fab, .ai-fab-ring { animation: none !important; }
        }
      `}</style>

      {/* Tooltip */}
      {tooltipVisible && (
        <div style={{
          position: 'fixed',
          bottom: '92px',
          right: '28px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '7px 14px',
          borderRadius: '10px',
          fontSize: '0.8rem',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          zIndex: 10001,
          pointerEvents: 'none',
          animation: 'fabEntrance 0.18s ease forwards',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Sparkles size={12} color="#a78bfa" />
          Ask FinanceFlow AI
          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            right: '22px',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #0f172a',
          }} />
        </div>
      )}

      {/* Pulse ring (shows on hover) */}
      {hovered && (
        <div
          className="ai-fab-ring"
          style={{
            position: 'fixed',
            bottom: '22px',
            right: '22px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'transparent',
            border: '2.5px solid rgba(124, 58, 237, 0.55)',
            zIndex: 9998,
            pointerEvents: 'none',
            animation: 'fabPulseRing 1s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
          }}
        />
      )}

      {/* FAB Button */}
      <button
        className="ai-fab"
        onClick={onClick}
        onMouseEnter={() => { setHovered(true); setTooltipVisible(true); }}
        onMouseLeave={() => { setHovered(false); setTooltipVisible(false); }}
        title="AI Assistant"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: hovered
            ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: hovered
            ? '0 8px 28px rgba(124, 58, 237, 0.55), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.35)'
            : '0 6px 20px rgba(99, 102, 241, 0.45), 0 2px 6px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10000,
          animation: 'fabEntrance 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          transform: hovered ? 'scale(1.08) translateY(-2px)' : 'scale(1) translateY(0)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.2s ease',
        }}
      >
        {hovered ? (
          <Bot size={24} color="#ffffff" style={{ animation: 'fabSparkle 1.8s ease-in-out infinite' }} />
        ) : (
          <Bot size={24} color="#ffffff" />
        )}
      </button>
    </>
  );
};
