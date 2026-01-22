# @node-ts-cache/elasticsearch-storage

Elasticsearch storage adapter for [node-ts-cache](https://github.com/simllll/node-ts-cache).

## Installation

```bash
npm install @node-ts-cache/core @node-ts-cache/elasticsearch-storage
```

## Usage

```typescript
import { Cache, ExpirationStrategy } from '@node-ts-cache/core';
import { ElasticsearchStorage } from '@node-ts-cache/elasticsearch-storage';

const elasticsearchCache = new ExpirationStrategy(
	new ElasticsearchStorage({
		indexName: 'my-cache-index',
		clientOptions: {
			node: 'http://localhost:9200'
		}
	})
);

class MyService {
	@Cache(elasticsearchCache, { ttl: 60 })
	async getUsers(): Promise<User[]> {
		// expensive operation
	}
}
```

## Configuration Options

```typescript
interface ElasticsearchStorageOptions {
	/** The index name to use for storing cache entries */
	indexName: string;
	/** Elasticsearch client options */
	clientOptions?: ClientOptions;
	/** Pre-configured Elasticsearch client instance (takes precedence over clientOptions) */
	client?: Client;
}
```

### Using a pre-configured client

If you already have an Elasticsearch client instance configured (e.g., with authentication), you can pass it directly:

```typescript
import { Client } from '@elastic/elasticsearch';
import { ElasticsearchStorage } from '@node-ts-cache/elasticsearch-storage';

const client = new Client({
	node: 'https://my-elasticsearch-cluster.com',
	auth: {
		apiKey: 'your-api-key'
	}
});

const storage = new ElasticsearchStorage({
	indexName: 'my-cache',
	client
});
```

## Running Tests Locally

Start Elasticsearch using Docker:

```bash
docker run -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:8.12.0
```

Then run the tests:

```bash
npm test
```

## License

MIT
