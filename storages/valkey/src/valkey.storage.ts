import { IAsynchronousCacheType, IMultiIAsynchronousCacheType } from '@node-ts-cache/core';
import * as Valkey from 'iovalkey';

export class ValkeyStorage implements IAsynchronousCacheType, IMultiIAsynchronousCacheType {
	constructor(
		private valkey: () => Valkey.default,
		private options: {
			maxAge: number;
		} = { maxAge: 86400 }
	) {}

	private errorHandler: ((error: Error) => void) | undefined;

	onError(listener: (error: Error) => void) {
		this.errorHandler = listener;
	}

	async getItems<T>(keys: string[]): Promise<{ [key: string]: T | undefined }> {
		const mget: (string | null)[] = await this.valkey().mget(...keys);
		const res: { [key: string]: T | undefined } = {};
		mget.forEach((entry: string | null, i: number) => {
			if (entry === null) {
				res[keys[i]] = undefined; // value does not exist yet
				return;
			}

			if (entry === '') {
				res[keys[i]] = null as T; // value does exist, but is empty
				return;
			}

			// Try to parse as JSON
			let parsedItem: T | string = entry;
			try {
				if (entry) {
					parsedItem = JSON.parse(entry) as T;
				}
			} catch {
				/** Not JSON, keep as string */
			}

			res[keys[i]] = parsedItem as T;
		});
		return res;
	}

	async setItems<T = unknown>(
		values: { key: string; content: T | undefined }[],
		options?: { ttl?: number }
	): Promise<void> {
		const pipeline = this.valkey().pipeline();
		values.forEach(val => {
			if (val.content === undefined) return;

			const content: string = JSON.stringify(val.content);

			const ttl = options?.ttl ?? this.options.maxAge;
			if (ttl) {
				pipeline.setex(val.key, ttl, content);
			} else {
				pipeline.set(val.key, content);
			}
		});
		const savePromise = pipeline.exec();

		if (this.errorHandler) {
			// if we have an error handler, we do not need to await the result
			savePromise.catch((err: unknown) => this.errorHandler && this.errorHandler(err as Error));
		} else {
			await savePromise;
		}
	}

	public async getItem<T>(key: string): Promise<T | undefined> {
		const entry: string | null = await this.valkey().get(key);
		if (entry === null) {
			return undefined;
		}
		if (entry === '') {
			return null as T; // value exists but is empty
		}

		// Try to parse as JSON
		let parsedItem: T | string = entry;
		try {
			parsedItem = JSON.parse(entry) as T;
		} catch {
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
			await this.valkey().del(key);
			return;
		}

		// Serialize to string
		const serialized: string =
			typeof content === 'object' ? JSON.stringify(content) : String(content);

		const ttl = options?.ttl ?? this.options.maxAge;
		const savePromise: Promise<'OK' | null> = ttl
			? this.valkey().setex(key, ttl, serialized)
			: this.valkey().set(key, serialized);

		if (this.errorHandler) {
			// if we have an error handler, we do not need to await the result
			savePromise.catch((err: unknown) => this.errorHandler && this.errorHandler(err as Error));
		} else {
			await savePromise;
		}
	}

	public async clear(): Promise<void> {
		await this.valkey().flushdb();
	}
}
