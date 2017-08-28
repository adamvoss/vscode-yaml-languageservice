import { TextDocument, Range, FormattingOptions, TextEdit } from 'vscode-languageserver-types';
export declare function format(document: TextDocument, range: Range, options: FormattingOptions): TextEdit[];
