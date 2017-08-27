import "mocha";
import { format } from '../services/yamlFormatter'
import { TextDocument } from 'vscode-languageserver-types';
import assert = require("assert");

suite("YAML Formatter", () => {

  function assertFormatedEqual(input, expected) {
    const document = TextDocument.create('test://test.yaml', 'yaml', 0, input)
    const changes = format(document, { tabSize: 2, insertSpaces: true });
    assert.strictEqual(changes[0].newText, expected)
  }

  test('single document', () => {
    assertFormatedEqual(`- id: 2
  name: An ice sculpture
  "price": 12.5
  tags: ["cold", "ice"]
  dimensions:
    length: 7
    width: 12
    height: 9.5
  warehouseLocation: {latitude: -78.75,     longitude: 20.4}`, `- id: 2
  name: An ice sculpture
  price: 12.5
  tags:
    - cold
    - ice
  dimensions:
    length: 7
    width: 12
    height: 9.5
  warehouseLocation:
    latitude: -78.75
    longitude: 20.4
`)
  })

  test('multiple documents', function () {
    assertFormatedEqual(`%YAML 1.2
---
- id: 2
  name: An ice sculpture
  price: 12.5
  tags:
    - cold
    - ice
  dimensions:
    length: 7
    width: 12
    height: 9.5
  warehouseLocation:
    latitude: -78.75
    longitude: 20.4
...
---
[
  {
    "id": 3,
    "name": "A blue mouse",
    "price": 25.5,
    "dimensions": {
      "length": 3.1,
      "width": 1,
      "height": 1
    },
    "warehouseLocation": {
      "latitude": 54.4,
      "longitude": -32.7
    }
  }
]
...`, `%YAML 1.2
---
- id: 2
  name: An ice sculpture
  price: 12.5
  tags:
    - cold
    - ice
  dimensions:
    length: 7
    width: 12
    height: 9.5
  warehouseLocation:
    latitude: -78.75
    longitude: 20.4
...
---
- id: 3
  name: A blue mouse
  price: 25.5
  dimensions:
    length: 3.1
    width: 1
    height: 1
  warehouseLocation:
    latitude: 54.4
    longitude: -32.7
...
`)
  })
})