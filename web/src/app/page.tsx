'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, Pause, Play, Square, Shield, Trash2, Wand2, Upload, CheckCircle2, ExternalLink, Globe, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { useAppStore, RecordingMode, AI_TEMPLATES, AITemplate, MODE_TEMPLATE_MAP } from '@/store/app-store';
import { saveAudioBlob, saveRecordingDraft, loadRecordingDraft, clearRecordingDraft } from '@/services/db';
import { useRouter } from 'next/navigation';

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

const modes: { id: RecordingMode; label: string; sublabel: string }[] = [
  { id: 'thoughts', label: '所思所想', sublabel: 'Thoughts' },
  { id: 'meeting', label: '会议模式', sublabel: 'Meeting' },
  { id: 'lecture', label: '讲座/阅读', sublabel: 'Lecture' },
  { id: 'interview', label: '访谈', sublabel: 'Interview' },
  { id: 'journal', label: '日记', sublabel: 'Journal' },
];

const languages = [
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
];

type ProcessingStage = 'idle' | 'uploading' | 'transcribing' | 'summarizing' | 'done' | 'error';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RecordPage() {
  const {
    isRecording, isPaused, recordingMode, elapsedTime, liveTranscript, selectedTemplate,
    setIsRecording, setIsPaused, setRecordingMode, setElapsedTime, setLiveTranscript, setSelectedTemplate,
    addNote,
  } = useAppStore();

  const [analyserData, setAnalyserData] = useState<number[]>(new Array(64).fill(0));
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ noteId: string; message: string; type?: 'success' | 'error' | 'processing'; stage?: ProcessingStage; onRetry?: () => void } | null>(null);
  const [speechLang, setSpeechLang] = useState('zh-CN');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const draftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<{ chunks: Blob[]; mode: string; template: string; elapsed: number } | null>(null);

  // Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(useAppStore.getState().elapsedTime + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isPaused, setElapsedTime]);

  // P2-8: Check for recording draft on mount
  useEffect(() => {
    loadRecordingDraft().then(draft => {
      if (draft && draft.chunks && draft.chunks.length > 0) {
        setDraftRecovery({ chunks: draft.chunks, mode: draft.mode, template: draft.template, elapsed: draft.elapsedTime });
      }
    }).catch(() => {});
  }, []);

  // Waveform drawing
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const barCount = 80;
    const barWidth = w / barCount - 2;
    const centerY = h / 2;
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const value = dataArray[dataIndex] / 255;
      const barHeight = value * centerY * 0.9;
      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
      gradient.addColorStop(0, '#FFC04D');
      gradient.addColorStop(0.5, '#F5A623');
      gradient.addColorStop(1, '#D48806');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(i * (barWidth + 2), centerY - barHeight, barWidth, barHeight * 2, 2);
      ctx.fill();
    }
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  // Idle waveform animation
  useEffect(() => {
    if (!isRecording) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let phase = 0;
      const drawIdle = () => {
        phase += 0.02;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const barCount = 80;
        const barWidth = w / barCount - 2;
        const centerY = h / 2;
        for (let i = 0; i < barCount; i++) {
          const value = (Math.sin(phase + i * 0.15) * 0.3 + 0.3) * 0.15;
          const barHeight = value * centerY;
          const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
          gradient.addColorStop(0, 'rgba(255, 192, 77, 0.4)');
          gradient.addColorStop(1, 'rgba(245, 166, 35, 0.2)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + 2), centerY - barHeight, barWidth, barHeight * 2, 2);
          ctx.fill();
        }
        animFrameRef.current = requestAnimationFrame(drawIdle);
      };
      drawIdle();
      return () => cancelAnimationFrame(animFrameRef.current);
    }
  }, [isRecording]);

  // Web Speech API for live transcription
  const startLiveTranscription = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SpeechRecognitionCtor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;

    let accumulated = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulated += transcript;
        } else {
          interim = transcript;
        }
      }
      setLiveTranscript(accumulated + (interim ? `\u200B${interim}` : ''));
    };

    recognition.onend = () => {
      // Restart if still recording
      if (useAppStore.getState().isRecording && !useAppStore.getState().isPaused) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognition.onerror = () => {
      // Some errors are non-fatal
      if (useAppStore.getState().isRecording && !useAppStore.getState().isPaused) {
        setTimeout(() => {
          try { recognition.start(); } catch { /* ignore */ }
        }, 500);
      }
    };

    try { recognition.start(); } catch { /* ignore */ }
    recognitionRef.current = recognition;
  }, [setLiveTranscript]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setElapsedTime(0);
      setLiveTranscript('');

      // P2-8: Periodic draft save every 10 seconds
      draftIntervalRef.current = setInterval(() => {
        const chunks = audioChunksRef.current;
        if (chunks.length > 0) {
          const store = useAppStore.getState();
          saveRecordingDraft({
            chunks: [...chunks],
            mode: store.recordingMode,
            template: store.selectedTemplate,
            elapsedTime: store.elapsedTime,
            savedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      }, 10000);

      cancelAnimationFrame(animFrameRef.current);
      drawWaveform();

      // Start live transcription
      startLiveTranscription();
    } catch {
      alert('无法访问麦克风，请允许浏览器使用麦克风权限。');
    }
  };

  const togglePause = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (isPaused) {
      mr.resume(); setIsPaused(false); drawWaveform();
      // Resume live transcription
      startLiveTranscription();
    } else {
      mr.pause(); setIsPaused(true); cancelAnimationFrame(animFrameRef.current);
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } }
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    // Stop live transcription
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } recognitionRef.current = null; }

    mr.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const id = Date.now().toString();
      const mode = recordingMode;
      const dur = elapsedTime;
      const template = selectedTemplate;

      // Save audio to IndexedDB (local) + R2 (cloud)
      saveAudioBlob(id, blob).catch(console.error);
      uploadToR2(id, blob);

      addNote({
        id,
        title: 'AI 处理中...',
        content: liveTranscript || '正在使用 WhisperX 转录...',
        summary: '正在处理...',
        keyPoints: [],
        actionItems: [],
        tags: [mode === 'meeting' || mode === 'interview' ? 'project' : 'inspiration'],
        mode,
        duration: dur,
        audioUrl: url,
        segments: [],
        speakerCount: 0,
        createdAt: now,
        updatedAt: now,
        isProcessing: true,
      });

      setIsRecording(false);
      setIsPaused(false);
      cancelAnimationFrame(animFrameRef.current);
      setLiveTranscript('');

      // P2-8: Clear draft
      if (draftIntervalRef.current) { clearInterval(draftIntervalRef.current); draftIntervalRef.current = null; }
      clearRecordingDraft().catch(() => {});

      // Show progress toast
      const showProgress = (stage: ProcessingStage, msg: string, retryFn?: () => void) => {
        setToast({ noteId: id, message: msg, type: stage === 'error' ? 'error' : stage === 'done' ? 'success' : 'processing', stage, onRetry: retryFn });
      };
      showProgress('uploading', '录音已保存，正在上传...');

      // Processing pipeline with progress tracking
      const runPipeline = async () => {
        const store = useAppStore.getState();
        try {
          const { transcribeWithWhisperX, transcribeWithQwen3, summarizeWithLLM, segmentsToTranscript } = await import('@/services/ai-service');
          const { getSharedLLMConfig } = await import('@/services/shared-config');

          // Stage 1: ASR
          showProgress('transcribing', '🎧 正在转录音频...');
          const engineForMode = store.asrEngineMap[mode] || 'qwen3';
          const wxResult = engineForMode === 'qwen3'
            ? await transcribeWithQwen3(blob, store.qwenAsrEndpoint)
            : await transcribeWithWhisperX(blob, store.whisperxEndpoint, {
                diarize: mode === 'meeting' || mode === 'interview',
              });

          const segments = wxResult.segments.map(s => ({
            start: s.start, end: s.end, text: s.text, speaker: s.speaker,
          }));
          const speakers = new Set(segments.map(s => s.speaker).filter(Boolean));
          const fullText = segmentsToTranscript(segments);
          store.updateNote(id, { content: fullText, segments, speakerCount: speakers.size, language: wxResult.language });

          // Stage 2: LLM Summary
          const llmConfig = await getSharedLLMConfig();
          if (llmConfig.apiEndpoint && llmConfig.apiKey) {
            showProgress('summarizing', '✨ AI 正在生成摘要...');
            try {
              const aiResult = await summarizeWithLLM(fullText, template, llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel);
              store.updateNote(id, { title: aiResult.title, summary: aiResult.summary, keyPoints: aiResult.keyPoints, actionItems: aiResult.actionItems, isProcessing: false, updatedAt: new Date() });
            } catch {
              store.updateNote(id, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
            }
          } else {
            store.updateNote(id, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
          }

          // Done
          showProgress('done', '✅ 处理完成');
          setTimeout(() => setToast(null), 4000);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : '未知错误';
          store.updateNote(id, { title: '转录失败', content: `转录出错: ${errMsg}`, summary: '转录失败，请重试', isProcessing: false, updatedAt: new Date() });
          showProgress('error', `❌ 转录失败: ${errMsg.slice(0, 60)}`, runPipeline);
        }
      };
      runPipeline();
    };

    mr.stop();
    mr.stream.getTracks().forEach((t) => t.stop());
  };

  const discardRecording = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } recognitionRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setElapsedTime(0);
    setLiveTranscript('');
    cancelAnimationFrame(animFrameRef.current);
    // P2-8: Clear draft
    if (draftIntervalRef.current) { clearInterval(draftIntervalRef.current); draftIntervalRef.current = null; }
    clearRecordingDraft().catch(() => {});
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const now = new Date();
    const id = Date.now().toString();
    const mode = recordingMode;
    const template = selectedTemplate;

    // Get audio duration
    let dur = 0;
    try {
      const audioCtx = new AudioContext();
      const arrayBuf = await file.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
      dur = Math.round(audioBuf.duration);
      audioCtx.close();
    } catch { dur = 0; }

    // Save to IndexedDB (local) + R2 (cloud)
    saveAudioBlob(id, file).catch(console.error);
    uploadToR2(id, file);

    addNote({
      id,
      title: `📎 ${file.name}`,
      content: '正在使用 WhisperX 转录上传的音频...',
      summary: '正在处理...',
      keyPoints: [],
      actionItems: [],
      tags: [mode === 'meeting' || mode === 'interview' ? 'project' : 'inspiration'],
      mode,
      duration: dur,
      audioUrl: URL.createObjectURL(file),
      segments: [],
      speakerCount: 0,
      createdAt: now,
      updatedAt: now,
      isProcessing: true,
    });

    setIsUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Progress toast helper
    const showProgress = (stage: ProcessingStage, msg: string, retryFn?: () => void) => {
      setToast({ noteId: id, message: msg, type: stage === 'error' ? 'error' : stage === 'done' ? 'success' : 'processing', stage, onRetry: retryFn });
    };

    // Processing pipeline
    const runPipeline = async () => {
      const store = useAppStore.getState();
      try {
        const { transcribeWithWhisperX, transcribeWithQwen3, summarizeWithLLM, segmentsToTranscript } = await import('@/services/ai-service');
        const { getSharedLLMConfig } = await import('@/services/shared-config');

        showProgress('transcribing', '🎧 正在转录音频...');
        const engineForMode = store.asrEngineMap[mode] || 'qwen3';
        const wxResult = engineForMode === 'qwen3'
          ? await transcribeWithQwen3(file, store.qwenAsrEndpoint)
          : await transcribeWithWhisperX(file, store.whisperxEndpoint, {
              diarize: mode === 'meeting' || mode === 'interview',
            });
        const segments = wxResult.segments.map(s => ({ start: s.start, end: s.end, text: s.text, speaker: s.speaker }));
        const speakers = new Set(segments.map(s => s.speaker).filter(Boolean));
        const fullText = segmentsToTranscript(segments);
        store.updateNote(id, { content: fullText, segments, speakerCount: speakers.size, language: wxResult.language });

        const llmConfig = await getSharedLLMConfig();
        if (llmConfig.apiEndpoint && llmConfig.apiKey) {
          showProgress('summarizing', '✨ AI 正在生成摘要...');
          try {
            const aiResult = await summarizeWithLLM(fullText, template, llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel);
            store.updateNote(id, { title: aiResult.title, summary: aiResult.summary, keyPoints: aiResult.keyPoints, actionItems: aiResult.actionItems, isProcessing: false, updatedAt: new Date() });
          } catch {
            store.updateNote(id, { title: segments[0]?.text?.slice(0, 30) || file.name, summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
          }
        } else {
          store.updateNote(id, { title: segments[0]?.text?.slice(0, 30) || file.name, summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
        }
        showProgress('done', '✅ 处理完成');
        setTimeout(() => setToast(null), 4000);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '未知错误';
        store.updateNote(id, { title: `转录失败: ${file.name}`, content: `转录出错: ${errMsg}`, summary: '转录失败，请重试', isProcessing: false, updatedAt: new Date() });
        showProgress('error', `❌ 转录失败: ${errMsg.slice(0, 60)}`, runPipeline);
      }
    };

    showProgress('uploading', '📤 音频已保存，正在上传...');
    runPipeline();
  };

  const currentTemplate = AI_TEMPLATES[selectedTemplate];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      {/* Title */}
      <h1 className="text-xl font-semibold text-[var(--color-text-secondary)] mb-8 lg:mb-12">
        Recording Workspace
      </h1>

      {/* P2-8: Draft Recovery Banner */}
      {draftRecovery && !isRecording && (
        <div className="w-full max-w-md mb-6 px-5 py-4 rounded-2xl bg-[var(--color-tag-amber)]/10 border border-[var(--color-tag-amber)]/30 animate-[slideUp_0.3s_ease-out]">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-[var(--color-tag-amber)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">发现未完成的录音</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">录时 {formatTime(draftRecovery.elapsed)} · {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Process the recovered draft as if it was a completed recording
                const blob = new Blob(draftRecovery.chunks, { type: 'audio/webm' });
                const id = Date.now().toString();
                const now = new Date();
                saveAudioBlob(id, blob).catch(console.error);
                uploadToR2(id, blob);
                addNote({
                  id, title: '恢复的录音', content: '正在转录中...', summary: '正在处理...', keyPoints: [], actionItems: [],
                  tags: ['inspiration'], mode: draftRecovery.mode as RecordingMode, duration: draftRecovery.elapsed,
                  audioUrl: URL.createObjectURL(blob), segments: [], speakerCount: 0, createdAt: now, updatedAt: now, isProcessing: true,
                });
                setDraftRecovery(null);
                clearRecordingDraft().catch(() => {});
                setToast({ noteId: id, message: '📦 恢复录音已保存，正在转录...', type: 'processing', stage: 'transcribing' });
                // Trigger ASR pipeline
                (async () => {
                  const store = useAppStore.getState();
                  try {
                    const { transcribeWithWhisperX, transcribeWithQwen3, summarizeWithLLM, segmentsToTranscript } = await import('@/services/ai-service');
                    const { getSharedLLMConfig } = await import('@/services/shared-config');
                    const engineForMode = store.asrEngineMap[draftRecovery.mode as RecordingMode] || 'qwen3';
                    const wxResult = engineForMode === 'qwen3'
                      ? await transcribeWithQwen3(blob, store.qwenAsrEndpoint)
                      : await transcribeWithWhisperX(blob, store.whisperxEndpoint, { diarize: draftRecovery.mode === 'meeting' || draftRecovery.mode === 'interview' });
                    const segments = wxResult.segments.map(s => ({ start: s.start, end: s.end, text: s.text, speaker: s.speaker }));
                    const fullText = segmentsToTranscript(segments);
                    const speakers = new Set(segments.map(s => s.speaker).filter(Boolean));
                    store.updateNote(id, { content: fullText, segments, speakerCount: speakers.size, language: wxResult.language });
                    const llmConfig = await getSharedLLMConfig();
                    if (llmConfig.apiEndpoint && llmConfig.apiKey) {
                      setToast({ noteId: id, message: '✨ AI 正在生成摘要...', type: 'processing', stage: 'summarizing' });
                      try {
                        const tmplKey = (draftRecovery.template as AITemplate) || 'auto';
                        const aiResult = await summarizeWithLLM(fullText, tmplKey, llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel);
                        store.updateNote(id, { title: aiResult.title, summary: aiResult.summary, keyPoints: aiResult.keyPoints, actionItems: aiResult.actionItems, isProcessing: false, updatedAt: new Date() });
                      } catch { store.updateNote(id, { title: '恢复的录音', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() }); }
                    } else { store.updateNote(id, { title: '恢复的录音', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() }); }
                    setToast({ noteId: id, message: '✅ 恢复录音处理完成', type: 'success', stage: 'done' });
                    setTimeout(() => setToast(null), 4000);
                  } catch (err) {
                    const errMsg = err instanceof Error ? err.message : '未知错误';
                    store.updateNote(id, { title: '恢复的录音', content: `转录出错: ${errMsg}`, summary: '转录失败', isProcessing: false, updatedAt: new Date() });
                    setToast({ noteId: id, message: `❌ 转录失败: ${errMsg.slice(0, 60)}`, type: 'error', stage: 'error' });
                  }
                })();
              }}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-primary)] text-black hover:brightness-110 transition-all cursor-pointer"
            >
              恢复并转录
            </button>
            <button
              onClick={() => { setDraftRecovery(null); clearRecordingDraft().catch(() => {}); }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
            >
              丢弃
            </button>
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="text-6xl lg:text-8xl font-bold tracking-tight mb-2 tabular-nums">
        {formatTime(elapsedTime)}
      </div>

      {/* Waveform */}
      <div className="w-full max-w-2xl h-24 lg:h-32 my-6">
        <canvas
          ref={canvasRef}
          width={800}
          height={160}
          className="w-full h-full"
        />
      </div>

      {/* Live Transcript */}
      {isRecording && liveTranscript && (
        <div className="w-full max-w-2xl mb-6">
          <div className="card p-4 max-h-32 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-error)] animate-pulse" />
              <span className="text-xs text-[var(--color-text-tertiary)]">实时转录</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {liveTranscript.split('\u200B').map((part, i) => (
                i === liveTranscript.split('\u200B').length - 1 && liveTranscript.includes('\u200B')
                  ? <span key={i} className="text-[var(--color-primary)] opacity-60">{part}</span>
                  : <span key={i}>{part}</span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Mode + Template Selector */}
      <div className="flex flex-col items-center gap-4 mb-8">
        {/* Mode Selector */}
        <div className="flex gap-2 lg:gap-3 flex-wrap justify-center">
          {modes.map((mode) => (
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
            <span>语言: {languages.find(l => l.code === speechLang)?.flag} {languages.find(l => l.code === speechLang)?.label}</span>
          </button>
          {showLangMenu && !isRecording && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 card p-2 z-50 shadow-xl">
              {languages.map(lang => (
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
