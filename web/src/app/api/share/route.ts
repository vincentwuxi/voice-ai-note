import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/share — create a share link for a note
 * Body: { noteId: string, expiresInDays?: number }
 */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { noteId, expiresInDays = 7 } = await request.json();
  if (!noteId) return NextResponse.json({ error: 'Missing noteId' }, { status: 400 });

  const { env } = await getCloudflareContext();

  // Ensure table exists
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS shared_notes (
    share_id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();

  // Check note belongs to user
  const note = await env.DB.prepare('SELECT id FROM notes WHERE id = ? AND user_email = ?')
    .bind(noteId, user.email).first();
  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

  // Check existing share
  const existing = await env.DB.prepare('SELECT share_id FROM shared_notes WHERE note_id = ? AND user_email = ?')
    .bind(noteId, user.email).first<{ share_id: string }>();
  if (existing) {
    // Update expiration
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
    await env.DB.prepare('UPDATE shared_notes SET expires_at = ? WHERE share_id = ?')
      .bind(expiresAt, existing.share_id).run();
    return NextResponse.json({ shareId: existing.share_id, expiresAt });
  }

  // Create new share
  const shareId = crypto.randomUUID().slice(0, 8);
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

  await env.DB.prepare(
    'INSERT INTO shared_notes (share_id, note_id, user_email, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(shareId, noteId, user.email, expiresAt).run();

  return NextResponse.json({ shareId, expiresAt });
}
