import * as Assert from 'assert';
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

		Assert.ok(Fs.existsSync(cacheFile));
	});

	it('Should be empty cache file on storage construction', () => {
		const storage = new FsJsonStorage(cacheFile);
		storage.clear();

		const cache = Fs.readFileSync(cacheFile).toString();
		Assert.strictEqual(cache, '{}');
	});

	it('Should add cache item correctly', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const cacheKey = 'test';
		const content = { username: 'test', password: 'test' };

		await storage.setItem(cacheKey, content);
		const cache = JSON.parse(Fs.readFileSync(cacheFile).toString());

		Assert.deepStrictEqual(cache, { [cacheKey]: content });
		const entry = await storage.getItem(cacheKey);
		Assert.deepEqual(entry, content);
	});

	it('Should return undefined for non-existent key', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const result = await storage.getItem('non-existent-key');
		Assert.strictEqual(result, undefined);
	});

	it('Should overwrite existing cache item', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const key = 'test';
		const content1 = { value: 'first' };
		const content2 = { value: 'second' };

		await storage.setItem(key, content1);
		Assert.deepStrictEqual(await storage.getItem(key), content1);

		await storage.setItem(key, content2);
		Assert.deepStrictEqual(await storage.getItem(key), content2);
	});

	it('Should clear all cache items', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('key1', 'value1');
		await storage.setItem('key2', 'value2');
		await storage.setItem('key3', 'value3');

		await storage.clear();

		Assert.strictEqual(await storage.getItem('key1'), undefined);
		Assert.strictEqual(await storage.getItem('key2'), undefined);
		Assert.strictEqual(await storage.getItem('key3'), undefined);

		const cache = Fs.readFileSync(cacheFile).toString();
		Assert.strictEqual(cache, '{}');
	});

	it('Should handle setting undefined value', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const key = 'test';

		await storage.setItem(key, 'initial');
		Assert.strictEqual(await storage.getItem(key), 'initial');

		await storage.setItem(key, undefined);
		Assert.strictEqual(await storage.getItem(key), undefined);
	});

	it('Should handle null values', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const key = 'test';

		await storage.setItem(key, null);
		Assert.strictEqual(await storage.getItem(key), null);
	});

	it('Should handle boolean values', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('true', true);
		await storage.setItem('false', false);

		Assert.strictEqual(await storage.getItem('true'), true);
		Assert.strictEqual(await storage.getItem('false'), false);
	});

	it('Should handle numeric values including zero', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('zero', 0);
		await storage.setItem('negative', -1);
		await storage.setItem('float', 3.14);

		Assert.strictEqual(await storage.getItem('zero'), 0);
		Assert.strictEqual(await storage.getItem('negative'), -1);
		Assert.strictEqual(await storage.getItem('float'), 3.14);
	});

	it('Should handle array values', async () => {
		const storage = new FsJsonStorage(cacheFile);
		const arr = [1, 2, 3, 'test', { nested: true }];

		await storage.setItem('array', arr);
		Assert.deepStrictEqual(await storage.getItem('array'), arr);
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
		Assert.deepStrictEqual(await storage.getItem('complex'), complex);
	});

	it('Should store multiple keys independently', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('string', 'hello');
		await storage.setItem('number', 42);
		await storage.setItem('object', { key: 'value' });
		await storage.setItem('array', [1, 2, 3]);

		Assert.strictEqual(await storage.getItem('string'), 'hello');
		Assert.strictEqual(await storage.getItem('number'), 42);
		Assert.deepStrictEqual(await storage.getItem('object'), { key: 'value' });
		Assert.deepStrictEqual(await storage.getItem('array'), [1, 2, 3]);
	});

	it('Should persist data to file system', async () => {
		const storage = new FsJsonStorage(cacheFile);
		await storage.setItem('persist', { data: 'persisted' });

		// Create a new storage instance pointing to the same file
		const storage2 = new FsJsonStorage(cacheFile);
		const result = await storage2.getItem('persist');

		Assert.deepStrictEqual(result, { data: 'persisted' });
	});

	it('Should handle keys with special characters', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('key:with:colons', 'value1');
		await storage.setItem('key.with.dots', 'value2');

		Assert.strictEqual(await storage.getItem('key:with:colons'), 'value1');
		Assert.strictEqual(await storage.getItem('key.with.dots'), 'value2');
	});

	it('Should handle empty string values', async () => {
		const storage = new FsJsonStorage(cacheFile);

		await storage.setItem('empty', '');
		Assert.strictEqual(await storage.getItem('empty'), '');
	});

	it('Should use existing file if it exists', async () => {
		// Create a file with existing data
		Fs.writeFileSync(cacheFile, JSON.stringify({ existing: 'data' }));

		// Creating a storage instance should not overwrite existing data
		const storage = new FsJsonStorage(cacheFile);
		const entry = await storage.getItem('existing');
		Assert.deepStrictEqual(entry, 'data');
	});
});
