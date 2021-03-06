"use strict"

function kmlHead(docName, folderName) {
	return '\
<?xml version="1.0" encoding="UTF-8"?>\n\
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">\n\
<Document><name>'+ docName + '</name>\n\
<Style id="LineStyle"><LineStyle><color>C8FF963A</color><width>5</width></LineStyle></Style>\n\
<Style id="TrackStyle"><LineStyle><color>C8FF3399</color><width>5</width></LineStyle></Style>\n\
<Folder><name>'+ folderName + '</name>\n';
}

function kmlTail() {
	return '</Folder></Document></kml>';
}

function kmlPlacemarkHead(name, description, styleId) {
	let s = '<Placemark><name>' + name + '</name><description>' + description + '</description>\n';
	if (styleId)
		s += '<styleUrl>#' + styleId + '</styleUrl>';
	return s;
}

function kmlPlacemarkTail() {
	return '</Placemark>\n';
}

function kmlPlacemarkPoint(lat, lon, precision) {
	return '<Point><coordinates>' + lon.toFixed(precision) + ',' + lat.toFixed(precision) + '</coordinates></Point>\n';
}

function kmlTrackHead() {
	return '<gx:Track><altitudeMode>absolute</altitudeMode>\n';
}

function kmlTrackTail() {
	return '</gx:Track>\n'
}

function kmlMultiTrackHead(interpolate) {
	return '<gx:MultiTrack><altitudeMode>absolute</altitudeMode><gx:interpolate>' + (interpolate ? 1 : 0) + '</gx:interpolate>\n';
}

function kmlMultiTrackTail() {
	return '</gx:MultiTrack>\n'
}

function kmlTrackCoord(lat, lon, alt, precision, timeStr) {
	return '<when>' + timeStr + '</when><gx:coord>' + lon.toFixed(precision) + ' ' + lat.toFixed(precision) + ' ' + alt.toFixed(1) + '</gx:coord>\n';
}

function kmlLineStringHead() {
	return '<LineString><coordinates>\n'
}

function kmlLineStringCoord(lat, lon, precision, appendSpace) {
	let s = lon.toFixed(precision) + ',' + lat.toFixed(precision);
	if (appendSpace)
		s += ' ';
	return s;
}

function kmlLineStringTail() {
	return '</coordinates></LineString>\n'
}

/* for test only 1 */
// let kmlSingleTrack = kmlHead('SingleTrack', 'FolderName')
// 	+ kmlPlacemarkHead('MyPOI', 'POI description')
// 	+ kmlPlacemarkPoint(22.688959, 113.918788, 6)
// 	+ kmlPlacemarkTail()
// 	+ kmlPlacemarkHead('MyTrack', 'No', 'TrackStyle')
// 	+ kmlTrackHead()
// 	+ kmlTrackCoord(22.688959, 113.918788, 0, 6, '2021-01-01T12:00:00Z')
// 	+ kmlTrackCoord(22.689038, 113.918698, 0, 6, '2021-01-01T12:00:01Z')
// 	+ kmlTrackCoord(22.689110, 113.918616, 0, 6, '2021-01-01T12:00:02Z')
// 	+ kmlTrackCoord(22.689158, 113.918491, 0, 6, '2021-01-01T12:00:03Z')
// 	+ kmlTrackTail()
// 	+ kmlPlacemarkTail()
// 	+ kmlPlacemarkHead('MyLineString', 'No', 'LineStyle')
// 	+ kmlLineStringHead()
// 	+ kmlLineStringCoord(22.688959, 113.918788, 6, true)
// 	+ kmlLineStringCoord(22.689038, 113.918698, 6, true)
// 	+ kmlLineStringCoord(22.689110, 113.918616, 6, true)
// 	+ kmlLineStringCoord(22.689158, 113.918491, 6, false)
// 	+ kmlLineStringTail()
// 	+ kmlPlacemarkTail()
// 	+ kmlTail();
// console.log(kmlSingleTrack);

// let kmlMultiTrack = kmlHead('MultiTrack', 'FolderName')
// 	+ kmlPlacemarkHead('MyTrack', 'No')
// 	+ kmlMultiTrackHead(false)
// 	+ kmlTrackHead()
// 	+ kmlTrackCoord(22.688959, 113.918788, 0, 6, '2021-01-01T12:00:00Z')
// 	+ kmlTrackCoord(22.690038, 113.918698, 0, 6, '2021-01-01T12:00:01Z')
// 	+ kmlTrackCoord(22.691110, 113.918616, 0, 6, '2021-01-01T12:00:02Z')
// 	+ kmlTrackCoord(22.692158, 113.918491, 0, 6, '2021-01-01T12:00:03Z')
// 	+ kmlTrackTail()
// 	+ kmlTrackHead()
// 	+ kmlTrackCoord(22.714165, 113.901165, 0, 6, '2021-01-01T12:01:00Z')
// 	+ kmlTrackCoord(22.715059, 113.901159, 0, 6, '2021-01-01T12:01:01Z')
// 	+ kmlTrackCoord(22.716950, 113.901150, 0, 6, '2021-01-01T12:01:02Z')
// 	+ kmlTrackCoord(22.717844, 113.901140, 0, 6, '2021-01-01T12:01:03Z')
// 	+ kmlTrackTail()
// 	+ kmlMultiTrackTail()
// 	+ kmlPlacemarkTail()
// 	+ kmlTail();
// console.log(kmlMultiTrack);
/* for test only 2 */