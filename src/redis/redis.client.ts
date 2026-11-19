import Redis from "ioredis";
import type { HotelOffer } from "../types/hotel";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  retryStrategy: (attempt) => Math.min(attempt * 250, 2000)
});

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 300);
const keyFor = (city: string) => `hotels:${city}`;
const markerFor = (city: string) => `hotels:${city}:cached`;

export async function readCachedOffers(city: string, minPrice?: number, maxPrice?: number): Promise<HotelOffer[] | null> {
  if (!(await redis.exists(markerFor(city)))) return null;
  const min = minPrice ?? "-inf";
  const max = maxPrice ?? "+inf";
  const members = await redis.zrangebyscore(keyFor(city), min, max);
  return members.map((member) => JSON.parse(member) as HotelOffer);
}

export async function writeOffers(city: string, offers: HotelOffer[]): Promise<void> {
  const key = keyFor(city);
  const marker = markerFor(city);
  const transaction = redis.multi().del(key);
  if (offers.length) {
    transaction.zadd(key, ...offers.flatMap((offer) => [offer.price, JSON.stringify(offer)]));
    transaction.expire(key, CACHE_TTL_SECONDS);
  }
  transaction.set(marker, "1", "EX", CACHE_TTL_SECONDS);
  await transaction.exec();
}
