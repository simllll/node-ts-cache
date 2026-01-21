# @hokify/node-ts-cache-lru-redis-storage

[![npm](https://img.shields.io/npm/v/@hokify/node-ts-cache-lru-redis-storage.svg)](https://www.npmjs.org/package/@hokify/node-ts-cache-lru-redis-storage)

Two-tier cache storage adapter for [@hokify/node-ts-cache](https://www.npmjs.com/package/@hokify/node-ts-cache) combining local LRU cache with remote Redis fallback.

## Features

- **Two-tier architecture**: Fast local LRU cache + shared Redis backend
- Local cache for hot data (sub-millisecond access)
- Redis fallback for cache misses
- Automatic population of local cache from Redis hits
- Reduced Redis round-trips
- Ideal for high-traffic, distributed applications

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                      Application                         │
│                          │                               │
│                          ▼                               │
│              ┌───────────────────────┐                  │
│              │   LRUWithRedisStorage │                  │
│              └───────────┬───────────┘                  │
│                          │                               │
│            ┌─────────────┴─────────────┐                │
│            ▼                           ▼                │
│   ┌─────────────────┐         ┌─────────────────┐      │
│   │   Local LRU     │  miss   │     Redis       │      │
│   │   (in-memory)   │ ──────> │   (remote)      │      │
│   │   ~0.01ms       │ <────── │   ~1-5ms        │      │
│   └─────────────────┘  hit    └─────────────────┘      │
│                     (populate)                          │
└─────────────────────────────────────────────────────────┘
```

1. **Get**: Check local LRU first. On miss, check Redis. If found in Redis, populate local LRU.
2. **Set**: Write to both local LRU and Redis.
3. **Clear**: Clear both caches.

## Installation

```bash
npm install @hokify/node-ts-cache @hokify/node-ts-cache-lru-redis-storage ioredis
```

## Usage

### Basic Usage

```typescript
import { Cache, ExpirationStrategy } from "@hokify/node-ts-cache";
import LRUWithRedisStorage from "@hokify/node-ts-cache-lru-redis-storage";
import Redis from "ioredis";

const redisClient = new Redis({
  host: "localhost",
  port: 6379
});

const storage = new LRUWithRedisStorage(
  { max: 1000 },        // LRU options: max 1000 items locally
  () => redisClient     // Redis client factory
);

const strategy = new ExpirationStrategy(storage);

class UserService {
  @Cache(strategy, { ttl: 300 })
  async getUser(id: string): Promise<User> {
    return await db.users.findById(id);
  }
}
```

### With LRU TTL

```typescript
const storage = new LRUWithRedisStorage(
  {
    max: 500,
    maxAge: 1000 * 60  // Local cache TTL: 1 minute (milliseconds)
  },
  () => redisClient
);
```

### Direct API Usage

```typescript
const storage = new LRUWithRedisStorage({ max: 100 }, () => redisClient);
const strategy = new ExpirationStrategy(storage);

// Store (writes to both LRU and Redis)
await strategy.setItem("user:123", { name: "John" }, { ttl: 60 });

// First get - might hit Redis if not in LRU
const user1 = await strategy.getItem<User>("user:123");

// Second get - hits local LRU (fast!)
const user2 = await strategy.getItem<User>("user:123");

// Clear both caches
await strategy.clear();
```

## Constructor

```typescript
new LRUWithRedisStorage(
  lruOptions: LRU.Options<string, any>,
  redis: () => Redis.Redis
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `lruOptions` | `LRU.Options` | Options for local LRU cache (see [lru-cache](https://www.npmjs.com/package/lru-cache#options)) |
| `redis` | `() => Redis.Redis` | Factory function returning an ioredis client |

### LRU Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max` | `number` | Required | Maximum items in local cache |
| `maxAge` | `number` | - | Local TTL in **milliseconds** |
| `maxSize` | `number` | - | Maximum total size |
| `sizeCalculation` | `function` | - | Size calculator function |

## Interface

```typescript
interface IAsynchronousCacheType {
  getItem<T>(key: string): Promise<T | undefined>;
  setItem(key: string, content: any, options?: any): Promise<void>;
  clear(): Promise<void>;
}
```

## Use Cases

### High-Traffic APIs

```typescript
class ProductAPI {
  @Cache(strategy, { ttl: 60 })
  async getProduct(id: string): Promise<Product> {
    // Hot products served from local LRU (~0.01ms)
    // Cold products fetched from Redis (~1-5ms)
    // Very cold products hit database
    return await db.products.findById(id);
  }
}
```

### Distributed Systems

Multiple application instances share the same Redis cache while maintaining their own local LRU:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Instance 1  │     │  Instance 2  │     │  Instance 3  │
│  ┌────────┐  │     │  ┌────────┐  │     │  ┌────────┐  │
│  │  LRU   │  │     │  │  LRU   │  │     │  │  LRU   │  │
│  └────┬───┘  │     │  └────┬───┘  │     │  └────┬───┘  │
└───────┼──────┘     └───────┼──────┘     └───────┼──────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                      ┌──────┴──────┐
                      │    Redis    │
                      │  (shared)   │
                      └─────────────┘
```

### Session Caching

```typescript
class SessionService {
  @Cache(strategy, { ttl: 1800 })  // 30 minutes
  async getSession(token: string): Promise<Session> {
    // Active sessions stay in local LRU
    // Inactive sessions fall back to Redis
    return await db.sessions.findByToken(token);
  }
}
```

## Performance Considerations

- **Local LRU hit**: ~0.01ms (in-process memory access)
- **Redis hit**: ~1-5ms (network round-trip)
- **Set local `max`** based on your memory budget and access patterns
- **Shorter local TTL** = fresher data but more Redis hits
- **Longer local TTL** = better performance but potentially stale data

## Dependencies

- `lru-cache` ^6.0.0
- `ioredis` ^5.3.2

## Requirements

- Node.js >= 18.0.0
- Redis server

## License

MIT
