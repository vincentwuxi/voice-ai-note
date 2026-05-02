import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { signJWT } from '@/lib/auth';

/**
 * GET /api/auth/callback
 * Google OAuth callback — exchange code for tokens, upsert user in D1, set JWT cookie
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('https://voice.aivolo.com/login?error=no_code');
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://voice.aivolo.com/api/auth/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', err);
      return NextResponse.redirect('https://voice.aivolo.com/login?error=token_failed');
    }

    const tokens = await tokenRes.json() as { access_token: string };

    // 2. Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect('https://voice.aivolo.com/login?error=userinfo_failed');
    }

    const googleUser = await userInfoRes.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    // 3. Check if user exists in D1
    const db = env.DB;
    const existing = await db.prepare('SELECT * FROM users WHERE email = ?')
      .bind(googleUser.email)
      .first<{ id: string; email: string; name: string; avatar: string; role: string; status: string }>();

    let userId: string;
    let role: string;

    if (existing) {
      // User exists — check status
      if (existing.status === 'disabled') {
        return NextResponse.redirect('https://voice.aivolo.com/login?error=disabled');
      }
      userId = existing.id;
      role = existing.role;

      // Update last login + avatar
      await db.prepare('UPDATE users SET last_login = datetime(\'now\'), avatar = ?, name = ? WHERE id = ?')
        .bind(googleUser.picture, googleUser.name, userId)
        .run();
    } else {
      // New user — auto-register with 'user' role
      userId = `u-${Date.now()}`;
      role = 'user';

      await db.prepare(
        'INSERT INTO users (id, email, name, avatar, role, status, last_login) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(userId, googleUser.email, googleUser.name, googleUser.picture, role, 'active')
        .run();
    }

    // 4. Sign JWT
    const token = await signJWT({
      sub: userId,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
      role,
    }, env.JWT_SECRET);

    // 5. Set cookie and redirect to app
    const response = NextResponse.redirect('https://voice.aivolo.com/');
    response.cookies.set('vm_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 72 * 3600, // 3 days
    });

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect('https://voice.aivolo.com/login?error=server_error');
  }
}
