# @hokify/node-ts-cache-node-cache-storage

[![npm](https://img.shields.io/npm/v/@hokify/node-ts-cache-node-cache-storage.svg)](https://www.npmjs.org/package/@hokify/node-ts-cache-node-cache-storage)

In-memory storage adapter for [@hokify/node-ts-cache](https://www.npmjs.com/package/@hokify/node-ts-cache) using [node-cache](https://www.npmjs.com/package/node-cache).

## Features

- Synchronous operations (no Promises needed)
- Built-in TTL and automatic cleanup
- Multi-get/set operations for batch caching
- Statistics tracking
- Key count limits
- Clone on get/set (data isolation)

## Installation

```bash
npm install @hokify/node-ts-cache @hokify/node-ts-cache-node-cache-storage
```

## Usage

### Basic Usage

```typescript
import { SyncCache, ExpirationStrategy } from "@hokify/node-ts-cache";
import NodeCacheStorage from "@hokify/node-ts-cache-node-cache-storage";

const storage = new NodeCacheStorage();
const strategy = new ExpirationStrategy(storage);

class ConfigService {
  @SyncCache(strategy, { ttl: 60 })
  getConfig(key: string): Config {
    return loadConfigFromFile(key);
  }
}
```

### With Options

```typescript
const storage = new NodeCacheStorage({
  stdTTL: 100,        // Default TTL in seconds
  checkperiod: 120,   // Cleanup check interval in seconds
  maxKeys: 1000,      // Maximum number of keys (-1 = unlimited)
  useClones: true     // Clone objects on get/set (data isolation)
});
```

### Async Usage

Works with `@Cache` decorator as well (operations are still synchronous internally):

```typescript
import { Cache, ExpirationStrategy } from "@hokify/node-ts-cache";
import NodeCacheStorage from "@hokify/node-ts-cache-node-cache-storage";

const storage = new NodeCacheStorage();
const strategy = new ExpirationStrategy(storage);

class UserService {
  @Cache(strategy, { ttl: 300 })
  async getUser(id: string): Promise<User> {
    return await db.users.findById(id);
  }
}
```

### Multi-Operations with @MultiCache

```typescript
import { MultiCache, ExpirationStrategy } from "@hokify/node-ts-cache";
import NodeCacheStorage from "@hokify/node-ts-cache-node-cache-storage";

const storage = new NodeCacheStorage();
const strategy = new ExpirationStrategy(storage);

class ProductService {
  @MultiCache([strategy], 0, (id) => `product:${id}`)
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    return await db.products.findByIds(ids);
  }
}
```

### Direct API Usage

```typescript
const storage = new NodeCacheStorage();
const strategy = new ExpirationStrategy(storage);

// Single operations
strategy.setItem("key", { data: "value" }, { ttl: 60 });
const value = strategy.getItem<{ data: string }>("key");

// Clear all
strategy.clear();
```

## Constructor Options

Accepts all [node-cache options](https://www.npmjs.com/package/node-cache#options):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stdTTL` | `number` | `0` | Default TTL in seconds (0 = unlimited) |
| `checkperiod` | `number` | `600` | Automatic delete check interval in seconds |
| `maxKeys` | `number` | `-1` | Maximum number of keys (-1 = unlimited) |
| `useClones` | `boolean` | `true` | Clone objects on get/set |
| `deleteOnExpire` | `boolean` | `true` | Delete expired keys automatically |

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
- `node-cache`'s `stdTTL` sets the storage-level TTL
- `ExpirationStrategy`'s `ttl` option sets the strategy-level TTL
- Both apply - the shorter one determines actual expiration

For best results, either:
- Set `stdTTL: 0` and let ExpirationStrategy handle TTL
- Or set `isCachedForever: true` in strategy options and let node-cache handle TTL

## Dependencies

- `node-cache` ^5.1.2

## Requirements

- Node.js >= 18.0.0

## License

MIT
