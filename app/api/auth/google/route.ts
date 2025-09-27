import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleToken } from '@/lib/google-auth';

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { error: 'No credential provided' },
        { status: 400 }
      );
    }

    // Verify the Google token
    const userInfo = await verifyGoogleToken(credential);

    if (!userInfo) {
      return NextResponse.json(
        { error: 'Invalid credential' },
        { status: 401 }
      );
    }

    // In a real app, you'd store this in a database
    // For now, we'll just return the user info
    return NextResponse.json({
      success: true,
      user: userInfo,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
