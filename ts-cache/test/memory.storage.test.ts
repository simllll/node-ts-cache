import { describe, it, expect } from 'vitest';
import { MemoryStorage } from '../src/storage/memory/index.js';

describe('MemoryStorage', () => {
	it('Should add cache item correctly', () => {
		const storage = new MemoryStorage();
		const content = { data: { name: 'deep' } };
		const key = 'test';

		storage.setItem(key, content);
		expect(storage.getItem(key)).toBe(content);
	});

	it('Should return undefined for non-existent key', () => {
		const storage = new MemoryStorage();
		const result = storage.getItem('non-existent-key');
		expect(result).toBe(undefined);
	});

	it('Should overwrite existing cache item', () => {
		const storage = new MemoryStorage();
		const key = 'test';
		const content1 = { value: 'first' };
		const content2 = { value: 'second' };

		storage.setItem(key, content1);
		expect(storage.getItem(key)).toEqual(content1);

		storage.setItem(key, content2);
		expect(storage.getItem(key)).toEqual(content2);
	});

	it('Should clear all cache items', () => {
		const storage = new MemoryStorage();

		storage.setItem('key1', 'value1');
		storage.setItem('key2', 'value2');
		storage.setItem('key3', 'value3');

		storage.clear();

		expect(storage.getItem('key1')).toBe(undefined);
		expect(storage.getItem('key2')).toBe(undefined);
		expect(storage.getItem('key3')).toBe(undefined);
	});

	it('Should handle setting undefined value', () => {
		const storage = new MemoryStorage();
		const key = 'test';

		storage.setItem(key, 'initial');
		expect(storage.getItem(key)).toBe('initial');

		storage.setItem(key, undefined);
		expect(storage.getItem(key)).toBe(undefined);
	});

	it('Should handle null values', () => {
		const storage = new MemoryStorage();
		const key = 'test';

		storage.setItem(key, null);
		expect(storage.getItem(key)).toBe(null);
	});

	it('Should handle boolean values', () => {
		const storage = new MemoryStorage();

		storage.setItem('true', true);
		storage.setItem('false', false);

		expect(storage.getItem('true')).toBe(true);
		expect(storage.getItem('false')).toBe(false);
	});

	it('Should handle numeric values including zero', () => {
		const storage = new MemoryStorage();

		storage.setItem('zero', 0);
		storage.setItem('negative', -1);
		storage.setItem('float', 3.14);

		expect(storage.getItem('zero')).toBe(0);
		expect(storage.getItem('negative')).toBe(-1);
		expect(storage.getItem('float')).toBe(3.14);
	});

	it('Should handle array values', () => {
		const storage = new MemoryStorage();
		const arr = [1, 2, 3, 'test', { nested: true }];

		storage.setItem('array', arr);
		expect(storage.getItem('array')).toBe(arr);
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
		expect(storage.getItem('complex')).toBe(complex);
	});

	it('Should store different types under different keys independently', () => {
		const storage = new MemoryStorage();

		storage.setItem('string', 'hello');
		storage.setItem('number', 42);
		storage.setItem('object', { key: 'value' });
		storage.setItem('array', [1, 2, 3]);

		expect(storage.getItem('string')).toBe('hello');
		expect(storage.getItem('number')).toBe(42);
		expect(storage.getItem('object')).toEqual({ key: 'value' });
		expect(storage.getItem('array')).toEqual([1, 2, 3]);
	});

	it('Should handle empty string key', () => {
		const storage = new MemoryStorage();

		storage.setItem('', 'empty key value');
		expect(storage.getItem('')).toBe('empty key value');
	});

	it('Should handle keys with special characters', () => {
		const storage = new MemoryStorage();

		storage.setItem('key:with:colons', 'value1');
		storage.setItem('key.with.dots', 'value2');
		storage.setItem('key/with/slashes', 'value3');

		expect(storage.getItem('key:with:colons')).toBe('value1');
		expect(storage.getItem('key.with.dots')).toBe('value2');
		expect(storage.getItem('key/with/slashes')).toBe('value3');
	});
});
