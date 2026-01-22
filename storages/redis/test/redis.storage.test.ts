import { describe, it, expect, beforeEach } from 'vitest';
import { RedisStorage } from '../src/redis.storage.js';
import type { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

// Mock Redis client for testing
class MockRedisClient {
	private store: Map<string, string> = new Map();

	async get(key: string): Promise<string | null> {
		return this.store.get(key) ?? null;
	}

	async set(key: string, value: string): Promise<'OK'> {
		this.store.set(key, value);
		return 'OK';
	}

	async del(key: string): Promise<number> {
		this.store.delete(key);
		return 1;
	}

	async flushDb(): Promise<'OK'> {
		this.store.clear();
		return 'OK';
	}

	async quit(): Promise<'OK'> {
		return 'OK';
	}
}

describe('RedisStorage', () => {
	let storage: RedisStorage;
	let mockClient: MockRedisClient;

	beforeEach(() => {
		mockClient = new MockRedisClient();
		storage = new RedisStorage({
			client: mockClient as unknown as RedisClient
		});
	});

	it('Should clear Redis without errors', async () => {
		await storage.clear();
	});

	it('Should return undefined if cache not hit', async () => {
		const item = await storage.getItem('item123');
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

	it('Should clear all items', async () => {
		await storage.setItem('key1', 'value1');
		await storage.setItem('key2', 'value2');

		await storage.clear();

		expect(await storage.getItem('key1')).toBe(undefined);
		expect(await storage.getItem('key2')).toBe(undefined);
	});
});
