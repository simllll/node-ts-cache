# @node-ts-cache/valkey-storage

Valkey storage adapter for [node-ts-cache](https://github.com/simllll/node-ts-cache).

[Valkey](https://valkey.io/) is an open-source, Redis-compatible in-memory data store that emerged as a community-driven fork after Redis changed its license.

## Installation

```bash
npm install @node-ts-cache/core @node-ts-cache/valkey-storage
```

## Usage

```typescript
import { Cache, ExpirationStrategy } from '@node-ts-cache/core';
import { ValkeyStorage } from '@node-ts-cache/valkey-storage';
import Valkey from 'iovalkey';

const valkeyClient = new Valkey({
	host: 'localhost',
	port: 6379
});

const valkeyCache = new ExpirationStrategy(new ValkeyStorage(() => valkeyClient, { maxAge: 3600 }));

class MyService {
	@Cache(valkeyCache, { ttl: 60 })
	async getUsers(): Promise<User[]> {
		// expensive operation
	}
}
```

## Configuration Options

```typescript
new ValkeyStorage(
	valkeyFactory: () => Valkey,
	options?: {
		maxAge: number;  // TTL in seconds (default: 86400 = 1 day)
	}
)
```

### Constructor Parameters

| Parameter        | Type           | Description                                        |
| ---------------- | -------------- | -------------------------------------------------- |
| `valkeyFactory`  | `() => Valkey` | Factory function returning a Valkey client         |
| `options`        | `object`       | Configuration options                              |
| `options.maxAge` | `number`       | Default TTL in seconds (default: 86400 = 24 hours) |

### Error Handling

You can attach an error handler for non-blocking write operations:

```typescript
const storage = new ValkeyStorage(() => valkeyClient, { maxAge: 3600 });

storage.onError(error => {
	console.error('Valkey error:', error);
	// Log to monitoring service, etc.
});
```

### Batch Operations

ValkeyStorage supports efficient batch operations:

```typescript
// Get multiple items
const items = await storage.getItems<User>(['user:1', 'user:2', 'user:3']);

// Set multiple items
await storage.setItems([
	{ key: 'user:1', content: user1 },
	{ key: 'user:2', content: user2 }
]);
```

## Running Tests Locally

Start Valkey using Docker:

```bash
docker run -p 6379:6379 valkey/valkey:latest
```

Then run the tests:

```bash
npm test
```

## Why Valkey?

- **Open Source**: Valkey is BSD-3 licensed, ensuring it remains truly open source
- **Redis Compatible**: Drop-in replacement for Redis with full protocol compatibility
- **Community Driven**: Backed by Linux Foundation with contributions from AWS, Google, Oracle, and more
- **Active Development**: Regular releases with new features and improvements

## License

MIT
