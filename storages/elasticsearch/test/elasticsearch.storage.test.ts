import { describe, it, expect, beforeEach } from 'vitest';
import { ElasticsearchStorage } from '../src/elasticsearch.storage.js';

// Mock Elasticsearch client for testing
class MockElasticsearchClient {
	private store: Map<string, unknown> = new Map();

	async get({ index, id }: { index: string; id: string }) {
		const key = `${index}:${id}`;
		if (!this.store.has(key)) {
			const error = new Error('Not found');
			(error as Error & { meta?: { statusCode: number } }).meta = { statusCode: 404 };
			throw error;
		}
		return { _source: this.store.get(key) };
	}

	async index({
		index,
		id,
		document
	}: {
		index: string;
		id: string;
		refresh?: string;
		document: unknown;
	}) {
		const key = `${index}:${id}`;
		this.store.set(key, document);
		return { result: 'created' };
	}

	async delete({ index, id }: { index: string; id: string; refresh?: string }) {
		const key = `${index}:${id}`;
		if (!this.store.has(key)) {
			const error = new Error('Not found');
			(error as Error & { meta?: { statusCode: number } }).meta = { statusCode: 404 };
			throw error;
		}
		this.store.delete(key);
		return { result: 'deleted' };
	}

	indices = {
		delete: async () => {
			this.store.clear();
			return { acknowledged: true };
		}
	};

	async close() {
		// no-op
	}
}

describe('ElasticsearchStorage', () => {
	let storage: ElasticsearchStorage;
	let mockClient: MockElasticsearchClient;

	beforeEach(() => {
		mockClient = new MockElasticsearchClient();
		storage = new ElasticsearchStorage({
			indexName: 'test-index',
			client: mockClient as unknown as import('@elastic/elasticsearch').Client
		});
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
