"use strict"

import * as DF from '../date-format.js';
import * as TEST_COMMON from './test-common.js';

const now =  (new Date()).getTime() / 1000;

const printNow = (utc) => {
    console.log('utc = ' + utc);
    // S: 毫秒
    // q: 季度
    // w: 星期
    console.log(DF.timestampToString(now, 'yyyy-MM-dd hh:mm:ss S q w', utc));
};

printNow(false);
printNow(true);

const ts = 1705564686;
TEST_COMMON.assert(DF.fromRfc3339(DF.toRfc3339(ts)) == ts,  'fromRfc3339 test failed!!!');
console.log('Test passed');