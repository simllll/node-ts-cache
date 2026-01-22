import { describe, it, expect, afterEach } from 'vitest';
import * as Fs from 'fs';
import { FsJsonStorage } from '../src/storage/fs/index.js';

const cacheFile = 'cache.json';

describe('FsJsonStorage', () => {
	afterEach(() => {
		// Clean up cache file after each test
		if (Fs.existsSync(cacheFile)) {
			Fs.unlinkSync(cacheFile);
		}
	});

	it('Should create file on storage construction', () => {
		const storage = new FsJsonStorage(cacheFile);
		storage.clear();

		expect(Fs.existsSync(cacheFile)).toBeTruthy();
	});

	it('Should be empty cache file on storage construction', () => {
		const storage = new FsJsonStorage(cacheFile);
		storage.clear();

		const cache = Fs.readFileSync(cacheFile).toString();
		expect(cache).toBe('{}');
	});

	it('Should add cache item correctly', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const cacheKey = 'test';
		const content = { username: 'test', password: 'test' };

		await storage.setItem(cacheKey, content);
		const cache = JSON.parse(Fs.readFileSync(cacheFile).toString());

		expect(cache).toEqual({ [cacheKey]: content });
		const entry = await storage.getItem(cacheKey);
		expect(entry).toEqual(content);
	});

	it('Should return undefined for non-existent key', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const result = await storage.getItem('non-existent-key');
		expect(result).toBe(undefined);
	});

	it('Should overwrite existing cache item', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const key = 'test';
		const content1 = { value: 'first' };
		const content2 = { value: 'second' };

		await storage.setItem(key, content1);
		expect(await storage.getItem(key)).toEqual(content1);

		await storage.setItem(key, content2);
		expect(await storage.getItem(key)).toEqual(content2);
	});

	it('Should clear all cache items', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('key1', 'value1');
		await storage.setItem('key2', 'value2');
		await storage.setItem('key3', 'value3');

		await storage.clear();

		expect(await storage.getItem('key1')).toBe(undefined);
		expect(await storage.getItem('key2')).toBe(undefined);
		expect(await storage.getItem('key3')).toBe(undefined);

		const cache = Fs.readFileSync(cacheFile).toString();
		expect(cache).toBe('{}');
	});

	it('Should handle setting undefined value', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const key = 'test';

		await storage.setItem(key, 'initial');
		expect(await storage.getItem(key)).toBe('initial');

		await storage.setItem(key, undefined);
		expect(await storage.getItem(key)).toBe(undefined);
	});

	it('Should handle null values', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const key = 'test';

		await storage.setItem(key, null);
		expect(await storage.getItem(key)).toBe(null);
	});

	it('Should handle boolean values', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('true', true);
		await storage.setItem('false', false);

		expect(await storage.getItem('true')).toBe(true);
		expect(await storage.getItem('false')).toBe(false);
	});

	it('Should handle numeric values including zero', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('zero', 0);
		await storage.setItem('negative', -1);
		await storage.setItem('float', 3.14);

		expect(await storage.getItem('zero')).toBe(0);
		expect(await storage.getItem('negative')).toBe(-1);
		expect(await storage.getItem('float')).toBe(3.14);
	});

	it('Should handle array values', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const arr = [1, 2, 3, 'test', { nested: true }];

		await storage.setItem('array', arr);
		expect(await storage.getItem('array')).toEqual(arr);
	});

	it('Should handle complex nested objects', async () => {
		const storage = new FsJsonStorage(cacheFile);
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

		await storage.setItem('complex', complex);
		expect(await storage.getItem('complex')).toEqual(complex);
	});

	it('Should store multiple keys independently', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('string', 'hello');
		await storage.setItem('number', 42);
		await storage.setItem('object', { key: 'value' });
		await storage.setItem('array', [1, 2, 3]);

		expect(await storage.getItem('string')).toBe('hello');
		expect(await storage.getItem('number')).toBe(42);
		expect(await storage.getItem('object')).toEqual({ key: 'value' });
		expect(await storage.getItem('array')).toEqual([1, 2, 3]);
	});

	it('Should persist data to file system', async () => {
		const storage = new FsJsonStorage(cacheFile);
		await storage.setItem('persist', { data: 'persisted' });

		// Create a new storage instance pointing to the same file
		const storage2 = new FsJsonStorage(cacheFile);
		const result = await storage2.getItem('persist');

		expect(result).toEqual({ data: 'persisted' });
	});

	it('Should handle keys with special characters', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('key:with:colons', 'value1');
		await storage.setItem('key.with.dots', 'value2');

		expect(await storage.getItem('key:with:colons')).toBe('value1');
		expect(await storage.getItem('key.with.dots')).toBe('value2');
	});

	it('Should handle empty string values', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('empty', '');
		expect(await storage.getItem('empty')).toBe('');
	});

	it('Should use existing file if it exists', async () => {
		// Create a file with existing data
		Fs.writeFileSync(cacheFile, JSON.stringify({ existing: 'data' }));

		// Creating a storage instance should not overwrite existing data
		const storage = new FsJsonStorage(cacheFile);
		const entry = await storage.getItem('existing');
		expect(entry).toEqual('data');
	});
});
