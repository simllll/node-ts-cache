import { IAsynchronousCacheType, IMultiIAsynchronousCacheType } from '@hokify/node-ts-cache';
import * as Redis from 'ioredis';
import * as snappy from 'snappy';

export class RedisIOStorage implements IAsynchronousCacheType, IMultiIAsynchronousCacheType {
	constructor(
		private redis: () => Redis.Redis,
		private options: {
			maxAge: number;
			compress?: boolean;
		} = { maxAge: 86400 }
	) {}

	private errorHandler: ((error: Error) => void) | undefined;

	onError(listener: (error: Error) => void) {
		this.errorHandler = listener;
	}

	async getItems<T>(keys: string[]): Promise<{ [key: string]: T | undefined }> {
		const mget: (Buffer | string | null)[] = this.options.compress
			? await this.redis().mgetBuffer(...keys)
			: await this.redis().mget(...keys);
		const res = Object.fromEntries(
			await Promise.all(
				mget.map(async (entry: Buffer | string | null, i: number) => {
					if (entry === null) {
						return [keys[i], undefined]; // value does not exist yet
					}

					if (entry === '') {
						return [keys[i], null]; // value does exist, but is empty
					}

					// Decompress if needed, result is a string
					const stringValue: string =
						entry && this.options.compress
							? await this.uncompress(entry as Buffer)
							: (entry as string);

					// Try to parse as JSON
					let parsedItem: T | string = stringValue;
					try {
						if (stringValue) {
							parsedItem = JSON.parse(stringValue) as T;
						}
					} catch (error) {
						/** Not JSON, keep as string */
					}

					return [keys[i], parsedItem];
				})
			)
		);
		return res;
	}

	async compress(uncompressed: string): Promise<Buffer> {
		const result = await snappy.compress(uncompressed);
		return result;
	}

	async uncompress(compressed: Buffer): Promise<string> {
		const result = await snappy.uncompress(compressed, { asBuffer: false });

		return result.toString();
	}

	async setItems<T = unknown>(
		values: { key: string; content: T | undefined }[],
		options?: { ttl?: number }
	): Promise<void> {
		const redisPipeline = this.redis().pipeline();
		await Promise.all(
			values.map(async val => {
				if (val.content === undefined) return;

				let content: string | Buffer = JSON.stringify(val.content);

				if (this.options.compress) {
					content = await this.compress(content);
				}

				const ttl = options?.ttl ?? this.options.maxAge;
				if (ttl) {
					redisPipeline.setex(val.key, ttl, content);
				} else {
					redisPipeline.set(val.key, content);
				}
			})
		);
		const savePromise = redisPipeline.exec();

		if (this.errorHandler) {
			// if we have an error handler, we do not need to await the result
			savePromise.catch(err => this.errorHandler && this.errorHandler(err));
		} else {
			await savePromise;
		}
	}

	public async getItem<T>(key: string): Promise<T | undefined> {
		const entry: Buffer | string | null = this.options.compress
			? await this.redis().getBuffer(key)
			: await this.redis().get(key);
		if (entry === null) {
			return undefined;
		}
		if (entry === '') {
			return null as T; // value exists but is empty
		}

		// Decompress if needed, result is a string
		const stringValue: string =
			entry && this.options.compress ? await this.uncompress(entry as Buffer) : (entry as string);

		// Try to parse as JSON
		let parsedItem: T | string = stringValue;
		try {
			parsedItem = JSON.parse(stringValue) as T;
		} catch (error) {
			/** Not JSON, keep as string */
		}
		return parsedItem as T;
	}

	public async setItem<T = unknown>(
		key: string,
		content: T | undefined,
		options?: { ttl?: number }
	): Promise<void> {
		if (content === undefined) {
			await this.redis().del(key);
			return;
		}

		// Serialize to string, then optionally compress
		let serialized: string | Buffer =
			typeof content === 'object' ? JSON.stringify(content) : String(content);

		if (this.options.compress) {
			serialized = await this.compress(serialized);
		}

		const ttl = options?.ttl ?? this.options.maxAge;
		const savePromise: Promise<'OK' | null> = ttl
			? this.redis().setex(key, ttl, serialized)
			: this.redis().set(key, serialized);

		if (this.errorHandler) {
			// if we have an error handler, we do not need to await the result
			savePromise.catch(err => this.errorHandler && this.errorHandler(err));
		} else {
			await savePromise;
		}
	}

	public async clear(): Promise<void> {
		await this.redis().flushdb();
	}
}
