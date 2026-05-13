import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * GET /api/auth/google
 * Redirect to Google OAuth consent screen
 */
export async function GET() {
  const { env } = await getCloudflareContext();
  const clientId = env.GOOGLE_CLIENT_ID;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${env.APP_URL}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
