%macro deployer
    dataSize(sub_0)
    dataOffset(sub_0)
    0x00
    codecopy
    dataSize(sub_0)
    0x00
    return
    stop

    sub_0: assembly {
        %content
    }
%endmacro

%macro calld
    calldatasize
    0x00
    %0
    calldatacopy
%endmacro
