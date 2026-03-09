// Simple localStorage cache with expiry

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  weekKey?: string;
}

function getWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

function read<T>(key: string): CacheEntry<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`loop_cache_${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T, weekKey?: string): void {
  if (typeof window === 'undefined') return;
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), weekKey };
  localStorage.setItem(`loop_cache_${key}`, JSON.stringify(entry));
}

function clear(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`loop_cache_${key}`);
}

// --- Public API ---

const PERSONA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCachedPersona(): any | null {
  const entry = read<any>('persona');
  if (!entry) return null;
  if (Date.now() - entry.timestamp > PERSONA_TTL) return null;
  return entry.data;
}

export function setCachedPersona(data: any): void {
  write('persona', data);
}

export function getCachedDiscover(): { event: any; calendarEvent?: any } | null {
  const entry = read<{ event: any; calendarEvent?: any }>('discover');
  if (!entry) return null;
  // Only valid for current week
  if (entry.weekKey !== getWeekKey()) return null;
  return entry.data;
}

export function setCachedDiscover(event: any, calendarEvent?: any): void {
  write('discover', { event, calendarEvent }, getWeekKey());
}

export function clearDiscoverCache(): void {
  clear('discover');
}

export function clearAllCache(): void {
  clear('persona');
  clear('discover');
}
