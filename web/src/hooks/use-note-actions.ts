'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import type { AITemplate, Note } from '@/store/types';
import { getAudioBlob } from '@/services/db';

type FeedbackMsg = { text: string; type: 'error' | 'success' } | null;

/**
 * useNoteActions — Encapsulates heavy async operations for the note detail page:
 * - Re-transcription (dual-engine ASR with fallback + LLM summary)
 * - Translation (segment-aware or plain text)
 * 
 * Keeps the note detail page as a thin UI shell.
 */
export function useNoteActions(noteId: string, note: Note | undefined) {
  const { updateNote } = useAppStore();

  // Retranscribe state
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<FeedbackMsg>(null);

  // Translate state
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);

  const setFeedback = useCallback((msg: FeedbackMsg, autoHideMs?: number) => {
    setFeedbackMsg(msg);
    if (autoHideMs && msg) {
      setTimeout(() => setFeedbackMsg(null), autoHideMs);
    }
  }, []);

  // ===== Re-transcribe: reload audio from storage and re-run ASR + LLM =====
  const retranscribe = useCallback(async (forceEngine?: 'whisperx' | 'qwen3') => {
    if (!note) return;
    setIsRetranscribing(true);
    setFeedback({ text: '🎧 正在加载音频...', type: 'success' });

    try {
      // Step 1: Load audio blob from R2 or IndexedDB
      let audioBlob: Blob | null = null;

      try {
        const r2Res = await fetch(`/api/audio/${noteId}`);
        if (r2Res.ok) { audioBlob = await r2Res.blob(); }
      } catch { /* R2 unavailable */ }

      if (!audioBlob) { audioBlob = await getAudioBlob(noteId); }

      if (!audioBlob || audioBlob.size === 0) {
        setFeedback({ text: '❌ 找不到原始音频文件，无法重新转录', type: 'error' }, 5000);
        setIsRetranscribing(false);
        return;
      }

      // Step 2: Run ASR with fallback
      setFeedback({ text: '🎧 正在转录音频...', type: 'success' });
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
        setFeedback({ text: `⚠️ ${engine} 失败，尝试 ${fallbackEngine}...`, type: 'error' });
        try {
          wxResult = fallbackEngine === 'qwen3'
            ? await transcribeWithQwen3(audioBlob, store.qwenAsrEndpoint)
            : await transcribeWithWhisperX(audioBlob, store.whisperxEndpoint, {
                diarize: note.mode === 'meeting' || note.mode === 'interview',
              });
        } catch { throw primaryErr; }
      }

      const segments = wxResult.segments.map(s => ({ start: s.start, end: s.end, text: s.text, speaker: s.speaker }));
      const speakers = new Set(segments.map(s => s.speaker).filter(Boolean));
      const fullText = segmentsToTranscript(segments);
      updateNote(noteId, { content: fullText, segments, speakerCount: speakers.size, language: wxResult.language });

      // Step 3: LLM Summary
      const { getSharedLLMConfig } = await import('@/services/shared-config');
      const llmConfig = await getSharedLLMConfig();
      if (llmConfig.apiEndpoint && llmConfig.apiKey) {
        setFeedback({ text: '✨ AI 正在生成摘要...', type: 'success' });
        try {
          const aiResult = await summarizeWithLLM(fullText, (note.mode as AITemplate) || 'auto', llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel);
          updateNote(noteId, { title: aiResult.title, summary: aiResult.summary, keyPoints: aiResult.keyPoints, actionItems: aiResult.actionItems, isProcessing: false, updatedAt: new Date() });
        } catch {
          updateNote(noteId, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
        }
      } else {
        updateNote(noteId, { title: segments[0]?.text?.slice(0, 30) || '语音笔记', summary: fullText.slice(0, 200), isProcessing: false, updatedAt: new Date() });
      }

      setFeedback({ text: '✅ 重新转录完成', type: 'success' }, 4000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '未知错误';
      setFeedback({ text: `❌ 转录失败: ${errMsg}`, type: 'error' }, 8000);
    }
    setIsRetranscribing(false);
  }, [note, noteId, updateNote, setFeedback]);

  // ===== Translate transcript =====
  const translateTo = useCallback(async (langCode: string, langLabel: string) => {
    if (!note) return;
    setShowTranslateMenu(false);
    setIsTranslating(true);
    setFeedback({ text: `🌐 正在翻译为 ${langLabel}...`, type: 'success' });

    const isMultiSpeaker = note.speakerCount > 1;
    const hasSegments = note.segments && note.segments.length > 0;

    try {
      const { translateTranscript, translateSegments, segmentsToTranscript } = await import('@/services/ai-service');
      const { getSharedLLMConfig } = await import('@/services/shared-config');
      const llmConfig = await getSharedLLMConfig();
      if (!llmConfig.apiEndpoint || !llmConfig.apiKey) {
        throw new Error('请先在设置中配置 LLM API');
      }
      if (isMultiSpeaker && hasSegments) {
        const translatedSegs = await translateSegments(
          note.segments, langCode,
          llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel
        );
        const translatedText = segmentsToTranscript(translatedSegs);
        updateNote(noteId, { translatedSegments: translatedSegs, translatedContent: translatedText, targetLanguage: langCode });
      } else {
        const translated = await translateTranscript(
          note.content, langCode,
          llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel
        );
        updateNote(noteId, { translatedContent: translated, targetLanguage: langCode });
      }
      setShowTranslated(true);
      setFeedback({ text: '✅ 翻译完成', type: 'success' }, 3000);
    } catch (err) {
      setFeedback({ text: `❌ 翻译失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' }, 5000);
    }
    setIsTranslating(false);
  }, [note, noteId, updateNote, setFeedback]);

  const toggleTranslation = useCallback(() => {
    if (note?.translatedContent || note?.translatedSegments) {
      setShowTranslated(v => !v);
    } else {
      setShowTranslateMenu(v => !v);
    }
  }, [note]);

  return {
    // Retranscribe
    isRetranscribing,
    retranscribe,
    // Translate
    isTranslating,
    showTranslated,
    showTranslateMenu,
    setShowTranslateMenu,
    translateTo,
    toggleTranslation,
    // Feedback
    feedbackMsg,
    setFeedbackMsg: setFeedback,
  };
}
