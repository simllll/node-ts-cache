import type { ISynchronousCacheType, IMultiSynchronousCacheType } from '@node-ts-cache/core';

import NodeCache from 'node-cache';

export class NodeCacheStorage implements ISynchronousCacheType, IMultiSynchronousCacheType {
	myCache: NodeCache;

	constructor(options: NodeCache.Options) {
		this.myCache = new NodeCache(options);
	}

	getItems<T>(keys: string[]): { [key: string]: T | undefined } {
		return this.myCache.mget(keys);
	}

	setItems<T = unknown>(values: { key: string; content: T | undefined }[]): void {
		this.myCache.mset(values.map(v => ({ key: v.key, val: v.content })));
	}

	public getItem<T>(key: string): T | undefined {
		return this.myCache.get(key) || undefined;
	}

	public setItem<T = unknown>(key: string, content: T | undefined): void {
		this.myCache.set(key, content);
	}

	public clear(): void {
		this.myCache.flushAll();
	}
}
