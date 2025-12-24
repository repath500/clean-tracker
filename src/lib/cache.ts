import type { TrackingStatus } from "./types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const CACHE_DURATIONS: Record<TrackingStatus | "default", number> = {
  delivered: 7 * 24 * 60 * 60 * 1000, // 7 days
  failed: 24 * 60 * 60 * 1000, // 1 day
  expired: 24 * 60 * 60 * 1000, // 1 day
  exception: 2 * 60 * 60 * 1000, // 2 hours
  out_for_delivery: 30 * 60 * 1000, // 30 minutes
  in_transit: 6 * 60 * 60 * 1000, // 6 hours
  info_received: 12 * 60 * 60 * 1000, // 12 hours
  pending: 12 * 60 * 60 * 1000, // 12 hours
  unknown: 1 * 60 * 60 * 1000, // 1 hour
  default: 6 * 60 * 60 * 1000, // 6 hours
};

export function getCacheDuration(status: TrackingStatus): number {
  return CACHE_DURATIONS[status] ?? CACHE_DURATIONS.default;
}

export function getCacheKey(carrierId: string, trackingNumber: string): string {
  return `track:${carrierId}:${trackingNumber.toUpperCase().replace(/\s+/g, "")}`;
}

export function invalidateCacheForTracking(carrierId: string, trackingNumber: string): void {
  const key = getCacheKey(carrierId, trackingNumber);
  cache.delete(key);
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  
  if (!entry) {
    return null;
  }
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

export function setInCache<T>(key: string, data: T, status: TrackingStatus): void {
  const duration = getCacheDuration(status);
  const now = Date.now();
  
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + duration,
  });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function clearAllCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

export function cleanExpiredCache(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (now > (entry as CacheEntry<unknown>).expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}
