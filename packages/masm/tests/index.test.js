const fs = require('fs');
const matchAll = require('string.prototype.matchall');
const masm = require('../src/index');
const tests = require('./data');

matchAll.shim();
const macros = fs.readFileSync('./src/macros/macros.masm', {encoding:'utf8'});

describe('compile', function () {
    tests.forEach((t, i) => {
        test('compile_' + i, async () => {
            const result = await masm.compile(t.source, macros);
            expect(trimallspace(result)).toBe(trimallspace(t.result));
        });
    });
});

function trimallspace(source) {
    return source.replace(/\s*/g, '');
}
