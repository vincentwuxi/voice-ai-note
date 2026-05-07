'use client';

import { useEffect } from 'react';

/**
 * Registers the Service Worker for PWA offline support.
 * Only registers in production (non-localhost) to avoid dev conflicts.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register SW after page load to avoid blocking render
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered, scope:', reg.scope);

          // Check for updates periodically (every 60 min)
          setInterval(() => reg.update(), 60 * 60 * 1000);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }, []);

  return null;
}
