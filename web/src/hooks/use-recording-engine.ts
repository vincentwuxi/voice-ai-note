'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore, RecordingMode, AITemplate } from '@/store/app-store';
import { saveAudioBlob, saveRecordingDraft, loadRecordingDraft, clearRecordingDraft } from '@/services/db';

// Upload audio to R2 cloud storage (fire-and-forget)
async function uploadToR2(noteId: string, blob: Blob) {
  try {
    const form = new FormData();
    form.append('file', blob, `${noteId}.webm`);
    form.append('noteId', noteId);
    await fetch('/api/audio/upload', { method: 'POST', body: form });
  } catch (err) {
    console.warn('[R2 Upload]', err);
  }
}

export type ProcessingStage = 'idle' | 'uploading' | 'transcribing' | 'summarizing' | 'done' | 'error';

export interface ToastState {
  noteId: string;
  message: string;
  type?: 'success' | 'error' | 'processing';
  stage?: ProcessingStage;
  onRetry?: () => void;
}

export interface DraftRecoveryState {
  chunks: Blob[];
  mode: string;
  template: string;
  elapsed: number;
}

/**
 * useRecordingEngine — Core recording state machine hook.
 * Manages MediaRecorder, AudioContext, AnalyserNode, timers, draft persistence,
 * and the ASR/LLM processing pipeline.
 */
export function useRecordingEngine() {
  const {
    isRecording, isPaused, recordingMode, elapsedTime, liveTranscript, selectedTemplate,
    setIsRecording, setIsPaused, setRecordingMode, setElapsedTime, setLiveTranscript, setSelectedTemplate,
    addNote,
  } = useAppStore();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [draftRecovery, setDraftRecovery] = useState<DraftRecoveryState | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'active' | 'error' | 'unsupported'>('idle');
  const [speechLang, setSpeechLang] = useState('zh-CN');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const draftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechErrorCountRef = useRef(0);

  // ── Timer ──
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(useAppStore.getState().elapsedTime + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isPaused, setElapsedTime]);

  // ── Draft recovery on mount ──
  useEffect(() => {
    loadRecordingDraft().then(draft => {
      if (draft && draft.chunks && draft.chunks.length > 0) {
        setDraftRecovery({ chunks: draft.chunks, mode: draft.mode, template: draft.template, elapsed: draft.elapsedTime });
      }
    }).catch(() => {});
  }, []);

  // ── Live Speech Recognition ──
  const startLiveTranscription = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SpeechRecognitionCtor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) { setSpeechStatus('unsupported'); return; }

    speechErrorCountRef.current = 0;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;

    let accumulated = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      speechErrorCountRef.current = 0;
      setSpeechStatus('active');
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) { accumulated += transcript; } else { interim = transcript; }
      }
      setLiveTranscript(accumulated + (interim ? `\u200B${interim}` : ''));
    };

    recognition.onend = () => {
      if (useAppStore.getState().isRecording && !useAppStore.getState().isPaused && speechErrorCountRef.current < 5) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      const errorType = event?.error || 'unknown';
      console.warn('[Speech API] Error:', errorType);
      speechErrorCountRef.current++;
      if (errorType === 'not-allowed' || errorType === 'network') { setSpeechStatus('error'); return; }
      if (useAppStore.getState().isRecording && !useAppStore.getState().isPaused && speechErrorCountRef.current < 5) {
        const delay = Math.min(500 * speechErrorCountRef.current, 3000);
        setTimeout(() => { try { recognition.start(); } catch { /* ignore */ } }, delay);
      } else if (speechErrorCountRef.current >= 5) {
        setSpeechStatus('error');
      }
    };

    try { recognition.start(); setSpeechStatus('active'); } catch { setSpeechStatus('error'); }
    recognitionRef.current = recognition;
  }, [setLiveTranscript, speechLang]);



  // ── Processing Pipeline (shared between record, upload, draft recovery) ──
  const runProcessingPipeline = useCallback(async (
    noteId: string,
    audioBlob: Blob,
    mode: RecordingMode,
    template: AITemplate,
    showProgress: (stage: ProcessingStage, msg: string, retryFn?: () => void) => void,
    retryPipeline: () => void,
  ) => {
    const store = useAppStore.getState();
    try {
      const { transcribeWithWhisperX, transcribeWithQwen3, summarizeWithLLM, segmentsToTranscript } = await import('@/services/ai-service');
      const { getSharedLLMConfig } = await import('@/services/shared-config');

      // Stage 1: ASR with automatic fallback
      showProgress('transcribing', '🎧 正在转录音频...');
      const engineForMode = store.asrEngineMap[mode] || 'qwen3';
      const fallbackEngine = engineForMode === 'whisperx' ? 'qwen3' : 'whisperx';
      let wxResult;
      try {
        wxResult = engineForMode === 'qwen3'
          ? await transcribeWithQwen3(audioBlob, store.qwenAsrEndpoint)
          : await transcribeWithWhisperX(audioBlob, store.whisperxEndpoint, {
              diarize: mode === 'meeting' || mode === 'interview',
            });
      } catch (primaryErr) {
        showProgress('transcribing', `⚠️ ${engineForMode} 失败，正在尝试 ${fallbackEngine}...`);
        try {
          wxResult = fallbackEngine === 'qwen3'
            ? await transcribeWithQwen3(audioBlob, store.qwenAsrEndpoint)
            : await transcribeWithWhisperX(audioBlob, store.whisperxEndpoint, {
                diarize: mode === 'meeting' || mode === 'interview',
              });
        } catch { throw primaryErr; }
      }

      const segments = wxResult.segments.map(s => ({ start: s.start, end: s.end, text: s.text, speaker: s.speaker }));
      const speakers = new Set(segments.map(s => s.speaker).filter(Boolean));
      const fullText = segmentsToTranscript(segments);
      store.updateNote(noteId, { content: fullText, segments, speakerCount: speakers.size, language: wxResult.language });

      // Stage 2: LLM Summary
      const llmConfig = await getSharedLLMConfig();
      if (llmConfig.apiEndpoint && llmConfig.apiKey) {
        showProgress('summarizing', '✨ AI 正在生成摘要...');
        try {
          const aiResult = await summarizeWithLLM(fullText, template, llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel);
          store.updateNote(noteId, { title: aiResult.title, summary: aiResult.summary, keyPoints: aiResult.keyPoints, actionItems: aiResult.actionItems, isProcessing: false, updatedAt: new Date() });
        } catch {
          store.updateNote(noteId, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
        }
      } else {
        store.updateNote(noteId, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
      }

      showProgress('done', '✅ 处理完成');
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '未知错误';
      store.updateNote(noteId, { title: '转录失败', content: `转录出错: ${errMsg}`, summary: '转录失败，请重试', isProcessing: false, updatedAt: new Date() });
      showProgress('error', `❌ 转录失败: ${errMsg.slice(0, 60)}`, retryPipeline);
    }
  }, []);

  // ── Toast helper ──
  const showProgress = useCallback((noteId: string) => {
    return (stage: ProcessingStage, msg: string, retryFn?: () => void) => {
      setToast({ noteId, message: msg, type: stage === 'error' ? 'error' : stage === 'done' ? 'success' : 'processing', stage, onRetry: retryFn });
    };
  }, []);

  // ── Start Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      setAnalyserNode(analyser);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start(1000);

      setIsRecording(true);
      setIsPaused(false);
      setElapsedTime(0);
      setLiveTranscript('');

      // Periodic draft save every 10s
      draftIntervalRef.current = setInterval(() => {
        const chunks = audioChunksRef.current;
        if (chunks.length > 0) {
          const s = useAppStore.getState();
          saveRecordingDraft({ chunks: [...chunks], mode: s.recordingMode, template: s.selectedTemplate, elapsedTime: s.elapsedTime, savedAt: new Date().toISOString() }).catch(() => {});
        }
      }, 10000);

      startLiveTranscription();
    } catch {
      setToast({ noteId: '', message: '🎤 无法访问麦克风，请在浏览器设置中允许使用麦克风权限', type: 'error', stage: 'error' });
      setTimeout(() => setToast(null), 5000);
    }
  };

  // ── Toggle Pause ──
  const togglePause = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (isPaused) {
      mr.resume(); setIsPaused(false);
      startLiveTranscription();
    } else {
      mr.pause(); setIsPaused(true);
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } }
    }
  };

  // ── Cleanup helper ──
  const cleanup = useCallback(() => {
    if (draftIntervalRef.current) { clearInterval(draftIntervalRef.current); draftIntervalRef.current = null; }
    clearRecordingDraft().catch(() => {});
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    setAnalyserNode(null);
  }, []);

  // ── Stop Recording ──
  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } recognitionRef.current = null; }

    mr.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const id = Date.now().toString();
      const mode = recordingMode;
      const dur = elapsedTime;
      const template = selectedTemplate;

      saveAudioBlob(id, blob).catch(console.error);
      uploadToR2(id, blob);

      addNote({
        id, title: 'AI 处理中...', content: liveTranscript || '正在使用 WhisperX 转录...',
        summary: '正在处理...', keyPoints: [], actionItems: [],
        tags: [mode === 'meeting' || mode === 'interview' ? 'project' : 'inspiration'],
        mode, duration: dur, audioUrl: url, segments: [], speakerCount: 0,
        createdAt: now, updatedAt: now, isProcessing: true,
      });

      setIsRecording(false);
      setIsPaused(false);
      setLiveTranscript('');
      setSpeechStatus('idle');
      cleanup();

      const progress = showProgress(id);
      progress('uploading', '录音已保存，正在上传...');

      const runPipeline = () => runProcessingPipeline(id, blob, mode, template, progress, runPipeline);
      runPipeline();
    };

    mr.stop();
    mr.stream.getTracks().forEach((t) => t.stop());
  };

  // ── Discard Recording ──
  const discardRecording = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } recognitionRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') { mr.stop(); mr.stream.getTracks().forEach((t) => t.stop()); }
    setIsRecording(false);
    setIsPaused(false);
    setElapsedTime(0);
    setLiveTranscript('');
    cleanup();
  };

  // ── File Upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const now = new Date();
    const id = Date.now().toString();
    const mode = recordingMode;
    const template = selectedTemplate;

    let dur = 0;
    try {
      const audioCtx = new AudioContext();
      const arrayBuf = await file.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
      dur = Math.round(audioBuf.duration);
      audioCtx.close();
    } catch { dur = 0; }

    saveAudioBlob(id, file).catch(console.error);
    uploadToR2(id, file);

    addNote({
      id, title: `📎 ${file.name}`, content: '正在使用 WhisperX 转录上传的音频...',
      summary: '正在处理...', keyPoints: [], actionItems: [],
      tags: [mode === 'meeting' || mode === 'interview' ? 'project' : 'inspiration'],
      mode, duration: dur, audioUrl: URL.createObjectURL(file), segments: [], speakerCount: 0,
      createdAt: now, updatedAt: now, isProcessing: true,
    });

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const progress = showProgress(id);
    progress('uploading', '📤 音频已保存，正在上传...');

    const runPipeline = () => runProcessingPipeline(id, file, mode, template, progress, runPipeline);
    runPipeline();
  };

  // ── Draft Recovery ──
  const recoverDraft = () => {
    if (!draftRecovery) return;
    const blob = new Blob(draftRecovery.chunks, { type: 'audio/webm' });
    const id = Date.now().toString();
    const now = new Date();

    saveAudioBlob(id, blob).catch(console.error);
    uploadToR2(id, blob);

    addNote({
      id, title: '恢复的录音', content: '正在转录中...', summary: '正在处理...',
      keyPoints: [], actionItems: [], tags: ['inspiration'],
      mode: draftRecovery.mode as RecordingMode, duration: draftRecovery.elapsed,
      audioUrl: URL.createObjectURL(blob), segments: [], speakerCount: 0,
      createdAt: now, updatedAt: now, isProcessing: true,
    });

    const tmplKey = (draftRecovery.template as AITemplate) || 'auto';
    setDraftRecovery(null);
    clearRecordingDraft().catch(() => {});

    const progress = showProgress(id);
    progress('transcribing', '📦 恢复录音已保存，正在转录...');

    const runPipeline = () => runProcessingPipeline(id, blob, draftRecovery!.mode as RecordingMode, tmplKey, progress, runPipeline);
    runPipeline();
  };

  const dismissDraft = () => {
    setDraftRecovery(null);
    clearRecordingDraft().catch(() => {});
  };

  return {
    // State
    isRecording, isPaused, recordingMode, elapsedTime, liveTranscript, selectedTemplate,
    toast, isUploading, draftRecovery, analyserNode, speechStatus,
    speechLang, showLangMenu,
    // Setters
    setRecordingMode, setSelectedTemplate, setSpeechLang, setShowLangMenu, setToast,
    // Actions
    startRecording, togglePause, stopRecording, discardRecording, handleFileUpload,
    recoverDraft, dismissDraft,
    // Refs
    fileInputRef,
  };
}
