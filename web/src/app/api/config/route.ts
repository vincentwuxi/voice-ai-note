import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/config — get shared LLM config (any authenticated user)
 * Returns config without exposing apiKey (masked)
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = await getCloudflareContext();
  const rows = await env.DB.prepare('SELECT key, value FROM app_config').all<{ key: string; value: string }>();

  const config: Record<string, string> = {};
  for (const row of rows.results) {
    // Mask API key for non-admin users
    if (row.key === 'apiKey' && user.role !== 'admin') {
      config[row.key] = row.value ? `${row.value.slice(0, 6)}${'*'.repeat(20)}` : '';
    } else {
      config[row.key] = row.value;
    }
  }

  return NextResponse.json({ config });
}
