import React, { useState } from 'react';
import { Bot, Sparkles, Mic, MicOff, Send, Zap, Shield, PieChart, Bell, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { MobileDailyBriefing } from '../components/mobile/MobileDailyBriefing';
import { MobileAIInsightCard } from '../components/mobile/MobileAIInsightCard';
import { MobileAIActivityFeed } from '../components/mobile/MobileAIActivityFeed';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { triggerHaptic } from '../utils/haptics';

/**
 * Page: AIAssistant (Mobile AI Command Center)
 * 
 * Purpose:
 *   Dedicated Mobile AI Command Center (`/assistant` or `/ai`).
 *   Provides the comprehensive mobile AI intelligence hub with Voice AI, Daily Briefings,
 *   Portfolio Insights, Agent operations, and seamless integration with the full 23-tool AI Copilot.
 */
export const AIAssistant = ({ onOpenCopilotWithPrompt, onInvestigateEntity }) => {
  const { isOnline } = useOnlineStatus();
  const [quickInput, setQuickInput] = useState('');

  const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
    onTranscriptComplete: (transcriptText) => {
      setQuickInput(transcriptText);
      triggerHaptic('success');
      if (onOpenCopilotWithPrompt) {
        onOpenCopilotWithPrompt(transcriptText);
      }
    }
  });

  const handleVoiceToggle = () => {
    if (!isOnline) {
      triggerHaptic('warning');
      alert('Voice AI requires an active internet connection.');
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSendPrompt = (promptText) => {
    const textToSend = promptText || quickInput;
    if (!textToSend.trim()) return;

    if (!isOnline) {
      triggerHaptic('warning');
      alert('AI requests require an active backend connection.');
      return;
    }

    triggerHaptic('light');
    if (onOpenCopilotWithPrompt) {
      onOpenCopilotWithPrompt(textToSend.trim());
      setQuickInput('');
    }
  };

  const quickPrompts = [
    { label: 'Daily Briefing', prompt: 'Provide the daily financial operations briefing and highlight high-risk items.' },
    { label: 'Critical Borrowers', prompt: 'Which companies have overdue payments above 10 Lakh?' },
    { label: 'Portfolio Health', prompt: 'Summarize portfolio collection efficiency and loan exposure trends.' },
    { label: 'Pending Reconciliations', prompt: 'Show all reconciliation cases waiting for accountant approval.' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      paddingBottom: '80px' // Space for bottom navigation
    }}>
      {/* Top Mobile AI Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
        borderRadius: '20px',
        padding: '24px 20px',
        color: '#ffffff',
        boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Connection Status Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(8px)',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: '700',
          marginBottom: '12px'
        }}>
          {isOnline ? (
            <>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
              <span>Live Intelligence Backed by Groq & MySQL</span>
            </>
          ) : (
            <>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} />
              <span>Offline — Live AI Paused</span>
            </>
          )}
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: '800', lineHeight: 1.2 }}>
          FinanceFlow AI Command Center
        </h1>
        <p style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: '6px', lineHeight: 1.4 }}>
          Voice-enabled financial copilot, 6 autonomous agents, and human-in-the-loop decisioning in your pocket.
        </p>

        {/* Voice & Text Input Box */}
        <div style={{
          marginTop: '18px',
          background: '#ffffff',
          borderRadius: '14px',
          padding: '6px 8px 6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
        }}>
          <input
            type="text"
            placeholder={isListening ? 'Listening to your voice...' : 'Ask FinanceFlow AI anything...'}
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
            disabled={!isOnline}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.85rem',
              color: '#0f172a',
              background: 'transparent'
            }}
          />

          {isSupported && (
            <button
              onClick={handleVoiceToggle}
              title={isListening ? 'Stop Recording' : 'Start Voice Input'}
              style={{
                background: isListening ? '#ef4444' : '#f1f5f9',
                color: isListening ? '#ffffff' : '#4f46e5',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isListening ? <MicOff size={18} className="animate-pulse" /> : <Mic size={18} />}
            </button>
          )}

          <button
            onClick={() => handleSendPrompt()}
            disabled={!quickInput.trim() || !isOnline}
            style={{
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (!quickInput.trim() || !isOnline) ? 'not-allowed' : 'pointer',
              opacity: (!quickInput.trim() || !isOnline) ? 0.5 : 1
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Quick Prompts Carousel */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(qp.prompt)}
            disabled={!isOnline}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              fontWeight: '700',
              color: '#334155',
              whiteSpace: 'nowrap',
              cursor: isOnline ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              opacity: isOnline ? 1 : 0.6
            }}
          >
            <Sparkles size={13} color="#6366f1" />
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Daily AI Briefing */}
      <MobileDailyBriefing
        onInvestigateCase={(recordType, id) => {
          if (onInvestigateEntity) onInvestigateEntity(recordType, id);
        }}
      />

      {/* Portfolio Health Insights Card */}
      <MobileAIInsightCard
        onInvestigate={() => {
          handleSendPrompt('Investigate high-risk borrowers in the loan portfolio.');
        }}
      />

      {/* AI Activity Feed */}
      <MobileAIActivityFeed
        onAskAiAboutEvent={(prompt) => handleSendPrompt(prompt)}
      />
    </div>
  );
};

export default AIAssistant;
