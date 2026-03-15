'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export default function DBInitializer() {
  const { loadNotesFromDB, loadConfigFromDB } = useAppStore();

  useEffect(() => {
    loadConfigFromDB();
    loadNotesFromDB();
  }, [loadConfigFromDB, loadNotesFromDB]);

  return null;
}
