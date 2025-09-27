'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

interface GoogleOAuthProviderWrapperProps {
  children: React.ReactNode;
}

export default function GoogleOAuthProviderWrapper({ children }: GoogleOAuthProviderWrapperProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  console.log('GoogleOAuthProviderWrapper - clientId:', clientId);
  console.log('GoogleOAuthProviderWrapper - all env vars:', Object.keys(process.env).filter(key => key.includes('GOOGLE')));

  if (!clientId) {
    console.warn('Google Client ID not found. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider 
      clientId={clientId}
      auto_select={false}
      cancel_on_tap_outside={false}
    >
      {children}
    </GoogleOAuthProvider>
  );
}
