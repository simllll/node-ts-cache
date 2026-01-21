import { IAsynchronousCacheType } from '@node-ts-cache/core';

import { LRUCache } from 'lru-cache';
import * as Redis from 'ioredis';

export interface LRUWithRedisStorageOptions {
	/** Maximum number of items in local LRU cache */
	max?: number;
	/** Time to live in seconds for both local and Redis cache */
	ttl?: number;
}

export class LRUWithRedisStorage implements IAsynchronousCacheType {
	// Using 'any' for cache value type as it needs to store arbitrary data

	private myCache: LRUCache<string, any>;

	/** ttl in seconds! */
	private options: Required<LRUWithRedisStorageOptions>;

	constructor(
		options: LRUWithRedisStorageOptions,
		private redis: () => Redis.Redis
	) {
		this.options = {
			max: 500,
			ttl: 86400,
			...options
		};
		this.myCache = new LRUCache({
			max: this.options.max,
			ttl: this.options.ttl * 1000 // convert to ms
		});
	}

	public async getItem<T>(key: string): Promise<T | undefined> {
		// check local cache
		let localCache = this.myCache.get(key);

		if (localCache === undefined) {
			// check central cache
			const redisValue = await this.redis().get(key);

			if (redisValue !== null) {
				try {
					localCache = JSON.parse(redisValue);
				} catch (err) {
					console.error('lru redis cache failed parsing data', err);
					localCache = undefined;
				}
				// if found on central cache, copy it to a local cache
				if (localCache !== undefined) {
					this.myCache.set(key, localCache);
				}
			}
		}

		return localCache as T | undefined;
	}

	/** ttl in seconds! */
	public async setItem<T = unknown>(
		key: string,
		content: T | undefined,
		options?: { ttl?: number }
	): Promise<void> {
		this.myCache.set(key, content);
		const ttl = options?.ttl || this.options.ttl;
		if (ttl) {
			await this.redis().setex(key, ttl, JSON.stringify(content));
		} else {
			await this.redis().set(key, JSON.stringify(content));
		}
	}

	public async clear(): Promise<void> {
		this.myCache.clear();
	}
}
