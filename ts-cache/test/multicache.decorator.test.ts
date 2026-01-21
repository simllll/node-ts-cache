//import * as Assert from "assert";
import { MultiCache, IMultiCacheKeyStrategy } from '../src/decorator/multicache.decorator.js';
import { LRUStorage } from '../../storages/lru/src/LRUStorage.js';

const canonicalLRUStrategy = new LRUStorage({});

// @ts-ignore
import RedisMock from 'ioredis-mock';
import { RedisIOStorage } from '../../storages/redisio/src/redisio.storage.js';

const MockedRedis = new RedisMock({
	host: 'host',
	port: 123,
	password: 'pass'
});
const canonicalRedisStrategy = new RedisIOStorage(() => MockedRedis);

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
		// args[1] = geoRegion
		return `{canonicalurl:${geoRegion.toUpperCase()}}:${param.pageType}:${param.path}:${
			process.env.NODE_ENV || 'local'
		}`;
	}
};

class TestClassOne {
	callCount = 0;

	@MultiCache([canonicalLRUStrategy, canonicalRedisStrategy], 0, canonicalKeyStrategy)
	public async getCanonicalUrlsFromCache(urls: UrlEntry[], geoRegion: string): Promise<string[]> {
		console.log('getCanonicalUrlsFromCache', urls, geoRegion);
		return urls.map(p => {
			return p.path + 'RETURN VALUE' + geoRegion;
		});
	}
}

describe('MultiCacheDecorator', () => {
	beforeEach(async () => {
		// await storage.clear();
		// await storage2.clear();
	});

	it('Should multi cache', async () => {
		const myClass = new TestClassOne();
		// call 1
		const call1 = await myClass.getCanonicalUrlsFromCache(
			[
				{ path: 'elem1', pageType: 'x' },
				{ path: 'elem2', pageType: 'x' },
				{ path: 'elem3', pageType: 'x' }
			],
			'at'
		);
		console.log('CALL RESULT 1', call1);

		const call2 = await myClass.getCanonicalUrlsFromCache(
			[
				{ path: 'elem1', pageType: 'x' },
				{ path: 'elem2', pageType: 'x' },
				{ path: 'elem3', pageType: 'x' }
			],
			'at'
		);
		console.log('CALL RESULT 2', call2);
	});
});
