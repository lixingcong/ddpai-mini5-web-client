"use strict"

import * as DF from '../date-format.js';

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