import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisMemoryServer } from 'redis-memory-server';
import { RedisStorage } from '../src/redis.storage.js';

let redisServer: RedisMemoryServer;
let storage: RedisStorage;

describe('RedisStorage', () => {
	beforeAll(async () => {
		redisServer = new RedisMemoryServer();
		const host = await redisServer.getHost();
		const port = await redisServer.getPort();
		storage = new RedisStorage({
			socket: {
				host,
				port
			}
		});
	}, 30000); // redis-memory-server may need time to download/start

	afterAll(async () => {
		if (storage) await storage.disconnect();
		if (redisServer) await redisServer.stop();
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
		expect(result).toBe(42); // Numbers are parsed back from string
	});

	it('Should clear all items', async () => {
		await storage.setItem('key1', 'value1');
		await storage.setItem('key2', 'value2');

		await storage.clear();

		expect(await storage.getItem('key1')).toBe(undefined);
		expect(await storage.getItem('key2')).toBe(undefined);
	});
});
