import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Brain,
  IndianRupee,
  Shield,
  Phone,
  FileText,
  PieChart,
  Bell,
  BookOpen,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface StageConfig {
  id: string;
  agentLabel: string;
  agentLabelColor: string;
  subLabel: string;
  subLabelColor: string;
  icon: React.ElementType;
  iconColor: string;
  orbBg: string;
  orbBorder: string;
  orbGlow: string;
  pedestalTop: string;
  pedestalStem: string;
  pedestalGlow: string;
  isCube?: boolean;
  status: string;
  latency: string;
  description: string;
}

interface AgentPipelineVisualizationProps {
  agents?: Array<Record<string, unknown>>;
  overview?: Record<string, unknown>;
  queueMetrics?: Record<string, unknown>;
  onSelectAgent?: (agentId: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const AgentPipelineVisualization: React.FC<AgentPipelineVisualizationProps> = ({
  overview,
  queueMetrics,
  onSelectAgent,
  onRefresh,
  loading,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const stages: StageConfig[] = [
    {
      id: 'agent_7_security',
      agentLabel: 'Agent 7',
      agentLabelColor: '#6b21a8',
      subLabel: 'Security Scan',
      subLabelColor: '#9333ea',
      icon: ShieldCheck,
      iconColor: '#ffffff',
      orbBg: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
      orbBorder: '#c084fc',
      orbGlow: 'rgba(168, 85, 247, 0.45)',
      pedestalTop: '#e9d5ff',
      pedestalStem: '#c084fc',
      pedestalGlow: 'rgba(168, 85, 247, 0.3)',
      status: 'SUCCESS',
      latency: '45ms',
      description: 'Ingestion security scan, payload validation & integrity pre-check.',
    },
    {
      id: 'agent_1_recon',
      agentLabel: 'Agent 1',
      agentLabelColor: '#1e40af',
      subLabel: 'Reconciliation',
      subLabelColor: '#3b82f6',
      icon: Search,
      iconColor: '#0284c7',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e0f2fe 60%, #bae6fd 100%)',
      orbBorder: '#38bdf8',
      orbGlow: 'rgba(56, 189, 248, 0.45)',
      pedestalTop: '#e0f2fe',
      pedestalStem: '#7dd3fc',
      pedestalGlow: 'rgba(56, 189, 248, 0.3)',
      status: 'SUCCESS',
      latency: '35.3s',
      description: 'Matches incoming bank credits to customer loan accounts via Groq LLM & heuristic rules.',
    },
    {
      id: 'agent_7_anomaly',
      agentLabel: 'Agent 7',
      agentLabelColor: '#581c87',
      subLabel: 'Deep Anomaly',
      subLabelColor: '#7e22ce',
      icon: Brain,
      iconColor: '#9333ea',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f3e8ff 60%, #e9d5ff 100%)',
      orbBorder: '#c084fc',
      orbGlow: 'rgba(192, 132, 252, 0.45)',
      pedestalTop: '#f3e8ff',
      pedestalStem: '#ddd6fe',
      pedestalGlow: 'rgba(192, 132, 252, 0.3)',
      status: 'SUCCESS',
      latency: '3.5s',
      description: 'Deep anomaly scoring (0-100), flagging suspicious credits, split transactions & duplicates.',
    },
    {
      id: 'playbook_engine',
      agentLabel: 'Playbook',
      agentLabelColor: '#1e1b4b',
      subLabel: 'Engine',
      subLabelColor: '#312e81',
      icon: BookOpen,
      iconColor: '#ffffff',
      orbBg: 'linear-gradient(135deg, rgba(129, 140, 248, 0.85) 0%, rgba(79, 70, 229, 0.95) 100%)',
      orbBorder: '#a5b4fc',
      orbGlow: 'rgba(99, 102, 241, 0.5)',
      pedestalTop: '#e0e7ff',
      pedestalStem: '#a5b4fc',
      pedestalGlow: 'rgba(99, 102, 241, 0.35)',
      isCube: true,
      status: 'SUCCESS',
      latency: '12ms',
      description: 'Deterministic SOP matching engine executing compliance workflow playbooks.',
    },
    {
      id: 'settlement_engine',
      agentLabel: 'Settlement',
      agentLabelColor: '#334155',
      subLabel: 'Engine',
      subLabelColor: '#64748b',
      icon: IndianRupee,
      iconColor: '#059669',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #d1fae5 60%, #a7f3d0 100%)',
      orbBorder: '#34d399',
      orbGlow: 'rgba(52, 211, 153, 0.45)',
      pedestalTop: '#d1fae5',
      pedestalStem: '#6ee7b7',
      pedestalGlow: 'rgba(52, 211, 153, 0.3)',
      status: 'SUCCESS',
      latency: '8ms',
      description: '6-tier statutory priority allocation: Taxes -> Legal Fees -> Interest -> Principal.',
    },
    {
      id: 'agent_2_risk',
      agentLabel: 'Agent 2',
      agentLabelColor: '#1e293b',
      subLabel: 'Risk',
      subLabelColor: '#475569',
      icon: Shield,
      iconColor: '#d97706',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #ffedd5 60%, #fed7aa 100%)',
      orbBorder: '#fb923c',
      orbGlow: 'rgba(251, 146, 60, 0.45)',
      pedestalTop: '#ffedd5',
      pedestalStem: '#fdba74',
      pedestalGlow: 'rgba(251, 146, 60, 0.3)',
      status: 'SUCCESS',
      latency: '5.8s',
      description: 'Evaluates borrower default probability, payment velocity and assigns credit risk score.',
    },
    {
      id: 'agent_3_collection',
      agentLabel: 'Agent 3',
      agentLabelColor: '#0f766e',
      subLabel: 'Collection',
      subLabelColor: '#0d9488',
      icon: Phone,
      iconColor: '#0284c7',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #cffaff 60%, #a5f3fc 100%)',
      orbBorder: '#38bdf8',
      orbGlow: 'rgba(56, 189, 248, 0.45)',
      pedestalTop: '#cffaff',
      pedestalStem: '#7dd3fc',
      pedestalGlow: 'rgba(56, 189, 248, 0.3)',
      status: 'SUCCESS',
      latency: '1.8s',
      description: 'Drafts debt collection notices and borrower payment reminders automatically.',
    },
    {
      id: 'agent_4_document',
      agentLabel: 'Agent 4',
      agentLabelColor: '#1e3a8a',
      subLabel: 'Document / ERP',
      subLabelColor: '#2563eb',
      icon: FileText,
      iconColor: '#1d4ed8',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #dbeafe 60%, #bfdbfe 100%)',
      orbBorder: '#60a5fa',
      orbGlow: 'rgba(96, 165, 250, 0.45)',
      pedestalTop: '#dbeafe',
      pedestalStem: '#93c5fd',
      pedestalGlow: 'rgba(96, 165, 250, 0.3)',
      status: 'SUCCESS',
      latency: '4.3s',
      description: 'Generates Tally Prime ERP XML journals, official invoices & extracts contract key terms.',
    },
    {
      id: 'agent_5_analytics',
      agentLabel: 'Agent 5',
      agentLabelColor: '#3b0764',
      subLabel: 'Analytics',
      subLabelColor: '#6b21a8',
      icon: PieChart,
      iconColor: '#7e22ce',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f3e8ff 60%, #e9d5ff 100%)',
      orbBorder: '#c084fc',
      orbGlow: 'rgba(192, 132, 252, 0.45)',
      pedestalTop: '#f3e8ff',
      pedestalStem: '#ddd6fe',
      pedestalGlow: 'rgba(192, 132, 252, 0.3)',
      status: 'SUCCESS',
      latency: '120ms',
      description: 'Calculates portfolio health snapshots, recovery rates and aging delinquency metrics.',
    },
    {
      id: 'agent_6_notification',
      agentLabel: 'Agent 6',
      agentLabelColor: '#14532d',
      subLabel: 'Notification',
      subLabelColor: '#16a34a',
      icon: Bell,
      iconColor: '#16a34a',
      orbBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #dcfce7 60%, #bbf7d0 100%)',
      orbBorder: '#4ade80',
      orbGlow: 'rgba(74, 222, 128, 0.45)',
      pedestalTop: '#dcfce7',
      pedestalStem: '#86efac',
      pedestalGlow: 'rgba(74, 222, 128, 0.3)',
      status: 'SUCCESS',
      latency: '920ms',
      description: 'Executive SLA breach escalations & multi-channel email alerts dispatching.',
    },
  ];

  const overallSuccessRate = String(overview?.ai_accuracy_rate || '95%');

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '20px',
      padding: '32px 28px 24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
      position: 'relative',
      overflow: 'visible',
    }}>
      {/* Dynamic Keyframes Animation Styles */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes dashMove {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes floatCube {
          0%, 100% { transform: translateY(0px) rotateX(20deg) rotateY(-20deg); }
          50% { transform: translateY(-6px) rotateX(20deg) rotateY(-20deg); }
        }
      `}</style>

      {/* Top Card Header with Title & Telemetry Stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
            Autonomous AI Agentic Pipeline
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.35 }}>
            Seven specialized AI agents working together to reconcile, analyze and act on every payment intelligently.
          </p>
        </div>

        {/* Right Telemetry Stats & Refresh Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Total Tokens Consumed
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#4f46e5' }}>
              {Number(overview?.total_tokens_consumed || 325451).toLocaleString()}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>tokens</span>
            </div>
          </div>

          <div style={{ height: '28px', width: '1px', background: '#e2e8f0' }} />

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Worker Queue
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#059669' }}>
              {Number(queueMetrics?.activeJobsCount || 0)}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>
                active / {Number(queueMetrics?.queuedJobsCount || 0)} queued
              </span>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Main Container Layout */}
      <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'nowrap' }}>
        
        {/* Left Column: Compact Pipeline Health Card */}
        <div style={{
          width: '210px',
          minWidth: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* Pipeline Health Compact Box */}
          <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Pipeline Health
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', color: '#15803d' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                Healthy
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Last Run
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>
                  2 min ago
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
                  <span>Success</span>
                  <TrendingUp size={11} color="#16a34a" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#059669', marginTop: '1px' }}>
                  {overallSuccessRate}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Isometric Pipeline Stage Canvas */}
        <div style={{
          flex: 1,
          overflowX: 'auto',
          padding: '10px 0 6px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          
          {/* 3D Isometric Nodes Canvas Wrapper */}
          <div style={{
            position: 'relative',
            width: '100%',
            minWidth: '860px',
            height: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}>

            {/* Continuous 3D Isometric Glowing Pipeline Tube Path (SVG Background) */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
              <defs>
                <linearGradient id="pipe3D" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                  <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.85" />
                  <stop offset="40%" stopColor="#818cf8" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#34d399" stopOpacity="0.85" />
                  <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="0.85" />
                </linearGradient>
                <filter id="pipeGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Back 3D Pipe Ribbon Track */}
              <path
                d="M 50 145 L 140 145 L 225 145 L 315 115 L 400 145 L 485 145 L 570 145 L 655 145 L 740 145 L 825 145"
                fill="none"
                stroke="url(#pipe3D)"
                strokeWidth="14"
                strokeLinecap="round"
                filter="url(#pipeGlow)"
                opacity="0.35"
              />

              {/* Inner Glowing Core Track */}
              <path
                d="M 50 145 L 140 145 L 225 145 L 315 115 L 400 145 L 485 145 L 570 145 L 655 145 L 740 145 L 825 145"
                fill="none"
                stroke="url(#pipe3D)"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Animated Directional Sparks / Flow Particles */}
              <path
                d="M 50 145 L 140 145 L 225 145 L 315 115 L 400 145 L 485 145 L 570 145 L 655 145 L 740 145 L 825 145"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeDasharray="8 16"
                style={{ animation: 'dashMove 1.2s linear infinite' }}
              />
            </svg>

            {/* 10 Isometric Pedestals & Floating Orbs */}
            {stages.map((stg, i) => {
              const IconComp = stg.icon;
              const isHovered = hoveredIndex === i;
              const isCube = stg.isCube;

              return (
                <div
                  key={stg.id}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onSelectAgent && onSelectAgent(stg.id)}
                  style={{
                    position: 'relative',
                    zIndex: isHovered ? 20 : 5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    width: '80px',
                    transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                    transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    marginTop: isCube ? '-28px' : '0px',
                  }}
                >
                  {/* Top Floating Text Labels */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '10px',
                    height: '38px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: stg.agentLabelColor, lineHeight: 1.1 }}>
                      {stg.agentLabel}
                    </div>
                    <div style={{ fontSize: '0.66rem', fontWeight: '700', color: stg.subLabelColor, whiteSpace: 'nowrap', lineHeight: 1.1 }}>
                      {stg.subLabel}
                    </div>
                  </div>

                  {/* 3D Special Render: PLAYBOOK ENGINE GLASS CUBE vs REGULAR 3D ORB */}
                  {isCube ? (
                    <div style={{
                      position: 'relative',
                      width: '64px',
                      height: '64px',
                      margin: '0 auto',
                      perspective: '400px',
                    }}>
                      {/* 3D Translucent Glass Cube */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        margin: '0 auto',
                        background: 'linear-gradient(135deg, rgba(165, 180, 252, 0.75) 0%, rgba(79, 70, 229, 0.85) 100%)',
                        border: '1.5px solid rgba(255, 255, 255, 0.8)',
                        borderRadius: '14px',
                        boxShadow: `0 12px 28px rgba(79, 70, 229, 0.5), inset 0 0 15px rgba(255,255,255,0.6)`,
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'floatCube 3s ease-in-out infinite',
                        position: 'relative',
                        zIndex: 10,
                      }}>
                        <BookOpen size={24} color="#ffffff" />
                        
                        {/* Inner 3D Glass Layer lines */}
                        <div style={{
                          position: 'absolute',
                          inset: '4px',
                          border: '1px solid rgba(255,255,255,0.4)',
                          borderRadius: '10px',
                          pointerEvents: 'none',
                        }} />
                      </div>

                      {/* Vertical Beam connecting cube down to track */}
                      <div style={{
                        position: 'absolute',
                        top: '56px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '2px',
                        height: '48px',
                        background: 'linear-gradient(180deg, #818cf8 0%, rgba(129, 140, 248, 0) 100%)',
                        boxShadow: '0 0 8px #818cf8',
                      }} />
                    </div>
                  ) : (
                    /* Regular 3D Glassmorphism Spherical Orb */
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: stg.orbBg,
                        border: `2px solid ${stg.orbBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isHovered
                          ? `0 10px 25px ${stg.orbGlow}, 0 0 20px ${stg.orbBorder}`
                          : `0 6px 16px ${stg.orbGlow}`,
                        position: 'relative',
                        zIndex: 4,
                        transition: 'all 0.2s ease',
                      }}>
                        <IconComp size={20} color={stg.iconColor} />
                      </div>
                    </div>
                  )}

                  {/* 3D Hexagonal Glass Pedestal Base Platform */}
                  <div style={{
                    position: 'relative',
                    width: '62px',
                    height: '24px',
                    marginTop: isCube ? '32px' : '-8px',
                    zIndex: 3,
                  }}>
                    {/* Top Oval Glass Plate */}
                    <div style={{
                      width: '62px',
                      height: '20px',
                      borderRadius: '50%',
                      background: `linear-gradient(180deg, ${stg.pedestalTop} 0%, rgba(255,255,255,0.7) 100%)`,
                      border: `1.5px solid ${stg.orbBorder}`,
                      boxShadow: `0 6px 14px ${stg.pedestalGlow}`,
                      transform: 'perspective(150px) rotateX(50deg)',
                    }} />

                    {/* Pedestal Bottom Base Cylinder Stem */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '24px',
                      height: '14px',
                      borderRadius: '0 0 10px 10px',
                      background: `linear-gradient(180deg, ${stg.pedestalStem} 0%, rgba(255,255,255,0.2) 100%)`,
                      border: `1px solid ${stg.orbBorder}`,
                      borderTop: 'none',
                    }} />
                  </div>

                  {/* Floor Reflection Light Dot */}
                  <div style={{
                    width: '32px',
                    height: '6px',
                    borderRadius: '50%',
                    background: stg.orbGlow,
                    filter: 'blur(3px)',
                    marginTop: '8px',
                  }} />

                  {/* Micro Tooltip on Hover */}
                  {isHovered && (() => {
                    const isFirst = i === 0;
                    const isLast = i === stages.length - 1;
                    let tooltipLeft: string | number = '50%';
                    let tooltipRight: string | number = 'auto';
                    let tooltipTransform = 'translateX(-50%)';
                    let arrowLeft: string | number = '50%';
                    let arrowRight: string | number = 'auto';
                    let arrowTransform = 'translateX(-50%) rotate(45deg)';

                    if (isFirst) {
                      tooltipLeft = '0px';
                      tooltipRight = 'auto';
                      tooltipTransform = 'none';
                      arrowLeft = '35px';
                      arrowRight = 'auto';
                      arrowTransform = 'rotate(45deg)';
                    } else if (isLast) {
                      tooltipLeft = 'auto';
                      tooltipRight = '0px';
                      tooltipTransform = 'none';
                      arrowLeft = 'auto';
                      arrowRight = '35px';
                      arrowTransform = 'rotate(45deg)';
                    }

                    return (
                      <div style={{
                        position: 'absolute',
                        top: isCube ? '135px' : '105px',
                        left: tooltipLeft,
                        right: tooltipRight,
                        transform: tooltipTransform,
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '0.725rem',
                        width: '185px',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                        zIndex: 100,
                        pointerEvents: 'none',
                        textAlign: 'left',
                        lineHeight: 1.35,
                      }}>
                        <div style={{ fontWeight: '800', color: '#a7f3d0', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{stg.agentLabel}: {stg.subLabel}</span>
                          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: '4px', color: '#ffffff' }}>{stg.latency}</span>
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '0.68rem', marginTop: '4px' }}>{stg.description}</div>
                        
                        {/* Tooltip Arrow pointing UP to pedestal */}
                        <div style={{
                          position: 'absolute',
                          top: '-5px',
                          left: arrowLeft,
                          right: arrowRight,
                          transform: arrowTransform,
                          width: '10px',
                          height: '10px',
                          background: '#0f172a',
                        }} />
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Bottom Center Real-time Flow Pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', zIndex: 10 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '5px 16px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: '700',
              color: '#334155',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block', boxShadow: '0 0 0 2px rgba(22,163,74,0.25)' }} />
              <span>Pipeline Flow: Real-time</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
