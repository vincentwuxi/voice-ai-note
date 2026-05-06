import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Server-side proxy for Qwen3-ASR-1.7B transcription.
 *
 * Forwards audio to the Qwen3-ASR FastAPI service running on Server A.
 * The env binding QWEN_ASR_ENDPOINT should point to the internal service
 * (e.g., http://100.67.209.116:9946).
 */
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const endpoint = env.QWEN_ASR_ENDPOINT;
    const clientId = env.CF_ACCESS_CLIENT_ID;
    const clientSecret = env.CF_ACCESS_CLIENT_SECRET;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Qwen3-ASR endpoint not configured. Set QWEN_ASR_ENDPOINT in wrangler.' },
        { status: 500 }
      );
    }

    const incomingForm = await request.formData();
    const audioFile = incomingForm.get('file') as File | null;
    if (!audioFile) {
      return NextResponse.json({ error: 'No file in form data' }, { status: 400 });
    }

    // endpoint may be "https://whisperx.aivolo.com/qwen-asr" (tunnel) or "http://host:9946" (direct)
    // Qwen3-ASR FastAPI expects POST /asr
    const url = `${endpoint}/asr`;

    const headers: Record<string, string> = {};
    if (clientId && clientSecret) {
      headers['CF-Access-Client-Id'] = clientId;
      headers['CF-Access-Client-Secret'] = clientSecret;
    }

    const outForm = new FormData();
    outForm.append('file', audioFile, audioFile.name || 'recording.webm');

    const res = await fetch(url, {
      method: 'POST',
      body: outForm,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Qwen3-ASR error (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Normalize Qwen3 response to WhisperX-compatible format
    // Qwen3 returns: { language: "Chinese", text: "..." }
    // We normalize to: { language: "zh", diarization: false, segments: [...] }
    const langMap: Record<string, string> = {
      'Chinese': 'zh', 'English': 'en', 'Japanese': 'ja',
      'Korean': 'ko', 'French': 'fr', 'German': 'de',
      'Spanish': 'es', 'Italian': 'it', 'Portuguese': 'pt',
      'Russian': 'ru', 'Arabic': 'ar', 'Hindi': 'hi',
    };

    const normalizedLang = langMap[data.language] || data.language?.toLowerCase()?.slice(0, 2) || 'zh';

    // Split text into sentences for basic segmentation
    const text = data.text || '';
    const sentences = text.split(/[。！？.!?]+/).filter((s: string) => s.trim());
    const segments = sentences.length > 0
      ? sentences.map((s: string, i: number) => ({
          start: 0,
          end: 0,
          text: s.trim(),
        }))
      : [{ start: 0, end: 0, text }];

    return NextResponse.json({
      language: normalizedLang,
      diarization: false,
      segments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * Health check for Qwen3-ASR
 */
export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const endpoint = env.QWEN_ASR_ENDPOINT;

    if (!endpoint) {
      return NextResponse.json({ status: 'error', message: 'QWEN_ASR_ENDPOINT not configured' }, { status: 500 });
    }

    const res = await fetch(endpoint, { method: 'GET' });
    return NextResponse.json({
      status: res.ok || res.status === 404 || res.status === 405 ? 'ok' : 'error',
      engine: 'Qwen3-ASR-1.7B',
      qwenStatus: res.status,
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'Connection failed',
    }, { status: 502 });
  }
}
