'use client';

import { create } from 'zustand';
import { saveNote, getAllNotes, deleteNoteById, saveConfig, loadConfig, AsrEngine, AsrEngineMap, DEFAULT_ASR_ENGINE_MAP, saveAudioBlob } from '@/services/db';

export type RecordingMode = 'thoughts' | 'meeting' | 'lecture' | 'interview' | 'journal';
export type NoteTag = 'inspiration' | 'project' | 'personal' | 'reading' | 'design';
export type AITemplate = 'meeting' | 'reading' | 'brainstorm' | 'interview' | 'journal' | 'auto';

// Sync note to D1 cloud — updates syncStatus in store
function syncNoteToCloud(note: Note) {
  fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note: {
        ...note,
        createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
        updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
      }
    }),
  }).then(res => {
    if (res.ok) {
      useAppStore.getState().markSynced(note.id);
    } else {
      useAppStore.getState().markSyncFailed(note.id);
    }
  }).catch(() => {
    useAppStore.getState().markSyncFailed(note.id);
  });
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'failed' | 'local';

export interface Note {
  id: string;
  title: string;
  content: string;
  translatedContent?: string;    // LLM-translated transcript (e.g. EN→ZH)
  translatedSegments?: TranscriptSegment[];  // Segment-level translation (preserves speaker view)
  targetLanguage?: string;       // Translation target language code (e.g. 'zh')
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  tags: NoteTag[];
  mode: RecordingMode;
  duration: number;
  audioUrl?: string;
  segments: TranscriptSegment[];
  speakerCount: number;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
  isProcessing: boolean;
  syncStatus?: SyncStatus;
  completedTodos?: number[];
}

export const AI_TEMPLATES: Record<AITemplate, { label: string; icon: string; prompt: string }> = {
  auto: {
    label: '自动识别',
    icon: '🤖',
    prompt: `你是一位智能笔记助理。请分析以下语音转录内容，自动判断最合适的处理方式，并提取：
1. 标题（简洁概括内容主题）
2. 摘要（2-3 句话概括核心内容）
3. 关键要点（列出 3-6 个关键信息点）
4. 待办事项（如有提到的行动项）
请以 JSON 格式返回：{"title": "...", "summary": "...", "keyPoints": ["..."], "actionItems": ["..."]}`,
  },
  meeting: {
    label: '会议纪要',
    icon: '🏢',
    prompt: `你是一位资深的企业会议记录秘书。请分析以下多人会议转录内容（可能包含多个说话人标签如【说话人 1】【说话人 2】等），并生成专业的会议纪要：

1. **会议标题** — 简洁概括会议核心议题
2. **会议摘要** — 按以下结构组织（用 Markdown 格式）：
   - 📋 **参会人**：从说话人标签推断参与人数和角色（如「共 N 位参会者」）
   - 🎯 **会议目的**：本次会议要解决什么问题
   - 💬 **核心讨论**：主要讨论的 2-3 个议题及结论
   - ✅ **关键决策**：达成的具体决定
   - ⚠️ **分歧/风险**：未达成共识的点或潜在风险（如有）
3. **关键要点** — 按重要程度排列，每条标注类型前缀：
   - 【决策】已确定的事项
   - 【共识】达成一致的观点
   - 【待议】需要后续讨论的问题
   - 【洞察】值得关注的深层发现
4. **待办事项** — 每条格式：「任务内容 → 负责人（如能推断）→ 截止时间（如有提及）」

请以 JSON 格式返回：{"title": "...", "summary": "...", "keyPoints": ["..."], "actionItems": ["..."]}`,
  },
  reading: {
    label: '读书笔记',
    icon: '📚',
    prompt: `你是一位读书笔记整理专家。请分析以下口述读书感悟，提取：
1. 标题（书名 + 核心主题）
2. 摘要（作者核心观点 + 我的理解）
3. 关键要点（核心论点 | 启发思考 | 可应用场景）
4. 待办事项（延伸阅读 | 实践计划）
请以 JSON 格式返回：{"title": "...", "summary": "...", "keyPoints": ["..."], "actionItems": ["..."]}`,
  },
  brainstorm: {
    label: '头脑风暴',
    icon: '💡',
    prompt: `你是一位创意整理师。请分析以下头脑风暴录音，提取：
1. 标题（创意主题）
2. 摘要（核心创意方向和可能性）
3. 关键要点（创意列表 + 初步可行性 + 创新亮点）
4. 待办事项（需要验证的想法 | 需要调研的方向 | 下一步行动）
请以 JSON 格式返回：{"title": "...", "summary": "...", "keyPoints": ["..."], "actionItems": ["..."]}`,
  },
  interview: {
    label: '访谈记录',
    icon: '🎤',
    prompt: `你是一位资深访谈记录专家。请分析以下访谈转录内容（可能包含多个说话人标签如【说话人 1】【说话人 2】等），并生成专业的访谈记录：

1. **访谈标题** — 「受访者/主题 + 访谈核心发现」
2. **访谈摘要** — 按以下结构组织（用 Markdown 格式）：
   - 🎙️ **访谈概况**：参与者角色（采访者/受访者）、主题背景
   - 💎 **核心发现**：3-5 个最重要的洞察
   - 📌 **金句摘录**：2-3 句受访者原话（保持原文不修改）
3. **关键要点** — 按以下类型标注：
   - 【观点】受访者的核心观点
   - 【事实】提到的具体数据或事实
   - 【洞察】深层洞察或行业趋势
   - 【故事】值得记录的个人经历或案例
4. **待办事项** — 访谈后续：「跟进问题 | 待验证事实 | 后续行动」

请以 JSON 格式返回：{"title": "...", "summary": "...", "keyPoints": ["..."], "actionItems": ["..."]}`,
  },
  journal: {
    label: '日记/反思',
    icon: '✍️',
    prompt: `你是一位个人成长教练。请分析以下口述日记/反思，温暖地提取：
1. 标题（当日/当刻的核心主题）
2. 摘要（情绪状态 + 核心事件 + 感悟）
3. 关键要点（值得记住的瞬间 | 情绪变化 | 成长洞察）
4. 待办事项（明日计划 | 想改进的方面 | 感恩事项）
请以 JSON 格式返回：{"title": "...", "summary": "...", "keyPoints": ["..."], "actionItems": ["..."]}`,
  },
};

// Map recording modes to default templates
export const MODE_TEMPLATE_MAP: Record<RecordingMode, AITemplate> = {
  thoughts: 'auto',
  meeting: 'meeting',
  lecture: 'reading',
  interview: 'interview',
  journal: 'journal',
};

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
