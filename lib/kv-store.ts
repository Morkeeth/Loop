import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface LoopUser {
  id: string;           // Google user ID (sub)
  email: string;
  name: string;
  picture: string;
  refresh_token: string;
  city: string;
  timezone: string;
  tags: string[];        // merged interest/fitness/local tags
  persona: any | null;   // cached persona JSON
  last_event_at: string | null;  // ISO date of last discovered event
  loop_calendar_id: string | null; // dedicated Loop calendar on user's Google account
  created_at: string;
  updated_at: string;
}

function userKey(userId: string) {
  return `user:${userId}`;
}

export async function getUser(userId: string): Promise<LoopUser | null> {
  return redis.get<LoopUser>(userKey(userId));
}

export async function saveUser(user: LoopUser): Promise<void> {
  await redis.set(userKey(user.id), user);
  // Also maintain a set of all user IDs for the cron job
  await redis.sadd('users', user.id);
}

export async function updateUser(userId: string, updates: Partial<LoopUser>): Promise<LoopUser | null> {
  const existing = await getUser(userId);
  if (!existing) return null;

  const updated: LoopUser = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await redis.set(userKey(userId), updated);
  return updated;
}

export async function getAllUserIds(): Promise<string[]> {
  return redis.smembers('users');
}

// --- Discovered events ---

export interface StoredEvent {
  event_title: string;
  venue: string;
  address: string;
  date: string;
  time: string;
  end_time: string;
  description: string;
  url: string;
  category: string;
  why_this: string;
  calendar_event_id?: string;
  calendar_event_link?: string;
  discovered_at: string;
  week_key: string; // e.g. "2026-W12"
}

function weekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function eventKey(userId: string) {
  return `event:${userId}:current`;
}

function eventHistoryKey(userId: string) {
  return `events:${userId}`;
}

export async function saveDiscoveredEvent(userId: string, event: StoredEvent): Promise<void> {
  event.discovered_at = new Date().toISOString();
  event.week_key = weekKey();
  // Save as current event
  await redis.set(eventKey(userId), event);
  // Also push to history (keep last 25)
  await redis.lpush(eventHistoryKey(userId), JSON.stringify(event));
  await redis.ltrim(eventHistoryKey(userId), 0, 24);
}

export async function getCurrentEvent(userId: string): Promise<StoredEvent | null> {
  const event = await redis.get<StoredEvent>(eventKey(userId));
  if (!event) return null;
  // Only return if it's from the current week
  if (event.week_key !== weekKey()) return null;
  return event;
}

export async function getEventHistory(userId: string): Promise<StoredEvent[]> {
  const raw = await redis.lrange(eventHistoryKey(userId), 0, 24);
  return raw.map((entry: any) => typeof entry === 'string' ? JSON.parse(entry) : entry);
}

// --- Event feedback ---

export interface EventFeedback {
  userId: string;
  eventTitle: string;
  category: string;
  feedback: 'up' | 'down';
  timestamp: string;
}

function feedbackKey(userId: string) {
  return `feedback:${userId}`;
}

export async function saveFeedback(userId: string, feedback: EventFeedback): Promise<void> {
  await redis.lpush(feedbackKey(userId), JSON.stringify(feedback));
  // Keep only last 50 feedback entries
  await redis.ltrim(feedbackKey(userId), 0, 49);
}

export async function getFeedback(userId: string): Promise<EventFeedback[]> {
  const raw = await redis.lrange(feedbackKey(userId), 0, 49);
  return raw.map((entry: any) => typeof entry === 'string' ? JSON.parse(entry) : entry);
}

export { redis };
