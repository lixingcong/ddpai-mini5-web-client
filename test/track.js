import * as TRACK from '../track.js';
import * as WP from '../waypoint.js';
import * as TEST_COMMON from './test-common.js';

let track = new TRACK.TrackFile('DocName');

if(1){
    track.points = [
        new TRACK.Point('Point 1', new WP.WayPoint(22.1234, 114.1234)),
        new TRACK.Point('Point 2', new WP.WayPoint(22.1235, 114.1235))
    ];
}

if(1){
    track.lines = [
        new TRACK.Path('Line 1', [
            new WP.WayPoint(22.1236, 114.1236),
            new WP.WayPoint(22.1237, 114.1237),
            new WP.WayPoint(22.1238, 114.1238)
        ]),
        new TRACK.Path('Line 2', [
            new WP.WayPoint(22.1246, 114.1236),
            new WP.WayPoint(22.1247, 114.1237),
            new WP.WayPoint(22.1248, 114.1238)
        ])
    ];
}

if(1){
    let timestamp = 1705575812;

    track.tracks = [
        new TRACK.Path('Track 1', [
            new WP.WayPoint(22.1236, 114.1236, timestamp++, 30),
            new WP.WayPoint(22.1237, 114.1237, timestamp++),
            new WP.WayPoint(22.1238, 114.1238, timestamp++, 39)
        ]),
        new TRACK.Path('Track 2', [
            new WP.WayPoint(22.1246, 114.1236, timestamp++, 41),
            new WP.WayPoint(22.1247, 114.1237, timestamp++, 42),
            new WP.WayPoint(22.1248, 114.1238, timestamp++)
        ])
    ];
}

if(1){
    // KML
    const kmlDoc= track.toKMLDocument();
    //console.log(kmlDoc);
    TEST_COMMON.writeFile('/tmp/track-1.kml', kmlDoc.toFile(true));

    const trackFromDoc = TRACK.TrackFile.fromKMLDocument(kmlDoc);
    //console.log(trackFromDoc);
    TEST_COMMON.writeFile('/tmp/track-2.kml', trackFromDoc.toKMLDocument().toFile(true));
}

if(1){
    // GPX
    const gpxDoc = track.toGPXDocument();
    // console.log(gpxDoc);
    TEST_COMMON.writeFile('/tmp/track-1.gpx', gpxDoc.toFile(true));

    const trackFromDoc = TRACK.TrackFile.fromGPXDocument(gpxDoc);
    //console.log(trackFromDoc);
    TEST_COMMON.writeFile('/tmp/track-2.gpx', trackFromDoc.toGPXDocument().toFile(true));
}