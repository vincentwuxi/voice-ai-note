import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireAdmin } from '@/lib/auth';

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string;
}

/**
 * GET /api/admin/users — list all users (admin only)
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if (result instanceof NextResponse) return result;

  const { env } = await getCloudflareContext();
  const rows = await env.DB.prepare(
    'SELECT id, email, name, avatar, role, status, created_at, last_login FROM users ORDER BY created_at DESC'
  ).all<UserRow>();

  return NextResponse.json({ users: rows.results });
}

/**
 * PUT /api/admin/users — update user role or status (admin only)
 */
export async function PUT(request: NextRequest) {
  const result = await requireAdmin(request);
  if (result instanceof NextResponse) return result;

  const { env } = await getCloudflareContext();
  const body = await request.json() as { userId: string; role?: string; status?: string };

  if (!body.userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  // Prevent admin from disabling themselves
  if (body.userId === result.sub && body.status === 'disabled') {
    return NextResponse.json({ error: 'Cannot disable yourself' }, { status: 400 });
  }

  const updates: string[] = [];
  const values: string[] = [];

  if (body.role && ['admin', 'user'].includes(body.role)) {
    updates.push('role = ?');
    values.push(body.role);
  }
  if (body.status && ['active', 'disabled'].includes(body.status)) {
    updates.push('status = ?');
    values.push(body.status);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  values.push(body.userId);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return NextResponse.json({ ok: true });
}
