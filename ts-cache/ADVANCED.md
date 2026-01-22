# Advanced Usage Guide

This document covers advanced topics for implementing custom storages, detailed storage configuration, and reference material.

## Interface Definitions

### Storage Interfaces

Implement these interfaces to create custom storage backends.

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
 * Asynchronous storage with batch operations (for @MultiCache)
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
 * Synchronous storage with batch operations (for @MultiCache)
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
	getKey(className: string, methodName: string, args: any[]): string | undefined;
}

/**
 * Asynchronous key generation strategy
 */
interface IAsyncKeyStrategy {
	getKey(
		className: string,
		methodName: string,
		args: any[]
	): Promise<string | undefined> | string | undefined;
}
```

## Detailed Storage Configuration

### MemoryStorage

Simple in-memory storage using a JavaScript object.

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

### FsJsonStorage

File-based storage that persists cache to a JSON file.

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

### NodeCacheStorage

Wrapper for [node-cache](https://www.npmjs.com/package/node-cache).

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

### LRUStorage

Wrapper for [lru-cache](https://www.npmjs.com/package/lru-cache).

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

**Note:** LRU cache has its own TTL. When using with `ExpirationStrategy`, both TTLs apply. Set LRU `ttl` higher than your strategy TTL or use `isCachedForever` in the strategy.

### RedisStorage

Redis storage using the `redis` package (v4.x).

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
- Shared cache across multiple instances
- No compression support

### RedisIOStorage

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
const compressedStorage = new RedisIOStorage(() => redisClient, {
	maxAge: 3600,
	compress: true
});

// With error handler (non-blocking writes)
storage.onError(error => {
	console.error('Redis error:', error);
});

const strategy = new ExpirationStrategy(storage);
```

**Constructor Options:**

| Option     | Type      | Default | Description                    |
| ---------- | --------- | ------- | ------------------------------ |
| `maxAge`   | `number`  | `86400` | TTL in seconds (used by Redis) |
| `compress` | `boolean` | `false` | Enable Snappy compression      |

**Characteristics:**

- Asynchronous operations
- Supports multi-get/set operations
- Optional Snappy compression
- Custom error handler support
- Can bypass ExpirationStrategy TTL (uses Redis native TTL)

### LRUWithRedisStorage

Two-tier caching: fast local LRU cache with Redis fallback.

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

### ElasticsearchStorage

Elasticsearch-based storage for search-optimized caching.

```bash
npm install @node-ts-cache/elasticsearch-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import { ElasticsearchStorage } from '@node-ts-cache/elasticsearch-storage';

// Basic usage
const storage = new ElasticsearchStorage({
	indexName: 'my-cache',
	clientOptions: {
		node: 'http://localhost:9200'
	}
});

// With pre-configured client
import { Client } from '@elastic/elasticsearch';

const client = new Client({
	node: 'https://my-cluster.com',
	auth: { apiKey: 'your-api-key' }
});

const storage = new ElasticsearchStorage({
	indexName: 'my-cache',
	client
});

const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Asynchronous operations
- Scalable distributed storage
- Useful when Elasticsearch is already part of the stack
- Supports complex document caching

### MemcachedStorage

High-performance distributed caching using Memcached.

```bash
npm install @node-ts-cache/memcached-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import { MemcachedStorage } from '@node-ts-cache/memcached-storage';

// Single server
const storage = new MemcachedStorage({
	location: 'localhost:11211'
});

// Multiple servers (distributed)
const distributedStorage = new MemcachedStorage({
	location: ['server1:11211', 'server2:11211', 'server3:11211'],
	options: {
		retries: 3,
		timeout: 5000,
		poolSize: 10
	}
});

const strategy = new ExpirationStrategy(storage);
```

**Characteristics:**

- Asynchronous operations
- Simple and fast key-value storage
- Excellent for distributed caching
- Lower memory overhead than Redis
- No persistence (data lost on restart)

### ValkeyStorage

Valkey storage using [iovalkey](https://github.com/valkey-io/iovalkey), the official Valkey client (ioredis-compatible).

```bash
npm install @node-ts-cache/valkey-storage
```

```typescript
import { ExpirationStrategy } from '@node-ts-cache/core';
import { ValkeyStorage } from '@node-ts-cache/valkey-storage';
import Valkey from 'iovalkey';

const valkeyClient = new Valkey({
	host: 'localhost',
	port: 6379
});

const storage = new ValkeyStorage(() => valkeyClient, {
	maxAge: 3600 // TTL in seconds
});

// With error handler (non-blocking writes)
storage.onError(error => {
	console.error('Valkey error:', error);
});

const strategy = new ExpirationStrategy(storage);
```

**Constructor Options:**

| Option   | Type     | Default | Description                     |
| -------- | -------- | ------- | ------------------------------- |
| `maxAge` | `number` | `86400` | TTL in seconds (used by Valkey) |

**Characteristics:**

- Asynchronous operations
- Supports multi-get/set operations
- Redis-compatible (drop-in replacement)
- Open source (BSD-3 license)
- Backed by Linux Foundation

## @MultiCache Details

### Signature

```typescript
@MultiCache(
  strategies: Array<IMultiSynchronousCacheType | IMultiIAsynchronousCacheType>,
  parameterIndex: number,
  cacheKeyFn?: (element: any) => string,
  options?: ExpirationOptions
)
```

### Parameters

- `strategies` - Array of cache strategies, checked in order (first = fastest, last = slowest)
- `parameterIndex` - Index of the array parameter in the method signature
- `cacheKeyFn` - Optional function to generate cache keys for each element
- `options` - Options passed to strategies

### Example

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

### Return Value Requirements

- Return an array with the same length and order as the input array
- Use `null` for entries that exist but are empty
- Use `undefined` for entries that should be re-queried next time

## Lazy vs Eager Expiration

- **Lazy (`isLazy: true`)**: Expired items remain in storage until accessed. Memory is freed on read. Better for large caches.
- **Eager (`isLazy: false`)**: Items are deleted via `setTimeout` after TTL. Frees memory automatically but uses timers.

## Error Handling

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

## Async Key Strategy Example

For key generation that requires async operations (e.g., fetching user context):

```typescript
import { Cache, ExpirationStrategy, MemoryStorage, IAsyncKeyStrategy } from '@node-ts-cache/core';

class AsyncKeyStrategy implements IAsyncKeyStrategy {
	async getKey(className: string, methodName: string, args: any[]): Promise<string | undefined> {
		const userId = await getCurrentUserId();
		return `${userId}:${className}:${methodName}:${JSON.stringify(args)}`;
	}
}
```

## API Exports

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
