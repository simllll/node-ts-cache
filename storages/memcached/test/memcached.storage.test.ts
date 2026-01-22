import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MemcachedStorage } from '../src/index.js';

describe('MemcachedStorage', () => {
	let storage: MemcachedStorage;

	// These tests require a running Memcached instance
	// Skip in CI unless Memcached is available
	const memcachedHost = process.env.MEMCACHED_HOST || 'localhost';
	const memcachedPort = process.env.MEMCACHED_PORT || '11211';

	beforeAll(() => {
		storage = new MemcachedStorage({
			location: `${memcachedHost}:${memcachedPort}`
		});
	}, 10000);

	afterAll(() => {
		if (storage) {
			storage.end();
		}
	}, 10000);

	it('Should return undefined if cache not hit', async () => {
		const item = await storage.getItem('nonexistent-key-' + Date.now());
		expect(item).toBe(undefined);
	});

	it('Should set and get a string value', async () => {
		const key = 'test-string-' + Date.now();
		await storage.setItem(key, 'testValue');
		const result = await storage.getItem<string>(key);
		expect(result).toBe('testValue');
	});

	it('Should set and get an object value', async () => {
		const key = 'test-object-' + Date.now();
		const content = { data: { name: 'test', value: 123 } };
		await storage.setItem(key, content);
		const result = await storage.getItem<typeof content>(key);
		expect(result).toEqual(content);
	});

	it('Should delete cache item if set to undefined', async () => {
		const key = 'test-delete-' + Date.now();
		await storage.setItem(key, 'value');
		await storage.setItem(key, undefined);
		const result = await storage.getItem(key);
		expect(result).toBe(undefined);
	});

	it('Should clear all items', async () => {
		const key = 'test-clear-' + Date.now();
		await storage.setItem(key, 'value');
		await storage.clear();
		const result = await storage.getItem(key);
		expect(result).toBe(undefined);
	});
});
