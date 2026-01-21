# @node-ts-cache/redis-storage

[![npm](https://img.shields.io/npm/v/@node-ts-cache/redis-storage.svg)](https://www.npmjs.org/package/@node-ts-cache/redis-storage)

Redis storage adapter for [@node-ts-cache/core](https://www.npmjs.com/package/@node-ts-cache/core) using the official `redis` package (v4.x).

## Installation

```bash
npm install @node-ts-cache/core @node-ts-cache/redis-storage
```

## Usage

### Basic Usage

```typescript
import { Cache, ExpirationStrategy } from '@node-ts-cache/core';
import { RedisStorage } from '@node-ts-cache/redis-storage';

const storage = new RedisStorage({
	socket: {
		host: 'localhost',
		port: 6379
	}
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
	socket: {
		host: 'redis.example.com',
		port: 6379
	},
	password: 'your-password',
	database: 0
});
```

### Using URL

```typescript
const storage = new RedisStorage({
	url: 'redis://user:password@localhost:6379/0'
});
```

### Direct API Usage

```typescript
import { RedisStorage } from '@node-ts-cache/redis-storage';
import { ExpirationStrategy } from '@node-ts-cache/core';

const storage = new RedisStorage({
	socket: { host: 'localhost', port: 6379 }
});
const strategy = new ExpirationStrategy(storage);

// Store a value
await strategy.setItem('user:123', { name: 'John' }, { ttl: 60 });

// Retrieve a value
const user = await strategy.getItem<{ name: string }>('user:123');

// Clear all cached items
await strategy.clear();

// Disconnect when done
await storage.disconnect();
```

## Constructor Options

The constructor accepts [RedisClientOptions](https://github.com/redis/node-redis#configuration) from the `redis` package v4.x:

| Option     | Type     | Description                              |
| ---------- | -------- | ---------------------------------------- |
| `socket`   | `object` | Socket connection options (host, port)   |
| `url`      | `string` | Redis URL (alternative to socket config) |
| `password` | `string` | Redis authentication password            |
| `database` | `number` | Redis database number (default: 0)       |

## Interface

```typescript
interface IAsynchronousCacheType {
	getItem<T>(key: string): Promise<T | undefined>;
	setItem(key: string, content: any, options?: any): Promise<void>;
	clear(): Promise<void>;
}
```

## Dependencies

- `redis` ^4.7.0 - Official Redis client for Node.js

## Requirements

- Node.js >= 18.0.0
- Redis server

## License

MIT
