'use client';

import { create } from 'zustand';
import { saveNote, getAllNotes, deleteNoteById, saveConfig, loadConfig, saveAudioBlob } from '@/services/db';

export type RecordingMode = 'thoughts' | 'meeting' | 'lecture' | 'interview' | 'journal';
export type NoteTag = 'inspiration' | 'project' | 'personal' | 'reading' | 'design';
export type AITemplate = 'meeting' | 'reading' | 'brainstorm' | 'interview' | 'journal' | 'auto';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
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
    prompt: `你是一位专业的会议记录助理。请分析以下多人会议转录内容，并提取：
1. 会议标题（简洁概括会议主题）
2. 会议摘要（含核心讨论内容、决策结论）
3. 关键要点（包括：议题 | 决策 | 分歧点 | 共识）
4. 待办事项（每项含：任务内容、负责人（如能推断）、截止时间（如有提及））
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
    prompt: `你是一位访谈记录专家。请分析以下访谈转录，提取：
1. 标题（访谈主题 + 受访者）
2. 摘要（访谈核心发现和关键洞察）
3. 关键要点（重要观点 | 原话引用 | 深层洞察）
4. 待办事项（跟进问题 | 后续行动）
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

  // Speaker Names (noteId → { SPEAKER_00: "张总", ... })
  speakerNames: Record<string, Record<string, string>>;
  setSpeakerName: (noteId: string, speakerKey: string, name: string) => void;

  // API Config
  apiEndpoint: string;
  apiKey: string;
  selectedModel: string;
  whisperxEndpoint: string;
  setApiEndpoint: (url: string) => void;
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setWhisperxEndpoint: (url: string) => void;
  loadConfigFromDB: () => Promise<void>;

  // Filter
  activeTagFilter: NoteTag | 'all';
  setActiveTagFilter: (tag: NoteTag | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Hydrated
  isHydrated: boolean;
}



export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeTab: 'record',
  setActiveTab: (tab) => set({ activeTab: tab }),

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
    set((s) => ({ notes: [note, ...s.notes] }));
    saveNote(note).catch(console.error);
  },
  updateNote: (id, updates) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
    // Persist to IndexedDB
    const updated = get().notes.find(n => n.id === id);
    if (updated) saveNote(updated).catch(console.error);
  },
  deleteNote: (id) => {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    deleteNoteById(id).catch(console.error);
  },
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  loadNotesFromDB: async () => {
    try {
      const dbNotes = await getAllNotes();
      set({ notes: dbNotes, isHydrated: true });
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
  setApiEndpoint: (url) => { set({ apiEndpoint: url }); saveConfig({ apiEndpoint: url }).catch(console.error); },
  setApiKey: (key) => { set({ apiKey: key }); saveConfig({ apiKey: key }).catch(console.error); },
  setSelectedModel: (model) => { set({ selectedModel: model }); saveConfig({ selectedModel: model }).catch(console.error); },
  setWhisperxEndpoint: (url) => { set({ whisperxEndpoint: url }); saveConfig({ whisperxEndpoint: url }).catch(console.error); },
  loadConfigFromDB: async () => {
    try {
      const config = await loadConfig();
      set({
        apiEndpoint: config.apiEndpoint,
        apiKey: config.apiKey,
        selectedModel: config.selectedModel,
        whisperxEndpoint: config.whisperxEndpoint,
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
