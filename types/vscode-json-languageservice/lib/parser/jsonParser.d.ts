import Json = require('jsonc-parser');
import { JSONSchema } from '../jsonSchema';
export interface IRange {
    start: number;
    end: number;
}
export declare enum ErrorCode {
    Undefined = 0,
    EnumValueMismatch = 1,
    CommentsNotAllowed = 2,
    UnexpectedEndOfComment = 257,
    UnexpectedEndOfString = 258,
    UnexpectedEndOfNumber = 259,
    InvalidUnicode = 260,
    InvalidEscapeCharacter = 261,
    InvalidCharacter = 262,
}
export interface IError {
    location: IRange;
    code?: ErrorCode;
    message: string;
}
export declare class ASTNode {
    start: number;
    end: number;
    type: string;
    parent: ASTNode;
    location: Json.Segment;
    constructor(parent: ASTNode, type: string, location: Json.Segment, start: number, end?: number);
    getPath(): Json.JSONPath;
    getChildNodes(): ASTNode[];
    getLastChild(): ASTNode;
    getValue(): any;
    contains(offset: number, includeRightBound?: boolean): boolean;
    toString(): string;
    visit(visitor: (node: ASTNode) => boolean): boolean;
    getNodeFromOffset(offset: number): ASTNode;
    getNodeFromOffsetEndInclusive(offset: number): ASTNode;
    validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: IApplicableSchema[], offset?: number): void;
}
export declare class NullASTNode extends ASTNode {
    constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number);
    getValue(): any;
}
export declare class BooleanASTNode extends ASTNode {
    private value;
    constructor(parent: ASTNode, name: Json.Segment, value: boolean, start: number, end?: number);
    getValue(): any;
}
export declare class ArrayASTNode extends ASTNode {
    items: ASTNode[];
    constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number);
    getChildNodes(): ASTNode[];
    getLastChild(): ASTNode;
    getValue(): any;
    addItem(item: ASTNode): boolean;
    visit(visitor: (node: ASTNode) => boolean): boolean;
    validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: IApplicableSchema[], offset?: number): void;
}
export declare class NumberASTNode extends ASTNode {
    isInteger: boolean;
    value: number;
    constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number);
    getValue(): any;
    validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: IApplicableSchema[], offset?: number): void;
}
export declare class StringASTNode extends ASTNode {
    isKey: boolean;
    value: string;
    constructor(parent: ASTNode, name: Json.Segment, isKey: boolean, start: number, end?: number);
    getValue(): any;
    validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: IApplicableSchema[], offset?: number): void;
}
export declare class PropertyASTNode extends ASTNode {
    key: StringASTNode;
    value: ASTNode;
    colonOffset: number;
    constructor(parent: ASTNode, key: StringASTNode);
    getChildNodes(): ASTNode[];
    getLastChild(): ASTNode;
    setValue(value: ASTNode): boolean;
    visit(visitor: (node: ASTNode) => boolean): boolean;
    validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: IApplicableSchema[], offset?: number): void;
}
export declare class ObjectASTNode extends ASTNode {
    properties: PropertyASTNode[];
    constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number);
    getChildNodes(): ASTNode[];
    getLastChild(): ASTNode;
    addProperty(node: PropertyASTNode): boolean;
    getFirstProperty(key: string): PropertyASTNode;
    getKeyList(): string[];
    getValue(): any;
    visit(visitor: (node: ASTNode) => boolean): boolean;
    validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: IApplicableSchema[], offset?: number): void;
}
export interface JSONDocumentConfig {
    ignoreDanglingComma?: boolean;
    disallowComments?: boolean;
}
export interface IApplicableSchema {
    node: ASTNode;
    inverted?: boolean;
    schema: JSONSchema;
}
export declare class ValidationResult {
    errors: IError[];
    warnings: IError[];
    propertiesMatches: number;
    propertiesValueMatches: number;
    enumValueMatch: boolean;
    mismatchedEnumValues: any[];
    constructor();
    hasErrors(): boolean;
    mergeAll(validationResults: ValidationResult[]): void;
    merge(validationResult: ValidationResult): void;
    mergeEnumValueMismatch(validationResult: ValidationResult): void;
    mergePropertyMatch(propertyValidationResult: ValidationResult): void;
    compare(other: ValidationResult): number;
}
export declare class JSONDocument {
    root: ASTNode;
    private validationResult;
    constructor(config: JSONDocumentConfig);
    readonly errors: IError[];
    readonly warnings: IError[];
    getNodeFromOffset(offset: number): ASTNode;
    getNodeFromOffsetEndInclusive(offset: number): ASTNode;
    visit(visitor: (node: ASTNode) => boolean): void;
    validate(schema: JSONSchema, matchingSchemas?: IApplicableSchema[], offset?: number): void;
}
export declare function parse(text: string, config?: JSONDocumentConfig): JSONDocument;
