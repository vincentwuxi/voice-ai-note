import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface SharedRow {
  share_id: string;
  note_id: string;
  expires_at: string;
}

interface NoteRow {
  id: string;
  title: string;
  summary: string;
  key_points: string;
  action_items: string;
  tags: string;
  mode: string;
  duration: number;
  segments: string;
  speaker_count: number;
  language: string;
  created_at: string;
}

/**
 * GET /api/share/[id] — public endpoint, no auth required
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { env } = await getCloudflareContext();

  const share = await env.DB.prepare('SELECT * FROM shared_notes WHERE share_id = ?')
    .bind(id).first<SharedRow>();

  if (!share) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
  }

  const note = await env.DB.prepare('SELECT * FROM notes WHERE id = ?')
    .bind(share.note_id).first<NoteRow>();

  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  return NextResponse.json({
    note: {
      title: note.title,
      summary: note.summary,
      keyPoints: JSON.parse(note.key_points || '[]'),
      actionItems: JSON.parse(note.action_items || '[]'),
      tags: JSON.parse(note.tags || '[]'),
      mode: note.mode,
      duration: note.duration,
      segments: JSON.parse(note.segments || '[]'),
      speakerCount: note.speaker_count,
      language: note.language,
      createdAt: note.created_at,
    },
    expiresAt: share.expires_at,
  });
}
