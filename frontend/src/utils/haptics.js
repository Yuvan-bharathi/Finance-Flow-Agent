/**
 * Utility: Haptic Feedback System
 * 
 * Purpose:
 *   Provides subtle tactile haptic feedback on mobile devices for key user actions:
 *   - Success confirmations (e.g. human-in-the-loop action confirmed)
 *   - Warnings (e.g. critical risk alerts, offline action blocked)
 *   - Errors (e.g. mutation failed)
 *   - Light tap feedback for voice input toggle
 * 
 * Security & Reliability:
 *   Gracefully fails silently if navigator.vibrate is not supported (e.g. desktop browsers, iOS Safari restrictions).
 */

export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'success':
        // Double short pulse: 40ms pulse, 60ms gap, 40ms pulse
        navigator.vibrate([40, 60, 40]);
        break;
      case 'warning':
        // Moderate alert vibration: 70ms pulse, 50ms gap, 70ms pulse
        navigator.vibrate([70, 50, 70]);
        break;
      case 'error':
        // Long error pulse: 120ms pulse
        navigator.vibrate([120]);
        break;
      case 'light':
      default:
        // Subtle micro-tap: 25ms pulse
        navigator.vibrate(25);
        break;
    }
  } catch {
    // Ignore any device-level vibration restriction errors
  }
};

export default triggerHaptic;
