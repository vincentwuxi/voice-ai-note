'use client';

import { use, useCallback } from 'react';
import { ArrowLeft, Share2, Download, Pencil, Users, Mic, FileText, FileJson, Subtitles, Check, X, Trash2, Loader2, RotateCcw, Languages } from 'lucide-react';
import { useAppStore, NoteTag } from '@/store/app-store';
import { exportToMarkdown, exportToSRT, exportToJSON } from '@/services/db';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import SpeakerSegmentView from '@/components/speaker-segment-view';
import AudioPlayer, { seekAudioPlayer } from '@/components/audio-player';
import NoteEditor, { getNoteEditorEdits } from '@/components/note-editor';
import { useNoteActions } from '@/hooks/use-note-actions';
import { TAG_CONFIG, formatDuration, formatFullDate } from '@/lib/constants';

const TRANSLATE_LANGUAGES = [
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
];

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { notes, speakerNames } = useAppStore();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { updateNote, deleteNote } = useAppStore();

  const note = notes.find((n) => n.id === id);

  // Heavy async operations (retranscribe, translate)
  const {
    isRetranscribing, retranscribe,
    isTranslating, showTranslated, showTranslateMenu, setShowTranslateMenu,
    translateTo, toggleTranslation,
    feedbackMsg,
  } = useNoteActions(id, note);

  // Seek handler for segment click navigation
  const handleSeek = useCallback((time: number) => {
    seekAudioPlayer(id, time);
  }, [id]);

  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[var(--color-text-tertiary)]">笔记未找到</p>
      </div>
    );
  }

  const tag = note.tags[0];
  const config = tag ? TAG_CONFIG[tag] : null;
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
    setIsEditing(true);
  };

  const saveEdits = () => {
    const editorEdits = getNoteEditorEdits(id);
    updateNote(id, {
      title: editTitle,
      ...(editorEdits || {}),
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
          <NoteEditor note={note} noteId={id} isEditing={isEditing} />

          {/* Audio Player */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">🎵 原始录音</h2>
            <AudioPlayer
              noteId={id}
              duration={note.duration}
              audioUrl={note.audioUrl}
              onTimeUpdate={setCurrentTime}
            />
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
                      onClick={toggleTranslation}
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
                      {TRANSLATE_LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => translateTo(lang.code, lang.label.slice(4))}
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
