# @node-ts-cache/core

[![npm](https://img.shields.io/npm/v/@node-ts-cache/core.svg)](https://www.npmjs.org/package/@node-ts-cache/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/simllll/node-ts-cache/actions/workflows/test.yml/badge.svg)](https://github.com/simllll/node-ts-cache/actions/workflows/test.yml)

Simple and extensible caching module for TypeScript/Node.js with decorator support.

## Installation

```bash
npm install @node-ts-cache/core
```

## Quick Start

```typescript
import { Cache, ExpirationStrategy, MemoryStorage } from "@node-ts-cache/core";

const cacheStrategy = new ExpirationStrategy(new MemoryStorage());

class UserService {
  @Cache(cacheStrategy, { ttl: 60 })
  async getUser(id: string): Promise<User> {
    return await database.findUser(id);
  }
}
```

## Storage Engines

The core package includes `MemoryStorage` and `FsJsonStorage`. Additional storage backends are available as separate packages:

| Package | Storage Type | Sync/Async | Use Case |
|---------|-------------|------------|----------|
| `@node-ts-cache/core` | MemoryStorage | Sync | Development, simple caching |
| `@node-ts-cache/core` | FsJsonStorage | Async | Persistent local cache |
| `@node-ts-cache/node-cache-storage` | [node-cache](https://www.npmjs.com/package/node-cache) | Sync | Production single-instance with TTL |
| `@node-ts-cache/lru-storage` | [lru-cache](https://www.npmjs.com/package/lru-cache) | Sync | Memory-bounded with automatic eviction |
| `@node-ts-cache/redis-storage` | [redis](https://www.npmjs.com/package/redis) (v4.x) | Async | Shared cache |
| `@node-ts-cache/ioredis-storage` | [ioredis](https://www.npmjs.com/package/ioredis) | Async | Shared cache with compression |
| `@node-ts-cache/lru-redis-storage` | LRU + Redis | Async | Two-tier: fast local + shared remote |

## Decorators

### @Cache

Caches async method results. Cache key is generated from class name, method name, and arguments.

```typescript
class ProductService {
  @Cache(strategy, { ttl: 300 })
  async getProduct(id: string): Promise<Product> {
    return await db.products.findById(id);
  }
}
```

**Note:** `@Cache` always returns a Promise since cache operations may be asynchronous.

### @SyncCache

Caches synchronous method results without converting to Promises. Use with synchronous storages like `MemoryStorage` or `LRUStorage`.

```typescript
class ConfigService {
  @SyncCache(strategy, { ttl: 60 })
  getConfig(key: string): ConfigValue {
    return computeConfig(key);
  }
}
```

### @MultiCache

Multi-tier caching with batch operations for array-based lookups.

```typescript
class UserService {
  @MultiCache([localCache, redisCache], 0, (id) => `user:${id}`, { ttl: 300 })
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    return await db.users.findByIds(userIds);
  }
}
```

## Direct API Usage

Use the caching strategy directly without decorators:

```typescript
const cache = new ExpirationStrategy(new MemoryStorage());

// Get item
const value = await cache.getItem<Data>("key");

// Set item with TTL
await cache.setItem("key", data, { ttl: 300 });

// Delete item
await cache.setItem("key", undefined);

// Clear all
await cache.clear();
```

## ExpirationStrategy Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | `60` | Time to live in seconds |
| `isLazy` | `boolean` | `true` | If `true`, delete on access after expiration. If `false`, delete via `setTimeout` |
| `isCachedForever` | `boolean` | `false` | If `true`, items never expire |

```typescript
// Cache for 5 minutes with lazy expiration
await strategy.setItem("key", value, { ttl: 300, isLazy: true });

// Cache forever
await strategy.setItem("key", value, { isCachedForever: true });

// Cache with eager expiration (auto-delete after TTL)
await strategy.setItem("key", value, { ttl: 10, isLazy: false });
```

## Custom Key Strategies

Override default key generation by implementing `ISyncKeyStrategy` or `IAsyncKeyStrategy`:

```typescript
class CustomKeyStrategy implements ISyncKeyStrategy {
  getKey(className: string, methodName: string, args: any[]): string | undefined {
    if (args[0] === "skip") return undefined; // Skip caching
    return `${className}::${methodName}::${args.join("-")}`;
  }
}

class MyService {
  @Cache(strategy, { ttl: 60 }, new CustomKeyStrategy())
  async getData(id: string): Promise<Data> {
    return fetchData(id);
  }
}
```

## Advanced Features

### Call Deduplication

Concurrent calls with the same cache key share the same pending promise:

```typescript
// All three calls share one database request
const [a, b, c] = await Promise.all([
  service.fetchData("123"),
  service.fetchData("123"),
  service.fetchData("123"),
]);
```

### Null vs Undefined

- `undefined`: Cache miss or skip caching
- `null`: Cached value (e.g., "not found" result)

```typescript
async findUser(id: string): Promise<User | null> {
  const user = await db.findUser(id);
  return user ?? null; // Cache "not found" as null
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DISABLE_CACHE_DECORATOR` | Set to any value to disable all `@Cache` decorators |

## More Documentation

See [ADVANCED.md](./ADVANCED.md) for:

- Interface definitions for implementing custom storages
- Detailed storage configuration examples
- @MultiCache in-depth usage
- Error handling patterns

## License

MIT License
