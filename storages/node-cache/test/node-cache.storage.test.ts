import { describe, it, expect } from 'vitest';
import NodeCacheStorage from '../src/index.js';

const storage = new NodeCacheStorage({});

describe('NodeCacheStorage', () => {
	it('Should add cache item correctly', async () => {
		const content = { data: { name: 'deep' } };
		const key = 'test';

		await storage.setItem(key, content);
		expect(await storage.getItem(key)).toEqual(content);
	});

	it('Should clear without errors', async () => {
		await storage.clear();
	});

	it('Should delete cache item if set to undefined', async () => {
		await storage.setItem('test', undefined);

		expect(await storage.getItem('test')).toBe(undefined);
	});

	it('Should return undefined if cache not hit', async () => {
		await storage.clear();
		const item = await storage.getItem('item123');

		expect(item).toBe(undefined);
	});
});
