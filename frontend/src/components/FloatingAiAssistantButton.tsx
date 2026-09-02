import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { connectSocket } from '../services/socketService';

interface FloatingAiAssistantButtonProps {
  onClick: () => void;
}

interface RunningPipelineStatus {
  pipelineId?: number | string;
  name: string;
  currentStep: string;
  stepIndex: number;
  totalSteps: number;
  status: 'running' | 'completed' | 'failed';
}

/**
 * Floating AI Assistant FAB - fixed bottom-right corner
 * Opens the AiCopilotPanel when clicked.
 * Includes a real-time Live Pipeline Indicator positioned directly above the button.
 */
export const FloatingAiAssistantButton: React.FC<FloatingAiAssistantButtonProps> = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<RunningPipelineStatus | null>(null);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    let fadeTimer: NodeJS.Timeout;

    const handlePipelineStarted = (data: { pipeline_id?: number | string; pipeline_name?: string; steps?: unknown[] }) => {
      clearTimeout(fadeTimer);
      setPipelineStatus({
        pipelineId: data?.pipeline_id,
        name: data?.pipeline_name || 'Reconciliation & Risk Pipeline',
        currentStep: 'Step 1: Payment Reconciliation',
        stepIndex: 1,
        totalSteps: data?.steps?.length || 4,
        status: 'running',
      });
    };

    const handleStepStarted = (data: { pipeline_id?: number | string; agent_name?: string; step_index?: number }) => {
      clearTimeout(fadeTimer);
      const cleanName = data?.agent_name
        ? data.agent_name.replace(/Agent$/, '').replace(/([A-Z])/g, ' $1').trim()
        : `Agent ${data?.step_index || 1}`;

      setPipelineStatus(prev => ({
        pipelineId: data?.pipeline_id || prev?.pipelineId,
        name: prev?.name || 'Reconciliation & Risk Pipeline',
        currentStep: cleanName,
        stepIndex: data?.step_index || prev?.stepIndex || 1,
        totalSteps: prev?.totalSteps || 4,
        status: 'running',
      }));
    };

    const handleStepCompleted = (data: { step_index?: number }) => {
      setPipelineStatus(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stepIndex: Math.min(prev.totalSteps, (data?.step_index || prev.stepIndex) + 1),
        };
      });
    };

    const handlePipelineFinished = () => {
      setPipelineStatus(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
          currentStep: 'Continuous Waterfall Ready',
          stepIndex: prev.totalSteps,
        };
      });

      fadeTimer = setTimeout(() => {
        setPipelineStatus(null);
      }, 4000);
    };

    const handlePipelineFailed = () => {
      setPipelineStatus(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'failed',
          currentStep: 'Execution Halted',
        };
      });

      fadeTimer = setTimeout(() => {
        setPipelineStatus(null);
      }, 4000);
    };

    socket.on('PIPELINE_STARTED', handlePipelineStarted);
    socket.on('PIPELINE_STEP_STARTED', handleStepStarted);
    socket.on('PIPELINE_STEP_COMPLETED', handleStepCompleted);
    socket.on('PIPELINE_COMPLETED', handlePipelineFinished);
    socket.on('RECONCILIATION_COMPLETED', handlePipelineFinished);
    socket.on('PIPELINE_FAILED', handlePipelineFailed);

    return () => {
      clearTimeout(fadeTimer);
      socket.off('PIPELINE_STARTED', handlePipelineStarted);
      socket.off('PIPELINE_STEP_STARTED', handleStepStarted);
      socket.off('PIPELINE_STEP_COMPLETED', handleStepCompleted);
      socket.off('PIPELINE_COMPLETED', handlePipelineFinished);
      socket.off('RECONCILIATION_COMPLETED', handlePipelineFinished);
      socket.off('PIPELINE_FAILED', handlePipelineFailed);
    };
  }, []);

  const isCompleted = pipelineStatus?.status === 'completed';
  const progressPercent = pipelineStatus
    ? Math.min(100, Math.round((pipelineStatus.stepIndex / pipelineStatus.totalSteps) * 100))
    : 0;

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
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.45); }
          50%      { box-shadow: 0 0 26px rgba(139, 92, 246, 0.85); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-fab, .ai-fab-ring { animation: none !important; }
        }
      `}</style>

      {/* Live Running Pipeline Indicator (Positioned directly above the AI Assistant) */}
      {pipelineStatus && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          right: '24px',
          width: '290px',
          maxWidth: 'calc(100vw - 48px)',
          background: isCompleted ? 'rgba(6, 78, 59, 0.95)' : 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '16px',
          border: isCompleted ? '1.5px solid #10b981' : '1.5px solid rgba(139, 92, 246, 0.65)',
          boxShadow: isCompleted
            ? '0 8px 30px rgba(16, 185, 129, 0.35)'
            : '0 8px 32px rgba(124, 58, 237, 0.35), 0 2px 10px rgba(0,0,0,0.5)',
          zIndex: 10002,
          animation: 'fabEntrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseGlow 2.5s ease-in-out infinite',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: "'Inter', sans-serif",
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isCompleted ? (
                <CheckCircle2 size={16} color="#34d399" />
              ) : (
                <Loader2 size={16} color="#a78bfa" className="animate-spin" />
              )}
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: isCompleted ? '#a7f3d0' : '#f3e8ff' }}>
                {isCompleted ? 'AI Pipeline Finished' : 'AI Pipeline Running'}
              </span>
            </div>
            <span style={{
              background: isCompleted ? '#065f46' : '#6d28d9',
              color: isCompleted ? '#6ee7b7' : '#e9d5ff',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: '800',
              letterSpacing: '0.3px',
            }}>
              {isCompleted ? '100%' : `Step ${pipelineStatus.stepIndex}/${pipelineStatus.totalSteps}`}
            </span>
          </div>

          {/* Current Step Description */}
          <div style={{ fontSize: '0.74rem', color: isCompleted ? '#d1fae5' : '#cbd5e1', fontWeight: '500', lineHeight: 1.3 }}>
            {pipelineStatus.currentStep}
          </div>

          {/* Micro Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: isCompleted ? '#10b981' : 'linear-gradient(90deg, #8b5cf6, #38bdf8)',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Tooltip (Only shown when no pipeline indicator is active) */}
      {tooltipVisible && !pipelineStatus && (
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

