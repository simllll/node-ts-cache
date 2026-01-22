# node-ts-cache

[![npm](https://img.shields.io/npm/v/@node-ts-cache/core.svg)](https://www.npmjs.org/package/@node-ts-cache/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@node-ts-cache/core.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue.svg)](https://www.typescriptlang.org/)

Simple and extensible caching module for TypeScript/Node.js with decorator support.

## Features

- **Decorator-based caching** - Use `@Cache`, `@SyncCache`, and `@MultiCache` decorators for elegant caching
- **Multiple storage backends** - Memory, File System, Redis, LRU Cache, and more
- **Flexible expiration strategies** - TTL-based expiration with lazy or eager invalidation
- **Multi-tier caching** - Chain multiple cache layers (e.g., local LRU + remote Redis)
- **TypeScript-first** - Full type safety with comprehensive interfaces
- **ESM support** - Modern ES modules with Node.js 18+

## Quick Start

```bash
npm install @node-ts-cache/core
```

```typescript
import { Cache, ExpirationStrategy, MemoryStorage } from '@node-ts-cache/core';

const cacheStrategy = new ExpirationStrategy(new MemoryStorage());

class UserService {
	@Cache(cacheStrategy, { ttl: 300 })
	async getUser(id: string): Promise<User> {
		// This result will be cached for 5 minutes
		return await fetchUserFromDatabase(id);
	}
}
```

## Packages

This is a monorepo containing the following packages:

### Core Package

| Package                           | Version                                                      | Description                                                            |
| --------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [@node-ts-cache/core](./ts-cache) | ![npm](https://img.shields.io/npm/v/@node-ts-cache/core.svg) | Core caching module with decorators, strategies, and built-in storages |

### Storage Adapters

| Package                                                    | Version                                                                    | Description                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [@node-ts-cache/redis-storage](./storages/redis)           | ![npm](https://img.shields.io/npm/v/@node-ts-cache/redis-storage.svg)      | Redis storage using `redis` package (v4.x)             |
| [@node-ts-cache/ioredis-storage](./storages/redisio)       | ![npm](https://img.shields.io/npm/v/@node-ts-cache/ioredis-storage.svg)    | Redis storage using `ioredis` with compression support |
| [@node-ts-cache/node-cache-storage](./storages/node-cache) | ![npm](https://img.shields.io/npm/v/@node-ts-cache/node-cache-storage.svg) | In-memory cache using `node-cache`                     |
| [@node-ts-cache/lru-storage](./storages/lru)               | ![npm](https://img.shields.io/npm/v/@node-ts-cache/lru-storage.svg)        | LRU cache with automatic eviction                      |
| [@node-ts-cache/lru-redis-storage](./storages/lru-redis)   | ![npm](https://img.shields.io/npm/v/@node-ts-cache/lru-redis-storage.svg)  | Two-tier caching (local LRU + remote Redis)            |

## Documentation

For detailed documentation, see the [main package README](./ts-cache/README.md).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application                              │
├─────────────────────────────────────────────────────────────────┤
│                    Decorators Layer                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│   │   @Cache    │  │ @SyncCache  │  │    @MultiCache      │    │
│   │   (async)   │  │   (sync)    │  │ (multi-tier/batch)  │    │
│   └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘    │
├──────────┼────────────────┼────────────────────┼────────────────┤
│          └────────────────┼────────────────────┘                │
│                           ▼                                      │
│                  ┌────────────────┐                              │
│                  │    Strategy    │                              │
│                  │ (Expiration)   │                              │
│                  └───────┬────────┘                              │
├──────────────────────────┼──────────────────────────────────────┤
│                          ▼                                       │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                    Storage Layer                          │  │
│   ├──────────┬──────────┬──────────┬──────────┬─────────────┤  │
│   │  Memory  │    FS    │  Redis   │   LRU    │  LRU+Redis  │  │
│   └──────────┴──────────┴──────────┴──────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Choosing a Storage

| Storage                 | Type  | Use Case                     | Features                      |
| ----------------------- | ----- | ---------------------------- | ----------------------------- |
| **MemoryStorage**       | Sync  | Development, small datasets  | Zero config, bundled          |
| **FsJsonStorage**       | Async | Persistent local cache       | File-based, survives restarts |
| **NodeCacheStorage**    | Sync  | Production single-instance   | TTL support, multi-ops        |
| **LRUStorage**          | Sync  | Memory-constrained apps      | Auto-eviction, size limits    |
| **RedisStorage**        | Async | Distributed systems          | Shared cache, redis v4        |
| **RedisIOStorage**      | Async | Distributed systems          | Compression, modern ioredis   |
| **LRUWithRedisStorage** | Async | High-performance distributed | Local + remote tiers          |

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for decorator support)

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Originally created by [hokify](https://github.com/hokify), now maintained by [simllll](https://github.com/simllll).
