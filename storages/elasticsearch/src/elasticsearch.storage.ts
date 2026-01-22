import { IAsynchronousCacheType } from '@node-ts-cache/core';
import { Client, ClientOptions } from '@elastic/elasticsearch';

export interface ElasticsearchStorageOptions {
	/** The index name to use for storing cache entries */
	indexName: string;
	/** Elasticsearch client options */
	clientOptions?: ClientOptions;
	/** Pre-configured Elasticsearch client instance (takes precedence over clientOptions) */
	client?: Client;
}

export class ElasticsearchStorage implements IAsynchronousCacheType {
	private client: Client;
	private indexName: string;

	constructor(options: ElasticsearchStorageOptions) {
		this.indexName = options.indexName;

		if (options.client) {
			this.client = options.client;
		} else if (options.clientOptions) {
			this.client = new Client(options.clientOptions);
		} else {
			this.client = new Client({ node: 'http://localhost:9200' });
		}
	}

	public async getItem<T>(key: string): Promise<T | undefined> {
		try {
			const response = await this.client.get({
				index: this.indexName,
				id: key
			});

			const source = response._source as { content: unknown } | undefined;
			if (source === undefined || source === null) {
				return undefined;
			}

			return source.content as T;
		} catch (error: unknown) {
			// Handle 404 (document not found) gracefully
			if (this.isNotFoundError(error)) {
				return undefined;
			}
			throw error;
		}
	}

	public async setItem<T = unknown>(key: string, content: T | undefined): Promise<void> {
		if (content === undefined) {
			try {
				await this.client.delete({
					index: this.indexName,
					id: key,
					refresh: 'wait_for'
				});
			} catch (error: unknown) {
				// Ignore 404 errors when deleting non-existent documents
				if (!this.isNotFoundError(error)) {
					throw error;
				}
			}
			return;
		}

		await this.client.index({
			index: this.indexName,
			id: key,
			refresh: 'wait_for',
			document: { content }
		});
	}

	public async clear(): Promise<void> {
		try {
			await this.client.indices.delete({
				index: this.indexName,
				ignore_unavailable: true
			});
		} catch {
			// Ignore errors when clearing (index might not exist)
		}
	}

	public async close(): Promise<void> {
		await this.client.close();
	}

	private isNotFoundError(error: unknown): boolean {
		return (
			error !== null &&
			typeof error === 'object' &&
			'meta' in error &&
			(error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
		);
	}
}
