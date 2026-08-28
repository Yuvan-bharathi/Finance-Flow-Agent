import swaggerJsdoc from 'swagger-jsdoc';

/**
 * FinanceFlow AI — Comprehensive Enterprise OpenAPI 3.0 Specification
 * 
 * Defines all 43 REST API endpoints, 18 Database Entity Schemas, 6 Operational AI Agents,
 * 23 Financial Copilot Tools, and Human-in-the-Loop Settlement Security Architecture.
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'FinanceFlow AI — Enterprise Financial Operations API',
    version: '1.0.0',
    description: `
# FinanceFlow AI Backend API Documentation

Welcome to the **FinanceFlow AI** API reference. FinanceFlow AI is an enterprise-grade financial operations platform powered by **Groq Llama-3.3 70B & Qwen 2.5 32B** multi-agent intelligence.

---

### 🛡️ Human-in-the-Loop Settlement Safety Architecture
**CRITICAL SECURITY POLICY**: FinanceFlow AI **NEVER** autonomously executes high-risk financial mutations (allocating funds to ledgers, overriding payments, or disbursing capital). 

1. **AI Proposes**: AI Agents compute confidence scores, generate matches, and create formal **Action Proposals** stored in \`assistant_action_proposals\`.
2. **Human Reviews**: Proposals are rendered in the UI with reasoning and source evidence.
3. **Authenticated Confirmation**: An authorized human user must explicitly click **Approve / Confirm**.
4. **Backend Re-Validation**: The backend re-verifies proposal existence, non-expiration, status (\`pending_confirmation\`), user session JWT, and RBAC permissions before performing database mutations and logging an immutable audit record in \`audit_logs\`.

---

### 🔐 Authentication & Security Schemes
The API supports two authentication mechanisms:
- **Bearer Token**: Passed in the HTTP \`Authorization\` header as \`Bearer <jwt_token>\`.
- **HTTP-Only Cookie**: Automatically attached as an encrypted \`token\` cookie.

### 👥 Hierarchical Role-Based Access Control (7 Roles)
- \`owner\` (ID 90002): Platform Owner — Full administrative & billing control.
- \`super_admin\` (ID 90003): Super Admin — Full operational & user management control.
- \`admin\` (ID 1): Operations Admin — System management, company & loan creation.
- \`manager\` (ID 2): Credit Risk Manager — Risk management, portfolio analysis, agent execution.
- \`senior_accountant\` (ID 3): Senior Accountant — Human-in-the-loop allocation approvals, overrides, alerts.
- \`accountant\` (ID 4): Daily Accountant — Payment ingestion, unanalyzed case processing.
- \`viewer\` (ID 5): Read-Only Auditor — Read-only access across all dashboards; strictly blocked from write actions.

---

### 🤖 The 6 Operational AI Agents
1. **Agent 1: Payment Reconciliation Agent** (\`agent_1_reconciliation\`) — Matches raw bank deposits against repayment schedules.
2. **Agent 2: Credit Risk Assessment Agent** (\`agent_2_risk\`) — Computes borrower default probabilities & risk grades.
3. **Agent 3: Collection Strategy Agent** (\`agent_3_collection\`) — Drafts personalized escalation & legal recovery emails.
4. **Agent 4: Document Intelligence Agent** (\`agent_4_document\`) — Extracts financial terms & tables from PDFs/images.
5. **Agent 5: Portfolio Intelligence Agent** (\`agent_5_portfolio\`) — Performs macroeconomic portfolio-wide health analysis.
6. **Agent 6: Notification & Escalation Agent** (\`agent_6_notification\`) — Scans delinquent accounts and routes tiered SLA breach notices.

---

### 💬 Financial Copilot & Tool Calling (23 Tools)
The Copilot (\`POST /api/assistant/chat\`) operates with 19 Read Tools (fetching DB facts) and 4 Action Proposal Tools (\`proposeFlagCase\`, \`proposeAddCaseNote\`, \`proposeTriggerReanalysis\`, \`proposeEscalateAlert\`).
`,
    contact: {
      name: 'FinanceFlow Engineering Team',
      email: 'engineering@financeflow.ai',
      url: 'https://finance-flow-agent.vercel.app'
    },
    license: {
      name: 'Proprietary — FinanceFlow AI Inc.',
      url: 'https://financeflow.ai/terms'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server'
    },
    {
      url: 'https://finance-flow-agent.onrender.com/api',
      description: 'Production Render Backend'
    }
  ],
  security: [
    { bearerAuth: [] },
    { cookieAuth: [] }
  ],
  tags: [
    { name: 'Authentication', description: 'User login, logout, password configuration, and session management' },
    { name: 'Users', description: 'Hierarchical user management and role assignment' },
    { name: 'Companies', description: 'Corporate borrower master data and risk status' },
    { name: 'Loans', description: 'Loan facilities, principal amounts, and interest terms' },
    { name: 'Repayments', description: 'Monthly installment schedules and payment due dates' },
    { name: 'Payments', description: 'Incoming bank deposit ingestion and mock transaction simulation' },
    { name: 'Reconciliation', description: 'AI Agent 1 payment matching and Human-in-the-Loop settlement gate' },
    { name: 'Risk', description: 'AI Agent 2 credit risk assessment and probability of default' },
    { name: 'Collections', description: 'AI Agent 3 automated collection strategies and notice generation' },
    { name: 'Documents', description: 'AI Agent 4 document extraction and file repository' },
    { name: 'Agents', description: 'Agent Control Center status, execution runs, and step-by-step logs' },
    { name: 'Portfolio', description: 'AI Agent 5 portfolio-wide analytics and macroeconomic snapshots' },
    { name: 'Notifications', description: 'AI Agent 6 SLA breach detection, tiered escalation, and alert sign-offs' },
    { name: 'Settings', description: 'User preferences, confidence thresholds, Groq token usage, and live model switcher' },
    { name: 'AI Copilot', description: 'Financial Operations Copilot chat, tool calling, and context pre-loading' },
    { name: 'Assistant Actions', description: 'Human-in-the-loop Action Proposal confirmation and dismissal' },
    { name: 'Audit Logs', description: 'Immutable compliance trail tracking user actions and state mutations' },
    { name: 'Health', description: 'Backend API health check and server status' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token as `Bearer <token>` in the Authorization header'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'HTTP-only encrypted session cookie set upon successful login'
      }
    },
    schemas: {
      // ─── Standard API Response Wrapper ──────────────────────────────────────
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object', nullable: true }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Access Restricted: Permission denied' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'FORBIDDEN' },
              details: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      },

      // ─── User & Auth Schemas ────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          role_id: { type: 'integer', example: 1 },
          role_name: { type: 'string', example: 'admin' },
          name: { type: 'string', example: 'System Administrator' },
          email: { type: 'string', example: 'admin@financeflow.com' },
          is_active: { type: 'boolean', example: true },
          last_login_at: { type: 'string', format: 'date-time', nullable: true, example: '2026-08-25T08:00:00Z' },
          created_at: { type: 'string', format: 'date-time', example: '2026-08-01T10:00:00Z' }
        }
      },
      UserLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@financeflow.com' },
          password: { type: 'string', format: 'password', example: 'AdminPass123!' }
        }
      },
      UserCreateRequest: {
        type: 'object',
        required: ['name', 'email', 'role_id'],
        properties: {
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane.doe@company.com' },
          role_id: { type: 'integer', example: 3, description: 'Role ID (1: Admin, 2: Manager, 3: Senior Accountant, 4: Accountant, 5: Viewer)' }
        }
      },
      SetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', example: 'a1b2c3d4e5f6...' },
          password: { type: 'string', format: 'password', example: 'SecurePassword123!' }
        }
      },

      // ─── Company Master Data ────────────────────────────────────────────────
      Company: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          company_name: { type: 'string', example: 'Apex Logistics Pvt Ltd' },
          registration_number: { type: 'string', example: 'CIN-L12345MH2020PTC0001' },
          tax_identifier: { type: 'string', example: 'GSTIN27AAAAA0000A1Z5' },
          bank_account_number: { type: 'string', example: '918020045612389' },
          contact_name: { type: 'string', example: 'Sunil Verma' },
          contact_email: { type: 'string', example: 'finance@apexlogistics.com' },
          contact_phone: { type: 'string', example: '+91 98765 43210' },
          address: { type: 'string', example: 'Plot 45, MIDC Industrial Area, Mumbai' },
          status: { type: 'string', enum: ['active', 'inactive', 'blacklisted'], example: 'active' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      CompanyCreateRequest: {
        type: 'object',
        required: ['company_name'],
        properties: {
          company_name: { type: 'string', example: 'Starlight Enterprises' },
          registration_number: { type: 'string', example: 'REG-994821' },
          tax_identifier: { type: 'string', example: 'TAX-883019' },
          bank_account_number: { type: 'string', example: '987654321098' },
          contact_name: { type: 'string', example: 'Robert Chen' },
          contact_email: { type: 'string', example: 'finance@starlight.com' },
          contact_phone: { type: 'string', example: '+91 91234 56789' },
          address: { type: 'string', example: 'Tech Park Phase 2, Bengaluru' }
        }
      },

      // ─── Loans & Repayments ─────────────────────────────────────────────────
      Loan: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          company_id: { type: 'integer', example: 1 },
          company_name: { type: 'string', example: 'Apex Logistics Pvt Ltd' },
          loan_number: { type: 'string', example: 'LN-2026-001' },
          principal_amount: { type: 'number', example: 5000000.00 },
          interest_rate: { type: 'number', example: 10.50 },
          total_payable: { type: 'number', example: 5525000.00 },
          start_date: { type: 'string', format: 'date', example: '2026-01-01' },
          end_date: { type: 'string', format: 'date', example: '2026-12-31' },
          status: { type: 'string', enum: ['active', 'completed', 'defaulted', 'cancelled'], example: 'active' }
        }
      },
      LoanCreateRequest: {
        type: 'object',
        required: ['company_id', 'loan_number', 'principal_amount', 'interest_rate', 'tenure_months', 'start_date'],
        properties: {
          company_id: { type: 'integer', example: 1 },
          loan_number: { type: 'string', example: 'LN-2026-005' },
          principal_amount: { type: 'number', example: 2500000.00 },
          interest_rate: { type: 'number', example: 9.75 },
          tenure_months: { type: 'integer', example: 12 },
          start_date: { type: 'string', format: 'date', example: '2026-09-01' }
        }
      },
      RepaymentSchedule: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          loan_id: { type: 'integer', example: 1 },
          installment_number: { type: 'integer', example: 3 },
          due_date: { type: 'string', format: 'date', example: '2026-08-01' },
          scheduled_amount: { type: 'number', example: 460416.67 },
          paid_amount: { type: 'number', example: 460416.67 },
          status: { type: 'string', enum: ['pending', 'partially_paid', 'paid', 'overdue', 'cancelled'], example: 'paid' }
        }
      },

      // ─── Payment Ingestion & Mock Deposit ───────────────────────────────────
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          transaction_id: { type: 'string', example: 'TXN-984012' },
          amount: { type: 'number', example: 421875.00 },
          payment_date: { type: 'string', format: 'date', example: '2026-08-20' },
          sender_name: { type: 'string', example: 'Apex Logistics' },
          sender_account: { type: 'string', example: '918020045612389' },
          reference: { type: 'string', example: 'EMI-AUG-2026' },
          source: { type: 'string', enum: ['api', 'manual', 'bank_import', 'excel_upload'], example: 'api' },
          status: { type: 'string', enum: ['unmatched', 'processing', 'pending', 'completed', 'rejected', 'duplicate'], example: 'unmatched' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      PaymentIngestRequest: {
        type: 'object',
        required: ['transaction_id', 'amount', 'payment_date'],
        properties: {
          transaction_id: { type: 'string', example: 'TXN-2026889' },
          amount: { type: 'number', example: 350000.00 },
          payment_date: { type: 'string', format: 'date', example: '2026-08-25' },
          sender_name: { type: 'string', example: 'Starlight Corp' },
          sender_account: { type: 'string', example: '987654321098' },
          reference: { type: 'string', example: 'INV-9901' },
          source: { type: 'string', example: 'bank_import' }
        }
      },
      MockDepositRequest: {
        type: 'object',
        required: ['company_id', 'amount'],
        properties: {
          company_id: { type: 'integer', example: 1 },
          amount: { type: 'number', example: 421875.00 },
          reference: { type: 'string', example: 'MOCK-BANK-DEPOSIT-TEST' }
        }
      },

      // ─── Reconciliation Cases & Settlement ─────────────────────────────────
      ReconciliationCase: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 16 },
          payment_id: { type: 'integer', example: 101 },
          assigned_to: { type: 'integer', nullable: true, example: 3 },
          status: { type: 'string', enum: ['open', 'ai_processing', 'pending_review', 'approved', 'rejected', 'resolved'], example: 'pending_review' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'critical' },
          resolution_reason: { type: 'string', nullable: true },
          latest_recommendation: { $ref: '#/components/schemas/AIRecommendation' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      AIRecommendation: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 12 },
          reconciliation_case_id: { type: 'integer', example: 16 },
          recommended_company_id: { type: 'integer', example: 1 },
          recommended_loan_id: { type: 'integer', example: 1 },
          recommended_schedule_id: { type: 'integer', example: 10 },
          confidence_score: { type: 'number', example: 98.50 },
          reasoning: { type: 'string', example: 'Exact match on bank account number (918020045612389) and amount matching EMI ₹4,21,875.' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'overridden'], example: 'pending' }
        }
      },
      PaymentAllocation: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 5 },
          payment_id: { type: 'integer', example: 101 },
          repayment_schedule_id: { type: 'integer', example: 10 },
          allocated_amount: { type: 'number', example: 421875.00 },
          approved_by: { type: 'integer', example: 3 },
          allocation_type: { type: 'string', enum: ['ai_approved', 'manual', 'ai_overridden', 'overpayment'], example: 'ai_approved' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      ApproveRecommendationRequest: {
        type: 'object',
        required: ['recommendationId'],
        properties: {
          recommendationId: { type: 'integer', example: 12 },
          comment: { type: 'string', example: 'Approved after verification of bank statement proof.' }
        }
      },
      RejectRecommendationRequest: {
        type: 'object',
        required: ['recommendationId', 'reason'],
        properties: {
          recommendationId: { type: 'integer', example: 12 },
          reason: { type: 'string', example: 'Borrower indicated payment belongs to secondary credit line.' }
        }
      },
      OverrideRecommendationRequest: {
        type: 'object',
        required: ['caseId', 'targetScheduleId', 'amount', 'reason'],
        properties: {
          caseId: { type: 'integer', example: 16 },
          targetScheduleId: { type: 'integer', example: 11 },
          amount: { type: 'number', example: 421875.00 },
          reason: { type: 'string', example: 'Manual override to allocate payment against installment #4 per CFO instructions.' }
        }
      },

      // ─── Agent Runs & Activity ──────────────────────────────────────────────
      AgentRun: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 54 },
          agent_id: { type: 'string', example: 'agent_1_reconciliation' },
          trigger_type: { type: 'string', enum: ['manual', 'automated', 'event'], example: 'manual' },
          status: { type: 'string', enum: ['running', 'completed', 'failed'], example: 'completed' },
          ai_model_used: { type: 'string', example: 'qwen/qwen3.6-27b' },
          total_tokens: { type: 'integer', example: 1420 },
          confidence_score: { type: 'number', example: 98.50 },
          result_summary: { type: 'string', example: 'Agent 1 computed 98.5% confidence match.' },
          started_at: { type: 'string', format: 'date-time' },
          completed_at: { type: 'string', format: 'date-time' }
        }
      },
      AgentExecutionLog: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 210 },
          agent_run_id: { type: 'integer', example: 54 },
          step_number: { type: 'integer', example: 1 },
          tool_called: { type: 'string', example: 'getPaymentDetails' },
          tool_input: { type: 'object', example: { paymentId: 101 } },
          tool_output: { type: 'object' },
          reasoning: { type: 'string', example: 'Fetching raw deposit details from payments table.' }
        }
      },

      // ─── Notifications & Escalations ────────────────────────────────────────
      NotificationAlert: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 8 },
          company_id: { type: 'integer', example: 1 },
          company_name: { type: 'string', example: 'Apex Logistics Pvt Ltd' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], example: 'CRITICAL' },
          escalation_level: { type: 'string', enum: ['accountant', 'manager', 'executive'], example: 'executive' },
          title: { type: 'string', example: 'Executive Escalation: Apex Logistics 70+ Days Delinquent' },
          ai_reasoning: { type: 'string', example: 'Probability of default estimated at 78.4%. Immediate executive intervention mandated.' },
          outstanding_amount: { type: 'number', example: 421875.00 },
          overdue_days: { type: 'integer', example: 70 },
          notification_status: { type: 'string', enum: ['pending', 'approved', 'dismissed'], example: 'pending' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      // ─── AI Copilot & Action Proposals ──────────────────────────────────────
      CopilotChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', example: 'Why was Case #16 flagged as critical?' },
          conversationHistory: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'assistant'] },
                content: { type: 'string' }
              }
            }
          },
          contextPayload: {
            type: 'object',
            properties: {
              page: { type: 'string', example: 'reconciliations' },
              recordType: { type: 'string', example: 'reconciliation_case' },
              recordId: { type: 'integer', example: 16 }
            }
          }
        }
      },
      CopilotChatResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          answer: { type: 'string', example: 'Case #16 was flagged as critical because the deposit amount ₹4,21,875 has been unallocated for 70 days...' },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Reconciliation Case #16' },
                snippet: { type: 'string', example: 'Status: pending_review | Priority: CRITICAL' },
                recordId: { type: 'integer', example: 16 }
              }
            }
          },
          suggestedActions: {
            type: 'array',
            items: { $ref: '#/components/schemas/AssistantActionProposal' }
          },
          total_tokens: { type: 'integer', example: 850 }
        }
      },
      AssistantActionProposal: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ACT-000123' },
          action_type: { type: 'string', enum: ['FLAG_CASE', 'ADD_CASE_NOTE', 'TRIGGER_REANALYSIS', 'ESCALATE_ALERT'], example: 'FLAG_CASE' },
          target_entity: { type: 'string', example: 'reconciliation_case' },
          target_id: { type: 'integer', example: 16 },
          requested_params: { type: 'object', example: { priority: 'critical', reason: 'SLA breach > 60 days' } },
          proposal_reason: { type: 'string', example: 'Escalating priority to critical due to 70-day overdue SLA breach.' },
          status: { type: 'string', enum: ['pending_confirmation', 'executed', 'dismissed', 'expired', 'failed'], example: 'pending_confirmation' },
          expires_at: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      ConfirmActionRequest: {
        type: 'object',
        required: ['proposalId'],
        properties: {
          proposalId: { type: 'string', example: 'ACT-000123' }
        }
      },
      DismissActionRequest: {
        type: 'object',
        required: ['proposalId'],
        properties: {
          proposalId: { type: 'string', example: 'ACT-000123' }
        }
      },

      // ─── Audit Log Schema ───────────────────────────────────────────────────
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 402 },
          user_id: { type: 'integer', example: 3 },
          user_name: { type: 'string', example: 'Senior Accountant' },
          action: { type: 'string', example: 'APPROVE_RECONCILIATION_RECOMMENDATION' },
          entity_type: { type: 'string', example: 'reconciliation_case' },
          entity_id: { type: 'integer', example: 16 },
          old_values: { type: 'object' },
          new_values: { type: 'object' },
          ip_address: { type: 'string', example: '127.0.0.1' },
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    // =========================================================================
    // 1. HEALTH CHECK
    // =========================================================================
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Backend API Health Check',
        description: 'Returns server operational status, API version, and current server timestamp.',
        security: [],
        responses: {
          200: {
            description: 'Server is healthy and operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    name: { type: 'string', example: 'FinanceFlow AI Backend API' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // =========================================================================
    // 2. AUTHENTICATION APIs
    // =========================================================================
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Login & JWT Cookie Issuance',
        description: 'Authenticates user credentials, sets HTTP-only encrypted JWT cookie, and returns user profile.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserLoginRequest' } }
          }
        },
        responses: {
          200: {
            description: 'Login successful. JWT issued.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'User Logout & Cookie Invalidation',
        description: 'Clears HTTP-only authentication cookie and terminates session.',
        responses: {
          200: { description: 'Logged out successfully' },
          401: { description: 'Unauthorized — Invalid session' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get Current Authenticated User',
        description: 'Retrieves current authenticated user profile, assigned role, and permissions from JWT token.',
        responses: {
          200: { description: 'User profile retrieved' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/auth/demo-users': {
      get: {
        tags: ['Authentication'],
        summary: 'List Pre-Configured Role Credentials (Demo / Testing)',
        description: 'Lists demo user accounts for rapid RBAC role-switching testing across all 7 roles.',
        security: [],
        responses: {
          200: { description: 'Demo user list' }
        }
      }
    },
    '/auth/set-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Set / Reset Password via Token',
        description: 'Allows a new user or password-reset requester to set a secure password using a valid email token.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SetPasswordRequest' } } }
        },
        responses: {
          200: { description: 'Password set successfully' },
          400: { description: 'Token expired or invalid' }
        }
      }
    },
    '/auth/users': {
      get: {
        tags: ['Users'],
        summary: 'List All System Users',
        description: 'Retrieves all platform users with role details.',
        responses: {
          200: { description: 'Users list' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/auth/users/create': {
      post: {
        tags: ['Users'],
        summary: 'Create New Platform User & Send Password Setup Link',
        description: 'Allows Admin/Owner roles to invite new users, assign roles, and generate secure activation tokens.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreateRequest' } } }
        },
        responses: {
          201: { description: 'User created successfully' },
          403: { description: 'Forbidden — Insufficient role permissions' }
        }
      }
    },

    // =========================================================================
    // 3. COMPANY MASTER DATA APIs
    // =========================================================================
    '/companies': {
      get: {
        tags: ['Companies'],
        summary: 'List Corporate Borrowing Companies',
        description: 'Retrieves all corporate borrower profiles, loan counts, and total exposure.',
        responses: {
          200: { description: 'Companies list retrieved' }
        }
      },
      post: {
        tags: ['Companies'],
        summary: 'Create New Corporate Borrower Profile',
        description: 'Registers a new borrowing company. Restricted to `owner`, `super_admin`, `admin`, and `manager`.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CompanyCreateRequest' } } }
        },
        responses: {
          201: { description: 'Company profile created' },
          403: { description: 'Forbidden — Viewer or non-manager roles blocked' }
        }
      }
    },
    '/companies/{id}': {
      get: {
        tags: ['Companies'],
        summary: 'Get Borrower Profile by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Company details retrieved' },
          404: { description: 'Company not found' }
        }
      },
      put: {
        tags: ['Companies'],
        summary: 'Update Borrower Profile Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CompanyCreateRequest' } } }
        },
        responses: {
          200: { description: 'Company details updated' },
          403: { description: 'Forbidden — Insufficient permissions' }
        }
      }
    },

    // =========================================================================
    // 4. LOAN FACILITIES & REPAYMENTS
    // =========================================================================
    '/loans': {
      get: {
        tags: ['Loans'],
        summary: 'List All Active Loan Facilities',
        description: 'Retrieves borrowing contracts, principal amounts, interest rates, and overall status.',
        responses: { 200: { description: 'Loans list' } }
      },
      post: {
        tags: ['Loans'],
        summary: 'Issue New Loan Facility & Generate Installment Schedule',
        description: 'Creates a loan facility and automatically generates monthly repayment installment schedules. Restricted to Admin/Manager roles.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoanCreateRequest' } } }
        },
        responses: {
          201: { description: 'Loan created and schedule generated' },
          403: { description: 'Forbidden' }
        }
      }
    },
    '/loans/{id}': {
      get: {
        tags: ['Loans'],
        summary: 'Get Loan Facility & Installment Schedule by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Loan details with full schedule' },
          404: { description: 'Loan not found' }
        }
      }
    },
    '/repayments/due': {
      get: {
        tags: ['Repayments'],
        summary: 'Get All Overdue / Upcoming Due Repayment Installments',
        responses: { 200: { description: 'Due installments list' } }
      }
    },
    '/repayments/loan/{loanId}': {
      get: {
        tags: ['Repayments'],
        summary: 'Get Installment Schedule for Specific Loan',
        parameters: [{ name: 'loanId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Loan schedule breakdown' } }
      }
    },

    // =========================================================================
    // 5. PAYMENT INGESTION ENGINE
    // =========================================================================
    '/payments/ingest': {
      post: {
        tags: ['Payments'],
        summary: 'Ingest Raw Incoming Bank Deposit',
        description: 'Ingests a raw payment transaction into the `payments` table and automatically opens a `reconciliation_case`. Restricted to non-viewer operational roles.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentIngestRequest' } } }
        },
        responses: {
          201: { description: 'Payment ingested and reconciliation case opened' },
          403: { description: 'Forbidden — Viewer role read-only' }
        }
      }
    },
    '/payments/mock-bank-deposit': {
      post: {
        tags: ['Payments'],
        summary: 'Simulate Mock Bank Deposit for Live Testing',
        description: 'Simulates a live bank feed deposit for a specific borrower to test instant AI matching.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MockDepositRequest' } } }
        },
        responses: { 201: { description: 'Mock deposit injected' } }
      }
    },
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List Ingested Bank Payments',
        responses: { 200: { description: 'Payments list' } }
      }
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get Payment Details by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Payment record' } }
      }
    },

    // =========================================================================
    // 6. RECONCILIATION & SETTLEMENT GATE (AGENT 1)
    // =========================================================================
    '/reconciliations/stats': {
      get: {
        tags: ['Reconciliation'],
        summary: 'Get Reconciliation Dashboard KPIs & Match Accuracy Stats',
        responses: { 200: { description: 'KPI metrics summary' } }
      }
    },
    '/reconciliations/cases': {
      get: {
        tags: ['Reconciliation'],
        summary: 'List All Reconciliation Cases',
        responses: { 200: { description: 'Cases list with AI recommendations' } }
      }
    },
    '/reconciliations/cases/{caseId}': {
      get: {
        tags: ['Reconciliation'],
        summary: 'Get Case Details by ID',
        parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Case record' } }
      }
    },
    '/reconciliations/analyze/{caseId}': {
      post: {
        tags: ['Reconciliation'],
        summary: 'Trigger AI Agent 1 Analysis on Single Case',
        description: 'Triggers Groq Llama-3.3 70B Agent 1 to perform fuzzy matching on payment reference, bank account, and amount. Restricted to non-viewer roles.',
        parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'AI Analysis complete with confidence score and match reasoning' },
          403: { description: 'Forbidden — Viewer role read-only' }
        }
      }
    },
    '/reconciliations/analyze-bulk': {
      post: {
        tags: ['Reconciliation'],
        summary: 'Trigger AI Agent 1 Bulk Analysis on Selected Cases',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { caseIds: { type: 'array', items: { type: 'integer' } } } } } }
        },
        responses: { 200: { description: 'Bulk analysis started' } }
      }
    },
    '/reconciliations/approve': {
      post: {
        tags: ['Reconciliation'],
        summary: 'Human-in-the-Loop 1-Click Match Approval & Settlement',
        description: 'Approve AI Agent 1 recommendation. Executes ledger allocation, marks installment PAID, and updates case status to `approved`. Restricted to Senior Accountants and Managers.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApproveRecommendationRequest' } } }
        },
        responses: {
          200: { description: 'Payment allocated to financial ledger and marked PAID' },
          403: { description: 'Forbidden — Accountant or Viewer role restricted' }
        }
      }
    },
    '/reconciliations/reject': {
      post: {
        tags: ['Reconciliation'],
        summary: 'Reject AI Recommendation',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RejectRecommendationRequest' } } }
        },
        responses: { 200: { description: 'Recommendation rejected' } }
      }
    },
    '/reconciliations/override': {
      post: {
        tags: ['Reconciliation'],
        summary: 'Accountant Manual Override Allocation',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OverrideRecommendationRequest' } } }
        },
        responses: { 200: { description: 'Manual allocation saved and audit trail logged' } }
      }
    },

    // =========================================================================
    // 7. CREDIT RISK ASSESSMENT (AGENT 2)
    // =========================================================================
    '/risk/overview': {
      get: {
        tags: ['Risk'],
        summary: 'Get Portfolio Credit Risk Overview',
        responses: { 200: { description: 'Risk score distribution across borrowers' } }
      }
    },
    '/risk/assess/{companyId}': {
      get: {
        tags: ['Risk'],
        summary: 'Trigger AI Agent 2 Credit Risk Assessment',
        description: 'Triggers Agent 2 to evaluate historical delinquency, repayment velocity, and financial exposure to compute Default Probability & Risk Grade.',
        parameters: [{ name: 'companyId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Credit risk assessment computed' },
          403: { description: 'Forbidden' }
        }
      }
    },

    // =========================================================================
    // 8. COLLECTIONS & NOTICES (AGENT 3)
    // =========================================================================
    '/collections/generate/{companyId}': {
      get: {
        tags: ['Collections'],
        summary: 'Trigger AI Agent 3 Collection Notice Generation',
        description: 'Drafts a personalized SLA escalation & recovery notice using Groq LLM tailored to borrower delinquency history.',
        parameters: [{ name: 'companyId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Collection notice drafted' } }
      }
    },
    '/collections/send': {
      post: {
        tags: ['Collections'],
        summary: 'Approve & Dispatch Collection Email Notice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  companyId: { type: 'integer' },
                  emailSubject: { type: 'string' },
                  emailBody: { type: 'string' },
                  recipientEmail: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Email dispatched via SMTP and logged' } }
      }
    },

    // =========================================================================
    // 9. DOCUMENT INTELLIGENCE (AGENT 4)
    // =========================================================================
    '/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List Uploaded Financial Documents & Statements',
        responses: { 200: { description: 'Documents repository list' } }
      }
    },
    '/documents/extract/{documentId}': {
      post: {
        tags: ['Documents'],
        summary: 'Trigger AI Agent 4 Document Extraction',
        description: 'Extracts loan terms, bank statement line items, borrower names, and amounts from PDF/Image documents using Agent 4 Document Intelligence.',
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Document terms extracted' } }
      }
    },

    // =========================================================================
    // 10. AGENT CONTROL CENTER
    // =========================================================================
    '/agents/status': {
      get: {
        tags: ['Agents'],
        summary: 'Get Live Status & Operational Health of All 6 AI Agents',
        responses: { 200: { description: 'Agent operational states (ready / busy / idle)' } }
      }
    },
    '/agents/activity': {
      get: {
        tags: ['Agents'],
        summary: 'Get Recent System-Wide Agent Activity Feed',
        responses: { 200: { description: 'Recent execution runs feed' } }
      }
    },
    '/agents/{agentId}/runs': {
      get: {
        tags: ['Agents'],
        summary: 'Get Run History for Specific Agent',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string', example: 'agent_1_reconciliation' } }],
        responses: { 200: { description: 'Agent run history' } }
      }
    },
    '/agents/{agentId}/runs/{runId}': {
      get: {
        tags: ['Agents'],
        summary: 'Get Step-by-Step Execution Logs for Agent Run',
        description: 'Retrieves step-by-step tool invocation traces and LLM reasoning steps for audit review.',
        parameters: [
          { name: 'agentId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'runId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: { 200: { description: 'Detailed run execution logs' } }
      }
    },

    // =========================================================================
    // 11. PORTFOLIO INTELLIGENCE (AGENT 5)
    // =========================================================================
    '/portfolio/analyze': {
      post: {
        tags: ['Portfolio'],
        summary: 'Trigger AI Agent 5 Macroeconomic Portfolio Analysis',
        description: 'Analyzes portfolio-wide risk concentration, total outstanding exposure, collection efficiency, and macroeconomic projections.',
        responses: { 200: { description: 'Portfolio analysis snapshot generated' } }
      }
    },
    '/portfolio/snapshots': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get Portfolio Analysis Snapshot History',
        responses: { 200: { description: 'Snapshot history list' } }
      }
    },
    '/portfolio/latest': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get Latest Portfolio Snapshot',
        responses: { 200: { description: 'Latest snapshot' } }
      }
    },

    // =========================================================================
    // 12. NOTIFICATION & ESCALATION (AGENT 6)
    // =========================================================================
    '/notifications/escalate': {
      post: {
        tags: ['Notifications'],
        summary: 'Trigger AI Agent 6 SLA Breach & Escalation Scan',
        description: 'Scans all active loans for SLA breaches (> 30, 60, 90 days delinquent) and generates tiered escalation alerts.',
        responses: { 200: { description: 'Escalation scan completed and alerts routed' } }
      }
    },
    '/notifications/alerts': {
      get: {
        tags: ['Notifications'],
        summary: 'List Escalation Alerts & Notices',
        responses: { 200: { description: 'Alerts list' } }
      }
    },
    '/notifications/alerts/{id}/approve': {
      put: {
        tags: ['Notifications'],
        summary: 'Human Approval of Escalation Notice',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Alert approved and notice dispatched' } }
      }
    },
    '/notifications/alerts/{id}/dismiss': {
      put: {
        tags: ['Notifications'],
        summary: 'Dismiss Escalation Alert',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Alert dismissed' } }
      }
    },

    // =========================================================================
    // 13. SETTINGS & AI TELEMETRY
    // =========================================================================
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get User & System Configuration Settings',
        responses: { 200: { description: 'Settings values' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update Configuration Settings',
        responses: { 200: { description: 'Settings updated' } }
      }
    },
    '/settings/token-usage': {
      get: {
        tags: ['Settings'],
        summary: 'Get Groq AI Token Usage Telemetry & Cost Analytics',
        description: 'Monitors total tokens consumed per agent, prompt tokens, completion tokens, and estimated cost. Restricted to Owner & Super Admin.',
        responses: { 200: { description: 'Token usage telemetry' } }
      }
    },
    '/settings/active-model': {
      put: {
        tags: ['Settings'],
        summary: 'Switch Live Groq LLM Model dynamically',
        description: 'Switches the active LLM powering FinanceFlow AI agents (e.g. `llama-3.3-70b-versatile`, `qwen/qwen3.6-27b`). Restricted to Owner & Super Admin.',
        responses: { 200: { description: 'Live AI model updated' } }
      }
    },

    // =========================================================================
    // 14. AI FINANCIAL COPILOT & ACTION PROPOSALS
    // =========================================================================
    '/assistant/chat': {
      post: {
        tags: ['AI Copilot'],
        summary: 'Main AI Copilot Query & Autonomous Tool Execution Endpoint',
        description: 'Executes natural language queries against FinanceFlow database facts via 19 read tools and 4 action proposal tools. Employs fact-tagging and source citations.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CopilotChatRequest' } } }
        },
        responses: {
          200: {
            description: 'AI answer with citations and suggested action proposals',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CopilotChatResponse' } } }
          }
        }
      }
    },
    '/assistant/wake/{recordType}/{recordId}': {
      get: {
        tags: ['AI Copilot'],
        summary: 'Pre-Load Context Badge when User Clicks [Ask AI / Investigate]',
        parameters: [
          { name: 'recordType', in: 'path', required: true, schema: { type: 'string', example: 'reconciliation_case' } },
          { name: 'recordId', in: 'path', required: true, schema: { type: 'integer', example: 16 } }
        ],
        responses: { 200: { description: 'Context preview loaded' } }
      }
    },
    '/assistant/actions/confirm': {
      post: {
        tags: ['Assistant Actions'],
        summary: 'Confirm & Execute Human-in-the-Loop Action Proposal',
        description: 'Validates proposal existence, status (`pending_confirmation`), non-expiration, RBAC permissions, and target record state before executing database mutation.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ConfirmActionRequest' } } }
        },
        responses: {
          200: { description: 'Action proposal confirmed and executed' },
          400: { description: 'Proposal already executed or invalid status' },
          403: { description: 'Forbidden — Insufficient role permissions' },
          404: { description: 'Proposal or target record not found' },
          410: { description: 'Proposal has expired' }
        }
      }
    },
    '/assistant/actions/dismiss': {
      post: {
        tags: ['Assistant Actions'],
        summary: 'Dismiss Action Proposal without Executing Mutations',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DismissActionRequest' } } }
        },
        responses: {
          200: { description: 'Proposal dismissed' }
        }
      }
    },

    // =========================================================================
    // 15. AUDIT LOGS
    // =========================================================================
    '/audit-logs': {
      get: {
        tags: ['Audit Logs'],
        summary: 'List Compliance Audit Logs',
        description: 'Retrieves immutable audit trail recording WHO, WHAT, WHEN, IP address, before and after JSON states for state mutations.',
        responses: {
          200: { description: 'Audit log list' },
          403: { description: 'Forbidden' }
        }
      }
    }
  }
};

const swaggerOptions = {
  swaggerDefinition,
  apis: [] // Explicitly defined OpenAPI 3.0 dictionary above
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
