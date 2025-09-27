'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  step: string;
  message: string;
  timestamp: string;
  status: 'info' | 'success' | 'warning' | 'error';
  progress?: number;
}

interface ProgressLogsProps {
  isActive: boolean;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  requestData?: {
    personaText: string;
    recentCalendarJson: string;
    promptTemplate: string;
  };
}

export function ProgressLogs({ isActive, onComplete, onError, requestData }: ProgressLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!isActive || !requestData) {
      setLogs([]);
      setCurrentProgress(0);
      setIsStreaming(false);
      return;
    }

    // Start streaming when active
    setIsStreaming(true);
    setLogs([]);
    setCurrentProgress(0);

    const startStreaming = async () => {
      try {
        const response = await fetch('/api/digest/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error('Failed to start digest generation');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.step === 'result') {
                  // Final result received
                  setIsStreaming(false);
                  onComplete?.(data.data);
                  return;
                } else if (data.step === 'error') {
                  // Error occurred
                  setIsStreaming(false);
                  onError?.(data.message);
                  return;
                } else {
                  // Regular log entry
                  setLogs(prev => [...prev, data]);
                  if (data.progress !== undefined) {
                    setCurrentProgress(data.progress);
                  }
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        setIsStreaming(false);
        onError?.(error instanceof Error ? error.message : 'Streaming error occurred');
      }
    };

    startStreaming();
  }, [isActive, requestData, onComplete, onError]);

  if (!isActive) return null;

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getStatusColor = (status: LogEntry['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-black h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${currentProgress}%` }}
        />
      </div>
      
      {/* Progress Text */}
      <div className="text-sm text-gray-600 text-center">
        {isStreaming ? `Processing... ${currentProgress}%` : 'Complete!'}
      </div>

      {/* Logs */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <span className="text-lg flex-shrink-0 mt-0.5">
                {getStatusIcon(log.status)}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${getStatusColor(log.status)}`}>
                  {log.step.charAt(0).toUpperCase() + log.step.slice(1)}
                </div>
                <div className="text-gray-700">{log.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isStreaming && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span>Waiting for next update...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
