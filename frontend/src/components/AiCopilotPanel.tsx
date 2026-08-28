import { useState, useRef, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendMessage, confirmProposal, dismissProposal } from '../services/assistantService';
import {
  Bot, X, Minus, Send, Loader2,
  ExternalLink, ChevronDown, ChevronUp,
  CheckCircle2, ShieldCheck,
} from 'lucide-react';
import type { User } from '../types/auth';

interface ContextPayload {
  page?: string;
  recordType?: string | null;
  recordId?: number | string | null;
  caseId?: number | string;
  paymentId?: number | string;
  [key: string]: unknown;
}

interface SourceCitation {
  type: string;
  title: string;
  snippet?: string;
  proposalId?: string;
  actionType?: string;
  targetId?: string | number;
}

interface SuggestedAction {
  label: string;
  action: string;
}

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  suggestedActions?: SuggestedAction[];
  timestamp: Date;
}

interface ProposalState {
  status: 'pending_confirmation' | 'loading' | 'executed' | 'dismissed' | 'failed';
  result?: string;
  error?: string;
  executedAt?: string;
}

interface AiCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contextPayload?: ContextPayload;
  onClearContext?: () => void;
}

/**
 * Component: AiCopilotPanel
 * The FinanceFlow AI Financial Operations Copilot — a right-side slide-in panel
 */
export const AiCopilotPanel = ({
  isOpen,
  onClose,
  contextPayload = {},
  onClearContext,
}: AiCopilotPanelProps) => {
  const { user } = useAuth();

  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const [proposalStatuses, setProposalStatuses] = useState<Record<string, ProposalState>>({});

  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('ff_copilot_width');
    return saved ? Math.min(Math.max(parseInt(saved, 10), 380), 900) : 460;
  });
  const [isResizing, setIsResizing] = useState(false);

  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Resize Handlers
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 360), Math.min(900, window.innerWidth - 80));
      setPanelWidth(newWidth);
      localStorage.setItem('ff_copilot_width', String(newWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const prevRecordRef = useRef<string | null>(null);

  // Welcome message
  useEffect(() => {
    if (isOpen) {
      const recordKey = `${contextPayload?.recordType || 'general'}_${contextPayload?.recordId || 'none'}_${contextPayload?.caseId || ''}`;
      if (messages.length === 0 || prevRecordRef.current !== recordKey) {
        prevRecordRef.current = recordKey;
        const greeting = getGreetingMessage(user, contextPayload);
        setMessages([{
          role: 'assistant',
          content: greeting,
          sources: [],
          suggestedActions: getInitialSuggestedActions(contextPayload),
          timestamp: new Date(),
        }]);
      }
    }
  }, [isOpen, contextPayload?.recordType, contextPayload?.recordId, contextPayload?.caseId, user, messages.length, contextPayload]);

  // Send Message
  const handleSend = useCallback(async (messageText = inputValue) => {
    const text = (typeof messageText === 'string' ? messageText : inputValue).trim();
    if (!text || isSendingRef.current || isLoading) return;

    isSendingRef.current = true;
    setIsLoading(true);
    setInputValue('');

    const userMsg: CopilotMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const cleanContext = {
        ...contextPayload,
        recordType: contextPayload.recordType || undefined,
        recordId: contextPayload.recordId != null ? String(contextPayload.recordId) : undefined,
      };
      const res = await sendMessage(text, history, cleanContext);
      const { answer, sources = [], suggestedActions = [] } = (res.data?.data || {}) as { answer?: string; sources?: SourceCitation[]; suggestedActions?: SuggestedAction[] };

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer || 'I was unable to generate a response.',
        sources,
        suggestedActions,
        timestamp: new Date(),
      }]);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'An error occurred';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error. Please try again.\n\n_${msg}_`,
        sources: [],
        suggestedActions: [],
        timestamp: new Date(),
      }]);
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, contextPayload]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const toggleSources = (msgIndex: number) => {
    setExpandedSources(prev => ({ ...prev, [msgIndex]: !prev[msgIndex] }));
  };

  const handleConfirmProposal = async (proposalId: string) => {
    try {
      setProposalStatuses(prev => ({ ...prev, [proposalId]: { status: 'loading' } }));
      const res = await confirmProposal(proposalId);
      const data = (res.data?.data || {}) as { result_summary?: string; executed_at?: string };
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: {
          status: 'executed',
          result: data.result_summary || 'Action executed successfully and recorded in audit log.',
          executedAt: data.executed_at || new Date().toISOString(),
        },
      }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to execute action proposal.';
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: {
          status: 'failed',
          error: msg,
        },
      }));
    }
  };

  const handleDismissProposal = async (proposalId: string) => {
    try {
      setProposalStatuses(prev => ({ ...prev, [proposalId]: { status: 'loading' } }));
      await dismissProposal(proposalId);
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: { status: 'dismissed', result: 'Action proposal was dismissed.' },
      }));
    } catch {
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: { status: 'dismissed', result: 'Action proposal was dismissed.' },
      }));
    }
  };

  if (!isOpen) return null;

  const contextLabel = getContextLabel(contextPayload);

  return (
    <>
      {!isMinimized && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.15)',
            zIndex: 900,
            backdropFilter: 'blur(1px)',
          }}
        />
      )}

      {/* Main Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: isMinimized ? '420px' : `${panelWidth}px`,
        maxWidth: '92vw',
        height: '100vh',
        zIndex: 901,
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: isMinimized ? '-4px -4px 20px rgba(15,23,42,0.15)' : '-8px 0 32px rgba(15,23,42,0.12)',
        transform: isMinimized ? 'translateY(calc(100% - 56px))' : 'translateY(0)',
        transition: isResizing ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Resize Handle */}
        {!isMinimized && (
          <div
            onMouseDown={startResizing}
            style={{
              position: 'absolute',
              left: '-4px',
              top: 0,
              bottom: 0,
              width: '9px',
              cursor: 'ew-resize',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isResizing ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              transition: 'background 0.15s ease',
            }}
            title="Drag horizontally to resize panel width"
          >
            <div style={{
              width: isResizing ? '3px' : '2px',
              height: '40px',
              borderRadius: '3px',
              background: isResizing ? '#4f46e5' : 'rgba(148, 163, 184, 0.5)',
              transition: 'all 0.15s ease',
            }} />
          </div>
        )}

        {/* Header */}
        <div
          onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            cursor: isMinimized ? 'pointer' : 'default',
            borderRadius: isMinimized ? '12px 12px 0 0' : '0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}>
              <img
                src="/FinanceFlow AI Logo-favicon.png"
                alt="FinanceFlow AI Logo"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#ffffff' }}>
                FinanceFlow AI Copilot
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                {user?.name || 'User'} · {formatRole(user?.role)} {isMinimized && '· (Click to Expand)'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsMinimized(m => !m)}
              style={headerBtnStyle}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              <Minus size={14} color="rgba(255,255,255,0.9)" />
            </button>
            <button onClick={onClose} style={headerBtnStyle} title="Close">
              <X size={14} color="rgba(255,255,255,0.9)" />
            </button>
          </div>
        </div>

        {/* Context Banner */}
        {contextLabel && (
          <div style={{
            background: '#e0e7ff',
            borderBottom: '1px solid #c7d2fe',
            padding: '6px 16px',
            fontSize: '0.72rem',
            fontWeight: '700',
            color: '#3730a3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{getContextIcon(contextPayload.recordType)}</span>
              <span>{contextLabel}</span>
              <span style={{ color: '#6366f1', fontWeight: '600' }}>· Ask me anything about this record</span>
            </div>
            {onClearContext && (
              <button
                onClick={onClearContext}
                title="Clear record focus"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6366f1',
                  padding: '0 4px',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Message Thread */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bot size={14} color="#fff" />
                  </div>
                )}

                <div style={{
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : '#0f172a',
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  padding: '10px 13px',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {formatMessage(msg.content)}
                </div>
              </div>

              {/* Action Proposal Cards */}
              {msg.role === 'assistant' && msg.sources?.filter(s => s.type === 'action_proposal').map((prop, pi) => {
                const pId = prop.proposalId || `prop_${pi}`;
                const pState = proposalStatuses[pId] || { status: 'pending_confirmation' };
                const isExecuted = pState.status === 'executed';
                const isDismissed = pState.status === 'dismissed';
                const isFailed = pState.status === 'failed';
                const isActionLoading = pState.status === 'loading';

                return (
                  <div
                    key={pi}
                    style={{
                      marginLeft: '36px',
                      marginTop: '8px',
                      background: isExecuted ? '#f0fdf4' : isDismissed ? '#f8fafc' : '#ffffff',
                      border: `1.5px solid ${isExecuted ? '#86efac' : isDismissed ? '#e2e8f0' : '#c7d2fe'}`,
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>
                          {prop.actionType === 'FLAG_CASE' ? '🚩' : prop.actionType === 'ADD_CASE_NOTE' ? '📝' : prop.actionType === 'TRIGGER_REANALYSIS' ? '🔄' : '🚨'}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isExecuted ? '#15803d' : '#1e1b4b' }}>
                          {prop.title || 'Action Proposal'}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: isExecuted ? '#dcfce7' : isDismissed ? '#f1f5f9' : '#e0e7ff',
                        color: isExecuted ? '#166534' : isDismissed ? '#64748b' : '#4338ca',
                      }}>
                        {pId}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      {prop.snippet || `Target: Case #${prop.targetId}`}
                    </p>

                    {isExecuted ? (
                      <div style={{
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#15803d',
                      }}>
                        <CheckCircle2 size={16} />
                        <span>{pState.result || 'Action executed & audited in MySQL.'}</span>
                      </div>
                    ) : isDismissed ? (
                      <div style={{
                        background: '#f1f5f9',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        fontWeight: '600',
                      }}>
                        ✕ Action proposal dismissed.
                      </div>
                    ) : isFailed ? (
                      <div style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '0.75rem',
                        color: '#dc2626',
                        fontWeight: '600',
                      }}>
                        ❌ {pState.error}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleConfirmProposal(pId)}
                          disabled={isActionLoading}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: isActionLoading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          {isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                          <span>{isActionLoading ? 'Executing...' : 'Confirm Action'}</span>
                        </button>
                        <button
                          onClick={() => handleDismissProposal(pId)}
                          disabled={isActionLoading}
                          style={{
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Source Citations */}
              {msg.role === 'assistant' && (msg.sources?.filter(s => s.type !== 'action_proposal') || []).length > 0 && (
                <div style={{ marginLeft: '36px', marginTop: '6px' }}>
                  <button
                    onClick={() => toggleSources(idx)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.68rem', fontWeight: '700', color: '#6366f1',
                      padding: '2px 0',
                    }}
                  >
                    {expandedSources[idx] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    Sources ({msg.sources?.filter(s => s.type !== 'action_proposal').length})
                  </button>

                  {expandedSources[idx] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {msg.sources?.filter(s => s.type !== 'action_proposal').map((src, si) => (
                        <div key={si} style={{
                          background: '#f0f4ff',
                          border: '1px solid #c7d2fe',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '14px', flexShrink: 0 }}>
                              {getSourceIcon(src.type)}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#3730a3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {src.title}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.58rem', fontWeight: '700', padding: '1px 5px', borderRadius: '4px',
                            background: getFactTagBg(src.type),
                            color: getFactTagColor(src.type),
                          }}>
                            {getFactTag(src.type)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Suggested Action Buttons */}
              {msg.role === 'assistant' && (msg.suggestedActions?.length ?? 0) > 0 && (
                <div style={{
                  marginLeft: '36px', marginTop: '8px',
                  display: 'flex', flexWrap: 'wrap', gap: '6px',
                }}>
                  {msg.suggestedActions?.map((action, ai) => (
                    <button
                      key={ai}
                      onClick={() => handleSend(`Tell me more about ${action.label}`)}
                      style={{
                        background: '#f0f4ff',
                        border: '1px solid #c7d2fe',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: '#4338ca',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ExternalLink size={10} />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '36px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={14} color="#fff" />
              </div>
              <div style={{
                background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '4px 16px 16px 16px',
                padding: '10px 14px', display: 'flex', gap: '5px', alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#6366f1',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && !isLoading && (
          <div style={{
            padding: '0 14px 8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '8px',
          }}>
            {getQuickPrompts(contextPayload, user?.role).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '5px 11px',
                  fontSize: '0.72rem',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '8px 10px 8px 14px',
          }}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask FinanceFlow AI..."
              rows={1}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                resize: 'none',
                fontSize: '0.83rem',
                color: '#0f172a',
                lineHeight: 1.5,
                outline: 'none',
                fontFamily: 'inherit',
                maxHeight: '80px',
                height: '24px',
                padding: '2px 0',
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: 'none',
                background: (!inputValue.trim() || isLoading) ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: (!inputValue.trim() || isLoading) ? '#94a3b8' : '#ffffff',
                cursor: (!inputValue.trim() || isLoading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
            FinanceFlow AI uses real-time database data · Financial decisions require human approval
          </div>
        </div>
      </div>
    </>
  );
};

// Helpers
const formatRole = (role = '') => {
  const map: Record<string, string> = {
    admin: 'Admin', super_admin: 'Super Admin', owner: 'Owner',
    senior_accountant: 'Senior Accountant', manager: 'Manager',
    accountant: 'Accountant', risk_analyst: 'Risk Analyst',
  };
  return map[role] || role;
};

const getContextLabel = (ctx?: ContextPayload) => {
  if (!ctx?.recordType || !ctx?.recordId) return null;
  const labels: Record<string, string> = {
    payment: `Payment #${ctx.recordId}${ctx.caseId ? ` (Case #${ctx.caseId})` : ''}`,
    reconciliation_case: `Case #${ctx.recordId}${ctx.paymentId ? ` (Payment #${ctx.paymentId})` : ''}`,
    company: `Company #${ctx.recordId}`,
    loan: `Loan #${ctx.recordId}`,
  };
  return labels[ctx.recordType] || `${ctx.recordType} #${ctx.recordId}`;
};

const getContextIcon = (recordType?: string | null) => {
  const icons: Record<string, string> = {
    payment: '💳',
    reconciliation_case: '📋',
    company: '🏢',
    loan: '💰',
  };
  return (recordType && icons[recordType]) || '📄';
};

const getSourceIcon = (type?: string) => {
  const icons: Record<string, string> = {
    payment: '💳',
    reconciliation_case: '📋',
    agent_run: '🤖',
    execution_log: '📊',
    company: '🏢',
    loan: '💰',
    repayment_history: '📅',
    pending_queue: '⏳',
    portfolio: '📈',
    overdue_list: '⚠️',
    token_usage: '⚡',
  };
  return (type && icons[type]) || '📄';
};

const isAgentSource = (type: string) => ['agent_run', 'execution_log', 'token_usage'].includes(type);
const getFactTag = (type: string) => isAgentSource(type) ? '🤖 Agent' : '🗄️ DB';
const getFactTagBg = (type: string) => isAgentSource(type) ? '#fef3c7' : '#d1fae5';
const getFactTagColor = (type: string) => isAgentSource(type) ? '#92400e' : '#065f46';

const getGreetingMessage = (user: User | null, ctx?: ContextPayload) => {
  const name = user?.name?.split(' ')[0] || 'there';
  const role = user?.role || 'accountant';

  if (ctx?.recordType && ctx?.recordId) {
    return `👋 Hi ${name}! I can see you're looking at **${getContextLabel(ctx)}**.\n\nAsk me anything about this record — I'll retrieve the actual data from FinanceFlow to give you a precise, factual answer.`;
  }

  const roleGreetings: Record<string, string> = {
    admin: `👋 Good day, ${name}. I'm your AI Financial Operations Copilot.\n\nI can help you understand AI agent performance, token usage patterns, portfolio health, and investigate any payment or company in detail.`,
    super_admin: `👋 Good day, ${name}. I'm ready to assist with full platform visibility.`,
    senior_accountant: `👋 Hi ${name}! I can help you investigate reconciliation cases, explain AI decisions, and analyze payment patterns.`,
    accountant: `👋 Hi ${name}! I can help you understand your reconciliation cases and explain why AI made specific recommendations.`,
    risk_analyst: `👋 Hi ${name}! I can analyze company risk profiles, repayment histories, and portfolio concentration.`,
  };

  return roleGreetings[role] || `👋 Hi ${name}! I'm your FinanceFlow AI Copilot. What can I help you with?`;
};

const getInitialSuggestedActions = (ctx?: ContextPayload): SuggestedAction[] => {
  if (!ctx?.recordType) return [];
  const actions: Record<string, SuggestedAction[]> = {
    payment: [{ label: 'Investigate this payment', action: 'prompt' }],
    reconciliation_case: [{ label: 'Explain the AI recommendation', action: 'prompt' }],
    company: [{ label: 'Investigate this borrower', action: 'prompt' }],
    loan: [{ label: 'Analyze this loan facility', action: 'prompt' }],
  };
  return actions[ctx.recordType] || [];
};

const getQuickPrompts = (ctx?: ContextPayload, role?: string) => {
  if (ctx?.recordType === 'payment') {
    return ['Why did AI give this payment a match score?', 'Investigate this payment', 'Is this payment safe to approve?'];
  }
  if (ctx?.recordType === 'company') {
    return ['Investigate this company', 'Show repayment history & overdue amount', 'Is this borrower high risk?'];
  }
  if (ctx?.recordType === 'loan') {
    return ['Are there overdue installments on this loan?', 'Show full repayment schedule', 'Analyze this loan facility'];
  }
  if (ctx?.recordType === 'reconciliation_case') {
    return ['Explain why AI recommended this company', 'What agent ran for this case?', 'What should I do with this case?'];
  }
  if (['admin', 'super_admin', 'owner'].includes(role || '')) {
    return ['Who are our highest-risk borrowers?', 'Which companies owe > ₹1 Lakh?', 'Portfolio health summary', 'Why are tokens increasing?'];
  }
  return ['What should I focus on today?', 'Show overdue payments', 'Which borrowers are high risk?', 'Portfolio health summary'];
};

const formatMessage = (content = ''): ReactNode => {
  const cleanContent = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '')
    .replace(/```(?:tool_call|json)?[\s\S]*?```/gi, '')
    .trim();

  const lines = cleanContent.split('\n');
  const rendered: ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rendered.push(<div key={i} style={{ height: '4px' }} />);
      return;
    }
    rendered.push(
      <div key={i} style={{ margin: '2px 0', fontSize: '0.82rem', lineHeight: 1.45 }}>
        {renderInlineBold(line)}
      </div>
    );
  });

  return rendered;
};

const renderInlineBold = (text: string): ReactNode => {
  if (typeof text !== 'string') return text;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
  );
};

const headerBtnStyle: CSSProperties = {
  width: '26px',
  height: '26px',
  borderRadius: '8px',
  border: 'none',
  background: 'rgba(255,255,255,0.15)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s ease',
};

export default AiCopilotPanel;
