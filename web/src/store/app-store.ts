'use client';

import { create } from 'zustand';
import { saveNote, getAllNotes, deleteNoteById, saveConfig, loadConfig, AsrEngine, AsrEngineMap, DEFAULT_ASR_ENGINE_MAP } from '@/services/db';

// Re-export domain types and AI templates from slices
export type { RecordingMode, NoteTag, AITemplate, SyncStatus, TranscriptSegment, Note } from './types';
export { AI_TEMPLATES, MODE_TEMPLATE_MAP } from './ai-templates';

import type { RecordingMode, NoteTag, AITemplate, Note, SyncStatus } from './types';
import { MODE_TEMPLATE_MAP } from './ai-templates';

// Sync note to D1 cloud — with exponential backoff retry (max 3 attempts)
async function syncNoteToCloud(note: Note, attempt = 0) {
  const MAX_RETRIES = 3;
  const BACKOFF_BASE_MS = 1000;

  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note: {
          ...note,
          createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
          updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
        }
      }),
    });

    if (res.ok) {
      useAppStore.getState().markSynced(note.id);
    } else if (attempt < MAX_RETRIES) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.warn(`[Sync] Attempt ${attempt + 1} failed (${res.status}), retrying in ${delay}ms...`);
      setTimeout(() => syncNoteToCloud(note, attempt + 1), delay);
    } else {
      console.error(`[Sync] All ${MAX_RETRIES} attempts failed for note ${note.id}`);
      useAppStore.getState().markSyncFailed(note.id);
    }
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.warn(`[Sync] Network error on attempt ${attempt + 1}, retrying in ${delay}ms...`, err);
      setTimeout(() => syncNoteToCloud(note, attempt + 1), delay);
    } else {
      console.error(`[Sync] All ${MAX_RETRIES} attempts failed for note ${note.id}`, err);
      useAppStore.getState().markSyncFailed(note.id);
    }
  }
}

interface AppState {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Recording
  isRecording: boolean;
  isPaused: boolean;
  recordingMode: RecordingMode;
  elapsedTime: number;
  liveTranscript: string;
  selectedTemplate: AITemplate;
  setRecordingMode: (mode: RecordingMode) => void;
  setIsRecording: (val: boolean) => void;
  setIsPaused: (val: boolean) => void;
  setElapsedTime: (time: number) => void;
  setLiveTranscript: (text: string) => void;
  setSelectedTemplate: (t: AITemplate) => void;

  // Notes
  notes: Note[];
  selectedNoteId: string | null;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setSelectedNoteId: (id: string | null) => void;
  loadNotesFromDB: () => Promise<void>;
  markSynced: (id: string) => void;
  markSyncFailed: (id: string) => void;

  // Speaker Names (noteId → { SPEAKER_00: "张总", ... })
  speakerNames: Record<string, Record<string, string>>;
  setSpeakerName: (noteId: string, speakerKey: string, name: string) => void;

  // API Config
  apiEndpoint: string;
  apiKey: string;
  selectedModel: string;
  whisperxEndpoint: string;
  asrEngineMap: AsrEngineMap;
  qwenAsrEndpoint: string;
  setApiEndpoint: (url: string) => void;
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setWhisperxEndpoint: (url: string) => void;
  setAsrEngineForMode: (mode: RecordingMode, engine: AsrEngine) => void;
  setQwenAsrEndpoint: (url: string) => void;
  loadConfigFromDB: () => Promise<void>;

  // Filter
  activeTagFilter: NoteTag | 'all';
  setActiveTagFilter: (tag: NoteTag | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Theme
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  // Hydrated
  isHydrated: boolean;
}



export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeTab: 'record',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Theme
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    try { localStorage.setItem('voicemind-theme', theme); } catch {}
  },

  // Recording
  isRecording: false,
  isPaused: false,
  recordingMode: 'thoughts',
  elapsedTime: 0,
  liveTranscript: '',
  selectedTemplate: 'auto',
  setRecordingMode: (mode) => {
    set({ recordingMode: mode, selectedTemplate: MODE_TEMPLATE_MAP[mode] });
  },
  setIsRecording: (val) => set({ isRecording: val }),
  setIsPaused: (val) => set({ isPaused: val }),
  setElapsedTime: (time) => set({ elapsedTime: time }),
  setLiveTranscript: (text) => set({ liveTranscript: text }),
  setSelectedTemplate: (t) => set({ selectedTemplate: t }),

  // Notes
  notes: [],
  selectedNoteId: null,
  addNote: (note) => {
    const n = { ...note, syncStatus: 'syncing' as SyncStatus };
    set((s) => ({ notes: [n, ...s.notes] }));
    saveNote(n).catch(console.error);
    syncNoteToCloud(n);
  },
  updateNote: (id, updates) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, syncStatus: 'syncing' as SyncStatus } : n)),
    }));
    const updated = get().notes.find(n => n.id === id);
    if (updated) {
      saveNote(updated).catch(console.error);
      syncNoteToCloud(updated);
    }
  },
  deleteNote: (id) => {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    deleteNoteById(id).catch(console.error);
    fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(console.warn);
    fetch(`/api/audio/${id}`, { method: 'DELETE' }).catch(console.warn);
  },
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  markSynced: (id) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, syncStatus: 'synced' as SyncStatus } : n)),
    }));
  },
  markSyncFailed: (id) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, syncStatus: 'failed' as SyncStatus } : n)),
    }));
  },
  loadNotesFromDB: async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const { notes: cloudNotes } = await res.json();
        if (cloudNotes && cloudNotes.length > 0) {
          const parsed = cloudNotes.map((n: Record<string, unknown>) => ({
            ...n,
            createdAt: new Date(n.createdAt as string),
            updatedAt: new Date(n.updatedAt as string),
            syncStatus: 'synced' as SyncStatus,
          }));
          set({ notes: parsed, isHydrated: true });
          for (const note of parsed) { saveNote(note).catch(() => {}); }
          return;
        }
      }
    } catch { /* fallback */ }
    try {
      const dbNotes = await getAllNotes();
      set({ notes: dbNotes.map(n => ({ ...n, syncStatus: 'local' as SyncStatus })), isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  // Speaker Names
  speakerNames: {},
  setSpeakerName: (noteId, speakerKey, name) => {
    set((s) => {
      const noteNames = { ...(s.speakerNames[noteId] || {}), [speakerKey]: name };
      const newNames = { ...s.speakerNames, [noteId]: noteNames };
      saveConfig({ speakerNames: newNames }).catch(console.error);
      return { speakerNames: newNames };
    });
  },

  // API Config
  apiEndpoint: '',
  apiKey: '',
  selectedModel: 'gemini-2.5-pro',
  whisperxEndpoint: '/api/transcribe',
  asrEngineMap: { ...DEFAULT_ASR_ENGINE_MAP },
  qwenAsrEndpoint: '/api/transcribe-qwen',
  setApiEndpoint: (url) => { set({ apiEndpoint: url }); saveConfig({ apiEndpoint: url }).catch(console.error); },
  setApiKey: (key) => { set({ apiKey: key }); saveConfig({ apiKey: key }).catch(console.error); },
  setSelectedModel: (model) => { set({ selectedModel: model }); saveConfig({ selectedModel: model }).catch(console.error); },
  setWhisperxEndpoint: (url) => { set({ whisperxEndpoint: url }); saveConfig({ whisperxEndpoint: url }).catch(console.error); },
  setAsrEngineForMode: (mode, engine) => {
    set((s) => {
      const newMap = { ...s.asrEngineMap, [mode]: engine };
      saveConfig({ asrEngineMap: newMap }).catch(console.error);
      return { asrEngineMap: newMap };
    });
  },
  setQwenAsrEndpoint: (url) => { set({ qwenAsrEndpoint: url }); saveConfig({ qwenAsrEndpoint: url }).catch(console.error); },
  loadConfigFromDB: async () => {
    try {
      const config = await loadConfig();
      set({
        apiEndpoint: config.apiEndpoint,
        apiKey: config.apiKey,
        selectedModel: config.selectedModel,
        whisperxEndpoint: config.whisperxEndpoint,
        asrEngineMap: config.asrEngineMap || { ...DEFAULT_ASR_ENGINE_MAP },
        qwenAsrEndpoint: config.qwenAsrEndpoint || '/api/transcribe-qwen',
        speakerNames: config.speakerNames || {},
      });
    } catch { /* use defaults */ }
  },

  // Filter
  activeTagFilter: 'all',
  setActiveTagFilter: (tag) => set({ activeTagFilter: tag }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Hydrated
  isHydrated: false,
}));
