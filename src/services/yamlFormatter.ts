'use strict';

import jsyaml = require('js-yaml')
import { TextDocument, Range, Position, FormattingOptions, TextEdit } from 'vscode-languageserver-types';

export function format(document: TextDocument, options: FormattingOptions): TextEdit[] {
    const text = document.getText()

    const yaml = jsyaml.load(text)
    const newText = jsyaml.safeDump(yaml, { indent: options.tabSize })

    return [TextEdit.replace(Range.create(Position.create(0, 0), document.positionAt(text.length)), newText)]
}