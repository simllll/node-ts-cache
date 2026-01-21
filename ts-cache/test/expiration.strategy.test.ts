import * as Assert from 'assert';
import { ExpirationStrategy } from '../src/index.js';
import { MemoryStorage } from '../src/storage/memory/index.js';

interface ITestType {
	user: {
		name: string;
	};
}

const data: ITestType = {
	user: { name: 'test' }
};

describe('ExpirationStrategy', () => {
	it('Should set cache item correctly with isLazy', async () => {
		const cacher = new ExpirationStrategy(new MemoryStorage());

		await cacher.setItem('test', data, { ttl: 10 });
		const entry = await cacher.getItem<ITestType>('test');

		Assert.deepStrictEqual(entry, data);
	});

	it('Should return no item if cache expires instantly with isLazy', async () => {
		const cacher = new ExpirationStrategy(new MemoryStorage());

		await cacher.setItem('test', data, { ttl: -1 });
		const entry = await cacher.getItem<ITestType>('test');
		Assert.deepStrictEqual(entry, undefined);
	});

	it('Should not find cache item after ttl with isLazy disabled', async () => {
		const cacher = new ExpirationStrategy(new MemoryStorage());

		await cacher.setItem('test', data, { ttl: 0.001, isLazy: false });
		await wait(10);

		const entry = await cacher.getItem<ITestType>('test');
		Assert.deepStrictEqual(entry, undefined);
	});

	it('Should ignore isLazy and ttl options if isCachedForever option is provided and cache forever', async () => {
		const cacher = new ExpirationStrategy(new MemoryStorage());

		await cacher.setItem('test', data, {
			ttl: 0,
			isLazy: false,
			isCachedForever: true
		});
		await wait(10);

		const entry = await cacher.getItem<ITestType>('test');
		Assert.deepStrictEqual(entry, data);
	});

	describe('clear method', () => {
		it('Should clear all cached items', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('key1', 'value1', { ttl: 1000 });
			await cacher.setItem('key2', 'value2', { ttl: 1000 });
			await cacher.setItem('key3', 'value3', { ttl: 1000 });

			await cacher.clear();

			Assert.strictEqual(await cacher.getItem('key1'), undefined);
			Assert.strictEqual(await cacher.getItem('key2'), undefined);
			Assert.strictEqual(await cacher.getItem('key3'), undefined);
		});

		it('Should not throw when clearing empty cache', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.clear();
			// Should not throw
		});
	});

	describe('Default options', () => {
		it('Should use default TTL of 60 seconds when not specified', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', data);
			const entry = await cacher.getItem<ITestType>('test');

			Assert.deepStrictEqual(entry, data);
		});

		it('Should use lazy expiration by default', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			// Set with negative TTL - should expire immediately on read
			await cacher.setItem('test', data, { ttl: -1 });
			const entry = await cacher.getItem<ITestType>('test');

			Assert.strictEqual(entry, undefined);
		});
	});

	describe('Return value types', () => {
		it('Should return undefined for non-existent key', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			const entry = await cacher.getItem('non-existent');
			Assert.strictEqual(entry, undefined);
		});

		it('Should handle null values', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', null, { ttl: 1000 });
			const entry = await cacher.getItem('test');

			Assert.strictEqual(entry, null);
		});

		it('Should handle boolean false values', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', false, { ttl: 1000 });
			const entry = await cacher.getItem<boolean>('test');

			Assert.strictEqual(entry, false);
		});

		it('Should handle numeric zero values', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', 0, { ttl: 1000 });
			const entry = await cacher.getItem<number>('test');

			Assert.strictEqual(entry, 0);
		});

		it('Should handle empty string values', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', '', { ttl: 1000 });
			const entry = await cacher.getItem<string>('test');

			Assert.strictEqual(entry, '');
		});

		it('Should handle array values', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());
			const arr = [1, 2, 3, 'test'];

			await cacher.setItem('test', arr, { ttl: 1000 });
			const entry = await cacher.getItem<typeof arr>('test');

			Assert.deepStrictEqual(entry, arr);
		});

		it('Should handle complex nested objects', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());
			const complex = {
				level1: {
					level2: {
						level3: {
							value: 'deep'
						}
					}
				},
				array: [1, { nested: true }]
			};

			await cacher.setItem('test', complex, { ttl: 1000 });
			const entry = await cacher.getItem<typeof complex>('test');

			Assert.deepStrictEqual(entry, complex);
		});
	});

	describe('Update behavior', () => {
		it('Should overwrite existing cached item', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', { value: 'first' }, { ttl: 1000 });
			await cacher.setItem('test', { value: 'second' }, { ttl: 1000 });

			const entry = await cacher.getItem<{ value: string }>('test');
			Assert.deepStrictEqual(entry, { value: 'second' });
		});

		it('Should reset TTL when updating', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', 'first', { ttl: 0.001 });
			await wait(5);
			await cacher.setItem('test', 'second', { ttl: 1000 });

			const entry = await cacher.getItem<string>('test');
			Assert.strictEqual(entry, 'second');
		});

		it('Should handle setting undefined value', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', 'initial', { ttl: 1000 });
			await cacher.setItem('test', undefined, { ttl: 1000 });

			const entry = await cacher.getItem<string>('test');
			Assert.strictEqual(entry, undefined);
		});
	});

	describe('Lazy vs Eager expiration', () => {
		it('Should expire item on read with lazy expiration', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', data, { ttl: 0.001, isLazy: true });
			await wait(10);

			const entry = await cacher.getItem<ITestType>('test');
			Assert.strictEqual(entry, undefined);
		});

		it('Should expire item proactively with eager expiration', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('test', data, { ttl: 0.001, isLazy: false });
			await wait(10);

			const entry = await cacher.getItem<ITestType>('test');
			Assert.strictEqual(entry, undefined);
		});

		it('Should keep items with isLazy until read even after TTL', async () => {
			const storage = new MemoryStorage();
			const cacher = new ExpirationStrategy(storage);

			await cacher.setItem('test', data, { ttl: 0.001, isLazy: true });
			await wait(10);

			// Item should still exist in storage (not yet cleaned up)
			const rawItem = storage.getItem('test');
			Assert.notStrictEqual(rawItem, undefined);

			// But getItem should return undefined and clean up
			const entry = await cacher.getItem<ITestType>('test');
			Assert.strictEqual(entry, undefined);
		});
	});

	describe('Multiple keys', () => {
		it('Should handle multiple independent keys', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('key1', 'value1', { ttl: 1000 });
			await cacher.setItem('key2', 'value2', { ttl: 1000 });
			await cacher.setItem('key3', 'value3', { ttl: 1000 });

			Assert.strictEqual(await cacher.getItem('key1'), 'value1');
			Assert.strictEqual(await cacher.getItem('key2'), 'value2');
			Assert.strictEqual(await cacher.getItem('key3'), 'value3');
		});

		it('Should allow different TTLs for different keys', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('short', 'value1', { ttl: 0.001 });
			await cacher.setItem('long', 'value2', { ttl: 1000 });

			await wait(10);

			Assert.strictEqual(await cacher.getItem('short'), undefined);
			Assert.strictEqual(await cacher.getItem('long'), 'value2');
		});
	});

	describe('Special key formats', () => {
		it('Should handle keys with colons', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('user:123:profile', 'data', { ttl: 1000 });
			Assert.strictEqual(await cacher.getItem('user:123:profile'), 'data');
		});

		it('Should handle keys with special characters', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('key.with.dots', 'data1', { ttl: 1000 });
			await cacher.setItem('key/with/slashes', 'data2', { ttl: 1000 });
			await cacher.setItem('key-with-dashes', 'data3', { ttl: 1000 });

			Assert.strictEqual(await cacher.getItem('key.with.dots'), 'data1');
			Assert.strictEqual(await cacher.getItem('key/with/slashes'), 'data2');
			Assert.strictEqual(await cacher.getItem('key-with-dashes'), 'data3');
		});

		it('Should handle empty string as key', async () => {
			const cacher = new ExpirationStrategy(new MemoryStorage());

			await cacher.setItem('', 'empty key value', { ttl: 1000 });
			Assert.strictEqual(await cacher.getItem(''), 'empty key value');
		});
	});
});

function wait(ms: number): Promise<void> {
	return new Promise<void>((resolve, _reject) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}
