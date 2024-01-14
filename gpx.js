"use strict"

export {
    head,
    tail,
    wpt,
    trkHead,
    trkpt,
    trkTail,
    rteHead,
    rtept,
    rteTail
};

import * as DF from './date-format.js';

const gpxTs = (ts) => DF.timestampToString(ts, 'yyyy-MM-ddThh:mm:ssZ', true); // GPX规范的GMT时区时间格式

function head(docName){
    return '\
<?xml version="1.0" encoding="utf-8"?>\n\
<gpx version="1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/1" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n\
<name>' + docName +'</name>\n';
}

function tail(){
    return '</gpx>';
}

function wpt(lat, lon, alt, precision, nameStr){
    let s = '<wpt lat="' + lat.toFixed(precision) + '" lon="' + lon.toFixed(precision) +'"><name>'+nameStr+'</name>';
    if(undefined != alt)
        s+= '<ele>'+alt.toFixed(1)+'</ele>';
    return s+'</wpt>\n';
}

function trkHead(name){
    return '<trk><name>' + name + '</name><trkseg>\n';
}

function trkpt(lat, lon, alt, precision, timestamp){
    let s = '<trkpt lat="' + lat.toFixed(precision) + '" lon="' + lon.toFixed(precision) +'"><time>'+ gpxTs(timestamp) +'</time>';
    if(undefined != alt)
        s+= '<ele>'+alt.toFixed(1)+'</ele>';
    return s+'</trkpt>\n';
}

function trkTail(){
    return '</trkseg></trk>\n';
}

function rteHead(name){
    return '<rte><name>' + name + '</name>\n';
}

function rtept(lat, lon, precision){
    return '<rtept lat="' + lat.toFixed(precision) + '" lon="' + lon.toFixed(precision) +'"></rtept>\n';
}

function rteTail(){
    return '</rte>\n';
}