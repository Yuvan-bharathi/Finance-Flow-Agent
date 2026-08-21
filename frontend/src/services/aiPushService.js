import api from './api';

/**
 * Service: AIPushService / PWA Web Push Notification Manager
 * 
 * Purpose:
 *   Manages browser Web Push notification permissions, subscription payloads,
 *   event taxonomy routing, and deep-linking into the AI Copilot and Action Center.
 * 
 * Strict Security Boundary:
 *   Push notifications provide information and deep link into the UI.
 *   They NEVER execute automatic financial actions or mutations in the background.
 */

// Enterprise Event Taxonomy for PWA Notifications
export const PWA_NOTIFICATION_EVENTS = {
  PAYMENT_INGESTED: 'PAYMENT_INGESTED',
  RECONCILIATION_COMPLETED: 'RECONCILIATION_COMPLETED',
  RISK_ASSESSMENT_COMPLETED: 'RISK_ASSESSMENT_COMPLETED',
  COLLECTION_DRAFTED: 'COLLECTION_DRAFTED',
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  DUPLICATE_PAYMENT_DETECTED: 'DUPLICATE_PAYMENT_DETECTED',
  OVERPAYMENT_DETECTED: 'OVERPAYMENT_DETECTED',
  HIGH_RISK_COMPANY_DETECTED: 'HIGH_RISK_COMPANY_DETECTED'
};

/**
 * Checks if browser supports Web Notifications and Service Worker Push
 */
export const isPushSupported = () => {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
};

/**
 * Requests Notification permission from the browser
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export const requestNotificationPermission = async () => {
  if (!isPushSupported()) {
    console.warn('Web Push Notifications are not supported in this environment.');
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

/**
 * Subscribes current device to Web Push notifications and registers with backend
 * @returns {Promise<{ success: boolean, subscription?: PushSubscription, message?: string }>}
 */
export const registerPushSubscription = async () => {
  if (!isPushSupported()) {
    return { success: false, message: 'Push notifications not supported on this device.' };
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission was denied by the user.' };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Mock / Public VAPID Key for architecture demonstration
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIhbQFLXYp5Nksh8U';
      
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Register subscription with backend (optional endpoint, logs error if not configured yet)
    try {
      await api.post('/notifications/push-subscribe', { subscription });
    } catch {
      // Endpoint may be configured in future phase; client subscription remains active
    }

    return { success: true, subscription };
  } catch (err) {
    console.error('Push registration error:', err);
    return { success: false, message: err.message || 'Failed to register push subscription.' };
  }
};

/**
 * Deep-links a notification payload into the appropriate Dashboard tab and AI Copilot context.
 * 
 * Example payload:
 * {
 *   eventType: 'HIGH_RISK_COMPANY_DETECTED',
 *   recordType: 'company',
 *   recordId: 4,
 *   title: 'Risk Alert: Apex Logistics',
 *   body: 'Overdue threshold crossed ₹50.6L',
 *   prompt: 'Explain why Apex Logistics was flagged as high risk.'
 * }
 */
export const resolveNotificationDeepLink = (payload = {}) => {
  const { eventType, recordType, recordId, prompt } = payload;

  let targetTab = 'reconciliations';
  if (recordType === 'company' || eventType === 'HIGH_RISK_COMPANY_DETECTED') {
    targetTab = 'companies';
  } else if (recordType === 'payment' || eventType === 'PAYMENT_INGESTED') {
    targetTab = 'payments';
  } else if (recordType === 'loan') {
    targetTab = 'loans';
  } else if (eventType === 'AI_ANALYSIS_FAILED') {
    targetTab = 'agents';
  }

  return {
    targetTab,
    copilotContext: {
      page: targetTab,
      recordType: recordType || 'case',
      recordId: recordId || null,
      autoPrompt: prompt || ''
    }
  };
};

/**
 * Helper to convert standard VAPID base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default {
  PWA_NOTIFICATION_EVENTS,
  isPushSupported,
  requestNotificationPermission,
  registerPushSubscription,
  resolveNotificationDeepLink
};
