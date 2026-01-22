import { describe, it, expect } from 'vitest';
import RedisIOStorage from '../src/index.js';

// @ts-expect-error - no types for ioredis-mock
import RedisMock from 'ioredis-mock';

const MockedRedis = new RedisMock({
	host: 'host',
	port: 123,
	password: 'pass'
});

const storage = new RedisIOStorage(() => MockedRedis);

describe('RedisIOStorage', () => {
	it('Should clear Redis without errors', async () => {
		await storage.clear();
	});

	describe('undefined handled correctly', () => {
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

	describe('uncompressed', () => {
		it('Should set and retrieve item correclty', async () => {
			await storage.setItem('test', { asdf: 2 });

			expect(await MockedRedis.get('test')).toEqual(JSON.stringify({ asdf: 2 }));

			expect(await storage.getItem('test')).toEqual({ asdf: 2 });
		});

		it('Mutli Should set and retrieve item correclty', async () => {
			await storage.setItems<{ asdf: number } | string>([
				{ key: 'test', content: { asdf: 2 } },
				{ key: 'test2', content: '2' }
			]);

			expect(await MockedRedis.get('test')).toEqual(JSON.stringify({ asdf: 2 }));
			expect(await MockedRedis.get('test2')).toEqual(JSON.stringify('2'));

			expect(await storage.getItem('test')).toEqual({ asdf: 2 });
			expect(await storage.getItem('test2')).toEqual('2');
		});
	});
});
