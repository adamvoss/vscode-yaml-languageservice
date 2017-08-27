import Parser = require('../parser/jsonParser');
import { SymbolInformation, TextDocument, Range } from 'vscode-languageserver-types';
import { Thenable } from "../jsonLanguageService";
import { IJSONSchemaService } from "./jsonSchemaService";
export declare class JSONDocumentSymbols {
    private schemaService;
    constructor(schemaService: IJSONSchemaService);
    findDocumentSymbols(document: TextDocument, doc: Parser.JSONDocument): SymbolInformation[];
    private getSymbolKind(nodeType);
    findColorSymbols(document: TextDocument, doc: Parser.JSONDocument): Thenable<Range[]>;
}
