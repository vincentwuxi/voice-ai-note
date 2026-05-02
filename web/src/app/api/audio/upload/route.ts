import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/audio/upload — Upload audio to R2
 * Body: FormData with 'file' (Blob) and 'noteId' (string)
 */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { env } = await getCloudflareContext();
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const noteId = formData.get('noteId') as string | null;

  if (!file || !noteId) {
    return NextResponse.json({ error: 'Missing file or noteId' }, { status: 400 });
  }

  const r2Key = `${user.email}/${noteId}`;
  const contentType = file.type || 'audio/webm';

  // Upload to R2
  await env.AUDIO_BUCKET.put(r2Key, file.stream(), {
    httpMetadata: { contentType },
    customMetadata: { userEmail: user.email, noteId },
  });

  // Record in D1
  await env.DB.prepare(
    `INSERT OR REPLACE INTO audio_files (id, user_email, note_id, filename, size_bytes, content_type, r2_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(noteId, user.email, noteId, file.name || `${noteId}.webm`, file.size, contentType, r2Key).run();

  return NextResponse.json({
    success: true,
    audioUrl: `/api/audio/${noteId}`,
    size: file.size,
  });
}
