# @hokify/node-ts-cache-redisio-storage

[![npm](https://img.shields.io/npm/v/@hokify/node-ts-cache-redisio-storage.svg)](https://www.npmjs.org/package/@hokify/node-ts-cache-redisio-storage)

Modern Redis storage adapter for [@hokify/node-ts-cache](https://www.npmjs.com/package/@hokify/node-ts-cache) using [ioredis](https://github.com/redis/ioredis) with optional Snappy compression.

## Features

- Modern `ioredis` client
- Optional Snappy compression for reduced bandwidth
- Multi-get/set operations for batch caching
- Built-in TTL support (uses Redis native SETEX)
- Custom error handler support
- Non-blocking write operations (optional)

## Installation

```bash
npm install @hokify/node-ts-cache @hokify/node-ts-cache-redisio-storage ioredis
```

## Usage

### Basic Usage

```typescript
import { Cache, ExpirationStrategy } from "@hokify/node-ts-cache";
import RedisIOStorage from "@hokify/node-ts-cache-redisio-storage";
import Redis from "ioredis";

const redisClient = new Redis({
  host: "localhost",
  port: 6379
});

const storage = new RedisIOStorage(
  () => redisClient,
  { maxAge: 3600 }  // TTL in seconds (default: 86400 = 24 hours)
);

const strategy = new ExpirationStrategy(storage);

class UserService {
  @Cache(strategy, { ttl: 300 })
  async getUser(id: string): Promise<User> {
    return await db.users.findById(id);
  }
}
```

### With Compression

Enable Snappy compression to reduce bandwidth usage (useful for large objects):

```typescript
const storage = new RedisIOStorage(
  () => redisClient,
  { maxAge: 3600, compress: true }
);
```

### With Error Handler

Configure a custom error handler for non-blocking write operations:

```typescript
const storage = new RedisIOStorage(
  () => redisClient,
  { maxAge: 3600 }
);

storage.onError((error) => {
  // Log errors without blocking the application
  console.error("Redis cache error:", error);
  metrics.incrementCacheError();
});
```

When an error handler is set, write operations don't await the Redis response, making them non-blocking.

### Multi-Operations with @MultiCache

This storage supports batch operations, making it ideal for multi-tier caching:

```typescript
import { MultiCache, ExpirationStrategy } from "@hokify/node-ts-cache";
import RedisIOStorage from "@hokify/node-ts-cache-redisio-storage";
import NodeCacheStorage from "@hokify/node-ts-cache-node-cache-storage";

const localCache = new ExpirationStrategy(new NodeCacheStorage());
const redisCache = new RedisIOStorage(() => redisClient, { maxAge: 3600 });

class UserService {
  @MultiCache([localCache, redisCache], 0, (id) => `user:${id}`)
  async getUsersByIds(ids: string[]): Promise<User[]> {
    return await db.users.findByIds(ids);
  }
}
```

### Direct API Usage

```typescript
const storage = new RedisIOStorage(() => redisClient, { maxAge: 3600 });

// Single item operations
await storage.setItem("user:123", { name: "John" }, { ttl: 60 });
const user = await storage.getItem<{ name: string }>("user:123");

// Multi-item operations
const users = await storage.getItems<User>(["user:1", "user:2", "user:3"]);
await storage.setItems([
  { key: "user:1", content: { name: "Alice" } },
  { key: "user:2", content: { name: "Bob" } }
], { ttl: 60 });

// Clear all (uses FLUSHDB - use with caution!)
await storage.clear();
```

## Constructor

```typescript
new RedisIOStorage(
  redis: () => Redis.Redis,
  options?: {
    maxAge?: number;     // TTL in seconds (default: 86400)
    compress?: boolean;  // Enable Snappy compression (default: false)
  }
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `redis` | `() => Redis.Redis` | Factory function returning an ioredis client instance |
| `options.maxAge` | `number` | Default TTL in seconds (default: 86400 = 24 hours) |
| `options.compress` | `boolean` | Enable Snappy compression (default: false) |

## Interface

```typescript
interface IAsynchronousCacheType {
  getItem<T>(key: string): Promise<T | undefined>;
  setItem(key: string, content: any, options?: { ttl?: number }): Promise<void>;
  clear(): Promise<void>;
}

interface IMultiIAsynchronousCacheType {
  getItems<T>(keys: string[]): Promise<{ [key: string]: T | undefined }>;
  setItems(values: { key: string; content: any }[], options?: { ttl?: number }): Promise<void>;
  clear(): Promise<void>;
}
```

## TTL Behavior

This storage uses Redis native TTL (SETEX command) rather than relying solely on ExpirationStrategy:

- `options.maxAge` in constructor sets the default TTL
- `options.ttl` in setItem/setItems overrides the default
- When used with ExpirationStrategy, both TTLs apply (Redis TTL for storage-level, strategy TTL for metadata)

## Value Handling

- `undefined`: Deletes the key from Redis
- `null`: Stores as empty string `""`
- Objects: JSON stringified before storage
- Primitives: Stored directly

## Dependencies

- `ioredis` ^5.3.2 - Modern Redis client
- `snappy` ^7.0.5 - Fast compression library

## Requirements

- Node.js >= 18.0.0
- Redis server

## License

MIT
