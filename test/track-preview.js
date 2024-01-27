"use strict"


import gd from 'node-gd';
import * as WP from '../waypoint.js';
import * as TRACK from '../track.js';
// import * as KML from '../kml.js';
// import * as TEST_COMMON from './test-common.js';

const fuzzyCompare = (a,b) => Math.abs(a-b) < 0.1;

async function paint(paintResult, jpgWidth, jpgHeight){
    const filename = '/tmp/track-preview-'+jpgWidth+'x'+jpgHeight+'.png';
    const actualDistance = 'distance w='+paintResult.horizontalDistance.toFixed(1)+', h='+paintResult.verticalDistance.toFixed(1);
    console.log(filename+', '+actualDistance);

    let pathPoints = undefined;
    let pathPointsArray = [];
    paintResult.points.forEach(paintPoint => {
        if(paintPoint.cmd == TRACK.PaintCmd.TrackStart)
            pathPoints=[];

        pathPoints.push(paintPoint);

        if(paintPoint.cmd == TRACK.PaintCmd.TrackEnd)
            pathPointsArray.push(pathPoints);
    });

    const img = await gd.createTrueColor(jpgWidth, jpgHeight);

    img.fill(0, 0, 0xb0b0b0);

    const penWidth = Math.ceil(Math.min(jpgWidth,jpgHeight)/200);
    img.setThickness(penWidth);

    // paint rect
    const rectColor = img.colorAllocate(16,199,165);
    img.rectangle(paintResult.topLeft.x, paintResult.topLeft.y,
        paintResult.bottomRight.x, paintResult.bottomRight.y,
        rectColor);

    const pathColor=[
        0x000000,
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

const paths = [
    new TRACK.Path(undefined, [
        new WP.WayPoint(48.7251575, -3.9825900),
        new WP.WayPoint(48.7250778, -3.9825779),
        new WP.WayPoint(48.7249304, -3.9825514),
        new WP.WayPoint(48.7248155, -3.9825237),
        new WP.WayPoint(48.7247609, -3.9825013),
        new WP.WayPoint(48.7246779, -3.9824534),
        new WP.WayPoint(48.7243794, -3.9822469),
        new WP.WayPoint(48.7242453, -3.9821320)
    ]),
    new TRACK.Path(undefined, [
        new WP.WayPoint(48.7233989, -3.9816133),
        new WP.WayPoint(48.7232602, -3.9814227),
        new WP.WayPoint(48.7230069, -3.9809848),
        new WP.WayPoint(48.7228084, -3.9806580),
        new WP.WayPoint(48.7225169, -3.9801481)
    ]),
    new TRACK.Path(undefined, [
        new WP.WayPoint(48.7223222, -3.97623846),
        new WP.WayPoint(48.7223235, -3.97623830),
        new WP.WayPoint(48.7223496, -3.97622406),
        new WP.WayPoint(48.7224516, -3.97617903),
        new WP.WayPoint(48.7225715, -3.97612003),
        new WP.WayPoint(48.7226946, -3.97603824),
        new WP.WayPoint(48.7228045, -3.97591922),
        new WP.WayPoint(48.7228985, -3.97579397),
        new WP.WayPoint(48.7229241, -3.97572779),
        new WP.WayPoint(48.7230278, -3.97556016)
    ])
];

const sizes = [
    [20,20],
    [20,40],
    [40,20],
    [50,50],
    [50,100],
    [100,50],
    [500,500],
    [500,1000],
    [1000,500],
    [1000,1000]
];

sizes.forEach(s => {
    const jpgWidth=s[0];
    const jpgHeight=s[1];
    const paintResult = TRACK.paint(paths, jpgWidth, jpgHeight);
    paint(paintResult, jpgWidth, jpgHeight);
});
