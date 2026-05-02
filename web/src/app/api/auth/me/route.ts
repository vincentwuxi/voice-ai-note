import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/auth/me — return current user from JWT
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
  });
}

/**
 * POST /api/auth/me — logout (clear cookie)
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('vm_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
