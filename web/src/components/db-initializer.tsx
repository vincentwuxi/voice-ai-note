'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export default function DBInitializer() {
  const { loadNotesFromDB, loadConfigFromDB, setTheme } = useAppStore();

  useEffect(() => {
    loadConfigFromDB();
    loadNotesFromDB();

    // Restore theme from localStorage
    try {
      const saved = localStorage.getItem('voicemind-theme') as 'dark' | 'light' | 'system' | null;
      if (saved) setTheme(saved);
    } catch {}
  }, [loadConfigFromDB, loadNotesFromDB, setTheme]);

  return null;
}
