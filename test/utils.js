"use strict"

import * as UTILS from '../utils.js';
import * as TEST_COMMON from './test-common.js';

{
    const input = [0,1,10,100,1000,1234,12340];
    const expectOutput = ['0m','1m','10m','100m','1000m','1.2km','12.3km'];
    TEST_COMMON.assert(input.length == expectOutput.length, 'meterToString preCheck');
    input.forEach((i,idx) => {TEST_COMMON.assert(UTILS.meterToString(i) == expectOutput[idx], 'meterToString('+i+')')});
}

{
    const input = [0,1,10,200,2000];
    const expectOutput =[1,1,2,3,4];
    TEST_COMMON.assert(input.length == expectOutput.length, 'intWidth preCheck');
    input.forEach((i,idx) => {TEST_COMMON.assert(UTILS.intWidth(i) == expectOutput[idx], 'intWidth('+i+')')});
}

{
    const input = [0,1,59,590,5900,59000];
    const expectOutput =['0s','1s','59s','9m','1.6h','16.4h'];
    TEST_COMMON.assert(input.length == expectOutput.length, 'secondToHumanReadableString preCheck');
    input.forEach((i,idx) => {TEST_COMMON.assert(UTILS.secondToHumanReadableString(i) == expectOutput[idx], 'secondToHumanReadableString('+i+')')});
}

{
    const input = [0, 1, 11, 111, 1023, 1024, 1025, 1111, 10000, 9000000];
    const expectOutput = ['0B', '1B', '11B', '111B', '1023B', '1.0K', '1.0K', '1.1K', '9.8K', '8.6M'];
    TEST_COMMON.assert(input.length == expectOutput.length, 'byteToHumanReadableSize preCheck');
    input.forEach((i, idx) => { TEST_COMMON.assert(UTILS.byteToHumanReadableSize(i) == expectOutput[idx], 'byteToHumanReadableSize(' + i + ')') });
}

{
    const input = [undefined, null,{},new Object,{2:23},[],[3,4,5]];
    const expectOutput =[true, true, true, true, false, true, false];
    TEST_COMMON.assert(input.length == expectOutput.length, 'isObjectEmpty preCheck');
    input.forEach((i,idx) => {TEST_COMMON.assert(UTILS.isObjectEmpty(i) == expectOutput[idx], 'isObjectEmpty('+i+')')});

}

{
    const input = [[5,0],[5,1],[5,2],[5,4],[15,0],[15,1],[15,2],[15,3]];
    const expectOutput =['5','5','05','0005','15','15','15','015'];
    TEST_COMMON.assert(input.length == expectOutput.length, 'zeroPad preCheck');
    input.forEach((i,idx) => {TEST_COMMON.assert(UTILS.zeroPad(i[0],i[1]) == expectOutput[idx], 'zeroPad('+i+')')});
}

{
    const timestamps  = [0,1,2,5,6,9,13,14,15,17,20,23,26,27,31,35,36];
    const input = [0,1,2,3,4];
    const expectOutput = [
        [timestamps],
        [[0,1,2], [5,6], [9], [13,14,15], [17], [20], [23], [26,27], [31], [35,36]],
        [[0,1,2], [5,6], [9], [13,14,15,17], [20], [23], [26,27], [31], [35,36]],
        [[0,1,2,5,6,9], [13,14,15,17,20,23,26,27], [31], [35,36]],
        [timestamps]
    ];

    TEST_COMMON.assert(input.length == expectOutput.length, 'splitOrderedNumbersByThreshold preCheck');
    input.forEach((i, idx) => {
        const b = TEST_COMMON.isObjectEqual(UTILS.splitOrderedNumbersByThreshold(timestamps, i), expectOutput[idx]);
        TEST_COMMON.assert(b,'splitOrderedNumbersByThreshold('+i+')');
    });
}

console.log('Test passed');
