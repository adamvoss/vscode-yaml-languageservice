"use strict"

import assert = require('assert');

import { TextDocument } from "vscode-languageserver-types";

import {isInComment} from '../services/yamlCompletion'

suite('Completion', () =>{
    suite('isInComment', () =>{
        test('works', function(){

            const createDoc = (text) => TextDocument.create("testing:file", "yaml", 0, text)


            const testInComment = (text, start, offset) => assert.strictEqual(isInComment(createDoc(text), start, offset ), true)
            const testNotInComment = (text, start, offset) => assert.strictEqual(isInComment(createDoc(text), start, offset ), false)

            testInComment("#This is a comment", 0, 1)
            testInComment("- item #This is a comment after a list", 0, 9)

            testNotInComment("- item #This is a comment after a list", 0, 6)
        })
    })
})