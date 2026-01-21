# @node-ts-cache/lru-storage

[![npm](https://img.shields.io/npm/v/@node-ts-cache/lru-storage.svg)](https://www.npmjs.org/package/@node-ts-cache/lru-storage)

LRU (Least Recently Used) cache storage adapter for [@node-ts-cache/core](https://www.npmjs.com/package/@node-ts-cache/core) using [lru-cache](https://www.npmjs.com/package/lru-cache).

## Features

- Synchronous operations
- Automatic eviction of least recently used items
- Configurable maximum size (items or memory)
- Built-in TTL support
- Multi-get/set operations
- Memory-safe with bounded cache size

## Installation

```bash
npm install @node-ts-cache/core @node-ts-cache/lru-storage
```

## Usage

### Basic Usage

```typescript
import { SyncCache, ExpirationStrategy } from '@node-ts-cache/core';
import { LRUStorage } from '@node-ts-cache/lru-storage';

const storage = new LRUStorage({
	max: 500 // Maximum 500 items
});
const strategy = new ExpirationStrategy(storage);

class DataService {
	@SyncCache(strategy, { ttl: 60 })
	getData(key: string): Data {
		return computeExpensiveData(key);
	}
}
```

### With TTL

```typescript
const storage = new LRUStorage({
	max: 1000,
	ttl: 300 // 5 minutes in seconds
});
```

### Memory-Based Limit

```typescript
const storage = new LRUStorage({
	max: 500,
	maxSize: 5000 // Maximum total "size" units
});
```

### Async Usage

```typescript
import { Cache, ExpirationStrategy } from '@node-ts-cache/core';
import { LRUStorage } from '@node-ts-cache/lru-storage';

const storage = new LRUStorage({ max: 1000 });
const strategy = new ExpirationStrategy(storage);

class UserService {
	@Cache(strategy, { ttl: 300 })
	async getUser(id: string): Promise<User> {
		return await db.users.findById(id);
	}
}
```

### Multi-Operations

```typescript
import { MultiCache, ExpirationStrategy } from '@node-ts-cache/core';
import { LRUStorage } from '@node-ts-cache/lru-storage';

const storage = new LRUStorage({ max: 1000 });
const strategy = new ExpirationStrategy(storage);

class ProductService {
	@MultiCache([strategy], 0, id => `product:${id}`)
	async getProducts(ids: string[]): Promise<Product[]> {
		return await db.products.findByIds(ids);
	}
}
```

### Direct API Usage

```typescript
const storage = new LRUStorage({ max: 100 });
const strategy = new ExpirationStrategy(storage);

// Store
strategy.setItem('key', { data: 'value' }, { ttl: 60 });

// Retrieve (also marks as "recently used")
const value = strategy.getItem<{ data: string }>('key');

// Clear all
strategy.clear();
```

## Constructor Options

| Option    | Type     | Default  | Description                                 |
| --------- | -------- | -------- | ------------------------------------------- |
| `max`     | `number` | Required | Maximum number of items                     |
| `ttl`     | `number` | -        | Time to live in **seconds**                 |
| `maxSize` | `number` | -        | Maximum total size (for memory-based limit) |

## Interface

```typescript
interface ISynchronousCacheType {
	getItem<T>(key: string): T | undefined;
	setItem(key: string, content: any, options?: any): void;
	clear(): void;
}

interface IMultiSynchronousCacheType {
	getItems<T>(keys: string[]): { [key: string]: T | undefined };
	setItems(values: { key: string; content: any }[], options?: any): void;
	clear(): void;
}
```

## LRU Eviction

When the cache reaches `max` items, the least recently accessed items are automatically evicted to make room for new ones. This makes LRU ideal for:

- Memory-constrained environments
- Hot-data caching (frequently accessed items stay cached)
- Preventing unbounded memory growth

## Dependencies

- `lru-cache` ^10.0.0

## Requirements

- Node.js >= 18.0.0

## License

MIT
