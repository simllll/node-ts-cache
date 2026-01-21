# @hokify/node-ts-cache-lru-storage

[![npm](https://img.shields.io/npm/v/@hokify/node-ts-cache-lru-storage.svg)](https://www.npmjs.org/package/@hokify/node-ts-cache-lru-storage)

LRU (Least Recently Used) cache storage adapter for [@hokify/node-ts-cache](https://www.npmjs.com/package/@hokify/node-ts-cache) using [lru-cache](https://www.npmjs.com/package/lru-cache).

## Features

- Synchronous operations
- Automatic eviction of least recently used items
- Configurable maximum size (items or memory)
- Built-in TTL support
- Multi-get/set operations
- Memory-safe with bounded cache size

## Installation

```bash
npm install @hokify/node-ts-cache @hokify/node-ts-cache-lru-storage
```

## Usage

### Basic Usage

```typescript
import { SyncCache, ExpirationStrategy } from '@hokify/node-ts-cache';
import LRUStorage from '@hokify/node-ts-cache-lru-storage';

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
	maxAge: 1000 * 60 * 5 // 5 minutes in milliseconds
});
```

> **Note:** LRU cache uses `maxAge` in **milliseconds**, while ExpirationStrategy uses `ttl` in **seconds**.

### Memory-Based Limit

```typescript
const storage = new LRUStorage({
	max: 500,
	maxSize: 5000, // Maximum total "size" units
	sizeCalculation: (value, key) => {
		// Return the "size" of each item
		return JSON.stringify(value).length;
	}
});
```

### Async Usage

```typescript
import { Cache, ExpirationStrategy } from '@hokify/node-ts-cache';
import LRUStorage from '@hokify/node-ts-cache-lru-storage';

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
import { MultiCache, ExpirationStrategy } from '@hokify/node-ts-cache';
import LRUStorage from '@hokify/node-ts-cache-lru-storage';

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

Accepts [lru-cache options](https://www.npmjs.com/package/lru-cache#options) (v6.x):

| Option            | Type       | Default  | Description                                     |
| ----------------- | ---------- | -------- | ----------------------------------------------- |
| `max`             | `number`   | Required | Maximum number of items                         |
| `maxAge`          | `number`   | -        | Maximum age in **milliseconds**                 |
| `maxSize`         | `number`   | -        | Maximum total size (requires `sizeCalculation`) |
| `sizeCalculation` | `function` | -        | Function to calculate item size                 |
| `updateAgeOnGet`  | `boolean`  | `false`  | Reset TTL on get                                |
| `dispose`         | `function` | -        | Called when items are evicted                   |

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

## TTL Behavior

When using with `ExpirationStrategy`:

- LRU's `maxAge` is in **milliseconds**
- ExpirationStrategy's `ttl` is in **seconds**
- Both TTLs apply - the shorter one wins

**Recommendation:** Set LRU's `maxAge` longer than your strategy TTL, or omit it entirely and let ExpirationStrategy handle expiration:

```typescript
// Option 1: Let ExpirationStrategy handle TTL
const storage = new LRUStorage({ max: 1000 }); // No maxAge
const strategy = new ExpirationStrategy(storage);

// Option 2: Use LRU TTL with "forever" strategy
const storage = new LRUStorage({ max: 1000, maxAge: 60000 });
strategy.setItem('key', value, { isCachedForever: true });
```

## LRU Eviction

When the cache reaches `max` items, the least recently accessed items are automatically evicted to make room for new ones. This makes LRU ideal for:

- Memory-constrained environments
- Hot-data caching (frequently accessed items stay cached)
- Preventing unbounded memory growth

## Dependencies

- `lru-cache` ^6.0.0

## Requirements

- Node.js >= 18.0.0

## License

MIT
