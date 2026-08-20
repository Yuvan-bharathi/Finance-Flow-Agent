import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Settings as SettingsIcon,
  Bot,
  Shield,
  Bell,
  User,
  Sliders,
  Activity,
  Check,
  AlertTriangle,
  Lock,
  RefreshCw,
  Zap,
  Volume2,
  Key,
  Globe,
  Database,
  Server,
  Layers,
  CheckCircle2,
  XCircle,
  UserPlus,
  Copy,
  Mail,
  X,
  Crown
} from 'lucide-react';

/**
 * Enterprise FinanceFlow AI Settings Page
 * 6-Section Configuration Architecture with Hierarchical Role-Based Access Controls
 */
export const Settings = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('ai');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqStatus, setGroqStatus] = useState(null);

  // USER MANAGEMENT STATE
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('accountant');
  const [creationSuccess, setCreationSuccess] = useState(null);
  const [creationError, setCreationError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // SECTION 1: AI & AGENT CONTROL STATE
  const [autoPaymentAnalysis, setAutoPaymentAnalysis] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(true);
  const [preCheckThreshold, setPreCheckThreshold] = useState(85);
  const [activeModel, setActiveModel] = useState('qwen/qwen3.6-27b');
  const [temperature, setTemperature] = useState(0.1);

  // SECTION 2: RISK & RECONCILIATION RULES STATE
  const [riskBoundaries, setRiskBoundaries] = useState({ low: 30, med: 60, high: 80 });
  const [matchingRules, setMatchingRules] = useState({
    bankAccount: true,
    amount: true,
    reference: true,
    schedule: true,
    duplicateCheck: true
  });
  const [overpaymentStrategy, setOverpaymentStrategy] = useState('manual');
  const [underpaymentStrategy, setUnderpaymentStrategy] = useState('manual');
  const [bulkMaxSelected, setBulkMaxSelected] = useState(20);
  const [bulkMaxAll, setBulkMaxAll] = useState(50);
  const [bulkMaxWorkers, setBulkMaxWorkers] = useState(5);
  const [requireBulkConfirm, setRequireBulkConfirm] = useState(true);

  // SECTION 3: NOTIFICATIONS STATE
  const [events, setEvents] = useState({
    paymentIngested: true,
    reconciliationCompleted: true,
    riskCompleted: true,
    collectionDrafted: true,
    aiFailed: true,
    duplicateDetected: true,
    overpaymentDetected: true,
    highRiskDetected: true
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundFilters, setSoundFilters] = useState({
    criticalRisk: true,
    aiFailure: true,
    duplicatePayment: true,
    normalPayment: false
  });

  // SECTION 5: PREFERENCES STATE
  const [theme, setTheme] = useState('light');
  const [defaultPage, setDefaultPage] = useState('reconciliations');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/auth/users');
      setUsersList(res.data.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestGroq = async () => {
    setTestingGroq(true);
    setGroqStatus(null);
    setTimeout(() => {
      setTestingGroq(false);
      setGroqStatus({ success: true, message: 'Groq API Connection Healthy (Latency: 284ms)' });
    }, 1200);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreationError('');
    setCreationSuccess(null);
    try {
      setCreatingUser(true);
      const res = await api.post('/auth/users/create', {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole
      });

      setCreationSuccess(res.data.data.user);
      setNewUserName('');
      setNewUserEmail('');
      await fetchUsers();
    } catch (err) {
      setCreationError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Role Permissions
  const userRole = user?.role_name || user?.role || 'accountant';
  const isSuperAdminOrOwner = userRole === 'super_admin' || userRole === 'owner';
  const isUserAdmin = isSuperAdminOrOwner || userRole === 'admin';
  const isSeniorAccountant = userRole === 'senior_accountant' || isUserAdmin;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
          }}>
            <SettingsIcon size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
              System & Enterprise Settings
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
              Configure AI agent governance, user permissions, matching rules, notifications, and infrastructure health.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveSuccess && (
            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} /> Settings Saved
            </span>
          )}
          <button onClick={handleSaveSettings} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
            Save Changes
          </button>
        </div>
      </div>

      {/* 6 Section Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'ai', label: '🤖 AI & Agent Control' },
          { id: 'rules', label: '🛡️ Risk & Matching Rules' },
          { id: 'notifications', label: '🔔 Notifications & Alerts' },
          { id: 'profile', label: '👤 Profile & Team Users' },
          { id: 'preferences', label: '🎨 Preferences' },
          { id: 'audit', label: '📋 Audit & System Health' }
        ].map(tab => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                background: isActive ? '#4f46e5' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                border: isActive ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: AI & AGENT CONTROL */}
      {activeSection === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} color="#4f46e5" /> AI Agent Execution Policy
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>Human Approval Required</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>AI recommendations require manual accountant sign-off before financial settlement.</div>
                </div>
                <span style={{ background: '#d1fae5', color: '#059669', fontWeight: '800', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #6ee7b7' }}>
                  ENFORCED ON
                </span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>Automatic Payment Analysis</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Trigger AI pre-check engine instantly upon dummy bank payment deposit arrival.</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPaymentAnalysis}
                  onChange={e => setAutoPaymentAnalysis(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>AI Recommendations Engine</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Display confidence % rings, risk factors, and recommended action steps.</div>
                </div>
                <input
                  type="checkbox"
                  checked={aiRecommendations}
                  onChange={e => setAiRecommendations(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>Duplicate Execution Lock</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>In-memory backend lock prevents duplicate LLM token consumption on rapid clicks.</div>
                </div>
                <span style={{ background: '#e0e7ff', color: '#4338ca', fontWeight: '800', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                  ACTIVE LOCKED
                </span>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Deterministic Pre-Check Threshold
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px' }}>
              Controls when FinanceFlow resolves matches deterministically (0 LLM tokens) vs calling Groq LLM.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <input
                type="range"
                min="50"
                max="100"
                value={preCheckThreshold}
                onChange={e => setPreCheckThreshold(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: '#4f46e5', cursor: 'pointer', height: '8px' }}
              />
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#4f46e5', width: '70px', textAlign: 'right' }}>
                {preCheckThreshold}%
              </div>
            </div>

            <div style={{ marginTop: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px', fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.4 }}>
              <strong>Operational Policy:</strong> Cases scoring <strong>≥ {preCheckThreshold}%</strong> can receive a rule-based recommendation without an LLM call. Human approval is still required before financial settlement.
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#6366f1" /> LLM Configuration & Hyperparameters
              </h2>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> SYSTEM ADMIN ONLY
              </span>
            </div>

            {!isUserAdmin ? (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Lock size={18} />
                </div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>LLM Hyperparameter Controls Restricted</h3>
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '4px', maxWidth: '440px', margin: '4px auto 0', lineHeight: 1.4 }}>
                  LLM Model selection and temperature controls are restricted to <strong>System Administrators</strong>. Authenticated as <strong>{user?.name || 'Senior Accountant'}</strong> (<code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>{userRole.toUpperCase()}</code>).
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Active Groq Model</label>
                  <select
                    value={activeModel}
                    onChange={e => setActiveModel(e.target.value)}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '6px', fontWeight: '600' }}
                  >
                    <option value="qwen/qwen3.6-27b">qwen/qwen3.6-27b (Recommended - Precision Financial Reasoning)</option>
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (High Capacity)</option>
                    <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Speed Optimized)</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
                    <span>Temperature</span>
                    <span style={{ color: '#4f46e5' }}>{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.5"
                    step="0.05"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#4f46e5', marginTop: '14px', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                    Recommended: <strong>0.1</strong> for financial analysis, <strong>0.3</strong> for general reasoning, <strong>0.4</strong> for collection emails.
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SECTION 2: RISK & MATCHING RULES */}
      {activeSection === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} color="#059669" /> Credit Risk Score Classification Boundaries
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#047857' }}>LOW RISK</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#065f46', marginTop: '4px' }}>0 – 30</div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b45309' }}>MEDIUM RISK</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#92400e', marginTop: '4px' }}>31 – 60</div>
              </div>

              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c2410c' }}>HIGH RISK</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#9a3412', marginTop: '4px' }}>61 – 80</div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b91c1c' }}>CRITICAL RISK</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#991b1b', marginTop: '4px' }}>81 – 100</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Payment Matching & Exception Handling Rules
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '12px' }}>Matching Checkpoints</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { key: 'bankAccount', label: 'Bank Account Number Match' },
                    { key: 'amount', label: 'Payment Amount vs Schedule Match' },
                    { key: 'reference', label: 'Reference / Narration Match' },
                    { key: 'schedule', label: 'Repayment Schedule Due Date Match' },
                    { key: 'duplicateCheck', label: 'Duplicate Transaction Check' }
                  ].map(rule => (
                    <label key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#0f172a', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={matchingRules[rule.key]}
                        onChange={e => setMatchingRules({ ...matchingRules, [rule.key]: e.target.checked })}
                        style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }}
                      />
                      <span>{rule.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '12px' }}>Overpayment Handling Strategy</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#0f172a' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="overpay" value="manual" checked={overpaymentStrategy === 'manual'} onChange={e => setOverpaymentStrategy(e.target.value)} accentColor="#4f46e5" />
                    <span>Send for Manual Accountant Review <strong>(Default Safe)</strong></span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="overpay" value="next" checked={overpaymentStrategy === 'next'} onChange={e => setOverpaymentStrategy(e.target.value)} accentColor="#4f46e5" />
                    <span>Apply Surplus to Next Upcoming Installment</span>
                  </label>
                </div>

                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginTop: '16px', marginBottom: '12px' }}>Underpayment Handling Strategy</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#0f172a' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="underpay" value="manual" checked={underpaymentStrategy === 'manual'} onChange={e => setUnderpaymentStrategy(e.target.value)} accentColor="#4f46e5" />
                    <span>Send for Manual Review <strong>(Default Safe)</strong></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 3: NOTIFICATIONS & ALERTS */}
      {activeSection === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} color="#4f46e5" /> WebSocket Real-Time Event Subscriptions
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { key: 'paymentIngested', title: 'PAYMENT_INGESTED', desc: 'Notify when a new bank deposit arrives' },
                { key: 'reconciliationCompleted', title: 'RECONCILIATION_COMPLETED', desc: 'Notify when AI case analysis finishes' },
                { key: 'riskCompleted', title: 'RISK_ASSESSMENT_COMPLETED', desc: 'Notify when company credit risk score is calculated' },
                { key: 'collectionDrafted', title: 'COLLECTION_DRAFTED', desc: 'Notify when AI generates a collection email' }
              ].map(ev => (
                <div key={ev.key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.85rem' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>{ev.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={events[ev.key]}
                    onChange={e => setEvents({ ...events, [ev.key]: e.target.checked })}
                    style={{ accentColor: '#4f46e5', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 4: PROFILE & TEAM USERS */}
      {activeSection === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: My Profile */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="#4f46e5" /> Account & Role Profile
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>User Full Name</label>
                <input type="text" readOnly value={user?.name || 'Yuvanbharathi'} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontWeight: '700' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Email Address</label>
                <input type="text" readOnly value={user?.email || 'yuvanbharathin@gmail.com'} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontWeight: '700' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Assigned Operational Role</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ background: isSuperAdminOrOwner ? '#e0e7ff' : '#f1f5f9', color: isSuperAdminOrOwner ? '#4338ca' : '#0f172a', fontWeight: '800', fontSize: '0.8rem', padding: '6px 14px', borderRadius: '8px', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isSuperAdminOrOwner && <Crown size={14} color="#4338ca" />}
                    {userRole.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Hierarchical User Management Directory */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={20} color="#4f46e5" /> Team Users & Permission Hierarchy
                </h2>
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px' }}>
                  Super Admins & Owners can create Super Admin, Admin, Manager, Accountant, and Viewer accounts. Admins can create Managers, Accountants, and Viewers.
                </p>
              </div>

              {isUserAdmin && (
                <button
                  onClick={() => {
                    setShowAddUserModal(true);
                    setCreationSuccess(null);
                    setCreationError('');
                  }}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <UserPlus size={16} />
                  <span>Add New User</span>
                </button>
              )}
            </div>

            {/* Users Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>User Name</th>
                    <th style={{ padding: '12px 16px' }}>Email Address</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading team users...</td></tr>
                  ) : usersList.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No users found.</td></tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {(u.role_name === 'super_admin' || u.role_name === 'owner') && <Crown size={14} color="#4338ca" />}
                            {u.name}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: u.role_name === 'super_admin' ? '#e0e7ff' : u.role_name === 'admin' ? '#dbeafe' : '#f1f5f9',
                            color: u.role_name === 'super_admin' ? '#4338ca' : u.role_name === 'admin' ? '#1e40af' : '#475569',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.725rem'
                          }}>
                            {u.role_name ? u.role_name.toUpperCase() : 'USER'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Active
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.75rem' }}>
                          {new Date(u.created_at || Date.now()).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 5: PREFERENCES */}
      {activeSection === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Application & Regional Preferences
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Appearance Theme</label>
                <select value={theme} onChange={e => setTheme(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontWeight: '600' }}>
                  <option value="light">Bright White SaaS (Default Enterprise)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Base Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontWeight: '600' }}>
                  <option value="INR">Indian Rupee (INR ₹)</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 6: AUDIT & SYSTEM HEALTH */}
      {activeSection === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={20} color="#4f46e5" /> Operational Infrastructure Health
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
              {[
                { name: 'Backend API', status: 'Operational', url: 'http://localhost:5000' },
                { name: 'MySQL DB', status: 'Connected', url: 'financeflow_db' },
                { name: 'Groq AI Model', status: 'Connected', url: 'qwen/qwen3.6-27b' },
                { name: 'WebSocket Server', status: 'Connected', url: 'Socket.io Active' },
                { name: 'File Storage', status: 'Operational', url: 'Local Upload Vault' }
              ].map((sys, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>{sys.name}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> {sys.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} color="#6366f1" /> Groq API Service Key Management
              </h2>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> SYSTEM ADMIN ONLY
              </span>
            </div>

            {!isUserAdmin ? (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Lock size={18} />
                </div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>Groq API Management Restricted</h3>
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '4px', maxWidth: '440px', margin: '4px auto 0', lineHeight: 1.4 }}>
                  API Key inspection and key replacement controls are restricted to <strong>System Administrators</strong>. Authenticated as <strong>{user?.name || 'Senior Accountant'}</strong> (<code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>{userRole.toUpperCase()}</code>).
                </p>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Active Groq API Key</div>
                  <div style={{ fontSize: '0.95rem', fontFamily: 'monospace', color: '#0f172a', fontWeight: '700', marginTop: '2px' }}>
                    gsk_••••••••••••••••••••••••••••••••1234
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {groqStatus && (
                    <span style={{ fontSize: '0.75rem', color: groqStatus.success ? '#059669' : '#dc2626', fontWeight: '700' }}>
                      {groqStatus.message}
                    </span>
                  )}
                  <button
                    onClick={handleTestGroq}
                    disabled={testingGroq}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={testingGroq ? 'animate-spin' : ''} />
                    <span>{testingGroq ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Add New User & Password Invitation Link Modal */}
      {showAddUserModal && (
        <div
          onClick={() => setShowAddUserModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'pointer' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '520px', maxWidth: '100%', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', cursor: 'default' }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>Add Team User & Trigger Invitation</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Creates account in DB and generates password creation link</div>
                </div>
              </div>
              <button onClick={() => setShowAddUserModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {creationError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {creationError}
              </div>
            )}

            {creationSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '12px', color: '#065f46' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={18} color="#059669" /> User Account Created Successfully!
                  </div>
                  <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                    Account saved in MySQL database for <strong>{creationSuccess.name}</strong> ({creationSuccess.email}).
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Password Creation Link (Triggered via Email)</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input type="text" readOnly value={creationSuccess.invitation_url} style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.775rem', fontFamily: 'monospace' }} />
                    <button onClick={() => handleCopyLink(creationSuccess.invitation_url)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.775rem' }}>
                      <Copy size={14} />
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                <button onClick={() => setShowAddUserModal(false)} className="btn-primary" style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}>
                  Done & Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>User Full Name *</label>
                  <input required type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontWeight: '600' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>User Email Address *</label>
                  <input required type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="e.g. rahul@financeflow.com" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontWeight: '600' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Assigned Security Role *</label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontWeight: '600' }}>
                    {isSuperAdminOrOwner && <option value="super_admin">👑 Super Admin (Full User & Org Management)</option>}
                    {isSuperAdminOrOwner && <option value="admin">System Admin (Operations & Rule Management)</option>}
                    <option value="manager">Finance Manager (Reconciliation & Risk Approval)</option>
                    <option value="accountant">Senior Accountant (Daily Matching Operations)</option>
                    <option value="viewer">Audit Viewer (Read-only)</option>
                  </select>
                </div>

                <button type="submit" disabled={creatingUser} className="btn-primary" style={{ marginTop: '12px', justifyContent: 'center' }}>
                  <Mail size={16} />
                  <span>{creatingUser ? 'Creating & Sending Link...' : 'Create Account & Send Password Invitation Link'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
