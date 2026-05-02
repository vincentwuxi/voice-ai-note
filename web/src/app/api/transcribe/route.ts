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
    const formData = await request.formData();

    // Build query string from search params
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${endpoint}/transcribe${searchParams ? `?${searchParams}` : ''}`;

    // Build headers — inject Service Token for Cloudflare Access
    const headers: Record<string, string> = {};
    if (clientId && clientSecret) {
      headers['CF-Access-Client-Id'] = clientId;
      headers['CF-Access-Client-Secret'] = clientSecret;
    }

    // Forward to WhisperX
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `WhisperX error (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
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
