import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ValkeyStorage } from '../src/valkey.storage.js';
import RedisMock from 'ioredis-mock';

describe('ValkeyStorage', () => {
	let storage: ValkeyStorage;
	let mockClient: RedisMock;

	beforeAll(async () => {
		// Use ioredis-mock since iovalkey is API-compatible with ioredis
		mockClient = new RedisMock();
		storage = new ValkeyStorage(
			() => mockClient as unknown as ReturnType<typeof import('iovalkey').default>,
			{
				maxAge: 3600
			}
		);
	}, 10000);

	afterAll(async () => {
		if (mockClient) {
			mockClient.disconnect();
		}
	}, 10000);

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
		const testObject = { name: 'test', value: 123 };
		await storage.setItem('objectKey', testObject);
		const result = await storage.getItem<typeof testObject>('objectKey');
		expect(result).toEqual(testObject);
	});

	it('Should delete cache item when set to undefined', async () => {
		await storage.setItem('deleteKey', 'toDelete');
		await storage.setItem('deleteKey', undefined);
		const result = await storage.getItem('deleteKey');
		expect(result).toBe(undefined);
	});

	it('Should get multiple items', async () => {
		await storage.setItem('multi1', 'value1');
		await storage.setItem('multi2', 'value2');
		const results = await storage.getItems<string>(['multi1', 'multi2', 'nonexistent']);
		expect(results['multi1']).toBe('value1');
		expect(results['multi2']).toBe('value2');
		expect(results['nonexistent']).toBe(undefined);
	});

	it('Should set multiple items', async () => {
		await storage.setItems([
			{ key: 'batch1', content: 'batchValue1' },
			{ key: 'batch2', content: 'batchValue2' }
		]);
		const result1 = await storage.getItem<string>('batch1');
		const result2 = await storage.getItem<string>('batch2');
		expect(result1).toBe('batchValue1');
		expect(result2).toBe('batchValue2');
	});

	it('Should clear all items', async () => {
		await storage.setItem('clearKey', 'clearValue');
		await storage.clear();
		const result = await storage.getItem('clearKey');
		expect(result).toBe(undefined);
	});
});
