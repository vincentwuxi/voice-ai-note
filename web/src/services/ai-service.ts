import { TranscriptSegment, AI_TEMPLATES, AITemplate } from '@/store/app-store';

export interface WhisperXResponse {
  language: string;
  diarization: boolean;
  segments: {
    start: number;
    end: number;
    text: string;
    speaker?: string;
    words?: { word: string; start: number; end: number }[];
  }[];
}

/**
 * Call WhisperX API for transcription + speaker diarization
 */
export async function transcribeWithWhisperX(
  audioBlob: Blob,
  endpoint: string,
  options?: {
    language?: string;
    diarize?: boolean;
    minSpeakers?: number;
    maxSpeakers?: number;
  }
): Promise<WhisperXResponse> {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'recording.webm');

  const params = new URLSearchParams();
  if (options?.language) params.set('language', options.language);
  if (options?.diarize === false) params.set('diarize', 'false');
  if (options?.minSpeakers) params.set('min_speakers', options.minSpeakers.toString());
  if (options?.maxSpeakers) params.set('max_speakers', options.maxSpeakers.toString());

  const queryString = params.toString();
  // Proxy mode: endpoint starts with "/" (e.g. "/api/transcribe") — server-side proxy handles path
  // Direct mode: endpoint is full URL (e.g. "http://localhost:9000") — calls /asr directly
  const isProxy = endpoint.startsWith('/');
  if (!isProxy && !params.has('output')) params.set('output', 'json');
  const finalQuery = params.toString();
  const url = isProxy
    ? `${endpoint}${finalQuery ? `?${finalQuery}` : ''}`
    : `${endpoint}/asr${finalQuery ? `?${finalQuery}` : ''}`;

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhisperX 转录失败 (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Call Qwen3-ASR-1.7B API for transcription
 * Returns a WhisperXResponse-compatible result for seamless engine switching.
 *
 * Qwen3-ASR response format:
 *   { "language": "Chinese", "text": "转录文本..." }
 *
 * The proxy at /api/transcribe-qwen normalizes it to WhisperXResponse format.
 */
export async function transcribeWithQwen3(
  audioBlob: Blob,
  endpoint: string,
): Promise<WhisperXResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');

  const isProxy = endpoint.startsWith('/');
  const url = isProxy ? endpoint : `${endpoint}/asr`;

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Qwen3-ASR 转录失败 (${res.status}): ${text}`);
  }

  const data = await res.json();

  // If the proxy already normalized to WhisperXResponse format, return directly
  if (data.segments) return data;

  // Raw Qwen3 response: { language: "Chinese", text: "..." }
  // Normalize to WhisperXResponse format
  return {
    language: data.language || 'zh',
    diarization: false,
    segments: [{
      start: 0,
      end: 0,
      text: data.text || '',
    }],
  };
}

/**
 * Call LLM API with template-based prompt
 */
export async function summarizeWithLLM(
  transcript: string,
  template: AITemplate,
  apiEndpoint: string,
  apiKey: string,
  model: string
): Promise<{
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}> {
  const tmpl = AI_TEMPLATES[template] || AI_TEMPLATES.auto;

  const res = await fetch(`${apiEndpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: tmpl.prompt },
        { role: 'user', content: transcript },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM 摘要失败 (${res.status})`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fallback */ }

  return {
    title: '语音笔记',
    summary: content.slice(0, 200),
    keyPoints: [],
    actionItems: [],
  };
}

/**
 * Convert WhisperX segments to readable transcript text
 */
export function segmentsToTranscript(segments: TranscriptSegment[]): string {
  const speakers = new Set(segments.map(s => s.speaker).filter(Boolean));

  if (speakers.size <= 1) {
    return segments.map(s => s.text).join('');
  }

  let result = '';
  let lastSpeaker = '';
  for (const seg of segments) {
    const speaker = seg.speaker || 'SPEAKER_00';
    if (speaker !== lastSpeaker) {
      if (result) result += '\n\n';
      const speakerLabel = `说话人 ${parseInt(speaker.replace('SPEAKER_', '')) + 1}`;
      result += `【${speakerLabel}】`;
      lastSpeaker = speaker;
    }
    result += seg.text;
  }
  return result;
}

/**
 * Translate transcript text using LLM API.
 * Supports any language pair (e.g. EN→ZH, ZH→EN).
 * Preserves speaker labels like 【说话人 1】.
 */
export async function translateTranscript(
  text: string,
  targetLang: string,
  apiEndpoint: string,
  apiKey: string,
  model: string
): Promise<string> {
  const langNames: Record<string, string> = {
    'zh': '中文', 'en': 'English', 'ja': '日本語',
    'ko': '한국어', 'fr': 'Français', 'de': 'Deutsch',
    'es': 'Español', 'it': 'Italiano', 'pt': 'Português',
    'ru': 'Русский', 'ar': 'العربية',
  };
  const targetName = langNames[targetLang] || targetLang;

  const res = await fetch(`${apiEndpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `你是专业翻译助手。请将以下转录内容准确翻译为${targetName}。
规则：
1. 保留所有说话人标签格式（如【说话人 1】、【说话人 2】等）不要翻译
2. 保持段落结构和换行
3. 翻译要自然流畅、符合目标语言习惯
4. 专业术语保留原文在括号中标注
5. 只输出翻译结果，不要添加任何额外说明`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`翻译失败 (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Translate segments while preserving their structure (timestamps, speaker IDs).
 * Groups consecutive segments by speaker, translates each group, then maps
 * translated text back onto original segment boundaries.
 */
export async function translateSegments(
  segments: TranscriptSegment[],
  targetLang: string,
  apiEndpoint: string,
  apiKey: string,
  model: string
): Promise<TranscriptSegment[]> {
  if (!segments || segments.length === 0) return [];

  const langNames: Record<string, string> = {
    'zh': '中文', 'en': 'English', 'ja': '日本語',
    'ko': '한국어', 'fr': 'Français', 'de': 'Deutsch',
    'es': 'Español', 'it': 'Italiano', 'pt': 'Português',
    'ru': 'Русский', 'ar': 'العربية',
  };
  const targetName = langNames[targetLang] || targetLang;

  // Group consecutive segments by speaker
  const groups: { speaker: string; texts: string[]; segIndices: number[] }[] = [];
  let currentGroup: typeof groups[0] | null = null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const speaker = seg.speaker || 'SPEAKER_00';
    if (!currentGroup || currentGroup.speaker !== speaker) {
      currentGroup = { speaker, texts: [seg.text], segIndices: [i] };
      groups.push(currentGroup);
    } else {
      currentGroup.texts.push(seg.text);
      currentGroup.segIndices.push(i);
    }
  }

  // Build a numbered input so LLM can return translations in the same order
  const numberedInput = groups.map((g, i) => `[${i}] ${g.texts.join('')}`).join('\n');

  const res = await fetch(`${apiEndpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `你是专业翻译助手。用户会提供编号的段落，请将每一段准确翻译为${targetName}。
规则：
1. 保持编号格式 [0], [1], [2]... 不变
2. 每段翻译独占一行
3. 翻译要自然流畅、符合目标语言习惯
4. 专业术语保留原文在括号中标注
5. 只输出翻译结果，不要添加任何额外说明`,
        },
        { role: 'user', content: numberedInput },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`翻译失败 (${res.status})`);
  }

  const data = await res.json();
  const translatedText = data.choices?.[0]?.message?.content || '';

  // Parse numbered output back into groups
  const translatedGroups: string[] = [];
  const lines = translatedText.split('\n').filter((l: string) => l.trim());
  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.*)/);
    if (match) {
      const idx = parseInt(match[1]);
      translatedGroups[idx] = match[2].trim();
    }
  }

  // Map translations back onto segments, preserving timestamps and speaker IDs
  const result: TranscriptSegment[] = segments.map(seg => ({ ...seg }));
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const translated = translatedGroups[gi] || group.texts.join('');
    // If group has only one segment, assign directly
    if (group.segIndices.length === 1) {
      result[group.segIndices[0]].text = translated;
    } else {
      // Distribute translated text across segments proportionally by original text length
      const totalOrigLen = group.texts.reduce((sum, t) => sum + t.length, 0);
      let offset = 0;
      for (let si = 0; si < group.segIndices.length; si++) {
        const origLen = group.texts[si].length;
        const proportion = origLen / totalOrigLen;
        const charCount = si < group.segIndices.length - 1
          ? Math.round(translated.length * proportion)
          : translated.length - offset;
        result[group.segIndices[si]].text = translated.slice(offset, offset + charCount);
        offset += charCount;
      }
    }
  }

  return result;
}

