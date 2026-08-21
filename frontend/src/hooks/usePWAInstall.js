import { useState, useEffect } from 'react';

/**
 * Custom Hook: usePWAInstall
 * 
 * Purpose:
 *   Detects browser PWA installability and manages the native install prompt lifecycle.
 *   Provides reactive flags and a trigger function for in-app "Install FinanceFlow AI" buttons.
 * 
 * Parameters: None
 * 
 * Data Source:
 *   Window 'beforeinstallprompt' and 'appinstalled' events, matchMedia display-mode check.
 * 
 * Returns:
 *   {
 *     isInstallable: boolean - True if browser prompt is available
 *     isInstalled: boolean - True if app is running in standalone mode or already installed
 *     promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'> - Triggers browser prompt
 *   }
 * 
 * Security Considerations:
 *   Native browser install API ensures secure, sandboxed installation without arbitrary execution.
 */
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent automatic browser mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return 'unavailable';
    }
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.error('Error during PWA installation prompt:', err);
      return 'dismissed';
    }
  };

  return { isInstallable, isInstalled, promptInstall };
};

export default usePWAInstall;
