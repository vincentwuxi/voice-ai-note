import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Server-side proxy for WhisperX transcription.
 *
 * Security: The Cloudflare Access Service Token is injected here
 * and NEVER exposed to the browser. Only this Worker can reach
 * WhisperX through the Cloudflare Tunnel.
 */
export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare environment bindings
    const { env } = await getCloudflareContext();
    const endpoint = env.WHISPERX_ENDPOINT;
    const clientId = env.CF_ACCESS_CLIENT_ID;
    const clientSecret = env.CF_ACCESS_CLIENT_SECRET;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'WhisperX endpoint not configured' },
        { status: 500 }
      );
    }

    // Forward the FormData from the browser
    // Re-construct FormData to avoid multipart boundary issues in Workers runtime
    const incomingForm = await request.formData();
    const audioFile = incomingForm.get('audio_file') as File | null;
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio_file in form data' }, { status: 400 });
    }

    // Build query string from search params
    // The openai-whisper-asr-webservice uses /asr endpoint with output=json
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    if (!searchParams.has('output')) searchParams.set('output', 'json');
    const queryString = searchParams.toString();
    const url = `${endpoint}/asr${queryString ? `?${queryString}` : ''}`;

    // Build headers — inject Service Token for Cloudflare Access
    const headers: Record<string, string> = {};
    if (clientId && clientSecret) {
      headers['CF-Access-Client-Id'] = clientId;
      headers['CF-Access-Client-Secret'] = clientSecret;
    }

    // Re-create clean FormData with the audio blob
    const outForm = new FormData();
    outForm.append('audio_file', audioFile, audioFile.name || 'recording.webm');

    // Forward to WhisperX
    const res = await fetch(url, {
      method: 'POST',
      body: outForm,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `WhisperX error (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    // Normalize response: whisper-asr-webservice returns { language, segments, text }
    // Our frontend expects { language, diarization, segments[{start, end, text, speaker?, words?}] }
    const data = await res.json();
    const normalized = {
      language: data.language || 'en',
      diarization: false,
      segments: (data.segments || []).map((s: Record<string, unknown>) => ({
        start: s.start,
        end: s.end,
        text: s.text,
        speaker: s.speaker,
        words: s.words,
      })),
    };
    return NextResponse.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * Health check: verify WhisperX is reachable through tunnel
 */
export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const endpoint = env.WHISPERX_ENDPOINT;
    const clientId = env.CF_ACCESS_CLIENT_ID;
    const clientSecret = env.CF_ACCESS_CLIENT_SECRET;

    if (!endpoint) {
      return NextResponse.json({ status: 'error', message: 'Not configured' }, { status: 500 });
    }

    const headers: Record<string, string> = {};
    if (clientId && clientSecret) {
      headers['CF-Access-Client-Id'] = clientId;
      headers['CF-Access-Client-Secret'] = clientSecret;
    }

    const res = await fetch(endpoint, { headers });
    return NextResponse.json({
      status: res.ok || res.status === 404 || res.status === 405 ? 'ok' : 'error',
      whisperxStatus: res.status,
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'Connection failed',
    }, { status: 502 });
  }
}
