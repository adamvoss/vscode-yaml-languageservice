'use strict';

import jsyaml = require('js-yaml')
import {EOL} from 'os'
import { TextDocument, Range, Position, FormattingOptions, TextEdit } from 'vscode-languageserver-types';

export function format(document: TextDocument, options: FormattingOptions): TextEdit[] {
    const text = document.getText()

    const documents = []
    jsyaml.loadAll(text, doc => documents.push(doc))

    let newText;
    if (documents.length == 1) {
        const yaml = documents[0]
        newText = jsyaml.safeDump(yaml, { indent: options.tabSize })
    }
    else{
        const formatted = documents.map(d => jsyaml.safeDump(d, { indent: options.tabSize }))
        newText = '%YAML 1.2' + EOL + '---' + EOL + formatted.join('...' + EOL + '---' + EOL) + '...' + EOL
    }

    return [TextEdit.replace(Range.create(Position.create(0, 0), document.positionAt(text.length)), newText)]
}