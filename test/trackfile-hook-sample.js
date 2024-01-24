"use strict"

import * as HOOK from '../trackfile-hook-sample.js'
import * as TRACK from '../track.js';
import * as WP from '../waypoint.js';
import * as TEST_COMMON from './test-common.js';

if(1){
    const track = new TRACK.TrackFile;

    track.lines=[
        new TRACK.Path('Line', [
            new WP.WayPoint(0,0,86400),
            new WP.WayPoint(0,0,86401),
            new WP.WayPoint(0,0,86402)
        ])
    ];

    HOOK.timeShift(track);
    const Expect = [86400,86401,86402].map(x => x - 4 *3600);
    for(let i=0;i<Expect.length;++i)
        TEST_COMMON.assert(track.lines[0].wayPoints[i].timestamp == Expect[i], 'timeShift index='+i);
}

if(1){
    const track = new TRACK.TrackFile;

    track.tracks=[
        new TRACK.Path('Line', [
            new WP.WayPoint(0,0,86400,1),
            new WP.WayPoint(0,0,86400,undefined),
            new WP.WayPoint(0,0,86400,0),
            new WP.WayPoint(0,0,86400,0),
            new WP.WayPoint(0,0,86400,1)
        ])
    ];

    HOOK.clearInvalidAltitude(track);
    const Expect = [1,undefined,undefined,undefined,1];
    for(let i=0;i<Expect.length;++i)
        TEST_COMMON.assert(track.tracks[0].wayPoints[i].altitude == Expect[i], 'clearInvalidAltitude index='+ i);
}

if(1){
    const track = new TRACK.TrackFile;

    const DIV = '<div>你好</div>';
    const DIV2 = '<span>你好</span>'+DIV;
    const DIV_OBJ = {'__cdata':DIV};

    track.points=[
        new TRACK.Point('P1', new WP.WayPoint(0,0), undefined),
        new TRACK.Point('P2', new WP.WayPoint(0,0), DIV_OBJ),
        new TRACK.Point('P3', new WP.WayPoint(0,0), DIV),
        new TRACK.Point('P3', new WP.WayPoint(0,0), DIV2)
    ];
    track.description=DIV;

    HOOK.fixDescription(track);
    const Expect = [undefined, DIV_OBJ, DIV_OBJ, {'__cdata':DIV2}];
    for(let i=0;i<Expect.length;++i)
        TEST_COMMON.assert(TEST_COMMON.isObjectEqual(track.points[i].description , Expect[i]), 'fixDescription index='+i);

    TEST_COMMON.assert(TEST_COMMON.isObjectEqual(track.description, DIV_OBJ), 'fixDescription self')
}

if(1){
    const track = new TRACK.TrackFile;

    const DummyArray = [1,2,3];
    track.points=DummyArray
    track.lines=DummyArray;
    track.tracks=DummyArray;

    HOOK.removeAll(track);
    TEST_COMMON.assert(track.points.length==0, 'removeAll 0');
    TEST_COMMON.assert(track.lines.length==0, 'removeAll 1');
    TEST_COMMON.assert(track.tracks.length==0, 'removeAll 2');
}

if(1){
    const track = new TRACK.TrackFile;

    // lon 0.00001 = 1.11 meter
    // lon 0.0001  = 11.1 meter
    track.lines=[
        new TRACK.Path('P1',[
            new WP.WayPoint(0,0,100),
            new WP.WayPoint(0,0.1,101),
            new WP.WayPoint(0,0.1,102), // will be dropped
            new WP.WayPoint(0,0.10001,103), // will be dropped
            new WP.WayPoint(0,0.10002,104), // will be dropped
            new WP.WayPoint(0,0.1001,105),
            new WP.WayPoint(0,0.10013,106) // should be dropped, but not, because of tail
        ]),
        new TRACK.Path('P2',[
            new WP.WayPoint(1,0,100),
            new WP.WayPoint(1,0.00001,101), // will be dropped
            new WP.WayPoint(1,0.0001,102),
            new WP.WayPoint(1,0.00011,103), // will be dropped
            new WP.WayPoint(1,0.1003,104)
        ])
    ];

    HOOK.sampleByDistance(track);

    const Expect1 = [100,101,105,106];
    const Expect2 = [100,102,104];

    TEST_COMMON.assert(track.lines[0].wayPoints.length == Expect1.length, 'sampleByDistance precheck 1');
    TEST_COMMON.assert(track.lines[1].wayPoints.length == Expect2.length, 'sampleByDistance precheck 2');

    for(let i=0;i<Expect1.length;++i)
        TEST_COMMON.assert(track.lines[0].wayPoints[i].timestamp == Expect1[i], 'sampleByDistance(1) idx='+i);
    for(let i=0;i<Expect2.length;++i)
        TEST_COMMON.assert(track.lines[1].wayPoints[i].timestamp == Expect2[i], 'sampleByDistance(2) idx='+i);
}

if(1){
    const track = new TRACK.TrackFile;

    track.tracks=[
        new TRACK.Path('P1',[
            new WP.WayPoint(0,0,100),
            new WP.WayPoint(0,0,101), // will be dropped
            new WP.WayPoint(0,0,102),
            new WP.WayPoint(0,0,103), // will be dropped
            new WP.WayPoint(0,0,104),
            new WP.WayPoint(0,0,105), // will be dropped
            new WP.WayPoint(0,0,106)
        ]),
        new TRACK.Path('P2',[
            new WP.WayPoint(0,0,200),
            new WP.WayPoint(0,0,201), // will be dropped
            new WP.WayPoint(0,0,204),
            new WP.WayPoint(0,0,206),
            new WP.WayPoint(0,0,207), // will be dropped
            new WP.WayPoint(0,0,210),
            new WP.WayPoint(0,0,211) // should be dropped, but not, because of tail
        ])
    ];

    HOOK.sampleByTimeInterval(track);

    const Expect1 = [100,102,104,106];
    const Expect2 = [200,204,206,210,211];

    TEST_COMMON.assert(track.tracks[0].wayPoints.length == Expect1.length, 'sampleByTimeInterval precheck 1');
    TEST_COMMON.assert(track.tracks[1].wayPoints.length == Expect2.length, 'sampleByTimeInterval precheck 2');

    for(let i=0;i<Expect1.length;++i)
        TEST_COMMON.assert(track.tracks[0].wayPoints[i].timestamp == Expect1[i], 'sampleByTimeInterval(1) idx='+i);
    for(let i=0;i<Expect2.length;++i)
        TEST_COMMON.assert(track.tracks[1].wayPoints[i].timestamp == Expect2[i], 'sampleByTimeInterval(2) idx='+i);
}

if(1){
    const track = new TRACK.TrackFile;

    track.tracks=[
        new TRACK.Path('P1',[
            new WP.WayPoint(0,0,100),
            new WP.WayPoint(0,0,101), // will be dropped
            new WP.WayPoint(0,0,102), // will be dropped
            new WP.WayPoint(0,0,103),
            new WP.WayPoint(0,0,104), // will be dropped
            new WP.WayPoint(0,0,105), // will be dropped
            new WP.WayPoint(0,0,106),
            new WP.WayPoint(0,0,107), // will be dropped
            new WP.WayPoint(0,0,108), // will be dropped
            new WP.WayPoint(0,0,109)
        ])
    ];

    HOOK.sampleByIndexInterval(track);

    const Expect = [100,103,106,109];
    TEST_COMMON.assert(track.tracks[0].wayPoints.length == Expect.length, 'sampleByIndexInterval precheck 1');
    for(let i=0;i<Expect.length;++i)
        TEST_COMMON.assert(track.tracks[0].wayPoints[i].timestamp == Expect[i], 'sampleByIndexInterval idx='+i);
}

console.log('Test passed');