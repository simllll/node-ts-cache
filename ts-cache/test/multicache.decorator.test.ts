import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiCache, IMultiCacheKeyStrategy } from '../src/decorator/multicache.decorator.js';
import { LRUStorage } from '../../storages/lru/src/LRUStorage.js';

// @ts-ignore
import RedisMock from 'ioredis-mock';
import { RedisIOStorage } from '../../storages/redisio/src/redisio.storage.js';

interface UrlEntry {
	path: string;
	pageType: string;
}

const canonicalKeyStrategy: IMultiCacheKeyStrategy = {
	getKey(
		_className: string,
		_methodName: string,
		parameter: unknown,
		args: unknown[],
		_phase: 'read' | 'write'
	): string {
		const param = parameter as UrlEntry;
		const geoRegion = args[1] as string;
		return `{canonicalurl:${geoRegion.toUpperCase()}}:${param.pageType}:${param.path}:${
			process.env.NODE_ENV || 'local'
		}`;
	}
};

describe('MultiCacheDecorator', () => {
	let lruStorage: LRUStorage;
	let redisStorage: RedisIOStorage;

	beforeEach(async () => {
		lruStorage = new LRUStorage({ max: 500 });
		const MockedRedis = new RedisMock({
			host: 'host',
			port: 123,
			password: 'pass'
		});
		redisStorage = new RedisIOStorage(() => MockedRedis);
		await lruStorage.clear();
		await redisStorage.clear();
	});

	it('Should cache items across multiple storage layers', async () => {
		class TestClass {
			callCount = 0;

			@MultiCache([lruStorage, redisStorage], 0, canonicalKeyStrategy)
			public async getUrls(urls: UrlEntry[], geoRegion: string): Promise<string[]> {
				this.callCount++;
				return urls.map(p => p.path + 'RETURN' + geoRegion);
			}
		}

		const myClass = new TestClass();

		const call1 = await myClass.getUrls(
			[
				{ path: 'elem1', pageType: 'x' },
				{ path: 'elem2', pageType: 'x' }
			],
			'at'
		);

		expect(call1).toEqual(['elem1RETURNat', 'elem2RETURNat']);
		expect(myClass.callCount).toBe(1);

		// Second call should use cache
		const call2 = await myClass.getUrls(
			[
				{ path: 'elem1', pageType: 'x' },
				{ path: 'elem2', pageType: 'x' }
			],
			'at'
		);

		expect(call2).toEqual(['elem1RETURNat', 'elem2RETURNat']);
		expect(myClass.callCount).toBe(1);
	});

	it('Should handle partial cache hits', async () => {
		class TestClass {
			callCount = 0;
			calledWith: UrlEntry[][] = [];

			@MultiCache([lruStorage, redisStorage], 0, canonicalKeyStrategy)
			public async getUrls(urls: UrlEntry[], geoRegion: string): Promise<string[]> {
				this.callCount++;
				this.calledWith.push([...urls]);
				return urls.map(p => p.path + 'RETURN' + geoRegion);
			}
		}

		const myClass = new TestClass();

		// First call with elem1, elem2
		await myClass.getUrls(
			[
				{ path: 'elem1', pageType: 'x' },
				{ path: 'elem2', pageType: 'x' }
			],
			'at'
		);

		expect(myClass.callCount).toBe(1);

		// Second call with elem1, elem2, elem3 - elem1 and elem2 should be cached
		const call2 = await myClass.getUrls(
			[
				{ path: 'elem1', pageType: 'x' },
				{ path: 'elem2', pageType: 'x' },
				{ path: 'elem3', pageType: 'x' }
			],
			'at'
		);

		expect(myClass.callCount).toBe(2);
		// Should only have been called with elem3
		expect(myClass.calledWith[1]).toEqual([{ path: 'elem3', pageType: 'x' }]);
		expect(call2.length).toBe(3);
	});

	it('Should handle different geo regions separately', async () => {
		class TestClass {
			callCount = 0;

			@MultiCache([lruStorage, redisStorage], 0, canonicalKeyStrategy)
			public async getUrls(urls: UrlEntry[], geoRegion: string): Promise<string[]> {
				this.callCount++;
				return urls.map(p => p.path + 'RETURN' + geoRegion);
			}
		}

		const myClass = new TestClass();

		await myClass.getUrls([{ path: 'elem1', pageType: 'x' }], 'at');
		expect(myClass.callCount).toBe(1);

		// Different region should trigger new call
		await myClass.getUrls([{ path: 'elem1', pageType: 'x' }], 'de');
		expect(myClass.callCount).toBe(2);

		// Same region should use cache
		await myClass.getUrls([{ path: 'elem1', pageType: 'x' }], 'at');
		expect(myClass.callCount).toBe(2);
	});

	it('Should throw error when input and output sizes mismatch', async () => {
		class TestClass {
			@MultiCache([lruStorage, redisStorage], 0, canonicalKeyStrategy)
			public async getUrls(urls: UrlEntry[], _geoRegion: string): Promise<string[]> {
				// Intentionally return wrong number of items
				return urls.slice(0, 1).map(p => p.path);
			}
		}

		const myClass = new TestClass();

		await expect(async () => {
			await myClass.getUrls(
				[
					{ path: 'elem1', pageType: 'x' },
					{ path: 'elem2', pageType: 'x' },
					{ path: 'elem3', pageType: 'x' }
				],
				'at'
			);
		}).rejects.toThrow(/input and output has different size/);
	});

	it('Should use default key strategy when none provided', async () => {
		class TestClassDefault {
			callCount = 0;

			@MultiCache([lruStorage])
			public async getItems(ids: number[]): Promise<string[]> {
				this.callCount++;
				return ids.map(id => `item_${id}`);
			}
		}

		const myClass = new TestClassDefault();

		const result1 = await myClass.getItems([1, 2, 3]);
		expect(result1).toEqual(['item_1', 'item_2', 'item_3']);
		expect(myClass.callCount).toBe(1);

		const result2 = await myClass.getItems([1, 2, 3]);
		expect(result2).toEqual(['item_1', 'item_2', 'item_3']);
		expect(myClass.callCount).toBe(1);
	});

	it('Should handle empty input array', async () => {
		class TestClass {
			callCount = 0;

			@MultiCache([lruStorage, redisStorage], 0, canonicalKeyStrategy)
			public async getUrls(urls: UrlEntry[], geoRegion: string): Promise<string[]> {
				this.callCount++;
				return urls.map(p => p.path + 'RETURN' + geoRegion);
			}
		}

		const myClass = new TestClass();

		const result = await myClass.getUrls([], 'at');
		expect(result).toEqual([]);
		expect(myClass.callCount).toBe(0);
	});

	describe('DISABLE_CACHE_DECORATOR environment variable', () => {
		afterEach(() => {
			delete process.env.DISABLE_CACHE_DECORATOR;
		});

		it('Should skip caching when DISABLE_CACHE_DECORATOR is set', async () => {
			process.env.DISABLE_CACHE_DECORATOR = 'true';

			const testLru = new LRUStorage({ max: 500 });

			class TestClass {
				callCount = 0;

				@MultiCache([testLru], 0, canonicalKeyStrategy)
				public async getUrls(urls: UrlEntry[], geoRegion: string): Promise<string[]> {
					this.callCount++;
					return urls.map(p => p.path + 'RETURN' + geoRegion);
				}
			}

			const myClass = new TestClass();

			await myClass.getUrls([{ path: 'elem1', pageType: 'x' }], 'at');
			await myClass.getUrls([{ path: 'elem1', pageType: 'x' }], 'at');
			await myClass.getUrls([{ path: 'elem1', pageType: 'x' }], 'at');

			// Should call method every time when cache is disabled
			expect(myClass.callCount).toBe(3);
		});
	});

	describe('Custom key strategy that returns undefined', () => {
		it('Should not call method when all keys are undefined (no cacheable items)', async () => {
			const undefinedKeyStrategy: IMultiCacheKeyStrategy = {
				getKey(): string | undefined {
					return undefined;
				}
			};

			class TestClass {
				callCount = 0;

				@MultiCache([lruStorage], 0, undefinedKeyStrategy)
				public async getItems(ids: number[]): Promise<string[]> {
					this.callCount++;
					return ids.map(id => `item_${id}`);
				}
			}

			const myClass = new TestClass();

			// When all keys return undefined, the method is not called
			// because there are no "missing" cacheable items to fetch
			const result = await myClass.getItems([1, 2]);
			expect(result).toEqual([]);
			expect(myClass.callCount).toBe(0);
		});

		it('Should handle mixed undefined and valid keys', async () => {
			const mixedKeyStrategy: IMultiCacheKeyStrategy = {
				getKey(
					className: string,
					methodName: string,
					parameter: unknown,
					_args: unknown[],
					_phase: 'read' | 'write'
				): string | undefined {
					// Only return a key for even numbers
					const num = parameter as number;
					if (num % 2 === 0) {
						return `${className}:${methodName}:${num}`;
					}
					return undefined;
				}
			};

			class TestClass {
				callCount = 0;
				calledWith: number[][] = [];

				@MultiCache([lruStorage], 0, mixedKeyStrategy)
				public async getItems(ids: number[]): Promise<string[]> {
					this.callCount++;
					this.calledWith.push([...ids]);
					return ids.map(id => `item_${id}`);
				}
			}

			const myClass = new TestClass();

			// First call with [1, 2, 3, 4]
			// - Keys for 1, 3 return undefined (skipped)
			// - Keys for 2, 4 are cacheable
			const result = await myClass.getItems([1, 2, 3, 4]);

			// Method should be called with only the cacheable items [2, 4]
			expect(myClass.callCount).toBe(1);
			expect(myClass.calledWith[0]).toEqual([2, 4]);
			expect(result).toEqual(['item_2', 'item_4']);
		});
	});

	describe('Different parameter index', () => {
		it('Should use custom parameter index', async () => {
			const simpleKeyStrategy: IMultiCacheKeyStrategy = {
				getKey(
					className: string,
					methodName: string,
					parameter: unknown,
					_args: unknown[],
					_phase: 'read' | 'write'
				): string {
					return `${className}:${methodName}:${JSON.stringify(parameter)}`;
				}
			};

			class TestClass {
				callCount = 0;

				@MultiCache([lruStorage], 1, simpleKeyStrategy)
				public async processData(prefix: string, items: number[]): Promise<string[]> {
					this.callCount++;
					return items.map(item => `${prefix}_${item}`);
				}
			}

			const myClass = new TestClass();

			const result1 = await myClass.processData('test', [1, 2, 3]);
			expect(result1).toEqual(['test_1', 'test_2', 'test_3']);
			expect(myClass.callCount).toBe(1);

			const result2 = await myClass.processData('test', [1, 2, 3]);
			expect(result2).toEqual(['test_1', 'test_2', 'test_3']);
			expect(myClass.callCount).toBe(1);
		});
	});
});
