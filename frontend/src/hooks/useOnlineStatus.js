import { useState, useEffect } from 'react';

/**
 * Custom Hook: useOnlineStatus
 * 
 * Purpose:
 *   Tracks real-time network connectivity status across the application.
 *   Provides instant online/offline state updates and tracks reconnection transitions
 *   to trigger "Connection restored" confirmation toasts.
 * 
 * Parameters: None
 * 
 * Data Source:
 *   Browser Window events ('online', 'offline') and navigator.onLine API.
 * 
 * Returns:
 *   {
 *     isOnline: boolean - True if connected to internet/backend
 *     wasOffline: boolean - True briefly after recovering from an offline state
 *     dismissRestoredToast: () => void - Manually dismiss restored toast
 *   }
 * 
 * Security Considerations:
 *   Used to gate financial write operations (reconciliation approvals, rejections,
 *   manual ingestion, loan updates), AI agent executions, and AI Copilot requests.
 *   Prevents execution of financial mutations while disconnected.
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });

  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let timerId = null;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Auto-clear "Connection restored" alert after 4 seconds
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        setWasOffline(false);
      }, 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
      if (timerId) clearTimeout(timerId);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const dismissRestoredToast = () => setWasOffline(false);

  return { isOnline, wasOffline, dismissRestoredToast };
};

export default useOnlineStatus;
