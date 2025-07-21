import { env } from "~/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);

const CACHE_EXPIRY_SECONDS = 60 * 60 * 6; // 6 hours
const CACHE_KEY_SEPARATOR = ":";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cacheWithRedis = <TFunc extends (...args: any[]) => Promise<any>>(
  keyPrefix: string,
  fn: TFunc,
): TFunc => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (...args: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const key = `${keyPrefix}${CACHE_KEY_SEPARATOR}${JSON.stringify(args)}`;
    const cachedResult = await redis.get(key);
    if (cachedResult) {
      console.log(`Cache hit for ${key}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(cachedResult);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    const result = await fn(...args);
    await redis.set(key, JSON.stringify(result), "EX", CACHE_EXPIRY_SECONDS);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }) as TFunc;
};
