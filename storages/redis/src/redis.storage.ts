import { IAsynchronousCacheType } from '@node-ts-cache/core';
import { createClient, RedisClientOptions } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

export interface RedisStorageOptions extends RedisClientOptions {
	/** Pre-configured Redis client instance (takes precedence over other options) */
	client?: RedisClient;
}

export class RedisStorage implements IAsynchronousCacheType {
	private client: RedisClient;
	private connectionPromise: Promise<RedisClient> | null;

	constructor(redisOptions?: RedisStorageOptions) {
		if (redisOptions?.client) {
			this.client = redisOptions.client;
			this.connectionPromise = null; // Already connected
		} else {
			this.client = createClient(redisOptions);
			this.connectionPromise = this.client.connect();
		}
	}

	private async ensureConnected(): Promise<void> {
		if (this.connectionPromise) {
			await this.connectionPromise;
		}
	}

	public async getItem<T>(key: string): Promise<T | undefined> {
		await this.ensureConnected();
		const entry = await this.client.get(key);
		if (entry === null) {
			return undefined;
		}
		// Try to parse as JSON, fallback to raw string
		let parsedItem: T | string = entry;
		try {
			parsedItem = JSON.parse(entry) as T;
		} catch {
			/** Not JSON, keep as string */
		}
		return parsedItem as T | undefined;
	}

	public async setItem<T = unknown>(key: string, content: T | undefined): Promise<void> {
		await this.ensureConnected();
		if (content === undefined) {
			await this.client.del(key);
			return;
		}
		const stringContent: string =
			typeof content === 'object' ? JSON.stringify(content) : String(content);
		await this.client.set(key, stringContent);
	}

	public async clear(): Promise<void> {
		await this.ensureConnected();
		await this.client.flushDb();
	}

	public async disconnect(): Promise<void> {
		await this.ensureConnected();
		await this.client.quit();
	}
}
