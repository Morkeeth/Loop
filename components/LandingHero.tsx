'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';

export default function LandingHero() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleAuth = () => {
    setIsLoading(true);
    
    // Redirect to Google OAuth
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      redirect_uri: `${window.location.origin}/api/auth/callback`,
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      {/* Logo */}
      <div className="mb-12">
        <div className="flex items-center space-x-3">
          <svg className="w-12 h-12" viewBox="0 0 23.5703 21.5332" fill="black">
            <path d="M7.61523 7.28711C9.63867 7.28711 11.2656 5.64648 11.2656 3.63672C11.2656 1.62695 9.63867 0 7.61523 0C5.60547 0 3.97852 1.62695 3.97852 3.63672C3.97852 5.64648 5.60547 7.28711 7.61523 7.28711ZM7.61523 5.30469C6.69922 5.30469 5.94727 4.55273 5.94727 3.63672C5.94727 2.7207 6.69922 1.96875 7.61523 1.96875C8.54492 1.96875 9.29688 2.7207 9.29688 3.63672C9.29688 4.55273 8.54492 5.30469 7.61523 5.30469ZM15.5996 7.28711C17.6094 7.28711 19.2363 5.64648 19.2363 3.63672C19.2363 1.62695 17.6094 0 15.5996 0C13.5898 0 11.9492 1.62695 11.9492 3.63672C11.9492 5.64648 13.5898 7.28711 15.5996 7.28711ZM15.5996 5.30469C14.6836 5.30469 13.9316 4.55273 13.9316 3.63672C13.9316 2.7207 14.6836 1.96875 15.5996 1.96875C16.5156 1.96875 17.2676 2.7207 17.2676 3.63672C17.2676 4.55273 16.5156 5.30469 15.5996 5.30469ZM3.65039 14.4102C5.66016 14.4102 7.28711 12.7695 7.28711 10.7598C7.28711 8.75 5.66016 7.10938 3.65039 7.10938C1.62695 7.10938 0 8.75 0 10.7598C0 12.7695 1.62695 14.4102 3.65039 14.4102ZM3.65039 12.4277C2.7207 12.4277 1.96875 11.6758 1.96875 10.7598C1.96875 9.84375 2.7207 9.0918 3.65039 9.0918C4.56641 9.0918 5.31836 9.84375 5.31836 10.7598C5.31836 11.6758 4.56641 12.4277 3.65039 12.4277ZM19.5781 14.4102C21.5879 14.4102 23.2148 12.7695 23.2148 10.7598C23.2148 8.75 21.5879 7.10938 19.5781 7.10938C17.5684 7.10938 15.9277 8.75 15.9277 10.7598C15.9277 12.7695 17.5684 14.4102 19.5781 14.4102ZM19.5781 12.4277C18.6484 12.4277 17.8965 11.6758 17.8965 10.7598C17.8965 9.84375 18.6484 9.0918 19.5781 9.0918C20.4941 9.0918 21.2461 9.84375 21.2461 10.7598C21.2461 11.6758 20.4941 12.4277 19.5781 12.4277ZM7.61523 21.5332C9.63867 21.5332 11.2656 19.9062 11.2656 17.8965C11.2656 15.8867 9.63867 14.2461 7.61523 14.2461C5.60547 14.2461 3.97852 15.8867 3.97852 17.8965C3.97852 19.9062 5.60547 21.5332 7.61523 21.5332ZM7.61523 19.5645C6.69922 19.5645 5.94727 18.8125 5.94727 17.8965C5.94727 16.9805 6.69922 16.2285 7.61523 16.2285C8.54492 16.2285 9.29688 16.9805 9.29688 17.8965C9.29688 18.8125 8.54492 19.5645 7.61523 19.5645ZM15.5996 21.5332C17.6094 21.5332 19.2363 19.9062 19.2363 17.8965C19.2363 15.8867 17.6094 14.2461 15.5996 14.2461C13.5898 14.2461 11.9492 15.8867 11.9492 17.8965C11.9492 19.9062 13.5898 21.5332 15.5996 21.5332ZM15.5996 19.5645C14.6836 19.5645 13.9316 18.8125 13.9316 17.8965C13.9316 16.9805 14.6836 16.2285 15.5996 16.2285C16.5156 16.2285 17.2676 16.9805 17.2676 17.8965C17.2676 18.8125 16.5156 19.5645 15.5996 19.5645Z"/>
          </svg>
          <span className="text-3xl font-bold text-black">Loop</span>
        </div>
      </div>

      {/* Google Sign-in Section */}
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="google-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting your calendar...</span>
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          By connecting your calendar, you agree to our privacy policy. 
          We only access your calendar data to provide personalized insights.
        </p>
      </div>
    </div>
  );
}
