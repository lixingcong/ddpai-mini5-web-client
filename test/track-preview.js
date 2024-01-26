"use strict"


import gd from 'node-gd';
//import * as WP from '../waypoint.js';
import * as TRACK from '../track.js';
import * as KML from '../kml.js';
import * as TEST_COMMON from './test-common.js';

const JpgWidth = 1000;
const JpgHeight = 1000;

async function paintPaths(paths, filename){
    const paintPoints = TRACK.paint(paths, JpgWidth, JpgHeight).points;

    let pathPoints = undefined;
    let pathPointsArray = [];
    paintPoints.forEach(paintPoint => {
        if(paintPoint.cmd == TRACK.PaintCmd.TrackStart)
            pathPoints=[];

        pathPoints.push(paintPoint);

        if(paintPoint.cmd == TRACK.PaintCmd.TrackEnd)
            pathPointsArray.push(pathPoints);
    });

    const img = await gd.createTrueColor(JpgWidth, JpgHeight);

    img.colorAllocate(255, 255, 255);
    img.setThickness(5);

    const pathColor=[
        0xff0000,
        0x00ff00,
        0x0000ff,
        0xf0803c,
        0xedf060,
        0x225560
    ];
    pathPointsArray.forEach( (pts,idx) => {img.openPolygon(pts, pathColor[idx % pathColor.length]);});
    await img.savePng(filename, 1);
    img.destroy();
}

TEST_COMMON.readFile('/tmp/1.kml',content => {
    const kml = KML.Document.fromFile(content);
    const track = TRACK.TrackFile.fromKMLDocument(kml);
    if(track.tracks.length>0){
        paintPaths(track.tracks, '/tmp/track.png');
    }
    if(track.lines.length>0){
        paintPaths(track.lines, '/tmp/lines.png');
    }
});