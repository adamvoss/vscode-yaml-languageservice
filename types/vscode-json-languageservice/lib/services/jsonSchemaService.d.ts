import { JSONSchema } from '../jsonSchema';
import Parser = require('../parser/jsonParser');
import { SchemaRequestService, WorkspaceContextService, PromiseConstructor, Thenable } from '../jsonLanguageService';
export interface IJSONSchemaService {
    /**
     * Registers a schema file in the current workspace to be applicable to files that match the pattern
     */
    registerExternalSchema(uri: string, filePatterns?: string[], unresolvedSchema?: JSONSchema): ISchemaHandle;
    /**
     * Clears all cached schema files
     */
    clearExternalSchemas(): void;
    /**
     * Registers contributed schemas
     */
    setSchemaContributions(schemaContributions: ISchemaContributions): void;
    /**
     * Looks up the appropriate schema for the given URI
     */
    getSchemaForResource(resource: string, document: Parser.JSONDocument): Thenable<ResolvedSchema>;
    /**
     * Returns all registered schema ids
     */
    getRegisteredSchemaIds(filter?: (scheme) => boolean): string[];
}
export interface ISchemaAssociations {
    [pattern: string]: string[];
}
export interface ISchemaContributions {
    schemas?: {
        [id: string]: JSONSchema;
    };
    schemaAssociations?: ISchemaAssociations;
}
export interface ISchemaHandle {
    /**
     * The schema id
     */
    url: string;
    /**
     * The schema from the file, with potential $ref references
     */
    getUnresolvedSchema(): Thenable<UnresolvedSchema>;
    /**
     * The schema from the file, with references resolved
     */
    getResolvedSchema(): Thenable<ResolvedSchema>;
}
export declare class UnresolvedSchema {
    schema: JSONSchema;
    errors: string[];
    constructor(schema: JSONSchema, errors?: string[]);
}
export declare class ResolvedSchema {
    schema: JSONSchema;
    errors: string[];
    constructor(schema: JSONSchema, errors?: string[]);
    getSection(path: string[]): JSONSchema;
    private getSectionRecursive(path, schema);
}
export declare class JSONSchemaService implements IJSONSchemaService {
    private contributionSchemas;
    private contributionAssociations;
    private schemasById;
    private filePatternAssociations;
    private filePatternAssociationById;
    private registeredSchemasIds;
    private contextService;
    private callOnDispose;
    private requestService;
    private promiseConstructor;
    constructor(requestService: SchemaRequestService, contextService?: WorkspaceContextService, promiseConstructor?: PromiseConstructor);
    getRegisteredSchemaIds(filter?: (scheme) => boolean): string[];
    readonly promise: PromiseConstructor;
    dispose(): void;
    onResourceChange(uri: string): boolean;
    private normalizeId(id);
    setSchemaContributions(schemaContributions: ISchemaContributions): void;
    private addSchemaHandle(id, unresolvedSchemaContent?);
    private getOrAddSchemaHandle(id, unresolvedSchemaContent?);
    private getOrAddFilePatternAssociation(pattern);
    registerExternalSchema(uri: string, filePatterns?: string[], unresolvedSchemaContent?: JSONSchema): ISchemaHandle;
    clearExternalSchemas(): void;
    getResolvedSchema(schemaId: string): Thenable<ResolvedSchema>;
    loadSchema(url: string): Thenable<UnresolvedSchema>;
    resolveSchemaContent(schemaToResolve: UnresolvedSchema, schemaURL: string): Thenable<ResolvedSchema>;
    getSchemaForResource(resource: string, document: Parser.JSONDocument): Thenable<ResolvedSchema>;
    private createCombinedSchema(resource, schemaIds);
}
