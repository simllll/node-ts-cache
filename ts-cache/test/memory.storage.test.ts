import * as Assert from 'assert';
import { MemoryStorage } from '../src/storage/memory/index.js';

describe('MemoryStorage', () => {
	it('Should add cache item correctly', () => {
		const storage = new MemoryStorage();
		const content = { data: { name: 'deep' } };
		const key = 'test';

		storage.setItem(key, content);
		Assert.strictEqual(storage.getItem(key), content);
	});

	it('Should return undefined for non-existent key', () => {
		const storage = new MemoryStorage();
		const result = storage.getItem('non-existent-key');
		Assert.strictEqual(result, undefined);
	});

	it('Should overwrite existing cache item', () => {
		const storage = new MemoryStorage();
		const key = 'test';
		const content1 = { value: 'first' };
		const content2 = { value: 'second' };

		storage.setItem(key, content1);
		Assert.deepStrictEqual(storage.getItem(key), content1);

		storage.setItem(key, content2);
		Assert.deepStrictEqual(storage.getItem(key), content2);
	});

	it('Should clear all cache items', () => {
		const storage = new MemoryStorage();

		storage.setItem('key1', 'value1');
		storage.setItem('key2', 'value2');
		storage.setItem('key3', 'value3');

		storage.clear();

		Assert.strictEqual(storage.getItem('key1'), undefined);
		Assert.strictEqual(storage.getItem('key2'), undefined);
		Assert.strictEqual(storage.getItem('key3'), undefined);
	});

	it('Should handle setting undefined value', () => {
		const storage = new MemoryStorage();
		const key = 'test';

		storage.setItem(key, 'initial');
		Assert.strictEqual(storage.getItem(key), 'initial');

		storage.setItem(key, undefined);
		Assert.strictEqual(storage.getItem(key), undefined);
	});

	it('Should handle null values', () => {
		const storage = new MemoryStorage();
		const key = 'test';

		storage.setItem(key, null);
		Assert.strictEqual(storage.getItem(key), null);
	});

	it('Should handle boolean values', () => {
		const storage = new MemoryStorage();

		storage.setItem('true', true);
		storage.setItem('false', false);

		Assert.strictEqual(storage.getItem('true'), true);
		Assert.strictEqual(storage.getItem('false'), false);
	});

	it('Should handle numeric values including zero', () => {
		const storage = new MemoryStorage();

		storage.setItem('zero', 0);
		storage.setItem('negative', -1);
		storage.setItem('float', 3.14);

		Assert.strictEqual(storage.getItem('zero'), 0);
		Assert.strictEqual(storage.getItem('negative'), -1);
		Assert.strictEqual(storage.getItem('float'), 3.14);
	});

	it('Should handle array values', () => {
		const storage = new MemoryStorage();
		const arr = [1, 2, 3, 'test', { nested: true }];

		storage.setItem('array', arr);
		Assert.strictEqual(storage.getItem('array'), arr);
	});

	it('Should handle complex nested objects', () => {
		const storage = new MemoryStorage();
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

		storage.setItem('complex', complex);
		Assert.strictEqual(storage.getItem('complex'), complex);
	});

	it('Should store different types under different keys independently', () => {
		const storage = new MemoryStorage();

		storage.setItem('string', 'hello');
		storage.setItem('number', 42);
		storage.setItem('object', { key: 'value' });
		storage.setItem('array', [1, 2, 3]);

		Assert.strictEqual(storage.getItem('string'), 'hello');
		Assert.strictEqual(storage.getItem('number'), 42);
		Assert.deepStrictEqual(storage.getItem('object'), { key: 'value' });
		Assert.deepStrictEqual(storage.getItem('array'), [1, 2, 3]);
	});

	it('Should handle empty string key', () => {
		const storage = new MemoryStorage();

		storage.setItem('', 'empty key value');
		Assert.strictEqual(storage.getItem(''), 'empty key value');
	});

	it('Should handle keys with special characters', () => {
		const storage = new MemoryStorage();

		storage.setItem('key:with:colons', 'value1');
		storage.setItem('key.with.dots', 'value2');
		storage.setItem('key/with/slashes', 'value3');

		Assert.strictEqual(storage.getItem('key:with:colons'), 'value1');
		Assert.strictEqual(storage.getItem('key.with.dots'), 'value2');
		Assert.strictEqual(storage.getItem('key/with/slashes'), 'value3');
	});
});
