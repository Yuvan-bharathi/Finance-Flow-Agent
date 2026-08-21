# Companion Document: AIAssistant.jsx (Mobile AI Command Center)

## Component Responsibility
The `AIAssistant` component serves as the dedicated **Mobile AI Command Center** (`/assistant` or `/ai`). It provides a mobile-first interface exposing the complete FinanceFlow AI intelligence layer:
- **Good Morning Daily AI Briefing**: High-priority case and borrower attention summaries with interactive stepping review.
- **Voice AI Assistant (🎙️)**: Speech-to-text transcription directly feeding into the standard 23-tool AI Copilot.
- **Portfolio Health & Collection Efficiency**: Live Agent 5 portfolio calculations with high-risk borrower drill-down.
- **AI Activity Timeline**: Real-time operational events from all 6 agents with one-tap deep investigation shortcuts.

## Props & Interfaces
```typescript
interface AIAssistantProps {
  onOpenCopilotWithPrompt?: (promptText: string) => void;
  onInvestigateEntity?: (recordType: string, recordId: number | string) => void;
}
```

## Data Flow & Services
- Utilizes `useVoiceInput` hook for browser-native speech recognition.
- Utilizes `useOnlineStatus` hook to prevent offline execution.
- Integrates `MobileDailyBriefing`, `MobileAIInsightCard`, and `MobileAIActivityFeed`.
- Connects directly to the existing `/api/assistant/chat` endpoint and Groq LLM reasoning engine.

## PWA & Security Decisions
1. **Strict Online Gating**: Voice transcription and prompt execution are disabled when offline.
2. **Zero Secondary AI Engine**: Voice audio is transcribed into standard prompt text and processed through the exact same 23-tool backend Copilot.
3. **RBAC & Audit Preserved**: Any action proposed via the command center requires human confirmation and generates an immutable audit record.
