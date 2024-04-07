import * as TRACK from '../track.js'
import * as KML from '../kml.js';
import * as GPX from '../gpx.js'
import * as HOOK from '../trackfile-hook-sample.js';
import * as TEST_COMMON from './test-common.js';

const Filename = '/tmp/20240404-1033到1204.kml';

let ContentToTrackFile = undefined;
let TrackFileToContent = undefined;

const FilenameLowercase = Filename.toLowerCase();
let fileExtName = undefined;
if(FilenameLowercase.endsWith('kml')){
    ContentToTrackFile = (content) => TRACK.TrackFile.fromKMLDocument(KML.Document.fromFile(content))
    TrackFileToContent = (trackFile) => trackFile.toKMLDocument().toFile(true)
    fileExtName='kml';
}else if(FilenameLowercase.endsWith('gpx')){
    ContentToTrackFile = (content) => TRACK.TrackFile.fromGPXDocument(GPX.Document.fromFile(content))
    TrackFileToContent = (trackFile) => trackFile.toGPXDocument().toFile(true)
    fileExtName='gpx';
}else
    TEST_COMMON.assert(false, 'Invalid file format');


TEST_COMMON.readFile(Filename, content => {
    let trackFile = ContentToTrackFile(content);

    HOOK.timeShift(trackFile);

    let newContent = TrackFileToContent(trackFile);
    TEST_COMMON.writeFile('/tmp/out-000000.'+fileExtName, newContent);
});
