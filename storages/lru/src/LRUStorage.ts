import type { IMultiSynchronousCacheType, ISynchronousCacheType } from '@node-ts-cache/core';

import { LRUCache } from 'lru-cache';

export interface LRUStorageOptions {
	/** Maximum number of items in cache (required) */
	max: number;
	/** Time to live in seconds */
	ttl?: number;
	/** Maximum size (if using sizeCalculation) */
	maxSize?: number;
}

export class LRUStorage implements ISynchronousCacheType, IMultiSynchronousCacheType {
	// Using 'any' for cache value type as it needs to store arbitrary data

	myCache: LRUCache<string, any>;

	constructor(/** ttl in seconds! */ options: LRUStorageOptions) {
		this.myCache = new LRUCache({
			max: options.max,
			ttl: options.ttl ? options.ttl * 1000 : undefined,
			maxSize: options.maxSize
		});
	}

	getItems<T>(keys: string[]): { [key: string]: T | undefined } {
		return Object.fromEntries(keys.map(key => [key, this.myCache.get(key)])) as {
			[key: string]: T | undefined;
		};
	}

	setItems<T = unknown>(values: { key: string; content: T | undefined }[]): void {
		values.forEach(val => {
			this.myCache.set(val.key, val.content);
		});
	}

	public getItem<T>(key: string): T | undefined {
		return this.myCache.get(key) as T | undefined;
	}

	public setItem<T = unknown>(key: string, content: T | undefined): void {
		this.myCache.set(key, content);
	}

	public clear(): void {
		this.myCache.clear();
	}
}
