'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface InsightsBannerProps {
  insights: string[];
  isLoading: boolean;
  eventCount?: number;
}

const loadingInsights = [
  "Scanning your calendar patterns...",
  "Detecting meeting rhythms...",
  "Analyzing social patterns...",
  "Finding recurring collaborators...",
  "Mapping your daily flow...",
  "Spotting productivity windows...",
  "Identifying work-life balance...",
  "Tracking your interests...",
  "Building your persona profile...",
  "Almost ready for insights..."
];

export function InsightsBanner({ insights, isLoading, eventCount }: InsightsBannerProps) {
  const [currentLoadingInsight, setCurrentLoadingInsight] = useState(0);
  const [displayedInsights, setDisplayedInsights] = useState<string[]>([]);
  const processedInsightsRef = useRef<string[]>([]);

  // Cycle through loading insights while loading
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setCurrentLoadingInsight((prev) => (prev + 1) % loadingInsights.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Gradually reveal insights as they come in
  useEffect(() => {
    if (!isLoading && insights.length > 0) {
      // Check if we've already processed these exact insights
      const insightsKey = insights.join('|');
      const processedKey = processedInsightsRef.current.join('|');
      
      if (insightsKey !== processedKey) {
        processedInsightsRef.current = insights;
        setDisplayedInsights([]); // Clear first
        
        insights.forEach((insight, index) => {
          setTimeout(() => {
            setDisplayedInsights(prev => [...prev, insight]);
          }, index * 800);
        });
      }
    } else if (isLoading) {
      setDisplayedInsights([]);
      processedInsightsRef.current = [];
    }
  }, [insights, isLoading]);

  return (
    <div className="relative overflow-hidden border border-black bg-white">
      <div className="relative px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-2.5 w-2.5 flex-none animate-pulse rounded-full bg-black" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-black">
              Live Calendar Takeaways
            </h2>
            
            {eventCount && (
              <p className="mt-1 text-xs text-gray-600">
                Processing {eventCount} events from the last 6 months
              </p>
            )}

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2"
                >
                  <motion.p
                    key={currentLoadingInsight}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-sm text-black"
                  >
                    {loadingInsights[currentLoadingInsight]}
                  </motion.p>
                  
                  {/* Animated dots */}
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1 w-1 rounded-full bg-black"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 space-y-1.5"
                >
                  {displayedInsights.length > 0 ? (
                    displayedInsights.map((insight, index) => (
                      <motion.div
                        key={`${insight}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.5,
                          delay: index * 0.1 
                        }}
                        className="text-sm text-black leading-snug"
                      >
                        {insight}
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">
                      Need more events to riff on — add recent activity and try again.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

