import { JSONStringifyKeyStrategy } from '../strategy/key/json.stringify.strategy.js';
import { ISyncKeyStrategy } from '../types/key.strategy.types.js';
import { ISynchronousCacheType, ICacheOptions } from '../types/cache.types.js';

const defaultKeyStrategy = new JSONStringifyKeyStrategy();

export function SyncCache(
	cachingStrategy: ISynchronousCacheType,
	options?: ICacheOptions,
	keyStrategy: ISyncKeyStrategy = defaultKeyStrategy
) {
	return function (target: object, methodName: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;
		const className = target.constructor.name;

		descriptor.value = function (...args: unknown[]) {
			const runMethod = () => {
				const methodResult = originalMethod.apply(this, args);

				const isAsync =
					methodResult?.constructor?.name === 'AsyncFunction' ||
					methodResult?.constructor?.name === 'Promise';

				if (isAsync) {
					throw new Error('async function detected, use @Cache instead');
				}

				return methodResult;
			};

			const cacheKey = keyStrategy.getKey(className, methodName, args);

			if (!cacheKey) {
				return runMethod();
			}

			try {
				const entry = cachingStrategy.getItem(cacheKey);
				if (entry !== undefined) {
					return entry;
				}
			} catch (err) {
				console.warn('@node-ts-cache/core: reading cache failed', cacheKey, err);
			}
			const methodResult = runMethod();

			try {
				cachingStrategy.setItem(cacheKey, methodResult, options);
			} catch (err) {
				console.warn('@node-ts-cache/core: writing result to cache failed', cacheKey, err);
			}
			return methodResult;
		};

		return descriptor;
	};
}
