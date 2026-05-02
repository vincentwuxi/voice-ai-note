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
  // Proxy mode: endpoint starts with "/" (e.g. "/api/transcribe") — server-side proxy
  // Direct mode: endpoint is full URL (e.g. "http://localhost:9100") — local dev
  const isProxy = endpoint.startsWith('/');
  const url = isProxy
    ? `${endpoint}${queryString ? `?${queryString}` : ''}`
    : `${endpoint}/transcribe${queryString ? `?${queryString}` : ''}`;

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
