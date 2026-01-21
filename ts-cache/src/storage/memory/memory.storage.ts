import { ISynchronousCacheType } from '../../types/cache.types.js';

export class MemoryStorage implements ISynchronousCacheType {
	private memCache: Record<string, unknown> = {};

	public getItem<T>(key: string): T | undefined {
		return this.memCache[key] as T | undefined;
	}

	public setItem<T = unknown>(key: string, content: T | undefined): void {
		this.memCache[key] = content;
	}

	public clear(): void {
		this.memCache = {};
	}
}
