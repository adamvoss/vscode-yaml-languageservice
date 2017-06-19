import assert = require('assert');

import * as calc from '../documentPositionCalculator'

suite('Document Position Calculator', () => {

    suite('Binary Search', () => {

        test('finds proper index', function () {
            const array = [9, 8, 7, 3, 21, 34, 5].sort((a, b) => a - b)

            assert.strictEqual(calc.binarySearch(array, 5), 1)
        })

        test('insertion point array end', function () {
            const array = [1, 2, 3].sort()

            assert.strictEqual(calc.binarySearch(array, 4), calc.insertionPointReturnValue(3))
        })

        test('insertion point mid-array', function () {
            const array = [1, 2, 3].sort()

            assert.strictEqual(calc.binarySearch(array, 2.5), calc.insertionPointReturnValue(2))
        })
    })

    suite('getLineStartPositions', () => {
        test('only newline', function () {
            const result = calc.getLineStartPositions('\n')
            assert.deepStrictEqual(result, [0, 1])
        })

        test('simple multiline string', function () {
            const str = "Hello\n" +
                "Enthusiastic\r\n" +
                "Reader!";

            assert.deepStrictEqual(calc.getLineStartPositions(str), [0, 6, 20])
        })
    })

    suite('getPosition', () =>{
        test('simple multiline string', function () {
            const str = "Hello\n" +
                "Enthusiastic\r\n" +
                "Reader!";
            const starts = calc.getLineStartPositions(str);

            function positionLineColumn(pos, line, column){
                assert.deepStrictEqual(calc.getPosition(pos, starts), {line, column})
            }

            positionLineColumn(0,0,0)
            positionLineColumn(6,1,0)
            positionLineColumn(7,1,1)
            positionLineColumn(12,1,6)
            positionLineColumn(22,2,2)
        })
    })
})