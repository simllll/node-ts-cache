import { IAsynchronousCacheType } from '@node-ts-cache/core';
import Memcached from 'memcached';

export interface MemcachedStorageOptions {
	/** Memcached server location(s) - e.g., 'localhost:11211' or ['server1:11211', 'server2:11211'] */
	location: Memcached.Location;
	/** Memcached client options */
	options?: Memcached.options;
	/** Pre-configured Memcached client instance (takes precedence over location) */
	client?: Memcached;
}

export class MemcachedStorage implements IAsynchronousCacheType {
	private client: Memcached;

	constructor(options: MemcachedStorageOptions) {
		if (options.client) {
			this.client = options.client;
		} else {
			this.client = new Memcached(options.location, options.options);
		}
	}

	public async getItem<T>(key: string): Promise<T | undefined> {
		return new Promise((resolve, reject) => {
			this.client.get(key, (err, data) => {
				if (err) {
					reject(err);
					return;
				}

				if (data === undefined) {
					resolve(undefined);
					return;
				}

				try {
					const parsed = JSON.parse(data as string) as T;
					resolve(parsed);
				} catch {
					// If parsing fails, return the raw data
					resolve(data as T);
				}
			});
		});
	}

	public async setItem<T = unknown>(key: string, content: T | undefined): Promise<void> {
		return new Promise((resolve, reject) => {
			if (content === undefined) {
				this.client.del(key, err => {
					if (err) {
						reject(err);
						return;
					}
					resolve();
				});
				return;
			}

			const serialized = typeof content === 'string' ? content : JSON.stringify(content);

			// Default TTL of 0 means no expiration in memcached
			this.client.set(key, serialized, 0, err => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}

	public async clear(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.client.flush(err => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}

	public end(): void {
		this.client.end();
	}
}
