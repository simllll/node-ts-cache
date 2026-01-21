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
		let finalItem: unknown = entry;
		try {
			finalItem = JSON.parse(entry);
		} catch (error) {
			/** ignore */
		}
		return finalItem as T | undefined;
	}

	public async setItem(key: string, content: unknown): Promise<void> {
		let stringContent: string;
		if (content === undefined) {
			await this.client.delAsync(key);
			return;
		}
		if (typeof content === 'object') {
			stringContent = JSON.stringify(content);
		} else {
			stringContent = String(content);
		}
		await this.client.setAsync(key, stringContent);
	}

	public async clear(): Promise<void> {
		await this.client.flushdbAsync();
	}
}
