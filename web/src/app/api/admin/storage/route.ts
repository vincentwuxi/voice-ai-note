import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/storage — R2 storage usage statistics
 */
export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if (result instanceof NextResponse) return result;

  const { env } = await getCloudflareContext();

  // Overall stats
  const overall = await env.DB.prepare(
    `SELECT 
      COUNT(*) as total_files,
      COALESCE(SUM(size_bytes), 0) as total_bytes
    FROM audio_files`
  ).first<{ total_files: number; total_bytes: number }>();

  // Per-user breakdown
  const perUser = await env.DB.prepare(
    `SELECT 
      user_email,
      COUNT(*) as file_count,
      COALESCE(SUM(size_bytes), 0) as total_bytes
    FROM audio_files
    GROUP BY user_email
    ORDER BY total_bytes DESC`
  ).all<{ user_email: string; file_count: number; total_bytes: number }>();

  // Recent uploads (last 10)
  const recent = await env.DB.prepare(
    `SELECT id, user_email, filename, size_bytes, content_type, created_at
    FROM audio_files
    ORDER BY created_at DESC
    LIMIT 10`
  ).all<{ id: string; user_email: string; filename: string; size_bytes: number; content_type: string; created_at: string }>();

  return NextResponse.json({
    totalFiles: overall?.total_files || 0,
    totalBytes: overall?.total_bytes || 0,
    r2FreeTierBytes: 10 * 1024 * 1024 * 1024, // 10 GB free
    perUser: perUser.results || [],
    recentUploads: recent.results || [],
  });
}
