/**
 * Cache options for setting items
 */
export interface ICacheOptions {
	/** Time to live in seconds */
	ttl?: number;
	/** If true, expiration check happens only on read */
	isLazy?: boolean;
	/** If true, item never expires */
	isCachedForever?: boolean;
}

/**
 * Metadata stored with cache entries
 */
export interface ICacheMeta {
	/** Timestamp when the item was created */
	createdAt?: number;
	/** Time to live in milliseconds */
	ttl?: number;
}

/**
 * Structure of a cache entry
 */
export interface ICacheEntry<T = unknown, M extends ICacheMeta = ICacheMeta> {
	content: T;
	meta: M | false;
}

export interface IMultiIAsynchronousCacheType<C = unknown> {
	getItems<T>(keys: string[]): Promise<{ [key: string]: T | undefined }>;

	setItems<T extends C = C>(
		values: { key: string; content: T | undefined }[],
		options?: ICacheOptions
	): Promise<void>;

	clear(): Promise<void>;
}

export interface IMultiSynchronousCacheType<C = unknown> {
	getItems<T>(keys: string[]): { [key: string]: T | undefined };

	setItems<T extends C = C>(
		values: { key: string; content: T | undefined }[],
		options?: ICacheOptions
	): void;

	clear(): void;
}

export interface IAsynchronousCacheType<C = unknown> {
	getItem<T>(key: string): Promise<T | undefined>;

	setItem<T extends C = C>(key: string, content: T | undefined, options?: ICacheOptions): Promise<void>;

	clear(): Promise<void>;
}

export interface ISynchronousCacheType<C = unknown> {
	getItem<T>(key: string): T | undefined;

	setItem<T extends C = C>(key: string, content: T | undefined, options?: ICacheOptions): void;

	clear(): void;
}
