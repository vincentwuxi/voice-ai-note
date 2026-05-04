import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/config — get shared LLM config (admin only)
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if (result instanceof NextResponse) return result;

  const { env } = await getCloudflareContext();
  const rows = await env.DB.prepare('SELECT key, value FROM app_config').all<{ key: string; value: string }>();

  const config: Record<string, string> = {};
  for (const row of rows.results) {
    config[row.key] = row.value;
  }

  return NextResponse.json({ config });
}

/**
 * PUT /api/admin/config — update shared LLM config (admin only)
 */
export async function PUT(request: NextRequest) {
  const result = await requireAdmin(request);
  if (result instanceof NextResponse) return result;
  const admin = result;

  const { env } = await getCloudflareContext();
  const body = await request.json() as Record<string, string>;

  const allowedKeys = ['apiEndpoint', 'apiKey', 'selectedModel', 'whisperxEndpoint', 'asrEngine', 'qwenAsrEndpoint'];
  const batch: ReturnType<typeof env.DB.prepare>[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (allowedKeys.includes(key)) {
      batch.push(
        env.DB.prepare(
          'INSERT OR REPLACE INTO app_config (key, value, updated_at, updated_by) VALUES (?, ?, datetime(\'now\'), ?)'
        ).bind(key, value, admin.email)
      );
    }
  }

  if (batch.length > 0) {
    await env.DB.batch(batch);
  }

  return NextResponse.json({ ok: true });
}
