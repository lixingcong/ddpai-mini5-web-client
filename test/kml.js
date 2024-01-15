"use strict"

import * as KML from '../kml.js';
import * as TEST_COMMON from './test-common.js';

const decimal = 6;

let singleTrack = KML.head('SingleTrack')
	+ KML.placemarkHead('MyPOI', 'Desciption')
	+ KML.placemarkPoint(22.688959, 113.918788, decimal)
	+ KML.placemarkTail()
	+ KML.placemarkHead('MyTrack', 'Desciption', KML.StyleId.Track)
	+ KML.trackHead()
	+ KML.altitudeMode(KML.AltitudeMode.Absolute)
	+ KML.trackCoord(22.688959, 113.918788, 61, decimal, 1704959902)
	+ KML.trackCoord(22.689038, 113.918698, 60,        decimal, 1704959903)
	+ KML.trackCoord(22.689110, 113.918616, undefined, decimal, 1704959904)
	+ KML.trackCoord(22.689158, 113.918491, 58       , decimal, 1704959905)
	+ KML.trackTail()
	+ KML.placemarkTail()
	+ KML.placemarkHead('MyLineString', 'Desciption', KML.StyleId.Line)
	+ KML.lineStringHead()
	+ KML.lineStringCoord(22.689059, 113.918788, decimal)
	+ KML.lineStringCoord(22.689138, 113.918698, decimal)
	+ KML.lineStringCoord(22.689210, 113.918616, decimal)
	+ KML.lineStringCoord(22.689358, 113.918491, decimal)
	+ KML.lineStringTail()
	+ KML.placemarkTail()
	+ KML.tail();

// Write
TEST_COMMON.writeFile('/tmp/0000000-SingleTrack.kml', singleTrack);

let multiTrack = KML.head('MultiTrack')
	+ KML.placemarkHead('MyTrack', 'Desciption', KML.StyleId.Track)
	+ KML.multiTrackHead()
	+ KML.altitudeMode()
	+ KML.trackHead()
	+ KML.trackCoord(22.688959, 113.918788, undefined, decimal, 1704959902)
	+ KML.trackCoord(22.690038, 113.918698, undefined, decimal, 1704959903)
	+ KML.trackCoord(22.691110, 113.918616, 10,        decimal, 1704959904)
	+ KML.trackCoord(22.692158, 113.918491, 10,        decimal, 1704959905)
	+ KML.trackTail()
	+ KML.trackHead()
	+ KML.trackCoord(22.714165, 113.901165, undefined, decimal, 1704959932)
	+ KML.trackCoord(22.715059, 113.901159, 10,        decimal, 1704959933)
	+ KML.trackCoord(22.716950, 113.901150, undefined, decimal, 1704959934)
	+ KML.trackCoord(22.717844, 113.901140, 20,        decimal, 1704959935)
	+ KML.trackTail()
	+ KML.multiTrackTail()
	+ KML.placemarkTail()
	+ KML.tail();

// Write
TEST_COMMON.writeFile('/tmp/0000000-MultiTrack.kml', multiTrack);