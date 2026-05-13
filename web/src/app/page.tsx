'use client';

import { Mic, Pause, Play, Square, Shield, Trash2, Wand2, Upload, CheckCircle2, ExternalLink, Globe, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { AI_TEMPLATES, AITemplate } from '@/store/app-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RECORDING_MODES, SPEECH_LANGUAGES, formatRecordingTime } from '@/lib/constants';
import { useRecordingEngine } from '@/hooks/use-recording-engine';
import WaveformVisualizer from '@/components/waveform-visualizer';

export default function RecordPage() {
  const router = useRouter();
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const {
    isRecording, isPaused, recordingMode, elapsedTime, liveTranscript, selectedTemplate,
    toast, isUploading, draftRecovery, analyserNode, speechStatus,
    speechLang, showLangMenu,
    setRecordingMode, setSelectedTemplate, setSpeechLang, setShowLangMenu, setToast,
    startRecording, togglePause, stopRecording, discardRecording, handleFileUpload,
    recoverDraft, dismissDraft,
    fileInputRef,
  } = useRecordingEngine();

  const currentTemplate = AI_TEMPLATES[selectedTemplate];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      {/* Title */}
      <h1 className="text-xl font-semibold text-[var(--color-text-secondary)] mb-8 lg:mb-12">
        Recording Workspace
      </h1>

      {/* Draft Recovery Banner */}
      {draftRecovery && !isRecording && (
        <div className="w-full max-w-md mb-6 px-5 py-4 rounded-2xl bg-[var(--color-tag-amber)]/10 border border-[var(--color-tag-amber)]/30 animate-[slideUp_0.3s_ease-out]">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-[var(--color-tag-amber)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">发现未完成的录音</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">录时 {formatRecordingTime(draftRecovery.elapsed)} · {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={recoverDraft}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-primary)] text-black hover:brightness-110 transition-all cursor-pointer"
            >
              恢复并转录
            </button>
            <button
              onClick={dismissDraft}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
            >
              丢弃
            </button>
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="text-6xl lg:text-8xl font-bold tracking-tight mb-2 tabular-nums">
        {formatRecordingTime(elapsedTime)}
      </div>

      {/* Waveform */}
      <WaveformVisualizer isRecording={isRecording} analyserNode={analyserNode} />

      {/* Live Transcript + Speech Status */}
      {isRecording && (liveTranscript || speechStatus === 'error' || speechStatus === 'unsupported') && (
        <div className="w-full max-w-2xl mb-6">
          <div className="card p-4 max-h-32 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              {speechStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-[var(--color-error)]" />
                  <span className="text-xs text-[var(--color-error)]">实时字幕不可用（网络或权限问题）</span>
                </>
              ) : speechStatus === 'unsupported' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                  <span className="text-xs text-[var(--color-text-tertiary)]">此浏览器不支持实时字幕</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[var(--color-error)] animate-pulse" />
                  <span className="text-xs text-[var(--color-text-tertiary)]">实时转录</span>
                </>
              )}
            </div>
            {liveTranscript ? (
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {liveTranscript.split('\u200B').map((part, i) => (
                  i === liveTranscript.split('\u200B').length - 1 && liveTranscript.includes('\u200B')
                    ? <span key={i} className="text-[var(--color-primary)] opacity-60">{part}</span>
                    : <span key={i}>{part}</span>
                ))}
              </p>
            ) : (speechStatus === 'error' || speechStatus === 'unsupported') ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">
                录音将正常保存，停止后会自动使用 ASR 引擎进行精确转录
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Mode + Template Selector */}
      <div className="flex flex-col items-center gap-4 mb-8">
        {/* Mode Selector */}
        <div className="flex gap-2 lg:gap-3 flex-wrap justify-center">
          {RECORDING_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => !isRecording && setRecordingMode(mode.id)}
              disabled={isRecording}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                recordingMode === mode.id
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-white/6 hover:border-white/15'
              } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="block">{mode.label}</span>
              <span className="block text-[10px] opacity-60">{mode.sublabel}</span>
            </button>
          ))}
        </div>

        {/* Template Selector */}
        <div className="relative">
          <button
            onClick={() => !isRecording && setShowTemplateMenu(!showTemplateMenu)}
            disabled={isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
            } text-[var(--color-text-tertiary)]`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI 模板: {currentTemplate.icon} {currentTemplate.label}</span>
          </button>

          {showTemplateMenu && !isRecording && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 card p-2 z-50 shadow-xl">
              {(Object.entries(AI_TEMPLATES) as [AITemplate, typeof AI_TEMPLATES.auto][]).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedTemplate(key); setShowTemplateMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                    selectedTemplate === key
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5'
                  }`}
                >
                  <span>{tmpl.icon}</span>
                  <span>{tmpl.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => !isRecording && setShowLangMenu(!showLangMenu)}
            disabled={isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
            } text-[var(--color-text-tertiary)]`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>语言: {SPEECH_LANGUAGES.find(l => l.code === speechLang)?.flag} {SPEECH_LANGUAGES.find(l => l.code === speechLang)?.label}</span>
          </button>
          {showLangMenu && !isRecording && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 card p-2 z-50 shadow-xl">
              {SPEECH_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setSpeechLang(lang.code); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                    speechLang === lang.code
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        {isRecording && (
          <button
            onClick={togglePause}
            className="w-12 h-12 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
            isRecording
              ? 'bg-[var(--color-error)] hover:bg-[var(--color-error)]/80'
              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] animate-pulse-glow'
          }`}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 lg:w-10 lg:h-10 text-black" />
          )}
        </button>

        {isRecording && (
          <button
            onClick={discardRecording}
            className="w-12 h-12 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Upload */}
      {!isRecording && (
        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac"
            onChange={handleFileUpload}
            className="hidden"
            id="audio-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-white/8 hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? '上传中...' : '上传音频文件'}
          </button>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 text-center">支持 MP3 / WAV / M4A / WebM / FLAC</p>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 mt-6 text-xs text-[var(--color-text-tertiary)]">
        <Shield className="w-3.5 h-3.5" />
        <span>End-to-end encrypted · 本地持久化存储</span>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_0.3s_ease-out] max-w-[90vw]">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${
            toast.type === 'error'
              ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]/30'
              : toast.type === 'processing'
              ? 'bg-[var(--color-bg-card)] border-[var(--color-primary)]/20'
              : 'bg-[var(--color-bg-card)] border-white/10'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0" />
            ) : toast.type === 'processing' ? (
              <Loader2 className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] flex-shrink-0" />
            )}
            <span className="text-sm text-[var(--color-text-primary)]">{toast.message}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {toast.onRetry && (
                <button
                  onClick={() => { toast.onRetry?.(); }}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-[var(--color-tag-amber)] bg-[var(--color-tag-amber)]/10 hover:bg-[var(--color-tag-amber)]/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" /> 重试
                </button>
              )}
              {(toast.type === 'success' || toast.type === 'error') && (
                <button
                  onClick={() => { router.push(`/library/${toast.noteId}`); setToast(null); }}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  查看笔记 <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
