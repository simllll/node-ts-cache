import { describe, it, expect, beforeEach } from 'vitest';
import { SyncCache } from '../src/index.js';
import { MemoryStorage } from '../src/storage/memory/index.js';
import { ISyncKeyStrategy } from '../src/types/key.strategy.types.js';

const storage = new MemoryStorage();
const data = ['user', 'max', 'test'];

class TestClassOne {
	callCount = 0;

	@SyncCache(storage, { ttl: 1000 })
	public getUsers(): string[] {
		this.callCount++;
		return data;
	}

	@SyncCache(storage, { ttl: 1000 })
	public getUsersWithArgs(id: number): string[] {
		this.callCount++;
		return [...data, `id:${id}`];
	}

	@SyncCache(storage, { ttl: 1000 })
	public getNullValue(): null {
		this.callCount++;
		return null;
	}

	@SyncCache(storage, { ttl: 1000 })
	public getFalseValue(): boolean {
		this.callCount++;
		return false;
	}

	@SyncCache(storage, { ttl: 1000 })
	public getUndefinedValue(): undefined {
		this.callCount++;
		return undefined;
	}
}

class TestClassWithAsync {
	@SyncCache(storage, { ttl: 1000 })
	public getAsyncUsers(): Promise<string[]> {
		return Promise.resolve(data);
	}
}

/**
 * Custom key strategy that returns undefined to skip caching
 */
class NoCacheKeyStrategy implements ISyncKeyStrategy {
	public getKey(_className: string, _methodName: string, _args: unknown[]): string | undefined {
		return undefined;
	}
}

class TestClassTwo {
	callCount = 0;

	@SyncCache(storage, { ttl: 1000 }, new NoCacheKeyStrategy())
	public getUsers(): string[] {
		this.callCount++;
		return data;
	}
}

/**
 * Custom key strategy with custom format
 */
class CustomKeyStrategy implements ISyncKeyStrategy {
	public getKey(className: string, methodName: string, args: unknown[]): string {
		return `custom:${className}:${methodName}:${JSON.stringify(args)}`;
	}
}

class TestClassThree {
	callCount = 0;

	@SyncCache(storage, { ttl: 1000 }, new CustomKeyStrategy())
	public getUsers(): string[] {
		this.callCount++;
		return data;
	}
}

/**
 * Test class with a storage that throws errors
 */
class FailingStorage {
	private shouldFail = true;

	public getItem<T>(_key: string): T | undefined {
		if (this.shouldFail) {
			throw new Error('Read error');
		}
		return undefined;
	}

	public setItem<T = unknown>(_key: string, _content: T | undefined): void {
		if (this.shouldFail) {
			throw new Error('Write error');
		}
	}

	public clear(): void {
		// noop
	}

	public stopFailing(): void {
		this.shouldFail = false;
	}
}

const failingStorage = new FailingStorage();

class TestClassWithFailingStorage {
	callCount = 0;

	@SyncCache(failingStorage as unknown as MemoryStorage, { ttl: 1000 })
	public getUsers(): string[] {
		this.callCount++;
		return data;
	}
}

describe('SyncCacheDecorator', () => {
	beforeEach(() => {
		storage.clear();
	});

	it('Should cache synchronous function call correctly', () => {
		const myClass = new TestClassOne();

		const users = myClass.getUsers();

		expect(data).toBe(users);
		expect(storage.getItem<string[]>('TestClassOne:getUsers:[]')).toBe(data);
	});

	it('Should return cached value on subsequent calls', () => {
		const myClass = new TestClassOne();

		myClass.getUsers();
		myClass.getUsers();
		myClass.getUsers();

		expect(myClass.callCount).toBe(1);
	});

	it('Should cache with different arguments separately', () => {
		const myClass = new TestClassOne();

		const users1 = myClass.getUsersWithArgs(1);
		const users2 = myClass.getUsersWithArgs(2);
		const users1Again = myClass.getUsersWithArgs(1);

		expect(users1).toEqual([...data, 'id:1']);
		expect(users2).toEqual([...data, 'id:2']);
		expect(users1).toBe(users1Again);
		expect(myClass.callCount).toBe(2);
	});

	it('Should cache null values', () => {
		const myClass = new TestClassOne();

		myClass.getNullValue();
		myClass.getNullValue();
		myClass.getNullValue();

		expect(myClass.callCount).toBe(1);
	});

	it('Should cache false values', () => {
		const myClass = new TestClassOne();

		myClass.getFalseValue();
		myClass.getFalseValue();
		myClass.getFalseValue();

		expect(myClass.callCount).toBe(1);
	});

	it('Should NOT cache undefined values', () => {
		const myClass = new TestClassOne();

		myClass.getUndefinedValue();
		myClass.getUndefinedValue();
		myClass.getUndefinedValue();

		expect(myClass.callCount).toBe(3);
	});

	it('Should throw error when async function is detected', () => {
		const myClass = new TestClassWithAsync();

		expect(() => {
			myClass.getAsyncUsers();
		}).toThrow(/async function detected, use @Cache instead/);
	});

	it('Should skip caching when key strategy returns undefined', () => {
		const myClass = new TestClassTwo();

		myClass.getUsers();
		myClass.getUsers();
		myClass.getUsers();

		expect(myClass.callCount).toBe(3);
	});

	it('Should use custom key strategy', () => {
		const myClass = new TestClassThree();

		myClass.getUsers();

		expect(storage.getItem<string[]>('custom:TestClassThree:getUsers:[]')).toBe(data);
	});

	it('Should handle cache read errors gracefully', () => {
		const myClass = new TestClassWithFailingStorage();

		// Should not throw, just log warning and continue
		const result = myClass.getUsers();
		expect(result).toEqual(data);
	});

	it('Should handle cache write errors gracefully', () => {
		// Create a storage that fails only on write
		const writeFailStorage = {
			getItem: () => undefined,
			setItem: () => {
				throw new Error('Write error');
			},
			clear: () => {}
		};

		class TestClassWriteFail {
			callCount = 0;

			@SyncCache(writeFailStorage as unknown as MemoryStorage, { ttl: 1000 })
			public getUsers(): string[] {
				this.callCount++;
				return data;
			}
		}

		const myClass = new TestClassWriteFail();

		// Should not throw, just log warning and continue
		const result = myClass.getUsers();
		expect(result).toEqual(data);
	});
});
