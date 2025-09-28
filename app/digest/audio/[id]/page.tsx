'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface AudioDigestData {
  id: string;
  content: string;
  audioUrl?: string;
  createdAt: string;
}

export default function AudioDigestPage() {
  const params = useParams();
  const digestId = params.id as string;
  
  const [digestData, setDigestData] = useState<AudioDigestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDigestData();
  }, [digestId]);

  // Do NOT auto-generate on open; only play if audio already exists.
  // If audio is missing, show a button to generate.

  const fetchDigestData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/digest/audio/${digestId}`);
      
      if (!response.ok) {
        throw new Error('Digest not found');
      }
      
      const data = await response.json();
      setDigestData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load digest');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAudio = async () => {
    if (!digestData) return;
    
    try {
      setIsGeneratingAudio(true);
      setError(null);
      
      const response = await fetch('/api/digest/audio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digestId: digestData.id,
          content: digestData.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const { audioUrl } = await response.json();
      setDigestData(prev => prev ? { ...prev, audioUrl } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const togglePlayback = () => {
    if (!digestData?.audioUrl) return;

    if (isPlaying) {
      audioElement?.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(digestData.audioUrl);
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('error', () => {
        setError('Failed to play audio');
        setIsPlaying(false);
      });
      
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-black">Loading digest...</p>
        </div>
      </div>
    );
  }

  if (error || !digestData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Error</h1>
          <p className="text-black mb-4">{error || 'Digest not found'}</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="minimal-button"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Loop Radio Digest</h1>
          <p className="text-black">
            Generated on {new Date(digestData.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Audio Player Section */}
        <div className="minimal-card p-8 mb-8 text-center">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">Listen to Your Digest</h2>
            
            {isGeneratingAudio ? (
              <div>
                <div className="animate-spin h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-black">
                  Generating audio with Marcel's French accent...
                </p>
              </div>
            ) : digestData.audioUrl ? (
              <div>
                <button
                  onClick={togglePlayback}
                  className="w-24 h-24 bg-black text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors mx-auto mb-4"
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                <p className="text-black">
                  {isPlaying ? 'Playing your Sunday brief...' : 'Click to play your Sunday brief'}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-black mb-4">
                  Preparing your audio digest...
                </p>
                <button
                  onClick={generateAudio}
                  className="minimal-button"
                >
                  Generate Audio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Digest Content */}
        <div className="minimal-card p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Digest Content</h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-black">
              {digestData.content}
            </pre>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="minimal-button-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
