"use strict"

import * as GPX from '../gpx.js';
import * as TEST_COMMON from './test-common.js';

let document = new GPX.Document('DocName');

if(1){
    document.wpts.push(new GPX.Wpt('Point 1',22.8820573, 114.5768273, undefined, 123));
    document.wpts.push(new GPX.Wpt('Point 2',22.8821573, 114.5769273, 567, undefined));
}

if(1){
    document.rtes.push(new GPX.Rte('Route 1', [
        new GPX.Rtept(22.8820573, 114.5768273, 10),
        new GPX.Rtept(22.8821573, 114.5769273, 12),
        new GPX.Rtept(22.8822573, 114.5770273, 13),
        new GPX.Rtept(22.8823573, 114.5771273, 14)
    ]));

    document.rtes.push(new GPX.Rte('Route 2', [
        new GPX.Rtept(23.8825573, 114.5771273),
        new GPX.Rtept(22.8826573, 114.5772273),
        new GPX.Rtept(22.8827573, 114.5773273),
        new GPX.Rtept(22.8828573, 114.5774273)
    ]));
}

if(1){
    {
        const trk=new GPX.Trk('Track 1', [
            new GPX.Trkseg([
                new GPX.Trkpt(22.785665, 114.1690076, 1244, 10),
                new GPX.Trkpt(22.785675, 114.1690086, 1245, 11),
                new GPX.Trkpt(22.785685, 114.1690096, 1246, 12),
                new GPX.Trkpt(22.785695, 114.1690106, 1247, undefined)
            ]),
            new GPX.Trkseg([
                new GPX.Trkpt(22.785696, 114.1690076, 1250, 13),
                new GPX.Trkpt(22.785697, 114.1690085, 1251, undefined),
                new GPX.Trkpt(22.785698, 114.1690094, 1252, undefined),
                new GPX.Trkpt(22.785699, 114.1690103, 1253, 11)
            ])
        ]);
        document.trks.push(trk);
    }

    {
        const trk=new GPX.Trk('Track 2', [
            new GPX.Trkseg([
                new GPX.Trkpt(22.785705, 114.1691076, 1234),
                new GPX.Trkpt(22.785715, 114.1691086, 1235),
                new GPX.Trkpt(22.785725, 114.1691096, 1236),
                new GPX.Trkpt(22.785735, 114.1691106, 1237)
            ])
        ]);
        document.trks.push(trk);
    }
}

const content = document.toFile(true);
const documentFromContent = GPX.Document.fromFile(content);
// console.log(content);
// console.log(documentFromContent);
if(TEST_COMMON.isObjectEqual(document, documentFromContent)){
    console.log('GPX.Document.fromFile(): same');
}else{
    console.warn('GPX.Document.toFile() !== GPX.Document.fromFile()');
    TEST_COMMON.writeFile('/tmp/gpx2-diff.gpx', documentFromContent.toFile(true));
}
TEST_COMMON.writeFile('/tmp/gpx2.gpx', content);