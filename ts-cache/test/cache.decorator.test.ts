import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Cache, ExpirationStrategy, ISyncKeyStrategy } from '../src/index.js';
import { MemoryStorage } from '../src/storage/memory/index.js';
import { IAsyncKeyStrategy } from '../src/types/key.strategy.types.js';

const storage = new MemoryStorage();
const strategy = new ExpirationStrategy(storage);
const data = ['user', 'max', 'test'];

class TestClassOne {
	callCount = 0;

	@Cache(storage, {}) // beware, no expirationstrategy used, therefore this is never ttled because memory storage cannot do this by its own
	public storageUser(): string[] {
		return data;
	}

	@Cache(strategy, { ttl: 1000 })
	public getUsers(): string[] {
		this.callCount++;
		return data;
	}

	@Cache(strategy, { ttl: 1000 })
	public getUsersPromise(): Promise<string[]> {
		return Promise.resolve(data);
	}

	@Cache(strategy, { ttl: 1000 })
	public getUndefinedValue(): Promise<undefined> {
		this.callCount++;
		return Promise.resolve(undefined);
	}

	@Cache(strategy, { ttl: 1000 })
	public getFalseValue(): Promise<boolean> {
		this.callCount++;
		return Promise.resolve(false);
	}

	@Cache(strategy, { ttl: 1000 })
	public getNullValue(): Promise<null> {
		this.callCount++;
		return Promise.resolve(null);
	}
}

class TestClassTwo {
	@Cache(strategy, { ttl: 20000 })
	public async getUsers(): Promise<string[]> {
		return new Promise<string[]>(resolve => {
			setTimeout(() => resolve(data), 0);
		});
	}

	public async throwErrorPlain(): Promise<string[]> {
		throw new Error('stacktrace?');
	}

	@Cache(strategy, { ttl: 20000 })
	public async throwError(): Promise<string[]> {
		throw new Error('stacktrace?');
	}

	@Cache(
		strategy,
		{ ttl: 20000 },
		{
			getKey(): string | undefined {
				return undefined; // no cache
			}
		}
	)
	public async throwErrorNoCache(): Promise<string[]> {
		throw new Error('stacktrace?');
	}
}

class CustomJsonStrategy implements ISyncKeyStrategy {
	public getKey(className: string, methodName: string, args: unknown[]): string {
		return `${className}:${methodName}:${JSON.stringify(args)}:foo`;
	}
}

/**
 * This custom test key strategy only uses the method name as caching key
 */
class CustomKeyStrategy implements IAsyncKeyStrategy {
	public getKey(
		_className: string,
		methodName: string,
		_args: unknown[]
	): Promise<string> | string {
		return new Promise(resolve => {
			setTimeout(() => resolve(methodName), 0);
		});
	}
}

class TestClassThree {
	@Cache(strategy, { ttl: 1000 }, new CustomJsonStrategy())
	public getUsers(): string[] {
		return data;
	}

	@Cache(strategy, { ttl: 1000 }, new CustomJsonStrategy())
	public getUsersPromise(): Promise<string[]> {
		return Promise.resolve(data);
	}
}

class TestClassFour {
	@Cache(strategy, { ttl: 500 }, new CustomKeyStrategy())
	public getUsersPromise(): Promise<string[]> {
		return Promise.resolve(data);
	}
}

describe('CacheDecorator', () => {
	beforeEach(async () => {
		await strategy.clear();
	});

	it('Should decorate function with ExpirationStrategy correctly', async () => {
		const myClass = new TestClassOne();
		await myClass.getUsersPromise();
	});

	it('Should cache function call correctly', async () => {
		const myClass = new TestClassOne();

		const users = await myClass.getUsers();

		expect(users).toBe(data);
		expect(await strategy.getItem<string[]>('TestClassOne:getUsers:[]')).toBe(data);
	});

	it('Should cache function call correctly via storage', async () => {
		const myClass = new TestClassOne();

		const users = await myClass.storageUser();

		expect(users).toBe(data);
		expect(await storage.getItem<string[]>('TestClassOne:storageUser:[]')).toBe(data);
	});

	it('Should prevent calling same method several times', async () => {
		const myClass = new TestClassOne();

		await Promise.all([myClass.getUsers(), myClass.getUsers(), myClass.getUsers()]);

		expect(myClass.callCount).toBe(1);

		await Promise.all([myClass.getUsers(), myClass.getUsers(), myClass.getUsers()]);

		expect(myClass.callCount).toBe(1);
	});

	it('Check if undefined return values is NOT cached', async () => {
		const myClass = new TestClassOne();

		await myClass.getUndefinedValue();

		expect(myClass.callCount).toBe(1);

		await myClass.getUndefinedValue();

		expect(myClass.callCount).toBe(2);
	});

	it('Check if false return values is cached', async () => {
		const myClass = new TestClassOne();

		await Promise.all([myClass.getFalseValue(), myClass.getFalseValue(), myClass.getFalseValue()]);

		expect(myClass.callCount).toBe(1);

		await Promise.all([myClass.getFalseValue(), myClass.getFalseValue(), myClass.getFalseValue()]);

		expect(myClass.callCount).toBe(1);
	});

	it('Check if null return values is also cached', async () => {
		const myClass = new TestClassOne();

		await Promise.all([myClass.getNullValue(), myClass.getNullValue(), myClass.getNullValue()]);

		expect(myClass.callCount).toBe(1);

		await Promise.all([myClass.getNullValue(), myClass.getNullValue(), myClass.getNullValue()]);

		expect(myClass.callCount).toBe(1);
	});

	it('Should cache Promise response correctly', async () => {
		const myClass = new TestClassOne();

		await myClass.getUsersPromise().then(async response => {
			expect(response).toBe(data);
			expect(await strategy.getItem<string[]>('TestClassOne:getUsersPromise:[]')).toBe(data);
		});
	});

	it('Should cache async response correctly', async () => {
		const myClass = new TestClassTwo();

		const users = await myClass.getUsers();
		expect(users).toBe(data);
		expect(await strategy.getItem<string[]>('TestClassTwo:getUsers:[]')).toBe(data);
	});

	it('Should have valid stacktrace', async () => {
		const myClass = new TestClassTwo();

		try {
			await myClass.throwError();
		} catch (err: unknown) {
			console.log((err as Error).stack);
		}
	});

	it('Should have valid stacktrace - no cache', async () => {
		const myClass = new TestClassTwo();

		try {
			await myClass.throwErrorNoCache();
		} catch (err: unknown) {
			console.log((err as Error).stack);
		}
	});

	it('Should have valid stacktrace - plain', async () => {
		const myClass = new TestClassTwo();

		try {
			await myClass.throwErrorPlain();
		} catch (err: unknown) {
			console.log((err as Error).stack);
		}
	});

	it('Should cache function call correctly (custom key strategy)', async () => {
		const myClass = new TestClassThree();

		const users = await myClass.getUsers();

		expect(users).toBe(data);
		expect(await strategy.getItem<string[]>('TestClassThree:getUsers:[]:foo')).toBe(data);
	});

	it('Should cache Promise response correctly (custom key strategy)', async () => {
		const myClass = new TestClassThree();

		await myClass.getUsersPromise().then(async response => {
			expect(response).toBe(data);
			expect(await strategy.getItem<string[]>('TestClassThree:getUsersPromise:[]:foo')).toBe(data);
		});
	});

	it('Should cache users with async custom key strategy correctly', async () => {
		const myClass = new TestClassFour();

		await myClass.getUsersPromise().then(async response => {
			expect(response).toBe(data);
			expect(await strategy.getItem<string[]>('getUsersPromise')).toBe(data);
		});
	});

	describe('DISABLE_CACHE_DECORATOR environment variable', () => {
		afterEach(() => {
			delete process.env.DISABLE_CACHE_DECORATOR;
		});

		it('Should skip caching when DISABLE_CACHE_DECORATOR is set', async () => {
			process.env.DISABLE_CACHE_DECORATOR = 'true';

			const disableStorage = new MemoryStorage();
			const disableStrategy = new ExpirationStrategy(disableStorage);

			class TestClassDisabled {
				callCount = 0;

				@Cache(disableStrategy, { ttl: 1000 })
				public getUsers(): string[] {
					this.callCount++;
					return data;
				}
			}

			const myClass = new TestClassDisabled();

			await myClass.getUsers();
			await myClass.getUsers();
			await myClass.getUsers();

			// Method should be called every time when cache is disabled
			expect(myClass.callCount).toBe(3);
		});

		it('Should work normally when DISABLE_CACHE_DECORATOR is not set', async () => {
			delete process.env.DISABLE_CACHE_DECORATOR;

			const normalStorage = new MemoryStorage();
			const normalStrategy = new ExpirationStrategy(normalStorage);

			class TestClassNormal {
				callCount = 0;

				@Cache(normalStrategy, { ttl: 1000 })
				public getUsers(): string[] {
					this.callCount++;
					return data;
				}
			}

			const myClass = new TestClassNormal();

			await myClass.getUsers();
			await myClass.getUsers();
			await myClass.getUsers();

			// Method should be called only once when caching is enabled
			expect(myClass.callCount).toBe(1);
		});
	});

	describe('Cache error handling', () => {
		it('Should handle cache read errors gracefully', async () => {
			const failingStorage = {
				getItem: () => {
					throw new Error('Read error');
				},
				setItem: async () => {},
				clear: async () => {}
			};
			const failStrategy = new ExpirationStrategy(failingStorage as unknown as MemoryStorage);

			class TestClassReadFail {
				callCount = 0;

				@Cache(failStrategy, { ttl: 1000 })
				public getUsers(): string[] {
					this.callCount++;
					return data;
				}
			}

			const myClass = new TestClassReadFail();

			// Should not throw, just log warning and continue
			const result = await myClass.getUsers();
			expect(result).toEqual(data);
		});

		it('Should handle cache write errors gracefully', async () => {
			const failingStorage = {
				getItem: async () => undefined,
				setItem: async () => {
					throw new Error('Write error');
				},
				clear: async () => {}
			};
			const failStrategy = new ExpirationStrategy(failingStorage as unknown as MemoryStorage);

			class TestClassWriteFail {
				callCount = 0;

				@Cache(failStrategy, { ttl: 1000 })
				public getUsers(): string[] {
					this.callCount++;
					return data;
				}
			}

			const myClass = new TestClassWriteFail();

			// Should not throw, just log warning and continue
			const result = await myClass.getUsers();
			expect(result).toEqual(data);
		});
	});

	describe('Different argument types', () => {
		const argStorage = new MemoryStorage();
		const argStrategy = new ExpirationStrategy(argStorage);

		beforeEach(async () => {
			await argStrategy.clear();
		});

		class TestClassArgs {
			callCount = 0;

			@Cache(argStrategy, { ttl: 1000 })
			public getWithArgs(...args: unknown[]): unknown[] {
				this.callCount++;
				return args;
			}
		}

		it('Should cache with object arguments', async () => {
			const myClass = new TestClassArgs();
			const arg = { id: 1, name: 'test' };

			await myClass.getWithArgs(arg);
			await myClass.getWithArgs(arg);

			expect(myClass.callCount).toBe(1);
		});

		it('Should cache with array arguments', async () => {
			const myClass = new TestClassArgs();
			const arg = [1, 2, 3];

			await myClass.getWithArgs(arg);
			await myClass.getWithArgs(arg);

			expect(myClass.callCount).toBe(1);
		});

		it('Should differentiate between different arguments', async () => {
			const myClass = new TestClassArgs();

			await myClass.getWithArgs(1);
			await myClass.getWithArgs(2);
			await myClass.getWithArgs(3);

			expect(myClass.callCount).toBe(3);
		});

		it('Should cache with multiple arguments', async () => {
			const myClass = new TestClassArgs();

			await myClass.getWithArgs('a', 1, true);
			await myClass.getWithArgs('a', 1, true);

			expect(myClass.callCount).toBe(1);
		});
	});

	describe('Error propagation', () => {
		it('Should propagate errors from decorated method', async () => {
			const errorStorage = new MemoryStorage();
			const errorStrategy = new ExpirationStrategy(errorStorage);

			class TestClassError {
				@Cache(errorStrategy, { ttl: 1000 })
				public async throwingMethod(): Promise<string> {
					throw new Error('Test error');
				}
			}

			const myClass = new TestClassError();

			await expect(myClass.throwingMethod()).rejects.toThrow('Test error');
		});

		it('Should not cache failed method calls', async () => {
			const errorStorage = new MemoryStorage();
			const errorStrategy = new ExpirationStrategy(errorStorage);

			class TestClassErrorCount {
				callCount = 0;

				@Cache(errorStrategy, { ttl: 1000 })
				public async throwingMethod(): Promise<string> {
					this.callCount++;
					throw new Error('Test error');
				}
			}

			const myClass = new TestClassErrorCount();

			try {
				await myClass.throwingMethod();
			} catch {
				// Expected
			}

			try {
				await myClass.throwingMethod();
			} catch {
				// Expected
			}

			// Each call should execute since errors are not cached
			expect(myClass.callCount).toBe(2);
		});
	});
});
