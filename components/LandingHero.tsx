'use client';

import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';

export default function LandingHero() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      // Send credential to backend for verification and token exchange
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      if (response.ok) {
        const authData = await response.json();
        // Store user info in localStorage for demo purposes
        if (authData.user?.email) {
          localStorage.setItem('userEmail', authData.user.email);
          localStorage.setItem('userName', authData.user.name);
        }
        // Redirect to dashboard or loading screen
        router.push('/dashboard');
      } else {
        console.error('Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google authentication failed');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-12">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <span className="text-3xl font-bold text-gray-900">Loop</span>
        </div>
      </div>

      {/* Google Sign-in Section */}
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            text="continue_with"
            shape="pill"
            width="300"
            useOneTap={false}
            auto_select={false}
          />
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
