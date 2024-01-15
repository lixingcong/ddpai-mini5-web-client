"use strict"

import * as fs from 'fs';

export {
    writeFile
};

const writeFile = (path, content) => {
    fs.writeFile(path, content, (error) => {
        let s = 'writeFile(' + path + '): ';

        if(error)
            s += 'Error: ' + error;
        else
            s += 'OK';
        
        console.log(s);
    });
};
