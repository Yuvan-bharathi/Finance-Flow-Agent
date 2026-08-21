# FinanceFlow AI — PWA Setup & Installation Guide

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm v9+
- **Frontend Stack**: React 19 + Vite 8
- **PWA Tooling**: `vite-plugin-pwa` with Workbox runtime engine

---

## 2. Installation & Setup Instructions

### 2.1 Install Dependencies
From the `frontend/` directory, install all required dependencies including `vite-plugin-pwa`:

```bash
cd frontend
npm install
npm install -D vite-plugin-pwa
```

### 2.2 Development Environment
To run the PWA in local development mode:

```bash
npm run dev
```

In development, VitePWA operates with `devOptions.enabled: true`, allowing testing of Service Worker registration and Web App Manifest generation in modern browsers at `http://localhost:5173`.

### 2.3 Production Build & Verification
To compile the optimized production bundle with full manifest generation and service worker compilation:

```bash
npm run build
```

This generates the complete distribution folder in `frontend/dist/` containing:
- `manifest.webmanifest`: PWA metadata, theme colors, icons, and start parameters.
- `sw.js`: Workbox-powered service worker script.
- `registerSW.js`: Browser service worker registration script.

To preview the built production PWA locally:

```bash
npm run preview
```

---

## 3. Installing FinanceFlow AI on Devices

### 3.1 Desktop (Google Chrome / Microsoft Edge / Brave)
1. Open the application in the browser (`http://localhost:5173` or production URL).
2. Look for the **"Install App"** button in the top navigation header or sidebar footer, or click the native install icon in the browser address bar.
3. Click **Install**.
4. FinanceFlow AI will open in an independent, distraction-free desktop window with custom branding and dock integration.

### 3.2 Mobile Devices (Android / Chrome)
1. Navigate to the application URL in mobile Chrome.
2. A bottom install prompt or Header **Install App** button will be displayed.
3. Tap **Install App** or tap Chrome menu (⋮) -> **Install app** / **Add to Home screen**.
4. The FinanceFlow AI app icon will be added to your home screen and app drawer.

### 3.3 Apple iOS (Safari)
1. Open the application in Safari.
2. Tap the **Share** button (box with an upward arrow) in the Safari toolbar.
3. Scroll down and select **Add to Home Screen**.
4. Confirm by tapping **Add**.
5. Launch FinanceFlow AI directly from the Home Screen with standalone status-bar mode.

---

## 4. Browser Compatibility Matrix

| Platform / Browser | PWA Standalone Mode | Service Worker Caching | Voice AI (Speech Recognition) | Web Push Notifications |
|---|---|---|---|---|
| **Chrome (Desktop/Android)** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Edge (Windows/macOS)** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Brave** | ✅ Full | ✅ Full | ✅ Full | ✅ Full (Shields perm required) |
| **Safari (iOS 16.4+)** | ✅ Full | ✅ Full | ✅ Full | ✅ Full (Requires Home Screen install) |
| **Firefox** | ⚠️ Partial (Add-on) | ✅ Full | ⚠️ Flag required | ✅ Full |
