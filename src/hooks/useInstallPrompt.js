import { useEffect, useState, useCallback } from 'react';

export function isStandalone() {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

// Identifies the browser+OS combination closely enough to give accurate,
// browser-specific "add to home screen" instructions.
export function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);

  if (isIOS) {
    if (/CriOS/.test(ua)) return 'ios-chrome';
    if (/FxiOS/.test(ua)) return 'ios-firefox';
    if (/EdgiOS/.test(ua)) return 'ios-edge';
    return 'ios-safari';
  }
  if (isAndroid) {
    if (/SamsungBrowser/.test(ua)) return 'android-samsung';
    if (/Firefox/.test(ua)) return 'android-firefox';
    if (/Chrome/.test(ua)) return 'android-chrome';
    return 'android-other';
  }
  if (/Edg\//.test(ua)) return 'desktop-edge';
  if (/Chrome\//.test(ua)) return 'desktop-chrome';
  if (/Firefox\//.test(ua)) return 'desktop-firefox';
  if (/Safari\//.test(ua)) return 'desktop-safari';
  return 'desktop-other';
}

// Manages the native install-prompt lifecycle (Chrome/Edge/Android) and exposes
// enough state for a UI to fall back to manual instructions everywhere else.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    const onBeforeInstall = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canAutoInstall = !!deferredPrompt;

  const handleClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setInstalled(true);
      } catch { /* ignore */ }
      setDeferredPrompt(null);
    } else {
      setInstructionsOpen(true);
    }
  }, [deferredPrompt]);

  return {
    visible: !installed,
    canAutoInstall,
    platform,
    instructionsOpen,
    closeInstructions: () => setInstructionsOpen(false),
    handleClick,
  };
}
