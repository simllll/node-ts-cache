import { describe, it, expect, beforeEach } from 'vitest';
import { MemcachedStorage } from '../src/index.js';
import type Memcached from 'memcached';

// Mock Memcached client for testing
class MockMemcached {
	private store: Map<string, string> = new Map();

	get(key: string, callback: (err: Error | undefined, data: string | undefined) => void): void {
		const data = this.store.get(key);
		callback(undefined, data);
	}

	set(key: string, value: string, _ttl: number, callback: (err: Error | undefined) => void): void {
		this.store.set(key, value);
		callback(undefined);
	}

	del(key: string, callback: (err: Error | undefined) => void): void {
		this.store.delete(key);
		callback(undefined);
	}

	flush(callback: (err: Error | undefined) => void): void {
		this.store.clear();
		callback(undefined);
	}

	end(): void {
		// no-op
	}
}

describe('MemcachedStorage', () => {
	let storage: MemcachedStorage;
	let mockClient: MockMemcached;

	beforeEach(() => {
		mockClient = new MockMemcached();
		storage = new MemcachedStorage({
			location: 'mock:11211',
			client: mockClient as unknown as Memcached
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
		const content = { data: { name: 'test', value: 123 } };
		await storage.setItem('objectKey', content);
		const result = await storage.getItem<typeof content>('objectKey');
		expect(result).toEqual(content);
	});

	it('Should delete cache item if set to undefined', async () => {
		await storage.setItem('deleteKey', 'value');
		await storage.setItem('deleteKey', undefined);
		const result = await storage.getItem('deleteKey');
		expect(result).toBe(undefined);
	});

	it('Should clear all items', async () => {
		await storage.setItem('key1', 'value1');
		await storage.setItem('key2', 'value2');
		await storage.clear();
		expect(await storage.getItem('key1')).toBe(undefined);
		expect(await storage.getItem('key2')).toBe(undefined);
	});
});
