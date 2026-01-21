# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **node-ts-cache**, a TypeScript/Node.js caching library featuring:

- Decorator-based caching (@Cache, @SyncCache, @MultiCache)
- Multiple storage backends (Memory, File System, Redis, LRU, etc.)
- Flexible expiration strategies (TTL-based with lazy/eager invalidation)

It's a monorepo using Lerna with independent versioning.

## Common Commands

### Building

```bash
npm run build          # Build all packages
```

### Testing

```bash
npm test               # Run all tests across all packages
```

### Linting and Type Checking

```bash
npm run lint           # Run ESLint on all source files
npm run lint:fix       # Run ESLint with auto-fix
```

### Formatting

```bash
npm run format         # Check formatting with Prettier
npm run format:fix     # Fix formatting with Prettier
```

## Before Committing

Always run these checks before committing:

1. `npm run lint` - Ensure no linting errors
2. `npm run format` - Ensure code is properly formatted
3. `npm test` - Ensure all tests pass
4. `npm run build` - Ensure the project builds successfully

## Project Structure

```
├── ts-cache/              # Core caching package (@node-ts-cache/core)
│   ├── src/
│   │   ├── decorator/     # @Cache, @SyncCache, @MultiCache decorators
│   │   ├── storage/       # MemoryStorage, FsJsonStorage
│   │   ├── strategy/      # ExpirationStrategy, key strategies
│   │   └── types/         # TypeScript interfaces
│   └── test/              # Test files
├── storages/              # Storage adapter packages
│   ├── lru/               # LRU cache storage
│   ├── redis/             # Redis storage (redis package v3.x)
│   ├── redisio/           # Redis storage (ioredis with compression)
│   ├── node-cache/        # node-cache storage
│   └── lru-redis/         # Two-tier LRU + Redis storage
```

## Testing Framework

- Uses Mocha with ts-node ESM loader
- Tests use Node's built-in `assert` module
- Mock Redis instances using `redis-mock` and `ioredis-mock`
