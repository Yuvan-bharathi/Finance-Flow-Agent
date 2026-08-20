# Dashboard Module Documentation — FinanceFlow AI

## Purpose
The Dashboard module provides a bright, enterprise-grade fintech UI for accountants and finance managers to monitor incoming payment reconciliations, AI confidence metrics, pending reviews, resolved cases, and compliance operations from one centralized platform.

---

## Component Architecture

```text
Dashboard/
├── Dashboard.jsx               # Master Dashboard layout container & data orchestration
├── Sidebar.jsx                 # Enterprise white left sidebar with navigation & AI Assistant
├── Header.jsx                  # Top navigation header with greeting, search, date range picker
├── KPISection.jsx              # Row container rendering 6 summary metric cards
├── KPICard.jsx                 # Reusable individual metric card with pastel icon
├── CaseStatusChart.jsx         # Donut SVG chart displaying status breakdown (Resolved, Pending, etc.)
├── CasesOverTimeChart.jsx      # Smooth curved line chart displaying weekly case trends
├── AIPerformanceCard.jsx       # Semicircle gauge chart showing 92.4% Avg Confidence
├── RecentCasesTable.jsx        # Table listing cases, confidence progress bars, badges, & Review actions
├── StatusBadge.jsx             # Reusable color-coded case status badge
├── PriorityBadge.jsx           # Reusable priority indicator badge
├── ConfidenceBar.jsx           # Dynamic confidence score text with color progress bar
├── FilterBar.jsx               # Status & priority dropdown filters
├── AIAssistantCard.jsx         # AI Assistant & user profile sidebar footer
└── README.md                   # Module documentation
```

---

## Data Flow Architecture

```text
Backend MySQL Database
        │
        ▼
Express Backend API (GET /api/reconciliations/stats & GET /api/reconciliations/cases)
        │
        ▼
reconciliationService.js (getCases, getStats, getCaseById, approveRecommendation)
        │
        ▼
Dashboard.jsx (Fetches data on load, manages search query & selected case)
   ├──► KPISection ➔ KPICard (Total Cases, Pending Review, Resolved, AI Auto-Processed, High Priority, Amount)
   ├──► CaseStatusChart (Renders Donut SVG breakdown)
   ├──► CasesOverTimeChart (Renders Bezier curve line SVG)
   ├──► AIPerformanceCard (Renders semicircle gauge)
   └──► RecentCasesTable (Renders case rows, ConfidenceBar, StatusBadge, PriorityBadge)
           │
           ▼
     User clicks [ 👁 Review ]
           │
           ▼
ActionCenterDrawer.jsx (Approve / Reject / Manual Override Settlement Gate)
```

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/reconciliations/stats` | `GET` | Computes KPI counts, status breakdown, and AI confidence metrics |
| `/api/reconciliations/cases` | `GET` | Retrieves list of reconciliation cases with joined AI recommendations |
| `/api/reconciliations/analyze/:caseId` | `POST` | Triggers Payment Reconciliation AI Agent |
| `/api/reconciliations/approve` | `POST` | Executes Human-in-the-Loop financial ledger settlement |
| `/api/reconciliations/reject` | `POST` | Rejects AI recommendation and marks case for investigation |
| `/api/reconciliations/override` | `POST` | Manually maps payment to schedule with mandatory override reason |

---

## Key Design Decisions

1. **Bright Enterprise Theme**: Uses a white and light blue-gray background (`#f8fafc`), crisp navy typography (`#0f172a`), and bright status badges for maximum financial legibility.
2. **Confidence Progress Bar**: AI confidence is displayed with both a numeric percentage and a color-coded progress bar (Green $\ge 90\%$, Blue $70-89\%$, Orange $50-69\%$, Red $<50\%$).
3. **No Fake Data**: Unanalyzed payments display `--` or `Not Analyzed` rather than artificial values.
4. **Human-in-the-Loop Safety**: AI metrics demonstrate AI assistance, but official money allocation occurs only when an authorized user clicks **[Approve Match]** or **[Override]**.
