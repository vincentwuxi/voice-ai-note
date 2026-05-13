import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * GET /api/health
 * Health check endpoint — verifies D1, R2, and ASR proxy connectivity.
 * Returns 200 if all services are reachable, 503 if any are down.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {};

  try {
    const { env } = await getCloudflareContext();

    // 1. D1 Database
    const d1Start = Date.now();
    try {
      const result = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
      checks.d1 = { status: 'ok', latencyMs: Date.now() - d1Start };
    } catch (err) {
      checks.d1 = { status: 'error', latencyMs: Date.now() - d1Start, error: String(err) };
    }

    // 2. R2 Bucket (list with limit 1 to verify connectivity)
    const r2Start = Date.now();
    try {
      await env.AUDIO_BUCKET.list({ limit: 1 });
      checks.r2 = { status: 'ok', latencyMs: Date.now() - r2Start };
    } catch (err) {
      checks.r2 = { status: 'error', latencyMs: Date.now() - r2Start, error: String(err) };
    }

    // 3. ASR Proxy — WhisperX (HEAD check)
    const whisperStart = Date.now();
    try {
      const res = await fetch(env.WHISPERX_ENDPOINT, {
        method: 'HEAD',
        headers: {
          'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
          'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
        },
        signal: AbortSignal.timeout(5000),
      });
      checks.whisperx = { status: res.ok || res.status === 405 ? 'ok' : 'error', latencyMs: Date.now() - whisperStart };
    } catch (err) {
      checks.whisperx = { status: 'error', latencyMs: Date.now() - whisperStart, error: String(err) };
    }

    // 4. ASR Proxy — Qwen3
    const qwenStart = Date.now();
    try {
      const res = await fetch(env.QWEN_ASR_ENDPOINT, {
        method: 'HEAD',
        headers: {
          'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
          'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
        },
        signal: AbortSignal.timeout(5000),
      });
      checks.qwen3 = { status: res.ok || res.status === 405 ? 'ok' : 'error', latencyMs: Date.now() - qwenStart };
    } catch (err) {
      checks.qwen3 = { status: 'error', latencyMs: Date.now() - qwenStart, error: String(err) };
    }

    const allOk = Object.values(checks).every(c => c.status === 'ok');
    const totalMs = Date.now() - start;

    return NextResponse.json(
      {
        status: allOk ? 'healthy' : 'degraded',
        totalMs,
        checks,
        timestamp: new Date().toISOString(),
      },
      { status: allOk ? 200 : 503 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        totalMs: Date.now() - start,
        error: String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
