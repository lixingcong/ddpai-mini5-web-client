"use strict"

import * as fs from 'fs';

export {
    writeFile,
    readFile,
    isObjectEqual,
    assert
};

const writeFile = (path, content, callback) => {
    fs.writeFile(path, content, (error) => {
        let s = 'writeFile(' + path + '): ';

        if(error)
            s += 'Error: ' + error;
        else
            s += 'OK';

        console.log(s);

        if(!error && undefined != callback)
            callback(content);
    });
};

const readFile = (path, callback) => {
    fs.readFile(path, 'utf-8', (error, content) =>{
        let s = 'readFile(' + path + '): ';

        if(error)
            s += 'Error: ' + error;
        else
            s += 'OK';

        console.log(s);

        if(!error && undefined != callback)
            callback(content);
    });
};

const isObjectEqual = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
};

const assert = (cond, info) => {
    if(!cond) {
        console.error('Test failed: '+info);
        process.exit(-1);
    }
}