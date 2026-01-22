import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisStorage } from '../src/redis.storage.js';

// Requires Redis - use REDIS_HOST/REDIS_PORT env vars or defaults to localhost:6379
// In CI: provided by Redis service container
// Locally: docker run -p 6379:6379 redis:7
const host = process.env.REDIS_HOST || 'localhost';
const port = Number(process.env.REDIS_PORT) || 6379;

let storage: RedisStorage;

describe('RedisStorage', () => {
	beforeAll(async () => {
		storage = new RedisStorage({
			socket: { host, port }
		});
	}, 10000);

	afterAll(async () => {
		if (storage) await storage.disconnect();
	}, 10000);

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
