const fs = require('fs');
const matchAll = require('string.prototype.matchall');
const masm = require('../src/index');
const tests_macros = require('./tests_macros');
const tests_mswitch = require('./tests_mswitch');

matchAll.shim();
const macros = fs.readFileSync('./src/macros/macros.masm', {encoding:'utf8'});

describe('test macros', function () {
    tests_macros.forEach((t, i) => {
        test('compile_' + i, async () => {
            const result = await masm.compile(t.source, macros);
            expect(trimallspace(result)).toBe(trimallspace(t.result));
        });
    });
});

describe.only('test mswitch', function () {
    tests_mswitch.forEach((t, i) => {
        t.result.forEach((r, j) => {
            test(`compile_${i}_${j}`, async () => {
                const {source: result, switches} = await masm.compile(t.source, macros, r.params);
                expect(trimallspace(result)).toBe(trimallspace(r.result));
            });
        });
    });
});

function trimallspace(source) {
    return source.replace(/\s*/g, '');
}
