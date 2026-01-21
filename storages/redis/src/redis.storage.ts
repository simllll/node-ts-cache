import { IAsynchronousCacheType } from '@hokify/node-ts-cache';

import Bluebird from 'bluebird';
import * as Redis from 'redis';
import { ClientOpts } from 'redis';
import { IRedisClient } from './custom';

Bluebird.promisifyAll(Redis.RedisClient.prototype);
Bluebird.promisifyAll(Redis.Multi.prototype);

export class RedisStorage implements IAsynchronousCacheType {
	private client: IRedisClient;

	constructor(private redisOptions: ClientOpts, redis = Redis) {
		this.client = redis.createClient(this.redisOptions) as IRedisClient;
	}

	public async getItem<T>(key: string): Promise<T | undefined> {
		const entry: string | null = await this.client.getAsync(key);
		if (entry === null) {
			return undefined;
		}
		// Try to parse as JSON, fallback to raw string
		let parsedItem: T | string = entry;
		try {
			parsedItem = JSON.parse(entry) as T;
		} catch (error) {
			/** Not JSON, keep as string */
		}
		return parsedItem as T | undefined;
	}

	public async setItem<T = unknown>(key: string, content: T | undefined): Promise<void> {
		if (content === undefined) {
			await this.client.delAsync(key);
			return;
		}
		const stringContent: string =
			typeof content === 'object' ? JSON.stringify(content) : String(content);
		await this.client.setAsync(key, stringContent);
	}

	public async clear(): Promise<void> {
		await this.client.flushdbAsync();
	}
}
