'use strict';

import assert = require('assert');
import YamlParser = require('../parser/yamlParser');


suite("Get Node from Offset", () => {
    test('End Inclusive', () => {
        const str = `outer: 
  inner: 
    `
        const document = YamlParser.parse(str)

        let assertionCount = 1;

        const assertNameAndType = (offset, path: string[], type: string) => {
            const node = document.getNodeFromOffsetEndInclusive(offset);
            assert.deepEqual(node.type, type, `${assertionCount}`)
            assert.deepStrictEqual(node.getPath(), path, `${assertionCount}`)
            assertionCount++;
        }

        assertNameAndType(0, ["outer"], "string")
        assertNameAndType(5, ["outer"], "string")
        assertNameAndType(6, [], "property")
        assertNameAndType(9, [], "property")

        assertNameAndType(10, ["outer", "inner"], "string")
        // TODO: These should both be object
        assertNameAndType(19, [], "property")
        assertNameAndType(21, ["outer"], "property")
    })
})