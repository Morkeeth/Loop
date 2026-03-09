import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-auth';
import { getUser, saveUser, updateUser } from '@/lib/kv-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (error) {
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${appUrl}?error=no_code`);
    }

    const tokens = await exchangeCodeForTokens(code);

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userResponse.json();

    // Save or update user in KV
    try {
      const existing = await getUser(userInfo.id);
      if (existing) {
        await updateUser(userInfo.id, {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture || '',
          ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        });
      } else {
        await saveUser({
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture || '',
          refresh_token: tokens.refresh_token || '',
          city: '',
          timezone: '',
          tags: [],
          persona: null,
          last_event_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // KV save failed — non-blocking, user can still use the app
    }

    // Redirect to dashboard — tokens go in secure HTTP-only cookies, NOT URL params
    const response = NextResponse.redirect(`${appUrl}/dashboard`);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60,
    };

    response.cookies.set('loop_access_token', tokens.access_token, cookieOptions);
    if (tokens.refresh_token) {
      response.cookies.set('loop_refresh_token', tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    // User ID in httpOnly cookie for API routes to look up KV
    response.cookies.set('loop_user_id', userInfo.id, cookieOptions);

    // User info in a non-httpOnly cookie so the client can read display name/email
    response.cookies.set('loop_user', JSON.stringify({
      email: userInfo.email,
      name: userInfo.name,
    }), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}?error=auth_failed`);
  }
}
