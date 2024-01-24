"use strict"

export {
    Point,
    Path,
    TrackFile
};

import * as KML from './kml.js';
import * as GPX from './gpx.js';
import * as WP from './waypoint.js';

class Point
{
    constructor(name, wayPoint, description)
    {
        this.name = name;
        this.description = description;
        this.wayPoint = wayPoint;
    }
}

class Path
{
    constructor(name, wayPoints, description)
    {
        this.name = name;
        this.description = description;
        this.wayPoints = wayPoints;
    }
}

class TrackFile
{
    constructor(name)
    {
        this.name = name; // 文档名字
        this.description = undefined;
        this.points = []; // Point对象数组
        this.lines = []; // Path对象数组，没有时间戳
        this.tracks = []; // Path对象数组
    }

    toKMLDocument()
    {
        let document = new KML.Document(this.name);
        document.description = this.description;

        const BlueStyle = new KML.Style('BlueStyle','A0FF0000',5);
        const GreenStyle = new KML.Style('GreenStyle','D032FF30',5);
        document.styles=[BlueStyle, GreenStyle];

        const AltitudeMode = KML.AltitudeMode.Absolute;

        // WP.WayPoint转KML坐标
        const wp2KmlGxCoord = wp => new KML.GxCoord(wp.lat, wp.lon, wp.altitude);
        const wp2KmlCoordinate = wp => new KML.Coordinate(wp.lat, wp.lon, wp.altitude);

        // 点位
        if(1==this.points.length){
            const point = this.points[0];
            let placeMark = new KML.PlaceMark(point.name);
            placeMark.description = point.description;
            placeMark.point = new KML.Point(wp2KmlCoordinate(point.wayPoint), AltitudeMode);
            document.placeMarks.push(placeMark);
        }else if(1<this.points.length){
            let folder= new KML.Folder('Points');
            folder.placeMarks = this.points.map(point => {
                let placeMark = new KML.PlaceMark(point.name);
                placeMark.description = point.description;
                placeMark.point = new KML.Point(wp2KmlCoordinate(point.wayPoint), AltitudeMode);
                return placeMark;
            });
            document.folders.push(folder);
        }

        // 线条
        if(1==this.lines.length){
            const path = this.lines[0];
            let placeMark = new KML.PlaceMark(path.name);
            placeMark.description = path.description;
            placeMark.lineString = new KML.LineString(new KML.Coordinates(path.wayPoints.map(wp => wp2KmlCoordinate(wp))), AltitudeMode);
            placeMark.styleId=GreenStyle.id;
            document.placeMarks.push(placeMark);
        }else if(1<this.lines.length){
            let folder= new KML.Folder('Routes');
            folder.placeMarks = this.lines.map(path => {
                let placeMark = new KML.PlaceMark(path.name);
                placeMark.description = path.description;
                placeMark.lineString = new KML.LineString(new KML.Coordinates(path.wayPoints.map(wp => wp2KmlCoordinate(wp))), AltitudeMode);
                placeMark.styleId=GreenStyle.id;
                return placeMark;
            });
            document.folders.push(folder);
        }

        // 轨迹
        if(1==this.tracks.length){
            const path = this.tracks[0];
            let placeMark = new KML.PlaceMark(path.name);
            placeMark.description = path.description;
            placeMark.gxTrack = new KML.GxTrack(AltitudeMode);
            path.wayPoints.forEach(wp => { placeMark.gxTrack.append(new KML.When(wp.timestamp), wp2KmlGxCoord(wp)); });
            placeMark.styleId=BlueStyle.id;
            document.placeMarks.push(placeMark);
        }else if(1<this.tracks.length){
            let folder= new KML.Folder('Tracks');
            folder.placeMarks = this.tracks.map(path => {
                let placeMark = new KML.PlaceMark(path.name);
                placeMark.description = path.description;
                placeMark.gxTrack = new KML.GxTrack(AltitudeMode);
                path.wayPoints.forEach(wp => { placeMark.gxTrack.append(new KML.When(wp.timestamp), wp2KmlGxCoord(wp)); });
                placeMark.styleId=BlueStyle.id;
                return placeMark;
            });
            document.folders.push(folder);
        }

        return document;
    }

    static fromKMLDocument(document)
    {
        let ret = new TrackFile(document.name);
        ret.description = document.description;

        // KML坐标转WP.WayPoint
        const kmlCoord2Wp = c => new WP.WayPoint(c.lat, c.lon, undefined, c.altitude);

        const gxTrackToWayPoints = gxTrack => {
            const timestamps = gxTrack.whenArray.map(w => w.timestamp);
            let wayPoints = gxTrack.gxCoordArray.map(g => kmlCoord2Wp(g));
            const len = Math.min(timestamps.length, wayPoints.length);
            for(let i=0;i<len;++i)
                wayPoints[i].timestamp=timestamps[i];
            return wayPoints;
        }

        const parsePlaceMarks = placeMarks => {
            placeMarks.forEach(placeMark => {
                if(undefined != placeMark.point)
                    ret.points.push(new Point(placeMark.name, kmlCoord2Wp(placeMark.point.coordinate), placeMark.description));

                if(undefined != placeMark.gxTrack)
                    ret.tracks.push(new Path(placeMark.name, gxTrackToWayPoints(placeMark.gxTrack), placeMark.description));

                if(undefined != placeMark.gxMultiTrack){
                    // TODO: KML中MultiTrack是否要对应GPX的中的trkseg字段
                    let wayPoints = [];
                    placeMark.gxMultiTrack.gxTracks.forEach(gxTrack => {
                        wayPoints = wayPoints.concat(gxTrackToWayPoints(gxTrack))
                    });
                    ret.tracks.push(new Path(placeMark.name, wayPoints, placeMark.description));
                }

                if(undefined != placeMark.lineString)
                    ret.lines.push(new Path(placeMark.name,
                        placeMark.lineString.coordinates.coordinateArray.map(c => kmlCoord2Wp(c)),
                        placeMark.description));
            });
        }

        parsePlaceMarks(document.placeMarks);

        if(undefined!=document.folders){
            document.folders.forEach(folder => {
                parsePlaceMarks(folder.placeMarks);
            });
        }

        return ret;
    }

    toGPXDocument()
    {
        let document = new GPX.Document(this.name);
        document.description = this.description;

        // WP.WayPoint转GPX.Wpt
        const wp2GpxWpt = (wp,name,description) => new GPX.Wpt(name, wp.lat, wp.lon, wp.altitude, wp.timestamp, description);

        document.wpts=this.points.map(point => wp2GpxWpt(point.wayPoint, point.name, point.description));
        document.rtes=this.lines.map(path => new GPX.Rte(path.name, path.wayPoints.map(wp => wp2GpxWpt(wp)), path.description));
        document.trks=this.tracks.map(path => new GPX.Trk(path.name, [new GPX.Trkseg(path.wayPoints.map(wp => wp2GpxWpt(wp)))], path.description));
        return document;
    }

    static fromGPXDocument(document)
    {
        let ret = new TrackFile(document.name);
        ret.description = document.description;

        // GPX.Wpt转WP.WayPoint
        const gpxWpt2Wp = wpt => new WP.WayPoint(wpt.lat, wpt.lon, wpt.timestamp, wpt.altitude);

        ret.points=document.wpts.map(wpt => new Point(wpt.name, gpxWpt2Wp(wpt), wpt.description));
        ret.lines=document.rtes.map(rte => new Path(rte.name, rte.rtepts.map(rtept => gpxWpt2Wp(rtept)), rte.description));
        ret.tracks=document.trks.map(trk => {
            let wayPoints = [];
            trk.trksegs.forEach(trkseg => {
                trkseg.trkpts.forEach(trkpt => {
                    wayPoints.push(gpxWpt2Wp(trkpt));
                });
            });
            return new Path(trk.name, wayPoints, trk.description);
        });
        return ret;
    }
}
