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

        // 点位
        if(1==this.points.length){
            const point = this.points[0];
            let placeMark = new KML.PlaceMark(point.name);
            placeMark.description = point.description;
            placeMark.point = new KML.Coordinates([
                new KML.Coordinate(point.wayPoint.lat, point.wayPoint.lon)
            ]);
            document.placeMarks.push(placeMark);
        }else if(1<this.points.length){
            let folder= new KML.Folder('Points');
            folder.placeMarks = this.points.map(point => {
                let placeMark = new KML.PlaceMark(point.name);
                placeMark.description = point.description;
                placeMark.point = new KML.Coordinates([
                    new KML.Coordinate(point.wayPoint.lat, point.wayPoint.lon)
                ]);
                return placeMark;
            });
            document.folders.push(folder);
        }

        // 线条
        if(1==this.lines.length){
            const path = this.lines[0];
            let placeMark = new KML.PlaceMark(path.name);
            placeMark.description = path.description;
            placeMark.lineString = new KML.LineString(
                path.wayPoints.map(wp => new KML.Coordinate(wp.lat, wp.lon))
            );
            placeMark.styleId=GreenStyle.id;
            document.placeMarks.push(placeMark);
        }else if(1<this.lines.length){
            let folder= new KML.Folder('Routes');
            folder.placeMarks = this.lines.map(path => {
                let placeMark = new KML.PlaceMark(path.name);
                placeMark.description = path.description;
                placeMark.lineString = new KML.LineString(
                    path.wayPoints.map(wp => new KML.Coordinate(wp.lat, wp.lon))
                );
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
            placeMark.gxTrack = new KML.GxTrack(KML.AltitudeMode.Absolute);
            path.wayPoints.forEach(wp => {
                placeMark.gxTrack.append(new KML.When(wp.timestamp), new KML.GxCoord(wp.lat, wp.lon, wp.altitude));
            });
            placeMark.styleId=BlueStyle.id;
            document.placeMarks.push(placeMark);
        }else if(1<this.tracks.length){
            let folder= new KML.Folder('Tracks');
            folder.placeMarks = this.tracks.map(path => {
                let placeMark = new KML.PlaceMark(path.name);
                placeMark.description = path.description;
                placeMark.gxTrack = new KML.GxTrack(KML.AltitudeMode.Absolute);
                path.wayPoints.forEach(wp => {
                    placeMark.gxTrack.append(new KML.When(wp.timestamp), new KML.GxCoord(wp.lat, wp.lon, wp.altitude));
                });
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

        const gxTrackToWayPoints = (gxTrack) => {
            const timestamps = gxTrack.whenArray.map(w => w.timestamp);
            let wayPoints = gxTrack.gxCoordArray.map(g => new WP.WayPoint(g.lat, g.lon, undefined, g.altitude));
            const len = Math.min(timestamps.length, wayPoints.length);
            for(let i=0;i<len;++i)
                wayPoints[i].timestamp=timestamps[i];
            return wayPoints;
        }

        const parsePlaceMarks = (placeMarks) => {
            placeMarks.forEach(placeMark => {
                if(undefined != placeMark.point){
                    const coord = placeMark.point.coordinates[0];
                    const p = new Point(placeMark.name, new WP.WayPoint(coord.lat, coord.lon, undefined, coord.altitude));
                    p.description = placeMark.description;
                    ret.points.push(p)
                }
                if(undefined != placeMark.gxTrack){
                    const p = new Path(placeMark.name, gxTrackToWayPoints(placeMark.gxTrack));
                    p.description = placeMark.description;
                    ret.tracks.push(p);
                }
                if(undefined != placeMark.gxMultiTrack){
                    // TODO: KML中MultiTrack是否要对应GPX的中的trkseg字段
                    let wayPoints = [];
                    placeMark.gxMultiTrack.gxTracks.forEach(gxTrack => {
                        wayPoints = wayPoints.concat(gxTrackToWayPoints(gxTrack))
                    });
                    const p = new Path(placeMark.name, wayPoints);
                    p.description = placeMark.description;
                    ret.tracks.push(p);
                }
                if(undefined != placeMark.lineString){
                    const p = new Path(placeMark.name,
                        placeMark.lineString.coordinates.map(c => new WP.WayPoint(c.lat, c.lon, undefined, c.altitude)));
                    p.description = placeMark.description;
                    ret.lines.push(p);
                }
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

        document.wpts=this.points.map(point => new GPX.Wpt(point.name, point.wayPoint.lat, point.wayPoint.lon, point.wayPoint.altitude, point.timestamp, point.description));
        document.rtes=this.lines.map(path => new GPX.Rte(path.name, path.wayPoints.map(wp => new GPX.Rtept(wp.lat, wp.lon)), path.description));
        document.trks=this.tracks.map(path => new GPX.Trk(path.name, [
            new GPX.Trkseg(path.wayPoints.map(wp => new GPX.Trkpt(wp.lat, wp.lon, wp.timestamp, wp.altitude)))
        ], path.description));
        return document;
    }

    static fromGPXDocument(document)
    {
        let ret = new TrackFile(document.name);
        ret.description = document.description;

        ret.points=document.wpts.map(wpt => new Point(wpt.name, new WP.WayPoint(wpt.lat, wpt.lon, wpt.timestamp, wpt.altitude), wpt.description));
        ret.lines=document.rtes.map(rte => new Path(rte.name, rte.rtepts.map(rtept => new WP.WayPoint(rtept.lat, rtept.lon)), rte.description));
        ret.tracks=document.trks.map(trk => {
            let wayPoints = [];
            trk.trksegs.forEach(trkseg => {
                trkseg.trkpts.forEach(trkpt => {
                    wayPoints.push(new WP.WayPoint(trkpt.lat, trkpt.lon, trkpt.timestamp, trkpt.altitude));
                });
            });
            return new Path(trk.name, wayPoints, trk.description);
        });
        return ret;
    }
}
