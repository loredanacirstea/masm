const tests = [
    {
        source: `
%macro esstore_zeus
    sstore
%endmacro

%macro esload_zeus
    sload
%endmacro

%macro esstore_hermes
    0x01
    swap2
    log1
%endmacro

%macro esload_hermes
    0x02
    swap2
    log1
%endmacro

%mswitch evmtype
    esstore esload
%endmswitch

%mswitch anotherswitch // some comment
    someop
%endmswitch

0x180
0x20
evmtype esstore // some type of comment here

0x180
0x20
evmtype esload
`,
        result: [
            {
                params: {evmtype: 'zeus'},
                result: `
0x180
0x20
 // some type of comment here
/* (0) esstore_zeus //   //    */
sstore

0x180
0x20

/* (0) esload_zeus //   //    */
sload
`
            },
            {
                params: {evmtype: 'hermes'},
                result: `
0x180
0x20
 // some type of comment here
/* (0) esstore_hermes //   //    */
0x01
    swap2
    log1

0x180
0x20

/* (0) esload_hermes //   //    */
0x02
    swap2
    log1

`
            }
        ],
    }
]

module.exports = tests;
