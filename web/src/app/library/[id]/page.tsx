'use client';

import { use, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Share2, Download, Square, CheckSquare, Pencil, Users, Mic, FileText, FileJson, Subtitles, Edit3, Check, X, Plus, Trash2, RefreshCw, Loader2, RotateCcw, Languages } from 'lucide-react';
import { useAppStore, NoteTag, AI_TEMPLATES, AITemplate } from '@/store/app-store';
import { getAudioBlob, exportToMarkdown, exportToSRT, exportToJSON } from '@/services/db';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import SpeakerSegmentView from '@/components/speaker-segment-view';

const tagConfig: Record<NoteTag, { label: string; color: string; bgColor: string }> = {
  inspiration: { label: '灵感', color: 'var(--color-tag-amber)', bgColor: 'rgba(245, 158, 11, 0.15)' },
  project: { label: '项目', color: 'var(--color-tag-blue)', bgColor: 'rgba(59, 130, 246, 0.15)' },
  personal: { label: '个人', color: 'var(--color-tag-emerald)', bgColor: 'rgba(16, 185, 129, 0.15)' },
  reading: { label: '阅读', color: 'var(--color-tag-indigo)', bgColor: 'rgba(99, 102, 241, 0.15)' },
  design: { label: '设计', color: 'var(--color-tag-purple)', bgColor: 'rgba(139, 92, 246, 0.15)' },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}



export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { notes, speakerNames } = useAppStore();
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isResummarizing, setIsResummarizing] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editKeyPoints, setEditKeyPoints] = useState<string[]>([]);
  const [editActionItems, setEditActionItems] = useState<string[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Set<number>>(new Set());
  const [todosInitialized, setTodosInitialized] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const { updateNote, deleteNote } = useAppStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  const note = notes.find((n) => n.id === id);

  // Load audio: R2 (cloud) → IndexedDB (local) → note.audioUrl (session)
  useEffect(() => {
    if (!note || !audioRef.current) return;
    const audio = audioRef.current;
    
    // Try R2 cloud URL first
    const r2Url = `/api/audio/${id}`;
    fetch(r2Url, { method: 'HEAD' }).then(res => {
      if (res.ok) {
        audio.src = r2Url;
        return;
      }
      throw new Error('Not in R2');
    }).catch(() => {
      // Fallback: IndexedDB local cache
      getAudioBlob(id).then(blob => {
        if (blob) {
          audio.src = URL.createObjectURL(blob);
        } else if (note.audioUrl) {
          audio.src = note.audioUrl;
        }
      }).catch(() => {
        if (note.audioUrl) audio.src = note.audioUrl;
      });
    });
  }, [id, note]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) { audio.pause(); }
    else { audio.play().catch(() => {}); }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    audio.currentTime = time;
    if (!isPlaying) { audio.play().catch(() => {}); setIsPlaying(true); }
  }, [isPlaying]);

  // Update progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setPlayProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnd = () => { setIsPlaying(false); setPlayProgress(0); setCurrentTime(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); };
  }, []);

  // P1-6: Initialize completedTodos from persisted note data
  useEffect(() => {
    if (note && !todosInitialized) {
      setCompletedTodos(new Set(note.completedTodos || []));
      setTodosInitialized(true);
    }
  }, [note, todosInitialized]);

  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[var(--color-text-tertiary)]">笔记未找到</p>
      </div>
    );
  }

  const tag = note.tags[0];
  const config = tag ? tagConfig[tag] : null;
  const hasSegments = note.segments && note.segments.length > 0;
  const isMultiSpeaker = note.speakerCount > 1;
  const noteSpeakerNames = speakerNames[id] || {};

  const doExport = (format: 'md' | 'srt' | 'json') => {
    let content = '';
    let filename = '';
    let mime = '';

    if (format === 'md') {
      content = exportToMarkdown(note, noteSpeakerNames);
      filename = `${note.title}.md`;
      mime = 'text/markdown';
    } else if (format === 'srt') {
      content = exportToSRT(note, noteSpeakerNames);
      filename = `${note.title}.srt`;
      mime = 'text/srt';
    } else {
      content = exportToJSON(note);
      filename = `${note.title}.json`;
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const startEditing = () => {
    if (!note) return;
    setEditTitle(note.title);
    setEditSummary(note.summary);
    setEditKeyPoints([...note.keyPoints]);
    setEditActionItems([...note.actionItems]);
    setIsEditing(true);
  };

  const saveEdits = () => {
    updateNote(id, {
      title: editTitle,
      summary: editSummary,
      keyPoints: editKeyPoints.filter(p => p.trim()),
      actionItems: editActionItems.filter(a => a.trim()),
      updatedAt: new Date(),
    });
    setIsEditing(false);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleDelete = () => {
    deleteNote(id);
    router.push('/library');
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const resummarize = async (template: AITemplate) => {
    setShowTemplateSelector(false);
    if (!note || !note.content) return;
    setIsResummarizing(true);
    try {
      const { summarizeWithLLM } = await import('@/services/ai-service');
      const { getSharedLLMConfig } = await import('@/services/shared-config');
      const llmConfig = await getSharedLLMConfig();
      if (!llmConfig.apiEndpoint || !llmConfig.apiKey) {
        setFeedbackMsg({ text: '⚙️ 请先在管理后台配置 LLM API 密钥', type: 'error' });
        setTimeout(() => setFeedbackMsg(null), 4000);
        setIsResummarizing(false);
        return;
      }
      const result = await summarizeWithLLM(
        note.content, template, llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel
      );
      updateNote(id, {
        title: result.title,
        summary: result.summary,
        keyPoints: result.keyPoints,
        actionItems: result.actionItems,
        updatedAt: new Date(),
      });
    } catch (err) {
      setFeedbackMsg({ text: `❌ 重新摘要失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
    setIsResummarizing(false);
  };

  // ===== Re-transcribe: reload audio from storage and re-run ASR + LLM =====
  const retranscribe = async (forceEngine?: 'whisperx' | 'qwen3') => {
    if (!note) return;
    setIsRetranscribing(true);
    setFeedbackMsg({ text: '🎧 正在加载音频...', type: 'success' });

    try {
      // Step 1: Load audio blob from R2 or IndexedDB
      let audioBlob: Blob | null = null;

      // Try R2 first
      try {
        const r2Res = await fetch(`/api/audio/${id}`);
        if (r2Res.ok) {
          audioBlob = await r2Res.blob();
        }
      } catch { /* R2 unavailable */ }

      // Fallback to IndexedDB
      if (!audioBlob) {
        audioBlob = await getAudioBlob(id);
      }

      if (!audioBlob || audioBlob.size === 0) {
        setFeedbackMsg({ text: '❌ 找不到原始音频文件，无法重新转录', type: 'error' });
        setTimeout(() => setFeedbackMsg(null), 5000);
        setIsRetranscribing(false);
        return;
      }

      // Step 2: Run ASR with fallback
      setFeedbackMsg({ text: '🎧 正在转录音频...', type: 'success' });
      const { transcribeWithWhisperX, transcribeWithQwen3, summarizeWithLLM, segmentsToTranscript } = await import('@/services/ai-service');
      const store = useAppStore.getState();
      const engine = forceEngine || store.asrEngineMap[note.mode] || 'qwen3';
      const fallbackEngine = engine === 'whisperx' ? 'qwen3' : 'whisperx';

      let wxResult;
      try {
        wxResult = engine === 'qwen3'
          ? await transcribeWithQwen3(audioBlob, store.qwenAsrEndpoint)
          : await transcribeWithWhisperX(audioBlob, store.whisperxEndpoint, {
              diarize: note.mode === 'meeting' || note.mode === 'interview',
            });
      } catch (primaryErr) {
        setFeedbackMsg({ text: `⚠️ ${engine} 失败，尝试 ${fallbackEngine}...`, type: 'error' });
        try {
          wxResult = fallbackEngine === 'qwen3'
            ? await transcribeWithQwen3(audioBlob, store.qwenAsrEndpoint)
            : await transcribeWithWhisperX(audioBlob, store.whisperxEndpoint, {
                diarize: note.mode === 'meeting' || note.mode === 'interview',
              });
        } catch {
          throw primaryErr;
        }
      }

      const segments = wxResult.segments.map(s => ({ start: s.start, end: s.end, text: s.text, speaker: s.speaker }));
      const speakers = new Set(segments.map(s => s.speaker).filter(Boolean));
      const fullText = segmentsToTranscript(segments);
      updateNote(id, { content: fullText, segments, speakerCount: speakers.size, language: wxResult.language });

      // Step 3: LLM Summary
      const { getSharedLLMConfig } = await import('@/services/shared-config');
      const llmConfig = await getSharedLLMConfig();
      if (llmConfig.apiEndpoint && llmConfig.apiKey) {
        setFeedbackMsg({ text: '✨ AI 正在生成摘要...', type: 'success' });
        try {
          const aiResult = await summarizeWithLLM(fullText, (note.mode as AITemplate) || 'auto', llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel);
          updateNote(id, { title: aiResult.title, summary: aiResult.summary, keyPoints: aiResult.keyPoints, actionItems: aiResult.actionItems, isProcessing: false, updatedAt: new Date() });
        } catch {
          updateNote(id, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
        }
      } else {
        updateNote(id, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
      }

      setFeedbackMsg({ text: '✅ 重新转录完成', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '未知错误';
      setFeedbackMsg({ text: `❌ 转录失败: ${errMsg}`, type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 8000);
    }
    setIsRetranscribing(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <audio ref={audioRef} preload="metadata" />

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl backdrop-blur-lg border animate-[slideUp_0.3s_ease-out] ${
          feedbackMsg.type === 'error'
            ? 'bg-[var(--color-error)]/15 border-[var(--color-error)]/30 text-[var(--color-error)]'
            : 'bg-[var(--color-success)]/15 border-[var(--color-success)]/30 text-[var(--color-success)]'
        }`}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push('/library')}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">返回</span>
        </button>

        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="p-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              title="编辑笔记"
            >
              <Pencil className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={saveEdits}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-success)] text-white text-sm font-medium cursor-pointer hover:brightness-110 transition-all"
              >
                <Check className="w-4 h-4" /> 保存
              </button>
              <button
                onClick={cancelEditing}
                className="p-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={async () => {
              setIsSharing(true);
              try {
                const res = await fetch('/api/share', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ noteId: id, expiresInDays: 7 }),
                });
                if (res.ok) {
                  const { shareId } = await res.json();
                  const url = `${window.location.origin}/share/${shareId}`;
                  await navigator.clipboard.writeText(url);
                  setShareLink(url);
                  setTimeout(() => setShareLink(null), 4000);
                }
              } catch { /* ignore */ }
              setIsSharing(false);
            }}
            className={`p-2 rounded-lg bg-[var(--color-bg-card)] transition-colors cursor-pointer ${shareLink ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            title={shareLink || '生成分享链接'}
          >
            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          </button>
          {shareLink && (
            <span className="text-xs text-[var(--color-success)] animate-fadeIn">链接已复制!</span>
          )}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 card p-2 z-50 shadow-xl">
                <button onClick={() => doExport('md')} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-[var(--color-text-secondary)] hover:bg-white/5 cursor-pointer">
                  <FileText className="w-4 h-4" /> Markdown
                </button>
                <button onClick={() => doExport('srt')} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-[var(--color-text-secondary)] hover:bg-white/5 cursor-pointer">
                  <Subtitles className="w-4 h-4" /> SRT 字幕
                </button>
                <button onClick={() => doExport('json')} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-[var(--color-text-secondary)] hover:bg-white/5 cursor-pointer">
                  <FileJson className="w-4 h-4" /> JSON
                </button>
              </div>
            )}
          </div>
          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors cursor-pointer"
            title="删除笔记"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title & Meta */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {config && (
            <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium"
              style={{ color: config.color, backgroundColor: config.bgColor }}>
              {config.label}
            </span>
          )}
          {isMultiSpeaker && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--color-tag-blue)] bg-[rgba(59,130,246,0.15)]">
              <Users className="w-3 h-3" /> {note.speakerCount} 位说话人
            </span>
          )}
          {note.language && (
            <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface)]">
              {note.language.toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
          {isEditing ? (
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--color-primary)]/50 focus:border-[var(--color-primary)] outline-none pb-1"
            />
          ) : note.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
          <span>{formatFullDate(note.createdAt)}</span>
          <span>{formatDuration(note.duration)}</span>
          {note.mode === 'meeting' && (
            <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> 会议模式</span>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left - AI Analysis */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                <Pencil className="w-4 h-4" /> AI 摘要
              </h2>
              {!isEditing && (
                <div className="relative">
                  <button
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    disabled={isResummarizing}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer disabled:opacity-50"
                    title="重新生成 AI 摘要"
                  >
                    {isResummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {isResummarizing ? '生成中...' : '重新摘要'}
                  </button>
                  {showTemplateSelector && (
                    <div className="absolute right-0 top-full mt-1 w-40 card p-1.5 z-50 shadow-xl border border-white/10">
                      {(Object.entries(AI_TEMPLATES) as [AITemplate, { label: string; icon: string }][]).map(([key, tmpl]) => (
                        <button
                          key={key}
                          onClick={() => resummarize(key)}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
                        >
                          <span>{tmpl.icon}</span> {tmpl.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editSummary}
                onChange={e => setEditSummary(e.target.value)}
                rows={3}
                className="w-full text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-surface)] rounded-lg p-3 border border-white/10 focus:border-[var(--color-primary)]/50 outline-none resize-none"
              />
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{note.summary}</p>
            )}
          </div>

          {/* Key Points */}
          {note.keyPoints.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">📌 关键要点</h2>
              {isEditing ? (
                <div className="space-y-2">
                  {editKeyPoints.map((point, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={point}
                        onChange={e => {
                          const next = [...editKeyPoints];
                          next[i] = e.target.value;
                          setEditKeyPoints(next);
                        }}
                        className="flex-1 text-sm bg-[var(--color-bg-surface)] rounded-lg px-3 py-2 border border-white/10 focus:border-[var(--color-primary)]/50 outline-none text-[var(--color-text-secondary)]"
                      />
                      <button onClick={() => setEditKeyPoints(editKeyPoints.filter((_, j) => j !== i))} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditKeyPoints([...editKeyPoints, ''])}
                    className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:brightness-125 cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加要点
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {note.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Action Items */}
          {note.actionItems.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">☑️ 待办事项</h2>
              {isEditing ? (
                <div className="space-y-2">
                  {editActionItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={item}
                        onChange={e => {
                          const next = [...editActionItems];
                          next[i] = e.target.value;
                          setEditActionItems(next);
                        }}
                        className="flex-1 text-sm bg-[var(--color-bg-surface)] rounded-lg px-3 py-2 border border-white/10 focus:border-[var(--color-primary)]/50 outline-none text-[var(--color-text-secondary)]"
                      />
                      <button onClick={() => setEditActionItems(editActionItems.filter((_, j) => j !== i))} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditActionItems([...editActionItems, ''])}
                    className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:brightness-125 cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加待办
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {note.actionItems.map((item, i) => {
                    const done = completedTodos.has(i);
                    return (
                      <li
                        key={i}
                        onClick={() => {
                          const next = new Set(completedTodos);
                          if (done) next.delete(i); else next.add(i);
                          setCompletedTodos(next);
                          updateNote(id, { completedTodos: Array.from(next) });
                        }}
                        className={`flex items-center gap-2.5 text-sm cursor-pointer transition-all ${done ? 'text-[var(--color-text-tertiary)] line-through opacity-60' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                      >
                        {done ? (
                          <CheckSquare className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                        )}
                        {item}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Audio Player */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">🎵 原始录音</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
              </button>
              <div className="flex-1">
                <div
                  className="h-1.5 bg-[var(--color-bg-surface)] rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    handleSeek(pct * note.duration);
                  }}
                >
                  <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${playProgress}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-[var(--color-text-tertiary)]">
                  <span>{formatDuration(Math.floor(currentTime))}</span>
                  <span>{formatDuration(note.duration)}</span>
                </div>
              </div>
              <button
                onClick={cyclePlaybackRate}
                className="px-2 py-1 rounded-lg text-xs font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer min-w-[3rem] text-center flex-shrink-0"
                title="切换播放速度"
              >
                {playbackRate}x
              </button>
            </div>
          </div>
        </div>

        {/* Right - Transcript */}
        <div className="lg:col-span-3">
          <div className="card p-6 lg:p-8 min-h-96">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                {isMultiSpeaker ? (
                  <><Users className="w-4 h-4 text-[var(--color-tag-blue)]" /> 会议转录 · {note.speakerCount} 位参与者</>
                ) : (<>📝 完整转录</>)}
                {note.language && (
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-[var(--color-bg-surface)] text-[var(--color-text-tertiary)] uppercase">{note.language}</span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {isMultiSpeaker && (
                  <span className="text-xs text-[var(--color-text-tertiary)] hidden lg:inline">点击段落跳转音频 · 点击名称重命名</span>
                )}
                {/* Translate button + language selector */}
                <div className="relative">
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        if (note.translatedContent || note.translatedSegments) {
                          setShowTranslated(!showTranslated);
                        } else {
                          setShowTranslateMenu(!showTranslateMenu);
                        }
                      }}
                      disabled={isTranslating}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-l-lg text-[10px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface)] hover:text-[var(--color-tag-blue)] hover:bg-[var(--color-tag-blue)]/10 transition-all cursor-pointer disabled:opacity-50"
                      title={(note.translatedContent || note.translatedSegments) ? (showTranslated ? '查看原文' : '查看翻译') : '选择翻译语言'}
                    >
                      {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                      {isTranslating ? '翻译中...' : (note.translatedContent || note.translatedSegments) ? (showTranslated ? '原文' : '译文') : '翻译'}
                    </button>
                    <button
                      onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                      disabled={isTranslating}
                      className="flex items-center px-1 py-1 rounded-r-lg text-[10px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface)] hover:text-[var(--color-tag-blue)] hover:bg-[var(--color-tag-blue)]/10 transition-all cursor-pointer disabled:opacity-50 border-l border-white/10"
                      title="选择翻译语言"
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                  {/* Language dropdown */}
                  {showTranslateMenu && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-36 py-1 rounded-xl bg-[var(--color-bg-card)] border border-white/10 shadow-2xl backdrop-blur-xl">
                      {[
                        { code: 'zh', label: '🇨🇳 中文' },
                        { code: 'en', label: '🇺🇸 English' },
                        { code: 'ja', label: '🇯🇵 日本語' },
                        { code: 'ko', label: '🇰🇷 한국어' },
                        { code: 'fr', label: '🇫🇷 Français' },
                        { code: 'de', label: '🇩🇪 Deutsch' },
                        { code: 'es', label: '🇪🇸 Español' },
                        { code: 'it', label: '🇮🇹 Italiano' },
                        { code: 'pt', label: '🇧🇷 Português' },
                        { code: 'ru', label: '🇷🇺 Русский' },
                        { code: 'ar', label: '🇸🇦 العربية' },
                      ].map(lang => (
                        <button
                          key={lang.code}
                          onClick={async () => {
                            setShowTranslateMenu(false);
                            setIsTranslating(true);
                            setFeedbackMsg({ text: `🌐 正在翻译为 ${lang.label.slice(4)}...`, type: 'success' });
                            try {
                              const { translateTranscript, translateSegments } = await import('@/services/ai-service');
                              const { getSharedLLMConfig } = await import('@/services/shared-config');
                              const llmConfig = await getSharedLLMConfig();
                              if (!llmConfig.apiEndpoint || !llmConfig.apiKey) {
                                throw new Error('请先在设置中配置 LLM API');
                              }
                              if (isMultiSpeaker && hasSegments) {
                                const translatedSegs = await translateSegments(
                                  note.segments, lang.code,
                                  llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel
                                );
                                const { segmentsToTranscript } = await import('@/services/ai-service');
                                const translatedText = segmentsToTranscript(translatedSegs);
                                updateNote(id, { translatedSegments: translatedSegs, translatedContent: translatedText, targetLanguage: lang.code });
                              } else {
                                const translated = await translateTranscript(
                                  note.content, lang.code,
                                  llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel
                                );
                                updateNote(id, { translatedContent: translated, targetLanguage: lang.code });
                              }
                              setShowTranslated(true);
                              setFeedbackMsg({ text: '✅ 翻译完成', type: 'success' });
                              setTimeout(() => setFeedbackMsg(null), 3000);
                            } catch (err) {
                              setFeedbackMsg({ text: `❌ 翻译失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
                              setTimeout(() => setFeedbackMsg(null), 5000);
                            }
                            setIsTranslating(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer hover:bg-[var(--color-tag-blue)]/10 ${
                            note.targetLanguage === lang.code ? 'text-[var(--color-tag-blue)] font-medium' : 'text-[var(--color-text-secondary)]'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => retranscribe()}
                  disabled={isRetranscribing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer disabled:opacity-50"
                  title="重新转录音频"
                >
                  {isRetranscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  {isRetranscribing ? '转录中...' : '重新转录'}
                </button>
              </div>
            </div>
            {/* Language toggle indicator */}
            {showTranslated && (note.translatedContent || note.translatedSegments) && (
              <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-[var(--color-tag-blue)]/10 border border-[var(--color-tag-blue)]/20">
                <Languages className="w-3.5 h-3.5 text-[var(--color-tag-blue)]" />
                <span className="text-xs text-[var(--color-tag-blue)]">已翻译为{note.targetLanguage === 'zh' ? '中文' : note.targetLanguage === 'en' ? 'English' : note.targetLanguage}</span>
              </div>
            )}
            {hasSegments && isMultiSpeaker ? (
              showTranslated && note.translatedSegments ? (
                <SpeakerSegmentView
                  segments={note.translatedSegments}
                  noteId={id}
                  speakerNames={noteSpeakerNames}
                  onSeek={handleSeek}
                  currentTime={currentTime}
                />
              ) : (
                <SpeakerSegmentView
                  segments={note.segments}
                  noteId={id}
                  speakerNames={noteSpeakerNames}
                  onSeek={handleSeek}
                  currentTime={currentTime}
                />
              )
            ) : (
              <div className="text-sm text-[var(--color-text-secondary)] leading-7 whitespace-pre-wrap">
                {showTranslated && note.translatedContent ? note.translatedContent : note.content}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative card p-6 w-full max-w-sm border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[var(--color-error)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">确认删除</h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              确定要删除「<span className="text-[var(--color-text-primary)] font-medium">{note.title.slice(0, 30)}</span>」吗？录音文件和 AI 摘要都将被永久删除。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] hover:bg-white/10 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--color-error)] hover:brightness-110 transition-all cursor-pointer"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
