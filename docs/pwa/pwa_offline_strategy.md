# FinanceFlow AI — PWA Offline Strategy & Caching Policy

## 1. Core Philosophy: Online-First Financial Integrity

FinanceFlow AI operates on a strict **Online-First** architectural model. Unlike content or media applications, financial enterprise systems cannot compromise on data freshness, atomicity, and ledger consistency.

### What is Supported Offline
- **Application Shell**: Instant startup of the UI frame, header, navigation drawer, theme tokens, and typography.
- **Offline Guidance & Education**: Clear visual indicators explaining why financial operations are paused.
- **Graceful Error Prevention**: Proactive disabling of action buttons to prevent accidental clicks or state desynchronization.

### What is Explicitly Prohibited Offline
- Executing payment reconciliation approvals or rejections
- Ingesting new bank deposits or triggering simulated transactions
- Running autonomous AI agents (Agents 1 through 6)
- Sending prompts or action requests to AI Copilot
- Overriding loan installment schedules

---

## 2. Workbox Runtime Caching Rules

Configured in `frontend/vite.config.js`:

```javascript
runtimeCaching: [
  {
    // STRICT NETWORK-ONLY: Financial API & AI Endpoints
    urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
    handler: 'NetworkOnly',
    options: {
      backgroundSync: undefined // Strictly NO background queuing of writes
    }
  },
  {
    // Google Fonts Stylesheets: StaleWhileRevalidate
    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'google-fonts-stylesheets'
    }
  },
  {
    // Google Fonts Webfonts: CacheFirst (1 Year Expiry)
    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: {
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365
      }
    }
  },
  {
    // Static Brand Images & SVGs: StaleWhileRevalidate (30 Days Expiry)
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-image-assets',
      expiration: {
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30
      }
    }
  }
]
```

---

## 3. Online vs. Offline Behavior Matrix

| Feature / Action | Online Mode (🟢) | Offline Mode (🔴) | User Feedback & Reason |
|---|---|---|---|
| **App Shell & Navigation** | Instant Load | Loaded from Workbox Precache | Seamless instant startup |
| **Reconciliation Approvals** | Executed in MySQL + Audit Log | **BLOCKED** | Warning Banner: "Financial operations require an active backend connection." |
| **Manual Ingestion** | Ingested + Case Created | **BLOCKED** | Form error toast with tactile warning haptic |
| **AI Copilot Prompts** | Sent to Groq LLM with MySQL tools | **BLOCKED** | Informative Copilot response explaining live backend connection requirement |
| **Voice AI Input (🎙️)** | Web Speech -> Text -> Copilot | **BLOCKED** | Informs user that Voice AI requires active connectivity |
| **AI Agent Runs (1–6)** | Triggered on Express backend | **BLOCKED** | Execution buttons disabled or trigger alert dialog |
| **Action Proposal Confirmation** | Confirmed & Recorded in Audit Trail | **BLOCKED** | Action confirmation prevented until connection returns |

---

## 4. Reconnection Lifecycle & UX

1. **Network Disconnection Event**:
   - `window.addEventListener('offline')` fires.
   - `useOnlineStatus` hook immediately sets `isOnline: false`.
   - Top `OfflineBanner` displays red alert across all views.
   - Action buttons update to disabled/warning states.

2. **Network Reconnection Event**:
   - `window.addEventListener('online')` fires.
   - `useOnlineStatus` hook sets `isOnline: true` and `wasOffline: true`.
   - Top banner transitions to emerald green: *"Connection restored — Live real-time financial synchronization active."*
   - Dashboard automatically triggers fresh background data synchronization (`fetchDashboardData()`).
   - Success banner automatically dismisses after 4 seconds.
