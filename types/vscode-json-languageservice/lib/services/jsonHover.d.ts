import Parser = require('../parser/jsonParser');
import SchemaService = require('./jsonSchemaService');
import { JSONWorkerContribution } from '../jsonContributions';
import { PromiseConstructor, Thenable } from '../jsonLanguageService';
import { Hover, TextDocument, Position } from 'vscode-languageserver-types';
export declare class JSONHover {
    private schemaService;
    private contributions;
    private promise;
    constructor(schemaService: SchemaService.IJSONSchemaService, contributions: JSONWorkerContribution[], promiseConstructor: PromiseConstructor);
    doHover(document: TextDocument, position: Position, doc: Parser.JSONDocument): Thenable<Hover>;
}
