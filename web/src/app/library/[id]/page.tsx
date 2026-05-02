'use client';

import { use, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Share2, Download, Square, Pencil, Users, Mic, FileText, FileJson, Subtitles, Edit3, Check, X, Plus, Trash2 } from 'lucide-react';
import { useAppStore, NoteTag, TranscriptSegment } from '@/store/app-store';
import { getAudioBlob, exportToMarkdown, exportToSRT, exportToJSON } from '@/services/db';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const tagConfig: Record<NoteTag, { label: string; color: string; bgColor: string }> = {
  inspiration: { label: '灵感', color: 'var(--color-tag-amber)', bgColor: 'rgba(245, 158, 11, 0.15)' },
  project: { label: '项目', color: 'var(--color-tag-blue)', bgColor: 'rgba(59, 130, 246, 0.15)' },
  personal: { label: '个人', color: 'var(--color-tag-emerald)', bgColor: 'rgba(16, 185, 129, 0.15)' },
  reading: { label: '阅读', color: 'var(--color-tag-indigo)', bgColor: 'rgba(99, 102, 241, 0.15)' },
  design: { label: '设计', color: 'var(--color-tag-purple)', bgColor: 'rgba(139, 92, 246, 0.15)' },
};

const speakerColors = [
  { text: '#F5A623', bg: 'rgba(245, 166, 35, 0.1)', border: 'rgba(245, 166, 35, 0.2)' },
  { text: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
  { text: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
  { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)' },
  { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function getSpeakerIndex(speaker: string): number {
  return parseInt(speaker.replace('SPEAKER_', '')) || 0;
}

function SpeakerSegmentView({
  segments, noteId, speakerNames, onSeek,
}: {
  segments: TranscriptSegment[];
  noteId: string;
  speakerNames: Record<string, string>;
  onSeek: (time: number) => void;
}) {
  const { setSpeakerName } = useAppStore();
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const groups: { speaker: string; segments: TranscriptSegment[] }[] = [];
  let currentGroup: { speaker: string; segments: TranscriptSegment[] } | null = null;
  for (const seg of segments) {
    const speaker = seg.speaker || 'SPEAKER_00';
    if (!currentGroup || currentGroup.speaker !== speaker) {
      currentGroup = { speaker, segments: [seg] };
      groups.push(currentGroup);
    } else {
      currentGroup.segments.push(seg);
    }
  }

  const startEdit = (speakerKey: string, currentName: string) => {
    setEditingSpeaker(speakerKey);
    setEditValue(currentName);
  };

  const confirmEdit = (speakerKey: string) => {
    if (editValue.trim()) {
      setSpeakerName(noteId, speakerKey, editValue.trim());
    }
    setEditingSpeaker(null);
  };

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const idx = getSpeakerIndex(group.speaker);
        const color = speakerColors[idx % speakerColors.length];
        const customName = speakerNames[group.speaker];
        const defaultName = `说话人 ${idx + 1}`;
        const label = customName || defaultName;
        const startTime = group.segments[0].start;
        const text = group.segments.map(s => s.text).join('');

        return (
          <div
            key={gi}
            className="rounded-xl p-4 transition-all duration-200 hover:brightness-110 cursor-pointer"
            style={{ backgroundColor: color.bg, borderLeft: `3px solid ${color.border}` }}
            onClick={() => onSeek(startTime)}
          >
            <div className="flex items-center gap-2 mb-2">
              {editingSpeaker === group.speaker ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmEdit(group.speaker)}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/20 border border-white/10 w-24 focus:outline-none"
                    style={{ color: color.text }}
                    autoFocus
                  />
                  <button
                    onClick={() => confirmEdit(group.speaker)}
                    className="p-0.5 rounded-full hover:bg-white/10"
                  >
                    <Check className="w-3 h-3" style={{ color: color.text }} />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:brightness-125 transition-all"
                  style={{ color: color.text, backgroundColor: color.border }}
                  onClick={(e) => { e.stopPropagation(); startEdit(group.speaker, label); }}
                >
                  {label}
                  <Edit3 className="w-2.5 h-2.5 opacity-60" />
                </button>
              )}
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {formatTimestamp(startTime)}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{text}</p>
          </div>
        );
      })}
    </div>
  );
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
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editKeyPoints, setEditKeyPoints] = useState<string[]>([]);
  const [editActionItems, setEditActionItems] = useState<string[]>([]);
  const { updateNote, deleteNote } = useAppStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  const note = notes.find((n) => n.id === id);

  // Load audio from IndexedDB
  useEffect(() => {
    if (!note) return;
    if (note.audioUrl && audioRef.current) {
      audioRef.current.src = note.audioUrl;
      return;
    }
    // Try loading from IndexedDB
    getAudioBlob(id).then(blob => {
      if (blob && audioRef.current) {
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
      }
    }).catch(() => {});
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

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <audio ref={audioRef} preload="metadata" />

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
          <button className="p-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
            <Share2 className="w-4 h-4" />
          </button>
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
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] mb-3">
              <Pencil className="w-4 h-4" /> AI 摘要
            </h2>
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
                  {note.actionItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                      <Square className="w-4 h-4 text-[var(--color-success)] shrink-0" /> {item}
                    </li>
                  ))}
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
                className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors"
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
              </h2>
              {isMultiSpeaker && (
                <span className="text-xs text-[var(--color-text-tertiary)]">点击段落跳转音频 · 点击名称重命名</span>
              )}
            </div>
            {hasSegments && isMultiSpeaker ? (
              <SpeakerSegmentView
                segments={note.segments}
                noteId={id}
                speakerNames={noteSpeakerNames}
                onSeek={handleSeek}
              />
            ) : (
              <div className="text-sm text-[var(--color-text-secondary)] leading-7 whitespace-pre-wrap">{note.content}</div>
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
