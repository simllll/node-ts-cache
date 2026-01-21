# @node-ts-cache/redis-storage

[![npm](https://img.shields.io/npm/v/@node-ts-cache/redis-storage.svg)](https://www.npmjs.org/package/@node-ts-cache/redis-storage)

Redis storage adapter for [@node-ts-cache/core](https://www.npmjs.com/package/@node-ts-cache/core) using the legacy `redis` package (v3.x).

> **Note:** For new projects, consider using [@node-ts-cache/ioredis-storage](https://www.npmjs.com/package/@node-ts-cache/ioredis-storage) which uses the modern `ioredis` client with additional features like compression and multi-operations.

## Installation

```bash
npm install @node-ts-cache/core @node-ts-cache/redis-storage
```

## Usage

### Basic Usage

```typescript
import { Cache, ExpirationStrategy } from '@node-ts-cache/core';
import RedisStorage from '@node-ts-cache/redis-storage';

const storage = new RedisStorage({
	host: 'localhost',
	port: 6379
});

const strategy = new ExpirationStrategy(storage);

class UserService {
	@Cache(strategy, { ttl: 300 })
	async getUser(id: string): Promise<User> {
		return await db.users.findById(id);
	}
}
```

### With Authentication

```typescript
const storage = new RedisStorage({
	host: 'redis.example.com',
	port: 6379,
	password: 'your-password',
	db: 0
});
```

### Direct API Usage

```typescript
const storage = new RedisStorage({ host: 'localhost', port: 6379 });
const strategy = new ExpirationStrategy(storage);

// Store a value
await strategy.setItem('user:123', { name: 'John' }, { ttl: 60 });

// Retrieve a value
const user = await strategy.getItem<{ name: string }>('user:123');

// Clear all cached items
await strategy.clear();
```

## Constructor Options

The constructor accepts [RedisClientOptions](https://github.com/redis/node-redis/tree/v3.1.2#options-object-properties) from the `redis` package:

| Option     | Type     | Default       | Description                     |
| ---------- | -------- | ------------- | ------------------------------- |
| `host`     | `string` | `"127.0.0.1"` | Redis server hostname           |
| `port`     | `number` | `6379`        | Redis server port               |
| `password` | `string` | -             | Redis authentication password   |
| `db`       | `number` | `0`           | Redis database number           |
| `url`      | `string` | -             | Redis URL (overrides host/port) |

## Interface

```typescript
interface IAsynchronousCacheType {
	getItem<T>(key: string): Promise<T | undefined>;
	setItem(key: string, content: any, options?: any): Promise<void>;
	clear(): Promise<void>;
}
```

## Dependencies

- `redis` ^3.1.2 - Redis client for Node.js
- `bluebird` 3.7.2 - Promise library for async operations

## Requirements

- Node.js >= 18.0.0
- Redis server

## License

MIT
