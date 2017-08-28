# vscode-yaml-languageservice
YAML language service built on top of [vscode-json-languageservice](https://github.com/Microsoft/vscode-json-languageservice/) and intended for similar usage.  It powers the [YAML language extension for Visual Studio Code](https://github.com/adamvoss/vscode-yaml).

[![NPM version](https://img.shields.io/npm/v/vscode-yaml-languageservice.svg)](http://www.npmjs.com/package/vscode-yaml-languageservice)

## Why
To provide a YAML editor experience that has parity with the JSON.

 - *doValidation* analyses an input string and returns syntax and lint errors.
 - *doHover* provides hover text for a given location.
 - *findDocumentSymbols* provides all symbols in the given document
 - *format* formats the code.

The following functionality is incomplete:
 - *doComplete* provides completion proposals for a given location.
 - *doResolve* resolves a completion proposals.

## Contributing
Contributions are welcome!

To install dependencies and begin work, run:

```sh
npm install
```

To run tests:

```
npm test
```

### vscode-json-languageservice type definitions

This depends on internals of [vscode-json-languageservice](https://github.com/Microsoft/vscode-json-languageservice/) where relevant type information is not currently published (see [Microsoft/vscode-json-languageservice#11](https://github.com/Microsoft/vscode-json-languageservice/pull/11)).  To workaround this limitation, external type definitions are used.  When newer type definitions are needed, manually compile **vscode-json-languageservice** locally and copy the resulting type definitions over the definitions in the `types` directory of this project.