# vscode-yaml-languageservice
YAML language service built on top of [vscode-json-languageservice](https://github.com/Microsoft/vscode-json-languageservice/) and intended for similar usage.  It powers the [YAML language extension for Visual Studio Code](https://github.com/adamvoss/vscode-yaml).

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
Contributions are welcome!  To install dependencies and begin work, run:

```sh
git submodule update --init
./npminstall.sh
```

This depends on internals of [vscode-json-languageservice](https://github.com/Microsoft/vscode-json-languageservice/) so importing its NPM module was not an option.  Therefore, you must use the above commands instead of `npm install`.

## Installation
If this is useful to you, and you would like to see it on NPM, please submit a pull request or open an issue.