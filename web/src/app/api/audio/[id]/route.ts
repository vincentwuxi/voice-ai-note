import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/audio/[id] — Stream audio from R2
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { env } = await getCloudflareContext();
  const r2Key = `${user.email}/${id}`;

  const object = await env.AUDIO_BUCKET.get(r2Key);
  if (!object) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/webm');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=3600');
  if (object.size) {
    headers.set('Content-Length', object.size.toString());
  }

  return new Response(object.body, { headers });
}

/**
 * DELETE /api/audio/[id] — Remove audio from R2 + D1
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { env } = await getCloudflareContext();
  const r2Key = `${user.email}/${id}`;

  await env.AUDIO_BUCKET.delete(r2Key);
  await env.DB.prepare('DELETE FROM audio_files WHERE id = ? AND user_email = ?')
    .bind(id, user.email).run();

  return NextResponse.json({ success: true });
}
