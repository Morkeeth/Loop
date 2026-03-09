import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('loop_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Don't expose the token to the client — it stays in the HTTP-only cookie
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('loop_access_token');
  response.cookies.delete('loop_refresh_token');
  response.cookies.delete('loop_user');
  return response;
}
