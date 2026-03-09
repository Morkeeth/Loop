import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('loop_access_token')?.value;

  if (accessToken) {
    return NextResponse.json({ authenticated: true });
  }

  // No access token — try to refresh using the refresh token cookie
  const refreshToken = request.cookies.get('loop_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    const response = NextResponse.json({ authenticated: true });

    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('loop_access_token', tokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: tokens.expires_in || 3600,
    });

    return response;
  } catch {
    // Refresh failed — force re-auth
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.delete('loop_refresh_token');
    return response;
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('loop_access_token');
  response.cookies.delete('loop_refresh_token');
  response.cookies.delete('loop_user');
  response.cookies.delete('loop_user_id');
  return response;
}
