import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/llm-config — get LLM config from D1 for transcription pipeline (authenticated)
 * Returns full apiKey (server-side use only, consumed by frontend AI service)
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = await getCloudflareContext();
  const rows = await env.DB.prepare('SELECT key, value FROM app_config WHERE key IN (?, ?, ?)')
    .bind('apiEndpoint', 'apiKey', 'selectedModel')
    .all<{ key: string; value: string }>();

  const config: Record<string, string> = {};
  for (const row of rows.results) {
    config[row.key] = row.value;
  }

  return NextResponse.json({ config });
}
