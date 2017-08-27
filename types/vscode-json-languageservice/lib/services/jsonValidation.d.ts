import { JSONSchemaService } from './jsonSchemaService';
import { JSONDocument } from '../parser/jsonParser';
import { TextDocument, Diagnostic } from 'vscode-languageserver-types';
import { PromiseConstructor, Thenable, LanguageSettings } from '../jsonLanguageService';
export declare class JSONValidation {
    private jsonSchemaService;
    private promise;
    private validationEnabled;
    private comments;
    constructor(jsonSchemaService: JSONSchemaService, promiseConstructor: PromiseConstructor);
    configure(raw: LanguageSettings): void;
    doValidation(textDocument: TextDocument, jsonDocument: JSONDocument): Thenable<Diagnostic[]>;
}
