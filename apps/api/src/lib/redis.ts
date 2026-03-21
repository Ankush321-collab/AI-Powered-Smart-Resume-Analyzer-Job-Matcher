import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }
  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await getRedis().get(key);
  if (!val) return null;
  return JSON.parse(val) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key);
}
