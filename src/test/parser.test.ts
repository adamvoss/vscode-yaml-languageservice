/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import assert = require('assert');
import YamlParser = require('../parser/yamlParser');
import Parser = require('../../vscode-json-languageservice/src/parser/jsonParser');
import SchemaService = require('../../vscode-json-languageservice/src/services/jsonSchemaService');
import JsonSchema = require('../../vscode-json-languageservice/src/jsonSchema');

suite('YAML Parser', () => {

	var validExecCount = 1
	var invalidExecCount = 1

	function isValid(json: string): void {
		const message = `isValid test number: ${validExecCount++}`
		var result = YamlParser.parse(json);
		assert.equal(result.errors.length + result.warnings.length, 0, message);
	}

	function isInvalid(json: string, ...expectedErrors: Parser.ErrorCode[]): void {
		const message = `isInvalid test number: ${invalidExecCount++}`
		var result = YamlParser.parse(json);
		if (expectedErrors.length === 0) {
			assert.ok(result.errors.length > 0, message);
		} else {
			assert.deepEqual(result.errors.map(e => e.code), expectedErrors, message);
		}
		// these should be caught by the parser, not the last-ditch guard
		assert.notEqual(result.errors[0].message, 'Invalid JSON', message);
	}


	test('Invalid body', function () {
		var result = YamlParser.parse('*');

		assert(result.errors.length >= 1);

		isInvalid('{}[]');
	});

	test('Trailing Whitespace', function () {
		isValid('{}\n\n');
	});


	test('Objects', function () {
		isValid('{}');
		isValid('{"key": "value"}');
		isValid('{"key1": true, "key2": 3, "key3": [null], "key4": { "nested": {}}}');
		isValid('{"constructor": true }');

		isInvalid('{');
		// Note this should be invalid, see: https://github.com/nodeca/js-yaml/issues/355
		isValid('{3:3}');
		isValid('{3: 3}');
		isValid('{\'key\': 3}');
		isInvalid('{"key" 3}');
		isInvalid('{"key":3 "key2": 4}');
		isValid('{"key":42, }');
		isValid('{"key": 42, }')
		isInvalid('{"key:42');

		isValid("key: value")
		isValid("key: value\nk2: v2")
		isInvalid("key: value\n k2: v2")
	});

	test('Arrays', function () {
		isValid('[]');
		isValid('[1, 2]');
		isValid('[1, "string", false, {}, [null]]');

		isInvalid('[');
		isValid('[,]');
		isValid('[1 2]');
		isValid('[true false]');
		isValid('[1, ]');
		isInvalid('[[]');
		isInvalid('["something"');
		isValid('[magic]');

		isValid(`- 1\n- 2\n- 3`)
		isValid(`- 1\n- 2\n-`)
		isInvalid(`- 1\n-2\n- 3`)
	});

	test('Strings', function () {
		isValid('["string"]');
		isValid('["\\"\\\\\\/\\b\\f\\n\\r\\t\\u1234\\u12AB"]');
		isValid('["\\\\"]');

		isInvalid('["');
		isInvalid('["]');
		isInvalid('["\\z"]');
		isInvalid('["\\u"]');
		isInvalid('["\\u123"]');
		isInvalid('["\\u123Z"]');
		isValid('[\'string\']');
		isValid('"\tabc"');

		isValid('abc');
		isValid('ab\nc');
		isValid('| \na: b');
	});

	test('Numbers', function () {
		isValid('[0, -1, 186.1, 0.123, -1.583e+4, 1.583E-4, 5e8]');

		isValid('[+1]');
		isValid('[01]');
		isValid('[1.]');
		// Strings
		isValid('[1.1+3]');
		isValid('[1.4e]');
		isValid('[-A]');
	});

	test('Simple AST', function () {
		var result = YamlParser.parse('{}');

		assert.strictEqual(result.errors.length, 0);

		var node = result.getNodeFromOffset(1);

		assert.equal(node.type, 'object');
		assert.deepEqual(node.getPath(), []);

		assert.deepStrictEqual(result.getNodeFromOffset(2), /*null*/ new Parser.ObjectASTNode(null, null, 0, 2));
		result = YamlParser.parse('[null]');
		assert.strictEqual(result.errors.length, 0);

		node = result.getNodeFromOffset(2);
		assert.equal(node.type, 'null');
		assert.deepEqual(node.getPath(), [0]);
		result = YamlParser.parse('{"a":true}');
		assert.strictEqual(result.errors.length, 0);

		node = result.getNodeFromOffset(3);
		assert.equal(node.type, 'string');
		assert.equal((<Parser.StringASTNode>node).isKey, true);
		assert.deepEqual(node.getPath(), ['a']);

		node = result.getNodeFromOffset(4);

		assert.equal(node.type, /*'property'*/ 'string');

		node = result.getNodeFromOffset(0);
		assert.equal(node.type, 'object');

		node = result.getNodeFromOffset(10);

		assert.notEqual(node, null); // Changed from `equal`

		node = result.getNodeFromOffset(5);

		assert.equal(node.type, 'boolean');
		assert.deepEqual(node.getPath(), ['a']);
	});

	test('implicit null in array', function () {
		let result = YamlParser.parse(`- 1\n- 2\n-\n- 4`);
		assert.deepStrictEqual((<Parser.ArrayASTNode>result.root).items.map(x => x.getValue()), [1, 2, null, 4])

		// NOTE: In the future we can hope this tests breaks
		// https://github.com/nodeca/js-yaml/issues/321
		result = YamlParser.parse(`[1,'',,4,]`);
		assert.deepStrictEqual((<Parser.ArrayASTNode>result.root).items.map(x => x.getValue()), [1, '', null, 4])
	})

	test('implicit null in mapping', function () {
		let result = YamlParser.parse(`{key,}`);
		const properties = (<Parser.ObjectASTNode>result.root).properties
		assert.strictEqual(properties.length, 1)
		assert.strictEqual(properties[0].key.value, "key")
		assert.strictEqual(properties[0].value.type, 'null')
	})

	test('Nested AST', function () {

		var content = '{\n\t"key" : {\n\t"key2": 42\n\t}\n}';
		var result = YamlParser.parse(content);

		assert.strictEqual(result.errors.length, 0);

		var node = result.getNodeFromOffset(content.indexOf('key2') + 2);
		var location = node.getPath();

		assert.deepEqual(location, ['key', 'key2']);

		node = result.getNodeFromOffset(content.indexOf('42') + 1);
		location = node.getPath();

		assert.deepEqual(location, ['key', 'key2']);
	});

	test('Nested AST in Array', function () {

		var result = YamlParser.parse('{"key":[{"key2":42}]}');

		assert.strictEqual(result.errors.length, 0);

		var node = result.getNodeFromOffset(17);
		var location = node.getPath();

		assert.deepEqual(location, ['key', 0, 'key2']);

	});

	test('Multiline', function () {

		var content = '{\n\t\n}';
		var result = YamlParser.parse(content);

		assert.strictEqual(result.errors.length, 0);

		var node = result.getNodeFromOffset(content.indexOf('\t') + 1);

		assert.notEqual(node, null);

		content = '{\n"first":true\n\n}';
		result = YamlParser.parse(content);

		node = result.getNodeFromOffset(content.length - 2);
		assert.equal(node.type, /*'object'*/ 'property');

		node = result.getNodeFromOffset(content.length - 4);
		assert.equal(node.type, 'boolean');
	});

	test('Expand errors to entire tokens', function () {

		var content = '{\n"key" 32,\nerror\n}';
		var result = YamlParser.parse(content);
		assert.equal(result.errors.length, 1);
		assert.equal(result.errors[0].location.start, content.indexOf('32'));
		assert.equal(result.errors[0].location.end, content.length);
	});

	test('Errors at the end of the file', function () {

		var content = '{\n"key":32\n ';
		var result = YamlParser.parse(content);
		assert(result.errors.length >= 1);
		assert.equal(result.errors[0].location.start, 11);
		assert.equal(result.errors[0].location.end, 12);
	});

	test('Getting keys out of an object', function () {

		var content = '{\n"key":32,\n\n"key2":45}';
		var result = YamlParser.parse(content);
		assert.equal(result.errors.length, 0);
		var node = result.getNodeFromOffset(content.indexOf('32,\n') + 4);

		assert.equal(node.type, /*'object'*/'property');
		var keyList = (<Parser.ObjectASTNode>node.parent).getKeyList();
		assert.deepEqual(keyList, ['key', 'key2']);
	});

	test('Validate types', function () {

		var str = '{"number": 3.4, "integer": 42, "string": "some string", "boolean":true, "null":null, "object":{}, "array":[1, 2]}';
		var result = YamlParser.parse(str);

		assert.strictEqual(result.errors.length, 0);

		result.validate({
			type: 'object'
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse(str);
		result.validate({
			type: 'array'
		});

		assert.strictEqual(result.warnings.length, 1);

		result = YamlParser.parse(str);

		result.validate({
			type: 'object',
			properties: {
				"number": {
					type: 'number'
				},
				"integer": {
					type: 'integer'
				},
				"string": {
					type: 'string'
				},
				"boolean": {
					type: 'boolean'
				},
				"null": {
					type: 'null'
				},
				"object": {
					type: 'object'
				},
				"array": {
					type: 'array'
				}
			}
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse(str);
		result.validate({
			type: 'object',
			properties: {
				"number": {
					type: 'array'
				},
				"integer": {
					type: 'string'
				},
				"string": {
					type: 'object'
				},
				"boolean": {
					type: 'null'
				},
				"null": {
					type: 'integer'
				},
				"object": {
					type: 'boolean'
				},
				"array": {
					type: 'number'
				}
			}
		});

		assert.strictEqual(result.warnings.length, 7);

		result = YamlParser.parse(str);
		result.validate({
			type: 'object',
			properties: {
				"number": {
					type: 'integer'
				},
			}
		});

		assert.strictEqual(result.warnings.length, 1);

		result = YamlParser.parse(str);
		result.validate({
			type: 'object',
			properties: {
				"integer": {
					type: 'number'
				},
			}
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse(str);
		result.validate({
			type: 'object',
			properties: {
				"array": {
					type: 'array',
					items: {
						type: 'integer'
					}
				},
			}
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse(str);
		result.validate({
			type: 'object',
			properties: {
				"array": {
					type: 'array',
					items: {
						type: 'string'
					}
				},
			}
		});

		assert.strictEqual(result.warnings.length, 2);
	});

	test('Required properties', function () {

		var result = YamlParser.parse('{"integer": 42, "string": "some string", "boolean":true}');

		assert.strictEqual(result.errors.length, 0);

		result.validate({
			type: 'object',
			required: ['string']
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse('{"integer": 42, "string": "some string", "boolean":true}');
		result.validate({
			type: 'object',
			required: ['notpresent']
		});

		assert.strictEqual(result.warnings.length, 1);
	});

	test('Arrays', function () {

		var result = YamlParser.parse('[1, 2, 3]');

		assert.strictEqual(result.errors.length, 0);

		result.validate({
			type: 'array',
			items: {
				type: 'number'
			},
			minItems: 1,
			maxItems: 5
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse('[1, 2, 3]');
		result.validate({
			type: 'array',
			items: {
				type: 'number'
			},
			minItems: 10
		});

		assert.strictEqual(result.warnings.length, 1);

		result = YamlParser.parse('[1, 2, 3]');
		result.validate({
			type: 'array',
			items: {
				type: 'number'
			},
			maxItems: 2
		});

		assert.strictEqual(result.warnings.length, 1);

		result = YamlParser.parse('- 1\n- 2\n- 3')
		result.validate({
			type: 'array',
			items: {
				type: 'number'
			},
			maxItems: 3
		});
		assert.strictEqual(result.warnings.length, 0)
	});

	test('Strings', function () {

		var result = YamlParser.parse('{"one":"test"}');

		assert.strictEqual(result.errors.length, 0);

		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'string',
					minLength: 1,
					maxLength: 10
				}
			}
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse('{"one":"test"}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'string',
					minLength: 10,
				}
			}
		});

		assert.strictEqual(result.warnings.length, 1);

		result = YamlParser.parse('{"one":"test"}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'string',
					maxLength: 3,
				}
			}
		});

		assert.strictEqual(result.warnings.length, 1);

		result = YamlParser.parse('{"one":"test"}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'string',
					pattern: '^test$'
				}
			}
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse('{"one":"test"}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'string',
					pattern: 'fail'
				}
			}
		});

		assert.strictEqual(result.warnings.length, 1);

	});

	test('Numbers', function () {

		var result = YamlParser.parse('{"one": 13.45e+1}');

		assert.strictEqual(result.errors.length, 0);

		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'number',
					minimum: 1,
					maximum: 135
				}
			}
		});

		assert.strictEqual(result.warnings.length, 0);

		result = YamlParser.parse('{"one": 13.45e+1}');

		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'number',
					minimum: 200,
				}
			}
		});

		assert.strictEqual(result.warnings.length, 1, 'below minimum');

		result = YamlParser.parse('{"one": 13.45e+1}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'number',
					maximum: 130,
				}
			}
		});

		assert.strictEqual(result.warnings.length, 1, 'above maximum');

		result = YamlParser.parse('{"one": 13.45e+1}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'number',
					minimum: 134.5,
					exclusiveMinimum: true
				}
			}
		});

		assert.strictEqual(result.warnings.length, 1, 'at exclusive mininum');

		result = YamlParser.parse('{"one": 13.45e+1}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'number',
					maximum: 134.5,
					exclusiveMaximum: true
				}
			}
		});

		assert.strictEqual(result.warnings.length, 1, 'at exclusive maximum');

		result = YamlParser.parse('{"one": 13.45e+1}');
		result.validate({
			type: 'object',
			properties: {
				"one": {
					type: 'number',
					minimum: 134.5,
					maximum: 134.5
				}
			}
		});

		assert.strictEqual(result.warnings.length, 0, 'equal to min and max');
	});

	test('getNodeFromOffset', function () {
		var content = '{"a": 1,\n\n"d": 2}';
		var doc = YamlParser.parse(content);

		assert.strictEqual(doc.errors.length, 0);

		var node = doc.getNodeFromOffset(content.indexOf(': 2') + 1);

		assert.strictEqual(node.type, 'property');
	});


	test('Duplicate keys', function () {
		var doc = YamlParser.parse('{"a": 1, "a": 2}');

		assert.strictEqual(doc.errors.length, 0);
		assert(doc.warnings.length >= 1, 'Keys should not be the same');

		var doc = YamlParser.parse('{"a": { "a": 2, "a": 3}}');

		assert.strictEqual(doc.errors.length, 0);
		assert(doc.warnings.length >= 1, 'Keys should not be the same');

		var doc = YamlParser.parse('[{ "a": 2, "a": 3}]');

		assert.strictEqual(doc.errors.length, 0);
		assert(doc.warnings.length >= 1, 'Keys should not be the same');

	});

	test('allOf', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		var schema: JsonSchema.JSONSchema = {
			id: 'main',
			allOf: [
				{
					type: 'object'
				},
				{
					properties: {
						'prop1': {
							type: 'number'
						}
					}
				},
				{
					properties: {
						'prop2': {
							type: 'boolean'
						}
					}
				}

			]
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop1": 42, "prop2": 123}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('anyOf', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		var schema: JsonSchema.JSONSchema = {
			id: 'main',
			anyOf: [
				{
					properties: {
						'prop1': {
							type: 'number'
						}
					}
				},
				{
					properties: {
						'prop2': {
							type: 'boolean'
						}
					}
				}

			]
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop1": 42, "prop2": 123}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop1": "a string", "prop2": 123}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('oneOf', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		var schema: JsonSchema.JSONSchema = {
			id: 'main',
			oneOf: [
				{
					properties: {
						'prop1': {
							type: 'number'
						}
					}
				},
				{
					properties: {
						'prop2': {
							type: 'boolean'
						}
					}
				}

			]
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		doc = YamlParser.parse('{"prop1": 42, "prop2": 123}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop1": "a string", "prop2": 123}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});


	test('not', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		var schema: JsonSchema.JSONSchema = {
			id: 'main',
			not: {
				properties: {
					'prop1': {
						type: 'number'
					}
				}
			}

		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		doc = YamlParser.parse('{"prop1": "test"}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);
	});

	test('minProperties', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		var schema: JsonSchema.JSONSchema = {
			minProperties: 2
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		schema.minProperties = 1;

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		schema.minProperties = 3;

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('maxProperties', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		var schema: JsonSchema.JSONSchema = {
			maxProperties: 2
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		schema.maxProperties = 3;

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		schema.maxProperties = 1;

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('patternProperties', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": 42}');

		var schema: JsonSchema.JSONSchema = {
			id: 'main',
			patternProperties: {
				'^prop\\d$': {
					type: 'number'
				}
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		doc = YamlParser.parse('{"prop1": 42, "prop2": 123, "aprop3": true}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);
	});

	test('additionalProperties', function () {

		var doc = YamlParser.parse('{"prop1": 42, "prop2": 42}');

		var schema: JsonSchema.JSONSchema = {
			additionalProperties: {
				type: 'number'
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop1": 42, "prop2": true}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		schema = {
			properties: {
				"prop1": {
					type: 'boolean'
				}
			},
			additionalProperties: {
				type: 'number'
			}
		};

		doc = YamlParser.parse('{"prop1": true, "prop2": 42}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		schema = {
			properties: {
				"prop1": {
					type: 'boolean'
				}
			},
			additionalProperties: false
		};

		doc = YamlParser.parse('{"prop1": true, "prop2": 42}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		doc = YamlParser.parse('{"prop1": true}');

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);
	});

	test('enum', function () {

		var doc = YamlParser.parse('{"prop": "harmonica"}');

		var schema: JsonSchema.JSONSchema = {
			properties: {
				'prop': {
					enum: ['violin', 'harmonica', 'banjo']
				}
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop": "harp"}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		schema = {
			properties: {
				'prop': {
					enum: [1, 42, 999]
				}
			}
		};

		doc = YamlParser.parse('{"prop": 42}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop": 1337}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		var doc = YamlParser.parse('{"prop": { "name": "David" }}');

		var schema: JsonSchema.JSONSchema = {
			properties: {
				'prop': {
					enum: ['violin', { "name": "David" }, null]
				}
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);
	});

	test('uniqueItems', function () {

		var doc = YamlParser.parse('[1, 2, 3]');

		var schema: JsonSchema.JSONSchema = {
			type: 'array',
			uniqueItems: true
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('[1, 2, 3, 2]');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);

		doc = YamlParser.parse('[1, 2, "string", 52, "string"]');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('items as array', function () {

		var doc = YamlParser.parse('[1, true, "string"]');

		var schema: JsonSchema.JSONSchema = {
			type: 'array',
			items: [
				{
					type: 'integer'
				},
				{
					type: 'boolean'
				},
				{
					type: 'string'
				}
			]
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('["string", 1, true]');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 3);

		doc = YamlParser.parse('[1, true, "string", "another", 42]');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);
	});

	test('additionalItems', function () {

		var doc = YamlParser.parse('[1, true, "string"]');

		var schema: JsonSchema.JSONSchema = {
			type: 'array',
			items: [
				{
					type: 'integer'
				},
				{
					type: 'boolean'
				},
				{
					type: 'string'
				}
			],
			additionalItems: false
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('[1, true, "string", 42]');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('multipleOf', function () {

		var doc = YamlParser.parse('[42]');

		var schema: JsonSchema.JSONSchema = {
			type: 'array',
			items: {
				type: 'integer',
				multipleOf: 2
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('[43]');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('dependencies with array', function () {

		var doc = YamlParser.parse('{"a":true, "b":42}');

		var schema: JsonSchema.JSONSchema = {
			type: 'object',
			properties: {
				a: {
					type: 'boolean'
				}
			},
			dependencies: {
				a: ['b']
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"a":true}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('dependencies with schema', function () {

		var doc = YamlParser.parse('{"a":true, "b":42}');

		var schema: JsonSchema.JSONSchema = {
			type: 'object',
			properties: {
				a: {
					type: 'boolean'
				}
			},
			dependencies: {
				a: {
					properties: {
						b: {
							type: 'integer'
						}
					}
				}
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"a":true}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"a":true, "b": "string"}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('type as array', function () {

		var doc = YamlParser.parse('{"prop": 42}');

		var schema: JsonSchema.JSONSchema = {
			type: 'object',
			properties: {
				'prop': {
					type: ['number', 'string']
				}
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop": "string"}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 0);

		doc = YamlParser.parse('{"prop": true}');
		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('deprecated', function () {

		var doc = YamlParser.parse('{"prop": 42}');

		var schema: JsonSchema.JSONSchema = {
			type: 'object',
			properties: {
				'prop': {
					deprecationMessage: "Prop is deprecated"
				}
			}
		};

		doc.validate(schema);

		assert.strictEqual(doc.errors.length, 0);
		assert.strictEqual(doc.warnings.length, 1);
	});

	test('Strings with spaces', function () {

		var result = YamlParser.parse('{"key1":"first string", "key2":["second string"]}');
		assert.strictEqual(result.errors.length, 0);

		var node = result.getNodeFromOffset(9);
		assert.strictEqual(node.getValue(), 'first string');

		node = result.getNodeFromOffset(34);
		assert.strictEqual(node.getValue(), 'second string');

	});

	test('Schema information on node', function () {

		var result = YamlParser.parse('{"key":42}');
		assert.strictEqual(result.errors.length, 0);

		var schema: JsonSchema.JSONSchema = {
			type: 'object',
			properties: {
				'key': {
					oneOf: [{
						type: 'number',
						description: 'this is a number'
					}, {
						type: 'string',
						description: 'this is a string'
					}]
				}
			}
		};

		var matchingSchemas: Parser.IApplicableSchema[] = [];
		result.validate(schema, matchingSchemas);

		var node = result.getNodeFromOffset(7);
		assert.strictEqual(node.type, 'number');
		assert.strictEqual(node.getValue(), 42);

		var schemas = matchingSchemas.filter((s) => s.node === node && !s.inverted).map((s) => s.schema);

		assert.ok(Array.isArray(schemas));
		// 0 is the most specific schema,
		// 1 is the schema that contained the "oneOf" clause,
		assert.strictEqual(schemas.length, 2);
		assert.strictEqual(schemas[0].description, 'this is a number');
	});

	test('parse with comments', function () {

		function parse<T>(v: string): T {
			var result = YamlParser.parse(v);
			assert.equal(result.errors.length, 0);
			return <T>result.root.getValue();
		}

		var value = parse<{ far: string; }>('# comment\n{\n"far": "boo"\n}');
		assert.equal(value.far, 'boo');

		var value = parse<{ far: string; }>('# comm\n#ent\n#ent \n{\n"far": "boo"\n}');
		assert.equal(value.far, 'boo');

		var value = parse<{ far: string; }>('{\n"far": "boo"\n}');
		assert.equal(value.far, 'boo');

	});

	test('parse with comments disabled', function () {
		// This is testing that YAML does not support these comment types.
		function assertParse(v: string, expectedErrors: number): void {
			var result = YamlParser.parse(v);
			assert.equal(result.errors.length, expectedErrors);
		}

		assertParse('// comment\n{\n"far": "boo"\n}', 3);
		assertParse('/* comm\nent\nent */\n{\n"far": "boo"\n}', 3);
		assertParse('{\n"far": "boo"\n}', 0);
	});

	suite('anchor references', () => {
		test('expands reference', function () {
			isValid('- foo: &ref 5\n- bar: *ref')

			const result = YamlParser.parse('- foo: &ref 5\n- bar: *ref').root
			const expected = YamlParser.parse('- foo:     5\n- bar:    5').root

			assert.deepStrictEqual(result.getValue(), expected.getValue())
		})

		test('errors on missing reference', function () {
			isInvalid('- bar: *foo')
			isInvalid('- foo: &ref 5\n- bar: *re')
		})
	})

});
