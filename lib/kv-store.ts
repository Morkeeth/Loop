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

export { redis };
