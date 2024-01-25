"use strict"


import gd from 'node-gd';
import * as WP from '../waypoint.js';
import * as TRACK from '../track.js';
import * as KML from '../kml.js';
import * as TEST_COMMON from './test-common.js';

const JpgWidth = 1000;
const JpgHeight = 1000;

async function paintWayPoints(wayPoints, filename){
    let pts = WP.paint(wayPoints, JpgWidth, JpgHeight);
    pts = pts.map(p => {return {x:p[0], y:p[1]}});

    const img = await gd.createTrueColor(JpgWidth, JpgHeight);

    img.colorAllocate(255, 255, 255);
    img.setThickness(5);
    img.openPolygon(pts, 0xff0000);
    await img.savePng(filename, 1);
    img.destroy();
}

TEST_COMMON.readFile('/tmp/1.kml',content => {
    const kml = KML.Document.fromFile(content);
    const track = TRACK.TrackFile.fromKMLDocument(kml);
    if(track.tracks.length>0){
        paintWayPoints(track.tracks[0].wayPoints, '/tmp/xxx.png');
    }
});