import * as TRACK from '../track.js';
import * as WP from '../waypoint.js';
import * as TEST_COMMON from './test-common.js';

// test perpose
import * as KML from '../kml.js';
import * as GPX from '../gpx.js';
import * as PREVIEW from './track-preview.js';

let track = new TRACK.TrackFile('DocName');
track.description = "Doc description xxx";

if(1){
    track.points = [
        new TRACK.Point('Point 1', new WP.WayPoint(22.1234, 114.1234, 10, 20)),
        new TRACK.Point('Point 2', new WP.WayPoint(22.1235, 114.1235))
    ];
    track.points.forEach((p, idx) => {p.description='Point description '+(1+idx)});
}

if(1){
    track.lines = [
        new TRACK.Path('Line 1', [
            new WP.WayPoint(22.1236, 114.1236, undefined, 10),
            new WP.WayPoint(22.1237, 114.1237, 0, 20),
            new WP.WayPoint(22.1238, 114.1238, 1, 30)
        ]),
        new TRACK.Path('Line 2', [
            new WP.WayPoint(22.1246, 114.1236),
            new WP.WayPoint(22.1247, 114.1237),
            new WP.WayPoint(22.1248, 114.1238)
        ])
    ];
    track.lines.forEach((p, idx) => {p.description='Line description '+(1+idx)});
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
    track.tracks.forEach((p, idx) => {p.description='Track description '+(1+idx)});
}

if(1){
    // KML
    const kmlDoc= track.toKMLDocument();
    const kmlFileContent = kmlDoc.toFile(true);
    // console.log(kmlDoc);

    const trackFromDoc = TRACK.TrackFile.fromKMLDocument(kmlDoc);
    const trackToKmlContent = trackFromDoc.toKMLDocument().toFile(true);
    // console.log(trackFromDoc);

    const same = TEST_COMMON.md5sum(kmlFileContent) == TEST_COMMON.md5sum(trackToKmlContent);
    if (!same) {
        console.error('Save/Load KML');
        TEST_COMMON.writeFile('/tmp/track-1-diff.kml', trackToKmlContent);
    }

    if(0)
        TEST_COMMON.writeFile('/tmp/track-1.kml', kmlFileContent);
}

if(1){
    // GPX
    const gpxDoc = track.toGPXDocument();
    const gpxFileContent = gpxDoc.toFile(true);
    // console.log(gpxDoc);

    const trackFromDoc = TRACK.TrackFile.fromGPXDocument(gpxDoc);
    const trackToGpxContent = trackFromDoc.toGPXDocument().toFile(true);
    //console.log(trackFromDoc);

    const same = TEST_COMMON.md5sum(gpxFileContent) == TEST_COMMON.md5sum(trackToGpxContent)
    if (!same) {
        TEST_COMMON.writeFile('/tmp/track-1-diff.gpx', trackToGpxContent);
        console.error('Save/Load GPX');
    }

    if(0)
        TEST_COMMON.writeFile('/tmp/track-1.gpx', gpxFileContent);
}
