import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ElasticsearchStorage } from '../src/elasticsearch.storage.js';

// Requires Elasticsearch - use ELASTICSEARCH_NODE env var or defaults to localhost:9200
// In CI: provided by Elasticsearch service container
// Locally: docker run -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:8.12.0
const node = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const indexName = 'node-ts-cache-test';

let storage: ElasticsearchStorage;

describe('ElasticsearchStorage', () => {
	beforeAll(async () => {
		storage = new ElasticsearchStorage({
			indexName,
			clientOptions: { node }
		});
		// Clear any existing test data
		await storage.clear();
	}, 30000);

	afterAll(async () => {
		if (storage) {
			await storage.clear();
			await storage.close();
		}
	}, 10000);

	it('Should clear Elasticsearch index without errors', async () => {
		await storage.clear();
	});

	it('Should return undefined if cache not hit', async () => {
		const item = await storage.getItem('nonexistent-key');
		expect(item).toBe(undefined);
	});

	it('Should set and get a string value', async () => {
		await storage.setItem('testKey', 'testValue');
		const result = await storage.getItem<string>('testKey');
		expect(result).toBe('testValue');
	});

	it('Should set and get an object value', async () => {
		const testObj = { name: 'test', value: 123 };
		await storage.setItem('objectKey', testObj);
		const result = await storage.getItem<typeof testObj>('objectKey');
		expect(result).toEqual(testObj);
	});

	it('Should delete cache item when set to undefined', async () => {
		await storage.setItem('deleteKey', 'value');
		expect(await storage.getItem('deleteKey')).toBe('value');

		await storage.setItem('deleteKey', undefined);
		expect(await storage.getItem('deleteKey')).toBe(undefined);
	});

	it('Should handle numeric values', async () => {
		await storage.setItem('numKey', 42);
		const result = await storage.getItem<number>('numKey');
		expect(result).toBe(42);
	});

	it('Should handle array values', async () => {
		const testArray = [1, 2, 3, 'test'];
		await storage.setItem('arrayKey', testArray);
		const result = await storage.getItem<(number | string)[]>('arrayKey');
		expect(result).toEqual(testArray);
	});

	it('Should handle nested object values', async () => {
		const nested = {
			level1: {
				level2: {
					value: 'deep'
				}
			}
		};
		await storage.setItem('nestedKey', nested);
		const result = await storage.getItem<typeof nested>('nestedKey');
		expect(result).toEqual(nested);
	});

	it('Should clear all items', async () => {
		await storage.setItem('key1', 'value1');
		await storage.setItem('key2', 'value2');

		await storage.clear();

		expect(await storage.getItem('key1')).toBe(undefined);
		expect(await storage.getItem('key2')).toBe(undefined);
	});

	it('Should handle deleting non-existent keys gracefully', async () => {
		// Should not throw
		await storage.setItem('never-existed', undefined);
	});
});
