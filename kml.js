"use strict"

export {
	head,
	tail,
	folderHead,
	folderTail,
	placemarkHead,
	placemarkTail,
	placemarkPoint,
	trackHead,
	trackTail,
	multiTrackHead,
	multiTrackTail,
	trackCoord,
	lineStringHead,
	lineStringCoord,
	lineStringTail,
	AltitudeMode,
	altitudeMode,
	StyleId
};

import * as DF from './date-format.js';

const kmlTs = (ts) => DF.timestampToString(ts, 'yyyy-MM-ddThh:mm:ssZ', true); // KML规范的GMT时区时间格式

function head(docName) {
	return '\
<?xml version="1.0" encoding="UTF-8"?>\n\
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">\n\
<Document><name>'+ docName + '</name>\n\
<Style id="BlueStyle"><LineStyle><color>A0FF0000</color><width>5</width></LineStyle></Style>\n\
<Style id="GreenStyle"><LineStyle><color>D032FF30</color><width>5</width></LineStyle></Style>\n';
}

function tail() {
	return '</Document>\n</kml>';
}

function folderHead(name){
	return '<Folder>\n<name>'+ name + '</name>\n';
}

function folderTail(){
	return '</Folder>\n';
}

const StyleId = {
	Line : 'GreenStyle',
	Track: 'BlueStyle'
};

function placemarkHead(name, description, styleId, timestamp) {
	let s = '<Placemark><name>' + name + '</name>';

	if (undefined != description)
		s += '<description>' + description + '</description>';

	if (undefined != styleId)
		s += '<styleUrl>#' + styleId + '</styleUrl>';

	if (undefined != timestamp)
		s += '<gx:TimeStamp>' + kmlTs(timestamp) + '</gx:TimeStamp>';

	return s + '\n';
}

function placemarkTail() {
	return '</Placemark>\n';
}

function placemarkPoint(lat, lon, precision) {
	return '<Point>\n<coordinates>' + lon.toFixed(precision) + ',' + lat.toFixed(precision) + '</coordinates>\n</Point>\n';
}

function trackHead() {
	return '<gx:Track>\n';
}

const AltitudeMode = {
	// 海拔模式 https://developers.google.com/kml/documentation/altitudemode
	RelativeToGround: 'relativeToGround', // 基于地球表面
	Absolute: 'absolute', // 基于海平面
	RelativeToSeaFloor: 'relativeToSeaFloor', // 基于主水体的底部
	ClampToGround: 'clampToGround', //（此项作为默认值）海拔被忽略，沿地形放置在地面上
	ClampToSeaFloor: 'clampToSeaFloor' // 海拔被忽略，沿地形放置在主水体的底部
};

// GPGGA记录中的高度是海平面高度。因此默认为absolute
function altitudeMode(m = AltitudeMode.Absolute){
	return '<altitudeMode>' + m + '</altitudeMode>\n';
}

function trackTail() {
	return '</gx:Track>\n'
}

function multiTrackHead() {
	return '<gx:MultiTrack>\n<gx:interpolate>0</gx:interpolate>\n';
}

function multiTrackTail() {
	return '</gx:MultiTrack>\n'
}

function trackCoord(lat, lon, alt, precision, timestamp) {
	let s = '<when>' + kmlTs(timestamp) + '</when><gx:coord>' + lon.toFixed(precision) + ' ' + lat.toFixed(precision);
	if(undefined != alt)
		s += ' ' + alt.toFixed(1);
	return s + '</gx:coord>\n';
}

function lineStringHead() {
	return '<LineString><tessellate>1</tessellate>\n<coordinates>\n'
}

function lineStringCoord(lat, lon, precision) {
	return lon.toFixed(precision) + ',' + lat.toFixed(precision) + ' ';
}

function lineStringTail() {
	return '</coordinates>\n</LineString>\n'
}
