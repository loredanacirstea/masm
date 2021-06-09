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
]

module.exports = tests;
