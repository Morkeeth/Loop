import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleToken, exchangeCodeForTokens } from '@/lib/google-auth';

export async function POST(request: NextRequest) {
  try {
    const { credential, code } = await request.json();

    if (credential) {
      // Handle ID token verification (existing flow)
      const userInfo = await verifyGoogleToken(credential);

      if (!userInfo) {
        return NextResponse.json(
          { error: 'Invalid credential' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: userInfo,
        message: 'Authentication successful'
      });
    }

    if (code) {
      // Handle OAuth code exchange for access token
      const tokens = await exchangeCodeForTokens(code);
      
      // Get user info using the access token
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userInfo = await userResponse.json();

      return NextResponse.json({
        success: true,
        user: userInfo,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        message: 'Authentication successful'
      });
    }

    return NextResponse.json(
      { error: 'No credential or code provided' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
