# @node-ts-cache/core

[![npm](https://img.shields.io/npm/v/@node-ts-cache/core.svg)](https://www.npmjs.org/package/@node-ts-cache/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/simllll/node-ts-cache/actions/workflows/test.yml/badge.svg)](https://github.com/simllll/node-ts-cache/actions/workflows/test.yml)

Simple and extensible caching module for TypeScript/Node.js with decorator support.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Decorators](#decorators)
  - [@Cache](#cache)
  - [@SyncCache](#synccache)
  - [@MultiCache](#multicache)
- [Direct API Usage](#direct-api-usage)
- [Strategies](#strategies)
  - [ExpirationStrategy](#expirationstrategy)
- [Storages](#storages)
  - [Built-in Storages](#built-in-storages)
  - [Additional Storages](#additional-storages)
- [Custom Key Strategies](#custom-key-strategies)
- [Interface Definitions](#interface-definitions)
- [Advanced Usage](#advanced-usage)
- [Environment Variables](#environment-variables)
- [Testing](#testing)

## Installation

```bash
npm install @node-ts-cache/core
```

## Quick Start

```typescript
import { Cache, ExpirationStrategy, MemoryStorage } from '@node-ts-cache/core';

// Create a caching strategy with in-memory storage
const cacheStrategy = new ExpirationStrategy(new MemoryStorage());

class UserService {
	@Cache(cacheStrategy, { ttl: 60 })
	async getUser(id: string): Promise<User> {
		// Expensive operation - result will be cached for 60 seconds
		return await database.findUser(id);
	}
}
```

## Decorators

### @Cache

Caches async method responses. The cache key is generated from the class name, method name, and stringified arguments.

**Signature:**

```typescript
@Cache(strategy: IAsynchronousCacheType | ISynchronousCacheType, options?: ExpirationOptions, keyStrategy?: IAsyncKeyStrategy)
```

**Parameters:**

- `strategy` - A caching strategy instance (e.g., `ExpirationStrategy`)
- `options` - Options passed to the strategy (see [ExpirationStrategy](#expirationstrategy))
- `keyStrategy` - Optional custom key generation strategy

**Important:** `@Cache` always returns a Promise, even for synchronous methods, because cache operations may be asynchronous.

**Example:**

```typescript
import { Cache, ExpirationStrategy, MemoryStorage } from '@node-ts-cache/core';

const strategy = new ExpirationStrategy(new MemoryStorage());

class ProductService {
	@Cache(strategy, { ttl: 300 })
	async getProduct(id: string): Promise<Product> {
		console.log('Fetching product from database...');
		return await db.products.findById(id);
	}

	@Cache(strategy, { ttl: 3600, isCachedForever: false })
	async getCategories(): Promise<Category[]> {
		return await db.categories.findAll();
	}
}

// Usage
const service = new ProductService();

// First call - hits database
const product1 = await service.getProduct('123');

// Second call with same args - returns cached result
const product2 = await service.getProduct('123');

// Different args - hits database again
const product3 = await service.getProduct('456');
```

### @SyncCache

Caches synchronous method responses without converting to Promises. Use this when your storage is synchronous (like `MemoryStorage` or `LRUStorage`).

**Signature:**

```typescript
@SyncCache(strategy: ISynchronousCacheType, options?: ExpirationOptions, keyStrategy?: ISyncKeyStrategy)
```

**Example:**

```typescript
import { SyncCache, ExpirationStrategy, MemoryStorage } from '@node-ts-cache/core';

const strategy = new ExpirationStrategy(new MemoryStorage());

class ConfigService {
	@SyncCache(strategy, { ttl: 60 })
	getConfig(key: string): ConfigValue {
		// Expensive computation
		return computeConfig(key);
	}
}

// Usage - returns value directly, not a Promise
const config = new ConfigService().getConfig('theme');
```

### @MultiCache

Enables multi-tier caching with batch operations. Useful for:

- Caching array-based lookups efficiently
- Implementing local + remote cache tiers
- Reducing database queries for batch operations

**Signature:**

```typescript
@MultiCache(
  strategies: Array<IMultiSynchronousCacheType | IMultiIAsynchronousCacheType>,
  parameterIndex: number,
  cacheKeyFn?: (element: any) => string,
  options?: ExpirationOptions
)
```

**Parameters:**

- `strategies` - Array of cache strategies, checked in order (first = fastest, last = slowest)
- `parameterIndex` - Index of the array parameter in the method signature
- `cacheKeyFn` - Optional function to generate cache keys for each element
- `options` - Options passed to strategies

**Example:**

```typescript
import { MultiCache, ExpirationStrategy } from '@node-ts-cache/core';
import NodeCacheStorage from '@node-ts-cache/node-cache-storage';
import RedisIOStorage from '@node-ts-cache/ioredis-storage';

// Local cache (fastest) -> Redis (shared) -> Database (slowest)
const localCache = new ExpirationStrategy(new NodeCacheStorage());
const redisCache = new RedisIOStorage(() => redisClient, { maxAge: 3600 });

class UserService {
	@MultiCache([localCache, redisCache], 0, userId => `user:${userId}`, { ttl: 300 })
	async getUsersByIds(userIds: string[]): Promise<User[]> {
		// This only runs for IDs not found in any cache
		// IMPORTANT: Return results in the same order as input IDs
		return await db.users.findByIds(userIds);
	}
}

// Usage
const service = new UserService();

// First call - checks local, then redis, then hits database
const users = await service.getUsersByIds(['1', '2', '3']);

// Second call - user 1 & 2 from local cache, user 4 from database
const moreUsers = await service.getUsersByIds(['1', '2', '4']);
```

**Return Value Requirements:**

- Return an array with the same length and order as the input array
- Use `null` for entries that exist but are empty
- Use `undefined` for entries that should be re-queried next time

## Direct API Usage

You can use the caching strategy directly without decorators:

```typescript
import { ExpirationStrategy, MemoryStorage } from '@node-ts-cache/core';

const cache = new ExpirationStrategy(new MemoryStorage());

class DataService {
	async getData(key: string): Promise<Data> {
		// Check cache first
		const cached = await cache.getItem<Data>(key);
		if (cached !== undefined) {
			return cached;
		}

		// Fetch fresh data
		const data = await fetchData(key);

		// Store in cache
		await cache.setItem(key, data, { ttl: 300 });

		return data;
	}

	async invalidate(key: string): Promise<void> {
		await cache.setItem(key, undefined);
	}

	async clearAll(): Promise<void> {
		await cache.clear();
	}
}
```

## Strategies

### ExpirationStrategy

Time-based cache expiration strategy. Items are automatically invalidated after a specified TTL (Time To Live).

**Constructor:**

```typescript
new ExpirationStrategy(storage: IAsynchronousCacheType | ISynchronousCacheType)
```

**Options:**

| Option            | Type      | Default | Description                                                                                                               |
| ----------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ttl`             | `number`  | `60`    | Time to live in **seconds**                                                                                               |
| `isLazy`          | `boolean` | `true`  | If `true`, items are deleted when accessed after expiration. If `false`, items are deleted automatically via `setTimeout` |
| `isCachedForever` | `boolean` | `false` | If `true`, items never expire (ignores `ttl`)                                                                             |

**Example:**

```typescript
import { ExpirationStrategy, MemoryStorage } from '@node-ts-cache/core';

const storage = new MemoryStorage();
const strategy = new ExpirationStrategy(storage);

// Cache for 5 minutes with lazy expiration
await strategy.setItem('key1', 'value', { ttl: 300, isLazy: true });

// Cache forever
await strategy.setItem('key2', 'value', { isCachedForever: true });

// Cache for 10 seconds with eager expiration (auto-delete)
await strategy.setItem('key3', 'value', { ttl: 10, isLazy: false });
```

**Lazy vs Eager Expiration:**

- **Lazy (`isLazy: true`)**: Expired items remain in storage until accessed. Memory is freed on read. Better for large caches.
- **Eager (`isLazy: false`)**: Items are deleted via `setTimeout` after TTL. Frees memory automatically but uses timers.

## Storages

### Built-in Storages

These storages are included in the core package:

#### MemoryStorage

Simple in-memory storage using a JavaScript object. Best for development and simple use cases.

```typescript
import { MemoryStorage, ExpirationStrategy } from '@node-ts-cache/core';

const storage = new MemoryStorage();
const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Synchronous operations
- No external dependencies
- Data lost on process restart
- No size limits (can cause memory issues)

#### FsJsonStorage

File-based storage that persists cache to a JSON file. Useful for persistent local caching.

```typescript
import { FsJsonStorage, ExpirationStrategy } from '@node-ts-cache/core';

const storage = new FsJsonStorage('/tmp/cache.json');
const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Asynchronous operations
- Survives process restarts
- Slower than memory storage
- Good for development/single-instance deployments

### Additional Storages

Install these separately based on your needs:

#### NodeCacheStorage

Wrapper for [node-cache](https://www.npmjs.com/package/node-cache) - a simple in-memory cache with TTL support.

```bash
npm install @node-ts-cache/node-cache-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import NodeCacheStorage from '@node-ts-cache/node-cache-storage';

const storage = new NodeCacheStorage({
	stdTTL: 100, // Default TTL in seconds
	checkperiod: 120, // Cleanup interval in seconds
	maxKeys: 1000 // Maximum number of keys
});
const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Synchronous operations
- Supports multi-get/set operations
- Built-in TTL and cleanup
- Good for production single-instance apps

#### LRUStorage

Wrapper for [lru-cache](https://www.npmjs.com/package/lru-cache) - Least Recently Used cache with automatic eviction.

```bash
npm install @node-ts-cache/lru-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import LRUStorage from '@node-ts-cache/lru-storage';

const storage = new LRUStorage({
	max: 500, // Maximum number of items
	ttl: 300 // TTL in seconds
});
const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Synchronous operations
- Automatic eviction when max size reached
- Memory-safe with bounded size
- Supports multi-get/set operations

**Note:** LRU cache has its own TTL (`ttl` in seconds). When using with `ExpirationStrategy`, both TTLs apply. Set LRU `ttl` higher than your strategy TTL or use `isCachedForever` in the strategy.

#### RedisStorage

Redis storage using the legacy `redis` package (v3.x). For new projects, consider using `RedisIOStorage` instead.

```bash
npm install @node-ts-cache/redis-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import RedisStorage from '@node-ts-cache/redis-storage';

const storage = new RedisStorage({
	host: 'localhost',
	port: 6379,
	password: 'optional'
});
const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Asynchronous operations
- Uses legacy `redis` package with Bluebird promises
- Shared cache across multiple instances
- No compression support

#### RedisIOStorage

Modern Redis storage using [ioredis](https://github.com/redis/ioredis) with optional Snappy compression.

```bash
npm install @node-ts-cache/ioredis-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import RedisIOStorage from '@node-ts-cache/ioredis-storage';
import Redis from 'ioredis';

const redisClient = new Redis({
	host: 'localhost',
	port: 6379
});

// Basic usage
const storage = new RedisIOStorage(
	() => redisClient,
	{ maxAge: 3600 } // TTL in seconds
);

// With compression (reduces bandwidth, increases CPU usage)
const compressedStorage = new RedisIOStorage(() => redisClient, { maxAge: 3600, compress: true });

// With error handler (non-blocking writes)
storage.onError(error => {
	console.error('Redis error:', error);
});

const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Asynchronous operations
- Supports multi-get/set operations
- Optional Snappy compression
- Modern ioredis client
- Custom error handler support
- Can bypass ExpirationStrategy TTL (uses Redis native TTL)

**Constructor Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAge` | `number` | `86400` | TTL in seconds (used by Redis SETEX) |
| `compress` | `boolean` | `false` | Enable Snappy compression |

#### LRUWithRedisStorage

Two-tier caching: fast local LRU cache with Redis fallback. Provides the best of both worlds.

```bash
npm install @node-ts-cache/lru-redis-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import LRUWithRedisStorage from '@node-ts-cache/lru-redis-storage';
import Redis from 'ioredis';

const redisClient = new Redis();

const storage = new LRUWithRedisStorage(
	{ max: 1000 }, // LRU options
	() => redisClient // Redis client factory
);
const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Asynchronous operations
- Local LRU for hot data
- Redis fallback for cache misses
- Reduces Redis round-trips
- Good for high-traffic applications

## Custom Key Strategies

By default, cache keys are generated as: `ClassName:methodName:JSON.stringify(args)`

You can implement custom key strategies for different needs:

### Synchronous Key Strategy

```typescript
import { Cache, ExpirationStrategy, MemoryStorage, ISyncKeyStrategy } from '@node-ts-cache/core';

class CustomKeyStrategy implements ISyncKeyStrategy {
	getKey(className: string, methodName: string, args: any[]): string | undefined {
		// Return undefined to skip caching for this call
		if (args[0] === 'skip') {
			return undefined;
		}

		// Custom key format
		return `${className}::${methodName}::${args.join('-')}`;
	}
}

const strategy = new ExpirationStrategy(new MemoryStorage());
const keyStrategy = new CustomKeyStrategy();

class MyService {
	@Cache(strategy, { ttl: 60 }, keyStrategy)
	async getData(id: string): Promise<Data> {
		return fetchData(id);
	}
}
```

### Asynchronous Key Strategy

For key generation that requires async operations (e.g., fetching user context):

```typescript
import { Cache, ExpirationStrategy, MemoryStorage, IAsyncKeyStrategy } from '@node-ts-cache/core';

class AsyncKeyStrategy implements IAsyncKeyStrategy {
	async getKey(className: string, methodName: string, args: any[]): Promise<string | undefined> {
		// Async operation to build key
		const userId = await getCurrentUserId();
		return `${userId}:${className}:${methodName}:${JSON.stringify(args)}`;
	}
}
```

## Interface Definitions

### Storage Interfaces

```typescript
/**
 * Cache entry structure stored in backends
 */
interface ICacheEntry {
	content: any; // The cached value
	meta: any; // Metadata (e.g., TTL, createdAt)
}

/**
 * Asynchronous storage for single items
 */
interface IAsynchronousCacheType<C = ICacheEntry> {
	/** Retrieve an item by key. Returns undefined if not found. */
	getItem<T>(key: string): Promise<T | undefined>;

	/** Store an item. Pass undefined as content to delete. */
	setItem(key: string, content: C | undefined, options?: any): Promise<void>;

	/** Clear all items from the cache. */
	clear(): Promise<void>;
}

/**
 * Synchronous storage for single items
 */
interface ISynchronousCacheType<C = ICacheEntry> {
	/** Retrieve an item by key. Returns undefined if not found. */
	getItem<T>(key: string): T | undefined;

	/** Store an item. Pass undefined as content to delete. */
	setItem(key: string, content: C | undefined, options?: any): void;

	/** Clear all items from the cache. */
	clear(): void;
}

/**
 * Asynchronous storage with batch operations
 */
interface IMultiIAsynchronousCacheType<C = ICacheEntry> {
	/** Retrieve multiple items by keys. */
	getItems<T>(keys: string[]): Promise<{ [key: string]: T | undefined }>;

	/** Store multiple items at once. */
	setItems(values: { key: string; content: C | undefined }[], options?: any): Promise<void>;

	/** Clear all items from the cache. */
	clear(): Promise<void>;
}

/**
 * Synchronous storage with batch operations
 */
interface IMultiSynchronousCacheType<C = ICacheEntry> {
	/** Retrieve multiple items by keys. */
	getItems<T>(keys: string[]): { [key: string]: T | undefined };

	/** Store multiple items at once. */
	setItems(values: { key: string; content: C | undefined }[], options?: any): void;

	/** Clear all items from the cache. */
	clear(): void;
}
```

### Key Strategy Interfaces

```typescript
/**
 * Synchronous key generation strategy
 */
interface ISyncKeyStrategy {
	/**
	 * Generate a cache key from method context
	 * @param className - Name of the class containing the method
	 * @param methodName - Name of the cached method
	 * @param args - Arguments passed to the method
	 * @returns Cache key string, or undefined to skip caching
	 */
	getKey(className: string, methodName: string, args: any[]): string | undefined;
}

/**
 * Asynchronous key generation strategy
 */
interface IAsyncKeyStrategy {
	/**
	 * Generate a cache key from method context (can be async)
	 * @param className - Name of the class containing the method
	 * @param methodName - Name of the cached method
	 * @param args - Arguments passed to the method
	 * @returns Cache key string, or undefined to skip caching
	 */
	getKey(
		className: string,
		methodName: string,
		args: any[]
	): Promise<string | undefined> | string | undefined;
}
```

### ExpirationStrategy Options

```typescript
interface ExpirationOptions {
	/** Time to live in seconds (default: 60) */
	ttl?: number;

	/** If true, delete on access after expiration. If false, delete via setTimeout (default: true) */
	isLazy?: boolean;

	/** If true, cache forever ignoring TTL (default: false) */
	isCachedForever?: boolean;
}
```

## Advanced Usage

### Call Deduplication

The `@Cache` decorator automatically deduplicates concurrent calls with the same cache key. If multiple calls are made before the first one completes, they all receive the same result:

```typescript
class DataService {
	@Cache(strategy, { ttl: 60 })
	async fetchData(id: string): Promise<Data> {
		console.log('Fetching...'); // Only logged once
		return await slowApiCall(id);
	}
}

const service = new DataService();

// All three calls share the same pending promise
const [a, b, c] = await Promise.all([
	service.fetchData('123'),
	service.fetchData('123'),
	service.fetchData('123')
]);
// "Fetching..." is logged only once, all three get the same result
```

### Handling Undefined vs Null

The cache distinguishes between:

- `undefined`: No value found in cache, or value should not be cached
- `null`: Explicit null value that is cached

```typescript
class UserService {
	@Cache(strategy, { ttl: 60 })
	async findUser(id: string): Promise<User | null> {
		const user = await db.findUser(id);
		// Return null for non-existent users to cache the "not found" result
		// Return undefined would cause re-fetching on every call
		return user ?? null;
	}
}
```

### Error Handling

Cache errors are logged but don't break the application flow. If caching fails, the method executes normally:

```typescript
// Cache read/write failures are logged as warnings:
// "@node-ts-cache/core: reading cache failed [key] [error]"
// "@node-ts-cache/core: writing result to cache failed [key] [error]"

// For RedisIOStorage, you can add a custom error handler:
storage.onError(error => {
	metrics.incrementCacheError();
	logger.error('Cache error', error);
});
```

## Environment Variables

| Variable                  | Description                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| `DISABLE_CACHE_DECORATOR` | Set to any value to disable all `@Cache` decorators (useful for debugging) |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run tdd

# Run tests with debugger
npm run tdd-debug-brk
```

## API Reference

### Exports

```typescript
// Decorators
export { Cache } from './decorator/cache.decorator';
export { SyncCache } from './decorator/synccache.decorator';
export { MultiCache } from './decorator/multicache.decorator';

// Strategies
export { ExpirationStrategy } from './strategy/caching/expiration.strategy';

// Built-in Storages
export { MemoryStorage } from './storage/memory';
export { FsJsonStorage } from './storage/fs';

// Interfaces
export {
	IAsynchronousCacheType,
	ISynchronousCacheType,
	IMultiIAsynchronousCacheType,
	IMultiSynchronousCacheType
} from './types/cache.types';
export { ISyncKeyStrategy, IAsyncKeyStrategy } from './types/key.strategy.types';
```

## License

MIT License
