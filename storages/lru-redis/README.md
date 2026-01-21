# @node-ts-cache/lru-redis-storage

[![npm](https://img.shields.io/npm/v/@node-ts-cache/lru-redis-storage.svg)](https://www.npmjs.org/package/@node-ts-cache/lru-redis-storage)

Two-tier cache storage adapter for [@node-ts-cache/core](https://www.npmjs.com/package/@node-ts-cache/core) combining local LRU cache with remote Redis fallback.

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
3. **Clear**: Clear local LRU cache.

## Installation

```bash
npm install @node-ts-cache/core @node-ts-cache/lru-redis-storage ioredis
```

## Usage

### Basic Usage

```typescript
import { Cache, ExpirationStrategy } from '@node-ts-cache/core';
import { LRUWithRedisStorage } from '@node-ts-cache/lru-redis-storage';
import Redis from 'ioredis';

const redisClient = new Redis({
	host: 'localhost',
	port: 6379
});

const storage = new LRUWithRedisStorage(
	{ max: 1000 }, // LRU options: max 1000 items locally
	() => redisClient // Redis client factory
);

const strategy = new ExpirationStrategy(storage);

class UserService {
	@Cache(strategy, { ttl: 300 })
	async getUser(id: string): Promise<User> {
		return await db.users.findById(id);
	}
}
```

### With TTL

```typescript
const storage = new LRUWithRedisStorage(
	{
		max: 500,
		ttl: 60 // Local and Redis cache TTL: 1 minute (in seconds)
	},
	() => redisClient
);
```

### Direct API Usage

```typescript
const storage = new LRUWithRedisStorage({ max: 100 }, () => redisClient);
const strategy = new ExpirationStrategy(storage);

// Store (writes to both LRU and Redis)
await strategy.setItem('user:123', { name: 'John' }, { ttl: 60 });

// First get - might hit Redis if not in LRU
const user1 = await strategy.getItem<User>('user:123');

// Second get - hits local LRU (fast!)
const user2 = await strategy.getItem<User>('user:123');

// Clear local LRU cache
await strategy.clear();
```

## Constructor

```typescript
new LRUWithRedisStorage(
  options: LRUWithRedisStorageOptions,
  redis: () => Redis.Redis
)
```

| Parameter | Type                         | Description                              |
| --------- | ---------------------------- | ---------------------------------------- |
| `options` | `LRUWithRedisStorageOptions` | Options for local LRU cache and TTL      |
| `redis`   | `() => Redis.Redis`          | Factory function returning ioredis client |

### Options

| Option | Type     | Default | Description                                      |
| ------ | -------- | ------- | ------------------------------------------------ |
| `max`  | `number` | `500`   | Maximum items in local LRU cache                 |
| `ttl`  | `number` | `86400` | Time to live in **seconds** (for both LRU & Redis) |

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
	@Cache(strategy, { ttl: 1800 }) // 30 minutes
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
- **Shorter TTL** = fresher data but more Redis hits
- **Longer TTL** = better performance but potentially stale data

## Dependencies

- `lru-cache` ^10.0.0
- `ioredis` ^5.3.2

## Requirements

- Node.js >= 18.0.0
- Redis server

## License

MIT
