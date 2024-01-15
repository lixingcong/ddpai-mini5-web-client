"use strict"

import * as UTILS from '../utils.js';

const split = () => console.log('------------------------');

console.log('meterToString(0)='+UTILS.meterToString(0));
console.log('meterToString(1)='+UTILS.meterToString(1));
console.log('meterToString(10)='+UTILS.meterToString(10));
console.log('meterToString(100)='+UTILS.meterToString(100));
console.log('meterToString(1000)='+UTILS.meterToString(1000));
console.log('meterToString(1234)='+UTILS.meterToString(1234));
console.log('meterToString(12340)='+UTILS.meterToString(12340));
split();

console.log('intWidth(0)='+UTILS.intWidth(0));
console.log('intWidth(1)='+UTILS.intWidth(1));
console.log('intWidth(10)='+UTILS.intWidth(10));
console.log('intWidth(200)='+UTILS.intWidth(200));
console.log('intWidth(2000)='+UTILS.intWidth(2000));
split();

console.log('secondToHumanReadableString(0)='+UTILS.secondToHumanReadableString(0));
console.log('secondToHumanReadableString(1)='+UTILS.secondToHumanReadableString(1));
console.log('secondToHumanReadableString(59)='+UTILS.secondToHumanReadableString(59));
console.log('secondToHumanReadableString(590)='+UTILS.secondToHumanReadableString(590));
console.log('secondToHumanReadableString(5900)='+UTILS.secondToHumanReadableString(5900));
console.log('secondToHumanReadableString(59000)='+UTILS.secondToHumanReadableString(59000));
split();

console.log('byteToHumanReadableSize(0)='+UTILS.byteToHumanReadableSize(0));
console.log('byteToHumanReadableSize(1)='+UTILS.byteToHumanReadableSize(1));
console.log('byteToHumanReadableSize(11)='+UTILS.byteToHumanReadableSize(11));
console.log('byteToHumanReadableSize(111)='+UTILS.byteToHumanReadableSize(111));
console.log('byteToHumanReadableSize(1111)='+UTILS.byteToHumanReadableSize(1111));
console.log('byteToHumanReadableSize(1025)='+UTILS.byteToHumanReadableSize(1025));
console.log('byteToHumanReadableSize(10000)='+UTILS.byteToHumanReadableSize(10000));
console.log('byteToHumanReadableSize(9000000)='+UTILS.byteToHumanReadableSize(9000000));
split();

console.log('isObjectEmpty(null)='+UTILS.isObjectEmpty(null));
console.log('isObjectEmpty({})='+UTILS.isObjectEmpty({}));
console.log('isObjectEmpty(new Object())='+UTILS.isObjectEmpty(new Object()));
console.log('isObjectEmpty({2:23})='+UTILS.isObjectEmpty({2:23}));
console.log('isObjectEmpty([])='+UTILS.isObjectEmpty([]));
console.log('isObjectEmpty([3,4,5])='+UTILS.isObjectEmpty([3,4,5]));
split();

console.log('zeroPad(5,0)='+UTILS.zeroPad(5,0));
console.log('zeroPad(5,1)='+UTILS.zeroPad(5,1));
console.log('zeroPad(5,2)='+UTILS.zeroPad(5,2));
console.log('zeroPad(5,3)='+UTILS.zeroPad(5,3));
console.log('zeroPad(15,0)='+UTILS.zeroPad(15,0));
console.log('zeroPad(15,1)='+UTILS.zeroPad(15,1));
console.log('zeroPad(15,2)='+UTILS.zeroPad(15,2));
console.log('zeroPad(15,3)='+UTILS.zeroPad(15,3));
split();

const timestamps  = [0,1,2,5,6,9,13,14,15,17,20,23,26,27,31,35,36];
console.log('splitOrderedNumbersByThreshold(): original array:');
console.log(timestamps);
[0,1,2,3,4].forEach(i => {
    process.stdout.write('splitOrderedNumbersByThreshold('+i+'):');
    console.log(UTILS.splitOrderedNumbersByThreshold(timestamps, i));
});
