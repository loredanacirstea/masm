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
    zeus hermes
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
    },
    {
        source: `
%macro EXTERNAL_MEMORY_OFFSET
    0x160
%endmacro

%macro CONTRACT_ADDRESS
    0x1c0
%endmacro

%macro esstore_zeus
    // value, ptr
    CONTRACT_ADDRESS  // store address
    mload
    EXTERNAL_MEMORY_OFFSET //
    mstore

    EXTERNAL_MEMORY_OFFSET // store storage ptr
    0x20
    add
    mstore  // value

    0x40
    EXTERNAL_MEMORY_OFFSET  //
    keccak256  // value, newptr
    sstore

    0xc0
    // push
    mload
    jump
%endmacro

%macro esstore_hermes
    0x01
    swap2
    log1
%endmacro

%mswitch evmtype
    zeus hermes
%endmswitch

    reset_initial_storage_extra
    swap1
    0x00
    mfor_stack {
        // storage_ptr, tag, end, start
        0x00
        dup5
        mload  // key
        evmtype esstore

        dup4  // pointer to next storage pair
        0x40
        add
        swap4
        pop
    }
reset_initial_storage_extra:
    jump

`,
        result: [
            {
                params: {evmtype: 'zeus'},
                result: `
reset_initial_storage_extra
    swap1
    0x00

for_stack_0:
        dup2   // end
        dup2   // start
        lt
        forloop_stack_0
        jumpi
        pop    // pop end, step
        pop
        jump
    forloop_stack_0:   // any content variables are kept after jumptag, end, step

        // storage_ptr, tag, end, start
        0x00
        dup5
        mload  // key

/* (0) esstore_zeus //   //    */
// value, ptr
    /* (0) CONTRACT_ADDRESS // store address   // store address   */
0x1c0
    mload
    /* (0) EXTERNAL_MEMORY_OFFSET //   //   */
0x160
    mstore

    /* (1) EXTERNAL_MEMORY_OFFSET // store storage ptr   // store storage ptr   */
0x160
    0x20
    add
    mstore  // value

    0x40
    /* (2) EXTERNAL_MEMORY_OFFSET //   //   */
0x160
    keccak256  // value, newptr
    sstore

    0xc0
    // push
    mload
    jump

        dup4  // pointer to next storage pair
        0x40
        add
        swap4
        pop

    forloop_end_stack_0:
        0x01   // start/step first
        add
        for_stack_0
        jump
reset_initial_storage_extra:
    jump
`,
            }
        ]
    }
]

module.exports = tests;
