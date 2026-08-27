// ============================================================
// agent.ts — 7-Agent AI Control Center domain types
// ============================================================

export type AgentStatusType = 'active' | 'idle' | 'error' | 'starting' | 'stopped' | 'READY' | 'RUNNING' | 'ERROR' | string;
export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentMetrics {
  total_runs?: number;
  success_rate?: number;
  avg_duration_ms?: number;
  avg_latency_ms?: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  role?: string;
  status: AgentStatusType;
  latency?: string;
  last_run?: string;
  success_rate?: number;
  runs_today?: number;
  total_runs?: number;
  avg_latency_ms?: number;
  is_active?: boolean;
  description?: string;
  metrics?: AgentMetrics;
}

export type Agent = AgentInfo;

export interface AgentRun {
  id: string | number;
  agent_id: string;
  status: 'success' | 'completed' | 'failed' | 'running' | string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  duration_ms?: number;
  trigger_type?: 'manual' | 'automatic' | 'scheduled' | string;
  triggered_by_name?: string;
  confidence_score?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  groq_called?: boolean;
  model?: string;
  pre_check_result?: string;
  result_summary?: string;
  tools_called?: string[];
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  tokens_used?: number;
}

export interface PipelineStage {
  stage: number;
  agent_name: string;
  role: string;
  status: PipelineStageStatus;
  duration_ms?: number;
  output?: Record<string, unknown>;
  error?: string;
}

export interface PipelineExecution {
  id: string | number;
  pipeline_name?: string;
  payment_id?: number;
  case_id?: number;
  trigger?: string;
  trigger_source?: string;
  status: 'running' | 'completed' | 'failed' | 'partial' | string;
  stages?: PipelineStage[];
  started_at?: string;
  created_at?: string;
  completed_at?: string;
  total_duration_ms?: number;
  duration_ms?: number;
  total_tokens?: number;
  triggered_by?: string;
  linked_company_name?: string;
  linked_transaction_id?: string;
  linked_case_id?: number | string;
  executed?: number;
}

export interface PipelineWorkflow {
  workflow?: string;
  case_ids?: number[];
  caseIds?: number[];
  payment_ids?: number[];
  trigger?: string;
  contextData?: Record<string, unknown>;
  priority?: number;
  options?: Record<string, unknown>;
}

export interface QueueMetrics {
  activeJobsCount?: number;
  queuedJobsCount?: number;
  active?: number;
  queued?: number;
  stats?: {
    totalCompleted: number;
    totalFailed?: number;
    totalWaiting?: number;
  };
}

export interface RecentActivity {
  id: string | number;
  agent_id?: string;
  agent_name?: string;
  action?: string;
  result?: string;
  timestamp?: string;
  created_at?: string;
  trigger_source?: string;
  case_id?: number;
  payment_id?: number;
}

export type AgentActivityLog = RecentActivity;

export interface AgentOverviewStats {
  total_tokens_consumed?: number;
  overall_success_rate?: number;
  avg_system_latency_sec?: number;
  total_runs_today?: number;
  active_agents_count?: number;
}

export interface AgentStatusResponse {
  overview?: AgentOverviewStats;
  agents?: AgentInfo[];
}
