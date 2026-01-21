import { ISyncKeyStrategy } from '../../types/key.strategy.types.js';

export class JSONStringifyKeyStrategy implements ISyncKeyStrategy {
	public getKey(className: string, methodName: string, args: unknown[]): string {
		return `${className}:${methodName}:${JSON.stringify(args)}`;
	}
}
