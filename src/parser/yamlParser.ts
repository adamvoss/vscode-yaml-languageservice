'use strict';

import { JSONDocumentConfig, JSONDocument, ASTNode, ErrorCode, BooleanASTNode, NullASTNode, ArrayASTNode, NumberASTNode, ObjectASTNode, PropertyASTNode, StringASTNode } from '../../vscode-json-languageservice/src/parser/jsonParser';

import Json = require('jsonc-parser');

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import * as Yaml from 'yaml-ast-parser'
import { Kind } from 'yaml-ast-parser'

function recursivelyBuildAst(parent: ASTNode, node: Yaml.YAMLNode): ASTNode {

	if (!node) {
		return;
	}

	switch (node.kind) {
		case Yaml.Kind.MAP: {
			const instance = <Yaml.YamlMap>node;

			const result = new ObjectASTNode(parent, null, node.startPosition, node.endPosition)
			result.addProperty

			for (const mapping of instance.mappings) {
				result.addProperty(<PropertyASTNode>recursivelyBuildAst(result, mapping))
			}

			return result;
		}
		case Yaml.Kind.MAPPING: {
			const instance = <Yaml.YAMLMapping>node;
			const key = instance.key;

			// Technically, this is an arbitrary node in YAML
			// I doubt we would get a better string representation by parsing it
			const keyNode = new StringASTNode(null, null, true, key.startPosition, key.endPosition);
			keyNode.value = key.value;

			const result = new PropertyASTNode(parent, keyNode)
			result.end = instance.endPosition

			const valueNode = (instance.value) ? recursivelyBuildAst(result, instance.value) : new NullASTNode(parent, key.value, instance.startPosition, instance.endPosition)
			valueNode.location = key.value

			result.setValue(valueNode)

			return result;
		}
		case Yaml.Kind.SEQ: {
			const instance = <Yaml.YAMLSequence>node;

			const result = new ArrayASTNode(parent, null, instance.startPosition, instance.endPosition);

			let count = 0;
			for (const item of instance.items) {
				const itemNode = recursivelyBuildAst(result, item);
				itemNode.location = count++;
				result.addItem(itemNode);
			}

			return result;
		}
		case Yaml.Kind.SCALAR: {
			const instance = <Yaml.YAMLScalar>node;

			const type = determineScalarType(instance)

			// The name is set either by the sequence or the mapping case.
			const name = null;
			const value = instance.value;

			switch (type) {
				case ScalarType.null: {
					return new NullASTNode(parent, name, instance.startPosition, instance.endPosition);
				}
				case ScalarType.bool: {
					return new BooleanASTNode(parent, name, parseYamlBoolean(value), node.startPosition, node.endPosition)
				}
				case ScalarType.int: {
					const result = new NumberASTNode(parent, name, node.startPosition, node.endPosition);
					result.value = parseYamlInteger(value);
					result.isInteger = true;
					return result;
				}
				case ScalarType.float: {
					const result = new NumberASTNode(parent, name, node.startPosition, node.endPosition);
					result.value = parseYamlFloat(value);
					result.isInteger = false;
					return result;
				}
				case ScalarType.string: {
					const result = new StringASTNode(parent, name, false, node.startPosition, node.endPosition);
					result.value = node.value;
					return result;
				}
			}

			break;
		}
		case Yaml.Kind.INCLUDE_REF:
		case Yaml.Kind.ANCHOR_REF: {
			// Issue Warning
			break;
		}
	}


	return undefined;
}

export function parseYamlBoolean(input: string): boolean {
	if (["true", "True", "TRUE"].lastIndexOf(input) >= 0) {
		return true;
	}
	else if (["false", "False", "FALSE"].lastIndexOf(input) >= 0) {
		return false;
	}
	throw `Invalid boolean "${input}"`
}

function safeParseYamlInteger(input: string): number {
	// Use startsWith when es6 methods becomes available
	if (input.lastIndexOf('0o', 0) === 0) {
		return parseInt(input.substring(2), 8)
	}

	return parseInt(input);
}

export function parseYamlInteger(input: string): number {
	const result = safeParseYamlInteger(input)

	if (isNaN(result)) {
		throw `Invalid integer "${input}"`
	}

	return result;
}

export function parseYamlFloat(input: string): number {

	if ([".nan", ".NaN", ".NAN"].lastIndexOf(input) >= 0) {
		return NaN;
	}

	const infinity = /^([-+])?(?:\.inf|\.Inf|\.INF)$/
	const match = infinity.exec(input)
	if (match) {
		return (match[1] === '-') ? -Infinity : Infinity;
	}

	const result = parseFloat(input)

	if (!isNaN(result)) {
		return result;
	}

	throw `Invalid float "${input}"`
}

export enum ScalarType {
	null, bool, int, float, string
}

export function determineScalarType(node: Yaml.YAMLScalar): ScalarType {
	if (node === undefined) {
		return ScalarType.null;
	}

	if (node.doubleQuoted || !node.plainScalar || node['singleQuoted']) {
		return ScalarType.string
	}

	const value = node.value;

	if (["null", "Null", "NULL", "~"].indexOf(value) >= 0) {
		return ScalarType.null;
	}

	if (value === null || value === undefined) {
		return ScalarType.null;
	}

	if (["true", "True", "TRUE", "false", "False", "FALSE"].indexOf(value) >= 0) {
		return ScalarType.bool;
	}

	const base10 = /^[-+]?[0-9]+$/
	const base8 = /^0o[0-7]+$/
	const base16 = /^0x[0-9a-fA-F]+$/

	if (base10.test(value) || base8.test(value) || base16.test(value)) {
		return ScalarType.int;
	}

	const float = /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/
	const infinity = /^[-+]?(\.inf|\.Inf|\.INF)$/
	if (float.test(value) || infinity.test(value) || [".nan", ".NaN", ".NAN"].indexOf(value) >= 0) {
		return ScalarType.float;
	}

	return ScalarType.string;
}

function convertError(e: Yaml.YAMLException) {
	// Subtract 2 because \n\0 is added by the parser (see loader.ts/loadDocuments)
	const bufferLength = e.mark.buffer.length - 2;

	// TODO determine correct positioning.
	return { message: `${e.message}`, location: { start: Math.min(e.mark.position, bufferLength - 1), end: bufferLength, code: ErrorCode.Undefined } }
}

export function parse(text: string, config?: JSONDocumentConfig): JSONDocument {

	let _doc = new JSONDocument(config);
	// This is documented to return a YAMLNode even though the
	// typing only returns a YAMLDocument
	const yamlDoc = <Yaml.YAMLNode>Yaml.safeLoad(text, {})

	_doc.root = recursivelyBuildAst(null, yamlDoc)

	if (!_doc.root) {
		// TODO: When this is true, consider not pushing the other errors.
		_doc.errors.push({ message: localize('Invalid symbol', 'Expected a YAML object, array or literal'), code: ErrorCode.Undefined, location: { start: yamlDoc.startPosition, end: yamlDoc.endPosition } });
	}

	const duplicateKeyReason = 'duplicate key'

	const errors = yamlDoc.errors.filter(e => e.reason !== duplicateKeyReason).map(e => convertError(e))
	const warnings = yamlDoc.errors.filter(e => e.reason === duplicateKeyReason).map(e => convertError(e))

	errors.forEach(e => _doc.errors.push(e));
	warnings.forEach(e => _doc.warnings.push(e));

	return _doc;
}
