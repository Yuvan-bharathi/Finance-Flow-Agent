import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendMessage, confirmProposal, dismissProposal } from '../services/assistantService';
import {
  Bot, X, Minus, Send, Loader2, Database, Brain,
  Lightbulb, ExternalLink, ChevronDown, ChevronUp,
  Zap, Building2, FileText, Activity, BarChart3, AlertCircle,
  CheckCircle2, XCircle, ShieldCheck, Clock, Flag, MessageSquare, RotateCcw, BellRing
} from 'lucide-react';

/**
 * Component: AiCopilotPanel
 *
 * Purpose:
 *   The FinanceFlow AI Financial Operations Copilot — a right-side slide-in panel
 *   that provides context-aware, role-aware AI assistance backed by real MySQL data.
 *   Supports Phase 3 Human-in-the-Loop Action Confirmation Protocols.
 */
const AiCopilotPanel = ({ isOpen, onClose, contextPayload = {} }) => {
  const { user } = useAuth();

  // ─── Conversation State ──────────────────────────────────────────────────
  const [messages, setMessages]           = useState([]);
  const [inputValue, setInputValue]       = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [isMinimized, setIsMinimized]     = useState(false);
  const [expandedSources, setExpandedSources] = useState({});
  const [proposalStatuses, setProposalStatuses] = useState({}); // { [proposalId]: { status, result, error } }

  // ─── Horizontal Drag-to-Resize State ─────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('ff_copilot_width');
    return saved ? Math.min(Math.max(parseInt(saved, 10), 380), 900) : 460;
  });
  const [isResizing, setIsResizing] = useState(false);

  const isSendingRef    = useRef(false);
  const messagesEndRef  = useRef(null);
  const inputRef        = useRef(null);

  // ─── Resize Handlers ─────────────────────────────────────────────────────
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
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

  // ─── Auto-scroll on new message ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // ─── Focus input when panel opens ───────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // ─── Welcome message when panel first opens ─────────────────────────────
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getGreetingMessage(user, contextPayload);
      setMessages([{
        role:      'assistant',
        content:   greeting,
        sources:   [],
        suggestedActions: getInitialSuggestedActions(contextPayload),
        timestamp: new Date()
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─── Send Message ────────────────────────────────────────────────────────
  const handleSend = useCallback(async (messageText = inputValue) => {
    const text = (typeof messageText === 'string' ? messageText : inputValue).trim();
    if (!text || isSendingRef.current || isLoading) return;

    isSendingRef.current = true;
    setIsLoading(true);
    setInputValue('');

    // Append user message immediately for instant feedback
    const userMsg = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Build history for backend — send last 6 messages
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await sendMessage(text, history, contextPayload);
      const { answer, sources = [], suggestedActions = [] } = res.data?.data || {};

      setMessages(prev => [...prev, {
        role:             'assistant',
        content:          answer || 'I was unable to generate a response.',
        sources,
        suggestedActions,
        timestamp:        new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   `I encountered an error. Please try again.\n\n_${err.message}_`,
        sources:   [],
        suggestedActions: [],
        timestamp: new Date()
      }]);
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, contextPayload]);

  // ─── Keyboard: Enter to send ─────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Toggle source citations for a message ───────────────────────────────
  const toggleSources = (msgIndex) => {
    setExpandedSources(prev => ({ ...prev, [msgIndex]: !prev[msgIndex] }));
  };

  // ─── Phase 3 Action Proposal Handlers ────────────────────────────────────
  const handleConfirmProposal = async (proposalId) => {
    try {
      setProposalStatuses(prev => ({ ...prev, [proposalId]: { status: 'loading' } }));
      const res = await confirmProposal(proposalId);
      const data = res.data?.data || {};
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: {
          status: 'executed',
          result: data.result_summary || 'Action executed successfully and recorded in audit log.',
          executedAt: data.executed_at || new Date().toISOString()
        }
      }));
    } catch (err) {
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: {
          status: 'failed',
          error: err.response?.data?.message || 'Failed to execute action proposal.'
        }
      }));
    }
  };

  const handleDismissProposal = async (proposalId) => {
    try {
      setProposalStatuses(prev => ({ ...prev, [proposalId]: { status: 'loading' } }));
      await dismissProposal(proposalId);
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: { status: 'dismissed', result: 'Action proposal was dismissed.' }
      }));
    } catch {
      setProposalStatuses(prev => ({
        ...prev,
        [proposalId]: { status: 'dismissed', result: 'Action proposal was dismissed.' }
      }));
    }
  };

  if (!isOpen) return null;

  const contextLabel = getContextLabel(contextPayload);

  return (
    <>
      {/* Panel Overlay (only active when panel is open and NOT minimized) */}
      {!isMinimized && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.15)',
            zIndex: 900,
            backdropFilter: 'blur(1px)'
          }}
        />
      )}

      {/* Main Panel */}
      <div style={{
        position:       'fixed',
        top:            0,
        right:          0,
        width:          isMinimized ? '420px' : `${panelWidth}px`,
        maxWidth:       '92vw',
        height:         '100vh',
        zIndex:         901,
        display:        'flex',
        flexDirection:  'column',
        background:     '#f8fafc',
        borderLeft:     '1px solid #e2e8f0',
        boxShadow:      isMinimized ? '-4px -4px 20px rgba(15,23,42,0.15)' : '-8px 0 32px rgba(15,23,42,0.12)',
        transform:      isMinimized ? 'translateY(calc(100% - 56px))' : 'translateY(0)',
        transition:     isResizing ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>

        {/* ── Left Drag-to-Resize Grip Handle ─────────────────────────────── */}
        {!isMinimized && (
          <div
            onMouseDown={startResizing}
            style={{
              position:    'absolute',
              left:        '-4px',
              top:         0,
              bottom:      0,
              width:       '9px',
              cursor:      'ew-resize',
              zIndex:      999,
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'center',
              background:  isResizing ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              transition:  'background 0.15s ease'
            }}
            title="Drag horizontally to resize panel width"
          >
            <div style={{
              width:        isResizing ? '3px' : '2px',
              height:       '40px',
              borderRadius: '3px',
              background:   isResizing ? '#4f46e5' : 'rgba(148, 163, 184, 0.5)',
              transition:   'all 0.15s ease'
            }} />
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          style={{
            background:    'linear-gradient(135deg, #4f46e5, #6366f1)',
            padding:       '14px 16px',
            display:       'flex',
            alignItems:    'center',
            justifyContent: 'space-between',
            flexShrink:    0,
            cursor:        isMinimized ? 'pointer' : 'default',
            borderRadius:  isMinimized ? '12px 12px 0 0' : '0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              overflow: 'hidden'
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

        {/* ── Context Badge ────────────────────────────────────────────────── */}
        {contextLabel && (
          <div style={{
            background:   '#e0e7ff',
            borderBottom: '1px solid #c7d2fe',
            padding:      '6px 16px',
            fontSize:     '0.72rem',
            fontWeight:   '700',
            color:        '#3730a3',
            display:      'flex',
            alignItems:   'center',
            gap:          '6px'
          }}>
            {getContextIcon(contextPayload.recordType)}
            {contextLabel}
            <span style={{ color: '#6366f1', fontWeight: '600' }}>· Ask me anything about this record</span>
          </div>
        )}

        {/* ── Message Thread ───────────────────────────────────────────────── */}
        <div style={{
          flex:        1,
          overflowY:   'auto',
          padding:     '16px 14px',
          display:     'flex',
          flexDirection: 'column',
          gap:         '14px'
        }}>
          {messages.map((msg, idx) => (
            <div key={idx}>

              {/* Message Bubble */}
              <div style={{
                display:       'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems:    'flex-start',
                gap:           '8px'
              }}>
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Bot size={14} color="#fff" />
                  </div>
                )}

                {/* Bubble content */}
                <div style={{
                  maxWidth:     '85%',
                  background:   msg.role === 'user' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#ffffff',
                  color:        msg.role === 'user' ? '#ffffff' : '#0f172a',
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  padding:      '10px 13px',
                  fontSize:     '0.82rem',
                  lineHeight:   1.5,
                  boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
                  border:       msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  whiteSpace:   'pre-wrap',
                  wordBreak:    'break-word'
                }}>
                  {formatMessage(msg.content)}
                </div>
              </div>

              {/* ─── Phase 3: Interactive Action Proposal Cards ─────────────── */}
              {msg.role === 'assistant' && msg.sources?.filter(s => s.type === 'action_proposal').map((prop, pi) => {
                const pId = prop.proposalId;
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
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Top Row: Proposal ID Badge & Action Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>
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
                        color: isExecuted ? '#166534' : isDismissed ? '#64748b' : '#4338ca'
                      }}>
                        {pId}
                      </span>
                    </div>

                    {/* Proposal Details */}
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      {prop.snippet || `Target: Case #${prop.targetId}`}
                    </p>

                    {/* Execution State Banner / Confirmation Buttons */}
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
                        color: '#15803d'
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
                        fontWeight: '600'
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
                        fontWeight: '600'
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
                            transition: 'opacity 0.15s ease'
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
                            cursor: 'pointer'
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standard Source Citations (assistant messages only, excluding action proposals) */}
              {msg.role === 'assistant' && msg.sources?.filter(s => s.type !== 'action_proposal').length > 0 && (
                <div style={{ marginLeft: '36px', marginTop: '6px' }}>
                  <button
                    onClick={() => toggleSources(idx)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.68rem', fontWeight: '700', color: '#6366f1',
                      padding: '2px 0'
                    }}
                  >
                    {expandedSources[idx] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    Sources ({msg.sources.filter(s => s.type !== 'action_proposal').length})
                  </button>

                  {expandedSources[idx] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {msg.sources.filter(s => s.type !== 'action_proposal').map((src, si) => (
                        <div key={si} style={{
                          background:  '#f0f4ff',
                          border:      '1px solid #c7d2fe',
                          borderRadius: '8px',
                          padding:     '6px 10px',
                          display:     'flex',
                          alignItems:  'center',
                          justifyContent: 'space-between',
                          gap:         '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '14px', flexShrink: 0 }}>
                              {getSourceIcon(src.type)}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#3730a3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {src.title}
                              </div>
                              {src.snippet && (
                                <div style={{ fontSize: '0.62rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {src.snippet}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '0.58rem', fontWeight: '700', padding: '1px 5px', borderRadius: '4px',
                              background: getFactTagBg(src.type),
                              color: getFactTagColor(src.type)
                            }}>
                              {getFactTag(src.type)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Suggested Action Buttons */}
              {msg.role === 'assistant' && msg.suggestedActions?.length > 0 && (
                <div style={{
                  marginLeft: '36px', marginTop: '8px',
                  display: 'flex', flexWrap: 'wrap', gap: '6px'
                }}>
                  {msg.suggestedActions.map((action, ai) => (
                    <button
                      key={ai}
                      onClick={() => handleSend(`Tell me more about ${action.label}`)}
                      style={{
                        background:   '#f0f4ff',
                        border:       '1px solid #c7d2fe',
                        borderRadius: '20px',
                        padding:      '4px 10px',
                        fontSize:     '0.7rem',
                        fontWeight:   '700',
                        color:        '#4338ca',
                        cursor:       'pointer',
                        display:      'flex',
                        alignItems:   'center',
                        gap:          '4px',
                        transition:   'all 0.15s ease'
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

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '36px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={14} color="#fff" />
              </div>
              <div style={{
                background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '4px 16px 16px 16px',
                padding: '10px 14px', display: 'flex', gap: '5px', alignItems: 'center'
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#6366f1',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Prompt Chips ───────────────────────────────────────────── */}
        {messages.length <= 1 && !isLoading && (
          <div style={{
            padding:     '0 14px 8px',
            display:     'flex',
            flexWrap:    'wrap',
            gap:         '6px',
            borderTop:   '1px solid #e2e8f0',
            paddingTop:  '8px'
          }}>
            {getQuickPrompts(contextPayload, user?.role).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                style={{
                  background:   '#f8fafc',
                  border:       '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding:      '5px 11px',
                  fontSize:     '0.72rem',
                  color:        '#475569',
                  cursor:       'pointer',
                  fontWeight:   '600',
                  transition:   'all 0.15s ease',
                  whiteSpace:   'nowrap'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Area ───────────────────────────────────────────────────── */}
        <div style={{
          padding:        '12px 14px',
          borderTop:      '1px solid #e2e8f0',
          background:     '#ffffff',
          flexShrink:     0
        }}>
          <div style={{
            display:      'flex',
            alignItems:   'flex-end',
            gap:          '8px',
            background:   '#f8fafc',
            border:       '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding:      '8px 10px 8px 14px',
            transition:   'border-color 0.15s ease'
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
                flex:           1,
                border:         'none',
                background:     'transparent',
                resize:         'none',
                fontSize:       '0.83rem',
                color:          '#0f172a',
                lineHeight:     1.5,
                outline:        'none',
                fontFamily:     'inherit',
                maxHeight:      '80px',
                height:         '24px',
                padding:        '2px 0',
                overflowY:      'auto',
                scrollbarWidth: 'none',
                msOverflowStyle:'none',
                boxSizing:      'border-box'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              style={{
                width:        '32px',
                height:       '32px',
                borderRadius: '10px',
                border:       'none',
                background:   (!inputValue.trim() || isLoading) ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color:        (!inputValue.trim() || isLoading) ? '#94a3b8' : '#ffffff',
                cursor:       (!inputValue.trim() || isLoading) ? 'not-allowed' : 'pointer',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                flexShrink:   0,
                transition:   'all 0.15s ease'
              }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
            FinanceFlow AI uses real-time database data · Financial decisions require human approval
          </div>
        </div>

        {/* Inline pulse animation */}
        <style>{`
          @keyframes pulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </>
  );
};


// =============================================================================
// Helper: Format role display name
// =============================================================================
const formatRole = (role = '') => {
  const map = {
    admin: 'Admin', super_admin: 'Super Admin', owner: 'Owner',
    senior_accountant: 'Senior Accountant', manager: 'Manager',
    accountant: 'Accountant', risk_analyst: 'Risk Analyst'
  };
  return map[role] || role;
};

// =============================================================================
// Helper: Context label from contextPayload
// =============================================================================
const getContextLabel = (ctx) => {
  if (!ctx?.recordType || !ctx?.recordId) return null;
  const labels = {
    payment:              `Payment #${ctx.recordId}`,
    reconciliation_case:  `Case #${ctx.recordId}`,
    company:              `Company #${ctx.recordId}`,
    loan:                 `Loan #${ctx.recordId}`
  };
  return labels[ctx.recordType] || `${ctx.recordType} #${ctx.recordId}`;
};

// =============================================================================
// Helper: Context icon
// =============================================================================
const getContextIcon = (recordType) => {
  const icons = {
    payment:             '💳',
    reconciliation_case: '📋',
    company:             '🏢',
    loan:                '💰'
  };
  return icons[recordType] || '📄';
};

// =============================================================================
// Helper: Source citation icons
// =============================================================================
const getSourceIcon = (type) => {
  const icons = {
    payment:              '💳',
    reconciliation_case:  '📋',
    agent_run:            '🤖',
    execution_log:        '📊',
    company:              '🏢',
    loan:                 '💰',
    repayment_history:    '📅',
    pending_queue:        '⏳',
    portfolio:            '📈',
    overdue_list:         '⚠️',
    token_usage:          '⚡'
  };
  return icons[type] || '📄';
};

// =============================================================================
// Helper: Fact tag styling per source type
// =============================================================================
const isAgentSource = (type) => ['agent_run', 'execution_log', 'token_usage'].includes(type);

const getFactTag     = (type) => isAgentSource(type) ? '🤖 Agent' : '🗄️ DB';
const getFactTagBg   = (type) => isAgentSource(type) ? '#fef3c7' : '#d1fae5';
const getFactTagColor= (type) => isAgentSource(type) ? '#92400e' : '#065f46';

// =============================================================================
// Helper: Greeting message based on role + context
// =============================================================================
const getGreetingMessage = (user, ctx) => {
  const name = user?.name?.split(' ')[0] || 'there';
  const role = user?.role || 'accountant';

  if (ctx?.recordType && ctx?.recordId) {
    return `👋 Hi ${name}! I can see you're looking at **${getContextLabel(ctx)}**.\n\nAsk me anything about this record — I'll retrieve the actual data from FinanceFlow to give you a precise, factual answer.\n\n_All my answers are sourced from your database — I never guess._`;
  }

  const roleGreetings = {
    admin:             `👋 Good day, ${name}. I'm your AI Financial Operations Copilot.\n\nI can help you understand AI agent performance, token usage patterns, portfolio health, and investigate any payment or company in detail.\n\nWhat would you like to explore?`,
    super_admin:       `👋 Good day, ${name}. I'm ready to assist with full platform visibility.\n\nWhat would you like to investigate?`,
    senior_accountant: `👋 Hi ${name}! I can help you investigate reconciliation cases, explain AI decisions, and analyze payment patterns.\n\nWhat needs your attention?`,
    accountant:        `👋 Hi ${name}! I can help you understand your reconciliation cases and explain why AI made specific recommendations.\n\nWhat would you like to know?`,
    risk_analyst:      `👋 Hi ${name}! I can analyze company risk profiles, repayment histories, and portfolio concentration.\n\nWhat would you like to explore?`
  };

  return roleGreetings[role] || `👋 Hi ${name}! I'm your FinanceFlow AI Copilot. What can I help you with?`;
};

// =============================================================================
// Helper: Initial suggested actions per context
// =============================================================================
const getInitialSuggestedActions = (ctx) => {
  if (!ctx?.recordType) return [];
  const actions = {
    payment:              [{ label: 'Investigate this payment',         action: 'prompt' }],
    reconciliation_case:  [{ label: 'Explain the AI recommendation',   action: 'prompt' }],
    company:              [{ label: 'Investigate this borrower',        action: 'prompt' }],
    loan:                 [{ label: 'Analyze this loan facility',       action: 'prompt' }]
  };
  return actions[ctx.recordType] || [];
};

// =============================================================================
// Helper: Quick prompt chips based on page + role
// =============================================================================
const getQuickPrompts = (ctx, role) => {
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
  if (['admin', 'super_admin', 'owner'].includes(role)) {
    return ['Who are our highest-risk borrowers?', 'Which companies owe > ₹1 Lakh?', 'Portfolio health summary', 'Why are tokens increasing?'];
  }
  return ['What should I focus on today?', 'Show overdue payments', 'Which borrowers are high risk?', 'Portfolio health summary'];
};

// =============================================================================
// Helper: Format message (handle rich markdown formatting: headers, lists, tags, tables)
// =============================================================================
const formatMessage = (content = '') => {
  // Strip any leaked <think>...</think>, <tool_call>...</tool_call>, or unclosed <tool_call> blocks
  const cleanContent = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '')
    .replace(/```(?:tool_call|json)?[\s\S]*?```/gi, '')
    .trim();

  const lines = cleanContent.split('\n');
  const rendered = [];
  let tableBuffer = [];

  const flushTable = (keyPrefix) => {
    if (tableBuffer.length === 0) return;
    const headerLine = tableBuffer[0];
    const dataLines = tableBuffer.slice(2); // skip separator line `|---|---|`
    const parseRow = (row) => row.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    const headers = parseRow(headerLine);

    rendered.push(
      <div key={`table-${keyPrefix}`} style={{ margin: '8px 0', overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left', background: '#ffffff' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
              {headers.map((h, hi) => (
                <th key={hi} style={{ padding: '6px 8px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap' }}>
                  {renderInlineBold(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataLines.map((row, ri) => {
              const cells = parseRow(row);
              return (
                <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9', background: ri % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                  {cells.map((c, ci) => (
                    <td key={ci} style={{ padding: '6px 8px', color: '#334155' }}>
                      {renderInlineBold(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Collect markdown table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length > 0) {
      flushTable(i);
    }

    // Headers (### or ##)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      const headerText = trimmed.replace(/^#{2,3}\s+/, '');
      rendered.push(
        <div key={i} style={{
          fontSize:     '0.88rem',
          fontWeight:   '800',
          color:        '#1e1b4b',
          margin:       '10px 0 4px 0',
          display:      'flex',
          alignItems:   'center',
          gap:          '4px'
        }}>
          {renderInlineBold(headerText)}
        </div>
      );
      return;
    }

    // Highlight fact tag lines
    if (trimmed.startsWith('🗄️') || trimmed.startsWith('🤖') || trimmed.startsWith('💡')) {
      const isDbFact     = trimmed.startsWith('🗄️');
      const isAgentFact  = trimmed.startsWith('🤖');
      rendered.push(
        <div key={i} style={{
          background:   isDbFact ? '#f0fdf4' : isAgentFact ? '#fef9c3' : '#f0f4ff',
          borderLeft:   `3px solid ${isDbFact ? '#10b981' : isAgentFact ? '#f59e0b' : '#6366f1'}`,
          padding:      '4px 8px',
          margin:       '3px 0',
          borderRadius: '0 6px 6px 0',
          fontSize:     '0.8rem'
        }}>
          {renderInlineBold(trimmed)}
        </div>
      );
      return;
    }

    // Bullet points (• or - or *)
    if (/^[•\-\*]\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[•\-\*]\s+/, '');
      rendered.push(
        <div key={i} style={{
          display:    'flex',
          alignItems: 'flex-start',
          gap:        '6px',
          margin:     '3px 0',
          fontSize:   '0.82rem',
          lineHeight: 1.45
        }}>
          <span style={{ color: '#6366f1', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>•</span>
          <div style={{ flex: 1 }}>{renderInlineBold(bulletContent)}</div>
        </div>
      );
      return;
    }

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

  if (tableBuffer.length > 0) {
    flushTable('end');
  }

  return rendered;
};

// Render **bold** and `code` inline
const renderInlineBold = (text) => {
  if (typeof text !== 'string') return text;
  // Handle `code` inline
  const codeParts = text.split(/`([^`]+)`/g);
  return codeParts.map((part, ci) => {
    if (ci % 2 === 1) {
      return (
        <code key={`c-${ci}`} style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '1px 4px',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          color: '#4f46e5'
        }}>
          {part}
        </code>
      );
    }
    // Handle **bold** inside
    const boldParts = part.split(/\*\*(.*?)\*\*/g);
    return boldParts.map((bpart, bi) =>
      bi % 2 === 1
        ? <strong key={`b-${ci}-${bi}`}>{bpart}</strong>
        : bpart
    );
  });
};

// =============================================================================
// Shared styles
// =============================================================================
const headerBtnStyle = {
  width: '26px', height: '26px',
  borderRadius: '8px',
  border: 'none',
  background: 'rgba(255,255,255,0.15)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s ease'
};

export default AiCopilotPanel;
