import type { Note } from '@/store/app-store';

const DB_NAME = 'voicemind';
const DB_VERSION = 1;

const STORES = {
  notes: 'notes',
  audio: 'audio',
  config: 'config',
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.notes)) {
        db.createObjectStore(STORES.notes, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.audio)) {
        db.createObjectStore(STORES.audio, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.config)) {
        db.createObjectStore(STORES.config, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Serializable note (Date → string for IndexedDB)
interface SerializedNote extends Omit<Note, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

function serialize(note: Note): SerializedNote {
  return {
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function deserialize(data: SerializedNote): Note {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

// ── Notes ──

export async function saveNote(note: Note): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.notes, 'readwrite');
  tx.objectStore(STORES.notes).put(serialize(note));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await openDB();
  const tx = db.transaction(STORES.notes, 'readonly');
  const req = tx.objectStore(STORES.notes).getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const notes = (req.result as SerializedNote[]).map(deserialize);
      notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      resolve(notes);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNoteById(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORES.notes, STORES.audio], 'readwrite');
  tx.objectStore(STORES.notes).delete(id);
  tx.objectStore(STORES.audio).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Audio Blobs ──

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.audio, 'readwrite');
  tx.objectStore(STORES.audio).put({ id, blob });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  const tx = db.transaction(STORES.audio, 'readonly');
  const req = tx.objectStore(STORES.audio).get(id);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ── Config ──

export type AsrEngine = 'whisperx' | 'qwen3';

export type AsrEngineMap = Record<string, AsrEngine>;

export const DEFAULT_ASR_ENGINE_MAP: AsrEngineMap = {
  thoughts: 'qwen3',
  meeting: 'whisperx',
  lecture: 'qwen3',
  interview: 'whisperx',
  journal: 'qwen3',
};

export interface AppConfig {
  apiEndpoint: string;
  apiKey: string;
  selectedModel: string;
  whisperxEndpoint: string;
  asrEngineMap: AsrEngineMap;
  qwenAsrEndpoint: string;
  speakerNames: Record<string, Record<string, string>>; // noteId → { speakerKey: name }
}

const DEFAULT_CONFIG: AppConfig = {
  apiEndpoint: '',
  apiKey: '',
  selectedModel: 'gemini-2.5-pro',
  whisperxEndpoint: '/api/transcribe',
  asrEngineMap: { ...DEFAULT_ASR_ENGINE_MAP },
  qwenAsrEndpoint: '/api/transcribe-qwen',
  speakerNames: {},
};

export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.config, 'readwrite');
  const store = tx.objectStore(STORES.config);
  for (const [key, value] of Object.entries(config)) {
    store.put({ key, value });
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadConfig(): Promise<AppConfig> {
  const db = await openDB();
  const tx = db.transaction(STORES.config, 'readonly');
  const req = tx.objectStore(STORES.config).getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const result = { ...DEFAULT_CONFIG };
      for (const item of req.result) {
        (result as Record<string, unknown>)[item.key] = item.value;
      }
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Export Helpers ──

export function exportToMarkdown(note: Note, speakerNames?: Record<string, string>): string {
  const lines: string[] = [];
  lines.push(`# ${note.title}`);
  lines.push('');
  lines.push(`> ${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(note.createdAt)}`);
  lines.push('');

  if (note.summary) {
    lines.push('## 摘要');
    lines.push('');
    lines.push(note.summary);
    lines.push('');
  }

  if (note.keyPoints.length > 0) {
    lines.push('## 关键要点');
    lines.push('');
    note.keyPoints.forEach(p => lines.push(`- ${p}`));
    lines.push('');
  }

  if (note.actionItems.length > 0) {
    lines.push('## 待办事项');
    lines.push('');
    note.actionItems.forEach(a => lines.push(`- [ ] ${a}`));
    lines.push('');
  }

  lines.push('## 转录内容');
  lines.push('');

  if (note.segments.length > 0 && note.speakerCount > 1) {
    for (const seg of note.segments) {
      const name = speakerNames?.[seg.speaker || ''] || `说话人 ${parseInt((seg.speaker || 'SPEAKER_00').replace('SPEAKER_', '')) + 1}`;
      const ts = formatTS(seg.start);
      lines.push(`**[${ts}] ${name}:** ${seg.text}`);
      lines.push('');
    }
  } else {
    lines.push(note.content);
  }

  return lines.join('\n');
}

export function exportToSRT(note: Note, speakerNames?: Record<string, string>): string {
  if (note.segments.length === 0) return '';
  return note.segments.map((seg, i) => {
    const name = speakerNames?.[seg.speaker || ''] || `Speaker ${parseInt((seg.speaker || 'SPEAKER_00').replace('SPEAKER_', '')) + 1}`;
    const start = formatSRTTime(seg.start);
    const end = formatSRTTime(seg.end);
    const prefix = note.speakerCount > 1 ? `[${name}] ` : '';
    return `${i + 1}\n${start} --> ${end}\n${prefix}${seg.text}\n`;
  }).join('\n');
}

export function exportToJSON(note: Note): string {
  return JSON.stringify(note, null, 2);
}

function formatTS(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function formatSRTTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// ===== P2-8: Recording Draft Persistence =====

export interface RecordingDraft {
  id: string;   // always 'current-draft'
  chunks: Blob[];
  mode: string;
  template: string;
  elapsedTime: number;
  savedAt: string;
}

export async function saveRecordingDraft(draft: Omit<RecordingDraft, 'id'>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.config, 'readwrite');
  tx.objectStore(STORES.config).put({ key: 'recording-draft', ...draft, id: 'recording-draft' });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRecordingDraft(): Promise<RecordingDraft | null> {
  const db = await openDB();
  const tx = db.transaction(STORES.config, 'readonly');
  const req = tx.objectStore(STORES.config).get('recording-draft');
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearRecordingDraft(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.config, 'readwrite');
  tx.objectStore(STORES.config).delete('recording-draft');
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
