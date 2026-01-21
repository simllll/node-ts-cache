import { AbstractBaseStrategy } from './abstract.base.strategy.js';
import { ICacheOptions } from '../../types/cache.types.js';

interface IExpiringCacheItemMeta {
	createdAt: number;
	ttl: number;
}

interface IExpiringCacheItem<T = unknown> {
	content: T;
	meta: IExpiringCacheItemMeta | false;
}

/** Internal options with required fields after merging with defaults */
interface IExpirationOptions {
	ttl: number;
	isLazy: boolean;
	isCachedForever: boolean;
}

export class ExpirationStrategy extends AbstractBaseStrategy {
	public async getItem<T>(key: string): Promise<T | undefined> {
		const item = await this.storage.getItem<IExpiringCacheItem<T>>(key);
		if (item && this.hasValidMeta(item) && this.isItemExpired(item)) {
			await this.storage.setItem(key, undefined);
			return undefined;
		}
		return item ? item.content : undefined;
	}

	/** Type guard to check if item has valid meta with ttl */
	private hasValidMeta(
		item: IExpiringCacheItem<unknown>
	): item is IExpiringCacheItem<unknown> & { meta: IExpiringCacheItemMeta } {
		return item.meta !== false && typeof item.meta.ttl === 'number';
	}

	public async setItem<T = unknown>(
		key: string,
		content: T | undefined,
		options?: ICacheOptions
	): Promise<void> {
		const mergedOptions: IExpirationOptions = {
			ttl: 60,
			isLazy: true,
			isCachedForever: false,
			...options
		};

		const meta = !mergedOptions.isCachedForever && {
			ttl: mergedOptions.ttl * 1000,
			createdAt: Date.now()
		};

		if (meta && !mergedOptions.isLazy) {
			setTimeout(() => {
				this.unsetKey(key);
			}, meta.ttl);
		}
		await this.storage.setItem(key, { meta, content });
	}

	public async clear(): Promise<void> {
		await this.storage.clear();
	}

	private isItemExpired(item: { meta: IExpiringCacheItemMeta }): boolean {
		return Date.now() > item.meta.createdAt + item.meta.ttl;
	}

	private async unsetKey(key: string): Promise<void> {
		await this.storage.setItem(key, undefined);
	}
}
