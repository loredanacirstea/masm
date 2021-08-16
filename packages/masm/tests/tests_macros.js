const tests = [
    {
        source: `dataSize(sub_0)
    dataOffset(sub_0)
    0x00
    codecopy
    dataSize(sub_0)
    0x00
    return
    stop
sub_0: assembly {
    0x03e8  // iterations

    tag_ret
    dup2
    0x00
    mfor_stack {
        // tag, end, step

        0x01
        0x00
        mload
        add
        0x00
        mstore
    }
tag_ret:
    0x20
    0x00
    return
}

      `,
        result: `dataSize(sub_0)
    dataOffset(sub_0)
    0x00
    codecopy
    dataSize(sub_0)
    0x00
    return
    stop
sub_0: assembly {
    0x03e8  // iterations

    tag_ret
    dup2
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

        // tag, end, step

        0x01
        0x00
        mload
        add
        0x00
        mstore

    forloop_end_stack_0:
        0x01   // start/step first
        add
        for_stack_0
        jump
tag_ret:
    0x20
    0x00
    return
}

        `
    },
    {
        source: `dataSize(sub_0)
    dataOffset(sub_0)
    0x00
    codecopy
    dataSize(sub_0)
    0x00
    return
    stop
sub_0: assembly {
    0x60
    0x180
    0x0000000000000000000000000000000000000000000000000000000000000001
    mmultisstore  //
}
    `,
        result: `dataSize(sub_0)
    dataOffset(sub_0)
    0x00
    codecopy
    dataSize(sub_0)
    0x00
    return
    stop
sub_0: assembly {
    0x60
    0x180
    0x0000000000000000000000000000000000000000000000000000000000000001
    /* (0) mmultisstore //   //   */
// alloc before using it
            // size_bytes, source_ptr, storage key
            dup3   // size_bytes

            // calc slots
            0x20
            dup2
            div

            0x00
            0x20
            dup4
            mod
            gt
            add

            swap1
            pop

            // end calc slots

            swap3            // slots, source_ptr, key ; replace length with slots
            pop

            swap1
            swap2     // source_ptr, key, slots

            mmultisstore_end_0
            swap1             // source_ptr, key, tag, slots/end
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

                // source_ptr, key, tag, end, step

                dup5
                mload
                dup5
                sstore

                dup5
                0x20
                add
                swap5
                pop

                dup4
                0x01
                add
                swap4
                pop

    forloop_end_stack_0:
        0x01   // start/step first
        add
        for_stack_0
        jump
        mmultisstore_end_0:
            pop
            pop
}`
    },
]

module.exports = tests;
