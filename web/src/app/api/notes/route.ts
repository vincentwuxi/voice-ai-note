import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserFromRequest } from '@/lib/auth';

interface NoteRow {
  id: string;
  user_email: string;
  title: string;
  content: string;
  summary: string;
  key_points: string;
  action_items: string;
  tags: string;
  mode: string;
  duration: number;
  segments: string;
  speaker_count: number;
  language: string;
  is_processing: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/notes — fetch all user notes from D1
 */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { env } = await getCloudflareContext();
  const result = await env.DB.prepare(
    'SELECT * FROM notes WHERE user_email = ? ORDER BY created_at DESC'
  ).bind(user.email).all<NoteRow>();

  const notes = (result.results || []).map((row: NoteRow) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    summary: row.summary,
    keyPoints: JSON.parse(row.key_points || '[]'),
    actionItems: JSON.parse(row.action_items || '[]'),
    tags: JSON.parse(row.tags || '[]'),
    mode: row.mode,
    duration: row.duration,
    segments: JSON.parse(row.segments || '[]'),
    speakerCount: row.speaker_count,
    language: row.language,
    isProcessing: Boolean(row.is_processing),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ notes });
}

/**
 * POST /api/notes — save/update a note to D1
 * Body: { note: NotePayload }
 */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { note } = await request.json();
  if (!note || !note.id) {
    return NextResponse.json({ error: 'Missing note data' }, { status: 400 });
  }

  const { env } = await getCloudflareContext();

  await env.DB.prepare(
    `INSERT OR REPLACE INTO notes 
     (id, user_email, title, content, summary, key_points, action_items, tags, mode, duration, segments, speaker_count, language, is_processing, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    note.id,
    user.email,
    note.title || '',
    note.content || '',
    note.summary || '',
    JSON.stringify(note.keyPoints || []),
    JSON.stringify(note.actionItems || []),
    JSON.stringify(note.tags || []),
    note.mode || 'thoughts',
    note.duration || 0,
    JSON.stringify(note.segments || []),
    note.speakerCount || 0,
    note.language || 'zh',
    note.isProcessing ? 1 : 0,
    note.createdAt || new Date().toISOString(),
    note.updatedAt || new Date().toISOString(),
  ).run();

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/notes — delete a note from D1
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { env } = await getCloudflareContext();
  await env.DB.prepare('DELETE FROM notes WHERE id = ? AND user_email = ?')
    .bind(id, user.email).run();

  return NextResponse.json({ success: true });
}
