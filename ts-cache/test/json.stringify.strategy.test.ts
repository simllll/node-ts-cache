import * as Assert from 'assert';
import { JSONStringifyKeyStrategy } from '../src/strategy/key/json.stringify.strategy.js';

describe('JSONStringifyKeyStrategy', () => {
	const strategy = new JSONStringifyKeyStrategy();

	it('Should generate correct key for empty args', () => {
		const key = strategy.getKey('MyClass', 'myMethod', []);
		Assert.strictEqual(key, 'MyClass:myMethod:[]');
	});

	it('Should generate correct key for string args', () => {
		const key = strategy.getKey('UserService', 'getUser', ['john']);
		Assert.strictEqual(key, 'UserService:getUser:["john"]');
	});

	it('Should generate correct key for number args', () => {
		const key = strategy.getKey('UserService', 'getUserById', [123]);
		Assert.strictEqual(key, 'UserService:getUserById:[123]');
	});

	it('Should generate correct key for multiple args', () => {
		const key = strategy.getKey('UserService', 'findUsers', ['john', 25, true]);
		Assert.strictEqual(key, 'UserService:findUsers:["john",25,true]');
	});

	it('Should generate correct key for object args', () => {
		const key = strategy.getKey('UserService', 'createUser', [{ name: 'john', age: 25 }]);
		Assert.strictEqual(key, 'UserService:createUser:[{"name":"john","age":25}]');
	});

	it('Should generate correct key for array args', () => {
		const key = strategy.getKey('UserService', 'getUsers', [[1, 2, 3]]);
		Assert.strictEqual(key, 'UserService:getUsers:[[1,2,3]]');
	});

	it('Should generate correct key for nested object args', () => {
		const args = [{ user: { name: 'john', address: { city: 'NYC' } } }];
		const key = strategy.getKey('UserService', 'processUser', args);
		Assert.strictEqual(key, 'UserService:processUser:[{"user":{"name":"john","address":{"city":"NYC"}}}]');
	});

	it('Should generate correct key for null args', () => {
		const key = strategy.getKey('UserService', 'getDefault', [null]);
		Assert.strictEqual(key, 'UserService:getDefault:[null]');
	});

	it('Should generate correct key for boolean args', () => {
		const key = strategy.getKey('UserService', 'setActive', [true, false]);
		Assert.strictEqual(key, 'UserService:setActive:[true,false]');
	});

	it('Should generate deterministic keys for same input', () => {
		const key1 = strategy.getKey('Service', 'method', [{ a: 1, b: 2 }]);
		const key2 = strategy.getKey('Service', 'method', [{ a: 1, b: 2 }]);
		Assert.strictEqual(key1, key2);
	});

	it('Should generate different keys for different class names', () => {
		const key1 = strategy.getKey('ClassA', 'method', []);
		const key2 = strategy.getKey('ClassB', 'method', []);
		Assert.notStrictEqual(key1, key2);
	});

	it('Should generate different keys for different method names', () => {
		const key1 = strategy.getKey('Class', 'methodA', []);
		const key2 = strategy.getKey('Class', 'methodB', []);
		Assert.notStrictEqual(key1, key2);
	});

	it('Should generate different keys for different args', () => {
		const key1 = strategy.getKey('Class', 'method', [1]);
		const key2 = strategy.getKey('Class', 'method', [2]);
		Assert.notStrictEqual(key1, key2);
	});

	it('Should handle undefined in array args', () => {
		const key = strategy.getKey('Service', 'method', [undefined, 'test']);
		// JSON.stringify converts undefined to null in arrays
		Assert.strictEqual(key, 'Service:method:[null,"test"]');
	});

	it('Should handle special characters in class and method names', () => {
		const key = strategy.getKey('My_Class$1', 'my_method$test', ['arg']);
		Assert.strictEqual(key, 'My_Class$1:my_method$test:["arg"]');
	});

	it('Should handle empty string args', () => {
		const key = strategy.getKey('Service', 'method', ['']);
		Assert.strictEqual(key, 'Service:method:[""]');
	});

	it('Should handle mixed type args', () => {
		const key = strategy.getKey('Service', 'method', ['string', 123, true, null, { key: 'value' }]);
		Assert.strictEqual(key, 'Service:method:["string",123,true,null,{"key":"value"}]');
	});
});
