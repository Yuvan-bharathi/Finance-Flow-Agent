# Companion Document: PWA Hooks & Utility Suite

## Custom Hooks

### 1. `useOnlineStatus.js`
- **Purpose**: Real-time network connectivity listener tracking `navigator.onLine` and `window` online/offline events.
- **Returns**: `{ isOnline, wasOffline, dismissRestoredToast }`
- **Security Role**: Primary gatekeeper preventing financial write operations when offline.

### 2. `usePWAInstall.js`
- **Purpose**: Intercepts `beforeinstallprompt` event, provides reactive flags, and exposes `promptInstall()` for in-app install triggers.
- **Returns**: `{ isInstallable, isInstalled, promptInstall }`

### 3. `useVoiceInput.js`
- **Purpose**: Integrates browser Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) to stream audio transcripts directly into the AI Copilot.
- **Returns**: `{ isListening, transcript, isSupported, startListening, stopListening, error }`

### 4. `useAIConnection.js`
- **Purpose**: Manages live AI state indicators (`live`, `offline`, `analyzing`, `tool_executing`) and tool step labels.

## Utilities

### 1. `haptics.js`
- **Purpose**: Safe tactile vibrations (`navigator.vibrate`) for key mobile interactions (`success`, `warning`, `error`, `light`).

### 2. `aiPushService.js`
- **Purpose**: Web Push Notification permission requester, VAPID subscription manager, event taxonomy catalog, and deep-link context routing.
