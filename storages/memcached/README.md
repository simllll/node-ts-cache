# @node-ts-cache/memcached-storage

Memcached storage adapter for [node-ts-cache](https://github.com/simllll/node-ts-cache).

## Installation

```bash
npm install @node-ts-cache/core @node-ts-cache/memcached-storage
```

## Usage

```typescript
import { Cache, ExpirationStrategy } from '@node-ts-cache/core';
import { MemcachedStorage } from '@node-ts-cache/memcached-storage';

const memcachedCache = new ExpirationStrategy(
	new MemcachedStorage({
		location: 'localhost:11211'
	})
);

class MyService {
	@Cache(memcachedCache, { ttl: 60 })
	async getUsers(): Promise<User[]> {
		// expensive operation
	}
}
```

## Configuration Options

```typescript
interface MemcachedStorageOptions {
	/** Memcached server location(s) - e.g., 'localhost:11211' or ['server1:11211', 'server2:11211'] */
	location: Memcached.Location;
	/** Memcached client options */
	options?: Memcached.options;
}
```

### Multiple Servers (Distributed)

Memcached supports distributed caching across multiple servers:

```typescript
import { MemcachedStorage } from '@node-ts-cache/memcached-storage';

const storage = new MemcachedStorage({
	location: ['server1:11211', 'server2:11211', 'server3:11211'],
	options: {
		retries: 3,
		timeout: 5000,
		poolSize: 10
	}
});
```

### Available Options

The `options` parameter accepts all standard [memcached](https://www.npmjs.com/package/memcached) options:

- `maxKeySize` - Maximum key size (default: 250)
- `maxValue` - Maximum value size (default: 1048576)
- `poolSize` - Connection pool size (default: 10)
- `retries` - Number of retries for failed operations (default: 5)
- `timeout` - Operation timeout in milliseconds (default: 5000)
- `idle` - Idle timeout for connections (default: 5000)

## Running Tests Locally

Start Memcached using Docker:

```bash
docker run -p 11211:11211 memcached:latest
```

Then run the tests:

```bash
npm test
```

## License

MIT
