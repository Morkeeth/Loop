'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface InsightsBannerProps {
  insights: string[];
  isLoading: boolean;
}

export function InsightsBanner({ insights, isLoading }: InsightsBannerProps) {
  return (
    <div className="relative overflow-hidden rounded border border-gray-200 bg-white">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-50/80 via-transparent to-amber-50/80" />
      <div className="relative px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-2.5 w-2.5 flex-none animate-pulse rounded-full bg-amber-500" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
              Live Calendar Takeaways
            </h2>
            <AnimatePresence initial={false} mode="wait">
              {isLoading ? (
                <motion.p
                  key="loading"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 text-sm text-amber-900/80"
                >
                  Scanning your calendar patterns…
                </motion.p>
              ) : (
                <motion.ul
                  key={insights.join('-') || 'empty'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 space-y-1.5 text-sm text-amber-900"
                >
                  {(insights.length ? insights : ['Need more events to riff on — add recent activity and try again.']).map(
                    (insight) => (
                      <li key={insight} className="leading-snug">
                        {insight}
                      </li>
                    ),
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

