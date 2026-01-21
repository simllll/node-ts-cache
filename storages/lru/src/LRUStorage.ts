import type { IMultiSynchronousCacheType, ISynchronousCacheType } from '@hokify/node-ts-cache';

import LRU from 'lru-cache';

export class LRUStorage implements ISynchronousCacheType, IMultiSynchronousCacheType {
	myCache: LRU<string, unknown>;

	constructor(/** maxAge in seconds! */ private options: LRU.Options<string, unknown>) {
		this.myCache = new LRU({
			...options,
			maxAge: options.maxAge ? options.maxAge * 1000 : undefined
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
		// flush not supported, recreate lru cache instance
		this.myCache = new LRU({
			...this.options,
			maxAge: this.options.maxAge ? this.options.maxAge * 1000 : undefined // in ms
		});
	}
}
