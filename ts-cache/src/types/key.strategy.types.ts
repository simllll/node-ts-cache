export interface ISyncKeyStrategy {
	getKey(className: string, methodName: string, args: unknown[]): string | undefined;
}

export interface IAsyncKeyStrategy {
	getKey(
		className: string,
		methodName: string,
		args: unknown[]
	): Promise<string | undefined> | string | undefined;
}
