const fs = require('fs');
const matchAll = require('string.prototype.matchall');
const masm = require('../src/index');
const tests = require('./data');

matchAll.shim();
const macros = fs.readFileSync('./src/macros/macros.masm');

test('compile', () => {
    const result = masm.compile(tests[0].source, macros);
    expect(trimallspace(result)).toBe(trimallspace(tests[0].result));
});

function trimallspace(source) {
    return source.replace(/\s*/g, '');
}
